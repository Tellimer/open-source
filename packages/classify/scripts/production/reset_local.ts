#!/usr/bin/env -S deno run --allow-all
/**
 * Local Production Database Reset Script
 *
 * Resets the local production database (./data/classify_production_v2.db)
 *
 * Usage:
 *   deno task prod:reset-local
 *
 * @module
 */

import { Database } from "@db/sqlite";

async function resetLocalDatabase() {
  console.log("\n🔄 Resetting Local Production Database");
  console.log("=".repeat(60));
  console.log("⚠️  WARNING: This will delete the local database file!");
  console.log("⚠️  Path: ./data/classify_production_v2.db\n");

  const dbPath = "./data/classify_production_v2.db";

  // Check if file exists
  try {
    await Deno.stat(dbPath);
  } catch {
    console.log("✅ Database file does not exist - nothing to reset\n");
    Deno.exit(0);
  }

  // Confirm action
  console.log('Type "yes" to confirm deletion: ');
  const decoder = new TextDecoder();
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);
  const input = decoder.decode(buf.subarray(0, n || 0)).trim().toLowerCase();

  if (input !== "yes") {
    console.log("\n❌ Reset cancelled\n");
    Deno.exit(0);
  }

  try {
    // Show stats before deletion
    console.log("\n📊 Database stats before deletion:");
    const db = new Database(dbPath, { readonly: true });

    const tables = [
      "classifications",
      "router_results",
      "specialist_results",
      "validation_results",
      "orientation_results",
      "flagging_results",
      "review_decisions",
      "deep_review_decisions",
      "pipeline_executions",
    ];

    for (const table of tables) {
      try {
        const result = db
          .prepare(`SELECT COUNT(*) as count FROM ${table}`)
          .value();
        console.log(`   ${table.padEnd(30)}: ${result?.[0] || 0}`);
      } catch {
        console.log(`   ${table.padEnd(30)}: table does not exist`);
      }
    }

    db.close();

    // Delete the database file
    console.log("\n🗑️  Deleting database file...");
    await Deno.remove(dbPath);
    console.log(`   ✓ Deleted ${dbPath}`);

    // Also delete WAL and SHM files if they exist
    try {
      await Deno.remove(`${dbPath}-wal`);
      console.log(`   ✓ Deleted ${dbPath}-wal`);
    } catch {
      // File doesn't exist, that's fine
    }

    try {
      await Deno.remove(`${dbPath}-shm`);
      console.log(`   ✓ Deleted ${dbPath}-shm`);
    } catch {
      // File doesn't exist, that's fine
    }

    console.log("\n✅ Local production database reset complete!\n");
    console.log("Next steps:");
    console.log(
      "  Run: deno task prod:run           # Run full pipeline (668 indicators)",
    );
    console.log(
      "  Run: deno task prod:run --20      # Run with 20 random samples",
    );
    console.log(
      "  Run: deno task prod:run --50      # Run with 50 random samples\n",
    );
  } catch (error) {
    console.error("\n❌ Reset failed:");
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}\n`,
    );
    console.error("Stack trace:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await resetLocalDatabase();
}
