/**
 * Database Setup Script
 * Creates and initializes local SQLite database for V2 pipeline
 * @module
 */

import { createLocalDatabase } from "./client.ts";
import { CLEANUP_OLD_DATA } from "./schema.ts";

/**
 * Setup local SQLite database
 */
export async function setupLocalDatabase(
  dbPath: string = "./data/classify_v2.db",
  options: {
    clean?: boolean;
    verbose?: boolean;
  } = {},
): Promise<void> {
  const { clean = false, verbose = false } = options;

  if (verbose) {
    console.log(`\n📦 Setting up V2 SQLite database...`);
    console.log(`📍 Path: ${dbPath}`);
  }

  try {
    // Create database client
    const db = createLocalDatabase(dbPath);

    // Initialize with schema
    await db.initialize();

    if (verbose) {
      console.log(`✅ Database initialized successfully`);
      console.log(`   • Schema version: 1`);
      console.log(`   • WAL mode: enabled`);
      console.log(`   • Auto-migrate: enabled`);
    }

    // Verify tables exist
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
      )
      .all()
      .map((row: any) => row.name);

    if (verbose) {
      console.log(`\n📋 Tables created (${tables.length}):`);
      for (const table of tables) {
        console.log(`   • ${table}`);
      }
    }

    // Optionally clean old data
    if (clean) {
      if (verbose) {
        console.log(`\n🧹 Cleaning old data...`);
      }
      db.exec(CLEANUP_OLD_DATA);
      if (verbose) {
        console.log(`✅ Cleanup complete`);
      }
    }

    // Get database stats
    const stats = getDbStats(db);
    if (verbose) {
      console.log(`\n📊 Database Stats:`);
      console.log(`   • Total indicators: ${stats.totalIndicators}`);
      console.log(`   • Router results: ${stats.routerResults}`);
      console.log(`   • Specialist results: ${stats.specialistResults}`);
      console.log(`   • Orientation results: ${stats.orientationResults}`);
      console.log(`   • Flagged indicators: ${stats.flaggedIndicators}`);
      console.log(`   • Review decisions: ${stats.reviewDecisions}`);
      console.log(`   • Pipeline executions: ${stats.pipelineExecutions}`);
    }

    db.close();

    if (verbose) {
      console.log(`\n✅ Setup complete!\n`);
    }
  } catch (error) {
    console.error(`\n❌ Database setup failed:`);
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}\n`,
    );
    throw error;
  }
}

/**
 * Get database statistics
 */
function getDbStats(db: any): {
  totalIndicators: number;
  routerResults: number;
  specialistResults: number;
  orientationResults: number;
  flaggedIndicators: number;
  reviewDecisions: number;
  pipelineExecutions: number;
} {
  const getCount = (table: string): number => {
    const result = db
      .prepare(`SELECT COUNT(*) as count FROM ${table}`)
      .value<[number]>();
    return result ? result[0] : 0;
  };

  return {
    totalIndicators: getCount("classifications"),
    routerResults: getCount("router_results"),
    specialistResults: getCount("specialist_results"),
    orientationResults: getCount("orientation_results"),
    flaggedIndicators: getCount("flagging_results"),
    reviewDecisions: getCount("review_decisions"),
    pipelineExecutions: getCount("pipeline_executions"),
  };
}

/**
 * Reset database (delete all data, keep schema)
 */
export async function resetDatabase(
  dbPath: string = "./data/classify_v2.db",
  verbose: boolean = false,
): Promise<void> {
  if (verbose) {
    console.log(`\n🔄 Resetting database...`);
  }

  const db = createLocalDatabase(dbPath);
  await db.initialize();

  db.transaction(() => {
    db.exec("DELETE FROM review_decisions");
    db.exec("DELETE FROM flagging_results");
    db.exec("DELETE FROM orientation_results");
    db.exec("DELETE FROM specialist_results");
    db.exec("DELETE FROM router_results");
    db.exec("DELETE FROM classifications");
    db.exec("DELETE FROM pipeline_executions");
  });

  if (verbose) {
    console.log(`✅ Database reset complete\n`);
  }

  db.close();
}

// CLI interface
if (import.meta.main) {
  const args = Deno.args;
  const command = args[0] || "setup";
  const dbPath = args[1] || "./data/classify_v2.db";

  switch (command) {
    case "setup":
      await setupLocalDatabase(dbPath, { verbose: true });
      break;

    case "reset":
      await resetDatabase(dbPath, true);
      break;

    case "clean":
      await setupLocalDatabase(dbPath, { clean: true, verbose: true });
      break;

    default:
      console.log(`
Usage:
  deno run --allow-read --allow-write src/v2/db/setup.ts [command] [db_path]

Commands:
  setup    Initialize database with schema (default)
  reset    Delete all data, keep schema
  clean    Initialize and clean old data

Examples:
  deno run --allow-read --allow-write src/v2/db/setup.ts setup
  deno run --allow-read --allow-write src/v2/db/setup.ts reset ./custom.db
  deno run --allow-read --allow-write src/v2/db/setup.ts clean
      `);
      Deno.exit(1);
  }
}
