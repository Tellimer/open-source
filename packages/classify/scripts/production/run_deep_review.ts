#!/usr/bin/env -S deno run --allow-all
/**
 * Run Deep Review Stage Only
 *
 * Runs only the deep review stage on existing suggested fixes from the review stage.
 * Useful for re-running deep review with different models or after fixing issues.
 *
 * Usage:
 *   deno task prod:deep-review
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY=your_anthropic_api_key
 *
 * @module
 */

import { V2DatabaseClient } from "../../src/v2/db/client.ts";
import { deepReviewSuggestedFixes } from "../../src/v2/deep-review/deep-review.ts";

async function runDeepReview() {
  console.log("\n🔍 Running Deep Review Stage");
  console.log("=".repeat(60));

  // Get API key
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    console.error("❌ ERROR: ANTHROPIC_API_KEY not set");
    Deno.exit(1);
  }

  const dbPath = "./data/classify_production_v2.db";
  console.log(`📍 Database: ${dbPath}`);
  console.log(`🤖 AI Provider: Anthropic (Claude Sonnet 4)\n`);

  // Initialize database
  const db = new V2DatabaseClient({
    type: "local",
    path: dbPath,
    autoMigrate: true,
    walMode: true,
  });
  await db.initialize();

  try {
    // Check if there are suggested fixes to review
    const suggestedFixCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM review_decisions
      WHERE action = 'suggest-fix'
    `).value() as any;

    const count = suggestedFixCount[0];

    if (count === 0) {
      console.log(
        "✅ No suggested fixes to review. Run the review stage first.\n",
      );
      db.close();
      return;
    }

    console.log(`�� Found ${count} suggested fixes to review\n`);

    const startTime = Date.now();

    // Run deep review
    console.log("🔍 Stage 7: Deep Review (Claude Sonnet 4)");
    console.log("-".repeat(60));

    const deepReviewResult = await deepReviewSuggestedFixes(
      db,
      {
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        apiKey: anthropicKey,
        temperature: 0.3,
        debug: true,
        quiet: false,
      },
      {
        batchSize: 5,
        concurrency: 1,
        debug: true,
        quiet: false,
      },
    );

    const acceptFix = deepReviewResult.decisions.filter((d) =>
      d.action === "accept-fix"
    ).length;
    const rejectFix = deepReviewResult.decisions.filter((d) =>
      d.action === "reject-fix"
    ).length;
    const escalated = deepReviewResult.decisions.filter((d) =>
      d.action === "escalate"
    ).length;

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log("\n" + "=".repeat(60));
    console.log("📊 DEEP REVIEW SUMMARY");
    console.log("=".repeat(60));
    console.log(`⏱️  Total Time: ${totalTime}s`);
    console.log(`✓ Reviewed: ${deepReviewResult.reviewed} suggested fixes`);
    console.log(`  - Accept fix: ${acceptFix}`);
    console.log(`  - Reject fix: ${rejectFix}`);
    console.log(`  - Escalated: ${escalated}`);
    console.log("=".repeat(60));
    console.log("\n✅ Deep review completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Deep review failed:");
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}\n`,
    );
    console.error("Stack trace:", error);
    db.close();
    Deno.exit(1);
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  await runDeepReview();
}
