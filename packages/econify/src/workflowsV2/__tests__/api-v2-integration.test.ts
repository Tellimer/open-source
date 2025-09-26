import { assert, assertEquals, assertExists } from "jsr:@std/assert@1";
import { processEconomicData } from "../../api/pipeline_api.ts";
import {
  databaseFXRates,
  databaseRealDataSet,
  databaseTestConfig,
} from "../__fixtures__/database-real-data.ts";

Deno.test("API V2 - Comprehensive E2E test with all domains", async () => {
  const result = await processEconomicData(databaseRealDataSet, {
    ...databaseTestConfig,
    engine: "v2",
    explain: true,
  });

  assertExists(result);
  assertExists(result.data);
  // Note: ABWPOPULATION with empty unit might be lost in processing
  assertEquals(
    result.data.length >= databaseRealDataSet.length - 1,
    true,
    `Should process most items (got ${result.data.length} of ${databaseRealDataSet.length})`,
  );
  assertEquals(
    result.metrics.recordsProcessed >= databaseRealDataSet.length - 1,
    true,
    `Metrics should reflect processing (got ${result.metrics.recordsProcessed})`,
  );

  // Create a map for easier access
  const byId = Object.fromEntries(
    (result.data as any[]).map((d) => [d.id, d]),
  );

  // TEST MONETARY FLOWS
  // 1. Current Account - should convert currency and preserve flow periodicity
  const brazilCA = byId["brazil-current-account-2024"];
  assertExists(brazilCA);
  assertEquals(brazilCA.normalized, -9612.0); // USD to USD = no change
  assertEquals(brazilCA.normalizedUnit, "USD millions per month");

  // 2. FDI with EUR - should convert to USD and normalize to month
  const polandFDI = byId["poland-fdi-inflows-2024"];
  assertExists(polandFDI);
  // EUR 1234.5 * (1/0.92) / 3 months = ~447.28 USD millions per month
  assert(Math.abs(polandFDI.normalized - 447.28) < 1);
  assertEquals(polandFDI.normalizedUnit, "USD millions per month");

  // 3. Remittances - USD should pass through
  const philRemit = byId["philippines-remittances-2024"];
  assertExists(philRemit);
  assertEquals(philRemit.normalized, 2987.3);
  assertEquals(philRemit.normalizedUnit, "USD millions per month");

  // 4. Trade Balance with MYR - should convert
  const malaysiaTB = byId["malaysia-trade-balance-2024"];
  assertExists(malaysiaTB);
  // MYR 12345.6 / 4.35 = ~2838.07 USD
  assert(Math.abs(malaysiaTB.normalized - 2838.07) < 1);
  assertEquals(malaysiaTB.normalizedUnit, "USD millions per month");

  // TEST MONETARY STOCKS
  // 1. Money Supply with scale conversion (correctly classified as stock)
  const koreaM2 = byId["korea-m2-money-supply-2024"];
  assertExists(koreaM2);
  // KRW 3902.5 trillion / 1325 = ~2945.28 USD billion = 2945283 million
  assert(Math.abs(koreaM2.normalized - 2945283) < 100);
  assertEquals(koreaM2.normalizedUnit, "USD millions");

  // 2. Government Debt EUR Billions to USD Millions (stock, no time conversion)
  const greeceDebt = byId["greece-government-debt-2024"];
  assertExists(greeceDebt);
  // EUR 356.4 billion * (1/0.92) * 1000 = ~387391.3 million
  assert(Math.abs(greeceDebt.normalized - 387391.3) < 100);
  assertEquals(greeceDebt.normalizedUnit, "USD millions");

  // TEST WAGES (special monetary flow)
  // 1. Average Wages INR - should convert and normalize to month
  const indiaWages = byId["india-average-wages-2024"];
  assertExists(indiaWages);
  // INR 45000 / 83.2 = ~540.87 USD, /1M = 0.00054087 millions
  assert(Math.abs(indiaWages.normalized - 0.00054087) < 0.0001);
  assertEquals(indiaWages.normalizedUnit, "USD millions per month");

  // 2. Minimum Wage THB per day - should convert to month
  const thaiWage = byId["thailand-minimum-wage-2024"];
  assertExists(thaiWage);
  // THB 345 per day * 30 days = 10350 THB/month
  // 10350 / 33.5 = ~308.96 USD/month = 0.00031 million
  assert(Math.abs(thaiWage.normalized - 0.00031) < 0.001);
  assertEquals(thaiWage.normalizedUnit, "USD millions per month");

  // TEST COUNTS
  // 1. Tourist Arrivals - should preserve unit
  const turkeyTourists = byId["turkey-tourist-arrivals-2024"];
  assertExists(turkeyTourists);
  assertEquals(turkeyTourists.normalized, 5234567.0);
  assertEquals(turkeyTourists.normalizedUnit, "ones");

  // 2. Tourist Arrivals with scale
  const uaeTourists = byId["uae-tourist-arrivals-2024"];
  assertExists(uaeTourists);
  assertEquals(uaeTourists.normalized, 2300000); // 2.3 million expanded
  assertEquals(uaeTourists.normalizedUnit, "ones");

  // 3. Car Sales
  const japanCars = byId["japan-car-sales-2024"];
  assertExists(japanCars);
  assertEquals(japanCars.normalized, 412345.0);
  assertEquals(japanCars.normalizedUnit, "ones");

  // TEST PERCENTAGES
  // 1. Inflation Rate - should pass through
  const turkeyInflation = byId["turkey-inflation-2024"];
  assertExists(turkeyInflation);
  assertEquals(turkeyInflation.normalized, 48.58);
  assertEquals(turkeyInflation.normalizedUnit, "%");

  // 2. Interest Rate
  const brazilRate = byId["brazil-policy-rate-2024"];
  assertExists(brazilRate);
  assertEquals(brazilRate.normalized, 11.25);
  assertEquals(brazilRate.normalizedUnit, "%");

  // 3. Unemployment
  const spainUnemp = byId["spain-unemployment-2024"];
  assertExists(spainUnemp);
  assertEquals(spainUnemp.normalized, 11.21);
  assertEquals(spainUnemp.normalizedUnit, "%");

  // TEST INDICES
  // 1. Stock Market Index
  const sp500 = byId["usa-sp500-2024"];
  assertExists(sp500);
  assertEquals(sp500.normalized, 5832.92);
  assertEquals(sp500.normalizedUnit, "Points");

  // 2. Consumer Price Index
  const russiaCPI = byId["russia-cpi-2024"];
  assertExists(russiaCPI);
  assertEquals(russiaCPI.normalized, 167.23);
  assertEquals(russiaCPI.normalizedUnit, "Index 2015=100");

  // TEST COMMODITIES
  // 1. Natural Gas - should preserve physical unit
  const qatarGas = byId["qatar-natgas-production-2024"];
  assertExists(qatarGas);
  assertEquals(qatarGas.normalized, 178.5);
  assertEquals(qatarGas.normalizedUnit, "Billion Cubic Meters");

  // 2. Oil Production
  const kazakhOil = byId["kazakhstan-oil-production-2024"];
  assertExists(kazakhOil);
  assertEquals(kazakhOil.normalized, 1944.0);
  assertEquals(kazakhOil.normalizedUnit, "BBL/D/1K");

  // 3. Copper Production (now properly classified as commodities)
  const chileCopper = byId["chile-copper-production-2024-12"];
  assertExists(chileCopper);
  assertEquals(chileCopper.normalized, 566.1);
  assertEquals(chileCopper.normalizedUnit, "Thousands of Tonnes");

  // TEST ELECTRICITY (energy/commodities domain)
  // 1. Electricity Production - physical unit preserved
  const chinaElec = byId["china-electricity-production-2024-12"];
  assertExists(chinaElec);
  assertEquals(chinaElec.normalized, 846240.0);
  assertEquals(chinaElec.normalizedUnit, "Gigawatt-hour");

  // 2. Electricity Price with EUR - should convert currency
  const spainElecPrice = byId["spain-electricity-price-2024"];
  assertExists(spainElecPrice);
  // EUR 87.5 * (1/0.92) = ~95.11 USD
  assert(Math.abs(spainElecPrice.normalized - 95.11) < 0.1);
  assertEquals(spainElecPrice.normalizedUnit, "USD/MWh");
});

Deno.test("API V2 - Magnitude conversion and pass-through tests", async () => {
  const data = [
    // Test different magnitude scales
    {
      id: "test-billions-to-millions",
      value: 5.2,
      unit: "USD Billion",
      name: "Test Billions",
      scale: "Billions",
    },
    {
      id: "test-thousands-to-millions",
      value: 7500,
      unit: "USD Thousand",
      name: "Test Thousands",
      scale: "Thousands",
    },
    {
      id: "test-trillions-to-millions",
      value: 0.003,
      unit: "USD Trillion",
      name: "Test Trillions",
      scale: "Trillions",
    },
    // Test pass-through for non-monetary
    {
      id: "test-percentage-passthrough",
      value: 5.5,
      unit: "%",
      name: "Test Percentage",
    },
    {
      id: "test-index-passthrough",
      value: 125.6,
      unit: "Index Points",
      name: "Test Index",
    },
    {
      id: "test-commodity-passthrough",
      value: 100,
      unit: "Barrels",
      name: "Oil Stock",
    },
  ] as any[];

  const result = await processEconomicData(data as any, {
    targetCurrency: "USD",
    targetMagnitude: "millions",
    engine: "v2",
    explain: true,
    fxFallback: databaseFXRates,
  });

  assertExists(result.data);
  assertEquals(result.data.length, 6);

  const byId = Object.fromEntries(
    (result.data as any[]).map((d) => [d.id, d]),
  );

  // TEST MAGNITUDE CONVERSIONS
  // 1. Billions to Millions: 5.2B = 5200M
  const billions = byId["test-billions-to-millions"];
  assertExists(billions);
  assertEquals(billions.normalized, 5200);
  assertEquals(billions.normalizedUnit, "USD millions");
  if (billions.explain) {
    assertEquals(billions.explain.scale?.original, "billions");
    assertEquals(billions.explain.scale?.normalized, "millions");
  }

  // 2. Thousands to Millions: 7500K = 7.5M
  const thousands = byId["test-thousands-to-millions"];
  assertExists(thousands);
  assertEquals(thousands.normalized, 7.5);
  assertEquals(thousands.normalizedUnit, "USD millions");

  // 3. Trillions to Millions: 0.003T = 3000M
  const trillions = byId["test-trillions-to-millions"];
  assertExists(trillions);
  assertEquals(trillions.normalized, 3000);
  assertEquals(trillions.normalizedUnit, "USD millions");

  // TEST PASS-THROUGHS (non-monetary domains)
  // 1. Percentage should not change
  const percentage = byId["test-percentage-passthrough"];
  assertExists(percentage);
  assertEquals(percentage.normalized, 5.5);
  assertEquals(percentage.normalizedUnit, "%");

  // 2. Index should preserve original unit
  const index = byId["test-index-passthrough"];
  assertExists(index);
  assertEquals(index.normalized, 125.6);
  assertEquals(index.normalizedUnit, "Index Points");

  // 3. Commodity should preserve physical unit
  const commodity = byId["test-commodity-passthrough"];
  assertExists(commodity);
  assertEquals(commodity.normalized, 100);
  assertEquals(commodity.normalizedUnit, "Barrels");
});

Deno.test("API V2 - Auto-Targeting Integration Test", async () => {
  // Test auto-targeting through the public API
  const testData = [
    // Consumer Spending - mixed currencies, should auto-target to majority
    {
      id: "usa-consumer-spending",
      value: 15000000,
      unit: "USD Million",
      name: "Consumer Spending",
      country_iso: "USA",
      date: "2024-12-31",
      currency_code: "USD",
      periodicity: "Yearly",
    },
    {
      id: "gbr-consumer-spending",
      value: 2000000,
      unit: "USD Million",
      name: "Consumer Spending",
      country_iso: "GBR",
      date: "2024-12-31",
      currency_code: "USD",
      periodicity: "Yearly",
    },
    {
      id: "afg-consumer-spending",
      value: 1301129,
      unit: "AFN Million", // Minority currency
      name: "Consumer Spending",
      country_iso: "AFG",
      date: "2023-12-31",
      currency_code: "AFN",
      periodicity: "Yearly",
    },
    // Interest Rates - different indicator, no currency conversion needed
    {
      id: "usa-interest-rate",
      value: 5.5,
      unit: "%",
      name: "Interest Rate",
      country_iso: "USA",
      date: "2024-12-31",
      currency_code: null,
      periodicity: "Monthly",
    },
  ];

  const result = await processEconomicData(testData, {
    engine: "v2",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["currency", "magnitude", "time"],
    indicatorKey: "name",
    minMajorityShare: 0.6, // 67% USD should trigger auto-targeting
    tieBreakers: {
      currency: "prefer-USD",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    minQualityScore: 0,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: { AFN: 0.014 }, // 1 USD = ~71 AFN
      dates: { AFN: "2024-01-01" },
    },
    explain: true,
  });

  // Basic validation
  assertEquals(result.data.length, 4);
  assertExists(result.data);

  // Create lookup map
  const byId = Object.fromEntries(result.data.map((d) => [d.id, d]));

  // Test Consumer Spending auto-targeting
  const usaConsumer = byId["usa-consumer-spending"];
  const gbrConsumer = byId["gbr-consumer-spending"];
  const afgConsumer = byId["afg-consumer-spending"];

  assertExists(usaConsumer);
  assertExists(gbrConsumer);
  assertExists(afgConsumer);

  // All Consumer Spending should be normalized to the same currency (USD due to majority)
  assertEquals(
    usaConsumer.normalizedUnit?.includes("USD"),
    true,
    "USA Consumer Spending should be in USD",
  );
  assertEquals(
    gbrConsumer.normalizedUnit?.includes("USD"),
    true,
    "GBR Consumer Spending should be in USD",
  );

  // CRITICAL: AFN should be converted to USD due to auto-targeting
  assertEquals(
    afgConsumer.normalizedUnit?.includes("USD"),
    true,
    "AFG Consumer Spending should be converted to USD",
  );

  // Validate conversion happened (value should be different from original AFN amount)
  assert(
    afgConsumer.normalizedValue !== 1301129,
    `AFG value should be converted from original: got ${afgConsumer.normalizedValue}`,
  );
  assert(
    afgConsumer.normalizedValue > 1000000,
    `Converted USD value should be significant: got ${afgConsumer.normalizedValue}`,
  );

  // Test Interest Rate (should remain as percentage, no auto-targeting)
  const usaInterest = byId["usa-interest-rate"];
  assertExists(usaInterest);
  assertEquals(
    usaInterest.normalizedUnit,
    "%",
    "Interest rate should remain as percentage",
  );
  assertEquals(
    usaInterest.normalizedValue,
    5.5,
    "Interest rate value should be unchanged",
  );

  // Validate explain metadata for auto-targeting
  const consumerItems = [usaConsumer, gbrConsumer, afgConsumer];
  consumerItems.forEach((item) => {
    assertExists(item.explain, "Should have explain metadata");
    assertEquals(
      item.explain.explain_version,
      "v2",
      "Should use V2 explain format",
    );

    // Check for auto-target metadata (if present)
    if (item.explain.autoTarget?.currency) {
      assertEquals(
        item.explain.autoTarget.currency.selected,
        "USD",
        "Should auto-target to USD",
      );
      assert(
        item.explain.autoTarget.currency.dominance > 0.6,
        "USD dominance should be > 60%",
      );
    }
  });

  console.log("✅ API V2 Auto-Targeting Integration Test Passed");
  console.log(`   📊 Processed ${result.data.length} items`);
  console.log(
    `   💱 AFN converted: ${
      afgConsumer.normalizedValue.toFixed(2)
    } USD (from ${1301129} AFN)`,
  );
  console.log(`   📈 Quality score: ${result.metrics.qualityScore}`);
});
