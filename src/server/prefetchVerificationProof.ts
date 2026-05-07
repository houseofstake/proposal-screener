import type { VerificationProofResponse } from "@/types/verification";

type PrefetchParams = {
  verificationId: string;
  model: string;
  requestHash: string;
  responseHash: string;
  nonce?: string | null;
  expectedArch?: string | null;
  expectedDeviceCertHash?: string | null;
  expectedRimHash?: string | null;
  expectedUeid?: string | null;
  expectedMeasurements?: string[] | null;
};

const normalizeBaseUrl = (input?: string | null) => {
  if (!input) return null;
  if (input.endsWith("/")) return input.slice(0, -1);
  return input;
};

const platformBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return null;
};

export async function prefetchVerificationProof(
  originHint: string | undefined,
  params: PrefetchParams
): Promise<VerificationProofResponse | null> {
  const baseUrl =
    normalizeBaseUrl(originHint || platformBaseUrl()) ||
    "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/verification/proof`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verificationId: params.verificationId,
        model: params.model,
        requestHash: params.requestHash,
        responseHash: params.responseHash,
        nonce: params.nonce,
        expectedArch: params.expectedArch ?? undefined,
        expectedDeviceCertHash: params.expectedDeviceCertHash ?? undefined,
        expectedRimHash: params.expectedRimHash ?? undefined,
        expectedUeid: params.expectedUeid ?? undefined,
        expectedMeasurements: params.expectedMeasurements ?? undefined,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn("[verification] Prefetch proof failed:", {
        status: response.status,
        body: text,
      });
      return null;
    }

    const proof = (await response.json()) as VerificationProofResponse;
    return proof;
  } catch (error) {
    console.error("[verification] Prefetch proof error:", error);
    return null;
  }
}
