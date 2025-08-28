/**
 * Tests for combined normalization module
 */

import { assertEquals, assertThrows } from "jsr:@std/assert";
import { normalizeMonetary, normalizeMonetaryFlow } from "./normalization.ts";
import type { FXTable } from "../types.ts";

const fx: FXTable = { base: "EUR", rates: { USD: 1.1, GBP: 0.85, JPY: 130 } };

Deno.test("normalizeMonetary - basic flow normalization", () => {
  const result = normalizeMonetary(100, {
    fromCurrency: "USD",
    toCurrency: "EUR",
    fx,
    unitText: "USD mn per year",
    fromTimeScale: "year",
    toTimeScale: "year",
  });

  // 100 USD -> EUR: 100 / 1.1 ≈ 90.91
  const expected = 100 / 1.1;
  assertEquals(
    Math.round(result * 100) / 100,
    Math.round(expected * 100) / 100,
  );
});

Deno.test("normalizeMonetary - with magnitude scaling", () => {
  const result = normalizeMonetary(1, {
    fromCurrency: "USD",
    toCurrency: "EUR",
    fx,
    unitText: "USD bn per year", // billions
    toMagnitude: "millions", // convert to millions
    fromTimeScale: "year",
    toTimeScale: "year",
  });

  // 1 billion USD -> millions EUR
  // First scale: 1 bn -> 1000 mn
  // Then convert: 1000 USD mn -> EUR mn: 1000 / 1.1 ≈ 909.09
  const expected = (1 * 1000) / 1.1;
  assertEquals(
    Math.round(result * 100) / 100,
    Math.round(expected * 100) / 100,
  );
});

Deno.test("normalizeMonetary - with time scaling", () => {
  const result = normalizeMonetary(400, {
    fromCurrency: "EUR",
    toCurrency: "USD",
    fx,
    unitText: "EUR mn per quarter",
    fromTimeScale: "quarter",
    toTimeScale: "year",
  });

  // 400 EUR mn per quarter -> USD mn per year
  // First time scale: 400 * 4 = 1600 EUR mn per year
  // Then convert: 1600 EUR -> USD: 1600 * 1.1 = 1760
  const expected = (400 * 4) * 1.1;
  assertEquals(result, expected);
});

Deno.test("normalizeMonetary - complex transformation", () => {
  const result = normalizeMonetary(2, {
    fromCurrency: "GBP",
    toCurrency: "JPY",
    fx,
    unitText: "GBP bn per quarter",
    toMagnitude: "millions",
    fromTimeScale: "quarter",
    toTimeScale: "year",
  });

  // 2 GBP bn per quarter -> JPY mn per year
  // 1. Scale: 2 bn -> 2000 mn
  // 2. Time: 2000 * 4 = 8000 mn per year (quarterly to annual)
  // 3. Currency: GBP -> EUR: 8000 / 0.85 ≈ 9411.76
  // 4. Currency: EUR -> JPY: 9411.76 * 130 ≈ 1,223,529
  const magnitudeScaled = 2 * 1000; // bn to mn
  const timeScaled = magnitudeScaled * 4; // quarter to year
  const toEur = timeScaled / 0.85; // GBP to EUR
  const toJpy = toEur * 130; // EUR to JPY

  assertEquals(Math.round(result), Math.round(toJpy));
});

Deno.test("normalizeMonetary - error when cannot infer time basis", () => {
  assertThrows(
    () =>
      normalizeMonetary(100, {
        fromCurrency: "USD",
        toCurrency: "EUR",
        fx,
        unitText: "USD mn", // no time info
        toTimeScale: "year",
      }),
    Error,
    "Cannot infer 'from' time basis",
  );
});

Deno.test("normalizeMonetaryFlow - same as normalizeMonetary", () => {
  const opts = {
    fromCurrency: "USD",
    toCurrency: "EUR",
    fx,
    unitText: "USD mn per year",
    toTimeScale: "year" as const,
  };

  const result1 = normalizeMonetary(100, {
    ...opts,
    fromTimeScale: "year",
  });

  const result2 = normalizeMonetaryFlow(100, opts);

  assertEquals(result1, result2);
});

Deno.test("normalizeMonetaryFlow - infers time scale from unit text", () => {
  const result = normalizeMonetaryFlow(1200, {
    fromCurrency: "EUR",
    toCurrency: "USD",
    fx,
    unitText: "EUR mn per month",
    toTimeScale: "year",
  });

  // 1200 EUR mn per month -> USD mn per year
  // Time: 1200 * 12 = 14400 EUR mn per year
  // Currency: 14400 * 1.1 = 15840 USD mn per year
  assertEquals(Math.round(result * 100) / 100, 15840);
});

Deno.test("normalizeMonetaryFlow - error when cannot infer time basis", () => {
  assertThrows(
    () =>
      normalizeMonetaryFlow(100, {
        fromCurrency: "USD",
        toCurrency: "EUR",
        fx,
        unitText: "USD mn", // no time info
        toTimeScale: "year",
      }),
    Error,
    "Cannot infer 'from' time basis",
  );
});
