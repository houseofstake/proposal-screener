/**
 * Verification metadata types
 *
 * These were originally part of an AG-UI event protocol used by a
 * conversational agent. The screener-only build keeps just the types
 * needed for verifiable-inference attestations from NEAR AI Cloud.
 */

export type VerificationStatus = "pending" | "verified" | "failed";

export interface VerificationMetadata {
  source: "near-ai-cloud";
  status: VerificationStatus;
  messageId?: string;
  nonce?: string;
  attestationReport?: string;
  attestationUrl?: string;
  proof?: unknown;
  signature?: string;
  measurement?: string;
  issuedAt?: string | number;
  error?: string;
}
