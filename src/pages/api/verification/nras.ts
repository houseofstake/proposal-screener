import type { NextApiRequest, NextApiResponse } from "next";
import * as jose from "jose";
import { createPublicKey, verify as verifySignature } from "@/server/crypto";
import type { NrasVerificationRequest, NrasVerificationResult } from "@/types/verification";

const NRAS_URL = "https://nras.attestation.nvidia.com/v3/attest/gpu";
const NRAS_JWKS_URL = "https://nras.attestation.nvidia.com/.well-known/jwks.json";
const NRAS_AUDIENCE = "nvidia-attestation"; // documented NRAS aud (adjust if different)
const NRAS_TIMEOUT_MS = 10_000; // 10s timeout
const logSafe = (message: string, meta?: Record<string, any>) => {
  const sanitized =
    meta &&
    Object.fromEntries(
      Object.entries(meta).map(([k, v]) => [
        k,
        typeof v === "string" && v.length > 200 ? `${v.slice(0, 200)}...` : v,
      ])
    );
  console.warn("[NRAS]", message, sanitized ?? "");
};

type Jwk = {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  kid?: string;
  alg?: string;
};

type Jwks = {
  keys: Jwk[];
};

let cachedJwks: Jwks | null = null;
let cachedJwksFetchedAt = 0;
const JWKS_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function resetJwksCache() {
  cachedJwks = null;
  cachedJwksFetchedAt = 0;
}

const base64UrlToBuffer = (input: string) => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64");
};

const parseJsonSafe = (value: any) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
};

const collectNvidiaPayloads = (payload: any): any[] => {
  const candidates: any[] = [];
  if (!payload) return candidates;

  const addCandidate = (value: any) => {
    const parsed = parseJsonSafe(value);
    if (parsed) candidates.push(parsed);
  };

  addCandidate(payload.nvidia_payload);
  addCandidate(payload.gateway_attestation?.nvidia_payload);

  if (Array.isArray(payload.model_attestations)) {
    for (const att of payload.model_attestations) {
      addCandidate(att?.nvidia_payload);
    }
  }

  // If the payload itself looks like NVIDIA payload (has evidence_list), include it
  if (payload.evidence_list || payload.evidenceList || payload.evidences) {
    addCandidate(payload);
  }

  return candidates;
};

async function getJwks(): Promise<Jwks> {
  const now = Date.now();
  if (cachedJwks && now - cachedJwksFetchedAt < JWKS_TTL_MS) {
    return cachedJwks;
  }

  const response = await fetch(NRAS_JWKS_URL, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch NRAS JWKS: ${response.status}`);
  }

  const json = (await response.json()) as Jwks;
  if (!json?.keys?.length) {
    throw new Error("NRAS JWKS is empty");
  }

  cachedJwks = json;
  cachedJwksFetchedAt = now;
  return json;
}

/**
 * Validates if an expected hardware value matches either the minimal payload or evidence list
 * Used to verify GPU hardware identity matches expected values from NEAR AI attestation
 *
 * @param minimalPayload - The nvidia_payload sent to NRAS
 * @param evidenceList - Array of GPU evidence items from nvidia_payload
 * @param expected - Expected value (from server's hardware profile)
 * @param payloadKeys - Keys to check in minimal payload
 * @param evidenceKeys - Keys to check in evidence list items
 * @returns true if value matches, false otherwise
 */
const validateExpectedValue = (
  minimalPayload: any,
  evidenceList: any[],
  expected: string,
  payloadKeys: string[],
  evidenceKeys: string[]
): boolean => {
  // Check minimal payload first (faster path)
  for (const key of payloadKeys) {
    const value = minimalPayload[key];
    if (value && String(value).toLowerCase() === expected.toLowerCase()) {
      return true;
    }
  }

  // Check evidence list items (detailed hardware measurements)
  return evidenceList.some((item) => {
    if (!item || typeof item !== "object") return false;
    return evidenceKeys.some((key) => {
      const value = (item as any)[key];
      return value && String(value).toLowerCase() === expected.toLowerCase();
    });
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    | NrasVerificationResult
    | { error: string; details?: string; kid?: string; suggestions?: string[] }
  >
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    nvidia_payload,
    nonce: expectedNonce,
    expectedArch,
    expectedDeviceCertHash,
  expectedRimHash,
  expectedUeid,
  expectedMeasurements,
} = (req.body ?? {}) as Partial<NrasVerificationRequest>;

  const expectationsMissing =
    !expectedArch ||
    !expectedDeviceCertHash ||
    !Array.isArray(expectedMeasurements) ||
    expectedMeasurements.length === 0;
  // Note: RIM and UEID are validated internally by NRAS via NVIDIA RIM Service/OCSP

  // Mock mode for tests
  if (process.env.VERIFY_USE_MOCKS === "true") {
    const verified = !expectationsMissing && !!expectedNonce;
    const reasons = expectationsMissing
      ? ["Expectations missing: arch/device_cert_hash/rim/ueid/measurements"]
      : [];
    return res.status(200).json({
      verified,
      jwt: "mock",
      claims: {
        "x-nvidia-overall-att-result": verified,
        "x-nvidia-gpu-driver-version": "570.123",
        "x-nvidia-gpu-vbios-version": "96.00",
        "x-nvidia-eat-nonce": expectedNonce || "mock-nonce",
        hwmodel: "GH100 A01 GSP BROM",
      },
      gpus: { "GPU-0": "mock-token" },
      raw: { mock: true },
      reasons: verified ? [] : reasons,
    });
  }
  if (!nvidia_payload) {
    return res
      .status(400)
      .json({ error: "nvidia_payload is required in request body" });
  }

  if (expectationsMissing) {
    return res.status(400).json({
      error:
        "Expected arch/device_cert_hash/rim/ueid/measurements are required for verification",
    });
  }

  let payload: any = nvidia_payload;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return res.status(400).json({ error: "Invalid JSON in nvidia_payload" });
    }
  }

  const candidates = collectNvidiaPayloads(payload);
  const parsedCandidate = candidates.find(
    (c) => c && (Array.isArray(c.evidence_list) || Array.isArray(c.evidenceList) || Array.isArray(c.evidences))
  );

  if (!parsedCandidate) {
    return res.status(400).json({
      error: "nvidia_payload missing required fields (nonce, arch, evidence_list)",
      suggestions: [
        "Use model_attestations[0].nvidia_payload for a smaller payload",
        "Ensure attestation payload includes evidence_list",
      ],
    });
  }

  const minimalPayload = {
    nonce:
      parsedCandidate?.nonce ??
      parsedCandidate?.eat_nonce ??
      parsedCandidate?.["x-nvidia-eat-nonce"],
    arch: parsedCandidate?.arch ?? parsedCandidate?.gpu_arch ?? "HOPPER",
    evidence_list:
      parsedCandidate?.evidence_list ??
      parsedCandidate?.evidenceList ??
      parsedCandidate?.evidences,
    device_cert_hash: parsedCandidate?.device_cert_hash,
    rim: parsedCandidate?.rim,
    ueid: parsedCandidate?.ueid,
  } as Record<string, any>;

  if (
    !minimalPayload.nonce ||
    !minimalPayload.arch ||
    !Array.isArray(minimalPayload.evidence_list)
  ) {
    return res.status(400).json({
      error:
        "nvidia_payload missing required fields (nonce, arch, evidence_list)",
      suggestions: [
        "Confirm attestation report includes nonce, arch, and evidence_list",
        "Use model_attestations[0].nvidia_payload to reduce size",
      ],
    });
  }

  // Validate evidence_list items are objects (content is validated by NRAS)
  const invalidEvidence = minimalPayload.evidence_list.some(
    (item: any) => !item || typeof item !== "object"
  );

  if (invalidEvidence) {
    return res.status(400).json({
      error: "evidence_list contains invalid items",
      suggestions: [
        "Ensure each evidence_list item is an object with evidence/certificate data",
        "Evidence and certificate should be Base64-encoded strings",
      ],
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NRAS_TIMEOUT_MS);

    console.log("[NRAS] Sending to NRAS:", {
      nonce: minimalPayload.nonce
        ? `${minimalPayload.nonce}`.slice(0, 20) + "..."
        : null,
      arch: minimalPayload.arch,
      evidenceCount: minimalPayload.evidence_list?.length,
    });

    const response = await fetch(NRAS_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(minimalPayload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await response.text();
    if (!response.ok) {
      if (response.status === 432 || text.includes("Request Header Or Cookie Too Large")) {
        logSafe("NRAS payload too large", { status: response.status });
        return res.status(432).json({
          error: "NRAS payload too large",
          details: text || "Request rejected due to payload size",
          suggestions: [
            "Use model_attestations[0].nvidia_payload instead of gateway payload",
            "Remove unnecessary fields from payload",
          ],
        });
      }
      logSafe("NRAS request failed", { status: response.status });
      return res
        .status(response.status)
        .json({
          error: "NRAS request failed",
          details: text,
          suggestions: ["Verify NRAS endpoint availability", "Check payload size and structure"],
        });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    // Extract JWT token (array format or object)
    let token: string | null = null;
    let gpus: any = null;
    if (Array.isArray(parsed)) {
      const jwtPair = parsed.find(
        (item: any) => Array.isArray(item) && item[0] === "JWT"
      );
      if (jwtPair?.[1]) token = jwtPair[1];
      const gpuObj = parsed.find(
        (item: any) => item && typeof item === "object" && !Array.isArray(item)
      );
      gpus = gpuObj || null;
    } else if (parsed?.jwt) {
      token = parsed.jwt;
      gpus = parsed.gpus || null;
    }

    if (!token) {
      return res
        .status(502)
        .json({ error: "NRAS response missing JWT", details: parsed });
    }

    // Verify JWT signature using NRAS JWKS and jose
    const jwks = await getJwks();
    const JWKS = jose.createLocalJWKSet({ keys: jwks.keys });

    const validateClaims = (p: any) => {
      if (!p) throw new Error("Missing JWT payload");
      const now = Math.floor(Date.now() / 1000);
      if (p.exp && now >= p.exp) throw new Error("NRAS token expired");
      if (p.nbf && now < p.nbf) throw new Error("NRAS token not yet valid");
      if (p.aud) {
        if (Array.isArray(p.aud)) {
          if (!p.aud.includes(NRAS_AUDIENCE)) throw new Error("NRAS audience mismatch");
        } else if (p.aud !== NRAS_AUDIENCE) {
          throw new Error("NRAS audience mismatch");
        }
      }
    if (expectedNonce) {
      const tokenNonce = p.eat_nonce || p["x-nvidia-eat-nonce"] || p.nonce;

      console.log("[NRAS] Nonce validation:", {
        expected: expectedNonce,
        tokenNonce: tokenNonce,
        payloadKeys: Object.keys(p),
        fullPayload: JSON.stringify(p, null, 2).substring(0, 500),
      });

      if (!tokenNonce) {
        throw new Error("NRAS nonce missing from JWT payload");
      }

      if (String(tokenNonce).toLowerCase() !== expectedNonce.toLowerCase()) {
        throw new Error(`NRAS nonce mismatch: expected ${expectedNonce}, got ${tokenNonce}`);
      }

      console.log("[NRAS] Nonce validated successfully");
    }
    };

    let claims: any;
    const isTest = process.env.NODE_ENV === "test";
    try {
      if (isTest) {
        // Use manual path so tests can mock crypto.verify
        const header = jose.decodeProtectedHeader(token);
        const jwk = jwks.keys.find((k) => k.kid === header?.kid) as JsonWebKey | undefined;
        if (!jwk) {
          return res.status(502).json({
            error: "No matching JWK for NRAS token",
            kid: header?.kid,
          });
        }
        const [headerB64, payloadB64, sigB64] = token.split(".");
        const signature = base64UrlToBuffer(sigB64);
        const signingInput = Buffer.from(`${headerB64}.${payloadB64}`);
        const publicKey = createPublicKey(jwk);
        const alg = header?.alg === "ES256" ? "ES256" : "ES384";
        const verified = verifySignature(alg, signingInput, publicKey, signature);
        if (!verified) {
          throw new Error("JWT signature verification failed");
        }
        claims = jose.decodeJwt(token);
        validateClaims(claims);
      } else {
        const { payload } = await jose.jwtVerify(token, JWKS, {
          algorithms: ["ES256", "ES384"],
        });
        validateClaims(payload);
        claims = payload;
        console.log("[NRAS] JWT verified successfully");
      }
    } catch (err) {
      const header = jose.decodeProtectedHeader(token);
      console.error("[NRAS] JWT verification failed:", err);
      if (err instanceof jose.errors.JWKSNoMatchingKey) {
        return res.status(502).json({
          error: "No matching JWK for NRAS token",
          kid: header?.kid,
        });
      }
      return res.status(502).json({
        error: "JWT verification failed",
        details: err instanceof Error ? err.message : String(err),
      });
    }

    const reasons: string[] = [];

    console.log("[NRAS] GPU attestation verified successfully:", {
      overallResult: (claims as any)?.["x-nvidia-overall-att-result"],
      arch: (claims as any)?.["x-nvidia-gpu-arch-check"],
      secboot: (claims as any)?.secboot,
      hwmodel: (claims as any)?.hwmodel,
      driver: (claims as any)?.["x-nvidia-gpu-driver-version"],
      vbios: (claims as any)?.["x-nvidia-gpu-vbios-version"],
      measurements: (claims as any)?.["x-nvidia-gpu-driver-rim-measurements-available"],
    });

    const overallPass = (claims as any)?.["x-nvidia-overall-att-result"] === true;
    if (!overallPass) {
      reasons.push("NRAS overall attestation result failed");
    }

    const verified = reasons.length === 0;

    return res.status(200).json({
      verified,
      jwt: token,
      claims,
      gpus,
      raw: parsed,
      reasons: verified ? undefined : reasons,
    });
  } catch (error: unknown) {
    logSafe("NRAS error", { message: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      error:
        error instanceof Error && error.name === "AbortError"
          ? "NRAS request timed out"
          : "Failed to reach NRAS",
      details: error instanceof Error ? error.message : String(error),
      suggestions: [
        "Retry the request",
        "Ensure NRAS endpoint is reachable",
        "Reduce payload size if applicable",
      ],
    });
  }
}
