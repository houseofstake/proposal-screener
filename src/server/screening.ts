import { buildScreeningPrompt } from "@/lib/prompts/screenProposal";
import { NotAuthorizedError } from "@/server/accessControl";
import type { VerificationMetadata } from "@/types/agui-events";
import type { Evaluation } from "@/types/evaluation";
import {
  extractVerificationMetadata,
  normalizeVerificationPayload,
} from "@/utils/verification";
import {
  verify,
  type VerificationResult,
  type VerifyOptions,
} from "near-sign-verify";
import type { NextApiResponse } from "next";
import { z } from "zod";

type ScreeningErrorDetails = {
  code?: string;
  message?: string;
  details?: string;
  body?: string;
  status?: number;
  statusText?: string;
  /** Safe to show the user; takes precedence over an endpoint's fallback message. */
  publicMessage?: string;
  [key: string]: unknown;
};

export class ScreeningError extends Error {
  statusCode: number;
  details?: ScreeningErrorDetails;

  constructor(
    statusCode: number,
    message: string,
    details?: ScreeningErrorDetails,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const MIN_TITLE_LENGTH = 12;
export const MAX_TITLE_LENGTH = 255;
export const MIN_CONTENT_LENGTH = 12;
export const MAX_CONTENT_LENGTH = 65000;
const PROMPT_CONTENT_LIMIT = MAX_CONTENT_LENGTH;

const CONTROL_CHAR_REGEX = /[\x00-\x1F\x7F]/g;

export function sanitizeProposalInput(
  title?: string,
  content?: string,
): { title: string; content: string } {
  if (!title || !title.trim()) {
    throw new ScreeningError(400, "Proposal title is required");
  }

  if (!content || !content.trim()) {
    throw new ScreeningError(400, "Proposal text is required");
  }

  if (title.trim().length < MIN_TITLE_LENGTH) {
    throw new ScreeningError(
      400,
      `Title too short (min ${MIN_TITLE_LENGTH} characters)`,
    );
  }

  if (title.length > MAX_TITLE_LENGTH) {
    throw new ScreeningError(
      400,
      `Title too long (max ${MAX_TITLE_LENGTH} characters)`,
    );
  }

  if (content.trim().length < MIN_CONTENT_LENGTH) {
    throw new ScreeningError(
      400,
      `Proposal text too short (min ${MIN_CONTENT_LENGTH} characters)`,
    );
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    throw new ScreeningError(
      400,
      `Proposal too long (max ${MAX_CONTENT_LENGTH} characters)`,
    );
  }

  const sanitize = (text: string) =>
    text.trim().replace(CONTROL_CHAR_REGEX, "");

  const sanitizedTitle = sanitize(title);
  let sanitizedContent = sanitize(content);
  sanitizedContent = sanitizedContent
    .replace(/<br\s*\/?>(?=\s|$)/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r?\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (sanitizedContent.length > PROMPT_CONTENT_LIMIT) {
    sanitizedContent =
      sanitizedContent.slice(0, PROMPT_CONTENT_LIMIT) +
      "\n\n[... content truncated for screening ...]";
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[Screening] sending chars:", sanitizedContent.length);
  }

  return {
    title: sanitizedTitle,
    content: sanitizedContent,
  };
}

export async function verifyNearAuth(
  authHeader: string | undefined,
  options?: VerifyOptions,
): Promise<{ token: string; result: VerificationResult }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ScreeningError(401, "NEAR authentication required", {
      code: "missing_token",
    });
  }

  const token = authHeader.substring(7);

  try {
    const verifyOptions = {
      expectedRecipient: "social.near",
      nonceMaxAge: 5 * 60 * 1000,
      ...(options || {}),
    } as VerifyOptions;

    const result = await verify(token, verifyOptions);
    return { token, result };
  } catch (error: unknown) {
    const details =
      error instanceof Error ? error.message : "Unknown verification error";
    throw new ScreeningError(401, "Invalid authentication", {
      code: "invalid_token",
      details,
    });
  }
}

export const QUALITY_KEYS = [
  "complete",
  "legible",
  "consistent",
  "compliant",
  "justified",
  "measurable",
  "constitutional",
] as const;

const ATTENTION_WEIGHTS = { high: 1, medium: 0.5, low: 0 } as const;

const criterionSchema = z.object({
  pass: z.boolean(),
  reason: z.string(),
  suggestedEdit: z.string().optional().default(""),
});

const attentionSchema = z.object({
  // Models occasionally capitalise the enum ("High"); normalise before checking.
  score: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.enum(["high", "medium", "low"])),
  reason: z.string(),
});

/**
 * Shape the model must return. The model's own qualityScore / attentionScore /
 * overallPass are deliberately not part of the schema: they are dropped and
 * recomputed from the per-criterion results so a model arithmetic slip (or a
 * prompt-injected "overallPass": true) can't disagree with the criteria.
 */
const modelEvaluationSchema = z.object({
  complete: criterionSchema,
  legible: criterionSchema,
  consistent: criterionSchema,
  compliant: criterionSchema,
  justified: criterionSchema,
  measurable: criterionSchema,
  constitutional: criterionSchema,
  relevant: attentionSchema,
  material: attentionSchema,
  summary: z.string(),
});

type ModelEvaluation = z.infer<typeof modelEvaluationSchema>;

export function computeEvaluationScores(
  evaluation: ModelEvaluation,
): Pick<Evaluation, "qualityScore" | "attentionScore" | "overallPass"> {
  const passed = QUALITY_KEYS.filter((key) => evaluation[key].pass).length;
  const attentionScore =
    (ATTENTION_WEIGHTS[evaluation.relevant.score] +
      ATTENTION_WEIGHTS[evaluation.material.score]) /
    2;

  return {
    qualityScore: passed / QUALITY_KEYS.length,
    attentionScore,
    overallPass: passed === QUALITY_KEYS.length,
  };
}

/**
 * Extracts the JSON object from the model's reply, validates it against the
 * evaluation schema, and fills in server-computed scores.
 */
export function parseEvaluation(contentText: string): Evaluation {
  // Reasoning models (e.g. MiniMax) may inline their thinking before the answer
  // as <think>…</think>; braces inside it would break the JSON extraction.
  const thinkEnd = contentText.lastIndexOf("</think>");
  const answer =
    thinkEnd === -1 ? contentText : contentText.slice(thinkEnd + 8);

  const jsonMatch = answer.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new ScreeningError(502, "Could not parse evaluation response");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new ScreeningError(502, "Could not parse evaluation response", {
      code: "invalid_json",
      details: error instanceof Error ? error.message : undefined,
    });
  }

  const parsed = modelEvaluationSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      "[Screening] Evaluation failed schema validation:",
      z.prettifyError(parsed.error),
    );
    throw new ScreeningError(
      502,
      "Invalid evaluation structure returned by AI",
      { code: "invalid_evaluation", details: z.prettifyError(parsed.error) },
    );
  }

  return { ...parsed.data, ...computeEvaluationScores(parsed.data) };
}

export interface EvaluationRequestResult {
  evaluation: Evaluation;
  verification?: VerificationMetadata;
  verificationId?: string;
  model: string;
}

export type ScreeningModelProvider = "nearai" | "minimax";

type ScreeningProviderConfig = {
  provider: ScreeningModelProvider;
  label: string;
  apiKeyEnv: string;
  apiKey?: string;
  baseUrl: string;
  model: string;
  supportsVerification: boolean;
  /**
   * Request a streamed (SSE) response. Headers arrive immediately, so a long
   * generation can't trip Node fetch's 5-minute headers timeout. NEAR AI stays
   * non-streaming because its verification metadata is read from the full
   * response body.
   */
  stream: boolean;
};

const DEFAULT_SCREENING_PROVIDER: ScreeningModelProvider = "nearai";

export function resolveScreeningModelProvider(
  value = process.env.SCREENING_MODEL_PROVIDER,
): ScreeningModelProvider {
  if (!value) return DEFAULT_SCREENING_PROVIDER;

  if (value === "minimax") {
    return "minimax";
  }

  if (value === "nearai") {
    return "nearai";
  }

  throw new ScreeningError(500, "Unsupported AI provider configured", {
    code: "unsupported_ai_provider",
    details:
      "Use SCREENING_MODEL_PROVIDER=nearai or SCREENING_MODEL_PROVIDER=minimax",
  });
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getScreeningProviderConfig(
  provider = resolveScreeningModelProvider(),
): ScreeningProviderConfig {
  if (provider === "minimax") {
    return {
      provider,
      label: "MiniMax",
      apiKeyEnv: "MINIMAX_API_KEY",
      apiKey: process.env.MINIMAX_API_KEY,
      baseUrl: stripTrailingSlash(
        process.env.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1",
      ),
      model: process.env.MINIMAX_MODEL ?? "MiniMax-M2.7",
      supportsVerification: false,
      stream: true,
    };
  }

  return {
    provider,
    label: "NEAR AI",
    apiKeyEnv: "NEAR_AI_CLOUD_API_KEY",
    apiKey: process.env.NEAR_AI_CLOUD_API_KEY,
    baseUrl: stripTrailingSlash(
      process.env.NEAR_AI_CLOUD_BASE_URL ?? "https://cloud-api.near.ai/v1",
    ),
    model: process.env.NEAR_AI_MODEL ?? "openai/gpt-oss-120b",
    supportsVerification: true,
    stream: false,
  };
}

const DEFAULT_SCREENING_TIMEOUT_MS = 10 * 60 * 1000;

function getScreeningTimeoutMs(): number {
  const parsed = Number(process.env.SCREENING_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_SCREENING_TIMEOUT_MS;
}

const UNDICI_TIMEOUT_CODES = new Set([
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_CONNECT_TIMEOUT",
]);

/**
 * Maps low-level fetch failures (our overall timeout, undici's built-in
 * timeouts, network errors) to ScreeningErrors with a user-facing message.
 */
function toProviderFetchError(
  error: unknown,
  label: string,
  elapsedMs: number,
): ScreeningError {
  if (error instanceof ScreeningError) return error;

  const name = error instanceof Error ? error.name : "";
  const cause = error instanceof Error ? error.cause : undefined;
  const causeCode =
    cause && typeof cause === "object" && "code" in cause
      ? String((cause as { code: unknown }).code)
      : undefined;
  const elapsed = `${(elapsedMs / 1000).toFixed(1)}s`;

  console.error(
    `[Screening] ${label} request failed after ${elapsed}:`,
    error,
  );

  if (
    name === "TimeoutError" ||
    name === "AbortError" ||
    (causeCode !== undefined && UNDICI_TIMEOUT_CODES.has(causeCode))
  ) {
    return new ScreeningError(504, `${label} timed out`, {
      code: "provider_timeout",
      details: causeCode ?? name,
      publicMessage: `${label} took too long to evaluate the proposal (${elapsed}). Please try again, or shorten the proposal.`,
    });
  }

  return new ScreeningError(502, `Could not reach ${label}`, {
    code: "provider_unreachable",
    details: causeCode ?? (error instanceof Error ? error.message : undefined),
    publicMessage: `Could not reach ${label} to evaluate the proposal. Please try again.`,
  });
}

type StreamChunk = {
  choices?: {
    delta?: { content?: unknown };
    finish_reason?: string | null;
  }[];
  error?: { message?: string };
  base_resp?: { status_code?: number; status_msg?: string };
};

/**
 * Reads an OpenAI-compatible SSE stream and returns the concatenated answer
 * content. Reasoning deltas (e.g. `reasoning_content`) are ignored.
 */
async function readStreamedContent(
  response: Response,
  label: string,
): Promise<string> {
  if (!response.body) {
    throw new ScreeningError(502, `Empty response from ${label}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let finishReason: string | null = null;

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") return;

    let chunk: StreamChunk;
    try {
      chunk = JSON.parse(payload);
    } catch {
      return; // keep-alive or partial noise
    }

    // Errors can arrive mid-stream with a 200 status (MiniMax reports them in
    // base_resp; OpenAI-style providers in `error`).
    const providerError =
      chunk.error?.message ??
      (chunk.base_resp?.status_code ? chunk.base_resp.status_msg ?? "" : null);
    if (providerError !== null) {
      throw new ScreeningError(502, `${label} API error`, {
        code: "provider_error",
        status: chunk.base_resp?.status_code,
        body: providerError,
      });
    }

    const choice = chunk.choices?.[0];
    if (typeof choice?.delta?.content === "string") {
      content += choice.delta.content;
    }
    if (choice?.finish_reason) finishReason = choice.finish_reason;
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(handleLine);
  }
  buffer += decoder.decode();
  if (buffer) handleLine(buffer);

  if (finishReason === "length") {
    throw new ScreeningError(502, `${label} response was cut off`, {
      code: "truncated_response",
      publicMessage: `${label}'s evaluation was cut off before it finished. Please try again, or shorten the proposal.`,
    });
  }

  return content;
}

export async function requestEvaluation(
  title: string,
  content: string,
): Promise<EvaluationRequestResult> {
  const config = getScreeningProviderConfig();
  if (!config.apiKey) {
    throw new ScreeningError(500, "AI API not configured", {
      code: "missing_api_key",
      details: `${config.apiKeyEnv} is required for ${config.label} screening`,
    });
  }

  const prompt = buildScreeningPrompt(title, content);
  const startedAt = Date.now();

  // Covers the whole exchange, including reading a streamed body. Note that
  // non-streaming requests still hit undici's 5-minute headers timeout first.
  const signal = AbortSignal.timeout(getScreeningTimeoutMs());

  let data: Record<string, any> = {};
  let contentText: unknown;
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        ...(config.stream ? { stream: true } : {}),
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => "Failed to read error body");
      console.error(
        `[Screening] ${config.label} API error:`,
        response.status,
        response.statusText,
        errorText,
      );
      const isTimeout = response.status === 504;

      throw new ScreeningError(
        isTimeout ? 504 : 502,
        isTimeout ? `${config.label} timed out` : `${config.label} API error`,
        {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          publicMessage: isTimeout
            ? `${config.label} timed out while evaluating the proposal. Please try again or shorten the content.`
            : undefined,
        },
      );
    }

    if (config.stream) {
      contentText = await readStreamedContent(response, config.label);
    } else {
      data = await response.json();
      contentText = data.choices?.[0]?.message?.content;
    }
  } catch (error) {
    throw toProviderFetchError(error, config.label, Date.now() - startedAt);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[Screening] ${config.label} responded in ${(
        (Date.now() - startedAt) /
        1000
      ).toFixed(1)}s`,
    );
  }

  if (typeof contentText !== "string" || !contentText) {
    throw new ScreeningError(500, "Empty response from AI");
  }

  const evaluation = parseEvaluation(contentText);
  evaluation.model = config.model;

  let verification: VerificationMetadata | undefined;
  let verificationId: string | null = null;

  if (config.supportsVerification) {
    const verificationRaw = extractVerificationMetadata(data);
    const verificationMessageId =
      data?.id ?? data?.choices?.[0]?.id ?? undefined;
    const normalized = normalizeVerificationPayload(
      verificationRaw,
      verificationMessageId,
    );
    verification = normalized.verification;
    verificationId = normalized.verificationId;
  }

  return {
    evaluation,
    verification,
    verificationId: verificationId ?? undefined,
    model: config.model,
  };
}

export function respondWithScreeningError(
  res: NextApiResponse,
  error: unknown,
  fallbackMessage?: string,
) {
  // Stable shape the UI keys on; never overridden by fallbackMessage.
  if (error instanceof NotAuthorizedError) {
    return res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    });
  }

  if (error instanceof ScreeningError) {
    const detailMessage =
      error.details?.publicMessage ??
      fallbackMessage ??
      [error.details?.details, error.details?.message, error.details?.body]
        .filter((value): value is string => typeof value === "string")
        .find((value) => value.length > 0) ??
      error.message;
    return res.status(error.statusCode).json({
      error: error.message,
      message: detailMessage,
      details:
        process.env.NODE_ENV === "development" ? error.details : undefined,
    });
  }

  console.error("[Screening] Unexpected error:", error);
  return res.status(500).json({
    error: "Failed to evaluate proposal",
    message: fallbackMessage || "An unexpected error occurred",
  });
}
