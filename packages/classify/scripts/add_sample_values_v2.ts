#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env
/**
 * Add sample time series values to existing v2 test fixtures
 * Preserves all existing data including expectations
 */

import { Database } from "@db/sqlite";
import { TEST_INDICATORS } from "../tests/fixtures/v2-test-indicators.ts";

const db = new Database("./data/classify_v2.db");

console.log(
  `\n📊 Fetching sample values for ${TEST_INDICATORS.length} indicators...\n`,
);

interface SampleValue {
  date: string;
  value: number;
}

interface IndicatorWithSamples {
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
  sample_values: SampleValue[];
  expectation: {
    indicator_family: string;
    indicator_type: string;
    indicator_category: string;
    temporal_aggregation: string;
    is_monetary: boolean;
    heat_map_orientation: string;
  };
}

const indicatorsWithSamples: IndicatorWithSamples[] = [];

for (const indicator of TEST_INDICATORS) {
  const values = db.prepare(`
    SELECT date, value
    FROM source_country_indicators
    WHERE indicator_id = ?
    ORDER BY date DESC
    LIMIT 60
  `).all(indicator.id) as Array<{ date: string; value: number }>;

  if (values.length > 0) {
    // Reverse to get chronological order
    const sampleValues = values.reverse();
    console.log(
      `  ✓ ${indicator.id}: ${sampleValues.length} values (${
        sampleValues[0].date
      } to ${sampleValues[sampleValues.length - 1].date})`,
    );

    indicatorsWithSamples.push({
      ...indicator,
      sample_values: sampleValues,
    });
  } else {
    console.log(
      `  ⚠️  ${indicator.id}: No time series data found - using empty array`,
    );
    indicatorsWithSamples.push({
      ...indicator,
      sample_values: [],
    });
  }
}

db.close();

// Generate new fixture file with sample values
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
  sample_values: { date: string; value: number }[];
  expectation: {
    indicator_family: string;
    indicator_type: string;
    indicator_category: string;
    temporal_aggregation: string;
    is_monetary: boolean;
    heat_map_orientation: string;
  };
}

export const TEST_INDICATORS: TestIndicatorFixture[] = ${
  JSON.stringify(indicatorsWithSamples, null, 2)
};

export const TEST_INDICATOR_IDS = TEST_INDICATORS.map(ind => ind.id);
`;

await Deno.writeTextFile(
  "./tests/fixtures/v2-test-indicators.ts",
  fixtureContent,
);

console.log(
  `\n✅ Sample values added to ./tests/fixtures/v2-test-indicators.ts`,
);
console.log(`   Total indicators: ${indicatorsWithSamples.length}`);
console.log(
  `   Indicators with data: ${
    indicatorsWithSamples.filter((i) => i.sample_values.length > 0).length
  }\n`,
);
