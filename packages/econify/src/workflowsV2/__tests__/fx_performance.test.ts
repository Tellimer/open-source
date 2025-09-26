import { assertEquals, assertLess } from "jsr:@std/assert";
import { createActor } from "npm:xstate@^5.20.2";
import { normalizeRouterMachine } from "../normalize/normalize_router.machine.ts";
import type { V2Buckets } from "../shared/types.ts";

/**
 * Performance validation for FX routing optimization
 *
 * This test validates that the new FX routing architecture improves performance
 * by skipping FX fetching for datasets that don't need currency conversion.
 */

Deno.test("FX Performance - Non-Monetary Data Skips FX (Performance Improvement)", async () => {
  // Create a large dataset with only non-monetary data
  const largeNonMonetaryBuckets: V2Buckets = {
    monetaryStock: [],
    monetaryFlow: [],
    counts: Array.from({ length: 50 }, (_, i) => ({
      value: 1000000 + i,
      unit: "people",
      name: `Population ${i}`,
    })),
    percentages: Array.from({ length: 50 }, (_, i) => ({
      value: 3.5 + i * 0.1,
      unit: "%",
      name: `Rate ${i}`,
    })),
    indices: Array.from({ length: 50 }, (_, i) => ({
      value: 100 + i,
      unit: "points",
      name: `Index ${i}`,
    })),
    energy: Array.from({ length: 50 }, (_, i) => ({
      value: 1000 + i * 10,
      unit: "GWh",
      name: `Energy ${i}`,
    })),
    commodities: Array.from({ length: 50 }, (_, i) => ({
      value: 1000 + i * 10,
      unit: "barrels",
      name: `Oil Production ${i}`,
    })),
    ratios: [],
    agriculture: [],
    metals: [],
    crypto: [],
  };

  const config = {
    targetCurrency: "EUR",
    targetMagnitude: "millions" as const,
    targetTimeScale: "month" as const,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.85, USD: 1.0 },
      date: "2024-01-01",
    },
  };

  const startTime = performance.now();

  const actor = createActor(normalizeRouterMachine, {
    input: {
      config,
      buckets: largeNonMonetaryBuckets,
      exempted: [],
      nonExempted: [],
    },
  });

  actor.start();

  // Wait for completion
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Router timeout"));
    }, 10000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve({
          output: state.output,
          context: state.context,
          duration: performance.now() - startTime,
        });
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Router error: ${state.error}`));
      }
    });
  });

  const { output, context, duration } = result as any;

  // Verify FX was skipped
  assertEquals(
    context.fxRates,
    undefined,
    "FX rates should be skipped for non-monetary data",
  );
  assertEquals(
    context.fxSource,
    undefined,
    "FX source should be skipped for non-monetary data",
  );

  // Verify processing completed successfully
  assertEquals(typeof output, "object");
  assertEquals(Array.isArray(output.data), true);

  // Performance assertion: should complete quickly without FX overhead
  assertLess(
    duration,
    1000,
    "Non-monetary processing should complete in under 1 second",
  );

  const totalItems = largeNonMonetaryBuckets.counts.length +
    largeNonMonetaryBuckets.percentages.length +
    largeNonMonetaryBuckets.indices.length +
    largeNonMonetaryBuckets.energy.length +
    largeNonMonetaryBuckets.commodities.length;

  console.log(
    `✅ Performance: Processed ${totalItems} non-monetary items in ${
      duration.toFixed(2)
    }ms (FX skipped)`,
  );

  actor.stop();
});

Deno.test("FX Performance - Monetary Data Includes FX (Expected Overhead)", async () => {
  // Create a dataset with monetary data that requires FX
  const monetaryBuckets: V2Buckets = {
    monetaryStock: Array.from({ length: 20 }, (_, i) => ({
      value: 25000 + i * 1000,
      unit: "USD billions",
      name: `GDP ${i}`,
    })),
    monetaryFlow: Array.from({ length: 20 }, (_, i) => ({
      value: 5000 + i * 100,
      unit: "EUR per month",
      name: `Salary ${i}`,
    })),
    counts: [],
    percentages: [],
    indices: [],
    ratios: [],
    energy: [],
    commodities: [],
    agriculture: [],
    metals: [],
    crypto: [],
  };

  const config = {
    targetCurrency: "EUR",
    targetMagnitude: "millions" as const,
    targetTimeScale: "month" as const,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.85, USD: 1.0 },
      date: "2024-01-01",
    },
  };

  const startTime = performance.now();

  const actor = createActor(normalizeRouterMachine, {
    input: {
      config,
      buckets: monetaryBuckets,
      exempted: [],
      nonExempted: [],
    },
  });

  actor.start();

  // Wait for completion
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Router timeout"));
    }, 10000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve({
          output: state.output,
          context: state.context,
          duration: performance.now() - startTime,
        });
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Router error: ${state.error}`));
      }
    });
  });

  const { output, context, duration } = result as any;

  // Verify FX was fetched
  assertEquals(
    typeof context.fxRates,
    "object",
    "FX rates should be present for monetary data",
  );
  assertEquals(
    typeof context.fxSource,
    "string",
    "FX source should be present for monetary data",
  );

  // Verify processing completed successfully
  assertEquals(typeof output, "object");
  assertEquals(Array.isArray(output.data), true);

  const totalItems = monetaryBuckets.monetaryStock.length +
    monetaryBuckets.monetaryFlow.length;

  console.log(
    `✅ Performance: Processed ${totalItems} monetary items in ${
      duration.toFixed(2)
    }ms (FX included)`,
  );

  actor.stop();
});

Deno.test("FX Performance - Commodity Prices vs Volumes (Selective FX)", async () => {
  // Test that commodity prices trigger FX but volumes don't
  const pricesBuckets: V2Buckets = {
    monetaryStock: [],
    monetaryFlow: [],
    commodities: [
      { value: 85.50, unit: "USD per barrel", name: "Oil Price" },
      { value: 1950, unit: "USD per ounce", name: "Gold Price" },
    ],
    agriculture: [
      { value: 7.50, unit: "USD per bushel", name: "Wheat Price" },
    ],
    counts: [],
    percentages: [],
    indices: [],
    ratios: [],
    energy: [],
    metals: [],
    crypto: [],
  };

  const volumesBuckets: V2Buckets = {
    monetaryStock: [],
    monetaryFlow: [],
    commodities: [
      { value: 1000, unit: "barrels", name: "Oil Production" },
      { value: 50, unit: "ounces", name: "Gold Production" },
    ],
    agriculture: [
      { value: 250, unit: "bushels", name: "Wheat Production" },
    ],
    counts: [],
    percentages: [],
    indices: [],
    ratios: [],
    energy: [],
    metals: [],
    crypto: [],
  };

  const config = {
    targetCurrency: "EUR",
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.85, USD: 1.0 },
      date: "2024-01-01",
    },
  };

  // Test prices (should fetch FX)
  const pricesActor = createActor(normalizeRouterMachine, {
    input: { config, buckets: pricesBuckets, exempted: [], nonExempted: [] },
  });

  pricesActor.start();
  const pricesResult = await new Promise((resolve) => {
    pricesActor.subscribe((state) => {
      if (state.status === "done") {
        resolve({ context: state.context });
      }
    });
  });

  // Test volumes (should skip FX)
  const volumesActor = createActor(normalizeRouterMachine, {
    input: { config, buckets: volumesBuckets, exempted: [], nonExempted: [] },
  });

  volumesActor.start();
  const volumesResult = await new Promise((resolve) => {
    volumesActor.subscribe((state) => {
      if (state.status === "done") {
        resolve({ context: state.context });
      }
    });
  });

  // Verify selective FX behavior
  const pricesContext = (pricesResult as any).context;
  const volumesContext = (volumesResult as any).context;

  assertEquals(
    typeof pricesContext.fxRates,
    "object",
    "Commodity prices should trigger FX fetch",
  );
  assertEquals(
    volumesContext.fxRates,
    undefined,
    "Commodity volumes should skip FX fetch",
  );

  console.log(
    `✅ Performance: Selective FX - prices fetch FX, volumes skip FX`,
  );

  pricesActor.stop();
  volumesActor.stop();
});
