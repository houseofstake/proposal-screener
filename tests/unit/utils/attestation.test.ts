import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { deriveVerificationState } from "@/utils/attestation";

describe("deriveVerificationState nonce handling", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("marks nonce missing as error and overall failed", () => {
    const state = deriveVerificationState({
      attestationResult: "Pass",
      nrasVerified: true,
      intelVerified: true,
      nonceCheck: null,
    });
    expect(state.steps.nonce.status).toBe("error");
    expect(state.steps.nonce.message).toMatch(/missing nonce check/i);
    expect(state.overall).toBe("failed");
  });

  it("marks nonce mismatch as error", () => {
    const state = deriveVerificationState({
      attestationResult: "Pass",
      nrasVerified: true,
      intelVerified: true,
      nonceCheck: { expected: "a", attested: "b", nras: "c", valid: false },
    });
    expect(state.steps.nonce.status).toBe("error");
    expect(state.reasons).toContain("Nonce mismatch");
    expect(state.overall).toBe("failed");
  });

  it("marks nonce bound as success when valid", () => {
    const state = deriveVerificationState({
      attestationResult: "Pass",
      nrasVerified: true,
      intelVerified: true,
      nonceCheck: { expected: "a", attested: "a", nras: "a", valid: true },
    });
    expect(state.steps.nonce.status).toBe("success");
    expect(state.steps.attestation.status).toBe("success");
  });
});
