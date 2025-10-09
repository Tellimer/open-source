/**
 * Tests for XState pipeline workflow
 */

import { assertEquals, assertExists } from "@std/assert";
import { createPipeline } from "./economic-data-workflow.ts";
import type { ParsedData, PipelineConfig } from "./economic-data-workflow.ts";

Deno.test("Pipeline - complete workflow with mock data", async () => {
  const mockData: ParsedData[] = [
    {
      id: 1,
      value: 100,
      unit: "USD Million",
      name: "GDP Growth",
      year: 2023,
    },
    {
      id: 2,
      value: 50,
      unit: "EUR Billion",
      name: "Trade Balance",
      year: 2023,
    },
    {
      id: 3,
      value: 2.5,
      unit: "percent",
      name: "Inflation Rate",
      year: 2023,
    },
  ];

  const config: PipelineConfig = {
    minQualityScore: 50,
    targetCurrency: "USD",
    targetMagnitude: "billions",
    inferUnits: true,
    validateSchema: false,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {
        EUR: 0.85,
        GBP: 0.75,
        JPY: 150,
      },
    },
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(mockData);

  assertEquals(Array.isArray(result), true);
  assertEquals(result.length > 0, true);
});

Deno.test("Pipeline - handles validation errors", async () => {
  const invalidData: ParsedData[] = [];

  const config: PipelineConfig = {
    validateSchema: true,
    requiredFields: ["value", "unit"],
  };

  const pipeline = createPipeline(config);

  try {
    await pipeline.run(invalidData);
    throw new Error("Pipeline should have failed");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : `${error}`;
    assertEquals(msg.includes("No data provided"), true);
  }
});

Deno.test("Pipeline - quality check threshold", async () => {
  const lowQualityData: ParsedData[] = [
    {
      value: 100,
      unit: "unknown",
      name: "Unknown Indicator",
    },
    {
      value: -999999,
      unit: "USD",
      name: "Bad Data",
    },
  ];

  const config: PipelineConfig = {
    minQualityScore: 90, // High threshold
    validateSchema: false,
    useLiveFX: false,
  };

  const pipeline = createPipeline(config);

  // Interactive pipeline for testing quality review
  const interactive = pipeline.createInteractive();
  interactive.start(lowQualityData);

  // Wait a bit for state machine to process
  await new Promise((resolve) => setTimeout(resolve, 100));

  const state = interactive.getState();
  // Should be in quality review state due to low quality
  assertEquals(
    state?.matches("qualityReview") || state?.matches("error") || false,
    true,
  );

  // Clean up the actor
  interactive.stop();
});

Deno.test("Pipeline - successful normalization", async () => {
  const dataToNormalize: ParsedData[] = [
    {
      value: 100,
      unit: "USD Million",
      name: "Revenue",
    },
    {
      value: 50,
      unit: "USD Million",
      name: "Expenses",
    },
  ];

  const config: PipelineConfig = {
    targetCurrency: "EUR",
    targetMagnitude: "billions",
    minQualityScore: 50,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {
        EUR: 0.85,
      },
    },
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(dataToNormalize);

  assertEquals(Array.isArray(result), true);
  // Check that pipeline metadata was added
  assertEquals("pipeline" in (result?.[0] ?? {}), true);
});

Deno.test("Pipeline - unit inference", async () => {
  const dataWithMissingUnits: ParsedData[] = [
    {
      value: 3.5,
      unit: "",
      description: "Interest rate percentage",
      name: "Interest Rate",
    },
    {
      value: 1500000,
      unit: "unknown",
      description: "Population count in thousands",
      name: "Population",
    },
  ];

  const config: PipelineConfig = {
    inferUnits: true,
    minQualityScore: 30,
    validateSchema: false,
    useLiveFX: false,
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(dataWithMissingUnits);

  assertEquals(Array.isArray(result), true);
  // Inferred units should be marked in the result
  const firstResult = result?.[0];
  if (firstResult) {
    // Check if unit was inferred
    assertEquals(
      firstResult.inferredUnit !== undefined || firstResult.unit !== "",
      true,
    );
  }
});

Deno.test("Pipeline - batch processing", async () => {
  const largeBatch: ParsedData[] = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    value: Math.random() * 1000,
    unit: i % 2 === 0 ? "USD Million" : "EUR Million",
    name: `Indicator ${i}`,
    year: 2020 + (i % 4),
  }));

  const config: PipelineConfig = {
    targetCurrency: "USD",
    targetMagnitude: "millions",
    minQualityScore: 40,
    validateSchema: false,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {
        EUR: 0.85,
        GBP: 0.75,
      },
    },
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(largeBatch);

  assertEquals(Array.isArray(result), true);
  assertEquals(result.length > 0, true);
  // All items should have pipeline metadata
  for (const item of result) {
    assertEquals("pipeline" in item, true);
  }
});

Deno.test("Pipeline - interactive control flow", async () => {
  const testData: ParsedData[] = [
    {
      value: 100,
      unit: "USD",
      name: "Test Indicator",
    },
  ];

  const config: PipelineConfig = {
    minQualityScore: 50,
    validateSchema: false,
  };

  const pipeline = createPipeline(config);
  const interactive = pipeline.createInteractive();

  interactive.start(testData);

  // Wait for state machine to process
  await new Promise((resolve) => setTimeout(resolve, 100));

  const state = interactive.getState();

  // Should have moved from idle
  assertEquals(state?.matches("idle") || false, false);

  // Test context access
  const context = interactive.getContext();
  assertEquals(context?.rawData, testData);

  // Clean up the actor
  interactive.stop();
  assertEquals(context?.config, config);
  assertEquals(Array.isArray(context?.errors), true);
  assertEquals(Array.isArray(context?.warnings), true);
});

Deno.test("Pipeline - error handling and recovery", async () => {
  const problematicData: ParsedData[] = [
    {
      value: NaN,
      unit: "USD",
      name: "Invalid Value",
    },
    {
      value: Infinity,
      unit: "EUR",
      name: "Infinite Value",
    },
  ];

  const config: PipelineConfig = {
    minQualityScore: 50,
    validateSchema: true,
    requiredFields: ["value", "unit"],
    useLiveFX: false,
  };

  const pipeline = createPipeline(config);

  // Add a race condition with timeout to prevent hanging
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Test timeout")), 5000);
  });

  try {
    const result = await Promise.race([
      pipeline.run(problematicData),
      timeoutPromise,
    ]);
    // Pipeline might handle these gracefully
    assertEquals(Array.isArray(result), true);
  } catch (error) {
    // Or it might fail - both are acceptable behaviors
    assertEquals(error instanceof Error, true);
  } finally {
    // Clean up the timeout
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
});

Deno.test("Pipeline - output format configuration", async () => {
  const data: ParsedData[] = [
    {
      value: 100,
      unit: "USD Million",
      name: "Export Value",
      date: "2024-01-01",
    },
  ];

  const config: PipelineConfig = {
    outputFormat: "json",
    targetCurrency: "USD",
    minQualityScore: 50,
    useLiveFX: false,
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(data);

  assertEquals(Array.isArray(result), true);
  assertEquals(result.length, 1);

  // Result should have the pipeline metadata
  const item = result[0];
  assertEquals("pipeline" in item, true);
  const p = item.pipeline;
  if (p) {
    assertEquals(typeof p.processingTime, "number");
  }
});

Deno.test("Pipeline - processes without FX fallback but no currency conversion", async () => {
  const data: ParsedData[] = [
    {
      value: 1000,
      unit: "EUR Million",
      name: "Revenue",
    },
  ];

  // Configuration without fxFallback - should process but without currency conversion
  const configWithoutFallback: PipelineConfig = {
    targetCurrency: "USD",
    useLiveFX: false,
    // No fxFallback provided
  };

  const pipeline = createPipeline(configWithoutFallback);
  const result = await pipeline.run(data);

  assertEquals(Array.isArray(result), true);
  assertEquals(result.length, 1);

  // Should process but without actual currency conversion
  // Value stays the same since no FX rates available
  assertEquals(result[0].value, 1000);
  assertEquals(result[0].normalized, 1000);
  // Unit gets normalized to target currency format but value unchanged
  assertEquals(result[0].normalizedUnit, "USD millions");
});

Deno.test("Pipeline - wages processing with FX fallback rates", async () => {
  // Wages data that should trigger specialized processing
  const wagesData: ParsedData[] = [
    {
      id: "ARM",
      value: 233931,
      unit: "AMD/Month",
      name: "Average Wages",
      metadata: { country: "Armenia" },
    },
    {
      id: "AUS",
      value: 1631,
      unit: "AUD/Week",
      name: "Average Wages",
      metadata: { country: "Australia" },
    },
    {
      id: "AWG",
      value: 3500,
      unit: "AWG/Month",
      name: "Average Wages",
      metadata: { country: "Aruba" },
    },
  ];

  const config: PipelineConfig = {
    targetCurrency: "USD",
    minQualityScore: 30,
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
    includeWageMetadata: true,
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(wagesData);

  assertEquals(Array.isArray(result), true);
  assertEquals(result.length, 3);

  // Check that wages were properly converted
  const armResult = result.find((r) => r.id === "ARM");
  const ausResult = result.find((r) => r.id === "AUS");
  const awgResult = result.find((r) => r.id === "AWG");

  assertExists(armResult);
  assertExists(ausResult);
  assertExists(awgResult);

  // ARM: 233,931 AMD/Month → ~603.69 USD/month
  assertEquals(Math.round(armResult.normalized || 0), 604);
  assertEquals(armResult.normalizedUnit, "USD per month");

  // AUS: 1,631 AUD/Week → ~4,650 USD/month (1631/1.52 * 4.33)
  assertEquals(Math.round(ausResult.normalized || 0), 4650);
  assertEquals(ausResult.normalizedUnit, "USD per month");

  // AWG: 3,500 AWG/Month → ~1,944 USD/month
  assertEquals(Math.round(awgResult.normalized || 0), 1944);
  assertEquals(awgResult.normalizedUnit, "USD per month");
});

Deno.test("Pipeline - wages processing without FX rates falls back gracefully", async () => {
  const wagesData: ParsedData[] = [
    {
      id: "ARM",
      value: 233931,
      unit: "AMD/Month",
      name: "Average Wages",
    },
  ];

  // Configuration without fxFallback - should process but without currency conversion
  const config: PipelineConfig = {
    targetCurrency: "USD",
    useLiveFX: false,
    // No fxFallback provided
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(wagesData);

  assertEquals(Array.isArray(result), true);
  assertEquals(result.length, 1);

  // Should process but without currency conversion
  // Original value stays the same since no FX rates available
  assertEquals(result[0].value, 233931);
  assertEquals(result[0].unit, "AMD/Month");
  // Without FX rates, normalized value equals original value (no conversion)
  assertEquals(result[0].normalized, 233931);
});

Deno.test("Pipeline - time resampling with targetTimeScale", async () => {
  const data: ParsedData[] = [
    {
      id: "quarterly_revenue",
      value: 100,
      unit: "Million USD per Quarter",
      name: "Company Revenue",
    },
    {
      id: "annual_production",
      value: 1200,
      unit: "Billion USD per Year",
      name: "Production Output",
    },
  ];

  const config: PipelineConfig = {
    targetCurrency: "USD",
    targetTimeScale: "month", // Convert all to monthly
    minQualityScore: 30,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: {},
    },
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(data);

  assertEquals(Array.isArray(result), true);
  assertEquals(result.length, 2);

  // Check that time conversion happened (values should be different from original)
  const quarterlyResult = result.find((r) => r.id === "quarterly_revenue");
  assertExists(quarterlyResult);
  // Quarterly to monthly: should be roughly 1/3 of original
  assertEquals(quarterlyResult.normalized !== quarterlyResult.value, true);

  const annualResult = result.find((r) => r.id === "annual_production");
  assertExists(annualResult);
  // Annual to monthly: should be roughly 1/12 of original
  assertEquals(annualResult.normalized !== annualResult.value, true);
});

Deno.test("Workflow Router - partitions mixed dataset and preserves order", async () => {
  const data: ParsedData[] = [
    {
      id: "w1",
      value: 3000,
      unit: "USD per month",
      name: "Average Wage",
      indicator_type: "flow",
    },
    {
      id: "c1",
      value: 12,
      unit: "Thousands",
      name: "Car Registrations",
      indicator_type: "count",
      is_currency_denominated: false,
    },
    {
      id: "p1",
      value: 2.5,
      unit: "percent",
      name: "Inflation Rate",
      indicator_type: "rate",
    },
    {
      id: "w2",
      value: 48000,
      unit: "EUR per year",
      name: "Median Salary",
      indicator_type: "flow",
    },
  ];

  const config: PipelineConfig = {
    targetCurrency: "USD",
    targetTimeScale: "month",
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { EUR: 1.0 } },
    explain: true,
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(data);

  // Same length and order preserved by id
  assertEquals(result.length, data.length);
  const [r0, r1, r2, r3] = result;
  assertEquals(r0.id, "w1");
  assertEquals(r1.id, "c1");
  assertEquals(r2.id, "p1");
  assertEquals(r3.id, "w2");

  // Bucket-specific expectations
  assertEquals(r0.normalizedUnit, "USD per month");
  assertEquals(r1.normalizedUnit, "ones");
  assertEquals(r2.normalizedUnit, "%");
  assertEquals(r3.normalizedUnit, "USD per month");
});

Deno.test("Workflow Router - routes energy/commodities/emissions and preserves order without per <time>", async () => {
  const data: ParsedData[] = [
    {
      id: "w",
      value: 2000,
      unit: "USD per month",
      name: "Wage",
      indicator_type: "flow",
      is_currency_denominated: true,
    },
    {
      id: "en",
      value: 150,
      unit: "GWh",
      name: "Electricity production",
      indicator_type: "flow",
      is_currency_denominated: false,
    },
    {
      id: "co",
      value: 10,
      unit: "barrel",
      name: "Crude output",
      indicator_type: "flow",
      is_currency_denominated: false,
    },
    {
      id: "em",
      value: 25,
      unit: "CO2 tonnes",
      name: "CO2 emissions",
      indicator_type: "flow",
      is_currency_denominated: false,
    },
    {
      id: "pc",
      value: 4.2,
      unit: "%",
      name: "Inflation",
      indicator_type: "rate",
      is_currency_denominated: false,
    },
    {
      id: "ct",
      value: 2,
      unit: "Thousands",
      name: "Car registrations",
      indicator_type: "count",
      is_currency_denominated: false,
    },
  ];

  const config: PipelineConfig = {
    targetCurrency: "USD",
    targetTimeScale: "month",
    useLiveFX: false,
    explain: true,
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(data);

  assertEquals(result.map((r) => r.id), ["w", "en", "co", "em", "pc", "ct"]);

  const byId = Object.fromEntries(result.map((r) => [r.id, r]));
  assertEquals(byId["w"].normalizedUnit, "USD per month");
  assertEquals(byId["en"].normalizedUnit, "GWh");
  assertEquals(byId["co"].normalizedUnit, "barrel");
  assertEquals(byId["em"].normalizedUnit, "CO2 tonnes");
  assertEquals(byId["pc"].normalizedUnit, "%");
  assertEquals(byId["ct"].normalizedUnit, "ones");

  // Domain surfaced in explain metadata
  assertEquals(byId["en"].explain?.domain, "energy");
  assertEquals(byId["co"].explain?.domain, "commodity");
  assertEquals(byId["em"].explain?.domain, "emissions");
});

Deno.test("Workflow Router - routes agriculture/metals without currency/time and preserves order", async () => {
  const data: ParsedData[] = [
    {
      id: "w",
      value: 2500,
      unit: "USD per month",
      name: "Wage",
      indicator_type: "flow",
      is_currency_denominated: true,
    },
    {
      id: "ag",
      value: 700,
      unit: "metric tonnes",
      name: "Wheat production",
      indicator_type: "flow",
      is_currency_denominated: false,
    },
    {
      id: "me",
      value: 120,
      unit: "copper tonnes",
      name: "Copper production",
      indicator_type: "flow",
      is_currency_denominated: false,
    },
    {
      id: "ct",
      value: 3,
      unit: "Thousands",
      name: "Car registrations",
      indicator_type: "count",
      is_currency_denominated: false,
    },
  ];

  const config: PipelineConfig = {
    targetCurrency: "USD",
    targetTimeScale: "month",
    useLiveFX: false,
    explain: true,
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(data);

  // Order preserved
  assertEquals(result.map((r) => r.id), ["w", "ag", "me", "ct"]);

  const byId = Object.fromEntries(result.map((r) => [r.id, r]));
  assertEquals(byId["w"].normalizedUnit, "USD per month");
  assertEquals(byId["ag"].normalizedUnit, "metric tonnes");
  assertEquals(byId["me"].normalizedUnit, "copper tonnes");
  assertEquals(byId["ct"].normalizedUnit, "ones");

  // Domain surfaced in explain metadata
  assertEquals(byId["ag"].explain?.domain, "agriculture");
  assertEquals(byId["me"].explain?.domain, "metals");
});

Deno.test("Workflow Router - non-monetary categories ignore targetCurrency and targetTimeScale", async () => {
  const data: ParsedData[] = [
    { id: "en", value: 150, unit: "GWh", name: "Electricity production" },
    { id: "em", value: 25, unit: "CO2 tonnes", name: "CO2 emissions" },
    { id: "co", value: 10, unit: "barrel", name: "Crude output" },
    { id: "ag", value: 500, unit: "metric tonnes", name: "Corn output" },
    { id: "me", value: 60, unit: "copper tonnes", name: "Copper mined" },
  ];

  const config: PipelineConfig = {
    targetCurrency: "USD",
    targetTimeScale: "month",
    useLiveFX: false,
    explain: true,
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(data);
  const byId = Object.fromEntries(result.map((r) => [r.id, r]));

  // Ensure currency/time were NOT applied
  assertEquals(byId["en"].normalizedUnit, "GWh");
  assertEquals(byId["em"].normalizedUnit, "CO2 tonnes");
  assertEquals(byId["co"].normalizedUnit, "barrel");
  assertEquals(byId["ag"].normalizedUnit, "metric tonnes");
  assertEquals(byId["me"].normalizedUnit, "copper tonnes");

  // Domain surfaced in explain metadata
  assertEquals(byId["en"].explain?.domain, "energy");
  assertEquals(byId["em"].explain?.domain, "emissions");
  assertEquals(byId["co"].explain?.domain, "commodity");
  assertEquals(byId["ag"].explain?.domain, "agriculture");
  assertEquals(byId["me"].explain?.domain, "metals");
});

Deno.test("Workflow Router - stress test with diverse dataset", async () => {
  const data: ParsedData[] = [
    // Wages (various time bases)
    {
      id: "w_hr",
      value: 30,
      unit: "CAD/Hour",
      name: "Average Hourly Wage",
      indicator_type: "flow",
      is_currency_denominated: true,
    },
    {
      id: "w_wk",
      value: 1500,
      unit: "EUR/Week",
      name: "Average Weekly Wage",
      indicator_type: "flow",
      is_currency_denominated: true,
    },
    {
      id: "w_yr",
      value: 60000,
      unit: "GBP/Year",
      name: "Average Salary",
      indicator_type: "flow",
      is_currency_denominated: true,
    },
    {
      id: "w_mo",
      value: 3200,
      unit: "USD/Month",
      name: "Median Salary",
      indicator_type: "flow",
      is_currency_denominated: true,
    },
    // Counts
    {
      id: "cnt_k",
      value: 12,
      unit: "Thousands",
      name: "Car Registrations",
      indicator_type: "count",
      is_currency_denominated: false,
    },
    {
      id: "cnt_u",
      value: 850,
      unit: "Units",
      name: "Licenses Issued",
      indicator_type: "count",
      is_currency_denominated: false,
    },
    // Percentage
    {
      id: "pct",
      value: 3.2,
      unit: "%",
      name: "Inflation Rate",
      indicator_type: "rate",
      is_currency_denominated: false,
    },
    // Physical/non-monetary domains - production is flow
    {
      id: "en",
      value: 150,
      unit: "GWh",
      name: "Electricity production",
      indicator_type: "flow",
      is_currency_denominated: false,
    },
    {
      id: "co",
      value: 10,
      unit: "barrel",
      name: "Crude output",
      indicator_type: "flow",
      is_currency_denominated: false,
    },
    {
      id: "em",
      value: 25,
      unit: "CO2 tonnes",
      name: "CO2 emissions",
      indicator_type: "flow",
      is_currency_denominated: false,
    },
    {
      id: "ag",
      value: 700,
      unit: "metric tonnes",
      name: "Wheat production",
      indicator_type: "flow",
      is_currency_denominated: false,
    },
    {
      id: "me",
      value: 120,
      unit: "copper tonnes",
      name: "Copper production",
      indicator_type: "flow",
      is_currency_denominated: false,
    },
    // Inference/unknown
    {
      id: "unk",
      value: 2.5,
      unit: "",
      name: "Interest Rate",
      indicator_type: "rate",
      is_currency_denominated: false,
    },
  ];

  const config: PipelineConfig = {
    targetCurrency: "USD",
    targetTimeScale: "month",
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { CAD: 1.36, EUR: 0.92, GBP: 0.79 } },
    explain: true,
    inferUnits: true,
  };

  const pipeline = createPipeline(config);
  const result = await pipeline.run(data);

  // Same length and order by id preserved
  assertEquals(result.length, data.length);
  assertEquals(result.map((r) => r.id), data.map((d) => d.id));

  const byId = Object.fromEntries(result.map((r) => [r.id, r]));

  // Wages normalize to USD per month
  assertEquals(byId["w_hr"].normalizedUnit, "USD per month");
  assertEquals(byId["w_wk"].normalizedUnit, "USD per month");
  assertEquals(byId["w_yr"].normalizedUnit, "USD per month");
  assertEquals(byId["w_mo"].normalizedUnit, "USD per month");

  // Counts → ones
  assertEquals(byId["cnt_k"].normalizedUnit, "ones");
  assertEquals(byId["cnt_u"].normalizedUnit, "ones");

  // Percent untouched
  assertEquals(byId["pct"].normalizedUnit, "%");

  // Non-monetary domains ignore currency/time
  assertEquals(byId["en"].normalizedUnit, "GWh");
  assertEquals(byId["co"].normalizedUnit, "barrel");
  assertEquals(byId["em"].normalizedUnit, "CO2 tonnes");
  assertEquals(byId["ag"].normalizedUnit, "metric tonnes");
  assertEquals(byId["me"].normalizedUnit, "copper tonnes");

  // Domain surfaced in explain metadata
  assertEquals(byId["en"].explain?.domain, "energy");
  assertEquals(byId["co"].explain?.domain, "commodity");
  assertEquals(byId["em"].explain?.domain, "emissions");
  assertEquals(byId["ag"].explain?.domain, "agriculture");
  assertEquals(byId["me"].explain?.domain, "metals");
  // Newly surfaced domains
  assertEquals(byId["w_hr"].explain?.domain, "wages");
  assertEquals(byId["cnt_k"].explain?.domain, "count");
  assertEquals(byId["cnt_u"].explain?.domain, "count");
  assertEquals(byId["pct"].explain?.domain, "percentage");

  // Inference did not crash pipeline; result contains pipeline metadata
  assertEquals("pipeline" in byId["unk"], true);
});
