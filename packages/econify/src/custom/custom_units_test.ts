/**
 * Tests for custom units module
 */

import { assert, assertEquals } from "@std/assert";
import {
  convertCustomUnit,
  type CustomUnit,
  getCustomUnit,
  loadDomainUnits,
  parseWithCustomUnits,
  registerCustomUnit,
  registerCustomUnits,
} from "./custom_units.ts";

Deno.test("registerCustomUnit - basic registration", () => {
  const customUnit: CustomUnit = {
    pattern: /barrels?/i,
    category: "volume",
    normalized: "barrel",
  };

  registerCustomUnit("oil_barrel", customUnit);

  const retrieved = getCustomUnit("oil_barrel");
  assertEquals(retrieved?.category, "volume");
  assertEquals(retrieved?.normalized, "barrel");
});

Deno.test("registerCustomUnit - with string pattern", () => {
  const customUnit: CustomUnit = {
    pattern: "tonnes?",
    category: "mass",
    normalized: "tonne",
  };

  registerCustomUnit("metric_ton", customUnit);

  const retrieved = getCustomUnit("metric_ton");
  assertEquals(retrieved?.category, "mass");
  assertEquals(retrieved?.normalized, "tonne");
});

Deno.test("registerCustomUnit - with conversion factor", () => {
  const customUnit: CustomUnit = {
    pattern: /troy ounces?/i,
    category: "mass",
    normalized: "gram",
    conversionFactor: {
      to: "gram",
      factor: 31.1035,
    },
  };

  registerCustomUnit("troy_ounce", customUnit);

  const retrieved = getCustomUnit("troy_ounce");
  assertEquals(retrieved?.conversionFactor?.to, "gram");
  assertEquals(retrieved?.conversionFactor?.factor, 31.1035);
});

Deno.test("registerCustomUnit - with parser and validator", () => {
  const customUnit: CustomUnit = {
    pattern: /custom unit/i,
    category: "custom",
    parser: (text: string) => ({ parsed: text }),
    validator: (value: number) => value > 0,
  };

  registerCustomUnit("test_unit", customUnit);

  const retrieved = getCustomUnit("test_unit");
  assert(retrieved?.parser);
  assert(retrieved?.validator);

  // Test parser
  const parsed = retrieved.parser("test text");
  assertEquals(parsed, { parsed: "test text" });

  // Test validator
  assert(retrieved.validator(5) === true);
  assert(retrieved.validator(-1) === false);
});

Deno.test("registerCustomUnits - bulk registration", () => {
  const units = {
    barrel: {
      pattern: /barrels?/i,
      category: "volume",
      normalized: "barrel",
    },
    tonne: {
      pattern: "tonnes?",
      category: "mass",
      normalized: "tonne",
    },
    custom: {
      pattern: /custom/i,
      category: "custom",
    },
  };

  registerCustomUnits(units);

  assertEquals(getCustomUnit("barrel")?.category, "volume");
  assertEquals(getCustomUnit("tonne")?.category, "mass");
  assertEquals(getCustomUnit("custom")?.category, "custom");
});

Deno.test("parseWithCustomUnits - matches registered patterns", () => {
  registerCustomUnit("test_barrel", {
    pattern: /oil barrels?/i,
    category: "volume",
    normalized: "barrel",
  });

  const result1 = parseWithCustomUnits("oil barrel");
  assertEquals(result1?.category, "volume");
  assertEquals(result1?.normalized, "barrel");
  assertEquals(result1?.custom, true);

  const result2 = parseWithCustomUnits("Oil Barrels");
  assertEquals(result2?.category, "volume");
  assertEquals(result2?.normalized, "barrel");

  const result3 = parseWithCustomUnits("unknown unit");
  assertEquals(result3, null);
});

Deno.test("convertCustomUnit - basic conversion", () => {
  registerCustomUnit("troy_ounce", {
    pattern: /troy ounces?/i,
    category: "mass",
    normalized: "gram",
    conversionFactor: {
      to: "gram",
      factor: 31.1035,
    },
  });

  const result = convertCustomUnit(2, "troy_ounce", "gram");
  assertEquals(result, 62.207);
});

Deno.test("convertCustomUnit - reverse conversion", () => {
  registerCustomUnit("troy_ounce", {
    pattern: /troy ounces?/i,
    category: "mass",
    normalized: "gram",
    conversionFactor: {
      to: "gram",
      factor: 31.1035,
    },
  });

  const result = convertCustomUnit(62.207, "gram", "troy_ounce");
  assertEquals(result, 2);
});

Deno.test("convertCustomUnit - no conversion available", () => {
  const result = convertCustomUnit(5, "unknown", "gram");
  assertEquals(result, null);
});

Deno.test("loadDomainUnits - emissions domain", () => {
  loadDomainUnits("emissions");

  const co2Unit = getCustomUnit("CO2_tonnes");
  assertEquals(co2Unit?.category, "emissions");
  assertEquals(co2Unit?.normalized, "CO2 tonnes");
  assertEquals(co2Unit?.conversionFactor?.to, "kg");
  assertEquals(co2Unit?.conversionFactor?.factor, 1000);

  const creditsUnit = getCustomUnit("carbon_credits");
  assertEquals(creditsUnit?.category, "emissions");
  assertEquals(creditsUnit?.normalized, "carbon credits");
});

Deno.test("loadDomainUnits - crypto domain", () => {
  loadDomainUnits("crypto");

  const btcUnit = getCustomUnit("BTC");
  assertEquals(btcUnit?.category, "cryptocurrency");
  assertEquals(btcUnit?.normalized, "BTC");

  const ethUnit = getCustomUnit("ETH");
  assertEquals(ethUnit?.category, "cryptocurrency");
  assertEquals(ethUnit?.normalized, "ETH");

  const weiUnit = getCustomUnit("wei");
  assertEquals(weiUnit?.category, "cryptocurrency");
  assertEquals(weiUnit?.normalized, "wei");
  assertEquals(weiUnit?.conversionFactor?.to, "ETH");
  assertEquals(weiUnit?.conversionFactor?.factor, 1e-18);
});

Deno.test("loadDomainUnits - commodities domain", () => {
  loadDomainUnits("commodities");

  const goldUnit = getCustomUnit("gold_oz");
  assertEquals(goldUnit?.category, "commodity");
  assertEquals(goldUnit?.normalized, "troy oz");

  const oilUnit = getCustomUnit("crude_barrel");
  assertEquals(oilUnit?.category, "commodity");
  assertEquals(oilUnit?.normalized, "barrel");
});

Deno.test("domain units - pattern matching integration", () => {
  // Test crypto pattern matching (avoid conflicts with other patterns)
  loadDomainUnits("crypto");

  const btcResult = parseWithCustomUnits("BTC");
  assertEquals(btcResult?.category, "cryptocurrency");
  assertEquals(btcResult?.normalized, "BTC");
  assertEquals(btcResult?.custom, true);

  const bitcoinResult = parseWithCustomUnits("bitcoin");
  assertEquals(bitcoinResult?.category, "cryptocurrency");
  assertEquals(bitcoinResult?.normalized, "BTC");

  const ethResult = parseWithCustomUnits("ETH");
  assertEquals(ethResult?.category, "cryptocurrency");
  assertEquals(ethResult?.normalized, "ETH");

  const ethereumResult = parseWithCustomUnits("ethereum");
  assertEquals(ethereumResult?.category, "cryptocurrency");
  assertEquals(ethereumResult?.normalized, "ETH");

  const weiResult = parseWithCustomUnits("wei");
  assertEquals(weiResult?.category, "cryptocurrency");
  assertEquals(weiResult?.normalized, "wei");
});
