/**
 * Tests for wages service integration and explain metadata
 */

import { assertEquals, assertExists } from "@std/assert";
import { detectWagesData, processWagesData } from "./wages-service.ts";
import type { FXTable } from "../types.ts";
import type { ParsedData } from "../main.ts";

const testFX: FXTable = {
  base: "USD",
  rates: {
    AOA: 912.5,
    ALL: 92.0,
    ARS: 1465.0,
    EUR: 0.92,
  },
};

const wagesTestData: ParsedData[] = [
  {
    id: "AGO_WAGE",
    name: "Angola Minimum Wage",
    value: 32181.15,
    unit: "AOA/Month",
    metadata: {},
  },
  {
    id: "ALB_WAGE",
    name: "Albania Minimum Wage",
    value: 40000,
    unit: "ALL/Month",
    metadata: {},
  },
  {
    id: "ARG_WAGE",
    name: "Argentina Minimum Wage",
    value: 322000,
    unit: "ARS/Month",
    metadata: {},
  },
];

Deno.test("Wages Service - explain metadata enabled", async () => {
  const result = await processWagesData(wagesTestData, testFX, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    explain: true, // Enable explain metadata
    excludeIndexValues: true,
  });

  assertEquals(result.length, 3);

  result.forEach((item, index) => {
    // Should have normalized values
    assertExists(item.normalized);
    assertExists(item.normalizedUnit);
    assertEquals(item.normalizedUnit, "USD per month");

    // Should have explain metadata
    assertExists(item.explain, `Item ${index} missing explain metadata`);
    assertExists(item.explain.currency);
    assertExists(item.explain.fx);

    // Check currency conversion details
    assertEquals(item.explain.currency.normalized, "USD");
    assertExists(item.explain.fx.rate);
    assertEquals(item.explain.fx.source, "fallback");

    // Should have conversion summary
    assertExists(item.explain.conversion);
    assertExists(item.explain.conversion.summary);
  });
});

Deno.test("Wages Service - explain metadata disabled", async () => {
  const result = await processWagesData(wagesTestData, testFX, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    explain: false, // Disable explain metadata
    excludeIndexValues: true,
  });

  assertEquals(result.length, 3);

  result.forEach((item) => {
    // Should have normalized values
    assertExists(item.normalized);
    assertExists(item.normalizedUnit);

    // Should NOT have explain metadata
    assertEquals(item.explain, undefined);
  });
});

Deno.test("Wages Service - with index values excluded", async () => {
  const mixedData: ParsedData[] = [
    ...wagesTestData,
    {
      id: "CRI_INDEX",
      name: "Costa Rica Wage Index",
      value: 6225.77,
      unit: "points",
      metadata: {},
    },
  ];

  const result = await processWagesData(mixedData, testFX, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    explain: true,
    excludeIndexValues: true, // Exclude index values
  });

  // Should only have 3 items (index value excluded)
  assertEquals(result.length, 3);

  // All remaining items should be currency-based wages
  result.forEach((item) => {
    assertExists(item.normalized);
    assertEquals(item.normalizedUnit, "USD per month");
    assertExists(item.explain);
  });
});

Deno.test("Wages Service - with index values included", async () => {
  const mixedData: ParsedData[] = [
    ...wagesTestData,
    {
      id: "CRI_INDEX",
      name: "Costa Rica Wage Index",
      value: 6225.77,
      unit: "points",
      metadata: {},
    },
  ];

  const result = await processWagesData(mixedData, testFX, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    explain: true,
    excludeIndexValues: false, // Include index values
  });

  // Should have 4 items (index value included)
  assertEquals(result.length, 4);

  // Find the index item
  const indexItem = result.find((item) => item.id === "CRI_INDEX");
  assertExists(indexItem);

  // Index item should keep original value and unit
  assertEquals(indexItem.normalized, 6225.77);
  assertEquals(indexItem.unit, "points");

  // Index item should have wage normalization metadata indicating exclusion
  assertExists(indexItem.metadata?.wageNormalization);
  const md = indexItem.metadata as Record<string, unknown>;
  const wn = md.wageNormalization as Record<string, unknown>;
  assertEquals(wn?.dataType as string, "index");
});

Deno.test("Wages Service - no FX rates fallback", async () => {
  const result = await processWagesData(wagesTestData, undefined, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    explain: true,
    excludeIndexValues: true,
  });

  // Should still process data using standard batch processing
  assertEquals(result.length, 3);

  result.forEach((item) => {
    assertExists(item.normalized);
    assertExists(item.normalizedUnit);
    // May or may not have explain metadata depending on batch processing
  });
});

Deno.test("Wages Service - metadata passthrough", async () => {
  const dataWithMetadata: ParsedData[] = [
    {
      id: "TEST_WAGE",
      name: "Test Minimum Wage",
      value: 1000,
      unit: "EUR/Month",
      metadata: {
        source: "Test Source",
        period: "2025-01",
        custom: "test data",
      },
    },
  ];

  const result = await processWagesData(dataWithMetadata, testFX, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    explain: true,
    includeWageMetadata: true,
  });

  assertEquals(result.length, 1);
  const item = result[0];

  // Should preserve original metadata
  assertExists(item.metadata);
  const md2 = item.metadata as Record<string, unknown>;
  assertEquals(md2.source as string, "Test Source");
  assertEquals(md2.period as string, "2025-01");
  assertEquals(md2.custom as string, "test data");

  // Should add wage normalization metadata
  assertExists(item.metadata.wageNormalization);
  const wn2 = md2.wageNormalization as Record<string, unknown>;
  assertEquals(wn2.excluded as boolean, false);
  assertEquals(wn2.dataType as string, "currency");
});

Deno.test("Wages Service - default excludes index values (with FX)", async () => {
  const mixed: ParsedData[] = [
    ...wagesTestData,
    { id: "IDX1", name: "Wage Index", value: 500, unit: "index", metadata: {} },
  ];
  const res = await processWagesData(mixed, testFX, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    explain: false,
    // excludeIndexValues omitted → should default to true
  });
  assertEquals(res.length, 3);
});

Deno.test("Wages Service - default excludes index values (no FX)", async () => {
  const mixed: ParsedData[] = [
    ...wagesTestData,
    {
      id: "IDX2",
      name: "Wage Index",
      value: 700,
      unit: "points",
      metadata: {},
    },
  ];
  const res = await processWagesData(mixed, undefined, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    explain: false,
  });
  assertEquals(res.length, 3);
});

Deno.test("Wages Service - default targetCurrency USD and monthly when omitted", async () => {
  const res = await processWagesData(wagesTestData, testFX, {
    // Omit targetCurrency and targetTimeScale
    explain: false,
  });
  assertEquals(res.length, 3);
  res.forEach((r) => assertEquals(r.normalizedUnit, "USD per month"));
});

Deno.test("Wages Service - weekly → monthly scaling", async () => {
  const weekly: ParsedData[] = [
    {
      id: "W_USD_W",
      name: "Weekly wage",
      value: 100,
      unit: "USD/week",
      metadata: {},
    },
  ];
  const res = await processWagesData(weekly, testFX, {
    // default targetTimeScale: month
  });
  assertEquals(res.length, 1);
  const item = res[0];
  assertEquals(item.normalizedUnit, "USD per month");
  // Expect ~ 100 * 52 / 12 = 433.33...
  const expected = 100 * 52 / 12;
  // Approximate check within a small tolerance
  const diff = Math.abs((item.normalized as number) - expected);
  if (diff > 1e-6) {
    throw new Error(`Expected ~${expected}, got ${item.normalized}`);
  }
});

Deno.test("Wages Service - detectWagesData identifies wages-like inputs", () => {
  // currency/time unit
  const a: ParsedData[] = [{
    id: "1",
    name: "X",
    value: 10,
    unit: "USD/Month",
    metadata: {},
  }];
  // wage keyword in name
  const b: ParsedData[] = [{
    id: "2",
    name: "Average wage",
    value: 10,
    unit: "index",
    metadata: {},
  }];
  // mixed currency and index
  const c: ParsedData[] = [
    { id: "3", name: "X", value: 10, unit: "USD/Month", metadata: {} },
    { id: "4", name: "Y", value: 10, unit: "points", metadata: {} },
  ];

  if (!detectWagesData(a)) {
    throw new Error("Expected detection for currency/time unit");
  }
  if (!detectWagesData(b)) {
    throw new Error("Expected detection for wage keyword in name");
  }
  if (!detectWagesData(c)) {
    throw new Error("Expected detection for mixed currency/index units");
  }
});

Deno.test("Wages Service - hourly → monthly scaling", async () => {
  const hourly: ParsedData[] = [
    {
      id: "W_USD_H",
      name: "Hourly wage",
      value: 10,
      unit: "USD/hour",
      metadata: {},
    },
  ];
  const res = await processWagesData(hourly, testFX, {});
  assertEquals(res.length, 1);
  const item = res[0];
  assertEquals(item.normalizedUnit, "USD per month");
  // Expect 10 * (8760/12) = 10 * 730 = 7300
  const expected = 10 * (365 * 24) / 12;
  const diff = Math.abs((item.normalized as number) - expected);
  if (diff > 1e-6) {
    throw new Error(`Expected ~${expected}, got ${item.normalized}`);
  }
});

Deno.test("Wages Service - daily → monthly scaling", async () => {
  const daily: ParsedData[] = [
    {
      id: "W_USD_D",
      name: "Daily wage",
      value: 100,
      unit: "USD/day",
      metadata: {},
    },
  ];
  const res = await processWagesData(daily, testFX, {});
  assertEquals(res.length, 1);
  const item = res[0];
  assertEquals(item.normalizedUnit, "USD per month");
  // Expect 100 * (365/12)
  const expected = 100 * 365 / 12;
  const diff = Math.abs((item.normalized as number) - expected);
  if (diff > 1e-6) {
    throw new Error(`Expected ~${expected}, got ${item.normalized}`);
  }
});

Deno.test("Wages Service - yearly → monthly scaling", async () => {
  const yearly: ParsedData[] = [
    {
      id: "W_USD_Y",
      name: "Yearly wage",
      value: 60000,
      unit: "USD/year",
      metadata: {},
    },
  ];
  const res = await processWagesData(yearly, testFX, {});
  assertEquals(res.length, 1);
  const item = res[0];
  assertEquals(item.normalizedUnit, "USD per month");
  // Expect 60000 / 12
  const expected = 60000 / 12;
  const diff = Math.abs((item.normalized as number) - expected);
  if (diff > 1e-6) {
    throw new Error(`Expected ~${expected}, got ${item.normalized}`);
  }
});
