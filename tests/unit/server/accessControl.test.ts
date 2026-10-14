import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertAccountAllowed,
  isAccountAllowed,
  NotAuthorizedError,
  parseAllowlist,
} from "@/server/accessControl";
import { respondWithScreeningError } from "@/server/screening";

describe("parseAllowlist", () => {
  it("splits on commas, trims, lowercases and drops empty entries", () => {
    expect(
      parseAllowlist(" alice.near, Bob.NEAR ,,carol.near ,  ,dave.near"),
    ).toEqual(["alice.near", "bob.near", "carol.near", "dave.near"]);
  });

  it("returns an empty list for unset or blank values", () => {
    expect(parseAllowlist(undefined)).toEqual([]);
    expect(parseAllowlist("")).toEqual([]);
    expect(parseAllowlist(" , ,")).toEqual([]);
  });
});

describe("isAccountAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows only accounts on the list", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEAR_ACCESS_ALLOWLIST", "alice.near, bob.near");

    expect(isAccountAllowed("alice.near")).toBe(true);
    expect(isAccountAllowed("bob.near")).toBe(true);
    expect(isAccountAllowed("mallory.near")).toBe(false);
  });

  it("matches on the trimmed, lowercased account id exactly", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEAR_ACCESS_ALLOWLIST", "Alice.near");

    expect(isAccountAllowed(" ALICE.NEAR ")).toBe(true);
    // No partial / suffix matches.
    expect(isAccountAllowed("sub.alice.near")).toBe(false);
    expect(isAccountAllowed("alice")).toBe(false);
  });

  it("fails closed in production when the allowlist is empty", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEAR_ACCESS_ALLOWLIST", "");

    expect(isAccountAllowed("alice.near")).toBe(false);
  });

  it("allows everyone in development when the allowlist is empty", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEAR_ACCESS_ALLOWLIST", " , ");

    expect(isAccountAllowed("anyone.near")).toBe(true);
  });

  it("still enforces a configured allowlist in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEAR_ACCESS_ALLOWLIST", "alice.near");

    expect(isAccountAllowed("mallory.near")).toBe(false);
  });
});

describe("assertAccountAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws NotAuthorizedError that maps to a 403 not_authorized response", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEAR_ACCESS_ALLOWLIST", "alice.near");
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => assertAccountAllowed("alice.near")).not.toThrow();

    let caught: unknown;
    try {
      assertAccountAllowed("mallory.near");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(NotAuthorizedError);

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    respondWithScreeningError(res as never, caught, "fallback is ignored");

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "not_authorized" }),
    );
  });
});
