// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

vi.hoisted(() => {
  // rateLimitConfig is computed at import time.
  process.env.RATE_LIMIT_SCREEN_MAX_REQUESTS = "1000";
});

const mocks = vi.hoisted(() => ({
  requestEvaluation: vi.fn(),
  saveScreeningResult: vi.fn(),
}));

vi.mock("@/lib/db/queries", () => ({
  saveScreeningResult: mocks.saveScreeningResult,
}));

vi.mock("@/server/screening", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/screening")>();
  return {
    ...actual,
    verifyNearAuth: vi.fn(async () => ({
      token: "t",
      result: { accountId: "alice.near" },
    })),
    requestEvaluation: mocks.requestEvaluation,
  };
});

import handler, { HEARTBEAT_INTERVAL_MS } from "@/pages/api/screen";
import { ScreeningError } from "@/server/screening";

const evaluation = {
  summary: "Ready",
  overallPass: true,
  qualityScore: 1,
  attentionScore: 0.75,
};

function mockReqRes(body: Record<string, unknown>) {
  const req = {
    method: "POST",
    body,
    headers: { authorization: "Bearer token" },
  } as unknown as NextApiRequest;

  const state = {
    status: 0,
    headers: {} as Record<string, unknown>,
    json: undefined as unknown,
    chunks: [] as string[],
    ended: false,
  };
  const res = {
    writableEnded: false,
    destroyed: false,
    setHeader(name: string, value: unknown) {
      state.headers[name] = value;
    },
    status(code: number) {
      state.status = code;
      return this;
    },
    json(payload: unknown) {
      state.json = payload;
      state.ended = true;
      return this;
    },
    writeHead(code: number, headers: Record<string, unknown>) {
      state.status = code;
      Object.assign(state.headers, headers);
      return this;
    },
    write(chunk: string) {
      state.chunks.push(chunk);
      return true;
    },
    end() {
      this.writableEnded = true;
      state.ended = true;
    },
    on: vi.fn(),
  };
  const events = () =>
    state.chunks
      .join("")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));

  return { req, res: res as unknown as NextApiResponse, state, events };
}

const validBody = {
  title: "A sufficiently long proposal title",
  proposal: "Proposal body that is long enough to screen.",
};

describe("POST /api/screen streaming", () => {
  beforeEach(() => {
    vi.stubEnv("NEAR_ACCESS_ALLOWLIST", "alice.near");
    mocks.saveScreeningResult.mockResolvedValue({ submissionId: "sub-1" });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    mocks.requestEvaluation.mockReset();
  });

  it("sends 200 NDJSON headers, a progress event, then the result", async () => {
    mocks.requestEvaluation.mockResolvedValue({
      evaluation,
      model: "MiniMax-M3",
    });
    const { req, res, state, events } = mockReqRes(validBody);

    await handler(req, res);

    expect(state.status).toBe(200);
    expect(String(state.headers["Content-Type"])).toContain(
      "application/x-ndjson",
    );
    expect(String(state.headers["Cache-Control"])).toContain("no-transform");
    const [first, last] = [events()[0], events().at(-1)];
    expect(first).toEqual({ type: "progress", stage: "evaluating" });
    expect(last.type).toBe("result");
    expect(last.data.submissionId).toBe("sub-1");
    expect(last.data.authenticatedAs).toBe("alice.near");
    expect(state.ended).toBe(true);
  });

  it("sends keep-alive pings while the evaluation is running", async () => {
    vi.useFakeTimers();
    let finish!: (value: unknown) => void;
    mocks.requestEvaluation.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { req, res, events } = mockReqRes(validBody);

    const done = handler(req, res);
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 2 + 100);
    expect(events().filter((e) => e.type === "ping")).toHaveLength(2);

    finish({ evaluation, model: "MiniMax-M3" });
    await done;
    expect(events().at(-1).type).toBe("result");
  });

  it("reports an evaluation failure as an error event with its status", async () => {
    mocks.requestEvaluation.mockRejectedValue(
      new ScreeningError(504, "MiniMax timed out", {
        publicMessage: "MiniMax took too long to evaluate the proposal.",
      }),
    );
    const { req, res, events, state } = mockReqRes(validBody);

    await handler(req, res);

    expect(events().at(-1)).toEqual({
      type: "error",
      status: 504,
      error: "MiniMax timed out",
      message: "MiniMax took too long to evaluate the proposal.",
    });
    expect(state.ended).toBe(true);
  });

  it("keeps fast validation errors as plain JSON with their status", async () => {
    const { req, res, state } = mockReqRes({ title: "short", proposal: "x" });

    await handler(req, res);

    expect(state.status).toBe(400);
    expect(state.chunks).toHaveLength(0);
    expect(mocks.requestEvaluation).not.toHaveBeenCalled();
  });

  it("rejects accounts off the allowlist with JSON 403 before streaming", async () => {
    vi.stubEnv("NEAR_ACCESS_ALLOWLIST", "bob.near");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { req, res, state } = mockReqRes(validBody);

    await handler(req, res);

    expect(state.status).toBe(403);
    expect(state.json).toMatchObject({ error: "not_authorized" });
    expect(state.chunks).toHaveLength(0);
  });
});
