#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read --allow-ffi --env

/**
 * Seed LibSQL (Turso) Database from Local SQLite
 *
 * Copies source_indicators from local SQLite to remote LibSQL database
 * with batch processing (500 indicators at a time)
 *
 * Usage:
 *   deno task seed:libsql
 *   deno task seed:libsql --drop  # Drop and recreate table first
 */

import { createClient } from "@libsql/client";
import Database from "better-sqlite3";

// LibSQL schema for source_indicators with status tracking
const LIBSQL_SCHEMA = `
CREATE TABLE IF NOT EXISTS source_indicators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_name TEXT,
  source_url TEXT,
  long_name TEXT,
  category_group TEXT,
  dataset TEXT,
  aggregation_method TEXT,
  definition TEXT,
  units TEXT,
  scale TEXT,
  periodicity TEXT,
  topic TEXT,
  currency_code TEXT,
  sample_values TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,

  -- Status tracking for feeder
  queued INTEGER DEFAULT 0,
  sent_at TEXT,
  sent_trace_id TEXT,
  processed INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_source_indicators_queued
  ON source_indicators(queued);
CREATE INDEX IF NOT EXISTS idx_source_indicators_sent_at
  ON source_indicators(sent_at);
CREATE INDEX IF NOT EXISTS idx_source_indicators_processed
  ON source_indicators(processed);
`;

interface SourceIndicator {
  id: string;
  name: string;
  source_name?: string;
  source_url?: string;
  long_name?: string;
  category_group?: string;
  dataset?: string;
  aggregation_method?: string;
  definition?: string;
  units?: string;
  scale?: string;
  periodicity?: string;
  topic?: string;
  currency_code?: string;
  sample_values?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * Chunk array into batches
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Read all source indicators from local SQLite
 */
function readLocalIndicators(dbPath: string): SourceIndicator[] {
  console.log(`📂 Reading from local SQLite: ${dbPath}`);

  const db = new Database(dbPath);

  try {
    const stmt = db.prepare(`
      SELECT
        id, name, source_name, source_url, long_name,
        category_group, dataset, aggregation_method, definition,
        units, scale, periodicity, topic, currency_code,
        sample_values, created_at, updated_at, deleted_at
      FROM source_indicators
      WHERE deleted_at IS NULL
      ORDER BY id
    `);

    const rows = stmt.all() as SourceIndicator[];
    console.log(`✅ Found ${rows.length.toLocaleString()} indicators\n`);

    return rows;
  } finally {
    db.close();
  }
}

/**
 * Initialize LibSQL schema
 */
async function initializeLibSQLSchema(
  client: ReturnType<typeof createClient>,
  dropFirst: boolean,
) {
  console.log(`🔧 Initializing LibSQL schema...`);

  if (dropFirst) {
    console.log(`   ⚠️  Dropping existing table...`);
    await client.execute("DROP TABLE IF EXISTS source_indicators");
  }

  // Execute schema statements
  const statements = LIBSQL_SCHEMA.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await client.execute(statement);
  }

  console.log(`✅ Schema initialized\n`);
}

/**
 * Seed LibSQL database in batches
 */
async function seedLibSQL(
  client: ReturnType<typeof createClient>,
  indicators: SourceIndicator[],
  batchSize: number,
) {
  console.log(`📤 Seeding LibSQL database...`);
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Total indicators: ${indicators.length.toLocaleString()}`);
  console.log(
    `   Total batches: ${Math.ceil(indicators.length / batchSize)}\n`,
  );

  const batches = chunk(indicators, batchSize);
  let totalInserted = 0;
  let totalSkipped = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNum = i + 1;
    const start = i * batchSize + 1;
    const end = start + batch.length - 1;

    process.stdout.write(
      `\r   📦 Batch ${batchNum}/${batches.length}: Processing indicators ${start}-${end}...`,
    );

    let batchInserted = 0;
    let batchSkipped = 0;

    // Insert each indicator in the batch
    for (const indicator of batch) {
      try {
        await client.execute({
          sql: `
            INSERT INTO source_indicators (
              id, name, source_name, source_url, long_name,
              category_group, dataset, aggregation_method, definition,
              units, scale, periodicity, topic, currency_code,
              sample_values, created_at, updated_at, deleted_at,
              queued, sent_at, sent_trace_id, processed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL, 0)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              source_name = excluded.source_name,
              source_url = excluded.source_url,
              long_name = excluded.long_name,
              category_group = excluded.category_group,
              dataset = excluded.dataset,
              aggregation_method = excluded.aggregation_method,
              definition = excluded.definition,
              units = excluded.units,
              scale = excluded.scale,
              periodicity = excluded.periodicity,
              topic = excluded.topic,
              currency_code = excluded.currency_code,
              sample_values = excluded.sample_values,
              updated_at = excluded.updated_at,
              deleted_at = excluded.deleted_at,
              queued = 1
          `,
          args: [
            indicator.id,
            indicator.name,
            indicator.source_name || null,
            indicator.source_url || null,
            indicator.long_name || null,
            indicator.category_group || null,
            indicator.dataset || null,
            indicator.aggregation_method || null,
            indicator.definition || null,
            indicator.units || null,
            indicator.scale || null,
            indicator.periodicity || null,
            indicator.topic || null,
            indicator.currency_code || null,
            indicator.sample_values || null,
            indicator.created_at,
            indicator.updated_at,
            indicator.deleted_at || null,
          ],
        });
        batchInserted++;
      } catch (error) {
        // Skip duplicates or other errors
        batchSkipped++;
      }
    }

    totalInserted += batchInserted;
    totalSkipped += batchSkipped;
  }

  console.log(`\n\n✅ Seeding complete!`);
  console.log(`   Inserted/Updated: ${totalInserted.toLocaleString()}`);
  if (totalSkipped > 0) {
    console.log(`   Skipped: ${totalSkipped.toLocaleString()}`);
  }
}

/**
 * Verify seeded data
 */
async function verifySeeding(client: ReturnType<typeof createClient>) {
  console.log(`\n🔍 Verifying seeded data...`);

  const result = await client.execute({
    sql: `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE queued = 1) as queued,
        COUNT(*) FILTER (WHERE sent_at IS NOT NULL) as sent,
        COUNT(*) FILTER (WHERE processed = 1) as processed
      FROM source_indicators
    `,
    args: [],
  });

  const row = result.rows[0] as any;

  console.log(`   Total indicators: ${Number(row.total).toLocaleString()}`);
  console.log(
    `   Queued for processing: ${Number(row.queued).toLocaleString()}`,
  );
  console.log(`   Already sent: ${Number(row.sent).toLocaleString()}`);
  console.log(`   Processed: ${Number(row.processed).toLocaleString()}`);
}

/**
 * Main function
 */
async function main() {
  console.log("🔄 LibSQL Database Seeder\n");

  // Parse arguments
  const args = Deno.args;
  const dropFirst = args.includes("--drop");

  // Get configuration from environment
  const libsqlUrl = Deno.env.get("LIBSQL_URL");
  const libsqlAuthToken = Deno.env.get("LIBSQL_AUTH_TOKEN");
  const localDbPath = Deno.env.get("CLASSIFY_DB_LOCAL_DEV") ||
    "./data/classify-workflow-local-dev.db";
  const batchSize = parseInt(Deno.env.get("BATCH_SIZE") || "500", 10);

  if (!libsqlUrl) {
    console.error("❌ LIBSQL_URL environment variable is required");
    console.error("   Set it in your .env file:");
    console.error("   LIBSQL_URL=libsql://your-database.turso.io\n");
    Deno.exit(1);
  }

  console.log("⚙️  Configuration:");
  console.log(`   Local SQLite: ${localDbPath}`);
  console.log(`   Remote LibSQL: ${libsqlUrl}`);
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Drop existing: ${dropFirst ? "Yes" : "No"}\n`);

  // Check if local database exists
  try {
    await Deno.stat(localDbPath);
  } catch {
    console.error(`❌ Local database not found: ${localDbPath}`);
    console.error("   Run 'deno task seed-db' first to create it.\n");
    Deno.exit(1);
  }

  try {
    // Connect to LibSQL
    console.log("🔌 Connecting to LibSQL...");
    const client = createClient({
      url: libsqlUrl,
      authToken: libsqlAuthToken,
    });
    console.log("✅ Connected\n");

    // Initialize schema
    await initializeLibSQLSchema(client, dropFirst);

    // Read local indicators
    const indicators = readLocalIndicators(localDbPath);

    if (indicators.length === 0) {
      console.log("⚠️  No indicators found in local database");
      Deno.exit(0);
    }

    // Seed LibSQL
    await seedLibSQL(client, indicators, batchSize);

    // Verify
    await verifySeeding(client);

    console.log("\n🎉 Done!\n");
    console.log("💡 Next steps:");
    console.log("   1. Check feeder status: cd ../feeder && deno task status");
    console.log("   2. Start processing: cd ../feeder && deno task start\n");
  } catch (error) {
    console.error(
      `\n❌ Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
