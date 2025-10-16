/**
 * Seed PostgreSQL database from remote source
 *
 * Fetches indicators from remote PostgreSQL database and populates
 * the local TimescaleDB database for testing and development.
 *
 * Usage:
 *   bun run src/scripts/seed-database.ts           # Seed all target indicators
 *   bun run src/scripts/seed-database.ts --200     # Limit to 200 indicators
 */

import { SQL, sql } from "bun";
import { getDb } from "../db/client.ts";

// Type definitions for database records
interface IndicatorRow {
  indicator_id: string;
  name: string;
  units: string | null;
  long_name: string | null;
  source_name: string | null;
  periodicity: string | null;
  aggregation_method: string | null;
  scale: string | null;
  topic: string | null;
  category_group: string | null;
  dataset: string | null;
  currency_code: string | null;
  description: string | null;
}

interface TimeSeriesPoint {
  date: string;
  value: number;
}

// Target indicator names (100+ indicators for comprehensive testing)
const TARGET_INDICATORS = [
  "Imports of goods, World (CIF)",
  "Inflation Rate",
  "Real Effective Exchange Rate (REER)",
  "Sales Tax Rate",
  "Population",
  "Unemployment Rate",
  "Consumer Price Index CPI",
  "Exports",
  "GDP Annual Growth Rate",
  "Imports",
  "Balance of Trade",
  "Food Inflation",
  "Temperature",
  "GDP",
  "Inflation Rate MoM",
  "Interest Rate",
  "Corporate Tax Rate",
  "GDP per Capita",
  "GDP per Capita PPP",
  "Corruption Index",
  "Corruption Rank",
  "Current Account",
  "Current Account to GDP",
  "Government Budget",
  "Government Debt to GDP",
  "Personal Income Tax Rate",
  "CPI Transportation",
  "GDP Constant Prices",
  "Terrorism Index",
  "CPI Housing Utilities",
  "Money Supply M2",
  "Military Expenditure",
  "Money Supply M1",
  "Precipitation",
  "GDP from Agriculture",
  "GDP from Construction",
  "Government Spending",
  "Inflation - Average Consumer Prices, % Change",
  "Inflation - End of Period Consumer Prices, % Change",
  "Consumer Spending",
  "Social Security Rate For Companies",
  "GDP from Manufacturing",
  "Gross Fixed Capital Formation",
  "Social Security Rate For Employees",
  "Social Security Rate",
  "Foreign Direct Investment",
  "Deposit Interest Rate",
  "Money Supply M0",
  "Gold Reserves",
  "Industrial Production",
  "Capital Flows",
  "External Debt",
  "Government Budget Value",
  "Government Revenues",
  "Producer Prices",
  "Full Year GDP Growth",
  "GDP from Services",
  "Official reserves assets",
  "Fiscal Expenditure",
  "GDP from Public Administration",
  "Changes in Inventories",
  "Minimum Wages",
  "Money Supply M3",
  "GDP from Transport",
  "Unemployed Persons",
  "Employed Persons",
  "Producer Prices Change",
  "Tourist Arrivals",
  "GDP from Mining",
  "Core Inflation Rate",
  "Crude Oil Production",
  "GDP Growth Rate",
  "GDP from Utilities",
  "Withholding Tax Rate",
  "Central Bank Balance Sheet",
  "Mining Production",
  "Gasoline Prices",
  "Foreign Exchange Reserves",
  "General Government Net Lending/Borrowing, % of GDP",
  "General Government Revenue, % of GDP",
  "General Government Total Expenditure, % of GDP",
  "Labor Force Participation Rate",
  "General Government Gross Debt, % of GDP",
  "Core Consumer Prices",
  "General Government Primary Net Lending/Borrowing, % of GDP",
  "Interest Payments, % of GDP",
  "Loans to Private Sector",
  "Wages",
  "Banks Balance Sheet",
  "Remittances",
  "Employment Rate",
  "Industrial Production Mom",
  "GDP at Constant Prices, % Change",
  "GDP at Current Prices, USD Billions",
  "Export Prices",
  "Import Prices",
  "Business Confidence",
  "Current Account Balance, USD Billions",
  "Consumer Confidence",
  "Interbank Rate",
  "Retail Sales YoY",
  "Manufacturing Production",
  "Car Registrations",
  "Consumer Credit",
  "GDP Deflator",
  "Gross Foreign Reserves",
  "Terms of Trade",
  "Bank Lending Rate",
  "Capacity Utilization",
];

/**
 * Get database connection URLs
 */
function getDatabaseUrls() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const localUrl =
    process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER || "classify"}:${process.env.POSTGRES_PASSWORD || "classify"}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || "5432"}/${process.env.POSTGRES_DB || "classify"}`;

  if (!sourceUrl) {
    throw new Error(
      "SOURCE_DATABASE_URL environment variable is required (points to production indicators database)",
    );
  }

  return { sourceUrl, localUrl };
}

/**
 * Main seed function
 */
async function seedDatabase() {
  const { sourceUrl, localUrl } = getDatabaseUrls();

  // Parse limit from command line (e.g., --200 or -200)
  const args = process.argv.slice(2);
  let limit: number | null = null;
  for (const arg of args) {
    if (arg.startsWith("--") || arg.startsWith("-")) {
      const num = parseInt(arg.replace(/^-+/, ""), 10);
      if (!isNaN(num) && num > 0) {
        limit = num;
        break;
      }
    }
  }

  console.log(`📦 Seeding database from remote PostgreSQL...`);
  console.log(`   Source: ${sourceUrl.split("@")[1]}`);
  console.log(`   Destination: ${localUrl.split("@")[1]}`);
  if (limit) {
    console.log(`   Limit: ${limit} indicators\n`);
  } else {
    console.log(`   Limit: All indicators\n`);
  }

  // Connect to source PostgreSQL (separate connection for remote source)
  const sourceDb = new SQL(sourceUrl);
  console.log("✅ Connected to source PostgreSQL");

  // Use singleton for local PostgreSQL
  const localDb = getDb({ url: localUrl });
  console.log("✅ Connected to local PostgreSQL");

  // Fetch indicators from source
  console.log(
    `\n🔍 Fetching indicators for ${TARGET_INDICATORS.length} indicator names...`,
  );

  // Build IN clause with template literal (works reliably with Bun SQL)
  // Using IN with individual parameters instead of array
  const placeholders = TARGET_INDICATORS.map(() => '?').join(',');
  const query = `
    SELECT
      i.id as indicator_id,
      i.name,
      i.units,
      i.long_name,
      i.source_name,
      i.periodicity,
      i.aggregation_method,
      i.scale,
      i.topic,
      i.category_group,
      i.dataset,
      i.currency_code,
      i.definition as description
    FROM indicators i
    WHERE i.name IN (${TARGET_INDICATORS.map((_, idx) => `$${idx + 1}`).join(',')})
      AND i.deleted_at IS NULL
    ORDER BY i.name, i.id
  `;

  const result = await sourceDb.unsafe(query, TARGET_INDICATORS);

  let indicators = result as unknown as IndicatorRow[];

  console.log(`✅ Found ${indicators.length} indicators across all countries`);

  // Apply limit if specified (for testing with smaller dataset)
  if (limit && indicators.length > limit) {
    console.log(`   📊 Limiting to first ${limit} indicators for testing`);
    indicators = indicators.slice(0, limit);
  }
  console.log("");

  // Fetch 25 most recent time series values for each indicator
  // Using optimized query with window function to fetch all at once
  console.log(
    "📊 Fetching sample time series (25 most recent values per indicator)...",
  );

  // Build query with all indicator IDs at once
  const indicatorIds = indicators.map((ind) => ind.indicator_id);
  const tsPlaceholders = indicatorIds.map((_, idx) => `$${idx + 1}`).join(',');

  const timeSeriesQuery = `
    WITH ranked_data AS (
      SELECT
        indicator_id,
        date,
        value,
        ROW_NUMBER() OVER (PARTITION BY indicator_id ORDER BY date DESC) as rn
      FROM country_indicators
      WHERE indicator_id IN (${tsPlaceholders})
        AND deleted_at IS NULL
        AND value IS NOT NULL
    )
    SELECT
      indicator_id,
      json_agg(json_build_object('date', date, 'value', value) ORDER BY date DESC) as samples
    FROM ranked_data
    WHERE rn <= 25
    GROUP BY indicator_id
  `;

  console.log(`   Fetching time series for ${indicators.length} indicators in one query...`);
  const timeSeriesResults = await sourceDb.unsafe(timeSeriesQuery, indicatorIds) as Array<{
    indicator_id: string;
    samples: string;
  }>;

  // Create a map for quick lookup
  // PostgreSQL json_agg returns JSON, convert to string properly
  const timeSeriesMap = new Map<string, string>();
  for (const ts of timeSeriesResults) {
    // ts.samples might be a JSON object or string, ensure it's a valid JSON string
    const samplesStr = typeof ts.samples === 'string'
      ? ts.samples
      : JSON.stringify(ts.samples);
    timeSeriesMap.set(ts.indicator_id, samplesStr);
  }

  // Combine indicators with their time series
  const indicatorsWithSamples = indicators.map((indicator) => ({
    ...indicator,
    sample_values: timeSeriesMap.get(indicator.indicator_id) || "[]",
  }));

  console.log(
    `✅ Fetched time series samples for ${indicators.length} indicators\n`,
  );

  // Insert into local database
  console.log("💾 Populating local PostgreSQL database...");

  // Batch insert for better performance (batch size: 100)
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < indicatorsWithSamples.length; i += BATCH_SIZE) {
    const batch = indicatorsWithSamples.slice(i, i + BATCH_SIZE);

    // Build VALUES clause with all parameters
    const values: any[] = [];
    const valueRows: string[] = [];

    batch.forEach((ind, idx) => {
      const offset = idx * 14;
      valueRows.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      );

      values.push(
        ind.indicator_id,
        ind.name,
        ind.units,
        ind.long_name,
        ind.source_name,
        ind.periodicity,
        ind.aggregation_method,
        ind.scale,
        ind.topic,
        ind.category_group,
        ind.dataset,
        ind.currency_code,
        ind.description,
        ind.sample_values
      );
    });

    await localDb.unsafe(`
      INSERT INTO source_indicators (
        id, name, units, long_name, source_name, periodicity,
        aggregation_method, scale, topic, category_group, dataset,
        currency_code, definition, sample_values, created_at, updated_at
      ) VALUES ${valueRows.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        units = EXCLUDED.units,
        long_name = EXCLUDED.long_name,
        source_name = EXCLUDED.source_name,
        periodicity = EXCLUDED.periodicity,
        aggregation_method = EXCLUDED.aggregation_method,
        scale = EXCLUDED.scale,
        topic = EXCLUDED.topic,
        category_group = EXCLUDED.category_group,
        dataset = EXCLUDED.dataset,
        currency_code = EXCLUDED.currency_code,
        definition = EXCLUDED.definition,
        sample_values = EXCLUDED.sample_values,
        updated_at = CURRENT_TIMESTAMP
    `, values);

    inserted += batch.length;
    if (inserted % 1000 === 0 || inserted === indicatorsWithSamples.length) {
      console.log(`   Inserted ${inserted}/${indicatorsWithSamples.length}...`);
    }
  }

  console.log(
    `\n✅ Seeded ${indicators.length} indicators with sample time series to local database\n`,
  );

  console.log("🎉 Database seeding complete!");
}

// Run if called directly
if (import.meta.main) {
  seedDatabase().catch((error) => {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  });
}
