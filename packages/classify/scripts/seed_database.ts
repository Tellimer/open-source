#!/usr/bin/env -S deno run --allow-all
/**
 * Simplified Database Seeding Script
 *
 * This script seeds the local SQLite database with indicators and country_indicators data
 * from JSON files in the data folder.
 *
 * Usage:
 *   deno task db:seed
 *
 * @module
 */

import {
  createLocalDatabase,
  type V2DatabaseClient,
} from '../src/v2/db/client.ts';
import { INDICATORS_DATA } from '../data/indicators.ts';
import {
  COUNTRY_INDICATORS,
  type CountryIndicatorData,
} from '../data/country_indicators.ts';

interface IndicatorData {
  id: string;
  name: string;
  source_name: string | null;
  source_url: string | null;
  long_name: string | null;
  category_group: string | null;
  dataset: string | null;
  aggregation_method: string | null;
  definition: string | null;
  units: string | null;
  scale: string | null;
  periodicity: string | null;
  topic: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  currency_code: string | null;
}

// Source tables schema (mirrors PostgreSQL structure)
const SOURCE_TABLES_SCHEMA = `
-- Source indicators table (mirrors PostgreSQL)
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  currency_code TEXT
);

-- Source country indicators table (mirrors PostgreSQL)
CREATE TABLE IF NOT EXISTS source_country_indicators (
  id TEXT PRIMARY KEY,
  country_iso TEXT NOT NULL,
  indicator_id TEXT NOT NULL,
  date TEXT NOT NULL,
  is_forecasted INTEGER NOT NULL,
  value REAL,
  source_updated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (indicator_id) REFERENCES source_indicators(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_source_indicators_name ON source_indicators(name);
CREATE INDEX IF NOT EXISTS idx_source_country_indicators_indicator ON source_country_indicators(indicator_id);
CREATE INDEX IF NOT EXISTS idx_source_country_indicators_country ON source_country_indicators(country_iso);
CREATE INDEX IF NOT EXISTS idx_source_country_indicators_date ON source_country_indicators(date);
`;

/**
 * Insert indicators into SQLite
 */
function insertIndicators(
  db: V2DatabaseClient,
  indicators: IndicatorData[]
): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO source_indicators (
      id, name, source_name, source_url, long_name, category_group,
      dataset, aggregation_method, definition, units, scale, periodicity,
      topic, created_at, updated_at, deleted_at, currency_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const ind of indicators) {
    stmt.run(
      ind.id,
      ind.name,
      ind.source_name,
      ind.source_url,
      ind.long_name,
      ind.category_group,
      ind.dataset,
      ind.aggregation_method,
      ind.definition,
      ind.units,
      ind.scale,
      ind.periodicity,
      ind.topic,
      ind.created_at,
      ind.updated_at,
      ind.deleted_at,
      ind.currency_code
    );
  }
}

/**
 * Insert time series values into SQLite
 */
function insertCountryIndicators(
  db: V2DatabaseClient,
  values: CountryIndicatorData[],
  validIndicatorIds: Set<string>
): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO source_country_indicators (
      id, country_iso, indicator_id, date, is_forecasted, value,
      source_updated_at, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let skipped = 0;
  for (const val of values) {
    // Skip if indicator_id doesn't exist in source_indicators
    if (!validIndicatorIds.has(val.indicator_id)) {
      skipped++;
      continue;
    }

    stmt.run(
      val.id,
      val.country_iso,
      val.indicator_id,
      val.date,
      val.is_forecasted ? 1 : 0,
      val.value,
      val.source_updated_at,
      val.created_at,
      val.updated_at,
      val.deleted_at
    );
  }

  if (skipped > 0) {
    console.log(`   ⚠️  Skipped ${skipped} country indicators with invalid indicator_id references`);
  }
}

/**
 * Get database statistics
 */
function getStats(db: V2DatabaseClient): {
  indicators: number;
  countryIndicators: number;
  avgValuesPerIndicator: number;
} {
  const indicators = db
    .prepare('SELECT COUNT(*) as count FROM source_indicators')
    .value();

  const values = db
    .prepare('SELECT COUNT(*) as count FROM source_country_indicators')
    .value();

  const indicatorCount = (indicators as number[] | undefined)?.[0] || 0;
  const valuesCount = (values as number[] | undefined)?.[0] || 0;

  return {
    indicators: indicatorCount,
    countryIndicators: valuesCount,
    avgValuesPerIndicator:
      indicatorCount > 0
        ? Math.round((valuesCount / indicatorCount) * 10) / 10
        : 0,
  };
}

/**
 * Main seeding function
 */
async function seedDatabase(
  dbPath: string = './data/classify_v2.db'
): Promise<void> {
  console.log('\n🌱 Seeding SQLite Database');
  console.log('━'.repeat(50));
  console.log(`📍 Database: ${dbPath}`);
  console.log(`📊 Indicators: ${INDICATORS_DATA.length}`);
  console.log(`📊 Country Indicators: ${COUNTRY_INDICATORS.length}\n`);

  try {
    // 1. Initialize SQLite database
    console.log('⚙️  Initializing SQLite database...');
    const db = createLocalDatabase(dbPath);
    await db.initialize();

    // 2. Create source tables
    console.log('📦 Creating source tables...');
    db.exec(SOURCE_TABLES_SCHEMA);
    console.log('✅ Source tables ready\n');

    // 3. Insert indicators
    console.log('💾 Inserting indicators...');
    const validIndicatorIds = new Set<string>();
    db.transaction(() => {
      insertIndicators(db, INDICATORS_DATA);
      // Build set of valid indicator IDs
      for (const ind of INDICATORS_DATA) {
        validIndicatorIds.add(ind.id);
      }
    });
    console.log(`✅ Inserted ${INDICATORS_DATA.length} indicators\n`);

    // 4. Insert country indicators
    console.log('💾 Inserting country indicators...');
    db.transaction(() => {
      insertCountryIndicators(db, COUNTRY_INDICATORS, validIndicatorIds);
    });
    console.log('✅ Inserted country indicators\n');

    // 5. Show final statistics
    const stats = getStats(db);
    console.log('📊 Final Statistics:');
    console.log('━'.repeat(50));
    console.log(`   Total Indicators:              ${stats.indicators}`);
    console.log(`   Total Country Indicators:      ${stats.countryIndicators}`);
    console.log(
      `   Avg Values per Indicator:      ${stats.avgValuesPerIndicator}`
    );
    console.log('━'.repeat(50));

    // 6. Close database
    db.close();
    console.log('\n✅ Database seeding complete!\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:');
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}\n`
    );
    Deno.exit(1);
  }
}

// CLI interface
if (import.meta.main) {
  const dbPath = Deno.args[0] || './data/classify_v2.db';
  await seedDatabase(dbPath);
}
