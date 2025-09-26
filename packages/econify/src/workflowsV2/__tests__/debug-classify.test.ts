import { assertEquals, assertExists } from "jsr:@std/assert";
import { createActor } from "npm:xstate@^5.20.2";
import { classifyMachine } from "../classify/classify.machine.ts";
import { databaseRealDataSet } from "../__fixtures__/database-real-data.ts";

Deno.test("Debug - Test Classification Directly", async () => {
  const commodityData = databaseRealDataSet.filter((item) =>
    item.expected_domain === "commodities"
  );

  // Remove expected_domain field from test data
  const cleanData = commodityData.map((item) => {
    const { expected_domain, ...rest } = item as any;
    return rest;
  });

  const actor = createActor(classifyMachine, {
    input: {
      config: {},
      parsedData: cleanData,
    },
  });

  actor.start();

  const result = await new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout")), 5000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state.output);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Classify error: ${state.error}`));
      }
    });
  });

  console.log("Classification result:", JSON.stringify(result, null, 2));

  assertExists(result.buckets);
  assertExists(result.nonExempted);
  assertExists(result.exempted);

  console.log("Buckets:", Object.keys(result.buckets));
  console.log("Commodities bucket:", result.buckets.commodities);

  assertEquals(result.nonExempted.length, cleanData.length);

  actor.stop();
});
