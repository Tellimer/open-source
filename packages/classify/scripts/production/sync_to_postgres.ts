#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-net --allow-ffi

/**
 * Sync classification data from local SQLite to PostgreSQL staging database
 * Updates the 3 new columns: type, temporal_aggregation, heat_map_orientation
 */

import { Database } from "@db/sqlite";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const SQLITE_DB_PATH = "./data/classify_production_v2.db";
const DATABASE_URL = Deno.env.get("DATABASE_URL");

console.log("🔄 Starting classification sync to PostgreSQL...\n");

// Open SQLite database
console.log(`📂 Opening SQLite database: ${SQLITE_DB_PATH}`);
const sqlite = new Database(SQLITE_DB_PATH);
sqlite.exec("PRAGMA foreign_keys = ON;");

// Get all classifications from SQLite
console.log("📊 Reading classifications from SQLite...");
const classifications = sqlite.prepare(`
  SELECT
    indicator_id,
    indicator_type as type,
    temporal_aggregation,
    heat_map_orientation
  FROM classifications
  ORDER BY indicator_id
`).all();

console.log(`✓ Found ${classifications.length} classifications in SQLite\n`);

sqlite.close();

// Connect to PostgreSQL
console.log("🔌 Connecting to PostgreSQL...");
console.log(`   Database: ${DATABASE_URL?.replace(/:[^:@]+@/, ":***@")}\n`);

const pgClient = new Client(DATABASE_URL);
await pgClient.connect();

console.log("✓ Connected to PostgreSQL\n");

// Get all indicators from PostgreSQL
console.log("📊 Reading indicators from PostgreSQL...");
const pgIndicators = await pgClient.queryObject<{ id: string; name: string }>`
  SELECT id, name
  FROM indicators
  ORDER BY id
`;

console.log(`✓ Found ${pgIndicators.rows.length} indicators in PostgreSQL\n`);

// Create a map for quick lookup
const pgIndicatorMap = new Map(
  pgIndicators.rows.map((row) => [row.id, row.name]),
);

// Sync classifications
console.log("🔄 Syncing classifications...\n");

let updatedCount = 0;
let notFoundCount = 0;
let errorCount = 0;
const notFoundIndicators: string[] = [];

for (const classification of classifications) {
  const indicatorId = classification.indicator_id;

  try {
    // Check if indicator exists in PostgreSQL
    if (!pgIndicatorMap.has(indicatorId)) {
      notFoundIndicators.push(indicatorId);
      notFoundCount++;
      continue;
    }

    // Update the indicator with classification data
    const result = await pgClient.queryObject`
      UPDATE indicators
      SET
        type = ${classification.type}::indicator_type,
        temporal_aggregation = ${classification.temporal_aggregation}::temporal_aggregation,
        heat_map_orientation = ${classification.heat_map_orientation}::heat_map_orientation,
        updated_at = NOW()
      WHERE id = ${indicatorId}
    `;

    if (result.rowCount && result.rowCount > 0) {
      updatedCount++;
      if (updatedCount % 100 === 0) {
        console.log(`  ✓ Updated ${updatedCount} indicators...`);
      }
    }
  } catch (error) {
    console.error(
      `  ✗ Error updating ${indicatorId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    errorCount++;
  }
}

console.log("\n========================================");
console.log("Sync Results:");
console.log(`  ✓ Updated:    ${updatedCount}`);
console.log(`  ⚠ Not found:  ${notFoundCount}`);
console.log(`  ✗ Errors:     ${errorCount}`);
console.log("========================================\n");

if (notFoundCount > 0 && notFoundCount <= 20) {
  console.log("⚠ Indicators not found in PostgreSQL:");
  notFoundIndicators.forEach((id) => console.log(`  - ${id}`));
  console.log();
} else if (notFoundCount > 20) {
  console.log(
    `⚠ ${notFoundCount} indicators not found in PostgreSQL (first 20):`,
  );
  notFoundIndicators.slice(0, 20).forEach((id) => console.log(`  - ${id}`));
  console.log(`  ... and ${notFoundCount - 20} more\n`);
}

// Verify some updates
console.log("🔍 Verifying updates (sample of 5 indicators)...\n");
const sampleIndicators = classifications.slice(0, 5);

for (const sample of sampleIndicators) {
  if (!pgIndicatorMap.has(sample.indicator_id)) continue;

  const result = await pgClient.queryObject<{
    id: string;
    name: string;
    type: string;
    temporal_aggregation: string;
    heat_map_orientation: string;
  }>`
    SELECT id, name, type, temporal_aggregation, heat_map_orientation
    FROM indicators
    WHERE id = ${sample.indicator_id}
  `;

  if (result.rows.length > 0) {
    const row = result.rows[0];
    console.log(`${row.id} (${row.name}):`);
    console.log(`  type: ${row.type}`);
    console.log(`  temporal_aggregation: ${row.temporal_aggregation}`);
    console.log(`  heat_map_orientation: ${row.heat_map_orientation}\n`);
  }
}

await pgClient.end();

console.log("✅ Sync complete!\n");

if (errorCount > 0) {
  Deno.exit(1);
}
