import { assertEquals, assertExists } from "jsr:@std/assert";
import {
  analyzeFXRequirements,
  extractRequiredCurrencies,
  itemNeedsFX,
  itemsNeedFX,
  needsFXForBuckets,
} from "../shared/fx_detection.ts";
import type { V2Buckets } from "../shared/types.ts";

Deno.test("FX Detection - Individual Items", () => {
  // Monetary items (always need FX)
  assertEquals(
    itemNeedsFX({ value: 1000, unit: "USD millions", currency_code: "USD" }),
    true,
  );
  assertEquals(itemNeedsFX({ value: 5000, unit: "EUR per month" }), true);
  assertEquals(itemNeedsFX({ value: 25000, unit: "GBP billions" }), true);

  // Commodity prices (need FX)
  assertEquals(itemNeedsFX({ value: 85.50, unit: "USD per barrel" }), true);
  assertEquals(itemNeedsFX({ value: 1950, unit: "USD per ounce" }), true);
  assertEquals(itemNeedsFX({ value: 650, unit: "EUR per tonne" }), true);

  // Agriculture prices (need FX)
  assertEquals(itemNeedsFX({ value: 7.50, unit: "USD per bushel" }), true);
  assertEquals(itemNeedsFX({ value: 450, unit: "EUR per tonne" }), true);

  // Metal prices (need FX)
  assertEquals(itemNeedsFX({ value: 8500, unit: "USD per tonne" }), true);
  assertEquals(itemNeedsFX({ value: 2000, unit: "GBP per troy oz" }), true);

  // Energy prices (need FX)
  assertEquals(itemNeedsFX({ value: 120, unit: "USD per MWh" }), true);
  assertEquals(itemNeedsFX({ value: 85, unit: "EUR per barrel" }), true);

  // Physical volumes (no FX needed)
  assertEquals(itemNeedsFX({ value: 1000, unit: "barrels" }), false);
  assertEquals(itemNeedsFX({ value: 250, unit: "tonnes" }), false);
  assertEquals(itemNeedsFX({ value: 500, unit: "million tonnes" }), false);
  assertEquals(itemNeedsFX({ value: 1250, unit: "GWh" }), false);

  // Counts (no FX needed)
  assertEquals(itemNeedsFX({ value: 1000000, unit: "people" }), false);
  assertEquals(itemNeedsFX({ value: 50000, unit: "vehicles" }), false);

  // Percentages (no FX needed)
  assertEquals(itemNeedsFX({ value: 3.5, unit: "%" }), false);
  assertEquals(itemNeedsFX({ value: 2.1, unit: "percent" }), false);

  // Indices (no FX needed)
  assertEquals(itemNeedsFX({ value: 105.2, unit: "points" }), false);
  assertEquals(itemNeedsFX({ value: 4500, unit: "index" }), false);

  // Crypto (no FX needed)
  assertEquals(itemNeedsFX({ value: 45000, unit: "BTC" }), false);
  assertEquals(itemNeedsFX({ value: 3200, unit: "ETH" }), false);
});

Deno.test("FX Detection - Bucket Analysis", () => {
  // Pure monetary data (should need FX)
  const monetaryBuckets: V2Buckets = {
    monetaryStock: [
      { value: 25000, unit: "USD billions", name: "GDP" },
      { value: 15000, unit: "EUR billions", name: "GDP" },
    ],
    monetaryFlow: [
      { value: 5000, unit: "USD per month", name: "Salary" },
    ],
    counts: [],
    percentages: [],
    indices: [],
    ratios: [],
    energy: [],
    commodities: [],
    agriculture: [],
    metals: [],
    crypto: [],
  };
  assertEquals(needsFXForBuckets(monetaryBuckets), true);

  // Pure non-monetary data (should not need FX)
  const nonMonetaryBuckets: V2Buckets = {
    monetaryStock: [],
    monetaryFlow: [],
    counts: [
      { value: 1000000, unit: "people", name: "Population" },
    ],
    percentages: [
      { value: 3.5, unit: "%", name: "Inflation" },
    ],
    indices: [
      { value: 105.2, unit: "points", name: "CPI" },
    ],
    energy: [
      { value: 1250, unit: "GWh", name: "Energy Production" },
    ],
    commodities: [
      { value: 1000, unit: "barrels", name: "Oil Production" },
    ],
    agriculture: [
      { value: 250, unit: "tonnes", name: "Wheat Production" },
    ],
    ratios: [],
    metals: [],
    crypto: [],
  };
  assertEquals(needsFXForBuckets(nonMonetaryBuckets), false);

  // Mixed with commodity prices (should need FX)
  const mixedWithPricesBuckets: V2Buckets = {
    monetaryStock: [],
    monetaryFlow: [],
    commodities: [
      { value: 85.50, unit: "USD per barrel", name: "Oil Price" },
      { value: 1000, unit: "barrels", name: "Oil Production" },
    ],
    agriculture: [
      { value: 7.50, unit: "USD per bushel", name: "Wheat Price" },
      { value: 250, unit: "tonnes", name: "Wheat Production" },
    ],
    counts: [],
    percentages: [],
    indices: [],
    ratios: [],
    energy: [],
    metals: [],
    crypto: [],
  };
  assertEquals(needsFXForBuckets(mixedWithPricesBuckets), true);
});

Deno.test("FX Detection - Detailed Analysis", () => {
  const mixedBuckets: V2Buckets = {
    monetaryStock: [
      { value: 25000, unit: "USD billions", name: "GDP" },
    ],
    monetaryFlow: [
      { value: 5000, unit: "EUR per month", name: "Salary" },
    ],
    commodities: [
      { value: 85.50, unit: "USD per barrel", name: "Oil Price" },
      { value: 1000, unit: "barrels", name: "Oil Production" },
    ],
    counts: [
      { value: 1000000, unit: "people", name: "Population" },
    ],
    percentages: [
      { value: 3.5, unit: "%", name: "Inflation" },
    ],
    agriculture: [],
    indices: [],
    ratios: [],
    energy: [],
    metals: [],
    crypto: [],
  };

  const analysis = analyzeFXRequirements(mixedBuckets);

  assertEquals(analysis.needsFX, true);
  assertEquals(analysis.monetaryCount, 2);
  assertEquals(analysis.priceBasedCount, 1);
  assertEquals(analysis.nonFXCount, 3); // 1 oil production + 1 population + 1 inflation

  assertExists(analysis.reasons);
  assertEquals(analysis.reasons.length >= 2, true); // Should have monetary and commodities reasons
});

Deno.test("FX Detection - Currency Extraction", () => {
  const buckets: V2Buckets = {
    monetaryStock: [
      { value: 25000, unit: "USD billions", currency_code: "USD" },
      { value: 15000, unit: "EUR billions", currency_code: "EUR" },
    ],
    commodities: [
      { value: 85.50, unit: "GBP per barrel" },
      { value: 8500, unit: "JPY per tonne" },
    ],
    monetaryFlow: [],
    counts: [],
    percentages: [],
    indices: [],
    ratios: [],
    energy: [],
    agriculture: [],
    metals: [],
    crypto: [],
  };

  const currencies = extractRequiredCurrencies(buckets);

  assertEquals(currencies.includes("USD"), true);
  assertEquals(currencies.includes("EUR"), true);
  assertEquals(currencies.includes("GBP"), true);
  assertEquals(currencies.includes("JPY"), true);
  assertEquals(currencies.length, 4);
});

Deno.test("FX Detection - Edge Cases", () => {
  // Empty buckets
  const emptyBuckets: V2Buckets = {
    monetaryStock: [],
    monetaryFlow: [],
    counts: [],
    percentages: [],
    indices: [],
    ratios: [],
    energy: [],
    commodities: [],
    agriculture: [],
    metals: [],
    crypto: [],
  };
  assertEquals(needsFXForBuckets(emptyBuckets), false);

  // Ambiguous units
  assertEquals(itemNeedsFX({ value: 100, unit: "USD/Liter" }), true); // Price ratio
  assertEquals(itemNeedsFX({ value: 2.5, unit: "persons/km²" }), false); // Density ratio

  // Custom currency patterns
  assertEquals(itemNeedsFX({ value: 1000, unit: "CHF millions" }), true);
  assertEquals(itemNeedsFX({ value: 500, unit: "CNY per hour" }), true);

  // Crypto vs fiat
  assertEquals(itemNeedsFX({ value: 45000, unit: "USD" }), true); // Fiat
  assertEquals(itemNeedsFX({ value: 1.5, unit: "BTC" }), false); // Crypto
});
