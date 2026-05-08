import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  requestEvaluation,
  resolveScreeningModelProvider,
  ScreeningError,
} from "@/server/screening";

const evaluation = {
  complete: { pass: true, reason: "Complete" },
  legible: { pass: true, reason: "Legible" },
  consistent: { pass: true, reason: "Consistent" },
  compliant: { pass: true, reason: "Compliant" },
  justified: { pass: true, reason: "Justified" },
  measurable: { pass: true, reason: "Measurable" },
  relevant: { score: "high", reason: "Relevant" },
  material: { score: "medium", reason: "Material" },
  qualityScore: 1,
  attentionScore: 0.8,
  overallPass: true,
  summary: "Ready",
};

const originalEnv = { ...process.env };

function mockProviderResponse(id: string) {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: async () => ({
      id,
      choices: [{ message: { content: JSON.stringify(evaluation) } }],
    }),
  } as Response);
}

describe("screening provider selection", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("defaults to NEAR AI and accepts NEAR aliases", () => {
    expect(resolveScreeningModelProvider(undefined)).toBe("nearai");
    expect(resolveScreeningModelProvider("nearai")).toBe("nearai");
    expect(resolveScreeningModelProvider("near-ai")).toBe("nearai");
    expect(resolveScreeningModelProvider("nirai")).toBe("nearai");
  });

  it("accepts MiniMax", () => {
    expect(resolveScreeningModelProvider("minimax")).toBe("minimax");
  });

  it("rejects unsupported providers", () => {
    expect(() => resolveScreeningModelProvider("other")).toThrow(
      ScreeningError,
    );
  });

  it("uses NEAR AI when SCREENING_MODEL_PROVIDER is nearai", async () => {
    process.env.SCREENING_MODEL_PROVIDER = "nearai";
    process.env.NEAR_AI_CLOUD_API_KEY = "near-key";
    process.env.NEAR_AI_MODEL = "openai/custom";
    mockProviderResponse("near-message-id");

    const result = await requestEvaluation("Title", "Proposal");
    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body));

    expect(url).toBe("https://cloud-api.near.ai/v1/chat/completions");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer near-key" });
    expect(body.model).toBe("openai/custom");
    expect(result.model).toBe("openai/custom");
    expect(result.verificationId).toBe("near-message-id");
  });

  it("uses MiniMax without treating response ids as NEAR AI verification ids", async () => {
    process.env.SCREENING_MODEL_PROVIDER = "minimax";
    process.env.MINIMAX_API_KEY = "minimax-key";
    process.env.MINIMAX_MODEL = "MiniMax-custom";
    mockProviderResponse("minimax-message-id");

    const result = await requestEvaluation("Title", "Proposal");
    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body));

    expect(url).toBe("https://api.minimax.io/v1/chat/completions");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer minimax-key",
    });
    expect(body.model).toBe("MiniMax-custom");
    expect(result.model).toBe("MiniMax-custom");
    expect(result.verification).toBeUndefined();
    expect(result.verificationId).toBeUndefined();
  });
});
