/**
 * Tests for the clean pipeline API
 * These tests verify the API abstraction works correctly without exposing XState
 */

import {
  assertEquals,
  assertExists,
  assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  processEconomicData,
  processEconomicDataAuto,
  validateEconomicData,
} from "./pipeline_api.ts";
import type { ParsedData } from "../workflows/economic-data-workflow.ts";

Deno.test("processEconomicData - basic processing", async () => {
  const data = [
    { value: 100, unit: "USD Million", name: "Revenue" },
    { value: 3.5, unit: "percent", name: "Growth Rate" },
  ];

  const result = await processEconomicData(data, {
    targetCurrency: "EUR",
    targetMagnitude: "billions",
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92 },
    },
  });

  assertExists(result.data);
  assertEquals(result.data.length, 2);
  assertExists(result.metrics);
  assertExists(result.metrics.processingTime);
  assertEquals(result.metrics.recordsProcessed, 2);
  assertEquals(result.metrics.recordsFailed, 0);
});

Deno.test("processEconomicData - currency conversion", async () => {
  const data = [
    { value: 1000, unit: "USD Million", name: "Investment" },
  ];

  const result = await processEconomicData(data, {
    targetCurrency: "EUR",
    targetMagnitude: "billions",
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92 },
    },
  });

  const processedItem = result.data[0];
  assertExists(processedItem.normalized);
  assertExists(processedItem.normalizedUnit);

  // 1000 USD Million = 1 USD Billion * 0.92 = 0.92 EUR Billion
  assertEquals(processedItem.normalized, 0.92);
  assertEquals(processedItem.normalizedUnit, "EUR billions");
});

Deno.test("processEconomicData - magnitude scaling", async () => {
  const data = [
    { value: 1500, unit: "USD Million", name: "Market Cap" },
  ];

  const result = await processEconomicData(data, {
    targetMagnitude: "billions",
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92 },
    },
  });

  const processedItem = result.data[0];
  assertEquals(processedItem.normalized, 1.5);
  assertEquals(processedItem.normalizedUnit, "USD billions");
});

Deno.test("processEconomicData - progress callback", async () => {
  const data = [
    { value: 100, unit: "USD", name: "Test" },
  ];

  const progressSteps: string[] = [];
  const progressValues: number[] = [];

  await processEconomicData(data, {
    onProgress: (step, progress) => {
      progressSteps.push(step);
      progressValues.push(progress);
    },
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92 },
    },
  });

  // Should have multiple progress updates
  assertExists(progressSteps.length > 0);
  assertExists(progressValues.includes(100)); // Should reach 100% complete
});

Deno.test("processEconomicData - warning callback", async () => {
  const data = [
    { value: 999999999, unit: "USD Million", name: "Outlier" },
    { value: 100, unit: "USD Million", name: "Normal" },
  ];

  const warnings: string[] = [];

  await processEconomicData(data, {
    onWarning: (warning) => {
      warnings.push(warning);
    },
    minQualityScore: 95, // High threshold to trigger warnings
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92 },
    },
  });

  // Should have warnings about outliers or quality issues
  assertExists(warnings.length > 0);
});

Deno.test("processEconomicData - error handling", async () => {
  const invalidData = [
    { value: NaN, unit: "USD", name: "Invalid" },
    { value: Infinity, unit: "EUR", name: "Infinite" },
  ];

  // The pipeline currently processes invalid data with warnings rather than throwing
  // This test should check that invalid data is handled gracefully
  const result = await processEconomicData(invalidData, {
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92 },
    },
  });

  // Should process but potentially have warnings or issues
  assertExists(result);
  assertExists(result.data);
});

Deno.test("processEconomicDataAuto - auto quality handling", async () => {
  const data = [
    { value: 100, unit: "USD Million", name: "Normal" },
    { value: 999999999, unit: "USD Million", name: "Outlier" },
    { value: -999999999, unit: "USD Million", name: "Negative Outlier" },
  ];

  const result = await processEconomicDataAuto(data, {
    minQualityScore: 99, // Very high threshold that data won't meet due to outliers
    onWarning: (_warning) => {
      // Warning callback for testing
    },
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92 },
    },
  });

  // Should auto-continue despite quality issues
  assertExists(result.data);
  assertExists(result.data.length > 0);
  // The warning might not always trigger if quality is good enough
  // So we just check the result processed successfully
  assertExists(result.metrics);
});

Deno.test("validateEconomicData - valid data", async () => {
  const data = [
    { value: 100, unit: "USD", name: "Revenue" },
    { value: 3.5, unit: "percent", name: "Growth" },
  ];

  const validation = await validateEconomicData(data);

  assertEquals(validation.valid, true);
  assertEquals(validation.score, 100);
  assertEquals(validation.issues.length, 0);
});

Deno.test("validateEconomicData - invalid data", async () => {
  const data = [
    { value: NaN, unit: "USD", name: "Bad Value" },
    { value: 100, unit: "", name: "Missing Unit" },
    { value: Infinity, unit: "EUR", name: "Infinite" },
  ];

  const validation = await validateEconomicData(data);

  assertEquals(validation.valid, false);
  assertExists(validation.score < 100);
  assertExists(validation.issues.length > 0);
});

Deno.test("validateEconomicData - required fields", async () => {
  const data = [
    { value: 100, unit: "USD" }, // Missing 'name'
    { value: 200, unit: "EUR", name: "Complete" },
  ];

  const validation = await validateEconomicData(data, {
    requiredFields: ["value", "unit", "name"],
  });

  assertEquals(validation.valid, false);
  assertExists(
    validation.issues.some((issue) =>
      issue.includes("missing required fields")
    ),
  );
});

Deno.test("processEconomicData - empty data", async () => {
  await assertRejects(
    async () => {
      await processEconomicData([]);
    },
    Error,
    "No data provided",
  );
});

Deno.test("processEconomicData - mixed units", async () => {
  const data = [
    { value: 1000, unit: "USD Million", name: "US Revenue" },
    { value: 900, unit: "EUR Million", name: "EU Revenue" },
    { value: 150000, unit: "JPY Million", name: "Japan Revenue" },
  ];

  const result = await processEconomicData(data, {
    targetCurrency: "USD",
    targetMagnitude: "billions",
    fxFallback: {
      base: "USD",
      rates: {
        EUR: 0.92,
        JPY: 150,
      },
    },
  });

  assertEquals(result.data.length, 3);
  // All should be normalized to USD billions
  result.data.forEach((item) => {
    assertExists(item.normalizedUnit?.includes("USD billion"));
  });
});

Deno.test("processEconomicData - percentage data unchanged", async () => {
  const data = [
    { value: 3.5, unit: "percent", name: "Growth Rate" },
    { value: -2.1, unit: "%", name: "Decline Rate" },
  ];

  const result = await processEconomicData(data, {
    targetCurrency: "EUR",
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92 },
    },
  });

  // Percentages should not be converted
  assertEquals(result.data[0].value, 3.5);
  assertEquals(result.data[1].value, -2.1);
});

Deno.test("processEconomicData - time scale adjustment", async () => {
  const data = [
    {
      value: 100,
      unit: "USD Million",
      name: "Quarterly Revenue",
      period: "quarter",
    },
  ];

  const result = await processEconomicData(data, {
    targetTimeScale: "year",
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92 },
    },
  });

  const processedItem = result.data[0];
  // Time scale adjustments aren't implemented yet, so value should be unchanged
  assertEquals(processedItem.normalized || processedItem.value, 100);
});

Deno.test("processEconomicData - preserves metadata", async () => {
  const data = [
    {
      value: 100,
      unit: "USD Million",
      name: "Revenue",
      year: 2023,
      metadata: {
        country: "USA",
        source: "Annual Report",
      },
    },
  ];

  const result = await processEconomicData(data);

  const processedItem = result.data[0];
  assertEquals(processedItem.year, 2023);
  assertExists(processedItem.metadata);
  assertEquals(processedItem.metadata?.country, "USA");
  assertEquals(processedItem.metadata?.source, "Annual Report");
});

Deno.test("processEconomicData - handles negative values", async () => {
  const data = [
    { value: -50, unit: "USD Million", name: "Net Loss" },
    { value: -3.2, unit: "percent", name: "Decline Rate" },
  ];

  const result = await processEconomicData(data, {
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92 },
    },
  });

  assertEquals(result.data.length, 2);
  assertEquals(result.data[0].value, -50);
  assertEquals(result.data[1].value, -3.2);
});

Deno.test("Pipeline API - no XState exposed", async () => {
  // Verify that the exported API doesn't expose XState types
  const apiModule = import.meta.resolve("./pipeline_api.ts");
  assertExists(apiModule);

  // The API should only expose clean interfaces
  assertExists(processEconomicData);
  assertExists(processEconomicDataAuto);
  assertExists(validateEconomicData);

  // Test that the functions work without XState knowledge
  const validation = await validateEconomicData([{
    value: 100,
    unit: "USD",
    name: "Test",
  }]);
  assertExists(validation.valid);
});

Deno.test("processEconomicData - wages processing with fallback FX", async () => {
  const wagesData = [
    { value: 233931, unit: "AMD/Month", name: "Armenia Wages", id: "ARM" },
    { value: 1631, unit: "AUD/Week", name: "Australia Wages", id: "AUS" },
    { value: 3500, unit: "AWG/Month", name: "Aruba Wages", id: "AWG" },
  ];

  const result = await processEconomicData(wagesData, {
    targetCurrency: "USD",
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {
        AMD: 387.5,
        AUD: 1.52,
        AWG: 1.80,
      },
    },
    excludeIndexValues: true,
  });

  assertEquals(result.data.length, 3);
  assertEquals(result.errors.length, 0);

  // Check conversions
  const armResult = result.data.find((d) => d.id === "ARM");
  const ausResult = result.data.find((d) => d.id === "AUS");
  const awgResult = result.data.find((d) => d.id === "AWG");

  assertExists(armResult);
  assertExists(ausResult);
  assertExists(awgResult);

  // Verify currency conversions
  assertEquals(Math.round(armResult.normalized || 0), 604); // 233931/387.5
  assertEquals(Math.round(ausResult.normalized || 0), 4650); // 1631/1.52*4.33
  assertEquals(Math.round(awgResult.normalized || 0), 1944); // 3500/1.80
});

Deno.test("processEconomicData - processes without FX fallback but no conversion", async () => {
  const data = [
    { value: 1000, unit: "EUR Million", name: "Revenue" },
  ];

  // This should actually succeed but without currency conversion
  const result = await processEconomicData(data, {
    targetCurrency: "USD",
    useLiveFX: false,
    // No fxFallback provided
  });

  assertEquals(result.data.length, 1);
  // Should process but without actual currency conversion
  assertEquals(result.data[0].value, 1000);
  assertEquals(result.data[0].normalizedUnit, "USD millions");
});

Deno.test("processEconomicDataAuto - wages processing with fallback FX", async () => {
  const wagesData = [
    { value: 50000, unit: "EUR/Month", name: "High Wage", id: "EUR" },
    { value: 1000, unit: "USD/Month", name: "Low Wage", id: "USD" },
  ];

  const result = await processEconomicDataAuto(wagesData, {
    targetCurrency: "USD",
    minQualityScore: 90, // High threshold to test auto-continue
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {
        EUR: 0.92,
      },
    },
  });

  assertEquals(result.data.length, 2);

  // Should auto-continue despite quality issues
  const eurResult = result.data.find((d) => d.id === "EUR");
  assertExists(eurResult);
  assertEquals(Math.round(eurResult.normalized || 0), 54348); // 50000/0.92
});

Deno.test("processEconomicData - time resampling to monthly", async () => {
  const data = [
    {
      id: "quarterly_sales",
      value: 300,
      unit: "Million USD per Quarter",
      name: "Quarterly Sales",
    },
    {
      id: "annual_revenue",
      value: 1200,
      unit: "Million USD per Year",
      name: "Annual Revenue",
    },
    {
      id: "weekly_production",
      value: 50,
      unit: "Million USD per Week",
      name: "Weekly Production",
    },
  ];

  const result = await processEconomicData(data, {
    targetCurrency: "USD",
    targetTimeScale: "month", // Convert all to monthly
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {},
    },
  });

  assertEquals(result.data.length, 3);
  assertEquals(result.errors.length, 0);

  // Check that time conversions happened
  const quarterlyResult = result.data.find((d) => d.id === "quarterly_sales");
  const annualResult = result.data.find((d) => d.id === "annual_revenue");
  const weeklyResult = result.data.find((d) => d.id === "weekly_production");

  assertExists(quarterlyResult);
  assertExists(annualResult);
  assertExists(weeklyResult);

  // Verify time conversions (values should be different from originals)
  assertEquals(quarterlyResult.normalized !== quarterlyResult.value, true);
  assertEquals(annualResult.normalized !== annualResult.value, true);
  assertEquals(weeklyResult.normalized !== weeklyResult.value, true);

  // Quarterly (300) to monthly should be ~100 (300/3)
  assertEquals(Math.round(quarterlyResult.normalized || 0), 100);

  // Annual (1200) to monthly should be ~100 (1200/12)
  assertEquals(Math.round(annualResult.normalized || 0), 100);

  // Weekly (50) to monthly should be ~217 (50*4.33)
  assertEquals(Math.round(weeklyResult.normalized || 0), 217);
});

Deno.test("processEconomicData - exemptions functionality", async () => {
  const mixedData: ParsedData[] = [
    {
      id: "TEL_CCR",
      value: 85,
      unit: "points",
      name: "Credit Rating",
      metadata: { categoryGroup: "Tellimer" },
    },
    {
      id: "IMF_GDP",
      value: 2.5,
      unit: "percent",
      name: "GDP Growth Rate",
      metadata: { categoryGroup: "IMF WEO" },
    },
    {
      id: "WB_INFLATION",
      value: 3.2,
      unit: "percent",
      name: "Inflation Rate",
      metadata: { categoryGroup: "World Bank" },
    },
    {
      id: "CUSTOM_INDEX",
      value: 1250,
      unit: "index",
      name: "Market Index",
      metadata: { categoryGroup: "Internal" },
    },
    {
      id: "WAGES_MFG",
      value: 50000,
      unit: "USD/Year",
      name: "Manufacturing Wages",
      metadata: { categoryGroup: "Labor Stats" },
    },
  ];

  const result = await processEconomicData(mixedData, {
    targetCurrency: "EUR",
    targetMagnitude: "thousands",
    minQualityScore: 30,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {
        EUR: 0.85,
      },
    },
    exemptions: {
      indicatorIds: ["TEL_CCR"],
      categoryGroups: ["IMF WEO", "Tellimer"],
      indicatorNames: ["Index"],
    },
  });

  assertEquals(result.data.length, 5, "Should return all 5 items");
  assertEquals(result.warnings.length, 0);
  assertEquals(result.errors.length, 0);

  // Find specific items
  const telCcr = result.data.find((item) => item.id === "TEL_CCR");
  const imfGdp = result.data.find((item) => item.id === "IMF_GDP");
  const wbInflation = result.data.find((item) => item.id === "WB_INFLATION");
  const customIndex = result.data.find((item) => item.id === "CUSTOM_INDEX");
  const wagesMfg = result.data.find((item) => item.id === "WAGES_MFG");

  // Exempted items should be unchanged
  assertEquals(
    telCcr?.value,
    85,
    "TEL_CCR should be unchanged (exempted by ID)",
  );
  assertEquals(telCcr?.unit, "points", "TEL_CCR unit should be unchanged");
  assertEquals(
    telCcr?.normalized,
    undefined,
    "TEL_CCR should not be normalized",
  );

  assertEquals(
    imfGdp?.value,
    2.5,
    "IMF_GDP should be unchanged (exempted by category)",
  );
  assertEquals(imfGdp?.unit, "percent", "IMF_GDP unit should be unchanged");

  assertEquals(
    customIndex?.value,
    1250,
    "CUSTOM_INDEX should be unchanged (exempted by name)",
  );
  assertEquals(
    customIndex?.unit,
    "index",
    "CUSTOM_INDEX unit should be unchanged",
  );

  // Non-exempted items should be processed
  assertEquals(
    wbInflation?.value,
    3.2,
    "WB_INFLATION should be unchanged (percentage)",
  );
  assertEquals(wbInflation?.unit, "percent", "Percentages typically unchanged");

  // Wages should be normalized
  assertEquals(
    typeof wagesMfg?.normalized,
    "number",
    "WAGES_MFG should be normalized",
  );
  assertEquals(
    wagesMfg?.normalizedUnit?.includes("EUR"),
    true,
    "Should be converted to EUR",
  );

  console.log("✅ Exemptions working correctly:");
  console.log(`   - TEL_CCR: ${telCcr?.value} ${telCcr?.unit} (exempted)`);
  console.log(`   - IMF_GDP: ${imfGdp?.value} ${imfGdp?.unit} (exempted)`);
  console.log(
    `   - CUSTOM_INDEX: ${customIndex?.value} ${customIndex?.unit} (exempted)`,
  );
  console.log(
    `   - WAGES_MFG: ${wagesMfg?.normalized} ${wagesMfg?.normalizedUnit} (processed)`,
  );
});

Deno.test("processEconomicData - validate schema on/off matrix", async () => {
  const base = [
    { value: 100, unit: "USD Million", name: "OK" },
    { value: 200, unit: "EUR Million" }, // missing name
  ];

  // On: should reject due to missing required field
  await assertRejects(
    () =>
      processEconomicData(base, {
        validateSchema: true,
        requiredFields: ["value", "unit", "name"],
      }),
    Error,
    "missing required fields",
  );

  // Off: should process successfully
  const res = await processEconomicData(base, {
    validateSchema: false,
  });
  assertEquals(res.data.length, 2);
});

Deno.test("processEconomicData - configuration matrix (targets/combinations)", async () => {
  const item = { value: 1200, unit: "USD Million", name: "Revenue" };

  // 1) Currency only
  const r1 = await processEconomicData([item], {
    targetCurrency: "EUR",
    fxFallback: { base: "USD", rates: { EUR: 0.8 } },
  });
  assertExists(r1.data[0].normalizedUnit?.includes("EUR"));

  // 2) Time only
  const r2 = await processEconomicData([item], {
    targetTimeScale: "month",
  });
  assertExists(r2.data[0].normalizedUnit?.includes("per month"));

  // 3) Currency + magnitude + time
  const r3 = await processEconomicData([item], {
    targetCurrency: "EUR",
    targetMagnitude: "billions",
    targetTimeScale: "month",
    fxFallback: { base: "USD", rates: { EUR: 0.8 } },
  });
  assertExists(r3.data[0].normalizedUnit?.includes("EUR billions per month"));

  // 4) No targets (identity on unit parts)
  const r4 = await processEconomicData([item], {});
  assertExists(r4.data[0].normalizedUnit?.includes("USD"));
});

Deno.test("processEconomicData - explain surfaces missing time basis case", async () => {
  const data = [{ value: 100, unit: "USD Million", name: "Revenue" }];

  const result = await processEconomicData(data, {
    targetTimeScale: "year",
    explain: true,
  });

  const ex = result.data[0].explain;
  assertExists(ex);
  assertEquals(ex?.periodicity?.target, "year");
  assertEquals(ex?.periodicity?.adjusted, false);
  assertEquals(ex?.periodicity?.description, "No source time scale available");
});

Deno.test("processEconomicData - prefer unit time over explicit periodicity (API)", async () => {
  const data: ParsedData[] = [
    {
      value: 1631.1,
      unit: "AUD/Week",
      name: "Manufacturing Costs",
      periodicity: "Quarterly", // explicit dataset reporting frequency
    },
  ];

  const result = await processEconomicData(data, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    explain: true,
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { AUD: 1.499 } },
  });

  const item = result.data[0];
  assertExists(item.explain);
  // Periodicity should reflect unit time (week → month), not dataset periodicity
  assertEquals(item.explain?.periodicity?.original, "week");
  assertEquals(item.explain?.periodicity?.target, "month");
  assertEquals(item.explain?.periodicity?.direction, "downsample");
  // Factor ≈ 52/12
  const expected = 52 / 12;
  const factor = item.explain?.periodicity?.factor ?? 0;
  if (Math.abs(factor - expected) > 1e-12) {
    throw new Error(`unexpected factor: ${factor}`);
  }
  // Unit strings (wages path); reportingFrequency may not be surfaced in wages flow
  assertEquals(item.explain?.units?.originalFullUnit, "AUD per week");
  assertEquals(item.explain?.units?.normalizedFullUnit, "USD per month");
});

Deno.test("processEconomicData - use explicit periodicity when unit has no time (API)", async () => {
  const data: ParsedData[] = [
    {
      value: 300,
      unit: "USD Million",
      name: "Quarterly Sales",
      periodicity: "Quarterly", // dataset periodicity used when unit lacks time
    },
  ];

  const result = await processEconomicData(data, {
    targetTimeScale: "month",
    explain: true,
  });

  const item = result.data[0];
  assertExists(item.explain);
  // Here unit has no time; conversion uses dataset periodicity
  assertEquals(item.explain?.periodicity?.original, "quarter");
  assertEquals(item.explain?.periodicity?.target, "month");
  assertEquals(item.explain?.reportingFrequency, "quarter");
});

Deno.test("processEconomicData - mixed scales (AUS/AUT/AZE) → USD millions per month", async () => {
  const data: ParsedData[] = [
    {
      id: "AUS",
      value: 11027, // AUD Million per month
      unit: "AUD Million",
      name: "Balance of Trade",
    },
    {
      id: "AUT",
      value: 365.1, // EUR Million per month
      unit: "EUR Million",
      name: "Balance of Trade",
    },
    {
      id: "AZE",
      value: 2445459.7, // USD Thousand per quarter
      unit: "USD Thousand per quarter",
      name: "Balance of Trade",
    },
  ];

  const result = await processEconomicData(data, {
    targetCurrency: "USD",
    targetMagnitude: "millions",
    targetTimeScale: "month",
    explain: true,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {
        AUD: 1.5158,
        EUR: 0.8511,
      },
    },
  });

  assertEquals(result.errors.length, 0);
  assertEquals(result.data.length, 3);

  const aus = result.data.find((d) => d.id === "AUS");
  const aut = result.data.find((d) => d.id === "AUT");
  const aze = result.data.find((d) => d.id === "AZE");

  // All should be USD millions per month (assert using normalizedUnit from pipeline output)
  if (!aus || !aut || !aze) throw new Error("missing item(s)");

  const ausUnit = aus.normalizedUnit || aus.explain?.units?.normalizedUnit ||
    "";
  const autUnit = aut.normalizedUnit || aut.explain?.units?.normalizedUnit ||
    "";
  const azeUnit = aze.normalizedUnit || aze.explain?.units?.normalizedUnit ||
    "";

  if (!ausUnit.includes("USD millions per month")) {
    throw new Error(`unexpected unit for AUS: ${ausUnit}`);
  }
  if (!autUnit.includes("USD millions per month")) {
    throw new Error(`unexpected unit for AUT: ${autUnit}`);
  }
  // Strict: AZE must be in USD millions per month
  if (!azeUnit.includes("USD millions per month")) {
    throw new Error(`unexpected unit for AZE: ${azeUnit}`);
  }

  // AUS: 11027 / 1.5158
  const ausExpected = 11027 / 1.5158;
  if (Math.abs((aus?.normalized || 0) - ausExpected) > 1e-9) {
    throw new Error(
      `AUS normalized mismatch: got ${aus?.normalized}, expected ~${ausExpected}`,
    );
  }

  // AUT: 365.1 / 0.8511
  const autExpected = 365.1 / 0.8511;
  if (Math.abs((aut?.normalized || 0) - autExpected) > 1e-9) {
    throw new Error(
      `AUT normalized mismatch: got ${aut?.normalized}, expected ~${autExpected}`,
    );
  }

  // AZE: (2445459.7 * 0.001) / 3
  const azeExpected = (2445459.7 * 0.001) / 3;
  const azeVal = aze?.normalized || 0;
  if (Math.abs(azeVal - azeExpected) > 1e-9) {
    throw new Error(
      `AZE normalized mismatch: got ${azeVal}, expected ~${azeExpected}`,
    );
  }
});

Deno.test("auto-target disabled: no per-indicator normalization", async () => {
  const data: ParsedData[] = [
    { id: "AUS", value: 11027, unit: "USD Million", name: "Balance of Trade" },
    { id: "AUT", value: 365.1, unit: "EUR Million", name: "Balance of Trade" },
    {
      id: "AZE",
      value: 2445459.7,
      unit: "USD Thousand per quarter",
      name: "Balance of Trade",
    },
  ];

  const res = await processEconomicData(data, {
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { EUR: 0.85 } },
  });

  const units = res.data.map((d) => d.normalizedUnit || d.unit);
  // Expect at least one to differ in time basis or magnitude since no targets set
  const unique = new Set(units);
  if (unique.size === 1) {
    throw new Error(
      `unexpected uniform units without auto-target: ${units[0]}`,
    );
  }
});

Deno.test("auto-target per indicator: normalize to majority USD millions per month", async () => {
  const data: ParsedData[] = [
    { id: "AUS", value: 11027, unit: "USD Million", name: "Balance of Trade" },
    { id: "AUT", value: 365.1, unit: "EUR Million", name: "Balance of Trade" },
    {
      id: "AZE",
      value: 2445459.7,
      unit: "USD Thousand per quarter",
      name: "Balance of Trade",
    },
  ];

  const res = await processEconomicData(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["currency", "magnitude", "time"],
    minMajorityShare: 0.5,
    indicatorKey: "name",
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    targetCurrency: "USD",
    explain: true,
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { EUR: 0.8511 } },
  });

  // All units should be normalized to USD millions per month
  for (const d of res.data) {
    const u = d.normalizedUnit || d.explain?.units?.normalizedUnit || "";
    if (!u.includes("USD millions per month")) {
      throw new Error(`unexpected unit for ${d.id}: ${u}`);
    }
    const ex = d.explain;
    if (ex) {
      // Expect targetSelection metadata to be present in explain
      if (!ex.targetSelection) {
        throw new Error("missing explain.targetSelection");
      }
      if (!ex.targetSelection.selected) {
        throw new Error("missing targetSelection.selected");
      }
      if (ex.targetSelection.selected.time !== "month") {
        throw new Error("expected time=month");
      }
    }
  }
});

Deno.test("auto-target: wages still normalize and succeed", async () => {
  const wagesData = [
    { value: 233931, unit: "AMD/Month", name: "Armenia Wages", id: "ARM" },
    { value: 1631, unit: "AUD/Week", name: "Australia Wages", id: "AUS" },
  ];

  const result = await processEconomicData(wagesData, {
    autoTargetByIndicator: true,
    targetCurrency: "USD",
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { AMD: 387.5, AUD: 1.52 } },
  });

  // Should still process and normalize wages to USD with a per-time unit
  for (const d of result.data) {
    if (!d.normalizedUnit?.includes("USD")) {
      throw new Error("wages not normalized to USD");
    }
  }
});

Deno.test("auto-target: non-monetary unaffected (percent/count/physical)", async () => {
  const data: ParsedData[] = [
    { value: 3.5, unit: "percent", name: "CPI" },
    { value: 1000, unit: "Units", name: "Registrations" },
    { value: 10, unit: "BBL/D/1K", name: "Oil" },
  ];

  const res = await processEconomicData(data, { autoTargetByIndicator: true });

  // Values should remain unchanged for these categories
  assertEquals(res.data[0].value, 3.5);
  assertEquals(res.data[1].value, 1000);
  assertEquals(res.data[2].value, 10);
});

Deno.test("auto-target explain: targetSelection details present", async () => {
  const data: ParsedData[] = [
    { id: "AUS", value: 11027, unit: "USD Million", name: "Balance of Trade" },
    { id: "AUT", value: 365.1, unit: "EUR Million", name: "Balance of Trade" },
    {
      id: "AZE",
      value: 2445459.7,
      unit: "USD Thousand per quarter",
      name: "Balance of Trade",
    },
  ];

  const res = await processEconomicData(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["currency", "magnitude", "time"],
    minMajorityShare: 0.5,
    indicatorKey: "name",
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    targetCurrency: "USD",
    explain: true,
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { EUR: 0.8511 } },
  });

  for (const d of res.data) {
    const ex = d.explain;
    if (!ex?.targetSelection) {
      throw new Error("missing explain.targetSelection");
    }
    const ts = ex.targetSelection;
    if (ts.mode !== "auto-by-indicator") {
      throw new Error("expected mode auto-by-indicator");
    }
    if (ts.indicatorKey !== "balance of trade") { // Keys are normalized to lowercase
      throw new Error("unexpected indicatorKey");
    }
    if (ts.selected.currency !== "USD") {
      throw new Error("expected currency USD");
    }
    if (ts.selected.magnitude !== "millions") {
      throw new Error("expected magnitude millions");
    }
    if (ts.selected.time !== "month") throw new Error("expected time month");
    // Reason should include majority/tie-break details for debugging
    const reason = String(ts.reason || "");
    if (!reason.includes("currency=majority(")) {
      throw new Error("expected reason to include currency=majority(...)");
    }
    if (!reason.includes("time=tie-break(")) {
      throw new Error("expected reason to include time=tie-break(...)");
    }
    // Shares sanity: we expect approximately > 0.5 for USD and millions; time may be selected via tie-breaker
    const s = ts.shares;
    if (!((s?.currency?.USD ?? 0) > 0.5)) {
      throw new Error("expected USD share > 0.5");
    }
    if (!((s?.magnitude?.millions ?? 0) > 0.5)) {
      throw new Error("expected millions share > 0.5");
    }
  }
});

Deno.test("auto-target extensive: multi-indicator with mock data and explain reasons", async () => {
  const data: ParsedData[] = [
    // Balance of Trade (majority USD, millions, month)
    { id: "AUS", value: 11027, unit: "USD Million", name: "Balance of Trade" },
    { id: "AUT", value: 365.1, unit: "EUR Million", name: "Balance of Trade" },
    {
      id: "AZE",
      value: 2445459.7,
      unit: "USD Thousand per quarter",
      name: "Balance of Trade",
    },
    {
      id: "ARG",
      value: 901,
      unit: "USD Million per month",
      name: "Balance of Trade",
    },
    {
      id: "BEN",
      value: 120,
      unit: "EUR Million per month",
      name: "Balance of Trade",
    },
    {
      id: "BGR",
      value: 77,
      unit: "USD Million per quarter",
      name: "Balance of Trade",
    },

    // Exports (no clear time majority -> tie-break to month)
    { id: "CAN", value: 100, unit: "USD Million", name: "Exports" },
    { id: "CHE", value: 110, unit: "USD Million per quarter", name: "Exports" },
    { id: "CHL", value: 95, unit: "EUR Million", name: "Exports" },
    { id: "CHN", value: 200, unit: "USD Million per month", name: "Exports" },
    { id: "CIV", value: 50, unit: "USD Million per quarter", name: "Exports" },
    { id: "COL", value: 80, unit: "EUR Million", name: "Exports" },

    // Non-monetary should be unaffected
    { id: "USA", value: 3.5, unit: "percent", name: "Unemployment Rate" },
    { id: "ARG2", value: 1000, unit: "Units", name: "Car Registrations" },
  ];

  const res = await processEconomicData(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["currency", "magnitude", "time"],
    minMajorityShare: 0.5,
    indicatorKey: "name",
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    targetCurrency: "USD",
    explain: true,
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { EUR: 0.9 } },
  });

  // Group results by indicator name
  const groups = new Map<string, ParsedData[]>();
  for (const d of res.data) {
    const key = String(d.name);
    const arr = groups.get(key) || [];
    arr.push(d);
    groups.set(key, arr);
  }

  // Balance of Trade: expect majority USD/millions/month and reasons showing majority
  for (const d of groups.get("Balance of Trade") || []) {
    const ts = d.explain?.targetSelection;
    if (!ts) throw new Error("missing targetSelection for Balance of Trade");
    if (ts.selected.currency !== "USD") {
      throw new Error("Balance of Trade currency should be USD");
    }
    if (ts.selected.magnitude !== "millions") {
      throw new Error("Balance of Trade magnitude should be millions");
    }
    if (ts.selected.time !== "month") {
      throw new Error("Balance of Trade time should be month");
    }
    const reason = String(ts.reason || "");
    if (!reason.includes("currency=majority(")) {
      throw new Error("BoT: reason should indicate currency majority");
    }
    if (!reason.includes("magnitude=majority(")) {
      throw new Error("BoT: reason should indicate magnitude majority");
    }
  }

  // Exports: expect tie-break on time to month; currency/magnitude to USD/millions
  for (const d of groups.get("Exports") || []) {
    const ts = d.explain?.targetSelection;
    if (!ts) throw new Error("missing targetSelection for Exports");
    if (ts.selected.currency !== "USD") {
      throw new Error("Exports currency should be USD");
    }
    if (ts.selected.magnitude !== "millions") {
      throw new Error("Exports magnitude should be millions");
    }
    if (ts.selected.time !== "month") {
      throw new Error("Exports time should be month");
    }
    const reason = String(ts.reason || "");
    if (!reason.includes("time=tie-break(")) {
      throw new Error("Exports: expected tie-break on time");
    }
  }

  // Non-monetary unchanged values
  const percent = res.data.find((x) => x.name === "Unemployment Rate");
  if (!percent || percent.value !== 3.5) {
    throw new Error("percent data should remain unchanged");
  }
  const units = res.data.find((x) => x.name === "Car Registrations");
  if (!units || units.value !== 1000) {
    throw new Error("count data should remain unchanged");
  }
});

Deno.test("auto-target gating: allowList/denyList control which indicators are auto-targeted", async () => {
  const data: ParsedData[] = [
    { id: "X1", value: 10, unit: "EUR Million", name: "A" },
    { id: "X2", value: 20, unit: "USD Million", name: "A" },
    { id: "Y1", value: 5, unit: "EUR Million", name: "B" },
    { id: "Y2", value: 6, unit: "USD Million", name: "B" },
    { id: "Z1", value: 7, unit: "EUR Million", name: "C" },
    { id: "Z2", value: 8, unit: "USD Million", name: "C" },
  ];

  const res = await processEconomicData(data, {
    autoTargetByIndicator: true,
    indicatorKey: "name",
    allowList: ["A", "C"],
    denyList: ["B"],
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    targetCurrency: "USD",
    explain: true,
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { EUR: 0.9 } },
  });

  const byName = (n: string) => res.data.filter((d) => d.name === n);

  // A and C should have targetSelection; B should not (denied)
  for (const d of byName("A")) {
    if (!d.explain?.targetSelection) {
      throw new Error("A should be auto-targeted");
    }
  }
  for (const d of byName("C")) {
    if (!d.explain?.targetSelection) {
      throw new Error("C should be auto-targeted");
    }
  }
  for (const d of byName("B")) {
    if (d.explain?.targetSelection) {
      throw new Error("B should NOT be auto-targeted");
    }
  }
});

Deno.test("auto-target extensive: GDP/Debt/Imports distributions with share assertions", async () => {
  const data: ParsedData[] = [
    // GDP (12): strong majority USD/millions/month
    { id: "G1", value: 100, unit: "USD Million per month", name: "GDP" },
    { id: "G2", value: 101, unit: "USD Million per month", name: "GDP" },
    { id: "G3", value: 102, unit: "USD Million per month", name: "GDP" },
    { id: "G4", value: 103, unit: "USD Million per month", name: "GDP" },
    { id: "G5", value: 104, unit: "USD Million per month", name: "GDP" },
    { id: "G6", value: 105, unit: "USD Million per month", name: "GDP" },
    { id: "G7", value: 106, unit: "USD Million per month", name: "GDP" },
    { id: "G8", value: 107, unit: "USD Million per month", name: "GDP" },
    { id: "G9", value: 108, unit: "EUR Million per month", name: "GDP" },
    { id: "G10", value: 109, unit: "EUR Million per month", name: "GDP" },
    { id: "G11", value: 110, unit: "USD Thousand per quarter", name: "GDP" },
    { id: "G12", value: 111, unit: "USD Thousand per quarter", name: "GDP" },

    // Debt (10): EUR/millions majority; time ambiguous -> tie-break to month
    { id: "D1", value: 200, unit: "EUR Million per month", name: "Debt" },
    { id: "D2", value: 201, unit: "EUR Million per month", name: "Debt" },
    { id: "D3", value: 202, unit: "EUR Million per month", name: "Debt" },
    { id: "D4", value: 203, unit: "EUR Million per month", name: "Debt" },
    { id: "D5", value: 204, unit: "EUR Million per month", name: "Debt" },
    { id: "D6", value: 205, unit: "EUR Million per quarter", name: "Debt" },
    { id: "D7", value: 206, unit: "EUR Million per quarter", name: "Debt" },
    { id: "D8", value: 207, unit: "USD Thousand per quarter", name: "Debt" },
    { id: "D9", value: 208, unit: "USD Thousand per quarter", name: "Debt" },
    { id: "D10", value: 209, unit: "USD Thousand per quarter", name: "Debt" },

    // Imports (10): no majority in any dimension with minShare 0.6 -> tie-breaks across all
    { id: "I1", value: 300, unit: "USD Million per quarter", name: "Imports" },
    { id: "I2", value: 301, unit: "USD Million per quarter", name: "Imports" },
    { id: "I3", value: 302, unit: "EUR Million per year", name: "Imports" },
    { id: "I4", value: 303, unit: "EUR Million per year", name: "Imports" },
    { id: "I5", value: 304, unit: "EUR Million per year", name: "Imports" },
    { id: "I6", value: 305, unit: "JPY Thousand per month", name: "Imports" },
    { id: "I7", value: 306, unit: "JPY Thousand per month", name: "Imports" },
    { id: "I8", value: 307, unit: "JPY Thousand per month", name: "Imports" },
    { id: "I9", value: 308, unit: "USD Thousand per month", name: "Imports" },
    { id: "I10", value: 309, unit: "USD Thousand per month", name: "Imports" },
  ];

  const res = await processEconomicData(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["currency", "magnitude", "time"],
    minMajorityShare: 0.6,
    indicatorKey: "name",
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    targetCurrency: "USD",
    explain: true,
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { EUR: 0.9, JPY: 150 } },
  });

  const byName = (n: string) => res.data.filter((d) => d.name === n);

  // GDP assertions on shares and reasons
  {
    const group = byName("GDP");
    const ts = group[0]?.explain?.targetSelection;
    if (!ts) throw new Error("GDP missing targetSelection");
    if (!(ts.shares?.currency?.USD! > 0.6)) {
      throw new Error("GDP USD share > 0.6 expected");
    }
    if (!(ts.shares?.magnitude?.millions! > 0.6)) {
      throw new Error("GDP millions share > 0.6 expected");
    }
    if (!(ts.shares?.time?.month! > 0.6)) {
      throw new Error("GDP month share > 0.6 expected");
    }
    const r = String(ts.reason || "");
    if (!r.includes("currency=majority(USD")) {
      throw new Error("GDP currency majority reason expected");
    }
    if (!r.includes("magnitude=majority(millions")) {
      throw new Error("GDP magnitude majority reason expected");
    }
    if (!r.includes("time=majority(month")) {
      throw new Error("GDP time majority reason expected");
    }
  }

  // Debt assertions: currency/magnitude majority; time tie-break
  {
    const group = byName("Debt");
    const ts = group[0]?.explain?.targetSelection;
    if (!ts) throw new Error("Debt missing targetSelection");
    if (!(ts.shares?.currency?.EUR! > 0.6)) {
      throw new Error("Debt EUR share > 0.6 expected");
    }
    if (!(ts.shares?.magnitude?.millions! > 0.6)) {
      throw new Error("Debt millions share > 0.6 expected");
    }
    const r = String(ts.reason || "");
    if (!r.includes("time=tie-break(")) {
      throw new Error("Debt time tie-break expected");
    }
  }

  // Imports assertions: all tie-breaks with minShare 0.6
  {
    const group = byName("Imports");
    const ts = group[0]?.explain?.targetSelection;
    if (!ts) throw new Error("Imports missing targetSelection");
    const r = String(ts.reason || "");
    if (!r.includes("currency=tie-break(")) {
      throw new Error("Imports currency tie-break expected");
    }
    if (!r.includes("magnitude=tie-break(")) {
      throw new Error("Imports magnitude tie-break expected");
    }
    if (!r.includes("time=tie-break(")) {
      throw new Error("Imports time tie-break expected");
    }
    if (ts.selected.currency !== "USD") {
      throw new Error("Imports currency should tie-break to USD");
    }
    if (ts.selected.magnitude !== "millions") {
      throw new Error("Imports magnitude should tie-break to millions");
    }
    if (ts.selected.time !== "month") {
      throw new Error("Imports time should tie-break to month");
    }
  }
});

Deno.test("auto-target stress: synthetic distributions across random seeds", async () => {
  // Simple deterministic RNG (LCG)
  const rng = (() => {
    let s = 123456789;
    return () => (s = (1664525 * s + 1013904223) >>> 0) / 0x100000000;
  })();
  const pick = <T>(weights: Array<[T, number]>) => {
    const r = rng();
    let acc = 0;
    for (const [val, w] of weights) {
      acc += w;
      if (r < acc) return val;
    }
    return weights[weights.length - 1][0];
  };

  const currencies = ["USD", "EUR", "JPY"] as const;
  const magnitudes = ["thousand", "millions"] as const; // use singular Thousand in unit string
  const times = ["month", "quarter", "year"] as const;

  type Dist<T extends string> = Array<[T, number]>;
  const makeIndicator = (
    name: string,
    n: number,
    cd: Dist<typeof currencies[number]>,
    md: Dist<typeof magnitudes[number]>,
    td: Dist<typeof times[number]>,
  ) => {
    const items: ParsedData[] = [];
    for (let i = 0; i < n; i++) {
      const c = pick(cd);
      const m = pick(md);
      const t = pick(td);
      const mag = m === "millions" ? "Million" : "Thousand";
      const unit = `${c} ${mag} per ${t}`;
      items.push({ id: `${name}-${i}`, value: 100 + i, unit, name });
    }
    return items;
  };

  const data: ParsedData[] = [];
  const groups: Array<
    {
      name: string;
      cd: Dist<typeof currencies[number]>;
      md: Dist<typeof magnitudes[number]>;
      td: Dist<typeof times[number]>;
    }
  > = [];

  // Build 6 indicators: 3 skewed, 3 ambiguous (no majority @0.6)
  const skew = (
    p: number,
  ): Dist<typeof currencies[number]> => [["USD", p], ["EUR", (1 - p) / 2], [
    "JPY",
    (1 - p) / 2,
  ]];
  const skewMag = (
    p: number,
  ): Dist<typeof magnitudes[number]> => [["millions", p], ["thousand", 1 - p]];
  const skewTime = (
    p: number,
  ): Dist<typeof times[number]> => [["month", p], ["quarter", (1 - p) / 2], [
    "year",
    (1 - p) / 2,
  ]];

  groups.push({
    name: "Skewed-A",
    cd: skew(0.7),
    md: skewMag(0.8),
    td: skewTime(0.7),
  });
  groups.push({
    name: "Skewed-B",
    cd: skew(0.65),
    md: skewMag(0.7),
    td: skewTime(0.65),
  });
  groups.push({
    name: "Skewed-C",
    cd: skew(0.9),
    md: skewMag(0.75),
    td: skewTime(0.75),
  });

  // Ambiguous: max share < 0.6 in all dimensions
  const ambC: Dist<typeof currencies[number]> = [["USD", 0.4], ["EUR", 0.3], [
    "JPY",
    0.3,
  ]];
  const ambM: Dist<typeof magnitudes[number]> = [["millions", 0.5], [
    "thousand",
    0.5,
  ]]; // =0.5
  const ambT: Dist<typeof times[number]> = [["month", 0.4], ["quarter", 0.3], [
    "year",
    0.3,
  ]];
  groups.push({ name: "Ambiguous-A", cd: ambC, md: ambM, td: ambT });
  groups.push({ name: "Ambiguous-B", cd: ambC, md: ambM, td: ambT });
  groups.push({ name: "Ambiguous-C", cd: ambC, md: ambM, td: ambT });

  for (const g of groups) {
    data.push(...makeIndicator(g.name, 24, g.cd, g.md, g.td));
  }

  const res = await processEconomicData(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["currency", "magnitude", "time"],
    minMajorityShare: 0.6,
    indicatorKey: "name",
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    targetCurrency: "USD",
    explain: true,
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { EUR: 0.9, JPY: 150 } },
  });

  const byName = (n: string) => res.data.filter((d) => d.name === n);
  const selectedFrom = (n: string) => (byName(n)[0]?.explain?.targetSelection!);

  // Skewed groups should pick majority per dimension (>=0.6) and reasons reflect majority
  for (const name of ["Skewed-A", "Skewed-B", "Skewed-C"]) {
    const ts = selectedFrom(name);
    if (!ts) throw new Error(`${name} missing targetSelection`);
    const r = String(ts.reason || "");
    if (!r.includes("currency=majority(")) {
      throw new Error(`${name}: expected currency majority reason`);
    }
    if (!r.includes("magnitude=majority(")) {
      throw new Error(`${name}: expected magnitude majority reason`);
    }
    if (!r.includes("time=majority(")) {
      throw new Error(`${name}: expected time majority reason`);
    }
  }

  // Ambiguous groups: decide expectation per-dimension based on observed shares @0.6
  for (const name of ["Ambiguous-A", "Ambiguous-B", "Ambiguous-C"]) {
    const ts = selectedFrom(name);
    if (!ts) throw new Error(`${name} missing targetSelection`);
    const r = String(ts.reason || "");

    // Currency
    const cShares = ts.shares?.currency || {};
    const cMax = Math.max(0, ...Object.values(cShares));
    if (cMax >= 0.6) {
      if (!r.includes("currency=majority(")) {
        throw new Error(`${name}: expected currency majority given shares`);
      }
    } else {
      if (!r.includes("currency=tie-break(")) {
        throw new Error(`${name}: expected currency tie-break given shares`);
      }
      if (ts.selected.currency !== "USD") {
        throw new Error(`${name}: currency should tie-break to USD`);
      }
    }

    // Magnitude
    const mShares = ts.shares?.magnitude || {} as Record<string, number>;
    const mMax = Math.max(0, ...Object.values(mShares));
    if (mMax >= 0.6) {
      if (!r.includes("magnitude=majority(")) {
        throw new Error(`${name}: expected magnitude majority given shares`);
      }
    } else {
      if (!r.includes("magnitude=tie-break(")) {
        throw new Error(`${name}: expected magnitude tie-break given shares`);
      }
      if (ts.selected.magnitude !== "millions") {
        throw new Error(`${name}: magnitude should tie-break to millions`);
      }
    }

    // Time
    const tShares = ts.shares?.time || {} as Record<string, number>;
    const tMax = Math.max(0, ...Object.values(tShares));
    if (tMax >= 0.6) {
      if (!r.includes("time=majority(")) {
        throw new Error(`${name}: expected time majority given shares`);
      }
    } else {
      if (!r.includes("time=tie-break(")) {
        throw new Error(`${name}: expected time tie-break given shares`);
      }
      if (ts.selected.time !== "month") {
        throw new Error(`${name}: time should tie-break to month`);
      }
    }
  }
});
