export const signatureResponse = {
  text: "reqhash:reshash",
  signature:
    "0x77e4db99019046762da28e669d8fce369fca67361592efd7b90ce5b225d7d6450cc4e7ee5f5a6fff8c7ab892f1caabb3d5625ba61f0dd79f97a5344fbbfa468d1c",
  signing_address: "0x856039d8a60613528d1DBEc3dc920f5FE96a31A0",
  signing_algo: "ecdsa",
};

export const attestationResponse = {
  signing_address: signatureResponse.signing_address,
  nvidia_payload: JSON.stringify({
    eat_nonce: "nonce123",
    arch: "HOPPER",
    evidence_list: [],
  }),
  intel_quote: JSON.stringify({ eat_nonce: "nonce123" }),
  model_attestations: [
    {
      nvidia_payload: JSON.stringify({
        eat_nonce: "nonce123",
        arch: "HOPPER",
        evidence_list: [],
      }),
      intel_quote: JSON.stringify({ eat_nonce: "nonce123" }),
    },
  ],
};

export const nrasSuccessArray = [
  ["JWT", "header.payload.sig"],
  {
    "GPU-0": "gpu-token",
  },
];

export const nrasError = {
  error: "NRAS attestation failed: 400",
  details: "Request Header Or Cookie Too Large",
};

export const proofPayload = {
  attestation: attestationResponse,
  signature: signatureResponse,
  nras: {
    verified: true,
    claims: {
      "x-nvidia-overall-att-result": true,
      "x-nvidia-gpu-driver-version": "570.123",
      "x-nvidia-gpu-vbios-version": "96.00",
      "x-nvidia-eat-nonce": "nonce123",
      hwmodel: "GH100",
    },
    reasons: [],
  },
  nonceCheck: {
    expected: "nonce123",
    attested: "nonce123",
    nras: "nonce123",
    valid: true,
  },
  intel: {
    verified: true,
    raw: { nonce: "nonce123" },
  },
  results: {
    verified: true,
    reasons: [],
  },
};

// Re-export shared verification mocks used across tests
export {
  verifiedProofMock,
  failedProofMock,
  mockNonce,
  mockAddress,
} from "@/fixtures/verificationMocks";
