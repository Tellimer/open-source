#!/usr/bin/env bun

/**
 * ============================================================================
 * TIME SERIES DATA INGESTION SCRIPT
 * ============================================================================
 *
 * Ingests time series data from CSV/JSON files into the time_series_data table.
 *
 * Usage:
 *   bun run src/scripts/ingest-time-series.ts --file data.csv
 *   bun run src/scripts/ingest-time-series.ts --file data.json --format json
 *   bun run src/scripts/ingest-time-series.ts --file data.csv --indicator-id "GDP_USA"
 *
 * CSV Format:
 *   indicator_id,date,value
 *   GDP_USA,2023-01-01,25.5
 *   GDP_USA,2023-02-01,26.1
 *
 * JSON Format:
 *   [
 *     {"indicator_id": "GDP_USA", "date": "2023-01-01", "value": 25.5},
 *     {"indicator_id": "GDP_USA", "date": "2023-02-01", "value": 26.1}
 *   ]
 *
 * Or nested format:
 *   {
 *     "GDP_USA": [
 *       {"date": "2023-01-01", "value": 25.5},
 *       {"date": "2023-02-01", "value": 26.1}
 *     ]
 *   }
 */

import { DatabaseRepository } from "../db/repository.ts";
import { parse as parseCSV } from "csv-parse/sync";
import * as fs from "fs";

interface TimeSeriesRow {
  indicator_id: string;
  date: string;
  value: number;
  source_version?: string;
}

interface IngestOptions {
  file: string;
  format?: "csv" | "json";
  indicatorId?: string;
  sourceVersion?: string;
  batchSize?: number;
  upsert?: boolean;
}

async function parseCSVFile(filePath: string): Promise<TimeSeriesRow[]> {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const records = parseCSV(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record: any) => ({
    indicator_id: record.indicator_id,
    date: record.date,
    value: parseFloat(record.value),
    source_version: record.source_version,
  }));
}

async function parseJSONFile(
  filePath: string,
  indicatorId?: string
): Promise<TimeSeriesRow[]> {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(fileContent);

  // Handle array format: [{indicator_id, date, value}, ...]
  if (Array.isArray(data)) {
    return data.map((item) => ({
      indicator_id: item.indicator_id || indicatorId,
      date: item.date,
      value: parseFloat(item.value),
      source_version: item.source_version,
    }));
  }

  // Handle nested format: {indicator_id: [{date, value}, ...], ...}
  const rows: TimeSeriesRow[] = [];
  for (const [id, values] of Object.entries(data)) {
    if (Array.isArray(values)) {
      for (const item of values as any[]) {
        rows.push({
          indicator_id: id,
          date: item.date,
          value: parseFloat(item.value),
          source_version: item.source_version,
        });
      }
    }
  }

  return rows;
}

async function ingestBatch(
  repo: DatabaseRepository,
  rows: TimeSeriesRow[],
  upsert: boolean
) {
  if (rows.length === 0) return;

  const values = rows.map((row) => ({
    indicator_id: row.indicator_id,
    date: new Date(row.date),
    value: row.value,
    source_version: row.source_version || null,
  }));

  if (upsert) {
    // Use INSERT ... ON CONFLICT UPDATE for upsert
    const query = `
      INSERT INTO time_series_data (indicator_id, date, value, source_version)
      VALUES ${values.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(", ")}
      ON CONFLICT (indicator_id, date)
      DO UPDATE SET
        value = EXCLUDED.value,
        source_version = EXCLUDED.source_version,
        updated_at = CURRENT_TIMESTAMP
    `;

    const params = values.flatMap((v) => [
      v.indicator_id,
      v.date,
      v.value,
      v.source_version,
    ]);

    await repo.run(query, params);
  } else {
    // Simple insert (will fail on duplicates)
    const query = `
      INSERT INTO time_series_data (indicator_id, date, value, source_version)
      VALUES ${values.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(", ")}
    `;

    const params = values.flatMap((v) => [
      v.indicator_id,
      v.date,
      v.value,
      v.source_version,
    ]);

    await repo.run(query, params);
  }
}

async function ingestTimeSeriesData(options: IngestOptions) {
  console.log("🚀 Starting time series data ingestion...");
  console.log(`📁 File: ${options.file}`);
  console.log(`📊 Format: ${options.format || "auto-detect"}`);

  const repo = new DatabaseRepository();

  try {
    // Parse file
    let rows: TimeSeriesRow[];

    if (!fs.existsSync(options.file)) {
      throw new Error(`File not found: ${options.file}`);
    }

    const format = options.format || (options.file.endsWith(".json") ? "json" : "csv");

    console.log(`📖 Parsing ${format.toUpperCase()} file...`);

    if (format === "csv") {
      rows = await parseCSVFile(options.file);
    } else {
      rows = await parseJSONFile(options.file, options.indicatorId);
    }

    // Validate rows
    const invalidRows = rows.filter(
      (row) => !row.indicator_id || !row.date || isNaN(row.value)
    );

    if (invalidRows.length > 0) {
      console.warn(`⚠️  Found ${invalidRows.length} invalid rows (missing required fields)`);
      console.warn("Sample invalid row:", invalidRows[0]);
    }

    const validRows = rows.filter(
      (row) => row.indicator_id && row.date && !isNaN(row.value)
    );

    if (validRows.length === 0) {
      throw new Error("No valid rows found in file");
    }

    console.log(`✅ Parsed ${validRows.length} valid rows`);

    // Override indicator_id if provided
    if (options.indicatorId) {
      validRows.forEach((row) => {
        row.indicator_id = options.indicatorId!;
      });
      console.log(`🔄 Overriding all indicator_ids to: ${options.indicatorId}`);
    }

    // Override source_version if provided
    if (options.sourceVersion) {
      validRows.forEach((row) => {
        row.source_version = options.sourceVersion!;
      });
      console.log(`🏷️  Setting source_version to: ${options.sourceVersion}`);
    }

    // Get unique indicator IDs
    const uniqueIndicators = [...new Set(validRows.map((r) => r.indicator_id))];
    console.log(`📊 Found ${uniqueIndicators.length} unique indicator(s)`);

    // Check which indicators exist in source_indicators
    const existingIndicators = await repo.query(
      `SELECT id FROM source_indicators WHERE id = ANY($1)`,
      [uniqueIndicators]
    );
    const existingIds = new Set(existingIndicators.map((r: any) => r.id));

    const missingIndicators = uniqueIndicators.filter((id) => !existingIds.has(id));

    if (missingIndicators.length > 0) {
      console.warn(`⚠️  Warning: ${missingIndicators.length} indicator(s) not found in source_indicators:`);
      console.warn(missingIndicators.slice(0, 5).join(", "));
      console.warn("These rows will still be inserted, but may fail on foreign key constraint.");
    }

    // Ingest in batches
    const batchSize = options.batchSize || 1000;
    const totalBatches = Math.ceil(validRows.length / batchSize);

    console.log(`\n💾 Ingesting ${validRows.length} rows in ${totalBatches} batch(es)...`);

    let ingested = 0;
    let failed = 0;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      try {
        await ingestBatch(repo, batch, options.upsert || false);
        ingested += batch.length;
        console.log(`  ✅ Batch ${batchNum}/${totalBatches}: ${batch.length} rows`);
      } catch (error: any) {
        failed += batch.length;
        console.error(`  ❌ Batch ${batchNum}/${totalBatches} failed:`, error.message);
      }
    }

    console.log(`\n✅ Ingestion complete!`);
    console.log(`   Ingested: ${ingested}`);
    console.log(`   Failed: ${failed}`);

    // Show stats per indicator
    console.log(`\n📊 Time series data stats:`);
    for (const indicatorId of uniqueIndicators) {
      const stats = await repo.queryOne(
        `SELECT
          COUNT(*) as total_points,
          MIN(date) as earliest_date,
          MAX(date) as latest_date,
          MIN(value) as min_value,
          MAX(value) as max_value,
          AVG(value) as avg_value
         FROM time_series_data
         WHERE indicator_id = $1`,
        [indicatorId]
      );

      console.log(`\n   ${indicatorId}:`);
      console.log(`     Total points: ${stats.total_points}`);
      console.log(`     Date range: ${stats.earliest_date} to ${stats.latest_date}`);
      console.log(`     Value range: ${stats.min_value} to ${stats.max_value}`);
      console.log(`     Average: ${stats.avg_value}`);
    }
  } catch (error: any) {
    console.error("❌ Ingestion failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: IngestOptions = {
  file: "",
  format: undefined,
  indicatorId: undefined,
  sourceVersion: undefined,
  batchSize: 1000,
  upsert: false,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === "--file" && args[i + 1]) {
    options.file = args[i + 1];
    i++;
  } else if (arg === "--format" && args[i + 1]) {
    options.format = args[i + 1] as "csv" | "json";
    i++;
  } else if (arg === "--indicator-id" && args[i + 1]) {
    options.indicatorId = args[i + 1];
    i++;
  } else if (arg === "--source-version" && args[i + 1]) {
    options.sourceVersion = args[i + 1];
    i++;
  } else if (arg === "--batch-size" && args[i + 1]) {
    options.batchSize = parseInt(args[i + 1]);
    i++;
  } else if (arg === "--upsert") {
    options.upsert = true;
  }
}

if (!options.file) {
  console.error("❌ Error: --file parameter is required");
  console.log("\nUsage:");
  console.log("  bun run src/scripts/ingest-time-series.ts --file data.csv");
  console.log("  bun run src/scripts/ingest-time-series.ts --file data.json --format json");
  console.log("  bun run src/scripts/ingest-time-series.ts --file data.csv --indicator-id GDP_USA --upsert");
  process.exit(1);
}

// Run ingestion
await ingestTimeSeriesData(options);
