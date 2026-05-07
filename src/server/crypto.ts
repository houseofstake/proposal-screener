import {
  createPublicKey as nodeCreatePublicKey,
  verify as nodeVerify,
  KeyObject,
} from "crypto";

type SupportedAlg = "ES256" | "ES384";

export function createPublicKey(jwk: JsonWebKey): KeyObject {
  try {
    // Cast to satisfy Node's expected JsonWebKey shape (DOM typings can differ)
    return nodeCreatePublicKey({ key: jwk as any, format: "jwk" });
  } catch (error) {
    throw new Error(
      `Invalid JWK: ${(error as Error)?.message || "unable to create public key"}`
    );
  }
}

export function verify(
  alg: SupportedAlg,
  data: Buffer | string,
  publicKey: KeyObject,
  signature: Buffer
): boolean {
  const hashAlg = alg === "ES256" ? "sha256" : "sha384";

  try {
    return nodeVerify(hashAlg, typeof data === "string" ? Buffer.from(data) : data, publicKey, signature);
  } catch (error) {
    throw new Error(
      `Signature verification failed: ${(error as Error)?.message || "unknown error"}`
    );
  }
}
