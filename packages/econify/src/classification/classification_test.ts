/**
 * Tests for classification module
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import {
  classifyIndicator,
  isCurrency,
  isFlow,
  isRate,
  isStock,
} from "./classification.ts";
import type { IndicatorInput } from "../types.ts";

Deno.test("classifyIndicator - stock indicators", () => {
  const stockCases: IndicatorInput[] = [
    { name: "Public debt", unit: "USD bn" },
    { name: "Government reserves" },
    "Total assets",
    { name: "Outstanding loans", unit: "EUR mn" },
    { name: "Population", unit: "thousands" },
  ];

  for (const input of stockCases) {
    const result = classifyIndicator(input);
    assertEquals(
      result.type,
      "stock",
      `Expected stock for: ${JSON.stringify(input)}`,
    );
    assertEquals(
      result.confidence > 0.5,
      true,
      "Should have reasonable confidence",
    );
    assertExists(result.signals);
  }
});

Deno.test("classifyIndicator - flow indicators", () => {
  const flowCases: IndicatorInput[] = [
    { name: "GDP", unit: "USD bn per year" },
    { name: "Exports", unit: "EUR mn monthly" },
    "Production per quarter",
    { name: "Investment spending", unit: "USD bn annually" },
    { name: "Tourist arrivals", unit: "thousands per month" },
  ];

  for (const input of flowCases) {
    const result = classifyIndicator(input);
    assertEquals(
      result.type,
      "flow",
      `Expected flow for: ${JSON.stringify(input)}`,
    );
    assertEquals(
      result.confidence > 0.5,
      true,
      "Should have reasonable confidence",
    );
  }
});

Deno.test("classifyIndicator - rate indicators", () => {
  const rateCases: IndicatorInput[] = [
    { name: "Interest rate", unit: "%" },
    { name: "Inflation rate", unit: "percent" },
    "Unemployment rate",
    { name: "Yield spread", unit: "bps" },
    { name: "Price index", unit: "index" },
  ];

  for (const input of rateCases) {
    const result = classifyIndicator(input);
    assertEquals(
      result.type,
      "rate",
      `Expected rate for: ${JSON.stringify(input)}`,
    );
    assertEquals(
      result.confidence > 0.5,
      true,
      "Should have reasonable confidence",
    );
  }
});

Deno.test("classifyIndicator - currency indicators", () => {
  const currencyCases: IndicatorInput[] = [
    "USD/EUR exchange rate",
    { name: "Foreign exchange rate", unit: "USD per EUR" },
    "EUR/GBP FX rate",
  ];

  for (const input of currencyCases) {
    const result = classifyIndicator(input);
    assertEquals(
      result.type,
      "currency",
      `Expected currency for: ${JSON.stringify(input)}`,
    );
    assertEquals(
      result.confidence > 0.5,
      true,
      "Should have reasonable confidence",
    );
  }
});

Deno.test("classifyIndicator - currency detection", () => {
  const cases = [
    { input: { name: "GDP", unit: "USD bn" }, expected: "USD" },
    { input: { name: "Debt", unit: "€ millions" }, expected: "EUR" },
    { input: { name: "Assets", unit: "GBP bn" }, expected: "GBP" },
    { input: { name: "Revenue", unit: "¥ mn" }, expected: "JPY" },
  ];

  for (const { input, expected } of cases) {
    const result = classifyIndicator(input);
    assertEquals(
      result.detectedCurrency,
      expected,
      `Expected ${expected} for: ${JSON.stringify(input)}`,
    );
  }
});

Deno.test("helper functions", () => {
  const stockInput = { name: "Total debt", unit: "USD bn" };
  const flowInput = { name: "GDP", unit: "USD bn per year" };
  const rateInput = { name: "Interest rate", unit: "%" };
  const currencyInput = "USD/EUR exchange rate";

  assertEquals(isStock(stockInput), true);
  assertEquals(isFlow(flowInput), true);
  assertEquals(isRate(rateInput), true);
  assertEquals(isCurrency(currencyInput), true);

  // Cross-check
  assertEquals(isFlow(stockInput), false);
  assertEquals(isStock(flowInput), false);
});
