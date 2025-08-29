/**
 * Tests for wages normalization functionality
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import {
  getComparableWagesData,
  getWageNormalizationSummary,
  normalizeWagesData,
  type WageDataPoint,
} from "./wages-normalization.ts";
import type { FXTable } from "../types.ts";

// Sample FX rates for testing
const fx: FXTable = {
  base: "USD",
  rates: {
    EUR: 0.85,
    GBP: 0.75,
    CAD: 1.35,
    AUD: 1.50,
    AMD: 400,
    AZN: 1.70,
    BGN: 1.80,
    BAM: 1.80,
    BRL: 5.20,
    CNY: 7.20,
    CZK: 23.0,
  },
};

// Sample wages data based on your provided data
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
    currency: null,
  },
  {
    country: "AZE",
    value: 840.8,
    unit: "AZN/Month",
    currency: "AZN",
  },
  {
    country: "BEL",
    value: 114.4,
    unit: "points",
    currency: null,
  },
  {
    country: "CAN",
    value: 30.66,
    unit: "CAD/Hour",
    currency: "CAD",
  },
  {
    country: "CHN",
    value: 107987,
    unit: "CNY/Year",
    currency: "CNY",
  },
];

Deno.test("normalizeWagesData - basic functionality", () => {
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

Deno.test("normalizeWagesData - currency conversions", () => {
  const results = normalizeWagesData(sampleWagesData, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    fx,
  });

  // Test Armenia (AMD/Month -> USD/Month)
  const armResult = results.find((r) => r.country === "ARM");
  assertExists(armResult);
  assertEquals(armResult.dataType, "currency");
  // 240450 AMD / 400 (AMD per USD) = 601.125 USD/month
  assertEquals(Math.round(armResult.normalizedValue!), 601);

  // Test Australia (AUD/Week -> USD/Month)
  const ausResult = results.find((r) => r.country === "AUS");
  assertExists(ausResult);
  assertEquals(ausResult.dataType, "currency");
  // 1631.1 AUD/week * 4.33 weeks/month / 1.50 AUD/USD ≈ 4707 USD/month
  const expectedAus = (1631.1 * 4.33) / 1.50;
  // Allow for small rounding differences
  const actualAus = Math.round(ausResult.normalizedValue!);
  const expectedAusRounded = Math.round(expectedAus);
  assertEquals(
    Math.abs(actualAus - expectedAusRounded) <= 5,
    true,
    `Expected ${expectedAusRounded} ± 5, got ${actualAus}`,
  );

  // Test Canada (CAD/Hour -> USD/Month)
  const canResult = results.find((r) => r.country === "CAN");
  assertExists(canResult);
  assertEquals(canResult.dataType, "currency");
  // 30.66 CAD/hour -> USD/month
  // Time conversion: hour to month = (365*24)/12 = 730 hours per month
  // Currency conversion: CAD to USD = 1/1.35
  const expectedCan = (30.66 * (365 * 24) / 12) / 1.35;
  const actualCan = Math.round(canResult.normalizedValue!);
  const expectedCanRounded = Math.round(expectedCan);
  assertEquals(
    Math.abs(actualCan - expectedCanRounded) <= 10,
    true,
    `Expected ${expectedCanRounded} ± 10, got ${actualCan}`,
  );
});

Deno.test("normalizeWagesData - exclude index values", () => {
  const results = normalizeWagesData(sampleWagesData, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    fx,
    excludeIndexValues: true,
  });

  // Index values should be excluded
  const autResult = results.find((r) => r.country === "AUT");
  assertExists(autResult);
  assertEquals(autResult.dataType, "index");
  assertEquals(autResult.excluded, true);
  assertEquals(
    autResult.exclusionReason,
    "Index/points values excluded from normalization",
  );

  const belResult = results.find((r) => r.country === "BEL");
  assertExists(belResult);
  assertEquals(belResult.excluded, true);
});

Deno.test("getWageNormalizationSummary", () => {
  const results = normalizeWagesData(sampleWagesData, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    fx,
    excludeIndexValues: true,
  });

  const summary = getWageNormalizationSummary(results);

  assertEquals(summary.total, 7);
  assertEquals(summary.dataTypes.currency, 5); // ARM, AUS, AZE, CAN, CHN
  assertEquals(summary.dataTypes.index, 2); // AUT, BEL
  assertEquals(summary.normalized, 5); // Only currency values normalized
  assertEquals(summary.excluded, 2); // Index values excluded

  assertExists(summary.statistics);
  assertEquals(typeof summary.statistics.min, "number");
  assertEquals(typeof summary.statistics.max, "number");
});

Deno.test("getComparableWagesData", () => {
  const results = normalizeWagesData(sampleWagesData, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    fx,
    excludeIndexValues: true,
  });

  const comparable = getComparableWagesData(results);

  // Should only include currency-based, normalized values
  assertEquals(comparable.length, 5);

  // All should have same normalized unit
  comparable.forEach((item) => {
    assertEquals(item.normalizedUnit, "USD/month");
    assertEquals(item.dataType, "currency");
    assertEquals(item.excluded, undefined);
    assertExists(item.normalizedValue);
  });

  // Values should be in reasonable range for monthly wages in USD
  const values = comparable.map((item) => item.normalizedValue!);
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Reasonable range for monthly wages (should be hundreds to thousands USD)
  assertEquals(min > 100, true);
  assertEquals(max < 50000, true);
});

Deno.test("normalizeWagesData - error handling", () => {
  const badData: WageDataPoint[] = [
    {
      country: "TEST",
      value: 1000,
      unit: "INVALID/Unit",
      currency: "INVALID",
    },
  ];

  const results = normalizeWagesData(badData, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    fx,
  });

  assertEquals(results.length, 1);
  assertEquals(results[0].excluded, true);
  assertEquals(results[0].dataType, "unknown");
  assertExists(results[0].exclusionReason);
});
