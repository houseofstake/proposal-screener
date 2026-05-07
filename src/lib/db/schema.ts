import {
  pgTable,
  varchar,
  jsonb,
  text,
  timestamp,
  index,
  real,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Evaluation } from "@/types/evaluation";

/**
 * Screening results table
 *
 * Each row is one stand-alone screening run, identified by a server-generated
 * `submissionId` (UUID). The screener has no notion of multi-revision drafts
 * or external forum topics — every paste-and-screen produces a fresh row.
 *
 * The evaluation JSON contains:
 * - 6 quality criteria (complete, legible, consistent, compliant, justified, measurable)
 *   each with `pass`, `reason`, and `suggestedEdit`
 * - 2 attention scores (relevant, material) with `score` + `reason`
 * - Computed scores (qualityScore, attentionScore) and `overallPass`
 */
export const screeningResults = pgTable(
  "screening_results",
  {
    submissionId: uuid("submission_id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    proposalContent: text("proposal_content").notNull(),
    evaluation: jsonb("evaluation").$type<Evaluation>().notNull(),
    nearAccount: varchar("near_account", { length: 255 }).notNull(),
    model: varchar("model", { length: 255 }),
    verificationId: varchar("verification_id", { length: 255 }),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .defaultNow()
      .notNull(),

    // Computed columns extracted from the evaluation JSON for efficient querying
    qualityScore: real("quality_score"),
    attentionScore: real("attention_score"),
  },
  (table) => ({
    nearAccountIdx: index("idx_screening_results_near_account").on(
      table.nearAccount
    ),

    timestampIdx: index("idx_screening_results_timestamp").on(
      table.timestamp.desc()
    ),

    overallPassIdx: index("idx_screening_results_overall_pass").on(
      sql`((evaluation->>'overallPass')::boolean)`
    ),

    qualityScoreIdx: index("idx_screening_results_quality_score").on(
      table.qualityScore
    ),

    attentionScoreIdx: index("idx_screening_results_attention_score").on(
      table.attentionScore
    ),

    relevantScoreIdx: index("idx_screening_results_relevant").on(
      sql`(evaluation->'relevant'->>'score')`
    ),
    materialScoreIdx: index("idx_screening_results_material").on(
      sql`(evaluation->'material'->>'score')`
    ),
  })
);

// Export type for TypeScript
export type ScreeningResult = typeof screeningResults.$inferSelect;
export type NewScreeningResult = typeof screeningResults.$inferInsert;
