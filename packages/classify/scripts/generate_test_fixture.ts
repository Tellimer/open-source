#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Generate test fixture with 100 diverse indicators
 * Ensures broad coverage across indicator families and types
 */

import { Database } from "@db/sqlite";

const db = new Database("./data/classify_v2.db");

// Define expected families and their target counts
const FAMILY_TARGETS: Record<string, number> = {
  "physical-fundamental": 20, // Stock, flow, balance, capacity, volume
  "numeric-measurement": 20, // Count, percentage, ratio, spread, share
  "price-value": 15, // Price, yield
  "change-movement": 15, // Rate, volatility, gap
  "composite-derived": 15, // Index, correlation, elasticity
  temporal: 10, // Duration, probability, threshold
  qualitative: 5, // Sentiment, allocation
};

interface TestIndicator {
  id: string;
  name: string;
  units: string | null;
  periodicity: string | null;
  category_group: string | null;
  topic: string | null;
  aggregation_method: string | null;
  scale: string | null;
  currency_code: string | null;
  dataset: string | null;
}

function estimateFamily(name: string, units: string | null): string {
  const nameUpper = name.toUpperCase();
  const unitsStr = units?.toUpperCase() || "";

  // Physical-fundamental
  if (
    /GDP|OUTPUT|PRODUCTION|EXPORTS|IMPORTS|RESERVES|STOCK|INVENTORY|BALANCE|DEBT OUTSTANDING|CAPACITY|VOLUME/
      .test(
        nameUpper,
      )
  ) {
    return "physical-fundamental";
  }

  // Numeric-measurement (especially percentages and ratios)
  if (
    unitsStr.includes("%") ||
    /RATE(?! OF CHANGE)|UNEMPLOYMENT|INFLATION|RATIO|SHARE/.test(nameUpper)
  ) {
    return "numeric-measurement";
  }

  // Price-value
  if (/PRICE|COST|VALUE|YIELD|FX RATE|EXCHANGE RATE/.test(nameUpper)) {
    return "price-value";
  }

  // Change-movement
  if (/GROWTH|YOY|(?:^|\s)CHANGE|VOLATILITY|SPREAD/.test(nameUpper)) {
    return "change-movement";
  }

  // Composite-derived
  if (/INDEX|PMI|CPI|PPI|CONFIDENCE|SENTIMENT|INDICATOR/.test(nameUpper)) {
    return "composite-derived";
  }

  // Temporal
  if (/DURATION|MATURITY|TERM|PROBABILITY/.test(nameUpper)) {
    return "temporal";
  }

  // Qualitative
  if (/SENTIMENT|OUTLOOK|EXPECTATIONS|ALLOCATION/.test(nameUpper)) {
    return "qualitative";
  }

  return "other";
}

function selectDiverseIndicators(): TestIndicator[] {
  const allIndicators = db.prepare(`
    SELECT
      id,
      name,
      units,
      periodicity,
      category_group,
      topic,
      aggregation_method,
      scale,
      currency_code,
      dataset
    FROM source_indicators
    WHERE deleted_at IS NULL
    ORDER BY RANDOM()
  `)
    .all() as Array<{
      id: string;
      name: string;
      source_name: string;
      long_name: string;
      category_group: string | null;
      dataset: string | null;
      aggregation_method: string | null;
      definition: string | null;
      units: string | null;
      scale: string | null;
      periodicity: string | null;
      topic: string | null;
      currency_code: string | null;
    }>;

  const selected: TestIndicator[] = [];
  const familyCounts: Record<string, number> = {};

  // Initialize counts
  for (const family of Object.keys(FAMILY_TARGETS)) {
    familyCounts[family] = 0;
  }

  // Select indicators to meet family targets
  for (const indicator of allIndicators) {
    const family = estimateFamily(indicator.name, indicator.units);

    if (family !== "other" && familyCounts[family] < FAMILY_TARGETS[family]) {
      selected.push(indicator);
      familyCounts[family]++;

      if (selected.length >= 100) break;
    }
  }

  // Fill remaining slots with 'other' if needed
  if (selected.length < 100) {
    for (const indicator of allIndicators) {
      if (!selected.find((s) => s.id === indicator.id)) {
        selected.push(indicator);
        familyCounts["other"] = (familyCounts["other"] || 0) + 1;
        if (selected.length >= 100) break;
      }
    }
  }

  return selected;
}

// Main execution
const testIndicators = selectDiverseIndicators();

console.log("\n📊 Test Fixture Selection Summary");
console.log("━".repeat(60));

// Generate TypeScript fixture file
const fixtureContent = `/**
 * Test Fixture: 100 Diverse Economic Indicators
 *
 * Selected to cover broad range of indicator families and types
 *
 * Generated: ${new Date().toISOString()}
 */

export interface TestIndicatorFixture {
  id: string;
  name: string;
  units: string | null;
  periodicity: string | null;
  category_group: string | null;
  topic: string | null;
  aggregation_method: string | null;
  scale: string | null;
  currency_code: string | null;
  dataset: string | null;
}

export const TEST_INDICATORS: TestIndicatorFixture[] = ${
  JSON.stringify(
    testIndicators,
    null,
    2,
  )
};

export const TEST_INDICATOR_IDS = TEST_INDICATORS.map(ind => ind.id);
`;

Deno.writeTextFileSync(
  "./tests/fixtures/v2-test-indicators.ts",
  fixtureContent,
);

console.log(
  "\n✅ Test fixture generated: tests/fixtures/v2-test-indicators.ts",
);
console.log(`   Total indicators: ${testIndicators.length}`);
console.log("");

// Also get time series for these indicators
const indicatorIds = testIndicators.map((ind) => ind.id);
const placeholders = indicatorIds.map(() => "?").join(",");

const timeSeriesData = db
  .prepare(
    `
  SELECT
    indicator_id,
    COUNT(*) as value_count,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
  FROM source_country_indicators
  WHERE indicator_id IN (${placeholders})
  GROUP BY indicator_id
`,
  )
  .all(...indicatorIds);

console.log("📈 Time Series Coverage:");
console.log(
  `   ${timeSeriesData.length}/${testIndicators.length} indicators have time series data`,
);

interface TimeSeriesRow {
  indicator_id: string;
  value_count: number;
  earliest_date: string;
  latest_date: string;
}

const avgValues = (timeSeriesData as TimeSeriesRow[]).reduce(
  (sum: number, ts) => sum + ts.value_count,
  0,
) / timeSeriesData.length;
console.log(`   Average ${Math.round(avgValues)} values per indicator\n`);

db.close();
