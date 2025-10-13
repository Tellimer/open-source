#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-net --allow-ffi

/**
 * Sync classification data from local SQLite to PostgreSQL staging database
 * Updates the 3 new columns: type, temporal_aggregation, heat_map_orientation
 *
 * IMPORTANT: Updates by INDICATOR NAME, not ID
 * - One classification (e.g., "Balance of Trade") updates ALL indicators with that name
 * - Handles country-specific indicator IDs (e.g., 180 "Balance of Trade" indicators)
 */

import { Database } from "@db/sqlite";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const SQLITE_DB_PATH = "./data/classify_production_v2.db";
const DATABASE_URL = Deno.env.get("DATABASE_URL");

console.log("🔄 Starting classification sync to PostgreSQL (BY NAME)...\n");

// Open SQLite database
console.log(`📂 Opening SQLite database: ${SQLITE_DB_PATH}`);
const sqlite = new Database(SQLITE_DB_PATH);
sqlite.exec("PRAGMA foreign_keys = ON;");

// Get all classifications from SQLite
console.log("📊 Reading classifications from SQLite...");
const classifications = sqlite.prepare(`
  SELECT
    name,
    indicator_type as type,
    temporal_aggregation,
    heat_map_orientation
  FROM classifications
  ORDER BY name
`).all();

console.log(`✓ Found ${classifications.length} classifications in SQLite\n`);

sqlite.close();

// Connect to PostgreSQL
console.log("🔌 Connecting to PostgreSQL...");
console.log(`   Database: ${DATABASE_URL?.replace(/:[^:@]+@/, ":***@")}\n`);

const pgClient = new Client(DATABASE_URL);
await pgClient.connect();

console.log("✓ Connected to PostgreSQL\n");

// Get indicator name statistics from PostgreSQL
console.log("📊 Analyzing indicators in PostgreSQL...");
const pgStats = await pgClient.queryObject<{
  total: string;
  unique_names: string;
}>`
  SELECT
    COUNT(*) as total,
    COUNT(DISTINCT name) as unique_names
  FROM indicators
`;

console.log(
  `✓ Found ${pgStats.rows[0].total} total indicators (${
    pgStats.rows[0].unique_names
  } unique names)\n`,
);

// Sync classifications by name
console.log("🔄 Syncing classifications by indicator name...\n");

let updatedIndicatorCount = 0;
let updatedNameCount = 0;
let notFoundCount = 0;
let errorCount = 0;
const notFoundNames: string[] = [];
const updateStats: Array<{ name: string; count: number }> = [];

for (const classification of classifications) {
  const indicatorName = classification.name;

  try {
    // Update ALL indicators with this name
    const result = await pgClient.queryObject`
      UPDATE indicators
      SET
        type = ${classification.type}::indicator_type,
        temporal_aggregation = ${classification.temporal_aggregation}::temporal_aggregation,
        heat_map_orientation = ${classification.heat_map_orientation}::heat_map_orientation,
        updated_at = NOW()
      WHERE name = ${indicatorName}
    `;

    if (result.rowCount && result.rowCount > 0) {
      updatedIndicatorCount += result.rowCount;
      updatedNameCount++;
      updateStats.push({ name: indicatorName, count: result.rowCount });

      if (updatedNameCount % 50 === 0) {
        console.log(
          `  ✓ Updated ${updatedNameCount} indicator names (${updatedIndicatorCount} total indicators)...`,
        );
      }
    } else {
      notFoundNames.push(indicatorName);
      notFoundCount++;
    }
  } catch (error) {
    console.error(
      `  ✗ Error updating "${indicatorName}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    errorCount++;
  }
}

console.log("\n========================================");
console.log("Sync Results:");
console.log(`  ✓ Indicator names updated:  ${updatedNameCount}`);
console.log(`  ✓ Total indicators updated: ${updatedIndicatorCount}`);
console.log(`  ⚠ Names not found:          ${notFoundCount}`);
console.log(`  ✗ Errors:                   ${errorCount}`);
console.log("========================================\n");

// Show top 10 indicators by update count
if (updateStats.length > 0) {
  console.log("📊 Top 10 indicators by country count:\n");
  updateStats
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .forEach((stat) => {
      console.log(`  ${stat.name.padEnd(30)} → ${stat.count} countries`);
    });
  console.log();
}

if (notFoundCount > 0 && notFoundCount <= 20) {
  console.log("⚠ Indicator names not found in PostgreSQL:");
  notFoundNames.forEach((name) => console.log(`  - ${name}`));
  console.log();
} else if (notFoundCount > 20) {
  console.log(
    `⚠ ${notFoundCount} indicator names not found in PostgreSQL (first 20):`,
  );
  notFoundNames.slice(0, 20).forEach((name) => console.log(`  - ${name}`));
  console.log(`  ... and ${notFoundCount - 20} more\n`);
}

// Verify some updates
console.log("🔍 Verifying updates (sample of 5 indicator names)...\n");
const sampleNames = [
  "Balance of Trade",
  "GDP",
  "Population",
  "Inflation Rate",
  "Exports",
]
  .filter((name) => updateStats.some((s) => s.name === name));

for (const name of sampleNames) {
  const result = await pgClient.queryObject<{
    count: string;
    type: string;
    temporal_aggregation: string;
    heat_map_orientation: string;
  }>`
    SELECT
      COUNT(*) as count,
      type,
      temporal_aggregation,
      heat_map_orientation
    FROM indicators
    WHERE name = ${name}
    GROUP BY type, temporal_aggregation, heat_map_orientation
    LIMIT 1
  `;

  if (result.rows.length > 0) {
    const row = result.rows[0];
    console.log(`${name} (${row.count} indicators):`);
    console.log(`  type: ${row.type}`);
    console.log(`  temporal_aggregation: ${row.temporal_aggregation}`);
    console.log(`  heat_map_orientation: ${row.heat_map_orientation}\n`);
  }
}

// Final coverage check
const coverage = await pgClient.queryObject<{
  total: string;
  classified: string;
  coverage_percent: string;
}>`
  SELECT
    COUNT(*) as total,
    COUNT(type) as classified,
    ROUND(COUNT(type)::numeric / COUNT(*) * 100, 2) as coverage_percent
  FROM indicators
`;

console.log("📈 Overall Coverage:");
console.log(`  Total indicators: ${coverage.rows[0].total}`);
console.log(`  Classified:       ${coverage.rows[0].classified}`);
console.log(`  Coverage:         ${coverage.rows[0].coverage_percent}%\n`);

await pgClient.end();

console.log("✅ Sync complete!\n");

if (errorCount > 0) {
  Deno.exit(1);
}
