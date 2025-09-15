/**
 * Tests for aggregations module
 */

import { assertEquals, assertThrows } from "@std/assert";
import { aggregate } from "./aggregations.ts";
import type { FXTable } from "../types.ts";

const fx: FXTable = {
  base: "USD",
  rates: {
    EUR: 0.92,
    GBP: 0.79,
    JPY: 110.0,
  },
};

Deno.test("aggregate - sum method", () => {
  const data = [
    { value: 100, unit: "USD" },
    { value: 200, unit: "USD" },
    { value: 300, unit: "USD" },
  ];

  const result = aggregate(data, { method: "sum" });

  assertEquals(result.value, 600);
  assertEquals(result.unit, "USD");
  assertEquals(result.method, "sum");
  assertEquals(result.count, 3);
});

Deno.test("aggregate - average method", () => {
  const data = [
    { value: 100, unit: "USD" },
    { value: 200, unit: "USD" },
    { value: 300, unit: "USD" },
  ];

  const result = aggregate(data, { method: "average" });

  assertEquals(result.value, 200);
  assertEquals(result.unit, "USD");
  assertEquals(result.method, "average");
  assertEquals(result.count, 3);
});

Deno.test("aggregate - median method", () => {
  const data = [
    { value: 100, unit: "USD" },
    { value: 200, unit: "USD" },
    { value: 300, unit: "USD" },
    { value: 400, unit: "USD" },
    { value: 500, unit: "USD" },
  ];

  const result = aggregate(data, { method: "median" });

  assertEquals(result.value, 300);
  assertEquals(result.unit, "USD");
  assertEquals(result.method, "median");
  assertEquals(result.count, 5);
});

Deno.test("aggregate - weighted average", () => {
  const data = [
    { value: 100, unit: "USD", weight: 1 },
    { value: 200, unit: "USD", weight: 2 },
    { value: 300, unit: "USD", weight: 3 },
  ];

  const result = aggregate(data, {
    method: "weightedAverage",
    weights: [1, 2, 3],
  });

  // (100*1 + 200*2 + 300*3) / (1+2+3) = 1400/6 = 233.33
  assertEquals(Math.round(result.value * 100) / 100, 233.33);
  assertEquals(result.unit, "USD");
  assertEquals(result.method, "weightedAverage");
  assertEquals(result.count, 3);
});

Deno.test("aggregate - geometric mean", () => {
  const data = [
    { value: 100, unit: "USD" },
    { value: 200, unit: "USD" },
    { value: 400, unit: "USD" },
  ];

  const result = aggregate(data, { method: "geometricMean" });

  // (100 * 200 * 400)^(1/3) = 8000000^(1/3) = 200
  assertEquals(result.value, 200);
  assertEquals(result.unit, "USD");
  assertEquals(result.method, "geometricMean");
  assertEquals(result.count, 3);
});

Deno.test("aggregate - harmonic mean", () => {
  const data = [
    { value: 100, unit: "USD" },
    { value: 200, unit: "USD" },
    { value: 400, unit: "USD" },
  ];

  const result = aggregate(data, { method: "harmonicMean" });

  // 3 / (1/100 + 1/200 + 1/400) = 3 / 0.0175 = 171.43
  assertEquals(Math.round(result.value * 100) / 100, 171.43);
  assertEquals(result.unit, "USD");
  assertEquals(result.method, "harmonicMean");
  assertEquals(result.count, 3);
});

Deno.test("aggregate - mixed currencies with normalization", () => {
  const data = [
    { value: 100, unit: "USD" },
    { value: 92, unit: "EUR" }, // Should convert to ~100 USD
    { value: 79, unit: "GBP" }, // Should convert to ~100 USD
  ];

  const result = aggregate(data, {
    method: "average",
    normalizeFirst: true,
    targetUnit: "USD",
    fx,
  });

  // All values should normalize to ~100 USD, so average should be ~100
  assertEquals(Math.round(result.value), 100);
  assertEquals(result.unit, "USD");
  assertEquals(result.count, 3);
});

Deno.test("aggregate - skip invalid values", () => {
  const data = [
    { value: 100, unit: "USD" },
    { value: NaN, unit: "USD" },
    { value: 300, unit: "USD" },
    { value: Infinity, unit: "USD" },
  ];

  const result = aggregate(data, {
    method: "average",
    skipInvalid: true,
  });

  // Should only use 100 and 300, average = 200
  assertEquals(result.value, 200);
  assertEquals(result.count, 2);
});

Deno.test("aggregate - error handling", () => {
  const data = [
    { value: 100, unit: "USD" },
    { value: 200, unit: "EUR" },
  ];

  // Should throw when trying to aggregate different units without normalization
  assertThrows(() => {
    aggregate(data, {
      method: "sum",
      normalizeFirst: false,
    });
  });
});

Deno.test("aggregate - empty data", () => {
  const data: Array<{ value: number; unit: string }> = [];

  assertThrows(() => {
    aggregate(data, { method: "sum" });
  });
});

Deno.test("aggregate - metadata calculation", () => {
  const data = [
    { value: 100, unit: "USD" },
    { value: 200, unit: "USD" },
    { value: 300, unit: "USD" },
    { value: 400, unit: "USD" },
    { value: 500, unit: "USD" },
  ];

  const result = aggregate(data, { method: "average" });

  assertEquals(result.value, 300);
  assertEquals(result.metadata?.min, 100);
  assertEquals(result.metadata?.max, 500);
  // Standard deviation should be calculated
  assertEquals(typeof result.metadata?.stdDev, "number");
  assertEquals(typeof result.metadata?.variance, "number");
});

Deno.test("aggregate - complex units", () => {
  const data = [
    { value: 1000, unit: "USD Million" },
    { value: 2000, unit: "USD Million" },
    { value: 3000, unit: "USD Million" },
  ];

  const result = aggregate(data, { method: "sum" });

  assertEquals(result.value, 6000);
  assertEquals(result.unit, "USD Million");
  assertEquals(result.count, 3);
});
