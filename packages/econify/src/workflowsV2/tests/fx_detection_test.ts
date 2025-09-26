/**
 * Tests for FX Detection utilities
 */

import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import {
  detectFXRequirement,
  isAlwaysFXDomain,
  isConditionalFXDomain,
  isNeverFXDomain,
  splitItemsByFX,
} from "../classify/fx-detection.ts";
import type { ParsedData } from "../shared/types.ts";

Deno.test("FX Detection: Detects currency in price units", () => {
  const testCases = [
    // Prices with currency
    {
      unit: "USD per barrel",
      expected: {
        needsFX: true,
        currencyCode: "USD",
        pricePattern: "per_unit",
      },
    },
    {
      unit: "EUR/tonne",
      expected: {
        needsFX: true,
        currencyCode: "EUR",
        pricePattern: "per_unit",
      },
    },
    {
      unit: "GBP per MWh",
      expected: {
        needsFX: true,
        currencyCode: "GBP",
        pricePattern: "per_unit",
      },
    },

    // Absolute monetary values
    {
      unit: "USD millions",
      expected: {
        needsFX: true,
        currencyCode: "USD",
        pricePattern: "absolute",
      },
    },
    {
      unit: "EUR",
      expected: {
        needsFX: true,
        currencyCode: "EUR",
        pricePattern: "absolute",
      },
    },
    {
      unit: "thousand GBP",
      expected: {
        needsFX: true,
        currencyCode: "GBP",
        pricePattern: "absolute",
      },
    },

    // No currency
    { unit: "barrels", expected: { needsFX: false, pricePattern: "none" } },
    { unit: "tonnes", expected: { needsFX: false, pricePattern: "none" } },
    { unit: "MWh", expected: { needsFX: false, pricePattern: "none" } },
    { unit: "%", expected: { needsFX: false, pricePattern: "none" } },
    { unit: "points", expected: { needsFX: false, pricePattern: "none" } },
    { unit: "units", expected: { needsFX: false, pricePattern: "none" } },
  ];

  for (const testCase of testCases) {
    const item: ParsedData = { value: 100, unit: testCase.unit } as ParsedData;
    const result = detectFXRequirement(item);

    assertEquals(
      result.needsFX,
      testCase.expected.needsFX,
      `needsFX for ${testCase.unit}`,
    );
    assertEquals(
      result.currencyCode,
      testCase.expected.currencyCode,
      `currencyCode for ${testCase.unit}`,
    );
    assertEquals(
      result.pricePattern,
      testCase.expected.pricePattern,
      `pricePattern for ${testCase.unit}`,
    );
  }
});

Deno.test("FX Detection: Splits items by FX requirement", () => {
  const items: ParsedData[] = [
    { id: "1", value: 100, unit: "USD per barrel" } as ParsedData,
    { id: "2", value: 200, unit: "barrels" } as ParsedData,
    { id: "3", value: 50, unit: "EUR millions" } as ParsedData,
    { id: "4", value: 75, unit: "tonnes" } as ParsedData,
    { id: "5", value: 25, unit: "GBP/tonne" } as ParsedData,
  ];

  const { fxItems, nonFXItems } = splitItemsByFX(items);

  assertEquals(fxItems.length, 3, "Should have 3 FX items");
  assertEquals(nonFXItems.length, 2, "Should have 2 non-FX items");

  // Check specific items
  assertEquals(fxItems[0].id, "1");
  assertEquals(fxItems[1].id, "3");
  assertEquals(fxItems[2].id, "5");

  assertEquals(nonFXItems[0].id, "2");
  assertEquals(nonFXItems[1].id, "4");

  // Check metadata was added
  assertEquals((fxItems[0] as any)._fxDetection?.needsFX, true);
  assertEquals((fxItems[0] as any)._fxDetection?.currencyCode, "USD");
});

Deno.test("FX Detection: Domain classification helpers", () => {
  // Always FX domains
  assertEquals(isAlwaysFXDomain("monetaryStock"), true);
  assertEquals(isAlwaysFXDomain("monetaryFlow"), true);
  assertEquals(isAlwaysFXDomain("commodities"), false);

  // Conditional FX domains
  assertEquals(isConditionalFXDomain("commodities"), true);
  assertEquals(isConditionalFXDomain("agriculture"), true);
  assertEquals(isConditionalFXDomain("metals"), true);
  assertEquals(isConditionalFXDomain("energy"), true);
  assertEquals(isConditionalFXDomain("crypto"), true);
  assertEquals(isConditionalFXDomain("monetaryStock"), false);
  assertEquals(isConditionalFXDomain("counts"), false);

  // Never FX domains
  assertEquals(isNeverFXDomain("counts"), true);
  assertEquals(isNeverFXDomain("percentages"), true);
  assertEquals(isNeverFXDomain("indices"), true);
  assertEquals(isNeverFXDomain("ratios"), true);
  assertEquals(isNeverFXDomain("monetaryStock"), false);
  assertEquals(isNeverFXDomain("commodities"), false);
});

Deno.test("FX Detection: Handles exotic currencies", () => {
  const exoticCases = [
    {
      unit: "MDL per barrel",
      expected: { needsFX: true, currencyCode: "MDL" },
    }, // Moldova
    { unit: "ZWL millions", expected: { needsFX: true, currencyCode: "ZWL" } }, // Zimbabwe
    { unit: "SSP/tonne", expected: { needsFX: true, currencyCode: "SSP" } }, // South Sudan
    { unit: "XOF per unit", expected: { needsFX: true, currencyCode: "XOF" } }, // West African CFA
    { unit: "XAF thousands", expected: { needsFX: true, currencyCode: "XAF" } }, // Central African CFA
  ];

  for (const testCase of exoticCases) {
    const item: ParsedData = { value: 100, unit: testCase.unit } as ParsedData;
    const result = detectFXRequirement(item);

    assertEquals(
      result.needsFX,
      testCase.expected.needsFX,
      `needsFX for ${testCase.unit}`,
    );
    assertEquals(
      result.currencyCode,
      testCase.expected.currencyCode,
      `currencyCode for ${testCase.unit}`,
    );
  }
});
