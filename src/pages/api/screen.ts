import { NextApiRequest, NextApiResponse } from "next";
import {
  sanitizeProposalInput,
  verifyNearAuth,
  requestEvaluation,
  respondWithScreeningError,
} from "@/server/screening";
import { createRateLimiter } from "@/server/rateLimiter";
import { rateLimitConfig } from "@/config/rateLimit";
import { saveScreeningResult } from "@/lib/db/queries";

const screenLimiter = createRateLimiter(rateLimitConfig.screen);

/**
 * POST /api/screen
 *
 * Authenticated screening endpoint - evaluates a proposal AND persists the
 * result. Requires a NEAR wallet signature (NEP-413). Returns the evaluation
 * along with a server-generated `submissionId` the client can use to retrieve
 * the stored analysis later via GET /api/getAnalysis/[submissionId].
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

    return res.status(200).json({
      submissionId,
      evaluation,
      authenticatedAs: nearAddress,
      verification,
      verificationId,
      model,
    });
  } catch (error) {
    return respondWithScreeningError(res, error, "Failed to evaluate proposal");
  }
}
