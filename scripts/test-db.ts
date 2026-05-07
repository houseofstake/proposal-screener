#!/usr/bin/env bun

import { db } from "../src/lib/db";
import { screeningResults } from "../src/lib/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import type { Evaluation } from "../src/types/evaluation";

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

const log = {
  success: (msg: string) =>
    console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

const testAccount = "test.near";
const testProposalContent =
  "Test proposal content for validating the current screening_results schema.";
const insertedSubmissionIds: string[] = [];
let firstSubmissionId: string | null = null;

const testEvaluation: Evaluation = {
  // Quality criteria
  complete: { pass: true, reason: "Test complete" },
  legible: { pass: true, reason: "Test legible" },
  consistent: { pass: true, reason: "Test consistent" },
  compliant: { pass: true, reason: "Test compliant" },
  justified: { pass: true, reason: "Test justified" },
  measurable: { pass: true, reason: "Test measurable" }, // NEW

  // Attention scores
  relevant: { score: "high", reason: "Test relevant" }, // NEW
  material: { score: "high", reason: "Test material" }, // NEW

  // Computed scores
  qualityScore: 1.0, // NEW
  attentionScore: 1.0, // NEW

  overallPass: true,
  summary: "Test summary",
};

async function testConnection() {
  log.info("Testing database connection...");
  try {
    const result = (await db.execute(
      sql`SELECT NOW() as time, version() as version`
    )) as Array<{ time: string; version: string }>;

    log.success("Database connected!");
    console.log(`   Time: ${result[0].time}`);
    const pgVersion =
      result[0] && typeof result[0].version === "string"
        ? result[0].version.split(",")[0]
        : String(result[0]?.version);
    console.log(`   PostgreSQL: ${pgVersion}`);
    return true;
  } catch (error) {
    log.error(`Connection failed: ${error}`);
    return false;
  }
}

async function testInsert() {
  log.info("Testing INSERT operation...");
  try {
    const [row] = await db
      .insert(screeningResults)
      .values({
        evaluation: testEvaluation,
        title: "Test Proposal",
        proposalContent: testProposalContent,
        nearAccount: testAccount,
        qualityScore: testEvaluation.qualityScore,
        attentionScore: testEvaluation.attentionScore,
      })
      .returning({ submissionId: screeningResults.submissionId });

    firstSubmissionId = row.submissionId;
    insertedSubmissionIds.push(row.submissionId);

    log.success("Insert successful!");
    return true;
  } catch (error) {
    log.error(`Insert failed: ${error}`);
    return false;
  }
}

async function testSelect() {
  log.info("Testing SELECT operation...");
  if (!firstSubmissionId) {
    log.error("Select failed: Insert did not return a submissionId");
    return false;
  }

  try {
    const result = await db
      .select()
      .from(screeningResults)
      .where(eq(screeningResults.submissionId, firstSubmissionId))
      .limit(1);

    if (!result || result.length === 0) {
      log.error("Select failed: No data returned");
      return false;
    }

    const screening = result[0];
    log.success("Select successful!");
    console.log(`   Submission ID: ${screening.submissionId}`);
    console.log(`   Title: ${screening.title}`);
    console.log(`   Account: ${screening.nearAccount}`);
    console.log(`   Passed: ${screening.evaluation.overallPass}`);
    console.log(`   Quality Score: ${screening.qualityScore}`);
    console.log(`   Attention Score: ${screening.attentionScore}`);
    console.log(`   Timestamp: ${screening.timestamp}`);
    return true;
  } catch (error) {
    log.error(`Select failed: ${error}`);
    return false;
  }
}

async function testMultipleScreenings() {
  log.info("Testing multiple screenings for same account...");
  try {
    const mediumEvaluation: Evaluation = {
      ...testEvaluation,
      consistent: { pass: false, reason: "Found inconsistencies" },
      relevant: { score: "medium", reason: "Moderate relevance" },
      qualityScore: 0.83, // 5/6 pass
      attentionScore: 0.75, // high + medium = (1 + 0.5) / 2
    };

    const lowEvaluation: Evaluation = {
      ...testEvaluation,
      complete: { pass: false, reason: "Missing budget" },
      legible: { pass: false, reason: "Unclear objectives" },
      consistent: { pass: false, reason: "Contradictions found" },
      relevant: { score: "low", reason: "Not ecosystem-aligned" },
      material: { score: "low", reason: "Minimal impact" },
      qualityScore: 0.5, // 3/6 pass
      attentionScore: 0.0, // low + low = (0 + 0) / 2
      overallPass: false,
    };

    const rows = await db
      .insert(screeningResults)
      .values([
        {
          evaluation: mediumEvaluation,
          title: "Test Proposal (Medium Scores)",
          proposalContent: testProposalContent,
          nearAccount: testAccount,
          qualityScore: mediumEvaluation.qualityScore,
          attentionScore: mediumEvaluation.attentionScore,
        },
        {
          evaluation: lowEvaluation,
          title: "Test Proposal (Low Scores)",
          proposalContent: testProposalContent,
          nearAccount: testAccount,
          qualityScore: lowEvaluation.qualityScore,
          attentionScore: lowEvaluation.attentionScore,
        },
      ])
      .returning({ submissionId: screeningResults.submissionId });

    insertedSubmissionIds.push(...rows.map((row) => row.submissionId));

    const screenings = await db
      .select()
      .from(screeningResults)
      .where(inArray(screeningResults.submissionId, insertedSubmissionIds));

    if (screenings.length === 3) {
      log.success(
        `Multiple screenings working! Found ${screenings.length} rows`
      );
      screenings.forEach((screening) => {
        console.log(
          `   ${screening.title}: ${
            screening.evaluation.overallPass ? "Pass" : "Fail"
          } (Q: ${screening.qualityScore}, A: ${screening.attentionScore})`
        );
      });
      return true;
    }

    log.error(`Expected 3 screenings, got ${screenings.length}`);
    return false;
  } catch (error) {
    log.error(`Multiple screenings test failed: ${error}`);
    return false;
  }
}

async function testJsonQuery() {
  log.info("Testing JSON query (overallPass)...");
  try {
    const result = await db
      .select()
      .from(screeningResults)
      .where(sql`evaluation->>'overallPass' = 'true'`)
      .limit(5);

    log.success(
      `JSON query successful! Found ${result.length} passed screening(s)`
    );
    return true;
  } catch (error) {
    log.error(`JSON query failed: ${error}`);
    return false;
  }
}

async function testNewJsonQueries() {
  log.info("Testing new JSON queries (relevant/material)...");
  try {
    // Test relevant score query
    const highRelevant = await db
      .select()
      .from(screeningResults)
      .where(sql`evaluation->'relevant'->>'score' = 'high'`)
      .limit(5);

    // Test material score query
    const highMaterial = await db
      .select()
      .from(screeningResults)
      .where(sql`evaluation->'material'->>'score' = 'high'`)
      .limit(5);

    log.success(
      `New JSON queries successful! Found ${highRelevant.length} high-relevant, ${highMaterial.length} high-material`
    );
    return true;
  } catch (error) {
    log.error(`New JSON queries failed: ${error}`);
    return false;
  }
}

async function testScoreQueries() {
  log.info("Testing quality/attention score queries...");
  try {
    // Test quality score query
    const highQuality = await db
      .select()
      .from(screeningResults)
      .where(sql`quality_score >= 0.8`)
      .limit(5);

    // Test attention score query
    const highAttention = await db
      .select()
      .from(screeningResults)
      .where(sql`attention_score >= 0.75`)
      .limit(5);

    log.success(
      `Score queries successful! Found ${highQuality.length} high-quality, ${highAttention.length} high-attention`
    );
    return true;
  } catch (error) {
    log.error(`Score queries failed: ${error}`);
    return false;
  }
}

async function testCleanup() {
  log.info("Cleaning up test data...");
  if (insertedSubmissionIds.length === 0) {
    log.warn("No inserted test rows to clean up.");
    return true;
  }

  try {
    await db
      .delete(screeningResults)
      .where(inArray(screeningResults.submissionId, insertedSubmissionIds));
    log.success("Cleanup successful!");
    return true;
  } catch (error) {
    log.error(`Cleanup failed: ${error}`);
    return false;
  }
}

async function runAllTests() {
  console.log("\n🧪 Drizzle Database Test Suite (New Evaluation Structure)\n");
  console.log("=".repeat(50));

  const results = {
    connection: await testConnection(),
    insert: false,
    select: false,
    multipleScreenings: false,
    jsonQuery: false,
    newJsonQueries: false,
    scoreQueries: false,
    cleanup: false,
  };

  if (!results.connection) {
    log.error("\nConnection failed. Check your DATABASE_URL in .env");
    log.info(
      "Current DATABASE_URL: " +
        (process.env.DATABASE_URL ? "✓ Set" : "✗ Not set")
    );
    process.exit(1);
  }

  console.log("");
  results.insert = await testInsert();
  console.log("");
  results.select = await testSelect();
  console.log("");
  results.multipleScreenings = await testMultipleScreenings();
  console.log("");
  results.jsonQuery = await testJsonQuery();
  console.log("");
  results.newJsonQueries = await testNewJsonQueries();
  console.log("");
  results.scoreQueries = await testScoreQueries();
  console.log("");
  results.cleanup = await testCleanup();

  console.log("\n" + "=".repeat(50));
  console.log("\n📊 Test Results:\n");

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? colors.green + "✓" : colors.red + "✗";
    console.log(`${status}${colors.reset} ${test}`);
  });

  console.log(`\n${passed}/${total} tests passed`);

  if (passed === total) {
    console.log(
      `\n${colors.green}🎉 All tests passed! New evaluation structure is ready.${colors.reset}\n`
    );
    process.exit(0);
  } else {
    console.log(
      `\n${colors.red}⚠️  Some tests failed. Check the errors above.${colors.reset}\n`
    );
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  log.error(`Unexpected error: ${error}`);
  process.exit(1);
});
