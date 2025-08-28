/**
 * Tests for currency normalization module
 */

import { assertEquals, assertThrows } from "jsr:@std/assert";
import { normalizeCurrencyValue } from "./currency.ts";
import type { FXTable } from "../types.ts";

Deno.test("normalizeCurrencyValue - same currency", () => {
  const fx: FXTable = { base: "EUR", rates: { USD: 1.1 } };
  assertEquals(normalizeCurrencyValue(100, "USD", "USD", fx), 100);
  assertEquals(normalizeCurrencyValue(100, "EUR", "EUR", fx), 100);
});

Deno.test("normalizeCurrencyValue - base currency conversions", () => {
  const fx: FXTable = { base: "EUR", rates: { USD: 1.1, GBP: 0.85 } };

  // EUR to USD
  const eurToUsd = normalizeCurrencyValue(100, "EUR", "USD", fx);
  assertEquals(Math.round(eurToUsd * 100) / 100, 110);

  // EUR to GBP
  assertEquals(normalizeCurrencyValue(100, "EUR", "GBP", fx), 85);

  // USD to EUR
  const usdToEur = normalizeCurrencyValue(110, "USD", "EUR", fx);
  assertEquals(Math.round(usdToEur), 100);

  // GBP to EUR
  const gbpToEur = normalizeCurrencyValue(85, "GBP", "EUR", fx);
  assertEquals(Math.round(gbpToEur), 100);
});

Deno.test("normalizeCurrencyValue - cross currency conversions", () => {
  const fx: FXTable = { base: "EUR", rates: { USD: 1.1, GBP: 0.85, JPY: 130 } };

  // USD to GBP via EUR
  const usdToGbp = normalizeCurrencyValue(110, "USD", "GBP", fx);
  assertEquals(Math.round(usdToGbp), 85);

  // GBP to JPY via EUR
  const gbpToJpy = normalizeCurrencyValue(85, "GBP", "JPY", fx);
  assertEquals(Math.round(gbpToJpy), 13000);
});

Deno.test("normalizeCurrencyValue - case insensitive", () => {
  const fx: FXTable = { base: "EUR", rates: { USD: 1.1 } };

  const result1 = normalizeCurrencyValue(100, "eur", "usd", fx);
  assertEquals(Math.round(result1 * 100) / 100, 110);
  const result2 = normalizeCurrencyValue(100, "Eur", "Usd", fx);
  assertEquals(Math.round(result2 * 100) / 100, 110);
  const result3 = normalizeCurrencyValue(100, "EUR", "usd", fx);
  assertEquals(Math.round(result3 * 100) / 100, 110);
});

Deno.test("normalizeCurrencyValue - error cases", () => {
  const fx: FXTable = { base: "EUR", rates: { USD: 1.1 } };

  // Missing source currency
  assertThrows(
    () => normalizeCurrencyValue(100, "GBP", "USD", fx),
    Error,
    "No FX rate available to convert from GBP to EUR",
  );

  // Missing target currency
  assertThrows(
    () => normalizeCurrencyValue(100, "USD", "GBP", fx),
    Error,
    "No FX rate available to convert from EUR to GBP",
  );

  // Zero rate
  const badFx: FXTable = { base: "EUR", rates: { USD: 0 } };
  assertThrows(
    () => normalizeCurrencyValue(100, "USD", "EUR", badFx),
    Error,
    "Invalid FX rate for USD",
  );
});

Deno.test("normalizeCurrencyValue - precision", () => {
  const fx: FXTable = { base: "EUR", rates: { USD: 1.23456 } };

  const result = normalizeCurrencyValue(100, "EUR", "USD", fx);
  assertEquals(Math.round(result * 1000) / 1000, 123.456);

  const reverse = normalizeCurrencyValue(123.456, "USD", "EUR", fx);
  assertEquals(Math.round(reverse * 100000) / 100000, 100);
});
