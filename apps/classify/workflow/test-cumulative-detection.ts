#!/usr/bin/env -S deno run --allow-read --allow-env --allow-ffi

/**
 * Test cumulative detection algorithm with Armenia GDP data
 */

import { detectCumulativePattern } from "./src/utils/cumulative-detector.ts";

// Armenia GDP sample values (YTD pattern)
const armeniaGDP = [
  { "date": "2025-03-31", "value": 2118222.300 },
  { "date": "2024-12-31", "value": 3081006.400 },
  { "date": "2024-09-30", "value": 2790249.500 },
  { "date": "2024-06-30", "value": 2222324.300 },
  { "date": "2024-03-31", "value": 1921912.300 },
  { "date": "2023-12-31", "value": 2893835.900 },
  { "date": "2023-09-30", "value": 2562629.500 },
  { "date": "2023-06-30", "value": 2017834.500 },
  { "date": "2023-03-31", "value": 1734644.600 },
  { "date": "2022-12-31", "value": 2517766.600 },
  { "date": "2022-09-30", "value": 2208455.700 },
  { "date": "2022-06-30", "value": 1708864.800 },
  { "date": "2022-03-31", "value": 1436240.000 },
];

console.log("🧪 Testing Cumulative Pattern Detection\n");
console.log("📊 Test Case: Armenia GDP (Expected: YTD/Cumulative)\n");

const result = detectCumulativePattern(armeniaGDP);

console.log("Results:");
console.log("─".repeat(60));
console.log(`Is Cumulative: ${result.is_cumulative}`);
console.log(`Pattern Type: ${result.pattern_type}`);
console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
console.log("\nEvidence:");
console.log(`  Year Resets: ${result.evidence.year_resets_detected}`);
console.log(
  `  Within-Year Increases: ${result.evidence.within_year_increases}`,
);
console.log(`  Total Periods: ${result.evidence.total_periods_analyzed}`);

if (result.evidence.reset_points && result.evidence.reset_points.length > 0) {
  console.log("\n  Reset Points:");
  result.evidence.reset_points.forEach((point, idx) => {
    console.log(
      `    ${
        idx + 1
      }. ${point.from_date} → ${point.to_date}: dropped ${point.dropped_by}%`,
    );
  });
}

if (
  result.evidence.increase_points && result.evidence.increase_points.length > 0
) {
  console.log("\n  Increase Points (first 3):");
  result.evidence.increase_points.forEach((point, idx) => {
    console.log(
      `    ${
        idx + 1
      }. ${point.from_date} → ${point.to_date}: increased ${point.increased_by}%`,
    );
  });
}

console.log("\nReasoning:");
console.log(`  ${result.reasoning}`);

console.log("\n" + "─".repeat(60));

// Determine if test passed
if (
  result.is_cumulative && result.pattern_type === "ytd" &&
  result.confidence > 0.8
) {
  console.log("✅ TEST PASSED: Correctly detected YTD cumulative pattern!");
} else {
  console.log("❌ TEST FAILED: Expected YTD cumulative pattern");
  console.log(
    `   Got: is_cumulative=${result.is_cumulative}, pattern_type=${result.pattern_type}, confidence=${result.confidence}`,
  );
}
