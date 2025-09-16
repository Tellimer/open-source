import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { processBatch } from "./batch.ts";
import type { BatchItem } from "./batch.ts";

// Test data with explicit metadata fields
const testData: BatchItem[] = [
  {
    id: "BEN_TRADE",
    value: -482.58,
    unit: "XOF Billion",
    periodicity: "Quarterly", // 🆕 Explicit periodicity
    scale: "Billions", // 🆕 Explicit scale
    currency_code: "XOF", // 🆕 Explicit currency
  },
  {
    id: "BGD_TRADE",
    value: -181.83,
    unit: "BDT Billion",
    periodicity: "Monthly", // 🆕 Explicit periodicity
    scale: "Billions", // 🆕 Explicit scale
    currency_code: "BDT", // 🆕 Explicit currency
  },
  {
    id: "BHR_TRADE",
    value: -119.22,
    unit: "BHD Million",
    periodicity: "Yearly", // 🆕 Explicit periodicity
    scale: "Millions", // 🆕 Explicit scale
    currency_code: "BHD", // 🆕 Explicit currency
  },
];

const fxRates = {
  base: "USD",
  rates: {
    XOF: 558.16,
    BDT: 121.61,
    BHD: 0.37702,
  },
};

Deno.test("Batch Processing - explicit metadata fields", async () => {
  const result = await processBatch(testData, {
    toCurrency: "USD",
    toMagnitude: "millions",
    toTimeScale: "month",
    fx: fxRates,
    explain: true,
  });

  assertEquals(result.successful.length, 3);
  assertEquals(result.failed.length, 0);

  // Verify Benin (Quarterly → Monthly conversion)
  const benin = result.successful.find((item) => item.id === "BEN_TRADE");
  assertExists(benin);
  assertEquals(Math.round(benin.normalized * 100) / 100, -288.20); // Rounded to 2 decimals
  assertEquals(benin.normalizedUnit, "USD millions per month");

  // Verify explain metadata
  assertExists(benin.explain);
  assertEquals(benin.explain.fx?.currency, "XOF");
  assertEquals(benin.explain.fx?.rate, 558.16);
  assertEquals(benin.explain.magnitude?.originalScale, "billions");
  assertEquals(benin.explain.magnitude?.targetScale, "millions");
  assertEquals(benin.explain.magnitude?.factor, 1000);
  assertEquals(benin.explain.periodicity?.original, "quarter");
  assertEquals(benin.explain.periodicity?.target, "month");
  assertEquals(benin.explain.periodicity?.adjusted, true);

  // Verify Bangladesh (Monthly → Monthly, no time conversion)
  const bangladesh = result.successful.find((item) => item.id === "BGD_TRADE");
  assertExists(bangladesh);
  assertEquals(Math.round(bangladesh.normalized * 100) / 100, -1495.19);
  assertEquals(bangladesh.normalizedUnit, "USD millions per month");

  assertExists(bangladesh.explain);
  assertEquals(bangladesh.explain.periodicity?.original, "month");
  assertEquals(bangladesh.explain.periodicity?.target, "month");
  assertEquals(bangladesh.explain.periodicity?.adjusted, false);

  // Verify Bahrain (Yearly → Monthly conversion)
  const bahrain = result.successful.find((item) => item.id === "BHR_TRADE");
  assertExists(bahrain);
  assertEquals(Math.round(bahrain.normalized * 100) / 100, -26.35);
  assertEquals(bahrain.normalizedUnit, "USD millions per month");

  assertExists(bahrain.explain);
  assertEquals(bahrain.explain.periodicity?.original, "year");
  assertEquals(bahrain.explain.periodicity?.target, "month");
  assertEquals(bahrain.explain.periodicity?.adjusted, true);
});

Deno.test("Batch Processing - fallback to unit string parsing", async () => {
  // Test data without explicit metadata (should fall back to unit string parsing)
  const fallbackData: BatchItem[] = [
    {
      id: "FALLBACK_TEST",
      value: 100,
      unit: "EUR Millions per Quarter", // All info in unit string
      // No explicit metadata fields
    },
  ];

  const result = await processBatch(fallbackData, {
    toCurrency: "USD",
    toMagnitude: "millions",
    toTimeScale: "month",
    fx: { base: "USD", rates: { EUR: 0.85 } },
    explain: true,
  });

  assertEquals(result.successful.length, 1);
  assertEquals(result.failed.length, 0);

  const item = result.successful[0];
  assertExists(item);
  assertEquals(item.normalizedUnit, "USD millions per month");

  // Should still work with unit string parsing
  assertExists(item.explain);
  assertEquals(item.explain.fx?.currency, "EUR");
  assertEquals(item.explain.periodicity?.original, "quarter");
  assertEquals(item.explain.periodicity?.target, "month");
  assertEquals(item.explain.periodicity?.adjusted, true);
});

Deno.test("Batch Processing - mixed explicit and parsed metadata", async () => {
  // Test data with partial explicit metadata
  const mixedData: BatchItem[] = [
    {
      id: "MIXED_TEST_1",
      value: 50,
      unit: "GBP Billions per Year",
      currency_code: "GBP", // 🆕 Explicit currency
      // scale and periodicity will be parsed from unit string
    },
    {
      id: "MIXED_TEST_2",
      value: 75,
      unit: "EUR Millions per Quarter",
      scale: "Millions", // 🆕 Explicit scale
      // currency and periodicity will be parsed from unit string
    },
    {
      id: "MIXED_TEST_3",
      value: 100,
      unit: "JPY Thousands per Month",
      periodicity: "Monthly", // 🆕 Explicit periodicity
      // currency and scale will be parsed from unit string
    },
    {
      id: "MIXED_TEST_4",
      value: 25,
      unit: "CAD Billions per Year",
      currency_code: "CAD", // 🆕 Explicit currency
      scale: "Billions", // 🆕 Explicit scale
      // periodicity will be parsed from unit string
    },
  ];

  const result = await processBatch(mixedData, {
    toCurrency: "USD",
    toMagnitude: "millions",
    toTimeScale: "month",
    fx: {
      base: "USD",
      rates: {
        GBP: 0.79,
        EUR: 0.85,
        JPY: 149.50,
        CAD: 1.35,
      },
    },
    explain: true,
  });

  assertEquals(result.successful.length, 4);

  // Test 1: Explicit currency, parsed scale + periodicity
  const item1 = result.successful.find((item) => item.id === "MIXED_TEST_1");
  assertExists(item1);
  assertExists(item1.explain);
  assertEquals(item1.explain.fx?.currency, "GBP"); // From explicit field
  assertEquals(item1.explain.magnitude?.originalScale, "billions"); // From unit string
  assertEquals(item1.explain.periodicity?.original, "year"); // From unit string

  // Test 2: Explicit scale, parsed currency + periodicity
  const item2 = result.successful.find((item) => item.id === "MIXED_TEST_2");
  assertExists(item2);
  assertExists(item2.explain);
  assertEquals(item2.explain.fx?.currency, "EUR"); // From unit string
  // No magnitude metadata since millions → millions (no conversion needed)
  assertEquals(item2.explain.magnitude, undefined); // No scaling needed
  assertEquals(item2.explain.periodicity?.original, "quarter"); // From unit string

  // Test 3: Explicit periodicity, parsed currency + scale
  const item3 = result.successful.find((item) => item.id === "MIXED_TEST_3");
  assertExists(item3);
  assertExists(item3.explain);
  assertEquals(item3.explain.fx?.currency, "JPY"); // From unit string
  assertEquals(item3.explain.magnitude?.originalScale, "thousands"); // From unit string
  assertEquals(item3.explain.periodicity?.original, "month"); // From explicit field
  assertEquals(item3.explain.periodicity?.adjusted, false); // No conversion needed

  // Test 4: Explicit currency + scale, parsed periodicity
  const item4 = result.successful.find((item) => item.id === "MIXED_TEST_4");
  assertExists(item4);
  assertExists(item4.explain);
  assertEquals(item4.explain.fx?.currency, "CAD"); // From explicit field
  assertEquals(item4.explain.magnitude?.originalScale, "billions"); // From explicit field
  assertEquals(item4.explain.periodicity?.original, "year"); // From unit string
  assertEquals(item4.explain.periodicity?.adjusted, true); // Year → Month conversion
});

Deno.test("Batch Processing - explicit fields with null/empty values fallback to parsing", async () => {
  // Test data with explicit fields that are null/empty (should fallback to unit parsing)
  const fallbackData: BatchItem[] = [
    {
      id: "FALLBACK_NULL",
      value: 200,
      unit: "USD Millions per Quarter",
      currency_code: undefined, // 🔍 Undefined explicit field
      scale: "", // 🔍 Empty explicit field
      periodicity: undefined, // 🔍 Undefined explicit field
      // Should parse all from unit string
    },
    {
      id: "FALLBACK_MIXED",
      value: 150,
      unit: "CHF Billions per Year",
      currency_code: "CHF", // ✅ Valid explicit field
      scale: undefined, // 🔍 Undefined explicit field
      periodicity: "", // 🔍 Empty explicit field
      // Should use explicit currency, parse scale + periodicity from unit
    },
  ];

  const result = await processBatch(fallbackData, {
    toCurrency: "USD",
    toMagnitude: "millions",
    toTimeScale: "month",
    fx: { base: "USD", rates: { USD: 1.0, CHF: 0.91 } },
    explain: true,
  });

  assertEquals(result.successful.length, 2);

  // Test 1: All explicit fields null/empty → parse everything from unit
  const item1 = result.successful.find((item) => item.id === "FALLBACK_NULL");
  assertExists(item1);
  assertExists(item1.explain);
  // No FX metadata since USD → USD (no conversion needed)
  assertEquals(item1.explain.fx, undefined);
  // No magnitude metadata since millions → millions (no conversion needed)
  assertEquals(item1.explain.magnitude, undefined);
  assertEquals(item1.explain.periodicity?.original, "quarter"); // From unit string
  assertEquals(item1.explain.periodicity?.adjusted, true); // Quarter → Month conversion

  // Test 2: Valid explicit currency, null/empty scale + periodicity → parse those from unit
  const item2 = result.successful.find((item) => item.id === "FALLBACK_MIXED");
  assertExists(item2);
  assertExists(item2.explain);
  assertEquals(item2.explain.fx?.currency, "CHF"); // From explicit field
  assertEquals(item2.explain.magnitude?.originalScale, "billions"); // From unit string
  assertEquals(item2.explain.periodicity?.original, "year"); // From unit string
  assertEquals(item2.explain.periodicity?.adjusted, true); // Year → Month conversion
});

Deno.test("Batch Processing - explicit fields override conflicting unit string", async () => {
  // Test data where explicit fields conflict with unit string (explicit should win)
  const conflictData: BatchItem[] = [
    {
      id: "CONFLICT_TEST",
      value: 300,
      unit: "EUR Millions per Year", // Unit says EUR, Millions, Year
      currency_code: "USD", // 🔍 Explicit says USD (conflicts with unit)
      scale: "Billions", // 🔍 Explicit says Billions (conflicts with unit)
      periodicity: "Monthly", // 🔍 Explicit says Monthly (conflicts with unit)
      // Explicit fields should completely override unit string parsing
    },
  ];

  const result = await processBatch(conflictData, {
    toCurrency: "USD",
    toMagnitude: "millions",
    toTimeScale: "month",
    fx: { base: "USD", rates: { EUR: 0.85, USD: 1.0 } },
    explain: true,
  });

  assertEquals(result.successful.length, 1);

  const item = result.successful[0];
  assertExists(item);
  assertExists(item.explain);

  // Should use explicit fields, NOT what's in the unit string
  // No FX metadata since USD → USD (no conversion needed)
  assertEquals(item.explain.fx, undefined);
  assertEquals(item.explain.magnitude?.originalScale, "billions"); // From explicit field (not millions from unit)
  assertEquals(item.explain.periodicity?.original, "month"); // From explicit field (not year from unit)
  assertEquals(item.explain.periodicity?.adjusted, false); // No conversion needed (month → month)

  // Verify the actual conversion used explicit values
  // 300 billions → millions = 300 * 1000 = 300,000 (no FX since USD→USD, no time conversion since month→month)
  assertEquals(item.normalized, 300000);
  assertEquals(item.normalizedUnit, "USD millions per month");
});
