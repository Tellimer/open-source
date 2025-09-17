/**
 * Tests for count-based indicator normalization
 */

import { assertEquals } from "@std/assert";
import {
  detectCountData,
  isCountIndicator,
  isCountUnit,
  normalizeCountData,
} from "./count-normalization.ts";
import { normalizeValue } from "../normalization/normalization.ts";

Deno.test("isCountIndicator - detects car registrations", () => {
  assertEquals(isCountIndicator("Car Registrations", "Units"), true);
  assertEquals(isCountIndicator("Vehicle Registrations", "Thousands"), true);
  assertEquals(isCountIndicator("New Car Registrations", "Hundreds"), true);
  assertEquals(isCountIndicator("GDP", "USD Millions"), false);
  assertEquals(isCountIndicator("Inflation Rate", "%"), false);
});

Deno.test("isCountUnit - detects count units", () => {
  assertEquals(isCountUnit("Units"), true);
  assertEquals(isCountUnit("Thousands"), true);
  assertEquals(isCountUnit("Hundreds"), true);
  assertEquals(isCountUnit("Number"), true);
  assertEquals(isCountUnit("USD"), false);
  assertEquals(isCountUnit("%"), false);
});

Deno.test("detectCountData - detects count datasets", () => {
  const countData = [
    { name: "Car Registrations", unit: "Units" },
    { name: "Vehicle Licenses", unit: "Thousands" },
  ];
  assertEquals(detectCountData(countData), true);

  const nonCountData = [
    { name: "GDP", unit: "USD Millions" },
    { name: "Inflation", unit: "%" },
  ];
  assertEquals(detectCountData(nonCountData), false);
});

Deno.test("normalizeCountData - normalizes by scale only", () => {
  const data = [
    {
      country: "USA",
      value: 50,
      unit: "Thousands",
      date: "2024-01-01",
    },
    {
      country: "GBR",
      value: 200,
      unit: "Hundreds",
      date: "2024-01-01",
    },
  ];

  const normalized = normalizeCountData(data, { targetScale: "ones" });

  assertEquals(normalized.length, 2);
  assertEquals(normalized[0].normalizedValue, 50000); // 50 thousands = 50,000 ones
  assertEquals(normalized[1].normalizedValue, 20000); // 200 hundreds = 20,000 ones
  assertEquals(normalized[0].dataType, "count");
  assertEquals(normalized[1].dataType, "count");
});

Deno.test("normalizeValue - skips currency conversion for count data", () => {
  // This should not apply currency conversion for car registrations
  const result = normalizeValue(1000, "Units", {
    toCurrency: "USD",
    fx: { base: "USD", rates: { EUR: 1.1 } },
    indicatorName: "Car Registrations",
  });

  // Should return original value since no currency conversion should be applied
  assertEquals(result, 1000);
});

Deno.test("normalizeValue - applies scale conversion for count data", () => {
  const result = normalizeValue(50, "Thousands", {
    toMagnitude: "ones",
    indicatorName: "Car Registrations",
  });

  // Should convert 50 thousands to 50,000 ones
  assertEquals(result, 50000);
});
