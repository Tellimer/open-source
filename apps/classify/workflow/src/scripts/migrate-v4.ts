/**
 * Migrate database schema from v3 to v4
 *
 * Changes in v4:
 * - Add normalized_scale column to normalization_results table
 * - Mark scale_inference_results and currency_check_results as deprecated
 *
 * Run this to update an existing v3 database to v4.
 */

import { Database } from "@db/sqlite";

function migrateToV4() {
  const dbPath = Deno.env.get("CLASSIFY_DB_LOCAL_DEV") ||
    "./data/classify-workflow-local-dev.db";

  console.log("📦 Migrating database schema from v3 to v4...");
  console.log(`   Database: ${dbPath}\n`);

  const db = new Database(dbPath);

  try {
    // Check current schema version
    const versionResult = db.prepare(
      "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1",
    ).value<[number]>();
    const currentVersion = versionResult?.[0] || 0;

    console.log(`📊 Current schema version: ${currentVersion}`);

    if (currentVersion >= 4) {
      console.log("✅ Database is already at v4 or higher. No migration needed.");
      return;
    }

    console.log("\n🔧 Applying migrations...\n");

    // Migration 1: Add normalized_scale column to normalization_results
    try {
      db.exec(`
        ALTER TABLE normalization_results
        ADD COLUMN normalized_scale TEXT
      `);
      console.log("✅ Added normalized_scale column to normalization_results");
    } catch (error: any) {
      if (error.message.includes("duplicate column")) {
        console.log("⏭️  normalized_scale column already exists");
      } else {
        throw error;
      }
    }

    // Migration 2: Backfill normalized_scale for existing records
    // For existing records, we'll set normalized_scale = parsed_scale as a safe default
    // This may not be 100% accurate but provides a reasonable fallback
    db.exec(`
      UPDATE normalization_results
      SET normalized_scale = CASE
        WHEN parsed_unit_type = 'percentage' THEN 'percent'
        WHEN parsed_unit_type = 'index' THEN 'index'
        WHEN parsed_scale = 'raw' OR parsed_scale = 'raw-units' OR parsed_scale = 'ones' THEN 'raw-units'
        WHEN parsed_scale LIKE '%hundred%' THEN 'hundreds'
        WHEN parsed_scale LIKE '%thousand%' THEN 'thousands'
        WHEN parsed_scale LIKE '%million%' THEN 'millions'
        WHEN parsed_scale LIKE '%billion%' THEN 'billions'
        WHEN parsed_scale LIKE '%trillion%' THEN 'trillions'
        ELSE 'raw-units'
      END
      WHERE normalized_scale IS NULL
    `);
    console.log("✅ Backfilled normalized_scale for existing records");

    // Update schema version
    db.exec("INSERT OR IGNORE INTO schema_version (version) VALUES (4)");
    console.log("✅ Updated schema version to 4");

    // Show summary
    const stats = db.prepare(
      "SELECT COUNT(*) as count FROM normalization_results WHERE normalized_scale IS NOT NULL",
    ).value<[number]>();
    console.log(`\n📊 Migration Summary:`);
    console.log(`   Records with normalized_scale: ${stats?.[0] || 0}`);

    console.log("\n✅ Migration to v4 complete!");
    console.log("\nNote: scale_inference_results and currency_check_results tables");
    console.log("are now deprecated but kept for backward compatibility.");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    Deno.exit(1);
  } finally {
    db.close();
  }
}

// Run the migration
migrateToV4();
