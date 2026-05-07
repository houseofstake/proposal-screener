import type { NextApiRequest, NextApiResponse } from "next";
import { getScreeningResult } from "@/lib/db/queries";
import {
  verifyNearAuth,
  respondWithScreeningError,
} from "@/server/screening";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/getAnalysis/[submissionId]
 *
 * Returns a previously-saved screening result. Requires NEAR wallet
 * authentication; only the original submitter (matched on `nearAccount`)
 * may retrieve the stored evaluation.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { submissionId } = req.query;
  if (typeof submissionId !== "string" || !UUID_RE.test(submissionId)) {
    return res.status(400).json({ error: "Invalid submissionId" });
  }

  const authHeader = req.headers.authorization;
  let verificationResult;
  try {
    ({ result: verificationResult } = await verifyNearAuth(authHeader));
  } catch (error) {
    return respondWithScreeningError(
      res,
      error,
      "Connect your NEAR wallet to view this analysis."
    );
  }

  const nearAddress = verificationResult.accountId;

  try {
    const row = await getScreeningResult(submissionId);
    if (!row) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    if (row.nearAccount !== nearAddress) {
      // Don't leak existence to other accounts.
      return res.status(404).json({ error: "Analysis not found" });
    }

    return res.status(200).json({
      submissionId: row.submissionId,
      title: row.title,
      proposalContent: row.proposalContent,
      evaluation: row.evaluation,
      nearAccount: row.nearAccount,
      model: row.model,
      verificationId: row.verificationId,
      timestamp: row.timestamp,
    });
  } catch (error) {
    console.error("[getAnalysis] Failed to load screening result:", error);
    return res.status(500).json({ error: "Failed to load analysis" });
  }
}
