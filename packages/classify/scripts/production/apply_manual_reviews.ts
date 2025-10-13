#!/usr/bin/env -S deno run --allow-all
/**
 * Apply Manual Review Comments from CSV
 *
 * Reads a CSV file with manual review comments and applies the changes
 * to the local production database.
 *
 * Usage:
 *   deno task prod:apply-reviews <csv_file>
 *
 * Example:
 *   deno task prod:apply-reviews indicators_metadata-2025-10-10_110140.csv
 *
 * @module
 */

import { parse } from "https://deno.land/std@0.224.0/csv/parse.ts";
import { V2DatabaseClient } from "../../src/v2/db/client.ts";

interface CSVRow {
  indicator_id: string;
  "Updated?": string;
  Comments: string;
  indicator_type?: string;
  temporal_aggregation?: string;
  heat_map_orientation?: string;
  is_currency_denominated?: string;
}

function parseCommentForChanges(comment: string): Set<string> {
  const changes = new Set<string>();
  const lowerComment = comment.toLowerCase();

  // Check what fields were mentioned in the comment
  if (lowerComment.includes("indicator_type")) {
    changes.add("indicator_type");
  }
  if (lowerComment.includes("temporal") || lowerComment.includes("period-")) {
    changes.add("temporal_aggregation");
  }
  if (
    lowerComment.includes("heatmap") || lowerComment.includes("orientation")
  ) {
    changes.add("heat_map_orientation");
  }
  if (lowerComment.includes("currency")) {
    changes.add("is_currency_denominated");
  }

  return changes;
}

async function applyManualReviews() {
  console.log("\n📝 Applying Manual Review Comments");
  console.log("=".repeat(60));

  // Get CSV file path from arguments
  const csvFile = Deno.args[0];
  if (!csvFile) {
    console.error("❌ ERROR: Please provide CSV file path");
    console.error("Usage: deno task prod:apply-reviews <csv_file>");
    Deno.exit(1);
  }

  console.log(`📄 CSV File: ${csvFile}\n`);

  // Read CSV file
  console.log("📥 Reading CSV file...");
  const csvContent = await Deno.readTextFile(csvFile);
  const records = parse(csvContent, {
    skipFirstRow: true,
    columns: [
      "indicator_id",
      "Updated?",
      "Comments",
      "name",
      "units",
      "description",
      "family",
      "confidence_family",
      "reasoning_router",
      "indicator_type",
      "temporal_aggregation",
      "is_currency_denominated",
      "confidence_cls",
      "reasoning_specialist",
      "validated",
      "validation_confidence",
      "heat_map_orientation",
      "confidence_orient",
      "reasoning_orientation",
      "review_status",
      "review_reason",
      "provider",
      "model",
      "prompt_version",
      "created_at",
      "updated_at",
    ],
  }) as CSVRow[];

  // Filter for rows that need updates
  const updatesNeeded = records.filter((row) =>
    row["Updated?"]?.trim().startsWith("Yes")
  );

  console.log(`✅ Found ${records.length} total indicators`);
  console.log(`📝 Found ${updatesNeeded.length} indicators needing updates\n`);

  if (updatesNeeded.length === 0) {
    console.log("✅ No updates needed!\n");
    return;
  }

  // Connect to database
  const dbPath = "./data/classify_production_v2.db";
  console.log(`🔌 Connecting to: ${dbPath}`);

  const db = new V2DatabaseClient({
    type: "local",
    path: dbPath,
    autoMigrate: false,
  });
  await db.initialize();
  console.log("✅ Connected\n");

  // Parse updates and apply
  console.log("🔄 Applying updates...");
  console.log("-".repeat(60));

  let successCount = 0;
  let errorCount = 0;

  for (const row of updatesNeeded) {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      const comment = row.Comments || "";
      const indicatorId = row.indicator_id;

      // Parse comment to determine which fields changed
      const changedFields = parseCommentForChanges(comment);

      console.log(`\n📌 ${indicatorId}`);
      console.log(`   Comment: ${comment}`);

      // Apply only the fields that were mentioned in the comment
      if (changedFields.has("indicator_type") && row.indicator_type) {
        updates.push("indicator_type = ?");
        values.push(row.indicator_type);
        console.log(`   → indicator_type = "${row.indicator_type}"`);
      }

      if (
        changedFields.has("temporal_aggregation") && row.temporal_aggregation
      ) {
        updates.push("temporal_aggregation = ?");
        values.push(row.temporal_aggregation);
        console.log(
          `   → temporal_aggregation = "${row.temporal_aggregation}"`,
        );
      }

      if (
        changedFields.has("heat_map_orientation") && row.heat_map_orientation
      ) {
        updates.push("heat_map_orientation = ?");
        values.push(row.heat_map_orientation);
        console.log(
          `   → heat_map_orientation = "${row.heat_map_orientation}"`,
        );
      }

      if (
        changedFields.has("is_currency_denominated") &&
        row.is_currency_denominated !== undefined
      ) {
        const isCurrency = row.is_currency_denominated === "1" ||
          row.is_currency_denominated === "true" ||
          row.is_currency_denominated === "True";
        updates.push("is_currency_denominated = ?");
        values.push(isCurrency ? 1 : 0);
        console.log(`   → is_currency_denominated = ${isCurrency}`);
      }

      // Add review metadata
      updates.push("review_status = ?");
      values.push("manual-review-applied");

      updates.push("review_reason = ?");
      values.push(comment);

      updates.push("updated_at = CURRENT_TIMESTAMP");

      // Apply update
      if (changedFields.size > 0) {
        values.push(indicatorId);
        const sql = `
          UPDATE classifications
          SET ${updates.join(", ")}
          WHERE indicator_id = ?
        `;

        db.prepare(sql).run(...values);
        console.log(`   ✓ Updated successfully`);
        successCount++;
      } else {
        console.log(`   ⚠️  No fields identified from comment`);
        errorCount++;
      }
    } catch (error) {
      console.error(
        `   ✗ Failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Failed/Skipped: ${errorCount}`);
  console.log(`📝 Total processed: ${updatesNeeded.length}`);
  console.log("=".repeat(60));

  db.close();
  console.log("\n✅ Manual reviews applied to local database!\n");
  console.log("Next steps:");
  console.log("  1. Review changes: sqlite3 ./data/classify_production_v2.db");
  console.log("  2. Sync to Railway: deno task prod:sync\n");
}

if (import.meta.main) {
  await applyManualReviews();
}
