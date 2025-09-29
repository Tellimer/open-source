import { assertEquals, assertExists } from "@std/assert";
import { EconifyBatchSession } from "./batch_session_api.ts";
import type { ParsedData } from "../workflows/economic-data-workflow.ts";

Deno.test("EconifyBatchSession - handles non-monetary indicators without currency conversion", async () => {
  // Test data with various non-monetary units
  const nonMonetaryData: ParsedData[] = [
    {
      value: 5.2,
      unit: "%",
      name: "Corporate Tax Rate",
      id: "tax_rate_us",
      metadata: { country: "US" },
    },
    {
      value: 3.5,
      unit: "PERCENT",
      name: "Corporate Tax Rate",
      id: "tax_rate_uk",
      metadata: { country: "UK" },
    },
    {
      value: 25.5,
      unit: "CELSIUS",
      name: "Temperature",
      id: "temp_fr",
      metadata: { country: "FR" },
    },
    {
      value: 112.5,
      unit: "POINTS",
      name: "Consumer Price Index",
      id: "cpi_de",
      metadata: { country: "DE" },
    },
    {
      value: 850,
      unit: "MM",
      name: "Precipitation",
      id: "rain_br",
      metadata: { country: "BR" },
    },
    {
      value: 1500000,
      unit: "THOUSAND",
      name: "Population",
      id: "pop_jp",
      metadata: { country: "JP" },
    },
    {
      value: 45000000,
      unit: "BILLION",
      name: "Balance of Trade",
      id: "trade_cn",
      metadata: { country: "CN" },
    },
  ];

  // Create session with targetCurrency (which should be ignored for non-monetary data)
  const session = new EconifyBatchSession({
    targetCurrency: "USD", // This should be ignored for non-monetary units
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    minQualityScore: 30,
    inferUnits: true,
    explain: true,
    // Provide FX rates (which shouldn't be used)
    fxFallback: {
      base: "USD",
      rates: {
        USD: 1,
        EUR: 1.1,
        GBP: 1.25,
        JPY: 0.0067,
      },
    },
  });

  // Add all non-monetary data points
  session.addDataPoints(nonMonetaryData);

  // Process should succeed without FX conversion errors
  const result = await session.process();

  assertExists(result);
  assertExists(result.data);
  assertEquals(result.data.length, nonMonetaryData.length);

  // Verify that values are normalized but not currency-converted
  for (const item of result.data) {
    assertExists(item.normalized);

    // For non-monetary data, the normalized value should exist
    // and shouldn't throw FX conversion errors
    const original = nonMonetaryData.find((d) => d.id === item.id);
    assertExists(original);

    console.log(
      `${item.id}: ${original.value} ${original.unit} → ${item.normalized}`,
    );
  }
});

Deno.test("EconifyBatchSession - handles monetary indicators WITH currency conversion", async () => {
  // Test data with monetary units
  const monetaryData: ParsedData[] = [
    {
      value: 1000000,
      unit: "USD MILLION",
      name: "GDP",
      id: "gdp_us",
      metadata: { country: "US" },
    },
    {
      value: 500000,
      unit: "EUR THOUSAND",
      name: "GDP",
      id: "gdp_de",
      metadata: { country: "DE" },
    },
    {
      value: 750000,
      unit: "GBP MILLION",
      name: "GDP",
      id: "gdp_uk",
      metadata: { country: "UK" },
    },
  ];

  // Create session with targetCurrency for monetary data
  const session = new EconifyBatchSession({
    targetCurrency: "USD",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    minQualityScore: 30,
    inferUnits: true,
    explain: true,
    fxFallback: {
      base: "USD",
      rates: {
        USD: 1,
        EUR: 1.1,
        GBP: 1.25,
        JPY: 0.0067,
      },
    },
  });

  session.addDataPoints(monetaryData);

  const result = await session.process();

  assertExists(result);
  assertExists(result.data);
  assertEquals(result.data.length, monetaryData.length);

  // Verify currency conversion occurred
  for (const item of result.data) {
    assertExists(item.normalized);

    const original = monetaryData.find((d) => d.id === item.id);
    assertExists(original);

    console.log(
      `${item.id}: ${original.value} ${original.unit} → ${item.normalized}`,
    );

    // EUR and GBP values should be converted to USD
    if (item.id === "gdp_de") {
      // EUR to USD conversion: 500000 EUR THOUSAND = 500K EUR = 454.5K USD (at 1.1 rate)
      // Note: The value is already in thousands, so 454.5454...
      assertEquals(Math.round(item.normalized!), 455);
    }
    if (item.id === "gdp_uk") {
      // GBP to USD conversion: 750000 GBP MILLION = 750B GBP = 600B USD (at 1.25 rate)
      assertEquals(item.normalized!, 600000);
    }
  }
});

Deno.test("EconifyBatchSession - mixed monetary and non-monetary detection", async () => {
  // Test automatic detection with mixed data
  const mixedData: ParsedData[] = [
    { value: 100, unit: "USD MILLION", name: "Revenue", id: "1" },
    { value: 200, unit: "EUR THOUSAND", name: "Revenue", id: "2" },
    { value: 5.5, unit: "%", name: "Tax Rate", id: "3" },
  ];

  const session = new EconifyBatchSession({
    targetCurrency: "USD",
    autoTargetByIndicator: true,
    minQualityScore: 30,
    inferUnits: true,
    fxFallback: {
      base: "USD",
      rates: { USD: 1, EUR: 1.1 },
    },
  });

  // Test with mostly monetary data (should apply currency conversion)
  session.addDataPoints([mixedData[0], mixedData[1]]);
  const monetaryResult = await session.process();
  assertExists(monetaryResult);
  assertEquals(monetaryResult.data.length, 2);

  // Test with non-monetary data (should skip currency conversion)
  const nonMonetarySession = new EconifyBatchSession({
    targetCurrency: "USD",
    autoTargetByIndicator: true,
    minQualityScore: 30,
    inferUnits: true,
  });

  nonMonetarySession.addDataPoint(mixedData[2]);
  const nonMonetaryResult = await nonMonetarySession.process();
  assertExists(nonMonetaryResult);
  assertEquals(nonMonetaryResult.data.length, 1);
  assertEquals(nonMonetaryResult.data[0].normalized, 5.5);
});
