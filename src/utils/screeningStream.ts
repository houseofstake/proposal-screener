import type { VerificationMetadata } from "@/types/agui-events";
import type { Evaluation } from "@/types/evaluation";

/**
 * Wire format for the slow part of POST /api/screen.
 *
 * Once the request has passed auth, allowlist, rate-limit and input checks
 * (which still answer with normal JSON + status codes), the server sends 200
 * headers immediately and streams newline-delimited JSON events while the AI
 * evaluates. Steady bytes keep proxies (e.g. Railway's edge) from cutting the
 * connection with a 502 during a multi-minute evaluation.
 */
export const SCREEN_STREAM_CONTENT_TYPE = "application/x-ndjson";

export interface ScreenResult {
  submissionId?: string;
  evaluation: Evaluation;
  authenticatedAs: string;
  verification?: VerificationMetadata | null;
  verificationId?: string | null;
  model?: string | null;
}

export type ScreenStreamEvent =
  | { type: "progress"; stage: "evaluating" }
  | { type: "ping" }
  | { type: "result"; data: ScreenResult }
  | { type: "error"; status: number; error: string; message?: string };

export class ScreenStreamError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ScreenStreamError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Reads the NDJSON stream from POST /api/screen and resolves with the result
 * event, or throws on an error event / a stream that ends without a result.
 */
export async function readScreenStream(
  response: Response,
): Promise<ScreenResult> {
  if (!response.body) {
    throw new Error("Empty response from the screening server.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleLine = (line: string): ScreenResult | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    let event: ScreenStreamEvent;
    try {
      event = JSON.parse(trimmed);
    } catch {
      return null;
    }

    if (event.type === "result") return event.data;
    if (event.type === "error") {
      throw new ScreenStreamError(
        event.status,
        event.error,
        event.message || event.error || "Failed to evaluate proposal",
      );
    }
    return null; // progress / ping
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const result = handleLine(line);
      if (result) return result;
    }
  }

  buffer += decoder.decode();
  const result = handleLine(buffer);
  if (result) return result;

  throw new Error(
    "The connection closed before the evaluation finished. Please try again.",
  );
}
