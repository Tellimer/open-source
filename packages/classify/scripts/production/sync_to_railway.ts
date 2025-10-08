#!/usr/bin/env -S deno run --allow-all
/**
 * Sync Local Database to Railway
 *
 * Copies all classification results from local SQLite database to Railway libSQL
 *
 * Usage:
 *   deno task prod:sync
 *
 * Environment variables:
 *   RAILWAY_DATABASE_URL=libsql://libsql-production-classify.up.railway.app:443
 *   RAILWAY_DATABASE_TOKEN=your_auth_token
 *
 * @module
 */

import { Database } from "@db/sqlite";
import { createClient } from "@libsql/client";

async function syncToRailway() {
  console.log("\n🔄 Syncing Local Database to Railway");
  console.log("=".repeat(60));

  // Get Railway connection details
  const railwayUrl = Deno.env.get("RAILWAY_DATABASE_URL");
  const authToken = Deno.env.get("RAILWAY_DATABASE_TOKEN");

  if (!railwayUrl) {
    console.error("❌ ERROR: RAILWAY_DATABASE_URL not set");
    Deno.exit(1);
  }

  const localDbPath = "./data/classify_production_v2.db";

  console.log(`📍 Source: ${localDbPath}`);
  console.log(`📍 Target: ${railwayUrl}`);
  console.log(`🔐 Auth: ${authToken ? "✓" : "✗"}`);
  console.log("");

  try {
    // Connect to local database
    console.log("🔌 Connecting to local database...");
    const localDb = new Database(localDbPath);
    console.log("✅ Connected to local\n");

    // Connect to Railway
    console.log("🔌 Connecting to Railway libSQL...");
    const remoteDb = createClient({
      url: railwayUrl,
      authToken: authToken,
    });
    await remoteDb.execute("SELECT 1");
    console.log("✅ Connected to Railway\n");

    // Check and upgrade schema if needed
    console.log("🔧 Checking schema version...");
    try {
      // Add reasoning_orientation column to classifications if missing
      await remoteDb.execute(`
        ALTER TABLE classifications ADD COLUMN reasoning_orientation TEXT
      `);
      console.log("✅ Added reasoning_orientation to classifications\n");
    } catch (error) {
      // Column already exists or other error
      if (
        error instanceof Error &&
        !error.message.includes("duplicate column name")
      ) {
        console.log(`⚠️  Schema check: ${error.message}\n`);
      } else {
        console.log("✅ Schema is up to date\n");
      }
    }

    try {
      // Add reasoning column to orientation_results if missing
      await remoteDb.execute(`
        ALTER TABLE orientation_results ADD COLUMN reasoning TEXT
      `);
      console.log("✅ Added reasoning to orientation_results\n");
    } catch (error) {
      // Column already exists or other error
      if (
        error instanceof Error &&
        !error.message.includes("duplicate column name")
      ) {
        console.log(`⚠️  Schema check: ${error.message}\n`);
      }
    }

    // Tables to sync
    const tables = [
      "classifications",
      "router_results",
      "specialist_results",
      "validation_results",
      "orientation_results",
      "flagging_results",
      "review_decisions",
    ];

    let totalRowsCopied = 0;

    for (const table of tables) {
      console.log(`📤 Syncing ${table}...`);

      // Get all rows from local database
      const rows = localDb.prepare(`SELECT * FROM ${table}`).all();

      if (rows.length === 0) {
        console.log(`   No rows to sync\n`);
        continue;
      }

      // Get column names from first row
      const firstRow = rows[0] as Record<string, unknown>;
      const columnNames = Object.keys(firstRow);

      // Delete existing data in remote table
      await remoteDb.execute(`DELETE FROM ${table}`);

      // Insert rows in batches
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        for (const row of batch) {
          // Build INSERT statement
          const placeholders = columnNames.map(() => "?").join(", ");
          const sql = `INSERT INTO ${table} (${
            columnNames.join(", ")
          }) VALUES (${placeholders})`;

          // Extract values in correct order
          const rowObj = row as Record<string, unknown>;
          const values = columnNames.map((col: string) => rowObj[col]) as Array<
            string | number | boolean | null
          >;

          await remoteDb.execute({ sql, args: values });
        }

        console.log(
          `   Copied ${
            Math.min(i + batchSize, rows.length)
          }/${rows.length} rows`,
        );
      }

      totalRowsCopied += rows.length;
      console.log(`✅ Synced ${rows.length} rows from ${table}\n`);
    }

    // Close connections
    localDb.close();
    remoteDb.close();

    console.log("=".repeat(60));
    console.log(`✅ Sync completed! Copied ${totalRowsCopied} total rows`);
    console.log("=".repeat(60));
    console.log("");
  } catch (error) {
    console.error("\n❌ Sync failed:");
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}\n`,
    );
    console.error("Stack trace:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await syncToRailway();
}
