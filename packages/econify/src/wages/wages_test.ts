/**
 * Comprehensive test suite for wages processing functionality
 *
 * This file consolidates all wages-related tests including:
 * - Core wages normalization
 * - Pipeline integration
 * - Currency recognition and conversion
 * - Index value handling and exclusion
 * - FX rate fallback scenarios
 * - Real-world data processing
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  getComparableWagesData,
  getWageNormalizationSummary,
  normalizeWagesData,
  type WageDataPoint,
} from "./wages-normalization.ts";
import { parseUnit } from "../units/units.ts";
import { processEconomicData } from "../main.ts";
import type { FXTable } from "../types.ts";

// ============================================================================
// Test Data & Fixtures
// ============================================================================

// Comprehensive FX rates for testing
const fx: FXTable = {
  base: "USD",
  rates: {
    EUR: 0.92,
    GBP: 0.75,
    ALL: 90.91,
    ARS: 350.0,
    AMD: 387.5,
    AUD: 1.52,
    AZN: 1.70,
    BGN: 1.80,
    BHD: 0.377,
    BAM: 1.80,
    BYN: 3.20,
    BRL: 5.15,
    BWP: 13.5,
    CAD: 1.36,
    CHF: 0.88,
    CLP: 950.0,
    CNY: 7.25,
    CRC: 520.0,
    CUP: 24.0,
    CZK: 22.8,
    DKK: 6.85,
    VEF: 4200000, // Old Venezuelan Bolívar (very high rate)
    VES: 36.5, // New Venezuelan Bolívar Soberano
  },
};

// Sample wages data for normalization tests
const sampleWagesData: WageDataPoint[] = [
  {
    country: "ARM",
    value: 240450,
    unit: "AMD/Month",
    currency: "AMD",
  },
  {
    country: "AUS",
    value: 1631.1,
    unit: "AUD/Week",
    currency: "AUD",
  },
  {
    country: "AUT",
    value: 132.1,
    unit: "points",
    currency: undefined,
  },
  {
    country: "CAN",
    value: 29.68,
    unit: "CAD/Hour",
    currency: "CAD",
  },
];

// ============================================================================
// Core Wages Normalization Tests
// ============================================================================

Deno.test("Wages Normalization - Basic functionality", () => {
  const results = normalizeWagesData(sampleWagesData, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    fx,
    excludeIndexValues: false,
  });

  assertEquals(results.length, sampleWagesData.length);

  // Check that currency-based wages are normalized
  const armResult = results.find((r) => r.country === "ARM");
  assertExists(armResult);
  assertEquals(armResult.dataType, "currency");
  assertEquals(armResult.normalizedUnit, "USD/month");

  // Check that index values are identified
  const autResult = results.find((r) => r.country === "AUT");
  assertExists(autResult);
  assertEquals(autResult.dataType, "index");
});

Deno.test("Wages Normalization - Currency conversions", () => {
  const results = normalizeWagesData(sampleWagesData, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    fx,
    excludeIndexValues: false,
  });

  // ARM: 240,450 AMD/Month → ~620 USD/month (240450 / 387.5)
  const armResult = results.find((r) => r.country === "ARM");
  assertExists(armResult);
  const expectedArm = 240450 / 387.5;
  assertEquals(
    Math.abs(armResult.normalizedValue! - expectedArm) < 1,
    true,
    `Expected ARM ~${expectedArm}, got ${armResult.normalizedValue}`,
  );

  // CAN: 29.68 CAD/Hour → USD/month conversion
  const canResult = results.find((r) => r.country === "CAN");
  assertExists(canResult);
  // Just verify it's a reasonable monthly wage amount (should be several thousand USD)
  assertEquals(
    canResult.normalizedValue! > 1000 && canResult.normalizedValue! < 20000,
    true,
    `Expected CAN to be reasonable monthly wage, got ${canResult.normalizedValue}`,
  );
});

Deno.test("Wages Normalization - Exclude index values", () => {
  const results = normalizeWagesData(sampleWagesData, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    fx,
    excludeIndexValues: true,
  });

  // Index values should be excluded
  const autResult = results.find((r) => r.country === "AUT");
  assertExists(autResult);
  assertEquals(autResult.excluded, true);
  assertEquals(
    autResult.exclusionReason,
    "Index/points values excluded from normalization",
  );
});

// ============================================================================
// Currency Recognition Tests (Venezuela VEF & VES)
// ============================================================================

Deno.test("Currency Recognition - Venezuela VEF support", async () => {
  const venezuelaData = [
    {
      id: "VEN",
      value: 13000000,
      unit: "VEF/Month",
      name: "Venezuela Minimum Wage",
      metadata: { country: "Venezuela" },
    },
  ];

  // Test 1: VEF should be recognized as currency
  const parsed = parseUnit("VEF/Month");
  assertEquals(parsed.category, "composite");
  assertEquals(parsed.currency, "VEF");
  assertEquals(parsed.timeScale, "month");
  assertEquals(parsed.isComposite, true);

  // Test 2: VEF should be converted with FX rates
  const result = await processEconomicData(venezuelaData, {
    targetCurrency: "USD",
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {
        VEF: 4200000, // High rate for old Venezuelan Bolívar
      },
    },
  });

  assertEquals(result.data.length, 1);
  const venResult = result.data[0];
  assertExists(venResult.normalized);
  assertEquals(venResult.normalizedUnit, "USD/month");

  // 13,000,000 VEF ÷ 4,200,000 = ~3.10 USD
  const expectedUSD = 13000000 / 4200000;
  assertEquals(
    Math.abs(venResult.normalized - expectedUSD) < 0.01,
    true,
    `Expected ~${expectedUSD} USD, got ${venResult.normalized}`,
  );
});

Deno.test("Currency Recognition - VEF vs VES handling", async () => {
  const testData = [
    {
      id: "VEN_OLD",
      value: 13000000,
      unit: "VEF/Month", // Old Venezuelan Bolívar
      name: "Venezuela Old Currency",
    },
    {
      id: "VEN_NEW",
      value: 13000000,
      unit: "VES/Month", // New Venezuelan Bolívar
      name: "Venezuela New Currency",
    },
  ];

  const result = await processEconomicData(testData, {
    targetCurrency: "USD",
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {
        VEF: 4200000, // Old rate (very high)
        VES: 36.5, // New rate (much lower)
      },
    },
  });

  assertEquals(result.data.length, 2);

  const vefResult = result.data.find((item) => item.id === "VEN_OLD");
  const vesResult = result.data.find((item) => item.id === "VEN_NEW");

  assertExists(vefResult);
  assertExists(vesResult);
  assertExists(vefResult.normalized);
  assertExists(vesResult.normalized);

  // VES should result in much higher USD value than VEF
  assertEquals(
    vesResult.normalized > vefResult.normalized * 1000,
    true,
    "VES should convert to much higher USD than VEF",
  );
});

// ============================================================================
// Index Value Exclusion Tests (Costa Rica Points)
// ============================================================================

Deno.test("Index Exclusion - Costa Rica points handling", async () => {
  const costaRicaData = [
    {
      id: "CRI",
      value: 6225.77,
      unit: "points",
      name: "Costa Rica Minimum Wage",
      metadata: { country: "Costa Rica" },
    },
  ];

  // Test 1: Points should be recognized as index
  const parsed = parseUnit("points");
  assertEquals(parsed.category, "index");
  assertEquals(parsed.currency, undefined);
  assertEquals(parsed.timeScale, undefined);

  // Test 2: With excludeIndexValues=true, points should be excluded
  const resultExcluded = await processEconomicData(costaRicaData, {
    targetCurrency: "USD",
    excludeIndexValues: true,
  });

  // Should return empty results when index values are excluded
  assertEquals(resultExcluded.data.length, 0);

  // Test 3: With excludeIndexValues=false, points should be kept as-is
  const resultIncluded = await processEconomicData(costaRicaData, {
    targetCurrency: "USD",
    excludeIndexValues: false,
  });

  assertEquals(resultIncluded.data.length, 1);
  const criResult = resultIncluded.data[0];
  assertExists(criResult.normalized);
  assertEquals(criResult.normalized, 6225.77);
  assertEquals(criResult.normalizedUnit, "USD ones");
});

Deno.test("Index Exclusion - Mixed currency and index processing", async () => {
  const mixedData = [
    {
      id: "VEN",
      value: 13000000,
      unit: "VEF/Month",
      name: "Venezuela Minimum Wage",
      metadata: { country: "Venezuela" },
    },
    {
      id: "CRI",
      value: 6225.77,
      unit: "points",
      name: "Costa Rica Minimum Wage",
      metadata: { country: "Costa Rica" },
    },
  ];

  // Test with excludeIndexValues=true - should only process VEF
  const result = await processEconomicData(mixedData, {
    targetCurrency: "USD",
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {
        VEF: 4200000,
      },
    },
    excludeIndexValues: true,
  });

  // Should only have Venezuela result, Costa Rica excluded
  assertEquals(result.data.length, 1);
  const venResult = result.data[0];
  assertEquals(venResult.id, "VEN");
  assertExists(venResult.normalized);
  assertEquals(venResult.normalizedUnit, "USD/month");
});

// ============================================================================
// Regression Tests
// ============================================================================

Deno.test("Regression - Wages should not convert to millions", async () => {
  // This test ensures wages are always in "ones" magnitude, not millions
  const argentinaData = [
    {
      id: "ARG",
      value: 1674890.753,
      unit: "ARS/Month",
      name: "Argentina Wages",
    },
  ];

  const result = await processEconomicData(argentinaData, {
    targetCurrency: "USD",
    targetMagnitude: "millions", // This should be ignored for wages
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {
        ARS: 1347, // 1347 ARS per USD
      },
    },
  });

  assertEquals(result.data.length, 1);
  const argResult = result.data[0];
  assertExists(argResult.normalized);

  // Should be ~1,243 USD/month, NOT 1,243 million USD
  const expectedUSD = 1674890.753 / 1347;
  assertEquals(
    Math.abs(argResult.normalized - expectedUSD) < 1,
    true,
    `Expected ~${expectedUSD} USD/month, got ${argResult.normalized}`,
  );
  assertEquals(argResult.normalizedUnit, "USD/month");

  console.log(
    `✅ Argentina wage correctly normalized: ${
      argResult.normalized.toFixed(2)
    } USD/month`,
  );
});

// ============================================================================
// Utility Function Tests
// ============================================================================

Deno.test("Utilities - Wage normalization summary", () => {
  const results = normalizeWagesData(sampleWagesData, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    fx,
    excludeIndexValues: true,
  });

  const summary = getWageNormalizationSummary(results);
  assertEquals(summary.total, 4);
  assertEquals(summary.normalized >= 3, true); // At least 3 currency-based wages
  assertEquals(summary.excluded >= 1, true); // At least 1 index value excluded
});

Deno.test("Utilities - Comparable wages data extraction", () => {
  const results = normalizeWagesData(sampleWagesData, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    fx,
    excludeIndexValues: false,
  });

  const comparable = getComparableWagesData(results);
  assertEquals(comparable.length >= 3, true); // Should have currency-based wages

  // All comparable data should have normalized values
  comparable.forEach((item) => {
    assertExists(item.normalizedValue);
    assertEquals(item.dataType, "currency");
  });
});
