import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  registerVerificationSession,
  getVerificationSession,
  updateVerificationHashes,
  clearVerificationSession,
  cleanupExpiredSessions,
  TTL_MS,
} from "@/server/verificationSessions";

const makeId = (i: number) => `ver-${i}`;

describe("verificationSessions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Clear a handful of likely IDs
    for (let i = 0; i < 200; i++) {
      clearVerificationSession(makeId(i));
    }
    clearVerificationSession("custom");
    vi.useRealTimers();
  });

  it("generates 64-character hex nonce", () => {
    const session = registerVerificationSession("id-1");
    expect(session.nonce).toMatch(/^[0-9a-f]{64}$/);
  });

  it("accepts custom nonce for testing", () => {
    const session = registerVerificationSession("custom", "test123");
    expect(session.nonce).toBe("test123");
  });

  it("generates unique nonces for different sessions", () => {
    const nonces = new Set<string>();
    for (let i = 0; i < 100; i++) {
      nonces.add(registerVerificationSession(makeId(i)).nonce);
    }
    expect(nonces.size).toBe(100);
  });

  it("retrieves session by verificationId", () => {
    const created = registerVerificationSession("id-get");
    const fetched = getVerificationSession("id-get");
    expect(fetched?.nonce).toBe(created.nonce);
  });

  it("returns null for expired session", () => {
    registerVerificationSession("id-expire");
    vi.advanceTimersByTime(TTL_MS + 1000);
    expect(getVerificationSession("id-expire")).toBeNull();
  });

  it("returns null for non-existent session", () => {
    expect(getVerificationSession("never-registered")).toBeNull();
  });

  it("merges hashes on re-registration", () => {
    registerVerificationSession("id-merge", undefined, "req1", null);
    const merged = registerVerificationSession("id-merge", undefined, null, "res1");
    expect(merged.requestHash).toBe("req1");
    expect(merged.responseHash).toBe("res1");
  });

  it("updateVerificationHashes updates existing session", () => {
    registerVerificationSession("id-update");
    updateVerificationHashes("id-update", { requestHash: "r1", responseHash: "r2" });
    const fetched = getVerificationSession("id-update");
    expect(fetched?.requestHash).toBe("r1");
    expect(fetched?.responseHash).toBe("r2");
  });

  it("does not extend TTL on hash update", () => {
    registerVerificationSession("id-ttl");
    vi.advanceTimersByTime(TTL_MS - 60_000); // advance close to TTL
    updateVerificationHashes("id-ttl", { requestHash: "r1" });
    vi.advanceTimersByTime(120_000); // push past TTL
    expect(getVerificationSession("id-ttl")).toBeNull();
  });

  it("clearVerificationSession removes session", () => {
    registerVerificationSession("id-clear");
    clearVerificationSession("id-clear");
    expect(getVerificationSession("id-clear")).toBeNull();
  });

  it("cleanupExpiredSessions removes only expired", () => {
    registerVerificationSession(makeId(1));
    vi.advanceTimersByTime(30_000);
    registerVerificationSession(makeId(2));
    vi.advanceTimersByTime(TTL_MS); // first should expire
    cleanupExpiredSessions();
    expect(getVerificationSession(makeId(1))).toBeNull();
    expect(getVerificationSession(makeId(2))).not.toBeNull();
  });

  it("persists hashes across session retrieval", () => {
    registerVerificationSession("id-persist", undefined, "reqX", "resX");
    const fetched = getVerificationSession("id-persist");
    expect(fetched?.requestHash).toBe("reqX");
    expect(fetched?.responseHash).toBe("resX");
  });

  it("handles concurrent registrations safely", () => {
    const first = registerVerificationSession("id-concurrent");
    const second = registerVerificationSession("id-concurrent");
    expect(first.nonce).toBe(second.nonce);
    expect(getVerificationSession("id-concurrent")?.nonce).toBe(first.nonce);
  });
});
