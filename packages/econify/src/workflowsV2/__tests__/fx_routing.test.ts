import { assertEquals, assertExists } from "jsr:@std/assert";
import { createActor } from "npm:xstate@^5.20.2";
import { normalizeRouterMachine } from "../normalize/normalize_router.machine.ts";
import type { V2Buckets } from "../shared/types.ts";
import type { ParsedData } from "../shared/types.ts";

Deno.test("FX Routing - Pure Monetary Data (should fetch FX)", async () => {
  const monetaryBuckets: V2Buckets = {
    monetaryStock: [
      { value: 25000, unit: "USD billions", name: "GDP" },
      { value: 15000, unit: "EUR billions", name: "GDP" },
    ],
    monetaryFlow: [
      { value: 5000, unit: "USD per month", name: "Salary" },
    ],
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

  const actor = createActor(normalizeRouterMachine, {
    input: {
      config,
      buckets: monetaryBuckets,
      exempted: [],
      nonExempted: [],
    },
  });

  actor.start();

  // Wait for completion and get final state
  const finalState = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Router timeout"));
    }, 10000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Router error: ${state.error}`));
      }
    });
  });

  // Verify FX data was fetched (check context for FX rates)
  const finalStateAny = finalState as any;
  assertExists(
    finalStateAny.context.fxRates,
    "FX rates should be present in context for monetary data",
  );
  assertExists(
    finalStateAny.context.fxSource,
    "FX source should be present in context for monetary data",
  );

  // Verify the result structure
  assertEquals(typeof finalStateAny.output, "object");
  assertEquals(Array.isArray(finalStateAny.output.items), true);

  console.log(
    `✅ FX routing: executed FX for ${
      monetaryBuckets.monetaryStock.length + monetaryBuckets.monetaryFlow.length
    } monetary items`,
  );

  actor.stop();
});

Deno.test("FX Routing - Pure Non-Monetary Data (should skip FX)", async () => {
  const nonMonetaryBuckets: V2Buckets = {
    monetaryStock: [],
    monetaryFlow: [],
    counts: [
      { value: 1000000, unit: "people", name: "Population" },
    ],
    percentages: [
      { value: 3.5, unit: "%", name: "Inflation" },
    ],
    indices: [
      { value: 105.2, unit: "points", name: "CPI" },
    ],
    energy: [
      { value: 1250, unit: "GWh", name: "Energy Production" },
    ],
    commodities: [
      { value: 1000, unit: "barrels", name: "Oil Production" },
    ],
    agriculture: [
      { value: 250, unit: "tonnes", name: "Wheat Production" },
    ],
    ratios: [],
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

  const actor = createActor(normalizeRouterMachine, {
    input: {
      config,
      buckets: nonMonetaryBuckets,
      exempted: [],
      nonExempted: [],
    },
  });

  actor.start();

  // Wait for completion and get final state
  const finalState = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Router timeout"));
    }, 10000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Router error: ${state.error}`));
      }
    });
  });

  // Verify FX data was NOT fetched (check context for absence of FX rates)
  const finalStateAny = finalState as any;
  assertEquals(
    finalStateAny.context.fxRates,
    undefined,
    "FX rates should NOT be present for non-monetary data",
  );
  assertEquals(
    finalStateAny.context.fxSource,
    undefined,
    "FX source should NOT be present for non-monetary data",
  );

  // Verify the result structure
  assertEquals(typeof finalStateAny.output, "object");
  assertEquals(Array.isArray(finalStateAny.output.items), true);

  const totalItems = nonMonetaryBuckets.counts.length +
    nonMonetaryBuckets.percentages.length +
    nonMonetaryBuckets.indices.length + nonMonetaryBuckets.energy.length +
    nonMonetaryBuckets.commodities.length +
    nonMonetaryBuckets.agriculture.length;

  console.log(`✅ FX routing: skipped FX for ${totalItems} non-monetary items`);

  actor.stop();
});

Deno.test("FX Routing - Mixed with Commodity Prices (should fetch FX)", async () => {
  const mixedWithPricesBuckets: V2Buckets = {
    monetaryStock: [],
    monetaryFlow: [],
    commodities: [
      {
        value: 85.50,
        unit: "USD per barrel",
        name: "Oil Price",
        needsFX: true,
        currency_code: "USD",
      },
      { value: 1000, unit: "barrels", name: "Oil Production", needsFX: false },
    ],
    agriculture: [
      {
        value: 7.50,
        unit: "USD per bushel",
        name: "Wheat Price",
        needsFX: true,
        currency_code: "USD",
      },
      { value: 250, unit: "tonnes", name: "Wheat Production", needsFX: false },
    ],
    metals: [
      {
        value: 8500,
        unit: "USD per tonne",
        name: "Copper Price",
        needsFX: true,
        currency_code: "USD",
      },
    ],
    counts: [],
    percentages: [],
    indices: [],
    ratios: [],
    energy: [],
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

  const actor = createActor(normalizeRouterMachine, {
    input: {
      config,
      buckets: mixedWithPricesBuckets,
      exempted: [],
      nonExempted: [],
    },
  });

  actor.start();

  // Wait for completion and get final state
  const finalState = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Router timeout"));
    }, 10000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Router error: ${state.error}`));
      }
    });
  });

  // Verify FX data was fetched for price data
  const finalStateAny = finalState as any;
  assertExists(
    finalStateAny.context.fxRates,
    "FX rates should be present for commodity/agriculture prices",
  );
  assertExists(
    finalStateAny.context.fxSource,
    "FX source should be present for commodity/agriculture prices",
  );

  // Verify the result structure
  assertEquals(typeof finalStateAny.output, "object");
  assertEquals(Array.isArray(finalStateAny.output.items), true);

  console.log(`✅ FX routing: executed FX for commodity/agriculture prices`);

  actor.stop();
});

Deno.test("FX Routing - Commodity Volumes Only (should skip FX)", async () => {
  const volumeOnlyBuckets: V2Buckets = {
    monetaryStock: [],
    monetaryFlow: [],
    commodities: [
      { value: 1000, unit: "barrels", name: "Oil Production" },
      { value: 500, unit: "tonnes", name: "Coal Production" },
    ],
    agriculture: [
      { value: 250, unit: "tonnes", name: "Wheat Production" },
      { value: 100, unit: "hectares", name: "Farmland Area" },
    ],
    metals: [
      { value: 50, unit: "tonnes", name: "Copper Production" },
    ],
    energy: [
      { value: 1250, unit: "GWh", name: "Energy Production" },
    ],
    counts: [],
    percentages: [],
    indices: [],
    ratios: [],
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

  const actor = createActor(normalizeRouterMachine, {
    input: {
      config,
      buckets: volumeOnlyBuckets,
      exempted: [],
      nonExempted: [],
    },
  });

  actor.start();

  // Wait for completion and get final state
  const finalState = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Router timeout"));
    }, 10000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Router error: ${state.error}`));
      }
    });
  });

  // Verify FX data was NOT fetched for volume data
  const finalStateAny = finalState as any;
  assertEquals(
    finalStateAny.context.fxRates,
    undefined,
    "FX rates should NOT be present for volume-only data",
  );
  assertEquals(
    finalStateAny.context.fxSource,
    undefined,
    "FX source should NOT be present for volume-only data",
  );

  // Verify the result structure
  assertEquals(typeof finalStateAny.output, "object");
  assertEquals(Array.isArray(finalStateAny.output.items), true);

  const totalItems = volumeOnlyBuckets.commodities.length +
    volumeOnlyBuckets.agriculture.length +
    volumeOnlyBuckets.metals.length + volumeOnlyBuckets.energy.length;

  console.log(`✅ FX routing: skipped FX for ${totalItems} volume-only items`);

  actor.stop();
});

Deno.test("FX Routing - Mixed Monetary and Non-Monetary (should fetch FX)", async () => {
  const mixedBuckets: V2Buckets = {
    monetaryStock: [
      { value: 25000, unit: "USD billions", name: "GDP" },
    ],
    monetaryFlow: [],
    counts: [
      { value: 1000000, unit: "people", name: "Population" },
    ],
    percentages: [
      { value: 3.5, unit: "%", name: "Inflation" },
    ],
    commodities: [
      { value: 1000, unit: "barrels", name: "Oil Production" }, // Volume, not price
    ],
    agriculture: [
      { value: 250, unit: "tonnes", name: "Wheat Production" }, // Volume, not price
    ],
    indices: [],
    ratios: [],
    energy: [],
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

  const actor = createActor(normalizeRouterMachine, {
    input: {
      config,
      buckets: mixedBuckets,
      exempted: [],
      nonExempted: [],
    },
  });

  actor.start();

  // Wait for completion and get final state
  const finalState = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Router timeout"));
    }, 10000);

    actor.subscribe((state) => {
      if (state.status === "done") {
        clearTimeout(timeout);
        resolve(state);
      } else if (state.status === "error") {
        clearTimeout(timeout);
        reject(new Error(`Router error: ${state.error}`));
      }
    });
  });

  // Verify FX data was fetched due to monetary data presence
  const finalStateAny = finalState as any;
  assertExists(
    finalStateAny.context.fxRates,
    "FX rates should be present for mixed data with monetary components",
  );
  assertExists(
    finalStateAny.context.fxSource,
    "FX source should be present for mixed data with monetary components",
  );

  // Verify the result structure
  assertEquals(typeof finalStateAny.output, "object");
  assertEquals(Array.isArray(finalStateAny.output.items), true);

  const totalItems = mixedBuckets.monetaryStock.length +
    mixedBuckets.counts.length +
    mixedBuckets.percentages.length + mixedBuckets.commodities.length +
    mixedBuckets.agriculture.length;

  console.log(
    `✅ FX routing: executed FX for mixed data with ${totalItems} total items (${mixedBuckets.monetaryStock.length} monetary)`,
  );

  actor.stop();
});
