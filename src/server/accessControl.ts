/**
 * Internal-preview access control.
 *
 * Screening is restricted to the NEAR accounts listed in NEAR_ACCESS_ALLOWLIST
 * (comma-separated, e.g. "alice.near,bob.near"). Entries are trimmed and
 * lowercased; empty entries are ignored. NEAR account IDs are lowercase, so
 * matching is exact on the trimmed, lowercased string.
 *
 * When the allowlist is unset or empty:
 *   - production  → fail closed: no account is allowed.
 *   - otherwise   → allow all, so local development isn't blocked.
 */

import { NOT_AUTHORIZED_ERROR } from "@/types/api";

export const NOT_AUTHORIZED_MESSAGE =
  "Your wallet is not on the internal allowlist for this preview. Contact the team to request access.";

export class NotAuthorizedError extends Error {
  readonly statusCode = 403;
  readonly code = NOT_AUTHORIZED_ERROR;
  readonly accountId: string;

  constructor(accountId: string) {
    super(NOT_AUTHORIZED_MESSAGE);
    this.name = "NotAuthorizedError";
    this.accountId = accountId;
  }
}

function normalizeAccountId(accountId: string): string {
  return accountId.trim().toLowerCase();
}

export function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map(normalizeAccountId)
    .filter((entry) => entry.length > 0);
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isAccountAllowed(accountId: string): boolean {
  const allowlist = parseAllowlist(process.env.NEAR_ACCESS_ALLOWLIST);

  if (allowlist.length === 0) {
    return !isProduction();
  }

  return allowlist.includes(normalizeAccountId(accountId));
}

export function assertAccountAllowed(accountId: string): void {
  if (!isAccountAllowed(accountId)) {
    console.warn(`[AccessControl] Rejected account not on allowlist: ${accountId}`);
    throw new NotAuthorizedError(accountId);
  }
}

// Boot-time warning when the allowlist is missing, so a misconfigured
// deployment is visible in the logs before the first request is rejected.
if (parseAllowlist(process.env.NEAR_ACCESS_ALLOWLIST).length === 0) {
  console.warn(
    isProduction()
      ? "[AccessControl] NEAR_ACCESS_ALLOWLIST is unset or empty — failing closed: all screening requests will be rejected with 403."
      : "[AccessControl] NEAR_ACCESS_ALLOWLIST is unset or empty — allowing ALL accounts (development only).",
  );
}
