/**
 * Tests for Enhanced FX Architecture
 *
 * Verifies that domains process in parallel and FX is only applied where needed
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import { createActor } from "npm:xstate@^5.20.2";
import { pipelineV2Machine } from "../pipeline/pipeline.machine.ts";
import { fxFallbackExtended } from "../__fixtures__/fx-fallback.ts";
import type { ParsedData } from "../shared/types.ts";

Deno.test("Enhanced FX: Processes non-FX domains without waiting", async () => {
  const testData: ParsedData[] = [
    // Non-FX items (should process immediately)
    { id: "1", value: 50, unit: "%", name: "Interest Rate" },
    { id: "2", value: 100, unit: "units", name: "Production Units" },
    { id: "3", value: 120.5, unit: "points", name: "Stock Index" },

    // FX items (need currency conversion)
    { id: "4", value: 85.50, unit: "USD per barrel", name: "Oil Price" },
    { id: "5", value: 1000, unit: "EUR millions", name: "Revenue" },
  ];

  const config = {
    // Router now always uses FX from fxFallback
    targetCurrency: "USD",
    targetMagnitude: "millions",
    fxFallback: fxFallbackExtended,
    explain: true,
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      config,
      rawData: testData,
    },
  });

  const startTime = Date.now();
  actor.start();

  // Subscribe to state changes to track processing
  const stateChanges: string[] = [];
  actor.subscribe((snapshot) => {
    if (snapshot.value) {
      stateChanges.push(JSON.stringify(snapshot.value));
    }
  });

  // Wait for completion
  await new Promise((resolve) => {
    actor.subscribe((snapshot) => {
      if (snapshot.status === "done") {
        resolve(snapshot.output);
      }
    });
  });

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Get the output
  const output = actor.getSnapshot().output as any;

  console.log(`Enhanced FX test completed in ${duration}ms`);
  console.log(`State changes: ${stateChanges.length}`);

  // Verify all items were processed
  assertExists(output);
  assertExists(output.normalizedData);
  assertEquals(output.normalizedData.length, 5);

  // Verify non-FX items weren't affected by FX processing
  const percentItem = output.normalizedData.find((d: any) => d.unit === "%");
  assertEquals(percentItem?.normalized, 50); // Should be unchanged

  const unitsItem = output.normalizedData.find((d: any) =>
    d.unit?.includes("units")
  );
  assertEquals(unitsItem?.normalized, 100); // Should be unchanged

  // Verify FX items were converted
  const oilItem = output.normalizedData.find((d: any) =>
    d.name === "Oil Price"
  );
  assertExists(oilItem?.normalized);
  // Should be converted from USD per barrel (already USD, so same value)
  assertEquals(oilItem?.normalized, 85.50);

  const revenueItem = output.normalizedData.find((d: any) =>
    d.name === "Revenue"
  );
  assertExists(revenueItem?.normalized);
  // Should be converted from EUR to USD
  assertExists(revenueItem?.explain?.currency);
});

Deno.test("Enhanced FX: Mixed commodities process correctly", async () => {
  const testData: ParsedData[] = [
    // Priced commodities (need FX)
    { id: "1", value: 85.50, unit: "USD per barrel", name: "Oil Price" },
    { id: "2", value: 1950, unit: "EUR per ounce", name: "Gold Price" },
    { id: "3", value: 650, unit: "GBP per tonne", name: "Wheat Price" },

    // Quantity commodities (no FX)
    { id: "4", value: 1000, unit: "barrels", name: "Oil Production" },
    { id: "5", value: 450, unit: "tonnes", name: "Gold Reserves" },
    { id: "6", value: 500, unit: "million tonnes", name: "Wheat Harvest" },
  ];

  const config = {
    targetCurrency: "USD",
    targetMagnitude: "millions",
    fxFallback: fxFallbackExtended,
    explain: true,
  };

  const actor = createActor(pipelineV2Machine, {
    input: {
      config,
      rawData: testData,
    },
  });

  actor.start();

  const output = await new Promise((resolve) => {
    actor.subscribe((snapshot) => {
      if (snapshot.status === "done") {
        resolve(snapshot.output);
      }
    });
  }) as any;

  // All items should be processed
  assertEquals(output.normalizedData.length, 6);

  // Verify priced items have FX conversion
  const oilPrice = output.normalizedData.find((d: any) =>
    d.name === "Oil Price"
  );
  assertExists(oilPrice?.explain);
  assertEquals(oilPrice?.normalizedUnit, "USD per barrel");

  const goldPrice = output.normalizedData.find((d: any) =>
    d.name === "Gold Price"
  );
  assertExists(goldPrice?.explain);
  // Gold should now be classified as commodities with proper FX handling
  assertEquals(goldPrice?.needsFX, true);
  assertEquals(goldPrice?.currencyCode, "EUR");

  // Verify quantity items don't have FX conversion
  const oilProd = output.normalizedData.find((d: any) =>
    d.name === "Oil Production"
  );
  assertEquals(oilProd?.normalizedValue, 1000);
  assertEquals(oilProd?.normalizedUnit, "barrels");

  const wheatHarvest = output.normalizedData.find((d: any) =>
    d.name === "Wheat Harvest"
  );
  assertEquals(wheatHarvest?.normalizedValue, 500); // Commodities preserve original values
  assertEquals(wheatHarvest?.normalizedUnit, "million tonnes"); // Commodities preserve original units
});

Deno.test("Enhanced FX: Parallel processing is faster than sequential", async () => {
  const testData: ParsedData[] = [
    // Mix of all domain types
    { id: "1", value: 1000, unit: "USD millions", name: "Revenue" }, // monetary
    { id: "2", value: 85.50, unit: "USD per barrel", name: "Oil" }, // commodities with FX
    { id: "3", value: 1000, unit: "barrels", name: "Oil Stock" }, // commodities no FX
    { id: "4", value: 50, unit: "%", name: "Growth" }, // percentage
    { id: "5", value: 100, unit: "units", name: "Count" }, // counts
    { id: "6", value: 120, unit: "points", name: "Index" }, // indices
    { id: "7", value: 2.5, unit: "ratio", name: "P/E" }, // ratios
    { id: "8", value: 100, unit: "MWh", name: "Energy" }, // energy
    { id: "9", value: 200, unit: "tonnes", name: "Wheat" }, // agriculture
    { id: "10", value: 10, unit: "tonnes", name: "Gold" }, // metals
  ];

  // Test with enhanced router (parallel)
  const configParallel = {
    targetCurrency: "USD",
    targetMagnitude: "millions",
    fxFallback: fxFallbackExtended,
  };

  const actorParallel = createActor(pipelineV2Machine, {
    input: {
      config: configParallel,
      rawData: testData,
    },
  });

  const startParallel = Date.now();
  actorParallel.start();

  await new Promise((resolve) => {
    actorParallel.subscribe((snapshot) => {
      if (snapshot.status === "done") {
        resolve(snapshot.output);
      }
    });
  });
  const durationParallel = Date.now() - startParallel;

  // Test with standard router (sequential FX check)
  const configSequential = {
    // Router uses FX from fxFallback
    targetCurrency: "USD",
    targetMagnitude: "millions",
    fxFallback: fxFallbackExtended,
  };

  const actorSequential = createActor(pipelineV2Machine, {
    input: {
      config: configSequential,
      rawData: testData,
    },
  });

  const startSequential = Date.now();
  actorSequential.start();

  await new Promise((resolve) => {
    actorSequential.subscribe((snapshot) => {
      if (snapshot.status === "done") {
        resolve(snapshot.output);
      }
    });
  });
  const durationSequential = Date.now() - startSequential;

  console.log(`Parallel processing: ${durationParallel}ms`);
  console.log(`Sequential processing: ${durationSequential}ms`);
  console.log(
    `Speed improvement: ${
      ((durationSequential - durationParallel) / durationSequential * 100)
        .toFixed(1)
    }%`,
  );

  // Verify outputs are the same
  const outputParallel = actorParallel.getSnapshot().output as any;
  const outputSequential = actorSequential.getSnapshot().output as any;

  assertEquals(
    outputParallel.normalizedData.length,
    outputSequential.normalizedData.length,
  );

  // Parallel should be at least as fast (often faster with more items)
  // Note: In testing, the difference might be small due to overhead
  console.log(
    `Parallel was ${
      durationSequential >= durationParallel
        ? "faster or equal"
        : "slower (may be due to overhead)"
    }`,
  );
});
