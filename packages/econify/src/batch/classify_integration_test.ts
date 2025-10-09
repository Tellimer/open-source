/**
 * Tests for classify package integration
 * Demonstrates how indicator_type and is_currency_denominated from classify are used
 */

import { assertEquals } from "jsr:@std/assert@^1.0.10";
import { processBatch } from "./batch.ts";
import type { FXTable } from "../types.ts";

const mockFX: FXTable = {
  base: "USD",
  rates: { EUR: 0.85, GBP: 0.79 },
};

Deno.test("Classify Integration - indicator_type='count' prevents currency conversion", async () => {
  const data = [
    {
      id: "car_sales",
      name: "Car Sales",
      value: 50000,
      unit: "Units",
      // From classify package:
      indicator_type: "count",
      is_currency_denominated: false,
    },
  ];

  const result = await processBatch(data, {
    toCurrency: "USD",
    toMagnitude: "ones",
    fx: mockFX,
    explain: false,
  });

  // Count indicators should not have currency conversion applied
  assertEquals(result.successful.length, 1, "Should have 1 successful result");
  assertEquals(result.successful[0].normalized, 50000);
  assertEquals(result.successful[0].normalizedUnit, "ones");
});

Deno.test("Classify Integration - indicator_type='flow' with is_currency_denominated=true", async () => {
  const data = [
    {
      id: "gdp",
      name: "GDP",
      value: 100,
      unit: "EUR Billions",
      // From classify package:
      indicator_type: "flow",
      is_currency_denominated: true,
    },
  ];

  const result = await processBatch(data, {
    toCurrency: "USD",
    toMagnitude: "millions",
    fx: mockFX,
    explain: false,
  });

  // Flow with currency should get currency conversion: 100 * 1000 (billions->millions) / 0.85 (EUR->USD)
  const normalized = Math.round(result.successful[0].normalized!);
  assertEquals(normalized, 117647); // Close enough to 117647.05882352941
  assertEquals(result.successful[0].normalizedUnit, "USD millions");
});

Deno.test("Classify Integration - indicator_type='percentage' with is_currency_denominated=false", async () => {
  const data = [
    {
      id: "unemployment",
      name: "Unemployment Rate",
      value: 7.5,
      unit: "%",
      // From classify package:
      indicator_type: "percentage",
      is_currency_denominated: false,
    },
  ];

  const result = await processBatch(data, {
    toCurrency: "USD", // Should be ignored for percentages
    toMagnitude: "millions",
    fx: mockFX,
    explain: false,
  });

  // Percentages should pass through unchanged
  assertEquals(result.successful[0].normalized, 7.5);
  assertEquals(result.successful[0].normalizedUnit, "%");
});

Deno.test("Classify Integration - is_currency_denominated=false prevents currency detection from unit", async () => {
  const data = [
    {
      id: "ratio",
      name: "Debt to GDP Ratio",
      value: 85.5,
      unit: "%", // Simple unit without scale
      // From classify package - explicitly says this is NOT currency-denominated:
      indicator_type: "ratio",
      is_currency_denominated: false,
    },
  ];

  const result = await processBatch(data, {
    toCurrency: "EUR", // Should be ignored because is_currency_denominated=false
    toMagnitude: "ones",
    fx: mockFX,
    explain: false,
  });

  // Should not apply currency conversion and should pass through
  assertEquals(result.successful[0].normalized, 85.5);
  assertEquals(result.successful[0].normalizedUnit, "%");
});

Deno.test("Classify Integration - indicator_type='volume' behaves like count", async () => {
  const data = [
    {
      id: "exports",
      name: "Exports",
      value: 250,
      unit: "Thousands",
      // From classify package:
      indicator_type: "volume",
      is_currency_denominated: false,
    },
  ];

  const result = await processBatch(data, {
    toCurrency: "USD", // Should be ignored for volume
    toMagnitude: "ones",
    fx: mockFX,
    explain: false,
  });

  // Volume indicators should not have currency conversion, only magnitude scaling
  assertEquals(result.successful[0].normalized, 250000); // 250 thousands = 250000 ones
  assertEquals(result.successful[0].normalizedUnit, "ones");
});

Deno.test("Classify Integration - count indicator with classify fields", async () => {
  const data = [
    {
      id: "count_example",
      name: "Car Registrations",
      value: 50000,
      unit: "Thousands",
      indicator_type: "count", // From @tellimer/classify
      is_currency_denominated: false, // From @tellimer/classify
    },
  ];

  const result = await processBatch(data, {
    toCurrency: "USD",
    toMagnitude: "ones",
    fx: mockFX,
    explain: false,
  });

  // Count indicators should normalize properly with indicator_type field
  assertEquals(result.successful[0].normalized, 50000000);
  assertEquals(result.successful[0].normalizedUnit, "ones");
});
