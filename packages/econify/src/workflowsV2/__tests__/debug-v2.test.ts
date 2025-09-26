import { createActor } from "npm:xstate@^5.20.2";
import { pipelineV2Machine } from "../pipeline/pipeline.machine.ts";
import type { ParsedData } from "../shared/types.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";

Deno.test("Debug V2 Pipeline", async () => {
  const testData: ParsedData[] = [
    {
      value: 100,
      unit: "USD Million",
      name: "GDP",
    },
  ];

  const actor = createActor(pipelineV2Machine, {
    input: {
      rawData: testData,
      config: {
        targetCurrency: "USD",
        targetMagnitude: "millions",
        fxFallback: {
          base: "USD",
          rates: { USD: 1.0, EUR: 0.85 },
        },
      },
    },
  });

  actor.start();

  // Subscribe to see state changes
  actor.subscribe((snapshot) => {
    console.log("State:", snapshot.value);
    if (snapshot.status === "done") {
      console.log("Output:", JSON.stringify(snapshot.output, null, 2));
    }
  });

  // Wait for completion
  const result = await new Promise((resolve) => {
    actor.subscribe((snapshot) => {
      if (snapshot.status === "done") {
        resolve(snapshot.output);
      }
    });
  });

  console.log("Final result:", result);

  assertExists(result);
  assertExists((result as any).data);
  assertEquals((result as any).data.length, 1);
});
