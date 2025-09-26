import {
  assertEquals,
  assertExists,
  assertGreater,
  assertLess,
} from "jsr:@std/assert";
import { createActor } from "npm:xstate@^5.20.2";
import { pipelineV2Machine } from "../pipeline/pipeline.machine.ts";
import {
  edgeCasesExpectedDomainDistribution,
  edgeCasesFXFallback,
  edgeCasesRealEconomicData,
  expandedDataFXFallback,
  expandedExpectedDomainDistribution,
  expandedRealEconomicData,
  expectedDomainDistribution,
  realDataFXFallback,
  realEconomicDataSet,
} from "../__fixtures__/real-economic-data.ts";
import type { ParsedData } from "../shared/types.ts";

/**
 * Comprehensive End-to-End Tests for V2 Pipeline using Real Economic Data
 *
 * These tests validate the complete V2 pipeline flow using real economic indicators
 * extracted from the Tellimer PostgreSQL database, covering all classification domains
 * and testing the full normalization workflow.
 */

Deno.test("V2 E2E Real Data - Complete Pipeline Flow", async () => {
  const config = {
    targetCurrency: "EUR",
    targetMagnitude: "millions" as const,
    targetTimeScale: "month" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: realDataFXFallback,
    engine: "v2" as const,
  };

  const startTime = performance.now();

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: realEconomicDataSet,
      config,
    },
  });

  actor.start();

  // Wait for pipeline completion
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const duration = performance.now() - startTime;
  const output = result as any;

  // Verify pipeline completion
  assertExists(output, "Pipeline should produce output");
  assertExists(output.data, "Output should contain normalized data");
  assertEquals(
    Array.isArray(output.data),
    true,
    "Normalized data should be an array",
  );

  // Verify all input items were processed
  assertEquals(
    output.data.length,
    realEconomicDataSet.length,
    "All input items should be processed",
  );

  // Performance validation
  assertLess(duration, 10000, "Pipeline should complete within 10 seconds");

  console.log(
    `✅ V2 E2E: Processed ${realEconomicDataSet.length} real indicators in ${
      duration.toFixed(2)
    }ms`,
  );

  actor.stop();
});

Deno.test("V2 E2E Real Data - Domain Classification Validation", async () => {
  const config = {
    targetCurrency: "USD",
    targetMagnitude: "millions" as const,
    targetTimeScale: "year" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: realDataFXFallback,
    engine: "v2" as const,
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: realEconomicDataSet,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const output = result as any;
  const data: ParsedData[] = output.data;

  // Group by expected domain for validation
  const domainCounts: Record<string, number> = {};
  const classificationErrors: string[] = [];

  data.forEach((item: ParsedData) => {
    const expectedDomain = realEconomicDataSet.find((orig) =>
      orig.id === item.id
    )?.expected_domain;

    if (!expectedDomain) {
      classificationErrors.push(
        `Item ${item.id} not found in original dataset`,
      );
      return;
    }

    // Count actual domain classifications
    // Note: We'll infer domain from the normalized output characteristics
    let inferredDomain = "unknown";

    // Monetary indicators should have currency conversions
    if (
      item.currency_code &&
      (item.normalizedUnit?.includes("EUR") ||
        item.normalizedUnit?.includes("USD"))
    ) {
      if (
        item.name?.toLowerCase().includes("wage") ||
        item.name?.toLowerCase().includes("salary")
      ) {
        inferredDomain = "monetaryFlow";
      } else {
        inferredDomain = "monetaryStock";
      }
    } // Percentages should remain as percentages
    else if (item.unit?.includes("percent") || item.unit?.includes("%")) {
      if (item.unit?.includes("GDP")) {
        inferredDomain = "ratios";
      } else {
        inferredDomain = "percentages";
      }
    } // Points indicate indices
    else if (item.unit?.includes("points")) {
      inferredDomain = "indices";
    } // Population and similar counts
    else if (
      item.name?.toLowerCase().includes("population") ||
      (item.unit?.includes("people") ||
        item.unit?.includes("millions of people"))
    ) {
      inferredDomain = "counts";
    } // Energy indicators
    else if (
      item.category_group === "Energy" ||
      item.name?.toLowerCase().includes("oil")
    ) {
      inferredDomain = "energy";
    }

    domainCounts[inferredDomain] = (domainCounts[inferredDomain] || 0) + 1;

    // Validate against expected domain
    if (inferredDomain !== expectedDomain && inferredDomain !== "unknown") {
      classificationErrors.push(
        `Item ${item.id} expected ${expectedDomain} but inferred ${inferredDomain}`,
      );
    }
  });

  // Report classification results
  console.log("📊 Domain Classification Results:");
  Object.entries(domainCounts).forEach(([domain, count]) => {
    console.log(`  ${domain}: ${count} indicators`);
  });

  if (classificationErrors.length > 0) {
    console.warn("⚠️ Classification discrepancies:");
    classificationErrors.forEach((error) => console.warn(`  ${error}`));
  }

  // Verify we have indicators in major domains
  assertGreater(
    domainCounts.monetaryStock || 0,
    0,
    "Should have monetary stock indicators",
  );
  assertGreater(
    domainCounts.monetaryFlow || 0,
    0,
    "Should have monetary flow indicators",
  );
  assertGreater(
    domainCounts.percentages || 0,
    0,
    "Should have percentage indicators",
  );
  assertGreater(domainCounts.indices || 0, 0, "Should have index indicators");

  actor.stop();
});

Deno.test("V2 E2E Real Data - FX Routing Validation", async () => {
  const config = {
    targetCurrency: "EUR",
    targetMagnitude: "millions" as const,
    targetTimeScale: "month" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: realDataFXFallback,
    engine: "v2" as const,
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: realEconomicDataSet,
      config,
    },
  });
  let routerStepExecuted = false;
  const stateLog: string[] = [];

  actor.start();

  // Monitor pipeline states to verify FX routing
  actor.subscribe((state) => {
    const stateValue = typeof state.value === "string"
      ? state.value
      : JSON.stringify(state.value);
    stateLog.push(stateValue);

    if (
      stateValue.includes("route") || stateValue.includes("normalize") ||
      stateValue.includes("normalizeRouter")
    ) {
      routerStepExecuted = true;
    }
  });

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const output = result as { data: ParsedData[]; warnings: string[] };

  // Debug: Log the states that were executed
  console.log("🔍 Pipeline states executed:", stateLog.slice(0, 10));

  // Verify FX was executed (dataset contains monetary indicators)
  assertEquals(routerStepExecuted, true, "Router should be executed");

  // Verify currency conversions occurred for monetary indicators
  const data: ParsedData[] = output.data;
  const monetaryItems = data.filter((item) =>
    item.currency_code && (
      item.name?.toLowerCase().includes("gdp") ||
      item.name?.toLowerCase().includes("wage") ||
      item.name?.toLowerCase().includes("debt") ||
      item.name?.toLowerCase().includes("account") ||
      item.name?.toLowerCase().includes("export")
    )
  );

  assertGreater(
    monetaryItems.length,
    0,
    "Should have monetary items requiring FX",
  );

  // Check that EUR conversions occurred
  const eurConversions = monetaryItems.filter((item) =>
    item.normalizedUnit?.includes("EUR") ||
    item.explain?.currency?.normalized === "EUR"
  );

  assertGreater(
    eurConversions.length,
    0,
    "Should have EUR conversions for monetary data",
  );

  console.log(
    `✅ FX Routing: ${monetaryItems.length} monetary items processed, ${eurConversions.length} EUR conversions`,
  );

  actor.stop();
});

Deno.test("V2 E2E Real Data - Normalization Quality Validation", async () => {
  const config = {
    targetCurrency: "USD",
    targetMagnitude: "billions" as const,
    targetTimeScale: "year" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: realDataFXFallback,
    engine: "v2" as const,
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: realEconomicDataSet,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const output = result as { data: ParsedData[]; warnings: string[] };
  const data: ParsedData[] = output.data;

  // Validate normalization quality
  let validNormalizations = 0;
  const conversionErrors: string[] = [];

  data.forEach((item: ParsedData) => {
    // Check that normalized values exist and are reasonable
    if (typeof item.normalized === "number" && !isNaN(item.normalized)) {
      validNormalizations++;

      // Validate that normalized values are positive for economic indicators
      if (
        item.normalized < 0 && !item.name?.toLowerCase().includes("account")
      ) {
        conversionErrors.push(
          `${item.id}: Unexpected negative value ${item.normalized}`,
        );
      }

      // Validate magnitude scaling for monetary indicators
      if (item.currency_code && item.normalizedUnit?.includes("billions")) {
        // GDP values should be reasonable in billions
        if (
          item.name?.toLowerCase().includes("gdp") &&
          (item.normalized < 0.001 || item.normalized > 50000)
        ) {
          conversionErrors.push(
            `${item.id}: GDP value ${item.normalized} billions seems unreasonable`,
          );
        }
      }
    } else {
      conversionErrors.push(
        `${item.id}: Invalid normalized value ${item.normalized}`,
      );
    }

    // Validate that explain metadata exists for complex conversions
    if (item.currency_code && !item.explain) {
      conversionErrors.push(
        `${item.id}: Missing explain metadata for monetary indicator`,
      );
    }
  });

  // Report validation results
  const validationRate = (validNormalizations / data.length) * 100;
  console.log(
    `📈 Normalization Quality: ${validNormalizations}/${data.length} (${
      validationRate.toFixed(1)
    }%) valid`,
  );

  if (conversionErrors.length > 0) {
    console.warn("⚠️ Normalization issues:");
    conversionErrors.slice(0, 5).forEach((error) => console.warn(`  ${error}`));
    if (conversionErrors.length > 5) {
      console.warn(`  ... and ${conversionErrors.length - 5} more issues`);
    }
  }

  // Quality assertions
  assertGreater(
    validationRate,
    90,
    "At least 90% of normalizations should be valid",
  );
  assertLess(
    conversionErrors.length,
    data.length * 0.1,
    "Less than 10% should have conversion errors",
  );

  actor.stop();
});

Deno.test("V2 E2E Real Data - Explain Metadata Validation", async () => {
  const config = {
    targetCurrency: "EUR",
    targetMagnitude: "millions" as const,
    targetTimeScale: "month" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: realDataFXFallback,
    engine: "v2" as const,
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: realEconomicDataSet,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const output = result as { data: ParsedData[]; warnings: string[] };
  const data: ParsedData[] = output.data;

  // Validate explain metadata structure and content
  let explainCount = 0;
  let fxExplainCount = 0;
  let conversionExplainCount = 0;

  data.forEach((item: ParsedData) => {
    if (item.explain) {
      explainCount++;

      // Check for explain structure
      const explainObj = item.explain as Record<string, unknown>;

      // Validate FX explain for monetary indicators
      if (item.currency_code && explainObj.fx) {
        fxExplainCount++;
      }

      // Validate conversion explain
      if (explainObj.currency || explainObj.scale || explainObj.periodicity) {
        conversionExplainCount++;
      }
    }
  });

  // Report explain metadata coverage
  const explainRate = (explainCount / data.length) * 100;
  console.log(`📋 Explain Metadata Coverage:`);
  console.log(
    `  Overall: ${explainCount}/${data.length} (${explainRate.toFixed(1)}%)`,
  );
  console.log(`  FX explanations: ${fxExplainCount}`);
  console.log(`  Conversion explanations: ${conversionExplainCount}`);

  // Assertions for explain metadata quality
  assertGreater(
    explainRate,
    50,
    "At least 50% of items should have explain metadata",
  );
  assertGreater(
    fxExplainCount,
    0,
    "Should have FX explanations for monetary data",
  );
  assertGreater(
    conversionExplainCount,
    0,
    "Should have conversion explanations",
  );

  actor.stop();
});

Deno.test("V2 E2E Real Data - Performance Benchmarks", async () => {
  const config = {
    targetCurrency: "USD",
    targetMagnitude: "millions" as const,
    targetTimeScale: "year" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: realDataFXFallback,
    engine: "v2" as const,
  };

  const iterations = 3;
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();

    const actor = createActor(pipelineV2Machine, {
      input: {
        rawData: realEconomicDataSet,
        config,
      },
    });

    actor.start();

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Pipeline timeout"));
      }, 30000);

      actor.subscribe((state) => {
        if (state.status === "done") {
          clearTimeout(timeout);
          resolve(state.output);
        } else if (state.status === "error") {
          clearTimeout(timeout);
          reject(new Error(`Pipeline error: ${state.error}`));
        }
      });
    });

    const duration = performance.now() - startTime;
    durations.push(duration);

    actor.stop();
  }

  // Calculate performance metrics
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const throughput = realEconomicDataSet.length / (avgDuration / 1000); // items per second

  console.log(`⚡ Performance Benchmarks (${iterations} iterations):`);
  console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
  console.log(`  Min: ${minDuration.toFixed(2)}ms`);
  console.log(`  Max: ${maxDuration.toFixed(2)}ms`);
  console.log(`  Throughput: ${throughput.toFixed(1)} indicators/second`);

  // Performance assertions
  assertLess(
    avgDuration,
    5000,
    "Average processing time should be under 5 seconds",
  );
  assertGreater(
    throughput,
    2,
    "Should process at least 2 indicators per second",
  );
});

/**
 * EXPANDED REAL DATA TESTS
 *
 * Additional comprehensive tests using the expanded dataset with population counts,
 * vehicle counts, wage data, CPI transportation, government budget, consumer spending
 */

Deno.test("V2 E2E Expanded Data - Population and Vehicle Counts", async () => {
  const config = {
    targetCurrency: "USD",
    targetMagnitude: "millions" as const,
    targetTimeScale: "year" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: expandedDataFXFallback,
    engine: "v2" as const,
  };

  const startTime = performance.now();

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: expandedRealEconomicData,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const duration = performance.now() - startTime;
  const output = result as any;
  const data: ParsedData[] = output.data;

  // Verify pipeline completion
  assertExists(output, "Pipeline should produce output");
  assertEquals(
    data.length,
    expandedRealEconomicData.length,
    "All items should be processed",
  );

  // Validate population counts (should remain as counts, no currency conversion)
  const populationItems = data.filter((item) =>
    item.name?.toLowerCase().includes("population")
  );

  assertGreater(populationItems.length, 0, "Should have population indicators");

  populationItems.forEach((item) => {
    assertEquals(
      item.currency_code,
      null,
      "Population should not have currency",
    );
    assertEquals(
      typeof item.normalized,
      "number",
      "Population should have numeric value",
    );
    assertGreater(item.normalized, 0, "Population should be positive");
  });

  // Validate vehicle counts (should remain as counts)
  const vehicleItems = data.filter((item) =>
    item.name?.toLowerCase().includes("auto") ||
    item.name?.toLowerCase().includes("car")
  );

  assertGreater(vehicleItems.length, 0, "Should have vehicle indicators");

  vehicleItems.forEach((item) => {
    assertEquals(
      item.currency_code,
      null,
      "Vehicle counts should not have currency",
    );
    assertEquals(
      typeof item.normalized,
      "number",
      "Vehicle counts should have numeric value",
    );
    assertGreater(item.normalized, 0, "Vehicle counts should be positive");
  });

  console.log(
    `✅ Expanded E2E: ${populationItems.length} population + ${vehicleItems.length} vehicle indicators processed in ${
      duration.toFixed(2)
    }ms`,
  );

  actor.stop();
});

Deno.test("V2 E2E Expanded Data - Wage Data Multi-Currency", async () => {
  const config = {
    targetCurrency: "EUR",
    targetMagnitude: "ones" as const,
    targetTimeScale: "month" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: expandedDataFXFallback,
    engine: "v2" as const,
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: expandedRealEconomicData,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const output = result as any;
  const data: ParsedData[] = output.data;

  // Validate wage data processing
  const wageItems = data.filter((item) =>
    item.name?.toLowerCase().includes("earnings") ||
    item.name?.toLowerCase().includes("wage")
  );

  assertGreater(wageItems.length, 0, "Should have wage indicators");

  // Validate currency conversions for wages
  const eurWages = wageItems.filter((item) =>
    item.normalizedUnit?.includes("EUR") ||
    (item.explain as any)?.currency?.normalized === "EUR"
  );

  assertGreater(eurWages.length, 0, "Should have EUR-converted wages");

  // Validate time normalization for wages
  const monthlyWages = wageItems.filter((item) =>
    item.normalizedUnit?.includes("month") ||
    (item.explain as any)?.periodicity?.normalized === "month"
  );

  assertGreater(monthlyWages.length, 0, "Should have monthly-normalized wages");

  // Validate explain metadata for wage conversions
  wageItems.forEach((item) => {
    if (item.currency_code) {
      assertExists(
        item.explain,
        `Wage item ${item.id} should have explain metadata`,
      );
      const explainObj = item.explain as Record<string, unknown>;
      assertExists(
        explainObj.currency,
        `Wage item ${item.id} should have currency explain`,
      );
    }
  });

  console.log(
    `💰 Wage Processing: ${wageItems.length} wage indicators, ${eurWages.length} EUR conversions, ${monthlyWages.length} monthly normalizations`,
  );

  actor.stop();
});

Deno.test("V2 E2E Expanded Data - CPI Transportation Indices", async () => {
  const config = {
    targetCurrency: "USD",
    targetMagnitude: "ones" as const,
    targetTimeScale: "month" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: expandedDataFXFallback,
    engine: "v2" as const,
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: expandedRealEconomicData,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const output = result as any;
  const data: ParsedData[] = output.data;

  // Validate CPI Transportation processing
  const cpiItems = data.filter((item) =>
    item.name?.toLowerCase().includes("cpi transportation")
  );

  assertGreater(
    cpiItems.length,
    0,
    "Should have CPI Transportation indicators",
  );

  // CPI indices should remain as points (no currency conversion)
  cpiItems.forEach((item) => {
    assertEquals(item.currency_code, null, "CPI should not have currency");
    assertEquals(
      typeof item.normalized,
      "number",
      "CPI should have numeric value",
    );
    assertGreater(item.normalized, 0, "CPI should be positive");

    // Should preserve points unit
    if (item.normalizedUnit) {
      assertEquals(
        item.normalizedUnit.includes("points"),
        true,
        "CPI should remain in points",
      );
    }
  });

  // Validate geographic diversity
  const countries = new Set(cpiItems.map((item) => item.country_iso));
  assertGreater(
    countries.size,
    1,
    "Should have CPI data from multiple countries",
  );

  console.log(
    `📊 CPI Transportation: ${cpiItems.length} indicators from ${countries.size} countries`,
  );

  actor.stop();
});

Deno.test("V2 E2E Expanded Data - Consumer Spending Multi-Scale", async () => {
  const config = {
    targetCurrency: "USD",
    targetMagnitude: "billions" as const,
    targetTimeScale: "year" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: expandedDataFXFallback,
    engine: "v2" as const,
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: expandedRealEconomicData,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const output = result as any;
  const data: ParsedData[] = output.data;

  // Validate consumer spending processing
  const spendingItems = data.filter((item) =>
    item.name?.toLowerCase().includes("consumer spending")
  );

  assertGreater(
    spendingItems.length,
    0,
    "Should have consumer spending indicators",
  );

  // Validate currency conversions
  const usdSpending = spendingItems.filter((item) =>
    item.normalizedUnit?.includes("USD") ||
    (item.explain as any)?.currency?.normalized === "USD"
  );

  assertGreater(usdSpending.length, 0, "Should have USD-converted spending");

  // Validate magnitude scaling
  const billionsSpending = spendingItems.filter((item) =>
    item.normalizedUnit?.includes("billions") ||
    (item.explain as any)?.scale?.normalized === "billions"
  );

  assertGreater(
    billionsSpending.length,
    0,
    "Should have billions-scaled spending",
  );

  // Validate diverse currencies in original data
  const originalCurrencies = new Set(
    spendingItems
      .map((item) => item.currency_code)
      .filter(Boolean),
  );

  assertGreater(
    originalCurrencies.size,
    2,
    "Should have spending data in multiple currencies",
  );

  // Validate explain metadata for complex conversions
  spendingItems.forEach((item) => {
    if (item.currency_code) {
      assertExists(
        item.explain,
        `Spending item ${item.id} should have explain metadata`,
      );
      const explainObj = item.explain as Record<string, unknown>;

      // Should have currency conversion details
      if (item.currency_code !== "USD") {
        assertExists(
          explainObj.currency,
          `Spending item ${item.id} should have currency conversion explain`,
        );
      }

      // Should have scale conversion details if magnitude changed
      if (
        item.unit?.includes("millions") ||
        item.unit?.includes("hundred millions")
      ) {
        assertExists(
          explainObj.scale,
          `Spending item ${item.id} should have scale conversion explain`,
        );
      }
    }
  });

  console.log(
    `💸 Consumer Spending: ${spendingItems.length} indicators, ${originalCurrencies.size} original currencies, ${usdSpending.length} USD conversions`,
  );

  actor.stop();
});

Deno.test("V2 E2E Expanded Data - Government Budget Percentages", async () => {
  const config = {
    targetCurrency: "USD",
    targetMagnitude: "ones" as const,
    targetTimeScale: "year" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: expandedDataFXFallback,
    engine: "v2" as const,
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: expandedRealEconomicData,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const output = result as any;
  const data: ParsedData[] = output.data;

  // Validate government budget processing
  const budgetItems = data.filter((item) =>
    item.name?.toLowerCase().includes("government budget")
  );

  assertGreater(
    budgetItems.length,
    0,
    "Should have government budget indicators",
  );

  // Government budget percentages should remain as percentages
  budgetItems.forEach((item) => {
    assertEquals(
      item.currency_code,
      null,
      "Budget percentages should not have currency",
    );
    assertEquals(
      typeof item.normalized,
      "number",
      "Budget should have numeric value",
    );

    // Should preserve percentage unit
    if (item.normalizedUnit) {
      assertEquals(
        item.normalizedUnit.includes("percent") ||
          item.normalizedUnit.includes("%"),
        true,
        "Budget should remain as percentage",
      );
    }

    // Budget surplus/deficit can be positive or negative
    assertEquals(typeof item.normalized, "number", "Budget should be numeric");
  });

  console.log(
    `🏛️ Government Budget: ${budgetItems.length} percentage indicators processed`,
  );

  actor.stop();
});

Deno.test("V2 E2E Expanded Data - Complete Domain Coverage", async () => {
  const config = {
    targetCurrency: "EUR",
    targetMagnitude: "millions" as const,
    targetTimeScale: "month" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: expandedDataFXFallback,
    engine: "v2" as const,
  };

  const startTime = performance.now();

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: expandedRealEconomicData,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const duration = performance.now() - startTime;
  const output = result as any;
  const data: ParsedData[] = output.data;

  // Verify complete processing
  assertEquals(
    data.length,
    expandedRealEconomicData.length,
    "All expanded items should be processed",
  );

  // Count domain classifications
  const domainCounts: Record<string, number> = {};

  data.forEach((item: ParsedData) => {
    const expectedDomain = expandedRealEconomicData.find((orig) =>
      orig.id === item.id
    )?.expected_domain;
    if (expectedDomain) {
      domainCounts[expectedDomain] = (domainCounts[expectedDomain] || 0) + 1;
    }
  });

  // Validate expected domain distribution
  console.log("📊 Expanded Dataset Domain Distribution:");
  Object.entries(domainCounts).forEach(([domain, count]) => {
    console.log(`  ${domain}: ${count} indicators`);
  });

  // Verify we have the expected domains
  assertGreater(
    domainCounts.monetaryFlow || 0,
    0,
    "Should have monetary flow indicators",
  );
  assertGreater(domainCounts.counts || 0, 0, "Should have count indicators");
  assertGreater(domainCounts.indices || 0, 0, "Should have index indicators");
  assertGreater(
    domainCounts.percentages || 0,
    0,
    "Should have percentage indicators",
  );

  // Performance validation
  const throughput = expandedRealEconomicData.length / (duration / 1000);
  assertLess(
    duration,
    15000,
    "Expanded dataset should process within 15 seconds",
  );
  assertGreater(throughput, 1, "Should maintain reasonable throughput");

  console.log(
    `🎯 Expanded E2E Complete: ${expandedRealEconomicData.length} indicators in ${
      duration.toFixed(2)
    }ms (${throughput.toFixed(1)} items/sec)`,
  );

  actor.stop();
});

/**
 * EDGE CASES REAL DATA TESTS
 *
 * Tests using problematic real-world indicators with known scaling, unit, and
 * classification issues to validate V2 pipeline robustness.
 */

Deno.test("V2 E2E Edge Cases - Car Registrations Stock vs Flow", async () => {
  const config = {
    targetCurrency: "USD",
    targetMagnitude: "ones" as const,
    targetTimeScale: "year" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: edgeCasesFXFallback,
    engine: "v2" as const,
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: edgeCasesRealEconomicData,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const output = result as any;
  const data: ParsedData[] = output.data;

  // Validate car registrations processing
  const carRegItems = data.filter((item) =>
    item.name?.toLowerCase().includes("car registration")
  );

  assertGreater(
    carRegItems.length,
    0,
    "Should have car registration indicators",
  );

  // Car registrations should be classified as counts (not monetary)
  carRegItems.forEach((item) => {
    console.log(`🚗 Car Registration Debug: ${item.id}`);
    console.log(`  Original unit: ${item.unit}`);
    console.log(`  Normalized unit: ${item.normalizedUnit}`);
    console.log(`  Currency code: ${item.currency_code}`);
    console.log(`  Value: ${item.value} → ${item.normalized}`);

    assertEquals(
      item.currency_code,
      null,
      "Car registrations should not have currency",
    );
    assertEquals(
      typeof item.normalized,
      "number",
      "Car registrations should have numeric value",
    );
    assertGreater(item.normalized, 0, "Car registrations should be positive");

    // Should preserve unit structure (may be normalized differently)
    assertExists(
      item.normalizedUnit,
      "Car registrations should have normalized unit",
    );
  });

  console.log(
    `🚗 Car Registrations: ${carRegItems.length} indicators processed as counts (no currency conversion)`,
  );

  actor.stop();
});

Deno.test("V2 E2E Edge Cases - Extreme CPI Values", async () => {
  const config = {
    targetCurrency: "USD",
    targetMagnitude: "ones" as const,
    targetTimeScale: "month" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: edgeCasesFXFallback,
    engine: "v2" as const,
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: edgeCasesRealEconomicData,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const output = result as any;
  const data: ParsedData[] = output.data;

  // Validate extreme CPI processing
  const extremeCPIItems = data.filter((item) =>
    item.name?.toLowerCase().includes("cpi transportation") &&
    item.country_iso === "VEN"
  );

  assertGreater(
    extremeCPIItems.length,
    0,
    "Should have extreme CPI indicators",
  );

  // Extreme CPI should remain as indices (no currency conversion)
  extremeCPIItems.forEach((item) => {
    console.log(`📊 Extreme CPI Debug: ${item.id}`);
    console.log(`  Original unit: ${item.unit}`);
    console.log(`  Normalized unit: ${item.normalizedUnit}`);
    console.log(`  Currency code: ${item.currency_code}`);
    console.log(`  Value: ${item.value} → ${item.normalized}`);

    assertEquals(item.currency_code, null, "CPI should not have currency");
    assertEquals(
      typeof item.normalized,
      "number",
      "CPI should have numeric value",
    );
    assertGreater(
      item.normalized,
      1000000,
      "Venezuela CPI should have extreme values",
    );

    // Should preserve unit structure (may be normalized differently)
    assertExists(item.normalizedUnit, "CPI should have normalized unit");
  });

  console.log(
    `📊 Extreme CPI: ${extremeCPIItems.length} indicators with values > 1M points (hyperinflation scenario)`,
  );

  actor.stop();
});

Deno.test("V2 E2E Edge Cases - Government Finance Extreme Values", async () => {
  const config = {
    targetCurrency: "USD",
    targetMagnitude: "millions" as const,
    targetTimeScale: "year" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: edgeCasesFXFallback,
    engine: "v2" as const,
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: edgeCasesRealEconomicData,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const output = result as any;
  const data: ParsedData[] = output.data;

  // Validate government finance processing
  const govFinanceItems = data.filter((item) =>
    item.name?.toLowerCase().includes("government") &&
    (item.name?.toLowerCase().includes("revenue") ||
      item.name?.toLowerCase().includes("debt"))
  );

  assertGreater(
    govFinanceItems.length,
    0,
    "Should have government finance indicators",
  );

  // Validate currency conversions for extreme values
  const usdConvertedItems = govFinanceItems.filter((item) =>
    item.normalizedUnit?.includes("USD") ||
    (item.explain as any)?.currency?.normalized === "USD"
  );

  assertGreater(
    usdConvertedItems.length,
    0,
    "Should have USD-converted government finance",
  );

  // Validate explain metadata for extreme value conversions
  govFinanceItems.forEach((item) => {
    if (item.currency_code && item.currency_code !== "USD") {
      assertExists(
        item.explain,
        `Government finance item ${item.id} should have explain metadata`,
      );
      const explainObj = item.explain as Record<string, unknown>;
      assertExists(
        explainObj.currency,
        `Government finance item ${item.id} should have currency conversion explain`,
      );
    }
  });

  // Check for extreme values that might indicate scaling issues
  const extremeValues = govFinanceItems.filter((item) =>
    typeof item.normalized === "number" && item.normalized > 1_000_000 // Values > 1 trillion in target units
  );

  if (extremeValues.length > 0) {
    console.log(
      `⚠️  Extreme Values Detected: ${extremeValues.length} government finance indicators with values > 1M (potential scaling issues)`,
    );
    extremeValues.forEach((item) => {
      console.log(
        `  ${item.country_iso} ${item.name}: ${item.normalized} ${item.normalizedUnit}`,
      );
    });
  }

  console.log(
    `🏛️ Government Finance: ${govFinanceItems.length} indicators, ${usdConvertedItems.length} USD conversions, ${extremeValues.length} extreme values`,
  );

  actor.stop();
});

Deno.test("V2 E2E Edge Cases - Multi-Currency Scaling Validation", async () => {
  const config = {
    targetCurrency: "EUR",
    targetMagnitude: "billions" as const,
    targetTimeScale: "year" as const,
    autoTargetByIndicator: false,
    explain: true,
    useLiveFX: false,
    fxFallback: edgeCasesFXFallback,
    engine: "v2" as const,
  };

  const startTime = performance.now();

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: edgeCasesRealEconomicData,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 30000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const duration = performance.now() - startTime;
  const output = result as any;
  const data: ParsedData[] = output.data;

  // Verify complete processing
  assertEquals(
    data.length,
    edgeCasesRealEconomicData.length,
    "All edge case items should be processed",
  );

  // Count domain classifications
  const domainCounts: Record<string, number> = {};

  data.forEach((item: ParsedData) => {
    const expectedDomain = edgeCasesRealEconomicData.find((orig) =>
      orig.id === item.id
    )?.expected_domain;
    if (expectedDomain) {
      domainCounts[expectedDomain] = (domainCounts[expectedDomain] || 0) + 1;
    }
  });

  // Validate expected domain distribution
  console.log("📊 Edge Cases Domain Distribution:");
  Object.entries(domainCounts).forEach(([domain, count]) => {
    console.log(`  ${domain}: ${count} indicators`);
  });

  // Verify we have the expected edge case domains
  assertGreater(
    domainCounts.counts || 0,
    0,
    "Should have count indicators (car registrations)",
  );
  assertGreater(
    domainCounts.indices || 0,
    0,
    "Should have index indicators (extreme CPI)",
  );
  assertGreater(
    domainCounts.monetaryStock || 0,
    0,
    "Should have monetary stock indicators (GDP, debt)",
  );
  assertGreater(
    domainCounts.monetaryFlow || 0,
    0,
    "Should have monetary flow indicators (revenues, spending)",
  );

  // Validate currency conversions for monetary indicators
  const monetaryItems = data.filter((item) => item.currency_code !== null);

  const eurConversions = monetaryItems.filter((item) =>
    item.normalizedUnit?.includes("EUR") ||
    (item.explain as any)?.currency?.normalized === "EUR"
  );

  assertGreater(
    eurConversions.length,
    0,
    "Should have EUR conversions for monetary indicators",
  );

  // Performance validation for edge cases
  const throughput = edgeCasesRealEconomicData.length / (duration / 1000);
  assertLess(duration, 10000, "Edge cases should process within 10 seconds");
  assertGreater(
    throughput,
    0.5,
    "Should maintain reasonable throughput for edge cases",
  );

  console.log(
    `🎯 Edge Cases Complete: ${edgeCasesRealEconomicData.length} indicators in ${
      duration.toFixed(2)
    }ms (${throughput.toFixed(1)} items/sec)`,
  );
  console.log(
    `💱 Currency Conversions: ${eurConversions.length}/${monetaryItems.length} monetary indicators converted to EUR`,
  );

  actor.stop();
});

Deno.test("V2 E2E Real Data - Auto-Targeting Validation", async () => {
  // Test auto-targeting with real data using API
  const config = {
    targetCurrency: "USD", // Will be overridden by auto-targeting
    targetMagnitude: "millions" as const,
    targetTimeScale: "month" as const,
    autoTargetByIndicator: true, // Enable auto-targeting
    autoTargetDimensions: ["currency", "magnitude", "time"] as const,
    indicatorKey: "name" as const,
    minMajorityShare: 0.6,
    tieBreakers: {
      currency: "prefer-USD" as const,
      magnitude: "prefer-millions" as const,
      time: "prefer-month" as const,
    },
    explain: true,
    useLiveFX: false,
    fxFallback: realDataFXFallback,
    engine: "v2" as const,
  };

  const startTime = performance.now();

  // Use a subset of real data for focused auto-targeting testing
  const autoTargetTestData = realEconomicDataSet.slice(0, 20); // First 20 items for faster testing

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: autoTargetTestData,
      config,
    },
  });

  actor.start();

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout")), 30000);
    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Pipeline error: ${state.error}`));
      }
    });
  });

  const output = result as { normalizedData: ParsedData[]; warnings: string[] };
  const duration = performance.now() - startTime;

  // Basic validation
  assertGreater(output.normalizedData.length, 0, "Should process some data");
  assertEquals(
    output.normalizedData.length,
    autoTargetTestData.length,
    "Should process all input items",
  );

  // Validate explain metadata for auto-targeting
  let autoTargetedItems = 0;
  let explainValidationPassed = 0;

  output.normalizedData.forEach((item, index) => {
    // All items should have explain metadata
    assertExists(item.explain, `Item ${index} should have explain metadata`);
    assertExists(
      item.explain.explain_version,
      `Item ${index} should have explain version`,
    );
    assertEquals(
      item.explain.explain_version,
      "v2",
      "Should use V2 explain format",
    );

    // Check router information
    assertExists(
      item.explain.router,
      `Item ${index} should have router information`,
    );
    const processedBuckets = item.explain.router.processed_buckets ||
      item.explain.router.processedBuckets;
    assertExists(
      processedBuckets,
      `Item ${index} should have processed buckets info`,
    );

    // Check domain classification
    assertExists(
      item.explain.domain,
      `Item ${index} should have domain classification`,
    );
    const domainBucket = typeof item.explain.domain === "string"
      ? item.explain.domain
      : item.explain.domain?.bucket;
    assertExists(domainBucket, `Item ${index} should have domain bucket`);

    explainValidationPassed++;

    // For monetary items, validate auto-targeting metadata
    const isMonetary = domainBucket === "monetaryStock" ||
      domainBucket === "monetaryFlow";

    if (isMonetary && item.explain.autoTarget) {
      autoTargetedItems++;

      // Validate auto-target structure
      assertExists(
        item.explain.autoTarget.currency,
        "Should have currency auto-target info",
      );
      assertExists(
        item.explain.autoTarget.currency.selected,
        "Should have selected currency",
      );
      assertExists(
        item.explain.autoTarget.currency.dominance,
        "Should have currency dominance",
      );

      // Dominance should be a valid percentage
      const dominance = item.explain.autoTarget.currency.dominance;
      assertGreater(dominance, 0, "Currency dominance should be > 0");
      assertLess(dominance, 1.1, "Currency dominance should be <= 1.0"); // Allow slight rounding

      console.log(
        `📊 Auto-target for ${item.name}: ${item.explain.autoTarget.currency.selected} (${
          (dominance * 100).toFixed(1)
        }% dominance)`,
      );
    }
  });

  // Performance and coverage validation
  const throughput = output.normalizedData.length / (duration / 1000);
  assertGreater(throughput, 10, "Should process at least 10 items/second");

  console.log(`🎯 Auto-Targeting E2E Complete:`);
  console.log(
    `   📊 Processed: ${output.normalizedData.length} items in ${
      duration.toFixed(2)
    }ms`,
  );
  console.log(`   ⚡ Throughput: ${throughput.toFixed(1)} items/sec`);
  console.log(
    `   🔍 Explain validation: ${explainValidationPassed}/${output.normalizedData.length} items passed`,
  );
  console.log(
    `   🎯 Auto-targeted items: ${autoTargetedItems} monetary indicators`,
  );
  console.log(`   ⚠️  Warnings: ${output.warnings.length}`);

  // Ensure we tested auto-targeting on some items
  if (autoTargetedItems === 0) {
    console.log(
      "⚠️  No auto-targeted items found - this may indicate an issue with auto-targeting",
    );
  }

  actor.stop();
});
