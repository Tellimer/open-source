#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Add sample time series values to existing v2 test fixtures
 * Preserves all existing data including expectations
 */

import { Database } from "@db/sqlite";

const db = new Database("./data/classify_v2.db");

// Read the existing fixture file
const fixtureFilePath = "./tests/fixtures/v2-test-indicators.ts";
const fixtureContent = await Deno.readTextFile(fixtureFilePath);

// Extract indicator IDs from the fixture file
const idMatches = fixtureContent.matchAll(/id: '([^']+)'/g);
const indicatorIds = Array.from(idMatches).map((match) => match[1]);

console.log(
  `\n📊 Adding sample values for ${indicatorIds.length} indicators...\n`,
);

interface TimeSeriesValue {
  date: string;
  value: number;
}

// Get sample values for each indicator (last 60 values or all if less)
const sampleValuesByIndicator = new Map<string, TimeSeriesValue[]>();

for (const id of indicatorIds) {
  const values = db
    .prepare(
      `
    SELECT date, value
    FROM source_country_indicators
    WHERE indicator_id = ?
    ORDER BY date DESC
    LIMIT 110
  `,
    )
    .all(id) as Array<{ date: string; value: number }>;

  if (values.length > 0) {
    // Reverse to get chronological order
    sampleValuesByIndicator.set(id, values.reverse());
    console.log(
      `  ✓ ${id}: ${values.length} values (${values[0].date} to ${
        values[values.length - 1].date
      })`,
    );
  } else {
    console.log(`  ⚠️  ${id}: No time series data found`);
    sampleValuesByIndicator.set(id, []);
  }
}

db.close();

// Parse and update the fixture file
const lines = fixtureContent.split("\n");
const updatedLines: string[] = [];
let currentIndicatorId: string | null = null;
let inIndicatorObject = false;
let hasExpectation = false;
let hasSampleValues = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Check if we're starting a new indicator object
  if (
    line.trim() === "{" &&
    i > 0 &&
    lines[i - 1].includes("TEST_INDICATORS")
  ) {
    inIndicatorObject = true;
    hasExpectation = false;
    hasSampleValues = false;
    updatedLines.push(line);
    continue;
  }

  // Extract indicator ID
  const idMatch = line.match(/id: '([^']+)'/);
  if (idMatch && inIndicatorObject) {
    currentIndicatorId = idMatch[1];
  }

  // Check if this indicator already has sample_values
  if (line.includes("sample_values:")) {
    hasSampleValues = true;
  }

  // Check if this indicator has expectation
  if (line.includes("expectation:")) {
    hasExpectation = true;
  }

  // When we reach the end of an indicator object, add sample_values if missing
  if (inIndicatorObject && line.trim() === "}" && currentIndicatorId) {
    // If we have expectation, insert sample_values before it
    if (hasExpectation && !hasSampleValues) {
      // Find the expectation line and insert before it
      const lastFewLines = updatedLines.slice(-20);
      const expectationIndex = lastFewLines.findIndex((l) =>
        l.includes("expectation:")
      );

      if (expectationIndex !== -1) {
        const sampleValues = sampleValuesByIndicator.get(currentIndicatorId) ||
          [];
        const sampleValuesJson = JSON.stringify(sampleValues, null, 2);
        const indent = "    ";
        const sampleValuesLines = sampleValuesJson
          .split("\n")
          .map((l, idx) =>
            idx === 0 ? `${indent}sample_values: ${l}` : `${indent}${l}`
          );

        // Insert sample_values before expectation
        const insertPosition = updatedLines.length -
          (lastFewLines.length - expectationIndex);
        updatedLines.splice(
          insertPosition,
          0,
          ...sampleValuesLines,
          `${indent.slice(2)},`,
        );
      }
    } else if (!hasExpectation && !hasSampleValues) {
      // No expectation, add sample_values before closing brace
      const sampleValues = sampleValuesByIndicator.get(currentIndicatorId) ||
        [];
      const sampleValuesJson = JSON.stringify(sampleValues, null, 2);
      const indent = "    ";
      const sampleValuesLines = sampleValuesJson
        .split("\n")
        .map((l, idx) =>
          idx === 0 ? `${indent}sample_values: ${l}` : `${indent}${l}`
        );

      updatedLines.push(...sampleValuesLines);
    }

    inIndicatorObject = false;
    currentIndicatorId = null;
    updatedLines.push(line);
    continue;
  }

  updatedLines.push(line);
}

// Update the interface to include sample_values
const interfaceStart = updatedLines.findIndex((line) =>
  line.includes("export interface TestIndicatorFixture")
);
if (interfaceStart !== -1) {
  const interfaceEnd = updatedLines.findIndex(
    (line, idx) => idx > interfaceStart && line.trim() === "}",
  );
  if (interfaceEnd !== -1) {
    // Check if sample_values is already in the interface
    const hasSampleValuesInInterface = updatedLines
      .slice(interfaceStart, interfaceEnd)
      .some((line) => line.includes("sample_values:"));

    if (!hasSampleValuesInInterface) {
      // Add sample_values to interface before closing brace
      updatedLines.splice(
        interfaceEnd,
        0,
        "  sample_values: { date: string; value: number }[];",
      );
    }
  }
}

// Write back to file
await Deno.writeTextFile(fixtureFilePath, updatedLines.join("\n"));

console.log(`\n✅ Sample values added to ${fixtureFilePath}`);
console.log(`   Total indicators updated: ${indicatorIds.length}`);
console.log(
  `   Indicators with data: ${
    Array.from(sampleValuesByIndicator.values()).filter((v) => v.length > 0)
      .length
  }\n`,
);
