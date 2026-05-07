import { describe, it, expect } from "vitest";

const FIVE_MIN_MS = 5 * 60 * 1000;

// Simple helper to simulate NEAR doc rules
// - Signature available for 5 minutes if never queried
// - Once queried within 5 minutes, it becomes persistent
function signatureAvailability(generatedAt: number, now: number, queried: boolean) {
  const age = now - generatedAt;
  if (queried) return true; // persisted after first query
  return age <= FIVE_MIN_MS;
}

describe("Signature persistence window (5 minutes)", () => {
  const now = Date.now();

  it("available within 5 minutes", () => {
    const generatedAt = now - 2 * 60 * 1000;
    expect(signatureAvailability(generatedAt, now, false)).toBe(true);
  });

  it("becomes persistent forever after first query", () => {
    const generatedAt = now - 10 * 60 * 1000; // older than window
    expect(signatureAvailability(generatedAt, now, true)).toBe(true);
  });

  it("missing after 5 minutes if never queried", () => {
    const generatedAt = now - 6 * 60 * 1000;
    expect(signatureAvailability(generatedAt, now, false)).toBe(false);
  });
});
