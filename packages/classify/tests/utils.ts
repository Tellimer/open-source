/**
 * Test utilities and helper functions
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import type {
  ClassifiedMetadata,
  Indicator,
  IndicatorType,
  TemporalDataPoint,
} from "../src/types.ts";
import {
  INDICATOR_TYPE_TO_CATEGORY,
  VALID_HEAT_MAP_ORIENTATIONS,
  VALID_INDICATOR_CATEGORIES,
  VALID_INDICATOR_TYPES,
  VALID_TEMPORAL_AGGREGATIONS,
} from "../src/types.ts";

/**
 * Fixture structure for test data
 */
export interface IndicatorFixture {
  indicator: Indicator;
  expected_classification: Partial<ClassifiedMetadata>;
  notes?: string;
}

/**
 * Fixture file structure
 */
export interface FixtureFile {
  category: string;
  description: string;
  indicators: IndicatorFixture[];
}

/**
 * Load fixture file from JSON
 */
export async function loadFixture(filename: string): Promise<FixtureFile> {
  const path = `./tests/fixtures/${filename}`;
  const content = await Deno.readTextFile(path);
  return JSON.parse(content);
}

/**
 * Load all fixture files
 */
export async function loadAllFixtures(): Promise<FixtureFile[]> {
  const fixtureFiles = [
    "physical_fundamental.json",
    "numeric_measurement.json",
    "price_value.json",
    "change_movement.json",
    "composite_derived.json",
    "temporal.json",
    "qualitative.json",
    "edge_cases.json",
  ];

  const fixtures: FixtureFile[] = [];
  for (const file of fixtureFiles) {
    try {
      const fixture = await loadFixture(file);
      fixtures.push(fixture);
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.warn(`⚠️  Could not load fixture ${file}:`, errorMessage);
    }
  }

  return fixtures;
}

/**
 * Assert that classification has valid schema
 */
export function assertValidSchema(classification: ClassifiedMetadata): void {
  // Check required fields exist
  assertExists(classification.indicator_id, "indicator_id is required");
  assertExists(
    classification.indicator_category,
    "indicator_category is required",
  );
  assertExists(classification.indicator_type, "indicator_type is required");
  assertExists(
    classification.temporal_aggregation,
    "temporal_aggregation is required",
  );
  assertExists(
    classification.is_currency_denominated,
    "is_currency_denominated is required",
  );
  assertExists(
    classification.heat_map_orientation,
    "heat_map_orientation is required",
  );
  assertExists(classification.confidence, "confidence is required");

  // Check field types
  assertEquals(
    typeof classification.indicator_id,
    "string",
    "indicator_id must be string",
  );
  assertEquals(
    typeof classification.indicator_category,
    "string",
    "indicator_category must be string",
  );
  assertEquals(
    typeof classification.indicator_type,
    "string",
    "indicator_type must be string",
  );
  assertEquals(
    typeof classification.temporal_aggregation,
    "string",
    "temporal_aggregation must be string",
  );
  assertEquals(
    typeof classification.is_currency_denominated,
    "boolean",
    "is_currency_denominated must be boolean",
  );
  assertEquals(
    typeof classification.heat_map_orientation,
    "string",
    "heat_map_orientation must be string",
  );
  assertEquals(
    typeof classification.confidence,
    "number",
    "confidence must be number",
  );

  // Check valid enum values
  if (
    !VALID_INDICATOR_CATEGORIES.includes(
      classification.indicator_category as never,
    )
  ) {
    throw new Error(
      `Invalid indicator_category: ${classification.indicator_category}. Must be one of: ${
        VALID_INDICATOR_CATEGORIES.join(", ")
      }`,
    );
  }

  if (!VALID_INDICATOR_TYPES.includes(classification.indicator_type as never)) {
    throw new Error(
      `Invalid indicator_type: ${classification.indicator_type}. Must be one of: ${
        VALID_INDICATOR_TYPES.join(", ")
      }`,
    );
  }

  if (
    !VALID_TEMPORAL_AGGREGATIONS.includes(
      classification.temporal_aggregation as never,
    )
  ) {
    throw new Error(
      `Invalid temporal_aggregation: ${classification.temporal_aggregation}. Must be one of: ${
        VALID_TEMPORAL_AGGREGATIONS.join(", ")
      }`,
    );
  }

  if (
    !VALID_HEAT_MAP_ORIENTATIONS.includes(
      classification.heat_map_orientation as never,
    )
  ) {
    throw new Error(
      `Invalid heat_map_orientation: ${classification.heat_map_orientation}. Must be one of: ${
        VALID_HEAT_MAP_ORIENTATIONS.join(", ")
      }`,
    );
  }

  // Check confidence range
  if (classification.confidence < 0 || classification.confidence > 1) {
    throw new Error(
      `Confidence must be between 0 and 1, got: ${classification.confidence}`,
    );
  }

  // Check category matches type
  const expectedCategory =
    INDICATOR_TYPE_TO_CATEGORY[classification.indicator_type as IndicatorType];
  if (classification.indicator_category !== expectedCategory) {
    throw new Error(
      `Category mismatch: ${classification.indicator_type} should be in category ${expectedCategory}, got ${classification.indicator_category}`,
    );
  }
}

/**
 * Compare classification against expected values
 */
export interface ClassificationComparison {
  matches: boolean;
  differences: string[];
  accuracy: number;
}

export function compareClassification(
  actual: ClassifiedMetadata,
  expected: Partial<ClassifiedMetadata>,
): ClassificationComparison {
  const differences: string[] = [];
  let matchCount = 0;
  let totalFields = 0;

  const fieldsToCompare: (keyof ClassifiedMetadata)[] = [
    "indicator_category",
    "indicator_type",
    "temporal_aggregation",
    "is_currency_denominated",
    "heat_map_orientation",
  ];

  for (const field of fieldsToCompare) {
    if (expected[field] !== undefined) {
      totalFields++;
      if (actual[field] === expected[field]) {
        matchCount++;
      } else {
        differences.push(
          `${field}: expected ${expected[field]}, got ${actual[field]}`,
        );
      }
    }
  }

  return {
    matches: differences.length === 0,
    differences,
    accuracy: totalFields > 0 ? matchCount / totalFields : 0,
  };
}

/**
 * Calculate classification accuracy across multiple indicators
 */
export interface AccuracyReport {
  total: number;
  correct: number;
  accuracy: number;
  byField: Record<string, { correct: number; total: number; accuracy: number }>;
}

export function calculateAccuracy(
  results: Array<{
    actual: ClassifiedMetadata;
    expected: Partial<ClassifiedMetadata>;
  }>,
): AccuracyReport {
  const byField: Record<string, { correct: number; total: number }> = {};
  let totalCorrect = 0;

  for (const { actual, expected } of results) {
    const comparison = compareClassification(actual, expected);
    if (comparison.matches) {
      totalCorrect++;
    }

    // Track per-field accuracy
    const fieldsToCompare: (keyof ClassifiedMetadata)[] = [
      "indicator_category",
      "indicator_type",
      "temporal_aggregation",
      "is_currency_denominated",
      "heat_map_orientation",
    ];

    for (const field of fieldsToCompare) {
      if (expected[field] !== undefined) {
        if (!byField[field]) {
          byField[field] = { correct: 0, total: 0 };
        }
        byField[field].total++;
        if (actual[field] === expected[field]) {
          byField[field].correct++;
        }
      }
    }
  }

  const byFieldWithAccuracy: Record<
    string,
    { correct: number; total: number; accuracy: number }
  > = {};
  for (const [field, stats] of Object.entries(byField)) {
    byFieldWithAccuracy[field] = {
      ...stats,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
    };
  }

  return {
    total: results.length,
    correct: totalCorrect,
    accuracy: results.length > 0 ? totalCorrect / results.length : 0,
    byField: byFieldWithAccuracy,
  };
}

/**
 * Format accuracy report as string
 */
export function formatAccuracyReport(report: AccuracyReport): string {
  const lines: string[] = [];
  lines.push(`\n${"=".repeat(60)}`);
  lines.push(`ACCURACY REPORT`);
  lines.push(`${"=".repeat(60)}`);
  lines.push(`Total indicators: ${report.total}`);
  lines.push(`Correct classifications: ${report.correct}`);
  lines.push(`Overall accuracy: ${(report.accuracy * 100).toFixed(1)}%`);
  lines.push(`\nPer-field accuracy:`);

  for (const [field, stats] of Object.entries(report.byField)) {
    lines.push(
      `  ${field}: ${stats.correct}/${stats.total} (${
        (
          stats.accuracy * 100
        ).toFixed(1)
      }%)`,
    );
  }

  lines.push(`${"=".repeat(60)}\n`);
  return lines.join("\n");
}

/**
 * Assert minimum accuracy threshold
 */
export function assertMinimumAccuracy(
  report: AccuracyReport,
  threshold: number,
  message?: string,
): void {
  if (report.accuracy < threshold) {
    throw new Error(
      message ||
        `Accuracy ${(report.accuracy * 100).toFixed(1)}% is below threshold ${
          (
            threshold * 100
          ).toFixed(1)
        }%`,
    );
  }
}

/**
 * Check if sample_values are temporal
 */
export function hasTemporalData(indicator: Indicator): boolean {
  if (!indicator.sample_values || indicator.sample_values.length === 0) {
    return false;
  }

  const firstValue = indicator.sample_values[0];
  return (
    typeof firstValue === "object" &&
    firstValue !== null &&
    "date" in firstValue &&
    "value" in firstValue
  );
}

/**
 * Extract values from temporal or simple sample_values
 */
export function extractValues(indicator: Indicator): number[] {
  if (!indicator.sample_values) {
    return [];
  }

  if (hasTemporalData(indicator)) {
    return (indicator.sample_values as TemporalDataPoint[]).map((point) =>
      point.value
    );
  }

  return indicator.sample_values as number[];
}
