/**
 * Seed local SQLite database from PostgreSQL
 *
 * Fetches indicators from remote PostgreSQL database and populates
 * the local SQLite database for testing and development.
 */

import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { Database } from "@db/sqlite";
import { CLASSIFY_WORKFLOW_SCHEMA } from "../db/schema.ts";

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

// Target indicator names (100+ indicators from user specification)
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
 * Initialize SQLite database schema with WAL mode
 */
function initializeSchema(db: Database) {
  console.log("📋 Initializing database schema with WAL mode...");

  // Split schema by semicolons and execute each statement
  const statements = CLASSIFY_WORKFLOW_SCHEMA.split(";").filter(
    (stmt) => stmt.trim().length > 0,
  );

  for (const statement of statements) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      try {
        db.exec(trimmed);
      } catch (error) {
        console.error(
          `❌ Error executing statement: ${trimmed.substring(0, 100)}...`,
        );
        throw error;
      }
    }
  }

  console.log("✅ SQLite schema initialized with WAL mode");
}

/**
 * Main seed function
 */
async function seedDatabase() {
  const dbPath = Deno.env.get("CLASSIFY_DB_LOCAL_DEV") ||
    "./data/classify-workflow-local-dev.db";
  const databaseUrl = Deno.env.get("DATABASE_URL");

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Parse limit from command line (e.g., --200 or -200)
  const args = Deno.args;
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

  console.log(`📦 Seeding database from PostgreSQL...`);
  console.log(`   Source: ${databaseUrl.split("@")[1]}`);
  console.log(`   Destination: ${dbPath}`);
  if (limit) {
    console.log(`   Limit: ${limit} indicators per indicator name\n`);
  } else {
    console.log(`   Limit: All indicators\n`);
  }

  // Connect to PostgreSQL
  const pgClient = new Client(databaseUrl);
  await pgClient.connect();
  console.log("✅ Connected to PostgreSQL");

  // Initialize SQLite
  const db = new Database(dbPath);
  initializeSchema(db);

  // Fetch indicators
  console.log(
    `\n🔍 Fetching all indicators for ${TARGET_INDICATORS.length} indicator names...`,
  );

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
    WHERE i.name = ANY($1)
      AND i.deleted_at IS NULL
    ORDER BY i.name, i.id
  `;

  const result = await pgClient.queryObject<IndicatorRow>(query, [
    TARGET_INDICATORS,
  ]);
  let indicators = result.rows;

  console.log(`✅ Found ${indicators.length} indicators across all countries`);

  // Apply limit if specified (for testing with smaller dataset)
  if (limit && indicators.length > limit) {
    console.log(`   📊 Limiting to first ${limit} indicators for testing`);
    indicators = indicators.slice(0, limit);
  }
  console.log("");

  // Fetch 25 most recent time series values for each indicator
  console.log(
    "📊 Fetching sample time series (25 most recent values per indicator)...",
  );

  let processed = 0;
  for (const indicator of indicators) {
    const timeSeriesQuery = `
      SELECT date, value
      FROM country_indicators
      WHERE indicator_id = $1
        AND deleted_at IS NULL
        AND value IS NOT NULL
      ORDER BY date DESC
      LIMIT 25
    `;

    const tsResult = await pgClient.queryObject<TimeSeriesPoint>(
      timeSeriesQuery,
      [indicator.indicator_id],
    );

    // Store as JSON string
    (indicator as any).sample_values = JSON.stringify(tsResult.rows);

    processed++;
    if (processed % 500 === 0) {
      console.log(`   Processed ${processed}/${indicators.length}...`);
    }
  }

  console.log(
    `✅ Fetched time series samples for ${indicators.length} indicators\n`,
  );

  // Insert into SQLite
  console.log("💾 Populating SQLite database...");

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO source_indicators (
      id,
      name,
      units,
      long_name,
      source_name,
      periodicity,
      aggregation_method,
      scale,
      topic,
      category_group,
      dataset,
      currency_code,
      definition,
      sample_values,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  for (const ind of indicators) {
    stmt.run(
      ind.indicator_id,
      ind.name,
      ind.units ?? null,
      ind.long_name ?? null,
      ind.source_name ?? null,
      ind.periodicity ?? null,
      ind.aggregation_method ?? null,
      ind.scale ?? null,
      ind.topic ?? null,
      ind.category_group ?? null,
      ind.dataset ?? null,
      ind.currency_code ?? null,
      ind.description ?? null,
      (ind as any).sample_values ?? null,
    );
  }
  db.close();

  console.log(
    `\n✅ Seeded ${indicators.length} indicators with sample time series to ${dbPath}\n`,
  );

  await pgClient.end();
  console.log("🎉 Database seeding complete!");
}

// Run if called directly
if (import.meta.main) {
  seedDatabase().catch((error) => {
    console.error("❌ Error seeding database:", error);
    Deno.exit(1);
  });
}
