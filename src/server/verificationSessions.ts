import { randomBytes } from "crypto";

export type VerificationSession = {
  nonce: string;
  createdAt: number;
  expiresAt: number;
  requestHash?: string | null;
  responseHash?: string | null;
};

const SESSIONS = new Map<string, VerificationSession>();
export const TTL_MS = 5 * 60 * 1000; // 5 minutes – matches NEAR proof availability window

const isExpired = (session: VerificationSession) => Date.now() > session.expiresAt;

export function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of SESSIONS.entries()) {
    if (now > session.expiresAt) {
      SESSIONS.delete(id);
    }
  }
}

export function getVerificationSession(verificationId: string): VerificationSession | null {
  cleanupExpiredSessions();
  const existing = SESSIONS.get(verificationId);
  return existing && !isExpired(existing) ? existing : null;
}

export function registerVerificationSession(
  verificationId: string,
  nonce?: string,
  requestHash?: string | null,
  responseHash?: string | null
): VerificationSession {
  const existing = getVerificationSession(verificationId);
  if (existing) {
    const merged = {
      ...existing,
      requestHash: existing.requestHash ?? requestHash ?? null,
      responseHash: existing.responseHash ?? responseHash ?? null,
    };
    SESSIONS.set(verificationId, merged);
    return merged;
  }

  const generated = nonce || randomBytes(32).toString("hex");
  const session: VerificationSession = {
    nonce: generated,
    createdAt: Date.now(),
    expiresAt: Date.now() + TTL_MS,
    requestHash: requestHash ?? null,
    responseHash: responseHash ?? null,
  };
  SESSIONS.set(verificationId, session);
  return session;
}

export function updateVerificationHashes(
  verificationId: string,
  hashes: { requestHash?: string | null; responseHash?: string | null }
) {
  const existing = getVerificationSession(verificationId);
  if (!existing) return;
  SESSIONS.set(verificationId, {
    ...existing,
    requestHash: hashes.requestHash ?? existing.requestHash ?? null,
    responseHash: hashes.responseHash ?? existing.responseHash ?? null,
  });
}

export function clearVerificationSession(verificationId: string) {
  SESSIONS.delete(verificationId);
}

export function syncVerificationNonce(
  verificationId: string,
  nonce: string,
  requestHash?: string | null,
  responseHash?: string | null
): VerificationSession {
  const existing = getVerificationSession(verificationId);
  const now = Date.now();
  const merged: VerificationSession = {
    nonce,
    createdAt: existing?.createdAt ?? now,
    expiresAt: now + TTL_MS,
    requestHash: requestHash ?? existing?.requestHash ?? null,
    responseHash: responseHash ?? existing?.responseHash ?? null,
  };
  SESSIONS.set(verificationId, merged);
  return merged;
}

// Automatic periodic cleanup
const CLEANUP_INTERVAL_MS = 60 * 1000;
if (typeof setInterval === "function") {
  setInterval(() => cleanupExpiredSessions(), CLEANUP_INTERVAL_MS).unref?.();
}
