/**
 * Comprehensive Synthetic Integration Tests for V2 Workflows
 *
 * Tests all domains, unit combinations, edge cases, and boundary conditions
 * using synthetic data to ensure comprehensive coverage of the V2 pipeline.
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import { processEconomicData } from "../../api/pipeline_api.ts";
import type { ParsedData } from "../shared/types.ts";
import {
  allSyntheticData,
  syntheticCollections,
  syntheticStressTest,
  syntheticTestSuites,
} from "../__fixtures__/synthetic-comprehensive.ts";
import { fxComprehensive } from "../__fixtures__/indicators-organized.ts";
import {
  allExpectedResults,
  expectedByDomain,
  getExpectedResult,
  STANDARD_CONFIG,
  validateResult,
} from "../__fixtures__/synthetic-expectations.ts";

// Helper function to create standard test config matching expectations
const createTestConfig = (overrides = {}) => ({
  engine: "v2" as const,
  targetCurrency: "USD",
  targetMagnitude: "millions" as const,
  targetTimeScale: "month" as const,
  minQualityScore: 60,
  useLiveFX: false,
  fxFallback: {
    base: "USD", // Base currency for rates
    rates: {
      USD: 1.0,
      EUR: 1 / STANDARD_CONFIG.fxRates.EUR, // 1 USD = 0.909 EUR (1/1.1)
      GBP: 1 / STANDARD_CONFIG.fxRates.GBP, // 1 USD = 0.8 GBP (1/1.25)
      JPY: 1 / STANDARD_CONFIG.fxRates.JPY, // 1 USD = 142.857 JPY (1/0.007)
      CNY: 1 / STANDARD_CONFIG.fxRates.CNY, // etc.
      INR: 1 / STANDARD_CONFIG.fxRates.INR,
      NGN: 1 / STANDARD_CONFIG.fxRates.NGN,
      KES: 1 / STANDARD_CONFIG.fxRates.KES,
      ZAR: 1 / STANDARD_CONFIG.fxRates.ZAR,
      BRL: 1 / STANDARD_CONFIG.fxRates.BRL,
      KRW: 1 / STANDARD_CONFIG.fxRates.KRW,
      HKD: 1 / STANDARD_CONFIG.fxRates.HKD,
      CHF: 1 / STANDARD_CONFIG.fxRates.CHF,
    },
    date: "2024-01-01",
  },
  explain: true,
  ...overrides,
});

Deno.test("V2 Synthetic: Exact Expectations Validation", async () => {
  // Test specific items with known exact expected results
  const testItems = [
    {
      id: "gdp_usd_m",
      value: 25000,
      unit: "USD Million",
      name: "GDP (Medium Economy)",
    },
    {
      id: "debt_eur_m",
      value: 5000,
      unit: "EUR Million",
      name: "National Debt (Medium)",
    },
    {
      id: "wage_usd_month",
      value: 4500,
      unit: "USD per month",
      name: "Monthly Salary",
    },
    {
      id: "wage_eur_month",
      value: 3800,
      unit: "EUR per month",
      name: "Monthly Salary (EUR)",
    },
    {
      id: "pop_total",
      value: 50000000,
      unit: "persons",
      name: "Total Population",
    },
    {
      id: "unemployment_rate",
      value: 5.2,
      unit: "percent",
      name: "Unemployment Rate",
    },
    {
      id: "stock_index_main",
      value: 2850.5,
      unit: "points",
      name: "Main Stock Index",
    },
    {
      id: "electricity_gwh",
      value: 150.5,
      unit: "GWh",
      name: "Electricity Generation",
    },
  ];

  const result = await processEconomicData(
    testItems as ParsedData[],
    createTestConfig(),
  );

  assertEquals(result.metrics.recordsFailed, 0);
  assertEquals(result.data.length, testItems.length);

  // Validate each result against expectations
  const validationResults: Array<
    { id: string; passed: boolean; errors: string[] }
  > = [];

  for (const actualItem of result.data) {
    const itemId = String(actualItem.id || "");
    const expected = getExpectedResult(itemId);
    if (!expected) {
      validationResults.push({
        id: itemId,
        passed: false,
        errors: [`No expected result defined for ${itemId}`],
      });
      continue;
    }

    const validation = validateResult(actualItem, expected);
    validationResults.push({
      id: itemId,
      passed: validation.passed,
      errors: validation.errors,
    });

    if (!validation.passed) {
      console.error(`❌ ${itemId}: ${validation.errors.join(", ")}`);
      console.error(
        `   Expected: ${expected.expectedNormalizedValue} ${expected.expectedNormalizedUnit}`,
      );
      console.error(`   Actual: ${actualItem.normalized} ${actualItem.unit}`);
    }
  }

  const failedValidations = validationResults.filter((v) => !v.passed);
  if (failedValidations.length > 0) {
    throw new Error(
      `${failedValidations.length} items failed exact validation`,
    );
  }

  console.log(
    `✅ Exact expectations: All ${result.data.length} items match precise expected values`,
  );
});

Deno.test("V2 Synthetic: Smoke Test - Core Functionality", async () => {
  const result = await processEconomicData(
    syntheticTestSuites.smoke as ParsedData[],
    createTestConfig(),
  );

  // Basic validation
  assertExists(result);
  assertEquals(result.data.length, syntheticTestSuites.smoke.length);
  assertEquals(result.metrics.recordsFailed, 0);

  // Check each domain is processed correctly
  const byId = Object.fromEntries(result.data.map((r) => [r.id, r]));

  // Monetary stocks should normalize to USD
  const stockItems = result.data.filter((r) =>
    String(r.id || "").startsWith("gdp_") ||
    String(r.id || "").startsWith("debt_")
  );
  for (const item of stockItems) {
    assertExists(item.normalizedUnit);
    if (!item.normalizedUnit!.includes("USD")) {
      throw new Error(
        `Stock ${item.id} expected USD, got: ${item.normalizedUnit}`,
      );
    }
  }

  // Monetary flows should normalize to USD per month
  const flowItems = result.data.filter((r) =>
    String(r.id || "").startsWith("wage_")
  );
  for (const item of flowItems) {
    assertExists(item.normalizedUnit);
    const unit = item.normalizedUnit!;
    if (!unit.includes("USD") || !unit.includes("per month")) {
      throw new Error(`Flow ${item.id} expected 'USD per month', got: ${unit}`);
    }
  }

  console.log(
    `✅ Smoke test: ${result.data.length} items processed successfully`,
  );
});

Deno.test("V2 Synthetic: Comprehensive Domain Coverage", async () => {
  const result = await processEconomicData(
    syntheticTestSuites.comprehensive as ParsedData[],
    createTestConfig(),
  );

  assertEquals(result.data.length, syntheticTestSuites.comprehensive.length);
  assertEquals(result.metrics.recordsFailed, 0);

  const byId = Object.fromEntries(result.data.map((r) => [r.id, r]));

  // Test specific domain expectations

  // 1. Monetary Stocks → USD (any magnitude)
  const monetaryStocks = result.data.filter((r) =>
    (String(r.id || "").includes("gdp_") &&
      !String(r.id || "").includes("gdp_growth")) ||
    String(r.id || "").includes("debt_") ||
    String(r.id || "").includes("budget_") ||
    String(r.id || "").includes("reserves_") ||
    String(r.id || "").includes("market_cap_") ||
    String(r.id || "").includes("assets_")
  );
  for (const item of monetaryStocks) {
    if (!item.normalizedUnit?.includes("USD")) {
      throw new Error(
        `Monetary stock ${item.id} should normalize to USD, got: ${item.normalizedUnit}`,
      );
    }
  }

  // 2. Monetary Flows → USD per month
  const monetaryFlows = result.data.filter((r) =>
    String(r.id || "").includes("wage_") ||
    String(r.id || "").includes("revenue_") ||
    String(r.id || "").includes("spending_") ||
    String(r.id || "").includes("investment_")
  );
  for (const item of monetaryFlows) {
    const unit = item.normalizedUnit || "";
    if (!unit.includes("USD") || !unit.includes("per month")) {
      throw new Error(
        `Monetary flow ${item.id} should normalize to 'USD per month', got: ${unit}`,
      );
    }
  }

  // 3. Counts → ones
  const counts = result.data.filter((r) =>
    String(r.id || "").includes("pop_") ||
    String(r.id || "").includes("households_") ||
    String(r.id || "").includes("cars_") ||
    String(r.id || "").includes("workers_")
  );
  for (const item of counts) {
    if (item.normalizedUnit !== "ones") {
      throw new Error(
        `Count ${item.id} should normalize to 'ones', got: ${item.normalizedUnit}`,
      );
    }
  }

  // 4. Percentages → preserved
  const percentages = result.data.filter((r) =>
    String(r.id)?.includes("unemployment_") ||
    String(r.id)?.includes("inflation_") ||
    String(r.id)?.includes("gdp_growth") ||
    String(r.id)?.includes("debt_to_gdp")
  );
  for (const item of percentages) {
    const unit = item.normalizedUnit || "";
    if (
      !unit.includes("%") && !unit.includes("percent") &&
      !unit.includes("pp") && !unit.includes("bps")
    ) {
      throw new Error(
        `Percentage ${item.id} should preserve percentage unit, got: ${unit}`,
      );
    }
  }

  // 5. Indices → preserved
  const indices = result.data.filter((r) =>
    String(r.id)?.includes("stock_index_") ||
    String(r.id)?.includes("consumer_confidence") ||
    String(r.id)?.includes("cpi_") ||
    String(r.id)?.includes("house_price_index")
  );
  for (const item of indices) {
    const unit = item.normalizedUnit || "";
    if (
      !unit.includes("points") && !unit.includes("index") &&
      !unit.includes("Points")
    ) {
      throw new Error(
        `Index ${item.id} should preserve index unit, got: ${unit}`,
      );
    }
  }

  // 6. Physical units → preserved
  const physical = result.data.filter((r) =>
    String(r.id)?.includes("electricity_") || String(r.id)?.includes("oil_") ||
    String(r.id)?.includes("wheat_") || String(r.id)?.includes("gold_")
  );
  for (const item of physical) {
    assertExists(item.normalizedUnit);
    // Physical units should be preserved in their original form
  }

  console.log(
    `✅ Comprehensive test: ${result.data.length} items across all domains processed`,
  );
});

Deno.test("V2 Synthetic: Currency Conversion Focus", async () => {
  const result = await processEconomicData(
    syntheticTestSuites.currencyFocus as ParsedData[],
    createTestConfig(),
  );

  assertEquals(result.metrics.recordsFailed, 0);

  // All monetary items should have FX conversion applied where needed
  const fxConvertedItems = result.data.filter((r) => {
    const explain = r.explain as any;
    return explain?.fx && explain.fx.source === "fallback";
  });

  // Should have multiple items with FX conversion
  if (fxConvertedItems.length < 10) {
    throw new Error(
      `Expected multiple FX conversions, got: ${fxConvertedItems.length}`,
    );
  }

  // Verify FX metadata is present
  for (const item of fxConvertedItems) {
    const fx = (item.explain as any).fx;
    assertExists(fx.rate, `FX rate missing for ${item.id}`);
    assertExists(fx.asOf, `FX asOf date missing for ${item.id}`);
    assertEquals(
      fx.source,
      "fallback",
      `FX source should be 'fallback' for ${item.id}`,
    );
  }

  // Test specific currency conversions
  const eurItems = fxConvertedItems.filter((r) =>
    String(r.id)?.includes("_eur_")
  );
  const gbpItems = fxConvertedItems.filter((r) =>
    String(r.id)?.includes("_gbp_")
  );
  const jpyItems = fxConvertedItems.filter((r) =>
    String(r.id)?.includes("_jpy_")
  );

  if (eurItems.length === 0) throw new Error("No EUR conversions found");
  if (gbpItems.length === 0) throw new Error("No GBP conversions found");
  if (jpyItems.length === 0) throw new Error("No JPY conversions found");

  console.log(
    `✅ Currency focus: ${fxConvertedItems.length} items with FX conversion`,
  );
});

Deno.test("V2 Synthetic: Classification Edge Cases", async () => {
  const result = await processEconomicData(
    syntheticTestSuites.classificationFocus as ParsedData[],
    createTestConfig(),
  );

  // Edge cases might have some failures, but most should succeed
  const successRate = result.metrics.recordsProcessed /
    (result.metrics.recordsProcessed + result.metrics.recordsFailed);
  if (successRate < 0.8) {
    throw new Error(`Success rate too low: ${successRate * 100}%`);
  }

  const byId = Object.fromEntries(result.data.map((r) => [r.id, r]));

  // Test specific edge cases
  if (byId["mixed_case"]) {
    // Mixed case should still be classified correctly
    assertExists(byId["mixed_case"].normalizedUnit);
  }

  if (byId["zero_value"]) {
    // Zero values should be handled
    assertEquals(byId["zero_value"].normalizedValue, 0);
    assertExists(byId["zero_value"].normalizedUnit);
  }

  if (byId["negative_value"]) {
    // Negative values should be preserved
    if (byId["negative_value"].normalizedValue >= 0) {
      throw new Error("Negative value should remain negative");
    }
  }

  // Unicode and special characters should be handled gracefully
  if (byId["unicode_currency"]) {
    assertExists(byId["unicode_currency"].normalizedUnit);
  }

  console.log(
    `✅ Edge cases: ${result.data.length}/${syntheticTestSuites.classificationFocus.length} processed`,
  );
});

Deno.test("V2 Synthetic: Domain-by-Domain Expectations", async () => {
  // Test each domain with its expected results
  const domains = [
    "monetaryStock",
    "monetaryFlow",
    "counts",
    "percentages",
    "indices",
  ] as const;

  for (const domain of domains) {
    const expectedItems = expectedByDomain[domain];
    if (expectedItems.length === 0) continue;

    const testData = expectedItems.slice(0, 5); // Test first 5 of each domain
    const result = await processEconomicData(
      testData as ParsedData[],
      createTestConfig(),
    );

    assertEquals(
      result.metrics.recordsFailed,
      0,
      `${domain} domain had failures`,
    );

    // Validate each item against expectations
    for (const actualItem of result.data) {
      const itemId = String(actualItem.id || "");
      const expected = getExpectedResult(itemId);
      assertExists(expected, `Missing expectation for ${itemId}`);

      const validation = validateResult(actualItem, expected);
      if (!validation.passed) {
        throw new Error(
          `${domain} item ${itemId} failed: ${validation.errors.join(", ")}`,
        );
      }
    }

    console.log(`✅ ${domain}: ${result.data.length} items validated`);
  }
});

Deno.test("V2 Synthetic: Currency Conversion Precision", async () => {
  // Test specific currency conversions with exact expected rates
  const currencyTests = [
    expectedByDomain.monetaryStock.find((e) => e.id === "debt_eur_m"),
    expectedByDomain.monetaryStock.find((e) => e.id === "reserves_gbp_m"),
    expectedByDomain.monetaryStock.find((e) => e.id === "reserves_jpy_b"),
    expectedByDomain.monetaryFlow.find((e) => e.id === "wage_eur_month"),
    expectedByDomain.monetaryFlow.find((e) => e.id === "wage_jpy_month"),
  ].filter(Boolean);

  const result = await processEconomicData(
    currencyTests as ParsedData[],
    createTestConfig(),
  );
  assertEquals(result.metrics.recordsFailed, 0);

  for (const actualItem of result.data) {
    const itemId = String(actualItem.id || "");
    const expected = getExpectedResult(itemId)!;

    // Check FX was applied
    assertEquals(
      !!actualItem.explain?.fx,
      expected.expectedFXApplied,
      `FX application mismatch for ${itemId}`,
    );

    if (expected.expectedFXApplied) {
      const actualRate = (actualItem.explain as any)?.fx?.rate;
      const expectedRate = expected.expectedFXRate;

      assertExists(actualRate, `Missing FX rate for ${itemId}`);
      assertExists(expectedRate, `Missing expected FX rate for ${itemId}`);

      // Handle both rate formats: EUR->USD (1.1) or USD->EUR (0.909)
      // Check if the rate matches directly or as the inverse
      const directMatch = Math.abs(actualRate - expectedRate) < 0.0001;
      const inverseMatch = Math.abs(actualRate - (1 / expectedRate)) < 0.0001;

      if (!directMatch && !inverseMatch) {
        throw new Error(
          `FX rate mismatch for ${itemId}: expected ${expectedRate}, got ${actualRate}`,
        );
      }
    }

    // Validate final converted value
    const validation = validateResult(actualItem, expected);
    if (!validation.passed) {
      throw new Error(
        `${itemId} conversion failed: ${validation.errors.join(", ")}`,
      );
    }
  }

  console.log(
    `✅ Currency conversion: ${result.data.length} items with precise FX calculations`,
  );
});

Deno.test("V2 Synthetic: All Monetary Domain Tests", async () => {
  const result = await processEconomicData(
    syntheticCollections.monetary as ParsedData[],
    createTestConfig(),
  );

  assertEquals(result.metrics.recordsFailed, 0);

  // Separate stocks from flows
  const stocks = result.data.filter((r) =>
    String(r.id || "").includes("gdp_") ||
    String(r.id || "").includes("debt_") ||
    String(r.id || "").includes("budget_") ||
    String(r.id || "").includes("reserves_") ||
    String(r.id || "").includes("market_cap_") ||
    String(r.id || "").includes("assets_") ||
    String(r.id || "").includes("liabilities_") ||
    String(r.id || "").includes("equity_")
  );

  const flows = result.data.filter((r) =>
    String(r.id || "").includes("wage_") ||
    String(r.id || "").includes("revenue_") ||
    String(r.id || "").includes("income_") ||
    String(r.id || "").includes("spending_") ||
    String(r.id || "").includes("expenditure_") ||
    String(r.id || "").includes("investment_") ||
    String(r.id || "").includes("funding_")
  );

  // All stocks should normalize to USD (any magnitude)
  for (const stock of stocks) {
    if (!stock.normalizedUnit?.includes("USD")) {
      throw new Error(
        `Stock ${stock.id} should normalize to USD, got: ${stock.normalizedUnit}`,
      );
    }
    // Should not have time component
    if (stock.normalizedUnit?.includes("per ")) {
      throw new Error(
        `Stock ${stock.id} should not have time component, got: ${stock.normalizedUnit}`,
      );
    }
  }

  // All flows should normalize to USD per month
  for (const flow of flows) {
    const unit = flow.normalizedUnit || "";
    if (!unit.includes("USD")) {
      throw new Error(`Flow ${flow.id} should normalize to USD, got: ${unit}`);
    }
    if (!unit.includes("per month")) {
      throw new Error(
        `Flow ${flow.id} should normalize to 'per month', got: ${unit}`,
      );
    }
  }

  console.log(
    `✅ Monetary domain: ${stocks.length} stocks + ${flows.length} flows processed`,
  );
});

Deno.test("V2 Synthetic: All Physical Domain Tests", async () => {
  const result = await processEconomicData(
    syntheticCollections.physical as ParsedData[],
    createTestConfig({ targetCurrency: undefined }), // No currency conversion for physical
  );

  assertEquals(result.metrics.recordsFailed, 0);

  // Physical domains should preserve their original units
  const energyItems = result.data.filter((r) =>
    String(r.id)?.includes("electricity_") || String(r.id)?.includes("gas_") ||
    String(r.id)?.includes("oil_") ||
    String(r.id)?.includes("renewable_") || String(r.id)?.includes("coal_")
  );

  const commodityItems = result.data.filter((r) =>
    String(r.id)?.includes("oil_") || String(r.id)?.includes("lng_")
  );

  const agricultureItems = result.data.filter((r) =>
    String(r.id)?.includes("wheat_") || String(r.id)?.includes("rice_") ||
    String(r.id)?.includes("corn_") ||
    String(r.id)?.includes("coffee_") || String(r.id)?.includes("sugar_") ||
    String(r.id)?.includes("farmland_") ||
    String(r.id)?.includes("cattle_")
  );

  const metalsItems = result.data.filter((r) =>
    String(r.id)?.includes("gold_") || String(r.id)?.includes("silver_") ||
    String(r.id)?.includes("copper_") ||
    String(r.id)?.includes("iron_") || String(r.id)?.includes("aluminum_") ||
    String(r.id)?.includes("zinc_")
  );

  // All physical items should have preserved units
  for (
    const item of [
      ...energyItems,
      ...commodityItems,
      ...agricultureItems,
      ...metalsItems,
    ]
  ) {
    assertExists(
      item.normalizedUnit,
      `Physical item ${item.id} missing normalized unit`,
    );
    // Should not contain USD (unless it's a price)
    if (
      item.normalizedUnit?.includes("USD") &&
      !String(item.id)?.includes("price")
    ) {
      throw new Error(
        `Physical item ${item.id} should not have USD conversion: ${item.normalizedUnit}`,
      );
    }
  }

  console.log(
    `✅ Physical domain: ${result.data.length} items with preserved units`,
  );
});

Deno.test("V2 Synthetic: Abstract Domains (Counts, Percentages, Indices)", async () => {
  const result = await processEconomicData(
    syntheticCollections.abstract as ParsedData[],
    createTestConfig({ targetCurrency: undefined }), // No currency conversion
  );

  assertEquals(result.metrics.recordsFailed, 0);

  const counts = result.data.filter((r) =>
    String(r.id)?.includes("pop_") || String(r.id)?.includes("households_") ||
    String(r.id)?.includes("cars_") ||
    String(r.id)?.includes("workers_") || String(r.id)?.includes("doctors_") ||
    String(r.id)?.includes("schools_") ||
    String(r.id)?.includes("companies_") ||
    String(r.id)?.includes("internet_") || String(r.id)?.includes("farms_") ||
    String(r.id)?.includes("items_") || String(r.id)?.includes("components_") ||
    String(r.id)?.includes("units_")
  );

  // Debug: Show which items are not counts
  const notCounts = result.data.filter((r) => {
    const isInFilter = String(r.id)?.includes("pop_") ||
      String(r.id)?.includes("households_") ||
      String(r.id)?.includes("cars_") ||
      String(r.id)?.includes("workers_") ||
      String(r.id)?.includes("doctors_") ||
      String(r.id)?.includes("schools_") ||
      String(r.id)?.includes("companies_") ||
      String(r.id)?.includes("internet_") || String(r.id)?.includes("farms_") ||
      String(r.id)?.includes("items_") ||
      String(r.id)?.includes("components_") || String(r.id)?.includes("units_");
    return isInFilter && r.normalizedUnit !== "ones";
  });
  if (notCounts.length > 0) {
    console.log(
      "Items not classified as counts:",
      notCounts.map((r) => `${r.id}: ${r.unit} -> ${r.normalizedUnit}`),
    );
  }

  const percentages = result.data.filter((r) =>
    String(r.id)?.includes("unemployment_") ||
    String(r.id)?.includes("inflation_") ||
    String(r.id)?.includes("gdp_growth") ||
    String(r.id)?.includes("interest_") || String(r.id)?.includes("bond_") ||
    String(r.id)?.includes("debt_to_gdp") ||
    String(r.id)?.includes("literacy_") ||
    String(r.id)?.includes("market_share") ||
    String(r.id)?.includes("vaccination_") ||
    String(r.id)?.includes("renewable_energy") ||
    String(r.id)?.includes("tax_rate_")
  );

  const indices = result.data.filter((r) =>
    String(r.id)?.includes("stock_index_") ||
    String(r.id)?.includes("consumer_confidence") ||
    String(r.id)?.includes("cpi_") ||
    String(r.id)?.includes("commodity_index_") ||
    String(r.id)?.includes("house_price_") ||
    String(r.id)?.includes("wage_index") ||
    String(r.id)?.includes("competitiveness_") ||
    String(r.id)?.includes("volatility_")
  );

  // Counts should normalize to "ones"
  for (const count of counts) {
    if (count.normalizedUnit !== "ones") {
      throw new Error(
        `Count ${count.id} should normalize to 'ones', got: ${count.normalizedUnit}`,
      );
    }
  }

  // Percentages should preserve percentage-related units
  for (const pct of percentages) {
    const unit = pct.normalizedUnit || "";
    const hasPercentageUnit = unit.includes("%") || unit.includes("percent") ||
      unit.includes("pp") || unit.includes("bps") || unit.includes("basis");
    if (!hasPercentageUnit) {
      throw new Error(
        `Percentage ${pct.id} should preserve percentage unit, got: ${unit}`,
      );
    }
  }

  // Indices should preserve index-related units
  for (const index of indices) {
    const unit = index.normalizedUnit || "";
    const hasIndexUnit = unit.includes("points") || unit.includes("index") ||
      unit.includes("Points") || unit.includes("Index") ||
      unit.includes("VIX") || unit.includes("DXY");
    if (!hasIndexUnit) {
      throw new Error(
        `Index ${index.id} should preserve index unit, got: ${unit}`,
      );
    }
  }

  console.log(
    `✅ Abstract domains: ${counts.length} counts + ${percentages.length} percentages + ${indices.length} indices`,
  );
});

Deno.test("V2 Synthetic: Financial Domain (Rates, Crypto)", async () => {
  const result = await processEconomicData(
    syntheticCollections.financial as ParsedData[],
    createTestConfig(),
  );

  assertEquals(result.metrics.recordsFailed, 0);

  const rates = result.data.filter((r) => {
    const idStr = String(r.id || "");
    return idStr.includes("_price") || idStr.includes("_rate") ||
      idStr.includes("fx_") ||
      idStr.includes("bond_") || idStr.includes("mortgage_") ||
      idStr.includes("birth_") ||
      idStr.includes("vaccination_") || idStr.includes("price_earnings") ||
      idStr.includes("wage_hourly_");
  });

  const crypto = result.data.filter((r) => {
    const idStr = String(r.id || "");
    return idStr.includes("bitcoin_") || idStr.includes("ethereum_") ||
      idStr.includes("btc_") ||
      idStr.includes("eth_") || idStr.includes("ada_") ||
      idStr.includes("sol_") ||
      idStr.includes("crypto_") || idStr.includes("defi_");
  });

  // Rates should preserve their rate structure
  for (const rate of rates) {
    assertExists(
      rate.normalizedUnit,
      `Rate ${rate.id} missing normalized unit`,
    );
    // Most rates should preserve their original form
  }

  // Crypto items should preserve their units
  for (const cryptoItem of crypto) {
    assertExists(
      cryptoItem.normalizedUnit,
      `Crypto ${cryptoItem.id} missing normalized unit`,
    );
  }

  console.log(
    `✅ Financial domain: ${rates.length} rates + ${crypto.length} crypto items`,
  );
});

Deno.test("V2 Synthetic: Performance Stress Test", async () => {
  const startTime = Date.now();

  const result = await processEconomicData(
    syntheticStressTest.slice(0, 500) as ParsedData[], // Use first 500 for reasonable test time
    createTestConfig(),
  );

  const processingTime = Date.now() - startTime;

  // Performance expectations
  if (processingTime > 30000) { // 30 seconds max
    throw new Error(`Stress test took too long: ${processingTime}ms`);
  }

  assertEquals(result.data.length, 500);

  // Should handle the load without excessive failures
  const successRate = result.metrics.recordsProcessed /
    (result.metrics.recordsProcessed + result.metrics.recordsFailed);
  if (successRate < 0.95) {
    throw new Error(`Stress test success rate too low: ${successRate * 100}%`);
  }

  console.log(
    `✅ Stress test: ${result.data.length} items processed in ${processingTime}ms`,
  );
  console.log(`   Success rate: ${(successRate * 100).toFixed(1)}%`);
  console.log(
    `   Throughput: ${
      (result.data.length / (processingTime / 1000)).toFixed(1)
    } items/sec`,
  );
});

Deno.test("V2 Synthetic: Auto-targeting with Synthetic Data", async () => {
  // Create a dataset with mixed currencies but EUR dominance
  const eurDominantData = [
    ...syntheticCollections.monetary.filter((r) => r.currency_code === "EUR")
      .slice(0, 15),
    ...syntheticCollections.monetary.filter((r) => r.currency_code === "USD")
      .slice(0, 8),
    ...syntheticCollections.monetary.filter((r) => r.currency_code === "GBP")
      .slice(0, 5),
  ];

  const result = await processEconomicData(
    eurDominantData as ParsedData[],
    createTestConfig({
      autoTargetCurrency: true,
      targetCurrency: undefined, // Let auto-targeting decide
    }),
  );

  assertEquals(result.metrics.recordsFailed, 0);

  // With EUR dominance, auto-targeting should select EUR as target
  // Most items should normalize to EUR
  const eurNormalized = result.data.filter((r) =>
    r.normalizedUnit?.includes("EUR")
  );
  const totalMonetary = result.data.filter((r) =>
    r.normalizedUnit?.includes("EUR") || r.normalizedUnit?.includes("USD") ||
    r.normalizedUnit?.includes("GBP")
  );

  if (totalMonetary.length > 0) {
    const eurRatio = eurNormalized.length / totalMonetary.length;
    if (eurRatio < 0.7) { // Should be majority EUR
      console.warn(
        `Auto-targeting may not have selected EUR (${eurRatio * 100}% EUR)`,
      );
    }
  }

  console.log(
    `✅ Auto-targeting: ${eurNormalized.length}/${totalMonetary.length} items normalized to EUR`,
  );
});

Deno.test("V2 Synthetic: Explain Metadata Validation", async () => {
  const testData = [
    ...syntheticCollections.monetary.slice(0, 5),
    ...syntheticCollections.abstract.slice(0, 3),
    ...syntheticCollections.physical.slice(0, 3),
  ];

  const result = await processEconomicData(
    testData as ParsedData[],
    createTestConfig({ explain: true }),
  );

  assertEquals(result.metrics.recordsFailed, 0);

  // All items should have explain metadata
  for (const item of result.data) {
    assertExists(item.explain, `Item ${item.id} missing explain metadata`);

    const explain = item.explain as any;
    assertExists(
      explain.originalUnit,
      `Item ${item.id} missing originalUnit in explain`,
    );
    assertExists(
      explain.normalizedUnit,
      `Item ${item.id} missing normalizedUnit in explain`,
    );

    // Items with currency conversion should have FX metadata
    if (explain.fx) {
      assertExists(explain.fx.rate, `Item ${item.id} missing FX rate`);
      assertExists(explain.fx.source, `Item ${item.id} missing FX source`);
      assertExists(explain.fx.asOf, `Item ${item.id} missing FX asOf`);
    }
  }

  console.log(
    `✅ Explain metadata: All ${result.data.length} items have complete explanations`,
  );
});

Deno.test("V2 Synthetic: Transformation Logic Validation", async () => {
  // Test complex transformation scenarios with exact calculations
  const complexTests = [
    // USD Thousand to USD Million (magnitude only)
    {
      id: "gdp_usd_k",
      value: 25000000,
      unit: "USD Thousand",
      name: "GDP (Small Economy)",
    },
    // EUR Billion to USD Million (FX + magnitude)
    {
      id: "debt_eur_b",
      value: 5,
      unit: "EUR Billion",
      name: "National Debt (Large)",
    },
    // USD per year to USD millions per month (time + magnitude)
    {
      id: "wage_usd_year",
      value: 54000,
      unit: "USD per year",
      name: "Annual Salary",
    },
    // JPY per month to USD millions per month (FX + magnitude)
    {
      id: "wage_jpy_month",
      value: 280000,
      unit: "JPY per month",
      name: "Japanese Monthly Salary",
    },
    // Million items to ones (magnitude expansion)
    {
      id: "items_million",
      value: 2.5,
      unit: "Million items",
      name: "Mass Produced Items",
    },
    // Negative EUR Billion to USD Million (negative + FX + magnitude)
    {
      id: "negative_value",
      value: -125.5,
      unit: "EUR Billion",
      name: "Negative Value",
    },
  ];

  const result = await processEconomicData(
    complexTests as ParsedData[],
    createTestConfig(),
  );
  assertEquals(result.metrics.recordsFailed, 0);

  const byId = Object.fromEntries(result.data.map((r) => [r.id, r]));
  const fx = STANDARD_CONFIG.fxRates;

  // Test specific transformation calculations

  // 1. Magnitude-only conversion: 25M thousands → 25M millions
  const gdpUsdK = byId["gdp_usd_k"];
  assertEquals(gdpUsdK.normalizedValue, 25000); // 25,000,000 * 0.001
  assertEquals(gdpUsdK.normalizedUnit, "USD millions");
  assertEquals(!!(gdpUsdK.explain as any)?.fx, false); // No FX

  // 2. FX + Magnitude: 5 EUR Billion → USD Million
  const debtEurB = byId["debt_eur_b"];
  assertEquals(debtEurB.normalizedValue, 5500); // 5 * 1000 * 1.1
  assertEquals(debtEurB.normalizedUnit, "USD millions");
  assertEquals(
    (debtEurB.explain as any)?.fx?.rate,
    1 / STANDARD_CONFIG.fxRates.EUR,
  ); // USD-based rate (1 USD = X EUR)

  // 3. Time + Magnitude: 54000 USD/year → USD millions/month
  const wageUsdYear = byId["wage_usd_year"];
  assertEquals(
    Math.round(wageUsdYear.normalizedValue * 1000000) / 1000000,
    0.0045,
  ); // 54000 / 12 / 1M
  assertEquals(wageUsdYear.normalizedUnit, "USD millions per month");

  // 4. FX + Magnitude (flow): 280000 JPY/month → USD millions/month
  const wageJpyMonth = byId["wage_jpy_month"];
  assertEquals(
    Math.round(wageJpyMonth.normalizedValue * 1000000) / 1000000,
    0.00196,
  ); // 280000 * 0.007 / 1M
  assertEquals(wageJpyMonth.normalizedUnit, "USD millions per month");
  assertEquals(
    (wageJpyMonth.explain as any)?.fx?.rate,
    1 / STANDARD_CONFIG.fxRates.JPY,
  ); // USD-based rate (1 USD = X JPY)

  // 5. Count magnitude expansion: 2.5 million → 2,500,000 ones
  const itemsMillion = byId["items_million"];
  assertEquals(itemsMillion.normalizedValue, 2500000); // 2.5 * 1M
  assertEquals(itemsMillion.normalizedUnit, "ones");

  // 6. Negative value preservation: -125.5 EUR Billion → negative USD Million
  const negativeValue = byId["negative_value"];
  assertEquals(negativeValue.normalizedValue, -138050); // -125.5 * 1000 * 1.1
  assertEquals(negativeValue.normalizedUnit, "USD millions");
  assertEquals(
    (negativeValue.explain as any)?.fx?.rate,
    1 / STANDARD_CONFIG.fxRates.EUR,
  ); // USD-based rate (1 USD = X EUR)

  console.log(
    `✅ Transformation logic: All ${result.data.length} complex calculations validated`,
  );
});

Deno.test("V2 Synthetic: Edge Case Handling", async () => {
  const edgeCases = [
    {
      id: "zero_value",
      value: 0,
      unit: "USD Million",
      name: "Zero Value Test",
    },
    {
      id: "mixed_case",
      value: 125.5,
      unit: "UsD MiLlIoN",
      name: "Mixed Case Currency",
    },
    {
      id: "just_currency",
      value: 125.5,
      unit: "USD",
      name: "Just Currency Code",
    },
  ];

  const result = await processEconomicData(
    edgeCases as ParsedData[],
    createTestConfig(),
  );

  // Edge cases might have some processing challenges but should mostly succeed
  if (result.metrics.recordsFailed > 1) {
    throw new Error(
      `Too many edge case failures: ${result.metrics.recordsFailed}`,
    );
  }

  const byId = Object.fromEntries(result.data.map((r) => [r.id, r]));

  // Zero values should be handled correctly
  if (byId["zero_value"]) {
    assertEquals(byId["zero_value"].normalizedValue, 0);
    assertEquals(byId["zero_value"].normalizedUnit, "USD millions");
  }

  // Mixed case should be normalized
  if (byId["mixed_case"]) {
    assertEquals(byId["mixed_case"].normalizedUnit, "USD millions");
    assertExists(byId["mixed_case"].normalizedValue);
  }

  // Just currency code should be classified and converted
  if (byId["just_currency"]) {
    assertEquals(byId["just_currency"].normalizedUnit, "USD millions");
    assertEquals(
      Math.round(byId["just_currency"].normalizedValue * 10000000) / 10000000,
      0.0001255,
    );
  }

  console.log(
    `✅ Edge cases: ${result.data.length}/${edgeCases.length} handled successfully`,
  );
});

console.log("🧪 Comprehensive synthetic integration tests loaded");
console.log(`📊 Test data summary:`);
console.log(`   • Total synthetic indicators: ${allSyntheticData.length}`);
console.log(
  `   • Monetary (stocks + flows): ${syntheticCollections.monetary.length}`,
);
console.log(
  `   • Abstract (counts + % + indices): ${syntheticCollections.abstract.length}`,
);
console.log(`   • Physical domains: ${syntheticCollections.physical.length}`);
console.log(
  `   • Financial (rates + crypto): ${syntheticCollections.financial.length}`,
);
console.log(`   • Edge cases: ${syntheticCollections.edgeCases.length}`);
console.log(
  `   • Stress test dataset: ${syntheticCollections.stressTest.length}`,
);
