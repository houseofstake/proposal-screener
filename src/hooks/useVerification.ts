import { useEffect, useMemo, useRef, useState } from "react";
import { calculateRequestHash, calculateResponseHash } from "@/utils/request-hash";
import type { VerificationProofResponse } from "@/types/verification";
import { deriveVerificationState } from "@/utils/attestation";

type Params = {
  verificationId?: string | null;
  model?: string | null;
  requestBody?: any;
  responseBody?: string | null;
  prefetchedProof?: VerificationProofResponse | null;
};

type StepLoading = Record<"hash" | "signature" | "address" | "attestation" | "nonce" | "gpu" | "cpu", boolean>;

const initialStepLoading: StepLoading = {
  hash: false,
  signature: false,
  address: false,
  attestation: false,
  nonce: false,
  gpu: false,
  cpu: false,
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useVerification({
  verificationId,
  model,
  requestBody,
  responseBody,
  prefetchedProof = null,
}: Params) {
  const [proof, setProof] = useState<VerificationProofResponse | null>(prefetchedProof);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepLoading, setStepLoading] = useState<StepLoading>(initialStepLoading);
  const abortRef = useRef<AbortController | null>(null);

  const requestHash = useMemo(() => {
    if (requestBody === undefined) return null;
    try {
      return calculateRequestHash(requestBody);
    } catch (err) {
      console.error("Request hash failed:", err);
      return null;
    }
  }, [requestBody]);

  const responseHash = useMemo(() => {
    if (responseBody === undefined || responseBody === null) return null;
    try {
      return calculateResponseHash(responseBody);
    } catch (err) {
      console.error("Response hash failed:", err);
      return null;
    }
  }, [responseBody]);

  const verificationState = useMemo(() => {
    return deriveVerificationState({
      proof,
      requestHash,
      responseHash,
      signatureText: (proof?.signature as any)?.text || null,
      signature: (proof?.signature as any)?.signature || null,
      signatureAddress: (proof?.signature as any)?.signing_address || null,
      attestedAddress:
        (proof?.attestation as any)?.gateway_attestation?.signing_address ||
        (proof?.attestation as any)?.signing_address ||
        null,
      attestationResult: proof?.results?.verified ? "Pass" : proof?.results ? "Fail" : null,
      nrasVerified: proof?.nras?.verified,
      nrasReasons: proof?.nras?.reasons,
      intelVerified: proof?.intel?.verified,
      nonceCheck: proof?.nonceCheck ?? null,
      intelRequired: Boolean(
        (proof?.attestation as any)?.intel_quote ||
          (proof?.attestation as any)?.gateway_attestation?.intel_quote ||
          (proof?.attestation as any)?.model_attestations?.[0]?.intel_quote
      ),
    });
  }, [proof, requestHash, responseHash]);

  const exportProof = () => {
    if (!proof) return;
    const payload = {
      metadata: {
        exportedAt: new Date().toISOString(),
        verificationId: verificationId || null,
        model: model || null,
      },
      hashes: { request: requestHash, response: responseHash },
      proof,
      verificationState,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    link.href = url;
    link.download = verificationId ? `near-proof-${verificationId}-${ts}.json` : `near-proof-${ts}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    setProof(prefetchedProof);
  }, [prefetchedProof]);

  useEffect(() => {
    if (!verificationId || proof) return;
    if (!requestHash || !responseHash) return; // hashes needed for signature validation

    let cancelled = false;
    const controller = new AbortController();
    abortRef.current = controller;

    const run = async () => {
      setLoading(true);
      setError(null);
      setStepLoading({
        hash: true,
        signature: true,
        address: true,
        attestation: true,
        nonce: true,
        gpu: true,
        cpu: true,
      });

      const maxAttempts = 3;
      const backoffMs = 1000;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (cancelled) return;
        try {
          const res = await fetch("/api/verification/proof", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              verificationId,
              model,
              requestHash,
              responseHash,
            }),
            signal: controller.signal,
          });

          const text = await res.text();
          if (res.status === 404 && attempt < maxAttempts - 1) {
            await delay(backoffMs * (attempt + 1));
            continue;
          }
          if (!res.ok) {
            let message = text || "Failed to fetch proof";
            try {
              const parsed = JSON.parse(text);
              message = parsed?.details || parsed?.error || message;
            } catch {
              // keep text
            }
            throw new Error(message);
          }

          const data = JSON.parse(text) as VerificationProofResponse;
          if (cancelled) return;
          setProof(data);
          setError(null);
          break;
        } catch (err) {
          if (attempt >= maxAttempts - 1 || cancelled) {
            setError(err instanceof Error ? err.message : "Failed to fetch proof");
          }
        }
      }

      setLoading(false);
      setStepLoading(initialStepLoading);
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [verificationId, model, requestHash, responseHash, proof]);

  return {
    loading,
    error,
    proof,
    verificationState,
    exportProof,
    stepLoading,
  };
}
