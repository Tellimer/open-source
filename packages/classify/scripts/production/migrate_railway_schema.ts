#!/usr/bin/env -S deno run --allow-all
/**
 * Migrate Railway Database Schema
 *
 * Updates the Railway database schema to match the latest V2 schema.
 * Run this before syncing data if the schema has changed.
 *
 * Usage:
 *   deno task prod:migrate-schema
 *
 * Environment variables:
 *   RAILWAY_DATABASE_URL=libsql://your-railway-url.railway.app:443
 *   RAILWAY_DATABASE_TOKEN=your_auth_token
 *
 * @module
 */

import { createClient } from "@libsql/client";
import { SCHEMA_VERSION } from "../../src/v2/db/schema.ts";

async function migrateRailwaySchema() {
  console.log("\n🔄 Migrating Railway Database Schema");
  console.log("=".repeat(60));

  // Get connection details
  const dbUrl = Deno.env.get("RAILWAY_DATABASE_URL");
  const authToken = Deno.env.get("RAILWAY_DATABASE_TOKEN");

  if (!dbUrl) {
    console.error("❌ ERROR: RAILWAY_DATABASE_URL not set");
    Deno.exit(1);
  }

  console.log(`📍 Database URL: ${dbUrl}`);
  console.log(`🔐 Auth: ${authToken ? "✓" : "✗"}`);
  console.log(`📦 Target Schema Version: ${SCHEMA_VERSION}\n`);

  try {
    // Connect to Railway
    console.log("🔌 Connecting to Railway libSQL...");
    const client = createClient({
      url: dbUrl,
      authToken: authToken,
    });

    await client.execute("SELECT 1");
    console.log("✅ Connected\n");

    // Check current schema version
    console.log("🔧 Checking current schema version...");
    let currentVersion = 0;
    try {
      const result = await client.execute(
        "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1",
      );
      if (result.rows.length > 0) {
        currentVersion = result.rows[0].version as number;
      }
    } catch {
      console.log("   No schema_version table found");
    }

    console.log(`   Current version: ${currentVersion}`);
    console.log(`   Target version:  ${SCHEMA_VERSION}`);

    // Check if columns actually exist (version might be wrong)
    console.log("\n🔍 Checking for metadata columns...");
    const tableInfo = await client.execute(
      "PRAGMA table_info(classifications)",
    );
    const hasSourceName = tableInfo.rows.some((row: any) =>
      row.name === "source_name"
    );

    if (currentVersion >= SCHEMA_VERSION && hasSourceName) {
      console.log("✅ Schema version is correct and columns exist!\n");
      return;
    }

    if (currentVersion >= SCHEMA_VERSION && !hasSourceName) {
      console.log("⚠️  Schema version is 4 but columns are missing!");
      console.log("   Forcing migration to add missing columns...\n");
    }

    // Confirm migration
    console.log("\n⚠️  This will update the database schema");
    console.log('Type "yes" to confirm migration: ');
    const decoder = new TextDecoder();
    const buf = new Uint8Array(1024);
    const n = await Deno.stdin.read(buf);
    const input = decoder.decode(buf.subarray(0, n || 0)).trim().toLowerCase();

    if (input !== "yes") {
      console.log("\n❌ Migration cancelled\n");
      Deno.exit(0);
    }

    // Migration: Add missing columns to classifications table
    console.log("\n📝 Applying schema migration from v3 to v4...");
    console.log("   Adding metadata columns to classifications table...");

    const newColumns = [
      { name: "source_name", type: "TEXT" },
      { name: "long_name", type: "TEXT" },
      { name: "category_group", type: "TEXT" },
      { name: "dataset", type: "TEXT" },
      { name: "topic", type: "TEXT" },
      { name: "scale", type: "TEXT" },
      { name: "periodicity", type: "TEXT" },
      { name: "aggregation_method", type: "TEXT" },
      { name: "currency_code", type: "TEXT" },
      { name: "sample_values", type: "TEXT" },
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const col of newColumns) {
      try {
        await client.execute(
          `ALTER TABLE classifications ADD COLUMN ${col.name} ${col.type}`,
        );
        console.log(`   ✓ Added column: ${col.name}`);
        addedCount++;
      } catch (error) {
        const err = error as Error;
        if (err.message.includes("duplicate column")) {
          console.log(`   ⊘ Column already exists: ${col.name}`);
          skippedCount++;
        } else {
          console.error(`   ✗ Failed to add ${col.name}: ${err.message}`);
          throw error;
        }
      }
    }

    // Update schema version
    console.log("\n📝 Updating schema version...");
    await client.execute(
      `INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (${SCHEMA_VERSION}, CURRENT_TIMESTAMP)`,
    );
    console.log(`   ✓ Updated schema version to ${SCHEMA_VERSION}`);

    console.log(`\n✅ Migration complete!`);
    console.log(`   Columns added: ${addedCount}`);
    console.log(`   Columns skipped: ${skippedCount}`);

    // Verify columns exist
    console.log("\n🔍 Verifying classifications table schema...");
    const verifyTableInfo = await client.execute(
      "PRAGMA table_info(classifications)",
    );

    console.log(`   Total columns: ${verifyTableInfo.rows.length}`);
    const hasSourceNameVerify = verifyTableInfo.rows.some((row: any) =>
      row.name === "source_name"
    );
    const hasLongNameVerify = verifyTableInfo.rows.some((row: any) =>
      row.name === "long_name"
    );
    const hasSampleValuesVerify = verifyTableInfo.rows.some((row: any) =>
      row.name === "sample_values"
    );

    if (hasSourceNameVerify && hasLongNameVerify && hasSampleValuesVerify) {
      console.log(`   ✓ New columns verified`);
    } else {
      console.log(`   ⚠️  Some columns may be missing`);
      console.log(`      source_name: ${hasSourceNameVerify ? "✓" : "✗"}`);
      console.log(`      long_name: ${hasLongNameVerify ? "✓" : "✗"}`);
      console.log(`      sample_values: ${hasSampleValuesVerify ? "✓" : "✗"}`);
    }

    console.log("\n✅ Railway schema migration complete!\n");
    console.log("Next step:");
    console.log("  Run: deno task prod:sync    # Sync local data to Railway\n");
  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}\n`,
    );
    console.error("Stack trace:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await migrateRailwaySchema();
}
