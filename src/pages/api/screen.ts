import { NextApiRequest, NextApiResponse } from "next";
import {
  sanitizeProposalInput,
  verifyNearAuth,
  requestEvaluation,
  respondWithScreeningError,
  screeningErrorPayload,
} from "@/server/screening";
import { assertAccountAllowed } from "@/server/accessControl";
import { createRateLimiter } from "@/server/rateLimiter";
import { rateLimitConfig } from "@/config/rateLimit";
import { saveScreeningResult } from "@/lib/db/queries";
import {
  SCREEN_STREAM_CONTENT_TYPE,
  type ScreenStreamEvent,
} from "@/utils/screeningStream";

const screenLimiter = createRateLimiter(rateLimitConfig.screen);

/** How often a keep-alive event is sent while the AI is evaluating. */
export const HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * POST /api/screen
 *
 * Authenticated screening endpoint - evaluates a proposal AND persists the
 * result. Requires a NEAR wallet signature (NEP-413). Returns the evaluation
 * along with a server-generated `submissionId` the client can use to retrieve
 * the stored analysis later via GET /api/getAnalysis/[submissionId].
 *
 * Auth, allowlist, rate-limit and input errors are plain JSON with their
 * status codes. Once those pass, the response switches to an NDJSON stream
 * (see src/utils/screeningStream.ts): 200 headers immediately, a keep-alive
 * event every 15 s, then one `result` or `error` event. Without steady bytes,
 * Railway's edge proxy cuts multi-minute evaluations with a 502 even though
 * the server finishes and saves the result.
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  let verificationResult;
  try {
    ({ result: verificationResult } = await verifyNearAuth(authHeader));
  } catch (error) {
    return respondWithScreeningError(
      res,
      error,
      "Connect your NEAR wallet to evaluate this proposal."
    );
  }

  const nearAddress = verificationResult.accountId;

  // Internal-preview allowlist: reject before rate limiting or any AI/DB work.
  try {
    assertAccountAllowed(nearAddress);
  } catch (error) {
    return respondWithScreeningError(res, error);
  }

  // Apply rate limit per NEAR account
  const { allowed, remaining, resetTime } = screenLimiter.check(nearAddress);
  const secondsUntilReset = Math.max(
    0,
    Math.ceil((resetTime - Date.now()) / 1000)
  );
  res.setHeader("X-RateLimit-Remaining", Math.max(remaining, 0).toString());
  res.setHeader("X-RateLimit-Limit", screenLimiter.limit.toString());
  res.setHeader("X-RateLimit-Reset", secondsUntilReset.toString());

  if (!allowed) {
    const retryAfter =
      secondsUntilReset || rateLimitConfig.screen.windowMs / 1000;
    res.setHeader("Retry-After", retryAfter.toString());
    return res.status(429).json({
      error: "Too many requests",
      message: `Rate limit exceeded for ${nearAddress}. Please wait ${Math.ceil(
        retryAfter / 60
      )} minutes and try again.`,
      retryAfter,
    });
  }

  const { title, proposal } = req.body;
  let sanitizedTitle: string;
  let sanitizedProposal: string;
  try {
    const sanitized = sanitizeProposalInput(title, proposal);
    sanitizedTitle = sanitized.title;
    sanitizedProposal = sanitized.content;
  } catch (error) {
    return respondWithScreeningError(res, error);
  }

  res.writeHead(200, {
    "Content-Type": `${SCREEN_STREAM_CONTENT_TYPE}; charset=utf-8`,
    // no-transform keeps Next's gzip middleware from buffering the stream.
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });

  const send = (event: ScreenStreamEvent) => {
    if (res.writableEnded || res.destroyed) return;
    res.write(`${JSON.stringify(event)}\n`);
    (res as unknown as { flush?: () => void }).flush?.();
  };

  send({ type: "progress", stage: "evaluating" });
  const heartbeat = setInterval(
    () => send({ type: "ping" }),
    HEARTBEAT_INTERVAL_MS
  );
  // If the client goes away, stop pinging; the evaluation still finishes and
  // is saved, so it isn't lost.
  res.on("close", () => clearInterval(heartbeat));

  try {
    const { evaluation, verification, verificationId, model } =
      await requestEvaluation(sanitizedTitle, sanitizedProposal);

    let submissionId: string | undefined;
    try {
      const saved = await saveScreeningResult({
        title: sanitizedTitle,
        proposalContent: sanitizedProposal,
        evaluation,
        nearAccount: nearAddress,
        model,
        verificationId: verificationId ?? null,
      });
      submissionId = saved.submissionId;
    } catch (dbError) {
      // Persistence is best-effort: log and still return the evaluation so the
      // user is not blocked by transient DB issues.
      console.error("[Screen] Failed to persist screening result:", dbError);
    }

    console.log(
      `[Screen] Evaluation complete for ${nearAddress} - Pass: ${
        evaluation.overallPass
      }, Quality: ${(evaluation.qualityScore * 100).toFixed(0)}%, Attention: ${(
        evaluation.attentionScore * 100
      ).toFixed(0)}%, submissionId: ${submissionId ?? "(unsaved)"}`
    );

    send({
      type: "result",
      data: {
        submissionId,
        evaluation,
        authenticatedAs: nearAddress,
        verification,
        verificationId,
        model,
      },
    });
  } catch (error) {
    const { status, body } = screeningErrorPayload(
      error,
      "Failed to evaluate proposal"
    );
    send({ type: "error", status, error: body.error, message: body.message });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
}
