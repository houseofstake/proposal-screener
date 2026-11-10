// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  readScreenStream,
  ScreenStreamError,
  type ScreenStreamEvent,
} from "@/utils/screeningStream";

function ndjsonResponse(text: string, chunkSize = 5): Response {
  const bytes = new TextEncoder().encode(text);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) {
        controller.enqueue(bytes.slice(i, i + chunkSize));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

const lines = (...events: ScreenStreamEvent[]) =>
  events.map((event) => `${JSON.stringify(event)}\n`).join("");

const result = {
  submissionId: "sub-1",
  evaluation: { summary: "Ready" },
  authenticatedAs: "alice.near",
  model: "MiniMax-M3",
} as never;

describe("readScreenStream", () => {
  it("skips progress and pings and resolves with the result", async () => {
    const data = await readScreenStream(
      ndjsonResponse(
        lines(
          { type: "progress", stage: "evaluating" },
          { type: "ping" },
          { type: "ping" },
          { type: "result", data: result },
        ),
      ),
    );
    expect(data.submissionId).toBe("sub-1");
    expect(data.authenticatedAs).toBe("alice.near");
  });

  it("handles a final result line without a trailing newline", async () => {
    const text = lines({ type: "ping" }) + JSON.stringify({ type: "result", data: result });
    const data = await readScreenStream(ndjsonResponse(text));
    expect(data.model).toBe("MiniMax-M3");
  });

  it("throws the server's message on an error event", async () => {
    const promise = readScreenStream(
      ndjsonResponse(
        lines(
          { type: "progress", stage: "evaluating" },
          {
            type: "error",
            status: 504,
            error: "MiniMax timed out",
            message: "MiniMax took too long to evaluate the proposal.",
          },
        ),
      ),
    );
    await expect(promise).rejects.toBeInstanceOf(ScreenStreamError);
    await expect(promise).rejects.toThrow(
      "MiniMax took too long to evaluate the proposal.",
    );
  });

  it("throws a clear error if the stream ends without a result", async () => {
    await expect(
      readScreenStream(
        ndjsonResponse(lines({ type: "progress", stage: "evaluating" }, { type: "ping" })),
      ),
    ).rejects.toThrow(/closed before the evaluation finished/);
  });
});
