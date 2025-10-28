#!/usr/bin/env -S deno run --allow-env --allow-read --allow-net --allow-ffi --allow-sys

import { Database } from "@db/sqlite";
import postgres from "postgres";
import { CLASSIFY_WORKFLOW_POSTGRES_SCHEMA } from "../db/postgres-schema.ts";

const DEFAULT_TABLES = [
  "source_indicators",
  "classifications",
  "normalization_results",
  "time_inference_results",
  "cumulative_detection_results",
  "scale_inference_results",
  "currency_check_results",
  "family_assignment_results",
  "type_classification_results",
  "boolean_review_results",
  "final_review_results",
  "processing_log",
  "pipeline_stats",
];

function parseArgs() {
  const options = {
    batchSize: 100,
    dryRun: false,
    tables: undefined as string[] | undefined,
  };
  for (const arg of Deno.args) {
    if (arg.startsWith("--tables=")) options.tables = arg.slice(9).split(",");
    else if (arg.startsWith("--batch-size=")) {
      options.batchSize = parseInt(arg.slice(13));
    } else if (arg === "--dry-run") options.dryRun = true;
  }
  return options;
}

function getPrimaryKey(table: string): string {
  const keys: Record<string, string> = {
    source_indicators: "id",
    processing_log: "id",
    pipeline_stats: "id",
    schema_version: "version",
  };
  return keys[table] || "indicator_id";
}

function convertValue(value: any, columnType: string): any {
  if (value == null) return null;
  if (columnType.includes("BOOLEAN") && typeof value === "number") {
    return value === 1;
  }
  return value;
}

function getColumnType(table: string, column: string): string {
  const match = CLASSIFY_WORKFLOW_POSTGRES_SCHEMA.match(
    new RegExp(`CREATE TABLE[^(]*${table}[^(]*\\(([^;]+)\\)`, "i"),
  );
  if (!match) return "TEXT";
  const colMatch = match[1].match(new RegExp(`${column}\\s+([A-Z]+)`, "i"));
  return colMatch ? colMatch[1] : "TEXT";
}

async function syncTable(
  sqliteDb: Database.Database,
  sql: postgres.Sql,
  table: string,
  options: any,
) {
  console.log(`\n📊 Syncing: ${table}`);
  const rows = sqliteDb.prepare(`SELECT * FROM ${table}`).all();

  if (rows.length === 0) {
    console.log(`  ℹ️  Empty table`);
    return { synced: 0, skipped: 0 };
  }

  console.log(`  📦 Found ${rows.length} rows`);
  if (options.dryRun) {
    console.log(`  🔍 DRY RUN`);
    return { synced: 0, skipped: rows.length };
  }

  const columns = Object.keys(rows[0]);
  const primaryKey = getPrimaryKey(table);
  let synced = 0, skipped = 0;

  for (let i = 0; i < rows.length; i += options.batchSize) {
    const batch = rows.slice(i, Math.min(i + options.batchSize, rows.length));

    for (const row of batch) {
      try {
        const values = columns.map((col) =>
          convertValue(row[col], getColumnType(table, col))
        );
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
        const updateSet = columns.filter((c) => c !== primaryKey).map((c) =>
          `${c} = EXCLUDED.${c}`
        ).join(", ");

        const query = updateSet
          ? `INSERT INTO ${table} (${
            columns.join(", ")
          }) VALUES (${placeholders}) 
             ON CONFLICT (${primaryKey}) DO UPDATE SET ${updateSet}`
          : `INSERT INTO ${table} (${
            columns.join(", ")
          }) VALUES (${placeholders}) 
             ON CONFLICT (${primaryKey}) DO NOTHING`;

        await sql.unsafe(query, values);
        synced++;
      } catch (error: any) {
        console.error(`  ❌ Error:`, error.message);
        skipped++;
      }
    }

    const progress = Math.min(i + options.batchSize, rows.length);
    Deno.stdout.writeSync(
      new TextEncoder().encode(`\r  ⏳ ${progress}/${rows.length}`),
    );
  }

  console.log(`\r  ✅ Synced: ${synced} (${skipped} skipped)\n`);
  return { synced, skipped };
}

async function main() {
  console.log("🔄 SQLite → PostgreSQL Sync\n");

  const options = parseArgs();
  const postgresUrl = Deno.env.get("POSTGRES_URL") ||
    Deno.env.get("DATABASE_URL");

  if (!postgresUrl) {
    console.error("❌ POSTGRES_URL required");
    Deno.exit(1);
  }

  const sqlitePath = Deno.env.get("CLASSIFY_DB_LOCAL_DEV") ||
    "./data/classify-workflow-local-dev.db";

  console.log(`📂 SQLite: ${sqlitePath}`);
  console.log(`🗄️  PostgreSQL: ${postgresUrl.replace(/:[^:@]+@/, ":****@")}`);
  console.log(
    `📋 Tables: ${
      options.tables?.join(", ") || `All (${DEFAULT_TABLES.length})`
    }`,
  );
  console.log(`📦 Batch: ${options.batchSize}`);
  if (options.dryRun) console.log("🔍 DRY RUN");

  console.log("\n🔌 Connecting to databases...");
  const sqliteDb = new Database(sqlitePath, { readonly: true });
  console.log("  ✅ SQLite connected");

  const sql = postgres(postgresUrl, { max: 5 });
  console.log("  ✅ PostgreSQL connected\n");

  try {
    if (!options.dryRun) {
      console.log("\n📝 Ensuring schema...");
      const statements = CLASSIFY_WORKFLOW_POSTGRES_SCHEMA.split(";").filter(
        (s) => s.trim(),
      );
      for (const stmt of statements) {
        try {
          await sql.unsafe(stmt.trim());
        } catch (e: any) {
          if (!e.message?.includes("already exists")) throw e;
        }
      }
      console.log("✅ Schema ready\n");
    }

    const tables = options.tables || DEFAULT_TABLES;
    let totalSynced = 0, totalSkipped = 0;

    for (const table of tables) {
      const exists = sqliteDb.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      ).get(table);
      if (!exists) {
        console.log(`\n⚠️  Table '${table}' not found, skipping`);
        continue;
      }

      const { synced, skipped } = await syncTable(
        sqliteDb,
        sql,
        table,
        options,
      );
      totalSynced += synced;
      totalSkipped += skipped;
    }

    console.log("=".repeat(50));
    console.log("📊 Summary");
    console.log("=".repeat(50));
    console.log(`✅ Synced: ${totalSynced} rows`);
    console.log(`⚠️  Skipped: ${totalSkipped} rows`);
    console.log(`📋 Tables: ${tables.length}`);

    if (options.dryRun) {
      console.log("\n🔍 DRY RUN - no data synced");
    } else {
      console.log("\n✨ Sync complete!");
    }
  } catch (error) {
    console.error("\n❌ Sync failed:", error);
    Deno.exit(1);
  } finally {
    console.log("🔒 Closing connections...");
    try {
      sqliteDb.close();
      console.log("  ✅ SQLite closed");
    } catch (e) {
      console.error("  ⚠️  SQLite close error:", e);
    }
    try {
      await sql.end();
      console.log("  ✅ PostgreSQL closed");
    } catch (e) {
      console.error("  ⚠️  PostgreSQL close error:", e);
    }
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    Deno.exit(1);
  });
}
