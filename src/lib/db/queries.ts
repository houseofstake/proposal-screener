import { db } from "./index";
import {
  screeningResults,
  type NewScreeningResult,
  type ScreeningResult,
} from "./schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

/**
 * Get a screening result by its submissionId.
 */
export async function getScreeningResult(
  submissionId: string
): Promise<ScreeningResult | null> {
  const result = await db
    .select()
    .from(screeningResults)
    .where(eq(screeningResults.submissionId, submissionId))
    .limit(1);

  return result[0] || null;
}

/**
 * Save a screening result. If `submissionId` is omitted on the input the
 * column default (gen_random_uuid via drizzle's defaultRandom) generates one
 * server-side. Returns the persisted row, including the submissionId.
 */
export async function saveScreeningResult(
  data: Omit<NewScreeningResult, "qualityScore" | "attentionScore">
): Promise<ScreeningResult> {
  const evaluation = data.evaluation as { qualityScore?: number; attentionScore?: number };
  const qualityScore = evaluation.qualityScore ?? null;
  const attentionScore = evaluation.attentionScore ?? null;

  const [row] = await db
    .insert(screeningResults)
    .values({
      ...data,
      qualityScore,
      attentionScore,
    })
    .returning();

  return row;
}

/**
 * List all screening results submitted by a given NEAR account, newest first.
 */
export async function getScreeningsByAccount(
  nearAccount: string,
  limit = 50
): Promise<ScreeningResult[]> {
  return db
    .select()
    .from(screeningResults)
    .where(eq(screeningResults.nearAccount, nearAccount))
    .orderBy(desc(screeningResults.timestamp))
    .limit(limit);
}

/**
 * Recent screening results across all accounts, newest first.
 */
export async function getRecentScreenings(
  limit = 10
): Promise<ScreeningResult[]> {
  return db
    .select()
    .from(screeningResults)
    .orderBy(desc(screeningResults.timestamp))
    .limit(limit);
}

/**
 * Filter screenings by quality score range.
 */
export async function getScreeningsByQuality(
  minScore: number,
  maxScore: number = 1.0,
  limit = 20
): Promise<ScreeningResult[]> {
  return db
    .select()
    .from(screeningResults)
    .where(
      and(
        gte(screeningResults.qualityScore, minScore),
        lte(screeningResults.qualityScore, maxScore)
      )
    )
    .orderBy(desc(screeningResults.timestamp))
    .limit(limit);
}

/**
 * Filter screenings by attention score range.
 */
export async function getScreeningsByAttention(
  minScore: number,
  maxScore: number = 1.0,
  limit = 20
): Promise<ScreeningResult[]> {
  return db
    .select()
    .from(screeningResults)
    .where(
      and(
        gte(screeningResults.attentionScore, minScore),
        lte(screeningResults.attentionScore, maxScore)
      )
    )
    .orderBy(desc(screeningResults.timestamp))
    .limit(limit);
}

/**
 * High-quality, high-attention screenings for highlight feeds.
 */
export async function getTopProposals(limit = 10): Promise<ScreeningResult[]> {
  return db
    .select()
    .from(screeningResults)
    .where(
      and(
        gte(screeningResults.qualityScore, 0.8),
        gte(screeningResults.attentionScore, 0.75)
      )
    )
    .orderBy(
      desc(screeningResults.qualityScore),
      desc(screeningResults.attentionScore),
      desc(screeningResults.timestamp)
    )
    .limit(limit);
}

/**
 * Filter by relevance score (high/medium/low).
 */
export async function getScreeningsByRelevance(
  relevance: "high" | "medium" | "low",
  limit = 20
): Promise<ScreeningResult[]> {
  return db
    .select()
    .from(screeningResults)
    .where(
      sql`(${screeningResults.evaluation}->'relevant'->>'score') = ${relevance}`
    )
    .orderBy(desc(screeningResults.timestamp))
    .limit(limit);
}

/**
 * Filter by materiality score (high/medium/low).
 */
export async function getScreeningsByMateriality(
  material: "high" | "medium" | "low",
  limit = 20
): Promise<ScreeningResult[]> {
  return db
    .select()
    .from(screeningResults)
    .where(
      sql`(${screeningResults.evaluation}->'material'->>'score') = ${material}`
    )
    .orderBy(desc(screeningResults.timestamp))
    .limit(limit);
}

/**
 * Aggregate screening statistics.
 */
export async function getScreeningStats(): Promise<{
  total: number;
  passed: number;
  failed: number;
  avgQualityScore: number;
  avgAttentionScore: number;
}> {
  const [row] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      passed: sql<number>`
        COUNT(*) FILTER (
          WHERE (evaluation->>'overallPass')::boolean = true
        )
      `,
      avgQualityScore: sql<number>`AVG(${screeningResults.qualityScore})`,
      avgAttentionScore: sql<number>`AVG(${screeningResults.attentionScore})`,
    })
    .from(screeningResults);

  const total = Number(row?.total ?? 0);
  const passed = Number(row?.passed ?? 0);

  return {
    total,
    passed,
    failed: Math.max(total - passed, 0),
    avgQualityScore: Number(row?.avgQualityScore ?? 0),
    avgAttentionScore: Number(row?.avgAttentionScore ?? 0),
  };
}

/**
 * Delete a screening result by submissionId.
 * Should only be used by admins/moderators or by the original submitter.
 */
export async function deleteScreeningResult(
  submissionId: string
): Promise<void> {
  await db
    .delete(screeningResults)
    .where(eq(screeningResults.submissionId, submissionId));
}

/**
 * Count total screening results.
 */
export async function countScreenings(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(screeningResults);

  return Number(row?.count ?? 0);
}
