import { assertEquals, assertExists } from "@std/assert";
import { classifyIndicatorsWithOptions } from "../../src/classify.ts";
import type { Indicator } from "../../src/types.ts";

Deno.test("Dry Run - should execute without API calls", async () => {
  const indicators: Indicator[] = [
    {
      id: "test_gdp",
      name: "GDP Growth Rate",
      units: "%",
    },
    {
      id: "test_cpi",
      name: "Consumer Price Index",
      units: "index",
    },
  ];

  const result = await classifyIndicatorsWithOptions(indicators, {
    llmConfig: {
      provider: "openai",
      apiKey: "dummy-key-not-used",
      model: "gpt-4o-mini",
    },
    dryRun: true,
    debug: false,
  });

  // Verify result structure
  assertExists(result);
  assertExists(result.enriched);
  assertExists(result.tokenUsage);
  assertExists(result.performance);

  // Verify all indicators were processed
  assertEquals(result.enriched.length, 2);
  assertEquals(result.summary.total, 2);
  assertEquals(result.summary.successful, 2);
  assertEquals(result.summary.failed, 0);

  // Verify each indicator has mock classification
  for (const enriched of result.enriched) {
    assertExists(enriched.classification);
    assertExists(enriched.classification.indicator_type);
    assertExists(enriched.classification.indicator_category);
    // time_dimension is optional in mock data
  }

  // Verify token usage exists
  assertExists(result.tokenUsage.inputTokens);
  assertExists(result.tokenUsage.outputTokens);
  assertExists(result.tokenUsage.totalTokens);
  assertExists(result.tokenUsage.estimatedCost);
  assertEquals(result.tokenUsage.provider, "openai");
  assertEquals(result.tokenUsage.model, "gpt-4o-mini");

  // Verify performance metrics
  assertExists(result.performance.avgTimePerIndicator);
  assertExists(result.performance.throughput);
  assertExists(result.performance.avgTokensPerIndicator);
  assertExists(result.performance.avgCostPerIndicator);
});

Deno.test("Dry Run - should generate plausible mock classifications", async () => {
  const indicators: Indicator[] = [
    {
      id: "gdp_nominal",
      name: "Nominal GDP",
      units: "USD millions",
    },
    {
      id: "unemployment_rate",
      name: "Unemployment Rate",
      units: "%",
    },
    {
      id: "population",
      name: "Total Population",
      units: "persons",
    },
  ];

  const result = await classifyIndicatorsWithOptions(indicators, {
    llmConfig: {
      provider: "openai",
      apiKey: "dummy-key",
    },
    dryRun: true,
    debug: false,
  });

  // Check GDP classification (should be flow)
  const gdp = result.enriched.find((i) => i.id === "gdp_nominal");
  assertExists(gdp);
  assertEquals(gdp.classification.indicator_type, "flow");

  // Check unemployment rate (should be percentage)
  const unemployment = result.enriched.find((i) =>
    i.id === "unemployment_rate"
  );
  assertExists(unemployment);
  assertEquals(unemployment.classification.indicator_type, "percentage");

  // Check population - mock heuristics may classify as count or other
  const population = result.enriched.find((i) => i.id === "population");
  assertExists(population);
  // Mock heuristics classify "persons" units as count or other
  const validTypes = ["count", "other"];
  assertEquals(
    validTypes.includes(population.classification.indicator_type),
    true,
  );
});

Deno.test("Dry Run - should work with different providers", async () => {
  const indicators: Indicator[] = [
    { id: "test1", name: "Test Indicator", units: "units" },
  ];

  const providers = ["openai", "anthropic", "gemini"] as const;

  for (const provider of providers) {
    const result = await classifyIndicatorsWithOptions(indicators, {
      llmConfig: {
        provider,
        apiKey: "dummy-key",
      },
      dryRun: true,
      debug: false,
    });

    assertExists(result);
    assertEquals(result.summary.successful, 1);
    assertEquals(result.tokenUsage.provider, provider);
  }
});

Deno.test("Dry Run - should estimate costs correctly", async () => {
  const indicators: Indicator[] = Array.from({ length: 10 }, (_, i) => ({
    id: `test_${i}`,
    name: `Test Indicator ${i}`,
    units: "units",
  }));

  const result = await classifyIndicatorsWithOptions(indicators, {
    llmConfig: {
      provider: "openai",
      apiKey: "dummy-key",
      model: "gpt-4o-mini",
    },
    dryRun: true,
    debug: false,
  });

  // Should have token counts
  assertEquals(result.tokenUsage.totalTokens > 0, true);
  assertEquals(result.tokenUsage.inputTokens > 0, true);
  assertEquals(result.tokenUsage.outputTokens > 0, true);

  // Should have estimated cost
  assertEquals(result.tokenUsage.estimatedCost > 0, true);

  // Cost should match calculation
  const expectedCost = (result.tokenUsage.inputTokens / 1_000_000) * 0.150 +
    (result.tokenUsage.outputTokens / 1_000_000) * 0.600;

  // Allow for small floating point differences
  assertEquals(
    Math.abs(result.tokenUsage.estimatedCost - expectedCost) < 0.000001,
    true,
  );
});

Deno.test("Dry Run - should handle batch processing", async () => {
  const indicators: Indicator[] = Array.from({ length: 25 }, (_, i) => ({
    id: `test_${i}`,
    name: `Test Indicator ${i}`,
    units: "units",
  }));

  const result = await classifyIndicatorsWithOptions(indicators, {
    llmConfig: {
      provider: "openai",
      apiKey: "dummy-key",
    },
    batchSize: 10,
    dryRun: true,
    debug: false,
  });

  // All indicators should be processed
  assertEquals(result.enriched.length, 25);
  assertEquals(result.summary.successful, 25);
  assertEquals(result.summary.failed, 0);

  // All should have classifications
  for (const enriched of result.enriched) {
    assertExists(enriched.classification);
  }
});

Deno.test("Dry Run - should work with reasoning enabled", async () => {
  const indicators: Indicator[] = [
    { id: "test1", name: "GDP", units: "USD" },
  ];

  const withoutReasoning = await classifyIndicatorsWithOptions(indicators, {
    llmConfig: {
      provider: "openai",
      apiKey: "dummy-key",
      includeReasoning: false,
    },
    dryRun: true,
    debug: false,
  });

  const withReasoning = await classifyIndicatorsWithOptions(indicators, {
    llmConfig: {
      provider: "openai",
      apiKey: "dummy-key",
      includeReasoning: true,
    },
    dryRun: true,
    debug: false,
  });

  // With reasoning should have more output tokens
  assertEquals(
    withReasoning.tokenUsage.outputTokens >
      withoutReasoning.tokenUsage.outputTokens,
    true,
  );

  // With reasoning should cost more
  assertEquals(
    withReasoning.tokenUsage.estimatedCost >
      withoutReasoning.tokenUsage.estimatedCost,
    true,
  );
});
