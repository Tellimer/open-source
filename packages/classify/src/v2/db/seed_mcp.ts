/**
 * Seed Script - Sync PostgreSQL to SQLite using MCP
 * Uses the mcp__postgres__query tool available in the environment
 * @module
 */

import { createLocalDatabase } from './client.ts';

/**
 * Source tables schema (mirrors PostgreSQL structure)
 */
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
 * Seed database from PostgreSQL
 * This script must be run from Claude Code environment where mcp__postgres__query is available
 */
export async function seedDatabase(
  sqliteDbPath: string = './data/classify_v2.db',
  limit: number = 100,
  verbose: boolean = true
): Promise<{
  indicators: number;
  timeSeriesValues: number;
}> {
  if (verbose) {
    console.log('\n🌱 Seeding SQLite from PostgreSQL via MCP...');
    console.log(`📍 SQLite: ${sqliteDbPath}`);
    console.log(`📊 Limit: ${limit} indicators\n`);
  }

  // Initialize SQLite
  const db = createLocalDatabase(sqliteDbPath);
  await db.initialize();

  // Create source tables
  db.exec(SOURCE_TABLES_SCHEMA);

  if (verbose) {
    console.log('✅ Source tables created');
  }

  // NOTE: The actual PostgreSQL queries will be executed via Claude Code's MCP tool
  // This script outputs the SQL that should be run via mcp__postgres__query

  console.log('\n📋 Step 1: Run this query via MCP to get unique indicators:\n');
  console.log(`
WITH RankedIndicators AS (
  SELECT
    id,
    name,
    source_name,
    source_url,
    long_name,
    category_group,
    dataset,
    aggregation_method,
    definition,
    units,
    scale,
    periodicity,
    topic,
    created_at,
    updated_at,
    deleted_at,
    currency_code,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY id ASC) as rn
  FROM indicators
  WHERE deleted_at IS NULL
)
SELECT
  id,
  name,
  source_name,
  source_url,
  long_name,
  category_group,
  dataset,
  aggregation_method,
  definition,
  units,
  scale,
  periodicity,
  topic,
  created_at,
  updated_at,
  deleted_at,
  currency_code
FROM RankedIndicators
WHERE rn = 1
ORDER BY name ASC
LIMIT ${limit};
  `);

  console.log('\n📋 Step 2: For each indicator, run this query to get time series:\n');
  console.log(`
WITH RankedValues AS (
  SELECT
    id,
    country_iso,
    indicator_id,
    date,
    is_forecasted,
    value,
    source_updated_at,
    created_at,
    updated_at,
    deleted_at,
    ROW_NUMBER() OVER (PARTITION BY indicator_id ORDER BY date DESC) as rn
  FROM country_indicators
  WHERE indicator_id = $INDICATOR_ID
    AND deleted_at IS NULL
)
SELECT
  id,
  country_iso,
  indicator_id,
  date,
  is_forecasted,
  value,
  source_updated_at,
  created_at,
  updated_at,
  deleted_at
FROM RankedValues
WHERE rn <= 10
ORDER BY date DESC;
  `);

  console.log('\n💡 This script needs to be run from Claude Code environment.');
  console.log('   Use the mcp__postgres__query tool to execute these queries.\n');

  db.close();

  return { indicators: 0, timeSeriesValues: 0 };
}

/**
 * Insert indicators from PostgreSQL result
 */
export function insertIndicators(
  db: any,
  indicators: any[]
): void {
  db.transaction(() => {
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
  });

  console.log(`✅ Inserted ${indicators.length} indicators`);
}

/**
 * Insert country indicators from PostgreSQL result
 */
export function insertCountryIndicators(
  db: any,
  countryIndicators: any[]
): void {
  db.transaction(() => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO source_country_indicators (
        id, country_iso, indicator_id, date, is_forecasted, value,
        source_updated_at, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const ci of countryIndicators) {
      stmt.run(
        ci.id,
        ci.country_iso,
        ci.indicator_id,
        ci.date,
        ci.is_forecasted ? 1 : 0,
        ci.value,
        ci.source_updated_at,
        ci.created_at,
        ci.updated_at,
        ci.deleted_at
      );
    }
  });

  console.log(`✅ Inserted ${countryIndicators.length} time series values`);
}

/**
 * Get indicators for classification
 */
export function getIndicatorsForClassification(
  db: any,
  limit?: number
): Array<{
  id: string;
  name: string;
  units?: string;
  description?: string;
}> {
  let query = `
    SELECT
      id,
      name,
      units,
      definition as description
    FROM source_indicators
    WHERE deleted_at IS NULL
    ORDER BY name ASC
  `;

  if (limit) {
    query += ` LIMIT ${limit}`;
  }

  const rows = db.prepare(query).all();

  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    units: row.units || undefined,
    description: row.description || undefined,
  }));
}

/**
 * Get database statistics
 */
export function getSeededStats(db: any): {
  indicators: number;
  timeSeriesValues: number;
  avgValuesPerIndicator: number;
} {
  const indicators = db
    .prepare('SELECT COUNT(*) as count FROM source_indicators')
    .value<[number]>();

  const values = db
    .prepare('SELECT COUNT(*) as count FROM source_country_indicators')
    .value<[number]>();

  const indicatorCount = indicators?.[0] || 0;
  const valuesCount = values?.[0] || 0;

  return {
    indicators: indicatorCount,
    timeSeriesValues: valuesCount,
    avgValuesPerIndicator: indicatorCount > 0
      ? Math.round((valuesCount / indicatorCount) * 10) / 10
      : 0,
  };
}

// CLI interface
if (import.meta.main) {
  const limit = parseInt(Deno.args[0] || '100');
  const dbPath = Deno.args[1] || './data/classify_v2.db';

  await seedDatabase(dbPath, limit, true);
}
