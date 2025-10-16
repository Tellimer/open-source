#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env
/**
 * Reset Classification Results
 *
 * Clears all classification results and intermediate stage data while preserving:
 * - source_indicators table (your original data)
 * - pipeline_stats table (performance metrics)
 *
 * This allows you to re-run classifications with fresh prompts or configuration
 * without losing your source data or historical performance stats.
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-env scripts/reset-results.ts
 *
 * Or with task:
 *   deno task reset-results
 */

import { Database } from "@db/sqlite";

const DB_PATH = Deno.env.get("DATABASE_PATH") ||
  Deno.env.get("CLASSIFY_DB_LOCAL_DEV") ||
  "./data/classify-workflow-local-dev.db";

console.log("🗑️  Classification Results Reset Tool");
console.log("=====================================\n");

console.log(`📂 Database: ${DB_PATH}\n`);

// Check if database exists
try {
  const stat = Deno.statSync(DB_PATH);
  if (!stat.isFile) {
    console.log("❌ Database file not found.");
    console.log("   Run classifications first to create the database.");
    Deno.exit(1);
  }
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    console.log("❌ Database file not found.");
    console.log("   Run classifications first to create the database.");
    Deno.exit(1);
  }
  throw error;
}

// Open database
const db = new Database(DB_PATH);

// Check if tables exist
const tableCheck = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type='table' AND name='classifications'
`).get<{ name: string }>();

if (!tableCheck) {
  console.log("❌ Database exists but tables not initialized.");
  console.log("   Run migrations first: deno task migrate");
  db.close();
  Deno.exit(1);
}

// Count current records before deletion
console.log("📊 Current record counts:");
const counts = {
  classifications: db.prepare("SELECT COUNT(*) as count FROM classifications").get<{ count: number }>()?.count || 0,
  normalization: db.prepare("SELECT COUNT(*) as count FROM normalization_results").get<{ count: number }>()?.count || 0,
  time_inference: db.prepare("SELECT COUNT(*) as count FROM time_inference_results").get<{ count: number }>()?.count || 0,
  scale_inference: db.prepare("SELECT COUNT(*) as count FROM scale_inference_results").get<{ count: number }>()?.count || 0,
  currency_check: db.prepare("SELECT COUNT(*) as count FROM currency_check_results").get<{ count: number }>()?.count || 0,
  family_assignment: db.prepare("SELECT COUNT(*) as count FROM family_assignment_results").get<{ count: number }>()?.count || 0,
  type_classification: db.prepare("SELECT COUNT(*) as count FROM type_classification_results").get<{ count: number }>()?.count || 0,
  boolean_review: db.prepare("SELECT COUNT(*) as count FROM boolean_review_results").get<{ count: number }>()?.count || 0,
  final_review: db.prepare("SELECT COUNT(*) as count FROM final_review_results").get<{ count: number }>()?.count || 0,
  processing_log: db.prepare("SELECT COUNT(*) as count FROM processing_log").get<{ count: number }>()?.count || 0,
};

console.log(`  - classifications: ${counts.classifications}`);
console.log(`  - normalization_results: ${counts.normalization}`);
console.log(`  - time_inference_results: ${counts.time_inference}`);
console.log(`  - scale_inference_results: ${counts.scale_inference}`);
console.log(`  - currency_check_results: ${counts.currency_check}`);
console.log(`  - family_assignment_results: ${counts.family_assignment}`);
console.log(`  - type_classification_results: ${counts.type_classification}`);
console.log(`  - boolean_review_results: ${counts.boolean_review}`);
console.log(`  - final_review_results: ${counts.final_review}`);
console.log(`  - processing_log: ${counts.processing_log}`);

// Check preserved tables
const sourceCount = db.prepare("SELECT COUNT(*) as count FROM source_indicators").get<{ count: number }>()?.count || 0;
const statsCount = db.prepare("SELECT COUNT(*) as count FROM pipeline_stats").get<{ count: number }>()?.count || 0;

console.log("\n✅ Preserved tables (will NOT be deleted):");
console.log(`  - source_indicators: ${sourceCount} records`);
console.log(`  - pipeline_stats: ${statsCount} batches`);

// Confirm with user
console.log("\n⚠️  This will DELETE all classification results!");
console.log("   Source data and pipeline stats will be preserved.\n");

const proceed = confirm("Continue with reset?");

if (!proceed) {
  console.log("\n❌ Reset cancelled.");
  db.close();
  Deno.exit(0);
}

console.log("\n🔄 Clearing classification results...\n");

try {
  // Start transaction for atomic deletion
  db.exec("BEGIN TRANSACTION");

  // Delete in reverse dependency order (child tables first)
  const tables = [
    "final_review_results",
    "boolean_review_results",
    "type_classification_results",
    "family_assignment_results",
    "currency_check_results",
    "scale_inference_results",
    "time_inference_results",
    "normalization_results",
    "processing_log",
    "classifications",
  ];

  for (const table of tables) {
    const result = db.exec(`DELETE FROM ${table}`);
    console.log(`  ✓ Cleared ${table}`);
  }

  // Commit transaction
  db.exec("COMMIT");

  console.log("\n✅ Reset complete!");
  console.log("\n📊 Verification:");

  // Verify all tables are empty
  const verifyTables = [
    "classifications",
    "normalization_results",
    "time_inference_results",
    "scale_inference_results",
    "currency_check_results",
    "family_assignment_results",
    "type_classification_results",
    "boolean_review_results",
    "final_review_results",
    "processing_log",
  ];

  let allEmpty = true;
  for (const table of verifyTables) {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get<{ count: number }>()?.count || 0;
    if (count > 0) {
      console.log(`  ⚠️  ${table}: ${count} records (expected 0)`);
      allEmpty = false;
    } else {
      console.log(`  ✓ ${table}: empty`);
    }
  }

  // Verify preserved tables
  const sourceAfter = db.prepare("SELECT COUNT(*) as count FROM source_indicators").get<{ count: number }>()?.count || 0;
  const statsAfter = db.prepare("SELECT COUNT(*) as count FROM pipeline_stats").get<{ count: number }>()?.count || 0;

  console.log("\n✅ Preserved tables (unchanged):");
  console.log(`  ✓ source_indicators: ${sourceAfter} records (was ${sourceCount})`);
  console.log(`  ✓ pipeline_stats: ${statsAfter} batches (was ${statsCount})`);

  if (allEmpty && sourceAfter === sourceCount && statsAfter === statsCount) {
    console.log("\n🎉 Reset successful! Ready for fresh classification run.");
    console.log("\nNext steps:");
    console.log("  1. Update prompts if needed");
    console.log("  2. Run: deno task run:dev");
    console.log("  3. POST to /classify/batch with indicators");
  } else {
    console.log("\n⚠️  Reset completed with warnings. Check output above.");
  }

} catch (error) {
  db.exec("ROLLBACK");
  console.error("\n❌ Error during reset:", error);
  console.log("   Transaction rolled back. Database unchanged.");
  Deno.exit(1);
} finally {
  db.close();
}
