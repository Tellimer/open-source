#!/usr/bin/env -S deno run --allow-all
/**
 * Production Database Reset Script
 *
 * Resets all V2 pipeline results in production database (keeps source data intact)
 *
 * Usage:
 *   deno task prod:reset
 *
 * Environment variables:
 *   RAILWAY_DATABASE_URL=libsql://libsql-production-classify.up.railway.app:443
 *   RAILWAY_DATABASE_TOKEN=your_auth_token
 *
 * @module
 */

import { createClient } from "@libsql/client";

async function resetProductionDatabase() {
  console.log("\n🔄 Resetting Production Database");
  console.log("=".repeat(60));
  console.log("⚠️  WARNING: This will delete all classification results!");
  console.log(
    "⚠️  Source indicators and time series data will be preserved.\n",
  );

  // Get connection details
  const dbUrl = Deno.env.get("RAILWAY_DATABASE_URL");
  const authToken = Deno.env.get("RAILWAY_DATABASE_TOKEN");

  if (!dbUrl) {
    console.error("❌ ERROR: RAILWAY_DATABASE_URL not set");
    Deno.exit(1);
  }

  console.log(`📍 Database URL: ${dbUrl}`);
  console.log(`🔐 Auth: ${authToken ? "✓" : "✗"}\n`);

  // Confirm action
  console.log('Type "yes" to confirm reset: ');
  const decoder = new TextDecoder();
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);
  const input = decoder.decode(buf.subarray(0, n || 0)).trim().toLowerCase();

  if (input !== "yes") {
    console.log("\n❌ Reset cancelled\n");
    Deno.exit(0);
  }

  try {
    // Connect to database
    console.log("\n🔌 Connecting to Railway libSQL...");
    const client = createClient({
      url: dbUrl,
      authToken: authToken,
    });

    await client.execute("SELECT 1");
    console.log("✅ Connected\n");

    // Get counts before deletion
    console.log("📊 Current data:");
    const tables = [
      "review_decisions",
      "flagging_results",
      "orientation_results",
      "validation_results",
      "specialist_results",
      "router_results",
      "classifications",
      "pipeline_executions",
    ];

    for (const table of tables) {
      try {
        const result = await client.execute(
          `SELECT COUNT(*) as count FROM ${table}`,
        );
        const count = result.rows[0]?.count || 0;
        console.log(`   ${table.padEnd(25)}: ${count}`);
      } catch {
        console.log(`   ${table.padEnd(25)}: 0`);
      }
    }

    // Delete data
    console.log("\n🧹 Deleting classification results...");
    for (const table of tables) {
      try {
        await client.execute(`DELETE FROM ${table}`);
        console.log(`   ✓ Cleared ${table}`);
      } catch (_error) {
        console.log(`   ⚠️  Could not clear ${table}: ${error.message}`);
      }
    }

    // Verify deletion
    console.log("\n📊 After reset:");
    for (const table of tables) {
      try {
        const result = await client.execute(
          `SELECT COUNT(*) as count FROM ${table}`,
        );
        const count = result.rows[0]?.count || 0;
        console.log(`   ${table.padEnd(25)}: ${count}`);
      } catch {
        console.log(`   ${table.padEnd(25)}: 0`);
      }
    }

    // Show source data is intact
    console.log("\n✅ Classification results cleared!");
    console.log("   Source data preserved:");
    try {
      const indicators = await client.execute(
        "SELECT COUNT(*) as count FROM source_indicators",
      );
      const countryIndicators = await client.execute(
        "SELECT COUNT(*) as count FROM source_country_indicators",
      );
      console.log(
        `   • source_indicators:         ${indicators.rows[0]?.count || 0}`,
      );
      console.log(
        `   • source_country_indicators: ${
          countryIndicators.rows[0]?.count || 0
        }`,
      );
    } catch (_error) {
      console.log("   • Could not verify source data");
    }

    console.log("\n✅ Production database reset complete!\n");
    console.log("Next step:");
    console.log(
      "  Run: deno task prod:run      # Run classification pipeline\n",
    );
  } catch (_error) {
    console.error("\n❌ Reset failed:");
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}\n`,
    );
    console.error("Stack trace:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await resetProductionDatabase();
}
