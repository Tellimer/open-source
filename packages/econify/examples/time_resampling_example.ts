#!/usr/bin/env deno run -A

/**
 * Time Resampling Example
 *
 * Demonstrates how to use targetTimeScale to standardize mixed time periods
 * for consistent reporting and analysis.
 */

import { processEconomicData } from "../src/main.ts";

console.log("🕒 Time Resampling Example\n");

// Mixed time periods in economic data
const mixedTimeData = [
  {
    id: "quarterly_sales",
    value: 300,
    unit: "Million USD per Quarter",
    name: "Quarterly Sales",
  },
  {
    id: "annual_revenue",
    value: 1200,
    unit: "Million USD per Year",
    name: "Annual Revenue",
  },
  {
    id: "weekly_production",
    value: 50,
    unit: "Million USD per Week",
    name: "Weekly Production",
  },
  {
    id: "daily_expenses",
    value: 2,
    unit: "Million USD per Day",
    name: "Daily Expenses",
  },
];

console.log("📊 Original Data (Mixed Time Periods):");
mixedTimeData.forEach((item) => {
  console.log(`  ${item.name}: ${item.value} ${item.unit}`);
});

console.log("\n⚙️ Processing with targetTimeScale: 'month'...\n");

// Process with monthly standardization
const result = await processEconomicData(mixedTimeData, {
  targetCurrency: "USD",
  targetTimeScale: "month", // 🎯 Convert all to monthly
  useLiveFX: false,
  fxFallback: {
    base: "USD",
    rates: {},
  },
});

console.log("✅ Results (Standardized to Monthly):");
result.data.forEach((item) => {
  const original = mixedTimeData.find((d) => d.id === item.id);
  const converted = Math.round(item.normalized || item.value);
  console.log(`  ${item.name}: ${converted} ${item.normalizedUnit}`);
  console.log(`    (was ${original?.value} ${original?.unit})`);
});

console.log("\n📈 Conversion Factors Used:");
console.log("  • Quarterly → Monthly: ÷3 (3 months per quarter)");
console.log("  • Annual → Monthly: ÷12 (12 months per year)");
console.log("  • Weekly → Monthly: ×4.33 (52 weeks ÷ 12 months)");
console.log("  • Daily → Monthly: ×30.44 (365.25 days ÷ 12 months)");

console.log("\n🎯 Benefits:");
console.log("  ✅ Consistent time periods for comparison");
console.log("  ✅ Accurate conversion factors");
console.log("  ✅ Automatic detection and conversion");
console.log("  ✅ Works with wages, revenue, expenses, etc.");

console.log("\n💡 Usage in Your Application:");
console.log(`
// Configure econify pipeline - set monthly reporting
const options = {
  targetCurrency: 'USD',
  targetMagnitude: 'millions',
  targetTimeScale: 'month', // 🆕 Standardize all data to monthly
  minQualityScore: 30,
  inferUnits: true,
};

// All your mixed time period data becomes monthly
const result = await processEconomicData(data, options);
`);
