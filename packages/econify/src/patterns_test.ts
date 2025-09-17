/**
 * Tests for pattern definitions and constants
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  CURRENCY_SYMBOLS,
  CURRENCY_WORDS,
  FLOW_PATTERNS,
  ISO_CODES,
  RATE_PATTERNS,
  RATE_UNIT_PATTERNS,
  SCALE_MAP,
  SCALE_TOKENS,
  STOCK_PATTERNS,
  TIME_TOKENS,
  TIME_UNIT_PATTERNS,
} from "./patterns.ts";

Deno.test("STOCK_PATTERNS - contains expected patterns", () => {
  assertEquals(STOCK_PATTERNS.includes("debt"), true);
  assertEquals(STOCK_PATTERNS.includes("reserves"), true);
  assertEquals(STOCK_PATTERNS.includes("outstanding"), true);
  assertEquals(STOCK_PATTERNS.includes("population"), true);
});

Deno.test("FLOW_PATTERNS - contains expected patterns", () => {
  assertEquals(FLOW_PATTERNS.includes("exports"), true);
  assertEquals(FLOW_PATTERNS.includes("imports"), true);
  assertEquals(FLOW_PATTERNS.includes("revenue"), true);
  assertEquals(FLOW_PATTERNS.includes("registrations"), true); // Added for car registrations
});

Deno.test("RATE_PATTERNS - contains expected patterns", () => {
  assertEquals(RATE_PATTERNS.includes("rate"), true);
  assertEquals(RATE_PATTERNS.includes("ratio"), true);
  assertEquals(RATE_PATTERNS.includes("percent"), true);
  assertEquals(RATE_PATTERNS.includes("inflation"), true);
});

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

Deno.test("RATE_UNIT_PATTERNS - contains rate unit patterns", () => {
  assertEquals(RATE_UNIT_PATTERNS.length > 0, true);
  assertEquals(RATE_UNIT_PATTERNS.includes("%"), true);
  assertEquals(RATE_UNIT_PATTERNS.includes("percent"), true);
  assertEquals(RATE_UNIT_PATTERNS.includes("percentage"), true);
  assertEquals(RATE_UNIT_PATTERNS.includes("bps"), true);
});

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

  checkNoDuplicates(STOCK_PATTERNS, "STOCK_PATTERNS");
  checkNoDuplicates(FLOW_PATTERNS, "FLOW_PATTERNS");
  checkNoDuplicates(RATE_PATTERNS, "RATE_PATTERNS");
  checkNoDuplicates(RATE_UNIT_PATTERNS, "RATE_UNIT_PATTERNS");
  checkNoDuplicates(TIME_UNIT_PATTERNS, "TIME_UNIT_PATTERNS");
  checkNoDuplicates(CURRENCY_WORDS, "CURRENCY_WORDS");
});

Deno.test("Car registration patterns - registrations in FLOW_PATTERNS", () => {
  // Verify that "registrations" was added to FLOW_PATTERNS for car registration fix
  assertEquals(FLOW_PATTERNS.includes("registrations"), true);
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
