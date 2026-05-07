import { describe, it, expect } from "vitest";
import { createPublicKey, verify } from "@/server/crypto";
import { generateKeyPairSync, createSign, KeyObject } from "crypto";

const signMessage = (message: string, privateKey: KeyObject) => {
  const signer = createSign("sha256");
  signer.update(message);
  signer.end();
  return signer.sign(privateKey);
};

describe("server/crypto", () => {
  it("creates a public key from JWK and verifies ES256 signature", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const jwk = publicKey.export({ format: "jwk" });
    const pub = createPublicKey(jwk as JsonWebKey);
    const sig = signMessage("hello", privateKey);
    expect(verify("ES256", Buffer.from("hello"), pub, sig)).toBe(true);
  });

  it("throws for invalid JWK", () => {
    expect(() => createPublicKey({ kty: "EC", crv: "P-256" } as any)).toThrow();
  });

  it("fails verification with wrong data", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const jwk = publicKey.export({ format: "jwk" });
    const pub = createPublicKey(jwk as JsonWebKey);
    const sig = signMessage("hello", privateKey);
    expect(verify("ES256", Buffer.from("bye"), pub, sig)).toBe(false);
  });
});
