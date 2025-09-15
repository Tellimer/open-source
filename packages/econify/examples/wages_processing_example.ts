/**
 * Modern unified pipeline example for wages processing
 *
 * This example shows how to use the unified econify pipeline for wages data.
 * The pipeline automatically detects wages, handles exemptions, and applies
 * appropriate normalization - no need for separate wages-specific functions!
 */

import { processEconomicData } from "../src/main.ts";

/**
 * Example: Processing mixed wages data with the unified pipeline
 */
export async function demonstrateUnifiedWagesPipeline() {
  console.log("🚀 Unified Econify Pipeline - Wages Processing Example\n");
  console.log("=".repeat(60) + "\n");

  // Mixed wages data - the pipeline will automatically detect this as wages
  const wagesData = [
    {
      id: "ARG",
      name: "Argentina Minimum Wage",
      value: 1674890.753,
      unit: "ARS/Month",
      metadata: {
        source: "Argentina Ministry of Labor",
        date: "2024-01-01",
      },
    },
    {
      id: "VEN",
      name: "Venezuela Minimum Wage",
      value: 13000000,
      unit: "VEF/Month",
      metadata: {
        source: "Venezuela Central Bank",
        date: "2025-01-01",
      },
    },
    {
      id: "CRI",
      name: "Costa Rica Wage Index",
      value: 6225.77,
      unit: "points",
      metadata: {
        source: "Central Bank of Costa Rica",
        date: "2024-03-12",
      },
    },
    {
      id: "USA",
      name: "US Federal Minimum Wage",
      value: 7.25,
      unit: "USD/hour",
      metadata: {
        source: "US Department of Labor",
        date: "2024-01-01",
      },
    },
  ];

  try {
    // Process with the unified pipeline - it automatically:
    // ✅ Detects this as wages data
    // ✅ Excludes index values (Costa Rica points)
    // ✅ Converts currencies using live FX rates
    // ✅ Normalizes time scales to monthly
    // ✅ Uses appropriate magnitude (ones, not millions)
    const result = await processEconomicData(wagesData, {
      targetCurrency: "USD",
      targetTimeScale: "month",
      excludeIndexValues: true, // Exclude Costa Rica points
      onProgress: (step, progress) => {
        console.log(`📊 ${step}: ${progress}%`);
      },
      onWarning: (warning) => {
        console.log(`⚠️  ${warning}`);
      },
    });

    console.log("\n✅ Processing Results:");
    console.log("=".repeat(40));

    result.data.forEach((item) => {
      if (item.normalized !== undefined) {
        console.log(
          `🇺🇸 ${item.id}: ${item.normalized.toFixed(2)} ${item.normalizedUnit}`,
        );
      } else {
        console.log(
          `❌ ${item.id}: ${item.value} ${item.unit} (excluded or failed)`,
        );
      }
    });

    console.log(`\n📈 Metrics:`);
    console.log(`   • Processing time: ${result.metrics.processingTime}ms`);
    console.log(`   • Records processed: ${result.metrics.recordsProcessed}`);
    console.log(`   • Records failed: ${result.metrics.recordsFailed}`);
    console.log(`   • Quality score: ${result.metrics.qualityScore || "N/A"}`);

    if (result.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      result.warnings.forEach((warning) => console.log(`   • ${warning}`));
    }
  } catch (error) {
    console.error("❌ Pipeline error:", error);
  }
}

/**
 * Example: Using exemptions to skip specific indicators
 */
export async function demonstrateExemptions() {
  console.log("\n🔧 Exemptions Example\n");
  console.log("=".repeat(40) + "\n");

  const mixedData = [
    {
      id: "TEL_CCR",
      name: "Credit Rating",
      value: 85,
      unit: "points",
      metadata: { categoryGroup: "Tellimer" },
    },
    {
      id: "IMF_GDP",
      name: "GDP Growth",
      value: 2.5,
      unit: "percent",
      metadata: { categoryGroup: "IMF WEO" },
    },
    {
      id: "WAGES_MFG",
      name: "Manufacturing Wages",
      value: 3250,
      unit: "EUR/month",
      metadata: { categoryGroup: "Labor" },
    },
  ];

  const result = await processEconomicData(mixedData, {
    targetCurrency: "USD",
    exemptions: {
      indicatorIds: ["TEL_CCR"], // Skip specific IDs
      categoryGroups: ["IMF WEO"], // Skip entire categories
      indicatorNames: ["Credit Rating"], // Skip by name patterns
    },
  });

  console.log("Results with exemptions:");
  result.data.forEach((item) => {
    if (item.normalized !== undefined) {
      console.log(
        `✅ ${item.id}: ${item.normalized} ${item.normalizedUnit} (processed)`,
      );
    } else {
      console.log(`⏭️  ${item.id}: ${item.value} ${item.unit} (exempted)`);
    }
  });
}

/**
 * Example: Processing with fallback FX rates
 */
export async function demonstrateWithFallbackFX() {
  console.log("\n💱 Fallback FX Rates Example\n");
  console.log("=".repeat(40) + "\n");

  const wagesData = [
    {
      id: "GBR",
      name: "UK Minimum Wage",
      value: 11.44,
      unit: "GBP/hour",
    },
    {
      id: "JPN",
      name: "Japan Minimum Wage",
      value: 1004,
      unit: "JPY/hour",
    },
  ];

  const result = await processEconomicData(wagesData, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    // Provide fallback FX rates in case live rates fail
    fxFallback: {
      base: "USD",
      rates: {
        GBP: 0.79,
        JPY: 150.0,
      },
    },
  });

  console.log("Results with fallback FX:");
  result.data.forEach((item) => {
    console.log(
      `💰 ${item.id}: ${item.normalized?.toFixed(2)} ${item.normalizedUnit}`,
    );
  });
}

// Run examples if this file is executed directly
if (import.meta.main) {
  await demonstrateUnifiedWagesPipeline();
  await demonstrateExemptions();
  await demonstrateWithFallbackFX();
}
