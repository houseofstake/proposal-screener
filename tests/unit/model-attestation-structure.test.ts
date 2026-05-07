import { describe, it, expect } from "vitest";

describe("Model attestation report structure", () => {
  const sample = {
    signing_address: "0xattested",
    nvidia_payload: "{}",
    intel_quote: "{}",
    all_attestations: [
      {
        signing_address: "0xnode1",
        nvidia_payload: "{}",
        intel_quote: "{}",
      },
      {
        signing_address: "0xnode2",
        nvidia_payload: "{}",
        intel_quote: "{}",
      },
    ],
  };

  it("has top-level attestation fields", () => {
    expect(sample.signing_address).toBeDefined();
    expect(sample.nvidia_payload).toBeDefined();
    expect(sample.intel_quote).toBeDefined();
  });

  it("contains all_attestations array with same structure", () => {
    expect(Array.isArray(sample.all_attestations)).toBe(true);
    for (const att of sample.all_attestations) {
      expect(att.signing_address).toBeDefined();
      expect(att.nvidia_payload).toBeDefined();
      expect(att.intel_quote).toBeDefined();
    }
  });
});
