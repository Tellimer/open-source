/**
 * Tests for wages service integration and explain metadata
 */

import { assertEquals, assertExists } from "@std/assert";
import { processWagesData } from "./wages-service.ts";
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
