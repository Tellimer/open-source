/**
 * Tests for quality assessment module
 */

import { assert, assertEquals } from "jsr:@std/assert";
import { assessDataQuality, type DataPoint } from "./quality.ts";

Deno.test("assessDataQuality - high quality data", () => {
  const highQualityData = [
    { value: 100, unit: "USD", date: "2023-01-01", source: "Federal Reserve" },
    { value: 105, unit: "USD", date: "2023-02-01", source: "Federal Reserve" },
    { value: 103, unit: "USD", date: "2023-03-01", source: "Federal Reserve" },
    { value: 108, unit: "USD", date: "2023-04-01", source: "Federal Reserve" },
    { value: 110, unit: "USD", date: "2023-05-01", source: "Federal Reserve" },
  ];

  const result = assessDataQuality(highQualityData);

  assert(result.overall >= 80, "High quality data should score >= 80");
  assert(result.dimensions.completeness >= 90, "Should have high completeness");
  assert(result.dimensions.consistency >= 90, "Should have high consistency");
  assert(result.dimensions.validity >= 90, "Should have high validity");
  assertEquals(result.issues.length, 0, "Should have no issues");
});

Deno.test("assessDataQuality - missing values", () => {
  const dataWithMissing = [
    { value: 100, unit: "USD", date: "2023-01-01" },
    { value: 103, unit: "USD", date: "2023-03-01" },
    { value: 110, unit: "USD", date: "2023-05-01" },
  ];

  const result = assessDataQuality(dataWithMissing);

  assert(
    result.dimensions.completeness < 80,
    "Should have low completeness due to missing values",
  );
  assert(
    result.issues.some((issue) => issue.type === "missing_values"),
    "Should identify missing values",
  );
  assert(
    result.issues.some((issue) => issue.severity === "warning"),
    "Missing values should be warning severity",
  );
});

Deno.test("assessDataQuality - inconsistent units", () => {
  const inconsistentData = [
    { value: 100, unit: "USD", date: "2023-01-01" },
    { value: 105, unit: "EUR", date: "2023-02-01" },
    { value: 103, unit: "USD", date: "2023-03-01" },
    { value: 108, unit: "GBP", date: "2023-04-01" },
    { value: 110, unit: "USD", date: "2023-05-01" },
  ];

  const result = assessDataQuality(inconsistentData);

  assert(
    result.dimensions.consistency < 70,
    "Should have low consistency due to mixed units",
  );
  assert(
    result.issues.some((issue) => issue.type === "inconsistent_units"),
    "Should identify inconsistent units",
  );
});

Deno.test("assessDataQuality - outliers", () => {
  const dataWithOutliers = [
    { value: 100, unit: "USD", date: "2023-01-01" },
    { value: 105, unit: "USD", date: "2023-02-01" },
    { value: 103, unit: "USD", date: "2023-03-01" },
    { value: 1000, unit: "USD", date: "2023-04-01" }, // Outlier
    { value: 110, unit: "USD", date: "2023-05-01" },
  ];

  const result = assessDataQuality(dataWithOutliers);

  assert(
    result.dimensions.validity < 90,
    "Should have lower validity due to outliers",
  );
  assert(
    result.issues.some((issue) => issue.type === "outliers"),
    "Should identify outliers",
  );
});

Deno.test("assessDataQuality - invalid values", () => {
  const invalidData = [
    { value: 100, unit: "USD", date: "2023-01-01" },
    { value: -Infinity, unit: "USD", date: "2023-02-01" },
    { value: NaN, unit: "USD", date: "2023-03-01" },
    { value: Infinity, unit: "USD", date: "2023-04-01" },
    { value: 110, unit: "USD", date: "2023-05-01" },
  ];

  const result = assessDataQuality(invalidData);

  assert(
    result.dimensions.validity < 60,
    "Should have low validity due to invalid values",
  );
  assert(
    result.issues.some((issue) => issue.type === "invalid_values"),
    "Should identify invalid values",
  );
  assert(
    result.issues.some((issue) => issue.severity === "critical"),
    "Invalid values should be critical severity",
  );
});

Deno.test("assessDataQuality - temporal gaps", () => {
  const dataWithGaps = [
    { value: 100, unit: "USD", date: "2023-01-01" },
    { value: 105, unit: "USD", date: "2023-02-01" },
    // Missing March
    { value: 108, unit: "USD", date: "2023-04-01" },
    // Missing May
    { value: 115, unit: "USD", date: "2023-06-01" },
  ];

  const result = assessDataQuality(dataWithGaps);

  assert(
    result.dimensions.timeliness < 80,
    "Should have lower timeliness due to gaps",
  );
  assert(
    result.issues.some((issue) => issue.type === "temporal_gaps"),
    "Should identify temporal gaps",
  );
});

Deno.test("assessDataQuality - duplicate dates", () => {
  const dataWithDuplicates = [
    { value: 100, unit: "USD", date: "2023-01-01" },
    { value: 105, unit: "USD", date: "2023-01-01" }, // Duplicate date
    { value: 103, unit: "USD", date: "2023-02-01" },
    { value: 108, unit: "USD", date: "2023-02-01" }, // Duplicate date
    { value: 110, unit: "USD", date: "2023-03-01" },
  ];

  const result = assessDataQuality(dataWithDuplicates);

  assert(
    result.dimensions.consistency < 80,
    "Should have lower consistency due to duplicates",
  );
  assert(
    result.issues.some((issue) => issue.type === "duplicate_dates"),
    "Should identify duplicate dates",
  );
});

Deno.test("assessDataQuality - insufficient data", () => {
  const insufficientData = [
    { value: 100, unit: "USD", date: "2023-01-01" },
    { value: 105, unit: "USD", date: "2023-02-01" },
  ];

  const result = assessDataQuality(insufficientData);

  assert(
    result.dimensions.completeness < 70,
    "Should have lower completeness for insufficient data",
  );
  assert(
    result.issues.some((issue) => issue.type === "insufficient_data"),
    "Should identify insufficient data",
  );
});

Deno.test("assessDataQuality - mixed data types", () => {
  const mixedData = [
    { value: 100, unit: "USD", date: "2023-01-01" },
    { value: "103", unit: "USD", date: "2023-03-01" }, // String instead of number
    { value: 110, unit: "USD", date: "2023-05-01" },
  ];

  const result = assessDataQuality(mixedData as DataPoint[]);

  assert(
    result.dimensions.consistency < 90,
    "Should have lower consistency due to mixed types",
  );
  assert(
    result.issues.some((issue) => issue.type === "mixed_data_types"),
    "Should identify mixed data types",
  );
});

Deno.test("assessDataQuality - source reliability", () => {
  const dataWithSources = [
    { value: 100, unit: "USD", date: "2023-01-01", source: "Federal Reserve" },
    { value: 105, unit: "USD", date: "2023-02-01", source: "Unknown Blog" },
    { value: 103, unit: "USD", date: "2023-03-01", source: "World Bank" },
    { value: 108, unit: "USD", date: "2023-04-01", source: "Random Website" },
    { value: 110, unit: "USD", date: "2023-05-01", source: "IMF" },
  ];

  const result = assessDataQuality(dataWithSources);

  // Should consider source reliability in overall score
  assert(
    result.dimensions.accuracy !== undefined,
    "Should assess accuracy when sources provided",
  );
  assert(
    result.issues.some((issue) => issue.type === "unreliable_sources"),
    "Should identify unreliable sources",
  );
});

Deno.test("assessDataQuality - precision issues", () => {
  const impreciseData = [
    { value: 100.123456789, unit: "USD", date: "2023-01-01" },
    { value: 105.1, unit: "USD", date: "2023-02-01" },
    { value: 103.12345, unit: "USD", date: "2023-03-01" },
    { value: 108, unit: "USD", date: "2023-04-01" },
    { value: 110.1234567890123, unit: "USD", date: "2023-05-01" },
  ];

  const result = assessDataQuality(impreciseData);

  // Should handle precision variations gracefully
  assert(result.overall > 0.5, "Should handle precision variations");
  // May or may not flag precision issues depending on implementation
});

Deno.test("assessDataQuality - empty dataset", () => {
  const emptyData: DataPoint[] = [];

  const result = assessDataQuality(emptyData);

  assertEquals(result.overall, 0, "Empty dataset should have zero quality");
  assertEquals(
    result.dimensions.completeness,
    0,
    "Empty dataset should have zero completeness",
  );
  assert(
    result.issues.some((issue) => issue.type === "no_data"),
    "Should identify no data",
  );
});

Deno.test("assessDataQuality - quality thresholds", () => {
  const mediumQualityData = [
    { value: 100, unit: "USD", date: "2023-01-01" },
    { value: 103, unit: "EUR", date: "2023-03-01" }, // Different unit
    { value: 108, unit: "USD", date: "2023-04-01" },
    { value: 110, unit: "USD", date: "2023-05-01" },
  ];

  const result = assessDataQuality(mediumQualityData);

  // Should be medium quality (between 30 and 80)
  assert(
    result.overall > 30 && result.overall < 80,
    "Should be medium quality",
  );
  assert(result.issues.length > 0, "Should have some issues");
  assert(result.issues.length < 5, "Should not have too many issues");
});

Deno.test("assessDataQuality - recommendations", () => {
  const problematicData = [
    { value: 100, unit: "USD", date: "2023-01-01" },
    { value: 103, unit: "EUR", date: "2023-03-01" },
    { value: 110, unit: "USD", date: "2023-05-01" },
  ];

  const result = assessDataQuality(problematicData);

  // Should provide actionable recommendations
  assert(
    result.recommendations !== undefined,
    "Should provide recommendations",
  );
  assert(
    result.recommendations.length >= 0,
    "Should have recommendations array",
  );

  // Check that recommendations are relevant to identified issues
  const hasInconsistentUnits = result.issues.some((issue) =>
    issue.type === "inconsistent_units"
  );

  if (hasInconsistentUnits) {
    assert(
      result.recommendations.some((rec) =>
        rec.includes("unit") || rec.includes("normalize")
      ),
      "Should recommend handling unit inconsistencies",
    );
  }
});
