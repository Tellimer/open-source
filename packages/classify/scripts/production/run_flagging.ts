#!/usr/bin/env -S deno run --allow-all
/**
 * Run Flagging Stage on Production Database
 *
 * Applies flagging rules to all classified indicators in the local production database
 *
 * Usage:
 *   deno task prod:flag
 *
 * @module
 */

import { Database } from "@db/sqlite";
import { V2DatabaseClient } from "../../src/v2/db/client.ts";
import {
  applyFlaggingRules,
  DEFAULT_THRESHOLDS,
} from "../../src/v2/review/flagging.ts";
import { writeFlaggingResults } from "../../src/v2/review/storage.ts";
import type { ClassificationData } from "../../src/v2/review/flagging.ts";
import type { Indicator } from "../../src/types.ts";

async function runFlagging() {
  console.log("\n🚩 Running Flagging Stage on Production Database");
  console.log("=".repeat(60));

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

    // Load all classifications with their results
    console.log("📥 Loading classifications and results...");
    const rows = db.prepare(`
      SELECT
        c.indicator_id,
        c.name,
        c.units,
        c.description,
        c.family,
        c.confidence_family,
        c.indicator_type,
        c.temporal_aggregation,
        c.is_currency_denominated,
        c.confidence_cls,
        c.heat_map_orientation,
        c.confidence_orient,
        c.validated,
        c.validation_confidence
      FROM classifications c
      WHERE c.indicator_type IS NOT NULL
      ORDER BY c.indicator_id
    `).all();

    console.log(`✅ Loaded ${rows.length} classifications\n`);

    // Transform to ClassificationData format
    const flaggingData: ClassificationData[] = rows.map((row: any) => ({
      indicator: {
        id: row.indicator_id,
        name: row.name,
        units: row.units || undefined,
        description: row.description || undefined,
      } as Indicator,
      router: row.family
        ? {
          indicator_id: row.indicator_id,
          family: row.family,
          confidence: row.confidence_family,
        }
        : undefined,
      specialist: row.indicator_type
        ? {
          indicator_id: row.indicator_id,
          indicator_type: row.indicator_type,
          temporal_aggregation: row.temporal_aggregation,
          is_currency_denominated: row.is_currency_denominated === 1,
          confidence: row.confidence_cls,
        }
        : undefined,
      orientation: row.heat_map_orientation
        ? {
          indicator_id: row.indicator_id,
          heat_map_orientation: row.heat_map_orientation,
          confidence_orient: row.confidence_orient,
        }
        : undefined,
      validation: row.validated !== null
        ? {
          indicator_id: row.indicator_id,
          validated: row.validated === 1,
          confidence: row.validation_confidence,
        }
        : undefined,
    }));

    // Apply flagging rules
    console.log("🚩 Applying flagging rules...");
    console.log(
      `   Mode: Review ALL indicators (not just threshold violations)\n`,
    );

    const flaggedIndicators = flaggingData.flatMap((data) => {
      // First apply normal flagging rules
      const normalFlags = applyFlaggingRules(data, DEFAULT_THRESHOLDS);

      // Then add a "review_all" flag for every indicator
      const reviewAllFlag = {
        indicator_id: data.indicator.id!,
        flag_type: "review_all" as const,
        flag_reason:
          "Production review - all indicators flagged for manual verification",
        flagged_at: new Date().toISOString(),
      };

      return [...normalFlags, reviewAllFlag];
    });

    console.log(`✅ Flagged all ${rows.length} indicators for review\n`);
    console.log(`   Total flags: ${flaggedIndicators.length}\n`);

    // Write to database
    console.log("💾 Saving flagging results...");
    writeFlaggingResults(dbClient, flaggedIndicators);
    console.log("✅ Saved flagging results\n");

    // Show summary by flag type
    const flagsByType = new Map<string, number>();
    for (const flag of flaggedIndicators) {
      flagsByType.set(
        flag.flag_type,
        (flagsByType.get(flag.flag_type) || 0) + 1,
      );
    }

    // Count unique flagged indicators
    const uniqueFlaggedIndicators = new Set(
      flaggedIndicators.map((f) => f.indicator_id),
    );

    console.log("=".repeat(60));
    console.log("📊 FLAGGING SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total indicators: ${rows.length}`);
    console.log(`Flagged for review: ${uniqueFlaggedIndicators.size}`);
    console.log(`Total flags: ${flaggedIndicators.length}`);
    console.log(
      `Clean indicators: ${rows.length - uniqueFlaggedIndicators.size}\n`,
    );
    console.log("Flags by type:");
    for (
      const [type, count] of Array.from(flagsByType.entries()).sort((a, b) =>
        b[1] - a[1]
      )
    ) {
      console.log(`  • ${type}: ${count}`);
    }
    console.log("=".repeat(60));
    console.log("");

    // Show sample flagged indicators
    console.log("📋 Sample Flagged Indicators:");
    for (const flag of flaggedIndicators.slice(0, 10)) {
      console.log(`\n• ${flag.indicator_id} (${flag.flag_type})`);
      console.log(`  Reason: ${flag.flag_reason}`);
      if (flag.confidence) {
        console.log(`  Confidence: ${flag.confidence.toFixed(2)}`);
      }
    }

    console.log("\n✅ Flagging completed!\n");

    db.close();
    dbClient.close();
  } catch (error) {
    console.error("\n❌ Flagging failed:");
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}\n`,
    );
    console.error("Stack trace:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await runFlagging();
}
