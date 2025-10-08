#!/usr/bin/env -S deno run --allow-all
/**
 * Backfill Orientation Reasoning
 *
 * Re-runs orientation stage on existing classifications to add reasoning field
 *
 * Usage:
 *   deno task prod:backfill-orientation
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY=your_anthropic_api_key
 *
 * @module
 */

import { Database } from "@db/sqlite";
import { classifyOrientations } from "../../src/v2/orientation/orientation.ts";
import { writeOrientationResults } from "../../src/v2/orientation/storage.ts";
import { V2DatabaseClient } from "../../src/v2/db/client.ts";
import type { Indicator } from "../../src/types.ts";

async function backfillOrientationReasoning() {
  console.log("\n🔄 Backfilling Orientation Reasoning");
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

    // Get all classified indicators from classifications table
    console.log("📥 Loading classified indicators...");
    const rows = db.prepare(`
      SELECT
        indicator_id,
        name,
        units,
        description,
        indicator_type,
        temporal_aggregation,
        is_currency_denominated
      FROM classifications
      WHERE indicator_type IS NOT NULL
      ORDER BY indicator_id
    `).all();

    const indicators: Indicator[] = rows.map((row: any) => ({
      id: row.indicator_id,
      name: row.name,
      units: row.units || undefined,
      description: row.description || undefined,
      indicator_type: row.indicator_type,
      temporal_aggregation: row.temporal_aggregation,
      is_currency_denominated: row.is_currency_denominated === 1,
    }));

    console.log(`✅ Loaded ${indicators.length} indicators\n`);

    // Re-run orientation stage
    console.log("🧭 Running Orientation Stage with reasoning...\n");
    const startTime = Date.now();

    const orientationResult = await classifyOrientations(indicators, {
      llmConfig: {
        provider: "anthropic",
        model: "claude-sonnet-4-5-20250929",
        apiKey: anthropicKey,
        temperature: 0.3,
        quiet: false,
        debug: true,
      },
      batchSize: 50,
      concurrency: 3,
    });

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    // Write results to database
    console.log("\n💾 Saving orientation results with reasoning...");
    const dbClient = new V2DatabaseClient({
      type: "local",
      path: localDbPath,
      autoMigrate: false,
    });
    await dbClient.initialize();

    writeOrientationResults(dbClient, orientationResult.successful);
    dbClient.close();

    console.log(
      `✅ Updated ${orientationResult.successful.length} orientation results\n`,
    );

    // Show summary
    console.log("=".repeat(60));
    console.log("📊 BACKFILL SUMMARY");
    console.log("=".repeat(60));
    console.log(`⏱️  Total Time: ${totalTime}s`);
    console.log(
      `✅ Successful: ${orientationResult.successful.length}/${indicators.length}`,
    );
    console.log(
      `❌ Failed: ${orientationResult.failed.length}/${indicators.length}`,
    );
    console.log(`🔧 API Calls: ${orientationResult.apiCalls}`);
    console.log("=".repeat(60));

    // Show sample with reasoning
    console.log("\n📋 Sample Results with Reasoning:");
    for (const result of orientationResult.successful.slice(0, 5)) {
      console.log(`\n• ${result.indicator_id}`);
      console.log(`  Orientation: ${result.heat_map_orientation}`);
      console.log(`  Confidence: ${result.confidence_orient}`);
      console.log(`  Reasoning: ${result.reasoning}`);
    }

    console.log("\n✅ Orientation reasoning backfill completed!\n");

    db.close();
  } catch (error) {
    console.error("\n❌ Backfill failed:");
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}\n`,
    );
    console.error("Stack trace:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await backfillOrientationReasoning();
}
