#!/usr/bin/env -S deno run --allow-all
/**
 * Run AI Review Stage on Production Database
 *
 * Runs LLM-based review on ALL classified indicators to verify correctness.
 * The AI (Claude) reviews each indicator and decides:
 *   - CONFIRM: Classification is correct (no flag created)
 *   - FIX: Minor error, auto-corrects it (no flag created)
 *   - ESCALATE: Needs human review (creates flag in flagging_results)
 *
 * Usage:
 *   deno task prod:review
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY=your_anthropic_api_key
 *
 * @module
 */

import { Database } from "@db/sqlite";
import { V2DatabaseClient } from "../../src/v2/db/client.ts";
import { reviewAllClassifications } from "../../src/v2/review/review_all.ts";

async function runReview() {
  console.log("\n🔍 Running AI Review Stage on Production Database");
  console.log("=".repeat(60));

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    console.error("❌ ERROR: ANTHROPIC_API_KEY not set");
    Deno.exit(1);
  }

  const localDbPath = "./data/classify_production_v2.db";
  console.log(`📍 Database: ${localDbPath}\n`);

  try {
    // Connect to database
    const db = new Database(localDbPath);
    const dbClient = new V2DatabaseClient({
      type: "local",
      path: localDbPath,
      autoMigrate: false,
    });
    await dbClient.initialize();

    // Clear existing flags and review decisions
    console.log("🧹 Clearing previous review data...");
    db.exec("DELETE FROM flagging_results");
    db.exec("DELETE FROM review_decisions");
    console.log("✅ Cleared\n");

    // Check how many classifications exist
    const classifiedCount = db
      .prepare(
        "SELECT COUNT(*) as count FROM classifications WHERE indicator_type IS NOT NULL",
      )
      .value() as number[];

    console.log(`📥 Found ${classifiedCount[0]} classified indicators\n`);

    if (classifiedCount[0] === 0) {
      console.log("⚠️  No classifications to review");
      console.log("💡 Run `deno task prod:run` first to classify indicators\n");
      db.close();
      dbClient.close();
      Deno.exit(0);
    }

    // Run review stage on ALL classifications
    console.log("🤖 Running AI-powered review on ALL indicators...");
    console.log(`   Model: claude-sonnet-4-5-20250929`);
    console.log(`   Mode: Review all, flag only errors\n`);

    const startTime = Date.now();

    const reviewResult = await reviewAllClassifications(
      dbClient,
      {
        provider: "anthropic",
        model: "claude-sonnet-4-5-20250929",
        apiKey: anthropicKey,
        temperature: 0.3,
        quiet: false,
        debug: true,
      },
      {
        batchSize: 20,
        concurrency: 1,
        debug: true,
        quiet: false,
      },
    );

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    // Show summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 REVIEW SUMMARY");
    console.log("=".repeat(60));
    console.log(`⏱️  Total Time: ${totalTime}s`);
    console.log(`📝 Reviewed: ${reviewResult.reviewed}`);
    console.log(`✅ Confirmed (correct): ${reviewResult.confirmed}`);
    console.log(`🔧 Fixed (auto-corrected): ${reviewResult.fixed}`);
    console.log(`🚨 Escalated (needs human review): ${reviewResult.escalated}`);
    console.log(`🔧 API Calls: ${reviewResult.apiCalls}`);
    console.log(
      `💰 Tokens Used: ${reviewResult.usage.totalTokens.toLocaleString()}`,
    );
    console.log("=".repeat(60));

    // Show sample review decisions
    console.log("\n📋 Sample Review Decisions:\n");

    const escalatedDecisions = reviewResult.decisions.filter(
      (d) => d.action === "escalate",
    );
    const fixedDecisions = reviewResult.decisions.filter((d) =>
      d.action === "fix"
    );
    const confirmedDecisions = reviewResult.decisions.filter(
      (d) => d.action === "confirm",
    );

    if (escalatedDecisions.length > 0) {
      console.log("🚨 Escalated (needs human review):");
      for (const decision of escalatedDecisions.slice(0, 5)) {
        console.log(`\n  • ${decision.indicator_id}`);
        console.log(`    Reason: ${decision.reason}`);
        console.log(`    Confidence: ${decision.confidence.toFixed(2)}`);
        if (decision.diff && Object.keys(decision.diff).length > 0) {
          console.log(
            `    Suggested changes: ${JSON.stringify(decision.diff)}`,
          );
        }
      }
      if (escalatedDecisions.length > 5) {
        console.log(`\n  ... and ${escalatedDecisions.length - 5} more`);
      }
    }

    if (fixedDecisions.length > 0) {
      console.log("\n🔧 Fixed (auto-corrected):");
      for (const decision of fixedDecisions.slice(0, 5)) {
        console.log(`\n  • ${decision.indicator_id}`);
        console.log(`    Reason: ${decision.reason}`);
        console.log(`    Changes applied: ${JSON.stringify(decision.diff)}`);
      }
      if (fixedDecisions.length > 5) {
        console.log(`\n  ... and ${fixedDecisions.length - 5} more`);
      }
    }

    if (confirmedDecisions.length > 0) {
      console.log(
        `\n✅ ${confirmedDecisions.length} indicators confirmed as correct`,
      );
    }

    console.log("\n✅ Review completed!\n");

    // Show next steps
    if (escalatedDecisions.length > 0) {
      console.log("📌 Next Steps:");
      console.log(
        `   ${escalatedDecisions.length} indicators flagged for human review`,
      );
      console.log(
        "   Flagged indicators are now in the flagging_results table\n",
      );
    } else {
      console.log(
        "🎉 All indicators passed review - no human review needed!\n",
      );
    }

    db.close();
    dbClient.close();
  } catch (error) {
    console.error("\n❌ Review failed:");
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}\n`,
    );
    console.error("Stack trace:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await runReview();
}
