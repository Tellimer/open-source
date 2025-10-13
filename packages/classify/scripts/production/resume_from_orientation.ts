#!/usr/bin/env -S deno run --allow-all
/**
 * Resume Pipeline from Orientation Stage
 *
 * Resumes the classification pipeline from the orientation stage onwards.
 * Uses existing classifications data from the database.
 *
 * Usage:
 *   deno task prod:resume-orientation
 *
 * Environment variables:
 *   OPENAI_API_KEY=your_openai_api_key
 *   ANTHROPIC_API_KEY=your_anthropic_api_key
 *
 * @module
 */

import { V2DatabaseClient } from "../../src/v2/db/client.ts";
import { classifyOrientations } from "../../src/v2/orientation/orientation.ts";
import { writeOrientationResults } from "../../src/v2/orientation/storage.ts";
import { applyFlaggingRules } from "../../src/v2/review/flagging.ts";
import { writeFlaggingResults } from "../../src/v2/review/storage.ts";
import { reviewFlaggedIndicators } from "../../src/v2/review/review.ts";
import { deepReviewSuggestedFixes } from "../../src/v2/deep-review/deep-review.ts";
import { writeClassifications } from "../../src/v2/output/storage.ts";
import type { Indicator } from "../../src/types.ts";
import type { ClassificationData } from "../../src/v2/types.ts";

async function resumeFromOrientation() {
  console.log("\n🔄 Resuming Pipeline from Orientation Stage");
  console.log("=".repeat(60));

  // Get API keys
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!openaiKey) {
    console.error("❌ ERROR: OPENAI_API_KEY not set");
    Deno.exit(1);
  }
  if (!anthropicKey) {
    console.error(
      "❌ ERROR: ANTHROPIC_API_KEY not set (needed for deep-review stage)",
    );
    Deno.exit(1);
  }

  const dbPath = "./data/classify_production_v2.db";
  console.log(`📍 Database: ${dbPath}`);
  console.log(
    `🤖 AI Provider: OpenAI (GPT-5) + Anthropic (Claude Sonnet 4.5)\n`,
  );

  // Initialize database
  const db = new V2DatabaseClient({
    type: "local",
    path: dbPath,
    autoMigrate: true,
    walMode: true,
  });
  await db.initialize();

  try {
    // Load indicators that need orientation
    console.log("📥 Loading classifications from database...");
    const rows = db.prepare(`
      SELECT
        indicator_id,
        name,
        units,
        description
      FROM classifications
      WHERE indicator_id NOT IN (SELECT indicator_id FROM orientation_results)
      ORDER BY indicator_id
    `).all();

    const indicators: Indicator[] = rows.map((row: any) => ({
      id: row.indicator_id,
      name: row.name,
      units: row.units || undefined,
      description: row.description || undefined,
    }));

    console.log(
      `✅ Loaded ${indicators.length} indicators needing orientation\n`,
    );

    if (indicators.length === 0) {
      console.log(
        "✅ No indicators need orientation. Running remaining stages...\n",
      );
      await runRemainingStages(db, openaiKey, anthropicKey);
      db.close();
      return;
    }

    const startTime = Date.now();

    // Stage 4: Orientation
    console.log("🧭 Stage 4: Orientation");
    console.log("-".repeat(60));
    const orientationResult = await classifyOrientations(indicators, {
      llmConfig: {
        provider: "openai",
        model: "gpt-5",
        apiKey: openaiKey,
        temperature: 0.3,
        debug: true,
        quiet: false,
      },
      batchSize: 5,
      concurrency: 1,
      maxRetries: 3,
      debug: true,
      quiet: false,
    });

    console.log(
      `✓ Orientation: ${orientationResult.successful.length} classified`,
    );
    if (orientationResult.failed.length > 0) {
      console.log(`  Failed: ${orientationResult.failed.length}`);
    }

    // Write orientation results
    writeOrientationResults(db, orientationResult.successful);
    console.log(
      `✓ Wrote ${orientationResult.successful.length} orientation results to DB\n`,
    );

    // Run remaining pipeline stages
    await runRemainingStages(db, openaiKey, anthropicKey);

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log("=".repeat(60));
    console.log("📊 RESUME PIPELINE SUMMARY");
    console.log("=".repeat(60));
    console.log(`⏱️  Total Time: ${totalTime}s`);
    console.log(
      `✅ Oriented: ${orientationResult.successful.length}/${indicators.length}`,
    );
    console.log("=".repeat(60));
    console.log("\n✅ Pipeline resumed and completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Pipeline resume failed:");
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

/**
 * Run remaining pipeline stages: Flagging, Review, Deep Review
 */
async function runRemainingStages(
  db: V2DatabaseClient,
  openaiKey: string,
  anthropicKey: string,
) {
  // Get all oriented indicator IDs
  const orientedIndicatorIds = db.prepare(`
    SELECT indicator_id FROM orientation_results
  `).all().map((row: any) => row.indicator_id);

  if (orientedIndicatorIds.length === 0) {
    console.log("⚠️  No oriented indicators to process\n");
    return;
  }

  console.log(
    `Processing ${orientedIndicatorIds.length} oriented indicators...\n`,
  );

  // Stage 5: Flagging
  console.log("🚩 Stage 5: Flagging");
  console.log("-".repeat(60));

  const placeholders = orientedIndicatorIds.map(() => "?").join(",");

  const indicators = db.prepare(`
    SELECT indicator_id, name, units, description
    FROM classifications
    WHERE indicator_id IN (${placeholders})
  `).all(...orientedIndicatorIds).map((row: any) => ({
    id: row.indicator_id,
    name: row.name,
    units: row.units || undefined,
    description: row.description || undefined,
  }));

  const dbRouterResults = db.prepare(`
    SELECT * FROM router_results
    WHERE indicator_id IN (${placeholders})
  `).all(...orientedIndicatorIds);

  const dbSpecialistResults = db.prepare(`
    SELECT * FROM specialist_results
    WHERE indicator_id IN (${placeholders})
  `).all(...orientedIndicatorIds);

  const dbOrientationResults = db.prepare(`
    SELECT * FROM orientation_results
    WHERE indicator_id IN (${placeholders})
  `).all(...orientedIndicatorIds);

  // Construct ClassificationData for flagging
  const flaggingData = indicators.map((ind: Indicator) => ({
    indicator: ind,
    router: dbRouterResults.find((r: any) => r.indicator_id === ind.id) as any,
    specialist: dbSpecialistResults.find((s: any) =>
      s.indicator_id === ind.id
    ) as any,
    orientation: dbOrientationResults.find((o: any) =>
      o.indicator_id === ind.id
    ) as any,
  }));

  const flaggedIndicators = flaggingData.flatMap((data) =>
    applyFlaggingRules(data as any, {
      confidenceFamilyMin: 0.75,
      confidenceClsMin: 0.75,
      confidenceOrientMin: 0.85,
    })
  );

  writeFlaggingResults(db, flaggedIndicators);
  console.log(`✓ Flagging: ${flaggedIndicators.length} indicators flagged\n`);

  // Stage 6: Review (first-pass triage with GPT-5)
  if (flaggedIndicators.length > 0) {
    console.log("👀 Stage 6: Review (GPT-5)");
    console.log("-".repeat(60));

    const reviewResult = await reviewFlaggedIndicators(
      db,
      {
        provider: "openai",
        model: "gpt-5",
        apiKey: openaiKey,
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

    const confirmed = reviewResult.decisions.filter((d) =>
      d.action === "confirm"
    ).length;
    const suggestFix = reviewResult.decisions.filter((d) =>
      d.action === "suggest-fix"
    ).length;
    const escalated =
      reviewResult.decisions.filter((d) => d.action === "escalate").length;

    console.log(`✓ Review: ${reviewResult.reviewed} reviewed`);
    console.log(`  - Confirmed: ${confirmed}`);
    console.log(`  - Suggest fix: ${suggestFix}`);
    console.log(`  - Escalated: ${escalated}\n`);

    // Stage 7: Deep Review (second-pass with Claude Sonnet 4.5)
    if (suggestFix > 0) {
      console.log("🔍 Stage 7: Deep Review (Claude Sonnet 4.5)");
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

      const acceptFix =
        deepReviewResult.decisions.filter((d) => d.action === "accept-fix")
          .length;
      const rejectFix =
        deepReviewResult.decisions.filter((d) => d.action === "reject-fix")
          .length;
      const deepEscalated = deepReviewResult.decisions.filter((d) =>
        d.action === "escalate"
      )
        .length;

      console.log(`✓ Deep Review: ${deepReviewResult.reviewed} reviewed`);
      console.log(`  - Accept fix: ${acceptFix}`);
      console.log(`  - Reject fix: ${rejectFix}`);
      console.log(`  - Escalated: ${deepEscalated}\n`);
    }
  } else {
    console.log("✅ No indicators flagged for review\n");
  }

  // Update classifications table with all results
  console.log("💾 Writing consolidated classifications...");
  const allClassificationData: ClassificationData[] = indicators.map((ind) => {
    const router = dbRouterResults.find((r: any) => r.indicator_id === ind.id);
    const specialist = dbSpecialistResults.find((s: any) =>
      s.indicator_id === ind.id
    );
    const orientation = dbOrientationResults.find((o: any) =>
      o.indicator_id === ind.id
    );

    return {
      indicator_id: ind.id!,
      name: ind.name,
      units: ind.units,
      description: ind.description,
      family: router?.family as any,
      confidence_family: router?.confidence_family ?? 0,
      indicator_type: specialist?.indicator_type as any,
      temporal_aggregation: specialist?.temporal_aggregation as any,
      is_currency_denominated: specialist?.is_currency_denominated,
      confidence_cls: specialist?.confidence_cls ?? 0,
      heat_map_orientation: orientation?.heat_map_orientation as any,
      confidence_orient: orientation?.confidence_orient ?? 0,
    };
  });

  writeClassifications(db, allClassificationData, "openai", "gpt-5");
  console.log(`✓ Updated ${allClassificationData.length} classifications\n`);
}

if (import.meta.main) {
  await resumeFromOrientation();
}
