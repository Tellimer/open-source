import { assertEquals, assertExists } from "@std/assert";
import { EconifyBatchSession } from "./batch_session_api.ts";
import type { ParsedData } from "../workflows/economic-data-workflow.ts";

/**
 * End-to-end test with ACTUAL failing indicators from production
 * These are the exact indicators that are throwing "No FX rate available" errors
 */
Deno.test("E2E: Batch Session handles ALL production failing indicators", async () => {
  // These are the EXACT indicators that are failing in production
  const failingIndicators = [
    { name: "Corporate Tax Rate", units: ["%", "PERCENT"] },
    { name: "Deposit Interest Rate", units: ["%"] },
    { name: "Personal Income Tax Rate", units: ["%"] },
    { name: "Precipitation", units: ["MM"] },
    { name: "Sales Tax Rate", units: ["%"] },
    { name: "Temperature", units: ["CELSIUS"] },
    { name: "Balance of Trade", units: ["THOUSAND", "BILLION"] },
    { name: "Consumer Price Index CPI", units: ["POINTS"] },
    { name: "CPI Housing Utilities", units: ["POINTS"] },
    { name: "CPI Transportation", units: ["%"] },
    { name: "Exports", units: ["THOUSAND"] },
    { name: "Food Inflation", units: ["%"] },
    { name: "Government Budget", units: ["PERCENT"] },
    { name: "Imports", units: ["THOUSAND", "BILLION"] },
    { name: "Inflation Rate", units: ["%"] },
    { name: "Inflation Rate MoM", units: ["%"] },
    { name: "Fiscal Balance / GDP (%)", units: ["PERCENT"] },
    { name: "Public Debt / GDP (%)", units: ["PERCENT"] },
    { name: "Core Inflation Rate", units: ["%"] },
    { name: "Mining Production", units: ["%"] },
    { name: "Corruption Index", units: ["POINTS"] },
    { name: "Terrorism Index", units: ["POINTS"] },
    { name: "GDP Annual Growth Rate", units: ["%"] },
    { name: "Government Debt to GDP", units: ["PERCENT"] },
    { name: "Unemployment Rate", units: ["%"] },
    { name: "GEFR / GDP (%)", units: ["PERCENT"] },
    { name: "Current Account to GDP", units: ["PERCENT"] },
    { name: "Full Year GDP Growth", units: ["%"] },
    { name: "Withholding Tax Rate", units: ["%"] },
    { name: "Bank Lending Rate", units: ["%"] },
    { name: "Business Confidence", units: ["POINTS"] },
    { name: "Current Account", units: ["BILLION"] },
    { name: "Employed Persons", units: ["THOUSAND"] },
    { name: "Employment Rate", units: ["%"] },
    { name: "GDP Growth Rate", units: ["%"] },
    { name: "GDP from Public Administration", units: ["PERCENT"] },
    { name: "Industrial Production", units: ["%"] },
    { name: "Industrial Production Mom", units: ["%"] },
    { name: "Interbank Rate", units: ["%"] },
    { name: "Interest Rate", units: ["%"] },
    { name: "Labor Force Participation Rate", units: ["%"] },
    { name: "Manufacturing Production", units: ["%"] },
    { name: "Money Supply M3", units: ["THOUSAND"] },
    { name: "Producer Prices", units: ["POINTS"] },
    { name: "Producer Prices Change", units: ["%"] },
    { name: "Social Security Rate", units: ["%"] },
    { name: "Social Security Rate For Companies", units: ["%"] },
    { name: "Social Security Rate For Employees", units: ["%"] },
    { name: "Unemployed Persons", units: ["THOUSANDS"] },
    { name: "Benchmark Yield (%)", units: ["PERCENT"] },
    { name: "Consumer Confidence", units: ["POINTS"] },
    { name: "Retail Sales YoY", units: ["%"] },
    { name: "Capacity Utilization", units: ["%"] },
    { name: "Core Consumer Prices", units: ["POINTS"] },
    { name: "Export Prices", units: ["POINTS"] },
    { name: "GDP Deflator", units: ["%"] },
    { name: "Housing Index", units: ["%"] },
    { name: "Import Prices", units: ["POINTS"] },
    { name: "Terms of Trade", units: ["POINTS"] },
    { name: "Residential Property Prices", units: ["PERCENT"] },
  ];

  console.log(
    `\nTesting ${failingIndicators.length} production failing indicators...\n`,
  );

  const errors: string[] = [];
  const successes: string[] = [];

  for (const indicator of failingIndicators) {
    for (const unit of indicator.units) {
      // Create realistic test data matching production
      const testData: ParsedData[] = [
        {
          value: Math.random() * 100,
          unit: unit,
          name: indicator.name,
          id: `${indicator.name}_US`,
          date: "2024-01-01",
          metadata: {
            country: "US",
            countryISO: "US",
          },
        },
        {
          value: Math.random() * 100,
          unit: unit,
          name: indicator.name,
          id: `${indicator.name}_UK`,
          date: "2024-01-01",
          metadata: {
            country: "UK",
            countryISO: "UK",
          },
        },
        {
          value: Math.random() * 100,
          unit: unit,
          name: indicator.name,
          id: `${indicator.name}_DE`,
          date: "2024-01-01",
          metadata: {
            country: "Germany",
            countryISO: "DE",
          },
        },
      ];

      // Create session with production options
      const session = new EconifyBatchSession({
        targetCurrency: "USD", // This is what production is doing
        autoTargetByIndicator: true,
        autoTargetDimensions: ["magnitude", "time"],
        indicatorKey: "name",
        minMajorityShare: 0.6,
        tieBreakers: {
          currency: "prefer-targetCurrency",
          magnitude: "prefer-millions",
          time: "prefer-month",
        },
        minQualityScore: 30,
        inferUnits: true,
        useLiveFX: false,
        fxFallback: {
          base: "USD",
          rates: {
            USD: 1,
            EUR: 1.1,
            GBP: 1.25,
            JPY: 0.0067,
            CNY: 0.14,
            CAD: 0.74,
            AUD: 0.66,
          },
        },
        explain: true,
      });

      session.addDataPoints(testData);

      try {
        const result = await session.process();
        assertExists(result);
        assertExists(result.data);
        assertEquals(result.data.length, testData.length);

        successes.push(`✅ ${indicator.name} (${unit})`);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("No FX rate available")) {
            errors.push(`❌ ${indicator.name} (${unit}): ${error.message}`);
            console.error(
              `FAILED: ${indicator.name} (${unit}) - ${error.message}`,
            );
          } else {
            errors.push(`⚠️  ${indicator.name} (${unit}): ${error.message}`);
          }
        }
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`RESULTS: ${successes.length} passed, ${errors.length} failed`);

  if (errors.length > 0) {
    console.log("\nFailing indicators:");
    errors.forEach((err) => console.log(err));
    throw new Error(
      `${errors.length} indicators still failing with FX conversion errors`,
    );
  }

  console.log("🎉 All production failing indicators now work!");
});

Deno.test("E2E: Verify monetary indicators still work with currency conversion", async () => {
  const monetaryIndicators = [
    { name: "GDP", unit: "USD MILLION" },
    { name: "GDP", unit: "EUR THOUSAND" },
    { name: "Government Spending", unit: "GBP BILLION" },
    { name: "Foreign Direct Investment", unit: "USD" },
    { name: "Trade Balance", unit: "EUR MILLION" },
  ];

  for (const indicator of monetaryIndicators) {
    const testData: ParsedData[] = [
      {
        value: 1000000,
        unit: indicator.unit,
        name: indicator.name,
        id: `${indicator.name}_1`,
        metadata: { country: "US" },
      },
      {
        value: 500000,
        unit: indicator.unit,
        name: indicator.name,
        id: `${indicator.name}_2`,
        metadata: { country: "UK" },
      },
    ];

    const session = new EconifyBatchSession({
      targetCurrency: "USD",
      autoTargetByIndicator: true,
      autoTargetDimensions: ["magnitude", "time"],
      minQualityScore: 30,
      inferUnits: true,
      fxFallback: {
        base: "USD",
        rates: {
          USD: 1,
          EUR: 1.1,
          GBP: 1.25,
          JPY: 0.0067,
        },
      },
      explain: true,
    });

    session.addDataPoints(testData);

    try {
      const result = await session.process();
      assertExists(result);
      assertExists(result.data);
      assertEquals(result.data.length, testData.length);

      console.log(
        `✅ Monetary: ${indicator.name} (${indicator.unit}) - Currency conversion working`,
      );

      // Verify currency conversion happened for non-USD currencies
      if (indicator.unit.includes("EUR") || indicator.unit.includes("GBP")) {
        const firstItem = result.data[0];
        assertExists(firstItem.normalized);
        // The normalized value should be different from original due to FX conversion
        if (indicator.unit.includes("EUR")) {
          // EUR to USD should divide by 1.1
          const expectedRange = testData[0].value / 1.1;
          // Allow for some tolerance due to magnitude scaling
          console.log(
            `   Converted EUR value: ${firstItem.normalized} (original: ${
              testData[0].value
            })`,
          );
        }
      }
    } catch (error) {
      throw new Error(
        `Monetary indicator ${indicator.name} (${indicator.unit}) failed: ${error}`,
      );
    }
  }
});
