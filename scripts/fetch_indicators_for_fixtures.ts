#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * Script to fetch real indicators from staging database for test fixtures
 * 
 * Usage:
 *   deno run --allow-env --allow-net scripts/fetch_indicators_for_fixtures.ts
 * 
 * Requires DATABASE_URL environment variable to be set
 */

interface Indicator {
  id: string;
  name: string;
  units: string;
  periodicity: string;
  source: string;
  description: string;
  country_count: number;
}

interface CountryValue {
  country_code: string;
  country_name: string;
  date: string;
  value: number;
}

async function queryDatabase(sql: string): Promise<any[]> {
  const databaseUrl = Deno.env.get('DATABASE_URL');
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  // Parse the database URL
  const url = new URL(databaseUrl);
  const host = url.hostname;
  const port = url.port || '5432';
  const database = url.pathname.slice(1);
  const username = url.username;
  const password = url.password;

  // Use pg_client or similar - for now, output instructions
  console.error('Note: This script requires a PostgreSQL client library.');
  console.error('Please run the SQL queries manually or use psql:');
  console.error(`\npsql "${databaseUrl}" -c "${sql.replace(/"/g, '\\"')}"\n`);
  
  return [];
}

async function fetchIndicators(): Promise<Indicator[]> {
  const sql = `
    SELECT 
        i.id,
        i.name,
        i.units,
        i.periodicity,
        i.source,
        i.description,
        COUNT(DISTINCT ci.country_id) as country_count
    FROM indicators i
    LEFT JOIN countries_indicators ci ON i.id = ci.indicator_id
    WHERE i.source != 'IMFWEO'
        AND i.source IS NOT NULL
        AND i.units IS NOT NULL
        AND i.periodicity IS NOT NULL
        AND i.description IS NOT NULL
    GROUP BY i.id, i.name, i.units, i.periodicity, i.source, i.description
    HAVING COUNT(DISTINCT ci.country_id) >= 3
    ORDER BY country_count DESC, i.source, i.name
    LIMIT 20;
  `;

  console.log('=== Query 1: Fetch Indicators ===');
  console.log(sql);
  console.log('\n');

  return [];
}

async function fetchCountryValues(indicatorId: string, limit: number = 3): Promise<CountryValue[]> {
  const sql = `
    SELECT 
        c.code as country_code,
        c.name as country_name,
        ci.date,
        ci.value
    FROM countries_indicators ci
    JOIN countries c ON ci.country_id = c.id
    WHERE ci.indicator_id = '${indicatorId}'
        AND ci.value IS NOT NULL
        AND ci.date IS NOT NULL
    ORDER BY c.code, ci.date DESC
    LIMIT ${limit * 10};
  `;

  console.log(`=== Query 2: Fetch Values for ${indicatorId} ===`);
  console.log(sql);
  console.log('\n');

  return [];
}

async function main() {
  console.log('Fetching indicators from staging database...\n');
  
  const indicators = await fetchIndicators();
  
  console.log('\n=== Instructions ===');
  console.log('1. Run the SQL queries above against your staging database');
  console.log('2. For each indicator, run Query 2 with the indicator ID');
  console.log('3. Format the results into fixture JSON files');
  console.log('\nExample fixture structure:');
  console.log(JSON.stringify({
    "category": "Category Name",
    "description": "Description of the category",
    "indicators": [
      {
        "indicator": {
          "id": "indicator_id",
          "name": "Indicator Name",
          "units": "units",
          "periodicity": "monthly",
          "source": "Source Name",
          "description": "Indicator description",
          "sample_values": [
            { "date": "2024-01", "value": 100 },
            { "date": "2024-02", "value": 102 }
          ]
        },
        "expected_classification": {
          "indicator_category": "physical-fundamental",
          "indicator_type": "flow",
          "temporal_aggregation": "period-rate",
          "is_monetary": true,
          "heat_map_orientation": "higher-is-positive"
        },
        "notes": "Optional notes about this indicator"
      }
    ]
  }, null, 2));
}

if (import.meta.main) {
  main();
}

