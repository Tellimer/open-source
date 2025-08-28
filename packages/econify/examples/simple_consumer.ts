/**
 * Example: Simple API consumption without XState knowledge
 *
 * This shows how external apps can use econify's pipeline
 * without knowing or caring about XState
 */

// In a real project, you'd import from the published package:
// import { processEconomicData } from 'jsr:@yourscope/econify';
// or
// import { processEconomicData } from 'npm:econify';

import {
  type PipelineOptions,
  processEconomicData,
  processEconomicDataAuto,
  validateEconomicData,
} from "../src/main.ts";

// Example 1: Basic usage - just process data
async function basicUsage() {
  console.log("=== Basic Usage ===\n");

  const data = [
    { value: 100, unit: "USD Million", name: "Q1 Revenue", year: 2023 },
    { value: 110, unit: "USD Million", name: "Q2 Revenue", year: 2023 },
    { value: 3.5, unit: "percent", name: "Inflation Rate", year: 2023 },
  ];

  try {
    const result = await processEconomicData(data, {
      targetCurrency: "EUR",
      targetMagnitude: "billions",
      fxFallback: {
        base: "USD",
        rates: { EUR: 0.92 },
      },
    });

    console.log(`✅ Processed ${result.data.length} items`);
    console.log(`⏱️ Processing time: ${result.metrics.processingTime}ms`);
    console.log(`📊 Quality score: ${result.metrics.qualityScore}/100\n`);

    result.data.forEach((item) => {
      console.log(
        `- ${item.name}: ${item.normalized || item.value} ${
          item.normalizedUnit || item.unit
        }`,
      );
    });

    if (result.warnings.length > 0) {
      console.log("\n⚠️ Warnings:", result.warnings);
    }
  } catch (error) {
    console.error("❌ Failed:", error);
  }
}

// Example 2: With progress tracking
async function withProgressTracking() {
  console.log("\n=== With Progress Tracking ===\n");

  const data = [
    { value: 27360, unit: "USD Billion", name: "US GDP", year: 2023 },
    { value: 16500, unit: "EUR Billion", name: "EU GDP", year: 2023 },
    { value: 593, unit: "JPY Trillion", name: "Japan GDP", year: 2023 },
  ];

  const options: PipelineOptions = {
    targetCurrency: "USD",
    targetMagnitude: "trillions",
    onProgress: (step, progress) => {
      console.log(`  ${progress}% - ${step}`);
    },
    onWarning: (warning) => {
      console.log(`  ⚠️ Warning: ${warning}`);
    },
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92, JPY: 150 },
    },
  };

  try {
    const result = await processEconomicData(data, options);
    console.log(`\n✅ Complete! Processed ${result.data.length} items\n`);

    result.data.forEach((item) => {
      const value = item.normalized || item.value;
      console.log(
        `  ${item.name}: ${value.toFixed(2)} ${
          item.normalizedUnit || item.unit
        }`,
      );
    });
  } catch (error) {
    console.error("❌ Failed:", error);
  }
}

// Example 3: Validate before processing
async function validateFirst() {
  console.log("\n=== Validate Before Processing ===\n");

  const goodData = [{ value: 100, unit: "USD", name: "Valid Data" }];

  const badData = [
    { value: NaN, unit: "USD", name: "Invalid Value" },
    { value: 100, unit: "", name: "Missing Unit" },
  ];

  // Validate good data
  const goodValidation = await validateEconomicData(goodData);
  console.log("Good data validation:");
  console.log(`  Valid: ${goodValidation.valid}`);
  console.log(`  Score: ${goodValidation.score}/100`);

  // Validate bad data
  const badValidation = await validateEconomicData(badData, {
    requiredFields: ["value", "unit", "name"],
  });
  console.log("\nBad data validation:");
  console.log(`  Valid: ${badValidation.valid}`);
  console.log(`  Score: ${badValidation.score}/100`);
  console.log(`  Issues:`, badValidation.issues);

  // Only process if valid
  if (goodValidation.valid) {
    console.log("\n✅ Data is valid, processing...");
    const result = await processEconomicData(goodData);
    console.log(`Processed ${result.data.length} items`);
  }
}

// Example 4: Auto-continue on quality issues
async function autoQualityHandling() {
  console.log("\n=== Auto Quality Handling ===\n");

  // Data with quality issues (outliers)
  const data = [
    { value: 100, unit: "USD Million", name: "Normal Value" },
    { value: 999999999, unit: "USD Million", name: "Outlier Value" },
    { value: -50, unit: "USD Million", name: "Negative Value" },
  ];

  console.log("Processing data with quality issues...\n");

  const result = await processEconomicDataAuto(data, {
    minQualityScore: 90, // High threshold
    targetCurrency: "EUR",
    onWarning: (warning) => {
      console.log(`  ⚠️ ${warning}`);
    },
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92 },
    },
  });

  console.log(`\n✅ Processed despite quality issues`);
  console.log(`  Items: ${result.data.length}`);
  console.log(`  Quality: ${result.metrics.qualityScore}/100`);
  console.log(`  Warnings: ${result.warnings.length}`);
}

// Example 5: Real-world integration example
async function realWorldExample() {
  console.log("\n=== Real-World Integration ===\n");

  // Simulate fetching data from an API
  const fetchEconomicData = () => {
    // In reality, this would be an API call
    return [
      {
        id: "gdp_us",
        value: 27360,
        unit: "USD Billion",
        name: "US GDP",
        year: 2023,
      },
      {
        id: "gdp_china",
        value: 17900,
        unit: "USD Billion",
        name: "China GDP",
        year: 2023,
      },
      {
        id: "gdp_japan",
        value: 4200,
        unit: "USD Billion",
        name: "Japan GDP",
        year: 2023,
      },
      {
        id: "inflation_us",
        value: 3.4,
        unit: "percent",
        name: "US Inflation",
        year: 2023,
      },
      {
        id: "inflation_eu",
        value: 5.4,
        unit: "percent",
        name: "EU Inflation",
        year: 2023,
      },
    ];
  };

  console.log("Fetching economic data...");
  const rawData = await fetchEconomicData();
  console.log(`Fetched ${rawData.length} indicators\n`);

  // Validate first
  const validation = await validateEconomicData(rawData);
  if (!validation.valid) {
    console.error("❌ Data validation failed:", validation.issues);
    return;
  }

  console.log("✅ Data validated, processing...\n");

  // Process with progress tracking
  const result = await processEconomicData(rawData, {
    targetCurrency: "EUR",
    targetMagnitude: "trillions",
    inferUnits: true,
    onProgress: (step, progress) => {
      // Update UI progress bar
      const bar = "█".repeat(Math.floor(progress / 10)).padEnd(10, "░");
      console.log(`  [${bar}] ${progress}% - ${step}`);
    },
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92 },
    },
  });

  console.log("\n\n📊 Results:");
  console.log("━".repeat(50));

  // Group by type
  const gdpData = result.data.filter((d) => d.name?.includes("GDP"));
  const inflationData = result.data.filter((d) =>
    d.name?.includes("Inflation")
  );

  console.log("\nGDP (in EUR trillions):");
  gdpData.forEach((item) => {
    const value = item.normalized || item.value;
    console.log(`  ${item.name}: €${value.toFixed(3)}T`);
  });

  console.log("\nInflation Rates:");
  inflationData.forEach((item) => {
    console.log(`  ${item.name}: ${item.value}%`);
  });

  console.log("\n📈 Metrics:");
  console.log(`  Processing time: ${result.metrics.processingTime}ms`);
  console.log(`  Quality score: ${result.metrics.qualityScore}/100`);
  console.log(`  Records processed: ${result.metrics.recordsProcessed}`);
}

// Run all examples
async function main() {
  console.log("🚀 Econify Simple API Examples");
  console.log("================================\n");

  await basicUsage();
  await withProgressTracking();
  await validateFirst();
  await autoQualityHandling();
  await realWorldExample();

  console.log("\n\n✨ All examples completed!");
  console.log("\nNo XState knowledge required! 🎉");
}

if (import.meta.main) {
  main();
}

export {
  autoQualityHandling,
  basicUsage,
  realWorldExample,
  validateFirst,
  withProgressTracking,
};
