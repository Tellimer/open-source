/**
 * Example demonstrating fixes for car registrations and minimum wages normalization
 *
 * This example shows:
 * 1. Car registrations are properly classified as flow indicators with scale-only normalization
 * 2. Minimum wages include proper explain metadata with FX rates and conversion details
 */

import { processEconomicData } from "../src/main.ts";
import { isCountIndicator } from "../src/count/count-normalization.ts";
import { classifyIndicator } from "../src/classification/classification.ts";

console.log("🔧 Normalization Fixes Example\n");
console.log("=".repeat(50) + "\n");

// Test data combining car registrations and minimum wages
const testData = [
  // Car registrations (count data - should skip currency conversion)
  {
    id: "ARG_CAR_REG",
    name: "Argentina Car Registrations",
    value: 50186,
    unit: "Thousands",
    indicator_type: "CAR_REGISTRATIONS",
  },
  {
    id: "AUS_CAR_REG",
    name: "Australia Car Registrations",
    value: 16245,
    unit: "Units",
    indicator_type: "CAR_REGISTRATIONS",
  },
  {
    id: "BHR_CAR_REG",
    name: "Bahrain Car Registrations",
    value: 338.02,
    unit: "Hundreds",
    indicator_type: "CAR_REGISTRATIONS",
  },
  // Minimum wages (currency data - should include explain metadata)
  {
    id: "AGO_MIN_WAGE",
    name: "Angola Minimum Wage",
    value: 32181.15,
    unit: "AOA/Month",
    indicator_type: "MINIMUM_WAGES",
  },
  {
    id: "ARG_MIN_WAGE",
    name: "Argentina Minimum Wage",
    value: 322000,
    unit: "ARS/Month",
    indicator_type: "MINIMUM_WAGES",
  },
];

// Fallback FX rates
const fallbackFX = {
  base: "USD",
  rates: {
    AOA: 912.5,
    ARS: 1465.0,
  },
};

async function demonstrateFixes() {
  console.log("🧪 Testing Car Registration Classification:\n");

  // Test car registration detection
  const carRegClassification = classifyIndicator({
    name: "Car Registrations",
    unit: "Units",
  });

  console.log(`   Car Registrations Classification:`);
  console.log(`   Type: ${carRegClassification.type} (should be 'flow')`);
  console.log(`   Confidence: ${carRegClassification.confidence}%`);
  console.log(
    `   Count Indicator: ${isCountIndicator("Car Registrations", "Units")}`,
  );

  console.log("\n🧪 Processing Mixed Data with Explain Metadata:\n");

  try {
    const result = await processEconomicData(testData, {
      targetCurrency: "USD",
      targetMagnitude: "ones", // Use ones for both count and wages
      explain: true, // Enable explain metadata
      useLiveFX: false,
      fxFallback: fallbackFX,
    });

    console.log("✅ Processing Results:\n");

    result.data.forEach((item) => {
      console.log(`📊 ${item.name}:`);
      console.log(`   Original: ${item.value} ${item.unit}`);
      console.log(
        `   Normalized: ${item.normalized?.toFixed(2)} ${item.normalizedUnit}`,
      );

      if (item.id?.includes("CAR_REG")) {
        // Car registration - should have no currency conversion
        console.log(`   🚗 Count Data: No currency conversion applied`);
        if (item.explain?.fx) {
          console.log(`   ❌ Unexpected FX conversion found!`);
        } else {
          console.log(`   ✅ Correctly skipped currency conversion`);
        }
      } else if (item.id?.includes("MIN_WAGE")) {
        // Minimum wage - should have explain metadata
        console.log(`   💰 Wage Data: Currency conversion applied`);
        if (item.explain) {
          console.log(`   ✅ Explain metadata present:`);
          console.log(
            `      Currency: ${item.explain.currency?.original} → ${item.explain.currency?.normalized}`,
          );
          console.log(`      FX Rate: ${item.explain.fx?.rate?.toFixed(6)}`);
          console.log(`      Source: ${item.explain.fx?.source}`);
        } else {
          console.log(`   ❌ Missing explain metadata!`);
        }
      }
      console.log("");
    });

    // Summary
    const carRegItems = result.data.filter((item) =>
      item.id?.includes("CAR_REG")
    );
    const wageItems = result.data.filter((item) =>
      item.id?.includes("MIN_WAGE")
    );

    console.log("📈 Summary:");
    console.log(`   Car Registrations: ${carRegItems.length} items`);
    console.log(
      `   - With FX conversion: ${
        carRegItems.filter((item) => item.explain?.fx).length
      } (should be 0)`,
    );
    console.log(`   Minimum Wages: ${wageItems.length} items`);
    console.log(
      `   - With explain metadata: ${
        wageItems.filter((item) => item.explain).length
      } (should be ${wageItems.length})`,
    );

    const carRegFixed = carRegItems.every((item) => !item.explain?.fx);
    const wagesFixed = wageItems.every((item) => item.explain);

    if (carRegFixed && wagesFixed) {
      console.log(`   ✅ All fixes working correctly!`);
    } else {
      console.log(`   ❌ Some issues remain:`);
      if (!carRegFixed) {
        console.log(`      - Car registrations still getting FX conversion`);
      }
      if (!wagesFixed) console.log(`      - Wages missing explain metadata`);
    }
  } catch (error) {
    console.error("❌ Error during processing:", error);
  }
}

// Run the demonstration
if (import.meta.main) {
  await demonstrateFixes();
}
