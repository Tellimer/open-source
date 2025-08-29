/**
 * Complete pipeline example showing time sampling + currency conversion for wages
 */

import { processWagesIndicator } from "./pipeline-integration.ts";
import type { FXTable } from "../types.ts";

// Current FX rates for demonstration
const fx: FXTable = {
  base: "USD",
  rates: {
    CAD: 1.36,
    AUD: 1.52,
    CNY: 7.25,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 150.0,
    AMD: 387.5,
    CZK: 22.8,
  },
};

/**
 * Demonstrate complete pipeline: Time sampling + Currency conversion
 */
export async function demonstrateCompletePipeline() {
  console.log(
    "🚀 Complete Wages Pipeline: Time Sampling + Currency Conversion\n",
  );
  console.log("=".repeat(80) + "\n");

  // Your actual mixed wages data
  const mixedWagesData = {
    indicator_id: "WAGES",
    indicator_name: "Average Wages",
    value_range: { min: 29.68, max: 124110 },
    countries: {
      CAN: {
        date: "2024-01-01",
        value: "29.68",
        tooltip: {
          indicatorId: "CANADAWAG",
          currency: "CAD",
          units: "CAD/Hour",
          periodicity: "Monthly",
        },
      },
      AUS: {
        date: "2024-01-01",
        value: "1432.6",
        tooltip: {
          indicatorId: "AUSTRALIAWAG",
          currency: "AUD",
          units: "AUD/Week",
          periodicity: "Quarterly",
        },
      },
      CHN: {
        date: "2024-01-01",
        value: "124110",
        tooltip: {
          indicatorId: "CHINAWAG",
          currency: "CNY",
          units: "CNY/Year",
          periodicity: "Yearly",
        },
      },
      EUR_EXAMPLE: {
        date: "2024-01-01",
        value: "3200",
        tooltip: {
          indicatorId: "EUROPEWAG",
          currency: "EUR",
          units: "EUR/Month",
          periodicity: "Monthly",
        },
      },
    },
  };

  console.log("📋 Step 1: Original Mixed Data");
  console.log("Different currencies AND different time periods:");
  Object.entries(mixedWagesData.countries).forEach(
    ([country, data]) => {
      console.log(`${country}: ${data.value} ${data.tooltip.units}`);
    },
  );

  console.log("\n" + "=".repeat(80) + "\n");

  // Process through complete pipeline
  console.log("⚙️  Step 2: Processing through Complete Pipeline");
  console.log(
    "Applying both time standardization AND currency conversion...\n",
  );

  const result = await processWagesIndicator(mixedWagesData, fx, {
    targetCurrency: "USD",
    excludeIndexValues: false,
  });

  console.log("✅ Step 3: Final Results (USD/month)");
  console.log("All wages now in same currency AND time period:");

  // Show the transformed results
  Object.entries(result.normalized.countries).forEach(
    ([country, data]) => {
      const original = mixedWagesData
        .countries[country as keyof typeof mixedWagesData.countries];
      const countryData = data as { value: number };
      console.log(
        `${country}: $${
          Math.round(countryData.value).toLocaleString()
        } USD/month`,
      );
      console.log(`  (was ${original.value} ${original.tooltip.units})`);
    },
  );

  console.log("\n" + "=".repeat(80) + "\n");

  // Show the conversion details
  console.log("🔍 Step 4: Conversion Details");
  console.log("How each conversion was calculated:\n");

  // Canada: CAD/Hour → USD/month
  const canOriginal = parseFloat(mixedWagesData.countries.CAN.value);
  const canResult = result.normalized.countries.CAN.value;
  console.log("🇨🇦 Canada (CAD/Hour → USD/month):");
  console.log(`  Original: ${canOriginal} CAD/Hour`);
  console.log(
    `  Step 1 - Time conversion: ${canOriginal} × 173.33 work hours/month = ${
      Math.round(canOriginal * 173.33)
    } CAD/month`,
  );
  console.log(
    `  Step 2 - Currency conversion: ${
      Math.round(canOriginal * 173.33)
    } ÷ ${fx.rates.CAD} = $${Math.round(canResult)} USD/month`,
  );

  // Australia: AUD/Week → USD/month
  const ausOriginal = parseFloat(mixedWagesData.countries.AUS.value);
  const ausResult = result.normalized.countries.AUS.value;
  console.log("\n🇦🇺 Australia (AUD/Week → USD/month):");
  console.log(`  Original: ${ausOriginal} AUD/Week`);
  console.log(
    `  Step 1 - Time conversion: ${ausOriginal} × 4.33 weeks/month = ${
      Math.round(ausOriginal * 4.33)
    } AUD/month`,
  );
  console.log(
    `  Step 2 - Currency conversion: ${
      Math.round(ausOriginal * 4.33)
    } ÷ ${fx.rates.AUD} = $${Math.round(ausResult)} USD/month`,
  );

  // China: CNY/Year → USD/month
  const chnOriginal = parseFloat(mixedWagesData.countries.CHN.value);
  const chnResult = result.normalized.countries.CHN.value;
  console.log("\n🇨🇳 China (CNY/Year → USD/month):");
  console.log(`  Original: ${chnOriginal.toLocaleString()} CNY/Year`);
  console.log(
    `  Step 1 - Time conversion: ${chnOriginal.toLocaleString()} ÷ 12 months = ${
      Math.round(chnOriginal / 12).toLocaleString()
    } CNY/month`,
  );
  console.log(
    `  Step 2 - Currency conversion: ${
      Math.round(chnOriginal / 12).toLocaleString()
    } ÷ ${fx.rates.CNY} = $${Math.round(chnResult)} USD/month`,
  );

  // Europe: EUR/Month → USD/month (currency only)
  const eurOriginal = parseFloat(mixedWagesData.countries.EUR_EXAMPLE.value);
  const eurResult = result.normalized.countries.EUR_EXAMPLE.value;
  console.log("\n🇪🇺 Europe (EUR/Month → USD/month):");
  console.log(`  Original: ${eurOriginal} EUR/Month`);
  console.log(`  Step 1 - Time conversion: No change needed (already monthly)`);
  console.log(
    `  Step 2 - Currency conversion: ${eurOriginal} ÷ ${fx.rates.EUR} = $${
      Math.round(eurResult)
    } USD/month`,
  );

  console.log("\n" + "=".repeat(80) + "\n");

  // Show final comparison
  console.log("📊 Step 5: Final Comparison");
  console.log("Now all wages are directly comparable:\n");

  const finalWages = Object.entries(result.normalized.countries)
    .map(([country, data]) => ({
      country,
      value: Math.round((data as { value: number }).value),
    }))
    .sort((a, b) => b.value - a.value);

  finalWages.forEach((wage, index) => {
    console.log(
      `${
        index + 1
      }. ${wage.country}: $${wage.value.toLocaleString()} USD/month`,
    );
  });

  const range = {
    min: Math.min(...finalWages.map((w) => w.value)),
    max: Math.max(...finalWages.map((w) => w.value)),
  };

  console.log(
    `\nValue range: $${range.min.toLocaleString()} - $${range.max.toLocaleString()} USD/month`,
  );
  console.log(
    `Ratio: ${
      (range.max / range.min).toFixed(1)
    }x difference (much more reasonable!)`,
  );

  console.log("\n" + "=".repeat(80) + "\n");

  console.log("✅ Pipeline Features Demonstrated:");
  console.log("  ✓ Time period standardization (hour/week/year → month)");
  console.log("  ✓ Currency conversion (CAD/AUD/CNY/EUR → USD)");
  console.log(
    "  ✓ Work hours vs calendar hours (CAD/Hour uses 173.33 work hours/month)",
  );
  console.log("  ✓ Proper conversion order (time first, then currency)");
  console.log("  ✓ Comparable final results in single unit (USD/month)");

  return result;
}

/**
 * Show step-by-step breakdown of the pipeline
 */
export function explainPipelineSteps() {
  console.log("\n🔧 Pipeline Architecture\n");
  console.log("=".repeat(80) + "\n");

  console.log("📋 Input: Mixed wage data");
  console.log("  • Different currencies: CAD, AUD, CNY, EUR");
  console.log("  • Different time periods: Hour, Week, Month, Year");
  console.log("  • Different value ranges: 29.68 to 124,110");

  console.log("\n⚙️  Processing Steps:");
  console.log("  1. Detect wage data (by indicator name/units)");
  console.log("  2. Parse time scale from units (Hour/Week/Month/Year)");
  console.log("  3. Convert time periods to target (monthly)");
  console.log("     • Hour → Month: Use work hours (173.33/month)");
  console.log("     • Week → Month: Use 4.33 weeks/month");
  console.log("     • Year → Month: Divide by 12");
  console.log("  4. Convert currencies to target (USD)");
  console.log("     • Apply current FX rates");
  console.log("  5. Update metadata with conversion details");

  console.log("\n📊 Output: Standardized wage data");
  console.log("  • Single currency: USD");
  console.log("  • Single time period: Month");
  console.log("  • Comparable value ranges");
  console.log("  • Preserved metadata and sources");

  console.log("\n🎯 Benefits:");
  console.log("  • Meaningful comparisons across countries");
  console.log("  • Accurate work hour calculations");
  console.log("  • Transparent conversion process");
  console.log("  • Maintains data integrity");
}

// Run demonstration if this file is executed directly
if (import.meta.main) {
  await demonstrateCompletePipeline();
  explainPipelineSteps();
}
