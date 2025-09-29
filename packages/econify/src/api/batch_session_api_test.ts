import { assertEquals, assertExists } from "jsr:@std/assert@1";
import {
  EconifyBatchSession,
  processEconomicDataByIndicator,
} from "./batch_session_api.ts";
import type { ParsedData } from "../workflows/economic-data-workflow.ts";

Deno.test("EconifyBatchSession - accumulates and processes data points", async () => {
  const session = new EconifyBatchSession({
    targetCurrency: "USD",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    minMajorityShare: 0.6,
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92, GBP: 0.79 },
    },
  });

  // Add Balance of Trade data for different countries
  session.addDataPoint({
    id: "bot_usa",
    name: "Balance of Trade",
    value: 100,
    unit: "USD million/month",
    metadata: { country: "USA" },
  });

  session.addDataPoint({
    id: "bot_uk",
    name: "Balance of Trade",
    value: 50,
    unit: "GBP million/month",
    metadata: { country: "UK" },
  });

  session.addDataPoint({
    id: "bot_germany",
    name: "Balance of Trade",
    value: 200,
    unit: "EUR million/quarter",
    metadata: { country: "Germany" },
  });

  // Check batch size
  assertEquals(session.size(), 3);

  // Preview auto-targets
  const targets = session.previewAutoTargets();
  assertEquals(targets.size, 1); // Should have one indicator group
  const botTarget = targets.get("balance of trade");
  assertExists(botTarget);
  assertEquals(botTarget.time, "month"); // 2 monthly vs 1 quarterly

  // Process the batch
  const result = await session.process();
  assertEquals(result.data.length, 3);

  // All should be normalized to the same time scale (month)
  const normalizedUnits = result.data.map((d) => d.normalizedUnit);
  for (const unit of normalizedUnits) {
    assertExists(
      unit?.toLowerCase().includes("month") ||
        unit?.toLowerCase().includes("/mo"),
    );
  }

  // Session should be cleared after processing
  assertEquals(session.size(), 0);
});

Deno.test("processEconomicDataByIndicator - groups and processes indicators separately", async () => {
  const data: ParsedData[] = [
    // Balance of Trade items
    {
      id: "bot_1",
      name: "Balance of Trade",
      value: 100,
      unit: "USD million/month",
    },
    {
      id: "bot_2",
      name: "balance of trade", // Different case
      value: 200,
      unit: "USD million/quarter",
    },
    {
      id: "bot_3",
      name: "Balance of Trade ", // Trailing space
      value: 150,
      unit: "USD million/month",
    },
    // GDP items
    {
      id: "gdp_1",
      name: "GDP",
      value: 1000,
      unit: "USD billion/quarter",
    },
    {
      id: "gdp_2",
      name: "gdp", // Different case
      value: 1100,
      unit: "USD billion/year",
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    targetCurrency: "USD",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    minMajorityShare: 0.6,
    tieBreakers: {
      time: "prefer-month",
      magnitude: "prefer-millions",
    },
    fxFallback: {
      base: "USD",
      rates: {},
    },
  });

  assertEquals(result.data.length, 5);

  // Check that Balance of Trade items are normalized to month (2/3 majority)
  const botItems = result.data.filter((d) =>
    d.name?.toLowerCase().trim() === "balance of trade"
  );
  assertEquals(botItems.length, 3);

  // GDP items should be normalized based on their distribution
  const gdpItems = result.data.filter((d) =>
    d.name?.toLowerCase().trim() === "gdp"
  );
  assertEquals(gdpItems.length, 2);
});

Deno.test("EconifyBatchSession - warns about mixed indicators", () => {
  const session = new EconifyBatchSession({
    autoTargetByIndicator: true,
  });

  // Track console warnings
  const originalWarn = console.warn;
  let warning = "";
  console.warn = (msg: string) => {
    warning = msg;
  };

  session.addDataPoint({
    id: "1",
    name: "Balance of Trade",
    value: 100,
    unit: "USD million",
  });

  session.addDataPoint({
    id: "2",
    name: "GDP", // Different indicator!
    value: 1000,
    unit: "USD billion",
  });

  // Should have warned about mixed indicators
  assertExists(warning.includes("Mixed indicators"));

  // Restore console.warn
  console.warn = originalWarn;
});

Deno.test("EconifyBatchSession - handles empty batch", async () => {
  const session = new EconifyBatchSession({});

  assertEquals(session.size(), 0);

  try {
    await session.process();
    throw new Error("Should have thrown");
  } catch (error) {
    assertEquals((error as Error).message, "No data points to process");
  }
});

Deno.test("EconifyBatchSession - clear() removes all data", () => {
  const session = new EconifyBatchSession({});

  session.addDataPoints([
    { id: "1", value: 100, unit: "USD" },
    { id: "2", value: 200, unit: "EUR" },
  ]);

  assertEquals(session.size(), 2);

  session.clear();

  assertEquals(session.size(), 0);
});

Deno.test("processEconomicDataByIndicator - shares stripped from items and available at group level", async () => {
  const data: ParsedData[] = [
    { id: "AUS", value: 11027, unit: "USD Million", name: "Balance of Trade" },
    { id: "AUT", value: 365.1, unit: "EUR Million", name: "Balance of Trade" },
    {
      id: "AZE",
      value: 2445459.7,
      unit: "USD Thousand per quarter",
      name: "Balance of Trade",
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["currency", "magnitude", "time"],
    minMajorityShare: 0.5,
    indicatorKey: "name",
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    targetCurrency: "USD",
    explain: true,
    useLiveFX: false,
    fxFallback: { base: "USD", rates: { EUR: 0.8511 } },
  });

  // Verify shares are NOT on individual items
  for (const d of result.data) {
    const ts = d.explain?.targetSelection;
    assertExists(ts, "targetSelection should exist");
    assertEquals(ts.shares, undefined, "shares should NOT be on items");
  }

  // Verify shares ARE available at group level
  assertExists(
    result.targetSelectionsByIndicator,
    "targetSelectionsByIndicator should exist",
  );
  const botSelection = result.targetSelectionsByIndicator["balance of trade"];
  assertExists(botSelection, "Balance of Trade selection should exist");
  assertExists(botSelection.shares, "shares should exist at group level");
  assertExists(botSelection.shares.currency, "currency shares should exist");
  assertExists(botSelection.shares.magnitude, "magnitude shares should exist");
  assertExists(botSelection.shares.time, "time shares should exist");

  // Verify share values are reasonable
  const usdShare = botSelection.shares.currency.USD ?? 0;
  assertEquals(usdShare > 0.5, true, "USD share should be > 0.5");
  const millionsShare = botSelection.shares.magnitude.millions ?? 0;
  assertEquals(millionsShare > 0.5, true, "millions share should be > 0.5");
});
