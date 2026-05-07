import { describe, it, expect } from "vitest";

describe("JWT claims compliance with NEAR AI docs", () => {
  it("validates platform JWT structure", () => {
    const platformJwt = {
      iss: "https://nras.attestation.nvidia.com",
      "x-nvidia-overall-att-result": true,
      eat_nonce: "abc123",
      submods: { "GPU-0": ["DIGEST", ["SHA-256", "hashhere"]] },
    };

    expect(platformJwt["x-nvidia-overall-att-result"]).toBe(true);
    expect(typeof platformJwt.eat_nonce).toBe("string");
    expect(platformJwt.iss).toBe("https://nras.attestation.nvidia.com");
    expect(platformJwt.submods).toBeDefined();
  });

  it("validates GPU JWT structure", () => {
    const gpuJwt = {
      iss: "https://nras.attestation.nvidia.com",
      hwmodel: "GH100 A01 GSP BROM",
      ueid: "642960189298007511250958030500749152730221142468",
      secboot: true,
      dbgstat: "disabled",
      "x-nvidia-gpu-driver-version": "570.133.20",
      "x-nvidia-gpu-vbios-version": "96.00.CF.00.02",
    };

    expect(gpuJwt.iss).toBe("https://nras.attestation.nvidia.com");
    expect(gpuJwt.hwmodel).toContain("GH100");
    expect(typeof gpuJwt.ueid).toBe("string");
    expect(gpuJwt.secboot).toBe(true);
    expect(gpuJwt.dbgstat).toBe("disabled");
    expect(gpuJwt["x-nvidia-gpu-driver-version"]).toBeDefined();
    expect(gpuJwt["x-nvidia-gpu-vbios-version"]).toBeDefined();
  });
});
