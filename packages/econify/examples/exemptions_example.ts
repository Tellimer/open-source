/**
 * Example: Using exemptions to skip normalization for specific indicators
 *
 * This example shows how to exempt certain indicators from econify normalization
 * based on indicator IDs, category groups, or name patterns.
 */

import { processEconomicData } from "../src/main.ts";

// Sample mixed economic data
const economicData = [
  {
    id: "TEL_CCR",
    value: 85,
    unit: "points",
    name: "Credit Rating",
    metadata: { categoryGroup: "Tellimer" },
  },
  {
    id: "IMF_GDP_GROWTH",
    value: 2.5,
    unit: "percent",
    name: "GDP Growth Rate",
    metadata: { categoryGroup: "IMF WEO" },
  },
  {
    id: "WB_INFLATION",
    value: 3.2,
    unit: "percent",
    name: "Inflation Rate",
    metadata: { categoryGroup: "World Bank" },
  },
  {
    id: "MARKET_INDEX",
    value: 1250,
    unit: "index",
    name: "Stock Market Index",
    metadata: { categoryGroup: "Financial" },
  },
  {
    id: "WAGES_MFG",
    value: 50000,
    unit: "USD/Year",
    name: "Manufacturing Wages",
    metadata: { categoryGroup: "Labor Stats" },
  },
  {
    id: "DEBT_TOTAL",
    value: 2.5,
    unit: "USD Billion",
    name: "Total Government Debt",
    metadata: { categoryGroup: "Fiscal" },
  },
];

async function demonstrateExemptions() {
  console.log("🔧 Processing economic data with exemptions...\n");

  const result = await processEconomicData(economicData, {
    targetCurrency: "EUR",
    targetMagnitude: "millions",
    minQualityScore: 30,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {
        EUR: 0.85,
      },
    },
    exemptions: {
      // Exempt specific indicator IDs
      indicatorIds: ["TEL_CCR"],

      // Exempt entire category groups
      categoryGroups: ["IMF WEO", "Tellimer"],

      // Exempt indicators with certain name patterns
      indicatorNames: ["Index", "Credit Rating"],
    },
  });

  console.log(`📊 Processed ${result.data.length} indicators:`);
  console.log(`⚠️  ${result.warnings.length} warnings`);
  console.log(`❌ ${result.errors.length} errors\n`);

  // Show results
  result.data.forEach((item) => {
    const isExempted = !item.normalized && item.value === item.value;
    const status = isExempted ? "EXEMPTED" : "PROCESSED";
    const value = item.normalized || item.value;
    const unit = item.normalizedUnit || item.unit;

    console.log(`${status}: ${item.id} = ${value} ${unit}`);

    if (item.normalized) {
      console.log(`  Original: ${item.value} ${item.unit}`);
      console.log(`  Normalized: ${item.normalized} ${item.normalizedUnit}`);
    }
    console.log("");
  });

  // Summary of exemptions
  const exempted = result.data.filter((item) => !item.normalized);
  const processed = result.data.filter((item) => item.normalized);

  console.log("📋 Summary:");
  console.log(`   Exempted: ${exempted.length} indicators`);
  console.log(`   Processed: ${processed.length} indicators`);

  if (exempted.length > 0) {
    console.log("\n🚫 Exempted indicators:");
    exempted.forEach((item) => {
      console.log(
        `   - ${item.id}: ${item.name} (${item.metadata?.categoryGroup})`,
      );
    });
  }

  if (processed.length > 0) {
    console.log("\n✅ Processed indicators:");
    processed.forEach((item) => {
      console.log(
        `   - ${item.id}: ${item.value} ${item.unit} → ${item.normalized} ${item.normalizedUnit}`,
      );
    });
  }
}

// Example of different exemption strategies
async function exemptionStrategies() {
  console.log("\n" + "=".repeat(60));
  console.log("🎯 Different Exemption Strategies");
  console.log("=".repeat(60));

  // Strategy 1: Exempt by category (e.g., don't normalize IMF data)
  console.log("\n1️⃣ Strategy: Exempt IMF WEO data");
  const imfExempt = await processEconomicData(economicData, {
    exemptions: { categoryGroups: ["IMF WEO"] },
    targetCurrency: "EUR",
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { EUR: 0.85 } },
  });

  const imfExempted = imfExempt.data.filter((item) => !item.normalized);
  console.log(`   Exempted ${imfExempted.length} IMF indicators`);

  // Strategy 2: Exempt indices and ratings (qualitative data)
  console.log("\n2️⃣ Strategy: Exempt qualitative indicators");
  const qualitativeExempt = await processEconomicData(economicData, {
    exemptions: { indicatorNames: ["Index", "Rating"] },
    targetCurrency: "EUR",
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { EUR: 0.85 } },
  });

  const qualExempted = qualitativeExempt.data.filter((item) =>
    !item.normalized
  );
  console.log(`   Exempted ${qualExempted.length} qualitative indicators`);

  // Strategy 3: Exempt specific problematic indicators
  console.log("\n3️⃣ Strategy: Exempt specific problematic indicators");
  const specificExempt = await processEconomicData(economicData, {
    exemptions: { indicatorIds: ["TEL_CCR", "MARKET_INDEX"] },
    targetCurrency: "EUR",
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { EUR: 0.85 } },
  });

  const specExempted = specificExempt.data.filter((item) => !item.normalized);
  console.log(`   Exempted ${specExempted.length} specific indicators`);
}

// Run the examples
if (import.meta.main) {
  try {
    await demonstrateExemptions();
    await exemptionStrategies();
  } catch (error) {
    console.error("❌ Error:", error);
  }
}
