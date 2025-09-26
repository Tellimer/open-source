import { assertEquals } from "jsr:@std/assert@1";
import { createActor } from "npm:xstate@^5.20.2";
import { pipelineV2Machine } from "../pipeline/pipeline.machine.ts";
import type { ParsedData } from "../shared/types.ts";

Deno.test("V2 complete pipeline - validation → parsing → quality → fx → classify → normalize", async () => {
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
    targetMagnitude: "billions" as const,
    targetTimeScale: "month" as const,
    minQualityScore: 60,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.85, USD: 1.0 },
      date: "2024-01-01",
    },
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      config,
      rawData: testData,
    },
  });

  actor.start();

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

  // Verify the result structure
  const output = result as any;
  assertEquals(typeof output, "object");
  assertEquals(Array.isArray(output.normalizedData), true);
  assertEquals(Array.isArray(output.warnings), true);

  console.log(
    `✅ V2 pipeline processed ${output.normalizedData.length} items with ${output.warnings.length} warnings`,
  );

  actor.stop();
});

Deno.test("V2 pipeline - validation error handling", async () => {
  const actor = createActor(pipelineV2Machine, {
    input: {
      config: {
        validateSchema: true,
        requiredFields: ["value", "unit", "name"],
      },
      rawData: [
        { value: 100, unit: "USD" }, // Missing "name" field which is required
      ],
    },
  });

  actor.start();

  // Should fail validation
  const result = await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve("timeout");
    }, 5000);

    actor.subscribe((state) => {
      if (state.status === "error" || state.value === "error") {
        clearTimeout(timeout);
        resolve("error");
      } else if (state.status === "done") {
        clearTimeout(timeout);
        resolve("done");
      }
    });
  });

  assertEquals(result, "error");
  console.log("✅ V2 pipeline correctly handles validation errors");

  actor.stop();
});
