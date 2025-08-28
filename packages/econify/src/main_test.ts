/**
 * Integration tests for the main econify functionality
 */

import { assertEquals } from "jsr:@std/assert";
import {
  classifyIndicator,
  type FXTable,
  type IndicatorInput,
  type IndicatorType,
  normalizeCurrencyValue,
  normalizeMonetaryFlow,
} from "./main.ts";

Deno.test("classifyIndicator - basic classification", () => {
  const samples: Array<[IndicatorInput, IndicatorType]> = [
    [{ name: "Public debt", unit: "USD bn" }, "stock"],
    [{ name: "Goods exports", unit: "USD" }, "flow"],
    [{ name: "CPI inflation", unit: "%" }, "rate"],
    [{ name: "Unemployment rate", unit: "%" }, "rate"],
    ["Foreign exchange rate, USD/EUR", "currency"], // FX rates are classified as currency
  ];

  for (const [inp, expected] of samples) {
    const c = classifyIndicator(inp);
    assertEquals(c.type, expected, `Failed for input: ${JSON.stringify(inp)}`);
  }
});

Deno.test("normalizeCurrencyValue - basic conversion", () => {
  const fx: FXTable = { base: "EUR", rates: { USD: 1.1, GBP: 0.85 } };

  // EUR to USD
  const eurToUsd = normalizeCurrencyValue(100, "EUR", "USD", fx);
  assertEquals(Math.round(eurToUsd * 100) / 100, 110);

  // USD to EUR
  const usdToEur = normalizeCurrencyValue(100, "USD", "EUR", fx);
  assertEquals(Math.round(usdToEur * 100) / 100, 90.91);
});

Deno.test("normalizeMonetaryFlow - complex normalization", () => {
  const fx: FXTable = { base: "EUR", rates: { USD: 1.1, GBP: 0.85 } };

  const result = normalizeMonetaryFlow(5, {
    fromCurrency: "USD",
    toCurrency: "GBP",
    fx,
    unitText: "USD mn per year",
    toTimeScale: "year",
  });

  // 5 million USD -> GBP per year
  // First convert to EUR: 5 / 1.1 = ~4.545 million EUR
  // Then convert to GBP: 4.545 * 0.85 = ~3.864 million GBP
  const expected = Math.round((5 / 1.1) * 0.85 * 100) / 100;
  assertEquals(Math.round(result * 100) / 100, expected);
});

// Run the original demo if this file is run directly
if (import.meta.main) {
  console.log("=== Econify Demo ===\n");

  const samples: Array<[IndicatorInput, IndicatorType]> = [
    [{ name: "Public debt", unit: "USD bn" }, "stock"],
    [{ name: "Goods exports", unit: "USD" }, "flow"],
    [{ name: "CPI inflation", unit: "%" }, "rate"],
    [{ name: "Unemployment rate", unit: "%" }, "rate"],
    ["Foreign exchange rate, USD/EUR", "rate"],
  ];

  console.log("Classification examples:");
  for (const [inp, _expected] of samples) {
    const c = classifyIndicator(inp);
    console.log(inp, "=>", c.type, c.confidence.toFixed(2), c.signals);
  }

  console.log("\nCurrency conversion examples:");
  const fx: FXTable = { base: "EUR", rates: { USD: 1.1, GBP: 0.85 } };
  console.log(
    "100 EUR -> USD =",
    normalizeCurrencyValue(100, "EUR", "USD", fx),
  );
  console.log(
    "100 USD -> EUR =",
    normalizeCurrencyValue(100, "USD", "EUR", fx),
  );
  console.log(
    "5 mn USD -> GBP =",
    normalizeMonetaryFlow(5, {
      fromCurrency: "USD",
      toCurrency: "GBP",
      fx,
      unitText: "USD mn per year",
      toTimeScale: "year",
    }),
  );
}
