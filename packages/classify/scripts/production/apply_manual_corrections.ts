#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

/**
 * Apply 24 manual review corrections to local production database
 * Based on indicators_metadata-2025-10-10_110140.csv
 */

import { Database } from "@db/sqlite";

const dbPath = "./data/classify_production_v2.db";

console.log(`Opening database: ${dbPath}`);
const db = new Database(dbPath);

// Enable foreign keys
db.exec("PRAGMA foreign_keys = ON;");

// Define all 24 manual corrections
const corrections = [
  {
    indicator_id: "ALBANIAINDCTION",
    changes: { indicator_type: "rate" },
    comment: "Changed indicator_type to rate rather than ratio",
  },
  {
    indicator_id: "ALBANIAMANPRO",
    changes: { indicator_type: "rate" },
    comment: "Changed indicator_type to rate rather than ratio",
  },
  {
    indicator_id: "ALBANIAPROPRI",
    changes: { heat_map_orientation: "neutral" },
    comment: "Changed heatmap to neutral from lower is positive",
  },
  {
    indicator_id: "ALBANIAWAG",
    changes: {
      temporal_aggregation: "period-total",
      heat_map_orientation: "neutral",
    },
    comment:
      "Changed temporal_aggregation to period-total from period-average and heatmap to neutral",
  },
  {
    indicator_id: "AFGHANISTACONSPE",
    changes: { indicator_type: "flow" },
    comment: "Changed to flow from balance",
  },
  {
    indicator_id: "AFGHANISTACORINFRAT",
    changes: { indicator_type: "rate", heat_map_orientation: "neutral" },
    comment:
      "Changed indicator_type to rate from ratio and heatmap to neutral from lower is better",
  },
  {
    indicator_id: "ABWCORPTAX",
    changes: { indicator_type: "rate" },
    comment: "Changed indicator_type to rate from ratio",
  },
  {
    indicator_id: "ABWFRINRDPST",
    changes: { indicator_type: "rate" },
    comment: "Changed indicator_type to rate",
  },
  {
    indicator_id: "ANGOLAINTRAT",
    changes: { indicator_type: "rate", heat_map_orientation: "neutral" },
    comment:
      "Changed indicator_type to rate from ratio and heatmap to neutral from lower is better",
  },
  {
    indicator_id: "ALBANIAINTTRATE",
    changes: { indicator_type: "rate", heat_map_orientation: "neutral" },
    comment:
      "Changed indicator_type to rate from ratio and heatmap to neutral from lower is better",
  },
  {
    indicator_id: "ALBANIALFPR",
    changes: { indicator_type: "ratio" },
    comment: "Changed indicator_type to ratio from percentage",
  },
  {
    indicator_id: "IRFCLDT1_IRFCL65_USD_IRFCL13",
    changes: { indicator_type: "stock" },
    comment: "Changed to stock from balance",
  },
  {
    indicator_id: "ALBANIASOCSECRAT",
    changes: { indicator_type: "ratio" },
    comment: "Changed to ratio from percentage",
  },
  {
    indicator_id: "ALBANIASOCSECRATFORC",
    changes: { indicator_type: "ratio" },
    comment: "Changed to ratio from percentage",
  },
  {
    indicator_id: "ALBANIASOCSECRATFORE",
    changes: { indicator_type: "ratio" },
    comment: "Changed to ratio from percentage",
  },
  {
    indicator_id: "ALBANIABANLENRAT",
    changes: { indicator_type: "rate", heat_map_orientation: "neutral" },
    comment:
      "Changed indicator_type to rate from ratio and heatmap to neutral from lower is better",
  },
  {
    indicator_id: "AFGHANISTAFOOINF",
    changes: { heat_map_orientation: "neutral" },
    comment: "Changed heatmap to neutral from lower is positive",
  },
  {
    indicator_id: "ALBANIAGDPRATE",
    changes: { indicator_type: "rate" },
    comment: "Changed indicator_type to rate. Earlier it was ratio",
  },
  {
    indicator_id: "ANGOLAINDPROMOM",
    changes: { indicator_type: "rate" },
    comment: "Changed indicator_type to rate. Earlier it was ratio",
  },
  {
    indicator_id: "PCPIPCH",
    changes: { indicator_type: "rate", heat_map_orientation: "neutral" },
    comment:
      "Changed heat map orientation to neutral from lower-is-positive. Changed ratio to rate",
  },
  {
    indicator_id: "PCPIEPCH",
    changes: { indicator_type: "rate", heat_map_orientation: "neutral" },
    comment:
      "Changed heat map orientation to neutral from lower-is-positive. Changed ratio to rate",
  },
  {
    indicator_id: "AFGSTANINFNRATE",
    changes: { heat_map_orientation: "neutral" },
    comment: "Changed heat map orientation to neutral from lower-is-positive",
  },
  {
    indicator_id: "AFGHANISTAINFRATMOM",
    changes: { heat_map_orientation: "neutral" },
    comment: "Changed heat map orientation to neutral from lower-is-positive",
  },
  {
    indicator_id: "ALBANIAPROPRICHA",
    changes: { heat_map_orientation: "neutral" },
    comment: "Changed heat map orientation to neutral from lower-is-positive",
  },
];

console.log(`\nApplying ${corrections.length} manual corrections...\n`);

let successCount = 0;
let errorCount = 0;

for (const correction of corrections) {
  try {
    // Build SET clause dynamically based on changes
    const setClauses: string[] = [];
    const params: any[] = [];

    for (const [field, value] of Object.entries(correction.changes)) {
      setClauses.push(`${field} = ?`);
      params.push(value);
    }

    // Add review metadata
    setClauses.push("review_status = ?");
    setClauses.push("review_reason = ?");
    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    params.push("manual-review-applied");
    params.push(correction.comment);

    // Add indicator_id for WHERE clause
    params.push(correction.indicator_id);

    const sql = `
      UPDATE classifications
      SET ${setClauses.join(", ")}
      WHERE indicator_id = ?
    `;

    db.prepare(sql).run(...params);

    // Check if the indicator was actually updated by querying it
    const verify = db.prepare(
      "SELECT review_status FROM classifications WHERE indicator_id = ?",
    ).get(correction.indicator_id) as { review_status: string } | undefined;

    if (verify && verify.review_status === "manual-review-applied") {
      console.log(`✓ ${correction.indicator_id}: ${correction.comment}`);
      successCount++;
    } else {
      console.error(
        `✗ ${correction.indicator_id}: No rows updated (indicator not found)`,
      );
      errorCount++;
    }
  } catch (error) {
    console.error(
      `✗ ${correction.indicator_id}: Error - ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    errorCount++;
  }
}

db.close();

console.log(`\n========================================`);
console.log(`Manual corrections applied:`);
console.log(`  Success: ${successCount}`);
console.log(`  Errors:  ${errorCount}`);
console.log(`========================================\n`);

if (errorCount > 0) {
  Deno.exit(1);
}
