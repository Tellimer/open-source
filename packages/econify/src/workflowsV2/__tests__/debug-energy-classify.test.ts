import { assertEquals, assertExists } from "jsr:@std/assert";
import { createActor } from "npm:xstate@^5.20.2";
import { classifyMachine } from "../classify/classify.machine.ts";
import { databaseRealDataSet } from "../__fixtures__/database-real-data.ts";

Deno.test("Debug - Test Energy Classification", async () => {
  const energyData = databaseRealDataSet.filter((item) =>
    item.expected_domain === "energy"
  );

  // Remove expected_domain field from test data
  const cleanData = energyData.map((item) => {
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

  console.log("Energy bucket:", result.buckets.energy);
  console.log("\nAll buckets with items:");
  for (const [bucket, items] of Object.entries(result.buckets)) {
    if ((items as any[]).length > 0) {
      console.log(`${bucket}: ${(items as any[]).map((i) => i.id).join(", ")}`);
    }
  }

  actor.stop();
});
