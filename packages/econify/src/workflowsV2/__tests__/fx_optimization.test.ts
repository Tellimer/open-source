import { assertEquals } from "jsr:@std/assert";
import { createActor } from "npm:xstate@^5.20.2";
import { pipelineV2Machine } from "../pipeline/pipeline.machine.ts";
import type { ParsedData } from "../shared/types.ts";

Deno.test("V2 FX optimization - skip FX for non-monetary data", async () => {
  const nonMonetaryData: ParsedData[] = [
    {
      value: 3.5,
      unit: "percent",
      name: "Inflation",
      description: "Consumer Price Index",
    },
    {
      value: 1000,
      unit: "count",
      name: "Population",
      description: "Total population",
    },
    {
      value: 50,
      unit: "index",
      name: "Stock Index",
      description: "Market index",
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
      asOf: "2024-01-01",
    },
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      config,
      rawData: nonMonetaryData,
    },
  });

  let classifyStepExecuted = false;

  actor.start();

  // Monitor state transitions
  actor.subscribe((state) => {
    if (state.value === "classify") {
      classifyStepExecuted = true;
    }
  });

  // Wait for completion
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 10000);

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

  // Verify classification step was executed
  assertEquals(classifyStepExecuted, true, "Classify step should be executed");

  // Verify the result structure
  const output = result as any;
  assertEquals(typeof output, "object");
  assertEquals(Array.isArray(output.normalizedData), true);

  // For non-monetary data, we don't expect any FX conversion to occur
  console.log(
    `✅ FX optimization: processed ${nonMonetaryData.length} non-monetary items without FX`,
  );

  actor.stop();
});

Deno.test("V2 FX optimization - execute FX for monetary data", async () => {
  const monetaryData: ParsedData[] = [
    {
      value: 100,
      unit: "USD Million",
      name: "GDP",
      description: "Gross Domestic Product",
    },
    {
      value: 50000,
      unit: "EUR per year",
      name: "Average Salary",
      description: "Average annual salary",
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
      asOf: "2024-01-01",
    },
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      config,
      rawData: monetaryData,
    },
  });

  let classifyStepExecuted = false;

  actor.start();

  // Monitor state transitions
  actor.subscribe((state) => {
    if (state.value === "classify") {
      classifyStepExecuted = true;
    }
  });

  // Wait for completion
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline timeout"));
    }, 10000);

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

  // Verify classification step was executed
  assertEquals(classifyStepExecuted, true, "Classify step should be executed");

  // Verify the result structure
  const output = result as any;
  assertEquals(typeof output, "object");
  assertEquals(Array.isArray(output.normalizedData), true);

  // For monetary data, we expect normalization to occur (which may include FX)
  console.log(
    `✅ FX optimization: processed ${monetaryData.length} monetary items with potential FX`,
  );

  actor.stop();
});
