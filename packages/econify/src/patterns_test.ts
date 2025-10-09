/**
 * Tests for pattern definitions and constants
 *
 * Note: Classification pattern tests removed - use @tellimer/classify package instead.
 * These tests focus on normalization patterns (currency, magnitude, time).
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  CURRENCY_SYMBOLS,
  CURRENCY_WORDS,
  ISO_CODES,
  SCALE_MAP,
  SCALE_TOKENS,
  TIME_TOKENS,
  TIME_UNIT_PATTERNS,
} from "./patterns.ts";

// Classification pattern tests removed - STOCK_PATTERNS, FLOW_PATTERNS, RATE_PATTERNS
// Use @tellimer/classify package for indicator type classification

Deno.test("CURRENCY_SYMBOLS - contains major currency symbols", () => {
  const allSymbols = Object.values(CURRENCY_SYMBOLS).flat();
  assertEquals(allSymbols.includes("$"), true);
  assertEquals(allSymbols.includes("€"), true);
  assertEquals(allSymbols.includes("£"), true);
  assertEquals(allSymbols.includes("¥"), true);
});

Deno.test("CURRENCY_WORDS - contains currency words", () => {
  assertEquals(CURRENCY_WORDS.includes("currency"), true);
  assertEquals(CURRENCY_WORDS.includes("exchange rate"), true);
  assertEquals(CURRENCY_WORDS.includes("fx"), true);
  assertEquals(CURRENCY_WORDS.includes("foreign exchange"), true);
});

Deno.test("ISO_CODES - contains major ISO currency codes", () => {
  assertEquals(ISO_CODES.has("USD"), true);
  assertEquals(ISO_CODES.has("EUR"), true);
  assertEquals(ISO_CODES.has("GBP"), true);
  assertEquals(ISO_CODES.has("JPY"), true);
  assertEquals(ISO_CODES.has("ARS"), true); // Argentina Peso
  assertEquals(ISO_CODES.has("AOA"), true); // Angola Kwanza
});

Deno.test("SCALE_MAP - contains all scale values", () => {
  assertEquals(SCALE_MAP.ones, 1);
  assertEquals(SCALE_MAP.hundreds, 1e2); // Added for car registrations
  assertEquals(SCALE_MAP.thousands, 1e3);
  assertEquals(SCALE_MAP.millions, 1e6);
  assertEquals(SCALE_MAP.billions, 1e9);
  assertEquals(SCALE_MAP.trillions, 1e12);
});

Deno.test("SCALE_TOKENS - contains scale patterns", () => {
  // Check that hundreds pattern exists
  const hundredsToken = SCALE_TOKENS.find(([scale]) => scale === "hundreds");
  assertExists(hundredsToken);
  assertEquals(hundredsToken[0], "hundreds");

  // Test the regex pattern
  const hundredsRegex = hundredsToken[1];
  assertEquals(hundredsRegex.test("hundreds"), true);
  assertEquals(hundredsRegex.test("Hundreds"), true);
  assertEquals(hundredsRegex.test("hundred"), true);
});

Deno.test("TIME_TOKENS - contains time scale patterns", () => {
  const timeScales = TIME_TOKENS.map(([scale]) => scale);
  assertEquals(timeScales.includes("hour"), true);
  assertEquals(timeScales.includes("day"), true);
  assertEquals(timeScales.includes("week"), true);
  assertEquals(timeScales.includes("month"), true);
  assertEquals(timeScales.includes("year"), true);
});

Deno.test("TIME_UNIT_PATTERNS - contains time unit patterns", () => {
  assertEquals(TIME_UNIT_PATTERNS.length > 0, true);
  assertEquals(TIME_UNIT_PATTERNS.includes("monthly"), true);
  assertEquals(TIME_UNIT_PATTERNS.includes("annual"), true);
  assertEquals(TIME_UNIT_PATTERNS.includes("annually"), true);
  assertEquals(TIME_UNIT_PATTERNS.includes("/month"), true);
});

// RATE_UNIT_PATTERNS tests removed - use units/units.ts for percentage detection

Deno.test("Pattern consistency - no duplicates in arrays", () => {
  // Check for duplicates in pattern arrays (arrays only)
  const checkNoDuplicates = (arr: readonly string[], name: string) => {
    const unique = new Set(arr);
    assertEquals(
      unique.size,
      arr.length,
      `${name} contains duplicate entries`,
    );
  };

  checkNoDuplicates(TIME_UNIT_PATTERNS, "TIME_UNIT_PATTERNS");
  checkNoDuplicates(CURRENCY_WORDS, "CURRENCY_WORDS");
});

Deno.test("Hundreds scale support - in SCALE_MAP and SCALE_TOKENS", () => {
  // Verify hundreds scale support was added
  assertEquals(SCALE_MAP.hundreds, 100);

  const hundredsToken = SCALE_TOKENS.find(([scale]) => scale === "hundreds");
  assertExists(hundredsToken);

  // Test the regex works for various forms
  const regex = hundredsToken[1];
  assertEquals(regex.test("hundreds"), true);
  assertEquals(regex.test("Hundreds"), true);
  assertEquals(regex.test("hundred"), true);
  assertEquals(regex.test("HUNDREDS"), true);
});
