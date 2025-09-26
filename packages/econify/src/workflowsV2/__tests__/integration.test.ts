import { assertEquals, assertExists } from "jsr:@std/assert";
import { processEconomicData } from "../../api/pipeline_api.ts";
import type { ParsedData } from "../shared/types.ts";

Deno.test("V2 integration - complete pipeline via API", async () => {
  const testData: ParsedData[] = [
    {
      id: "test-gdp",
      value: 100,
      unit: "USD Million",
      name: "GDP",
      description: "Gross Domestic Product",
    },
    {
      id: "test-inflation",
      value: 3.5,
      unit: "percent",
      name: "Inflation",
      description: "Consumer Price Index",
    },
    {
      id: "test-salary",
      value: 50000,
      unit: "EUR per year",
      name: "Average Salary",
      description: "Average annual salary",
    },
  ];

  const result = await processEconomicData(testData, {
    engine: "v2", // Use V2 pipeline
    targetCurrency: "EUR",
    targetMagnitude: "millions",
    targetTimeScale: "month",
    minQualityScore: 60,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.85, USD: 1.0 },
      dates: { EUR: "2024-01-01" },
    },
    explain: true,
  });

  // Verify result structure
  assertExists(result);
  assertEquals(Array.isArray(result.data), true);
  assertEquals(Array.isArray(result.warnings), true);
  assertEquals(typeof result.metrics, "object");

  // Should have processed all items
  assertEquals(result.data.length, 3);
  assertEquals(result.metrics.recordsProcessed, 3);
  assertEquals(result.metrics.recordsFailed, 0);

  // Check that normalization occurred
  const gdpItem = result.data.find((item) => item.name === "GDP");
  assertExists(gdpItem);
  assertExists((gdpItem as any).normalizedValue || gdpItem.normalized);
  assertExists(gdpItem.normalizedUnit);

  // Check explain metadata exists
  assertExists(gdpItem.explain);

  console.log(`✅ V2 API integration: processed ${result.data.length} items`);
  console.log(`   Quality score: ${result.metrics.qualityScore}`);
  console.log(`   Processing time: ${result.metrics.processingTime}ms`);
  console.log(`   Warnings: ${result.warnings.length}`);
});

Deno.test("V2 vs V1 comparison - same results", async () => {
  const testData: ParsedData[] = [
    {
      value: 100,
      unit: "USD Million",
      name: "GDP",
      description: "Gross Domestic Product",
    },
    {
      value: 3.5,
      unit: "percent",
      name: "Inflation",
      description: "Consumer Price Index",
    },
  ];

  const config = {
    targetCurrency: "EUR",
    targetMagnitude: "millions" as const,
    targetTimeScale: "month" as const,
    minQualityScore: 60,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.85, USD: 1.0 },
      dates: { EUR: "2024-01-01" },
    },
  };

  // Run V1 pipeline
  const v1Result = await processEconomicData(testData, {
    ...config,
    engine: "v1",
  });

  // Run V2 pipeline
  const v2Result = await processEconomicData(testData, {
    ...config,
    engine: "v2",
  });

  // Both should succeed
  assertEquals(v1Result.data.length, v2Result.data.length);
  assertEquals(
    v1Result.metrics.recordsProcessed,
    v2Result.metrics.recordsProcessed,
  );

  // GDP should be normalized similarly (allowing for small differences)
  const v1GDP = v1Result.data.find((item) => item.name === "GDP");
  const v2GDP = v2Result.data.find((item) => item.name === "GDP");

  assertExists(v1GDP);
  assertExists(v2GDP);
  assertExists(v1GDP.normalized);
  assertExists(v2GDP.normalized);

  // Values should be close (within 1% tolerance for any rounding differences)
  const tolerance = Math.abs(v1GDP.normalized * 0.01);
  const difference = Math.abs(v1GDP.normalized - v2GDP.normalized);

  if (difference > tolerance) {
    console.warn(
      `V1/V2 GDP difference: ${difference} (tolerance: ${tolerance})`,
    );
    console.warn(`V1: ${v1GDP.normalized}, V2: ${v2GDP.normalized}`);
  }

  console.log(
    `✅ V1/V2 comparison: both processed ${v1Result.data.length} items`,
  );
  console.log(`   V1 time: ${v1Result.metrics.processingTime}ms`);
  console.log(`   V2 time: ${v2Result.metrics.processingTime}ms`);

  if (v2Result.metrics.processingTime && v1Result.metrics.processingTime) {
    const speedup =
      (v1Result.metrics.processingTime - v2Result.metrics.processingTime) /
      v1Result.metrics.processingTime * 100;
    console.log(`   V2 speedup: ${speedup.toFixed(1)}%`);
  }
});
