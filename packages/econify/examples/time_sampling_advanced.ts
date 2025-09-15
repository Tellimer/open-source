/**
 * Example demonstrating advanced time sampling for wages data
 */

import {
  convertWageTimeScale,
  processWageTimeSeries,
  resampleTimeSeries,
  simpleTimeConversion,
  type TimeSeries,
} from "../src/time/time-sampling.ts";

/**
 * Demonstrate current vs enhanced time conversion
 */
export function demonstrateTimeConversions() {
  console.log("🕐 Time Conversion Examples\n");

  // Example 1: Simple ratio-based conversion (current implementation)
  console.log("📊 Simple Ratio-Based Conversion:");
  const hourlyWage = 25; // $25/hour
  const monthlySimple = simpleTimeConversion(hourlyWage, "hour", "month");
  console.log(
    `$${hourlyWage}/hour → $${
      Math.round(monthlySimple)
    }/month (simple: ${hourlyWage} × 730)`,
  );

  // Example 2: Enhanced wage-specific conversion
  console.log("\n💼 Enhanced Wage-Specific Conversion:");
  const monthlyEnhanced = convertWageTimeScale(
    hourlyWage,
    "hour",
    "month",
    "hourly",
  );
  console.log(
    `$${hourlyWage}/hour → $${
      Math.round(monthlyEnhanced)
    }/month (enhanced: ${hourlyWage} × 173.33 work hours)`,
  );

  // Example 3: Different wage types
  console.log("\n🔄 Different Wage Type Handling:");
  const salaryHourly = convertWageTimeScale(
    hourlyWage,
    "hour",
    "year",
    "salary",
  );
  const wageHourly = convertWageTimeScale(hourlyWage, "hour", "year", "hourly");
  console.log(
    `Salary basis: $${hourlyWage}/hour → $${
      Math.round(salaryHourly)
    }/year (24/7 basis)`,
  );
  console.log(
    `Hourly basis: $${hourlyWage}/hour → $${
      Math.round(wageHourly)
    }/year (2080 work hours)`,
  );

  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Demonstrate time series upsampling and downsampling
 */
export function demonstrateTimeSeries() {
  console.log("📈 Time Series Sampling Examples\n");

  // Example 1: Upsampling yearly to monthly
  console.log("📊 Upsampling (Yearly → Monthly):");
  const yearlyWages: TimeSeries[] = [
    { date: new Date("2022-01-01"), value: 50000 },
    { date: new Date("2023-01-01"), value: 52000 },
    { date: new Date("2024-01-01"), value: 54000 },
  ];

  const monthlyUpsampled = resampleTimeSeries(yearlyWages, "month", {
    method: "linear",
  });

  console.log(`Original: ${yearlyWages.length} yearly points`);
  console.log(`Upsampled: ${monthlyUpsampled.length} monthly points`);
  console.log("Sample interpolated values:");
  monthlyUpsampled.slice(0, 6).forEach((point) => {
    console.log(
      `  ${point.date.toISOString().slice(0, 7)}: $${Math.round(point.value)}`,
    );
  });

  // Example 2: Downsampling daily to monthly
  console.log("\n📉 Downsampling (Daily → Monthly):");
  const dailyWages: TimeSeries[] = [];
  for (let i = 0; i < 30; i++) {
    dailyWages.push({
      date: new Date(2024, 0, i + 1),
      value: 200 + Math.sin(i / 5) * 20, // Simulate daily variation
    });
  }

  const monthlyDownsampled = resampleTimeSeries(dailyWages, "month", {
    method: "average",
  });

  console.log(`Original: ${dailyWages.length} daily points`);
  console.log(`Downsampled: ${monthlyDownsampled.length} monthly points`);
  console.log(
    `Average daily wage: $${Math.round(monthlyDownsampled[0].value)}`,
  );

  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Demonstrate processing mixed wage frequencies
 */
export function demonstrateMixedWageProcessing() {
  console.log("🌍 Mixed Wage Frequency Processing\n");

  // Your actual wages data with mixed time periods
  const mixedWages = [
    {
      date: new Date("2024-01-01"),
      value: 29.68,
      unit: "CAD/Hour",
      country: "CAN",
    },
    {
      date: new Date("2024-01-01"),
      value: 1432.6,
      unit: "AUD/Week",
      country: "AUS",
    },
    {
      date: new Date("2024-01-01"),
      value: 297624,
      unit: "AMD/Month",
      country: "ARM",
    },
    {
      date: new Date("2024-01-01"),
      value: 124110,
      unit: "CNY/Year",
      country: "CHN",
    },
    {
      date: new Date("2024-01-01"),
      value: 46924,
      unit: "CZK/Month",
      country: "CZE",
    },
  ];

  console.log("📋 Original Mixed Frequencies:");
  mixedWages.forEach((wage) => {
    console.log(`${wage.country}: ${wage.value.toLocaleString()} ${wage.unit}`);
  });

  // Process to standardize all to monthly
  const standardizedWages = processWageTimeSeries(mixedWages, "month");

  console.log("\n✅ Standardized to Monthly:");
  standardizedWages.forEach((wage) => {
    console.log(
      `${wage.country}: ${
        Math.round(wage.value).toLocaleString()
      } ${wage.unit}`,
    );
  });

  // Show the conversion factors used
  console.log("\n🔢 Conversion Factors Applied:");
  for (let i = 0; i < mixedWages.length; i++) {
    const original = mixedWages[i];
    const converted = standardizedWages[i];
    const factor = converted.value / original.value;
    console.log(
      `${original.country}: ×${
        factor.toFixed(2)
      } (${original.unit} → ${converted.unit})`,
    );
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Demonstrate different sampling methods
 */
export function demonstrateSamplingMethods() {
  console.log("🎯 Different Sampling Methods\n");

  // Create sample daily wage data with variation
  const dailyData: TimeSeries[] = [];
  for (let i = 0; i < 7; i++) {
    dailyData.push({
      date: new Date(2024, 0, i + 1),
      value: 200 + i * 10, // Increasing wages: 200, 210, 220, etc.
    });
  }

  console.log("📊 Original Daily Data:");
  dailyData.forEach((point) => {
    console.log(`  ${point.date.toISOString().slice(5, 10)}: $${point.value}`);
  });

  // Test different downsampling methods
  const methods = [
    "average",
    "sum",
    "end_of_period",
    "start_of_period",
  ] as const;

  console.log("\n🔄 Weekly Aggregation Methods:");
  methods.forEach((method) => {
    const result = resampleTimeSeries(dailyData, "week", { method });
    console.log(`${method.padEnd(15)}: $${Math.round(result[0].value)}`);
  });

  console.log("\n📝 Method Explanations:");
  console.log("average        : Mean of all daily values");
  console.log("sum           : Total of all daily values");
  console.log("end_of_period : Last day's value");
  console.log("start_of_period: First day's value");

  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Show practical use cases for different sampling methods
 */
export function demonstrateUseCases() {
  console.log("💡 Practical Use Cases\n");

  console.log("🏭 Manufacturing Wages:");
  console.log("  • Hourly → Monthly: Use work hours (2080/year)");
  console.log("  • Daily → Weekly: Use 'sum' for total weekly pay");
  console.log("  • Monthly → Quarterly: Use 'average' for typical wage");

  console.log("\n💼 Salary Data:");
  console.log("  • Annual → Monthly: Simple division by 12");
  console.log("  • Quarterly → Annual: Use 'sum' for total compensation");
  console.log("  • Weekly → Monthly: Use 'average' for typical monthly");

  console.log("\n📊 Economic Analysis:");
  console.log("  • High frequency → Low: Use 'average' for trends");
  console.log("  • Low frequency → High: Use 'linear' interpolation");
  console.log("  • Seasonal data: Consider 'preserveSeasonality' option");

  console.log("\n⚠️  Important Considerations:");
  console.log("  • Hourly wages: Distinguish work hours vs calendar hours");
  console.log("  • Seasonal work: Account for varying work periods");
  console.log("  • Currency conversion: Apply before time conversion");
  console.log("  • Missing data: Use 'fillMissing' option appropriately");

  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Run all demonstrations
 */
export function runAllDemonstrations() {
  console.log("🚀 Advanced Time Sampling for Wages Data\n");
  console.log("=".repeat(60) + "\n");

  demonstrateTimeConversions();
  demonstrateTimeSeries();
  demonstrateMixedWageProcessing();
  demonstrateSamplingMethods();
  demonstrateUseCases();

  console.log("✅ All demonstrations complete!");
}

// Run demonstrations if this file is executed directly
if (import.meta.main) {
  runAllDemonstrations();
}
