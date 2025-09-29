import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { EconifyBatchSession } from "./batch_session_api.ts";

Deno.test("EconifyBatchSession - Balance of Trade real-world scenario", async () => {
  // Create session with typical settings
  const session = new EconifyBatchSession({
    targetCurrency: "USD",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    minMajorityShare: 0.6,
    tieBreakers: {
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    fxFallback: {
      base: "USD",
      rates: {
        EUR: 0.92,
        GBP: 0.79,
        JPY: 150,
      },
    },
    explain: true,
  });

  // Add Balance of Trade data for multiple countries
  // This simulates the real scenario where countries report in different units
  const countries = [
    { iso: "USA", value: 100, unit: "USD million/month" },
    { iso: "GBR", value: 50, unit: "GBP million/month" },
    { iso: "DEU", value: 200, unit: "EUR million/quarter" }, // Different time!
    { iso: "JPN", value: 15000, unit: "JPY million/month" },
    { iso: "FRA", value: 180, unit: "EUR million/month" },
  ];

  // Add all countries to the batch
  for (const country of countries) {
    session.addDataPoint({
      id: `bot_${country.iso}`,
      name: "Balance of Trade",
      value: country.value,
      unit: country.unit,
      metadata: { countryISO: country.iso },
    });
  }

  // Process all together
  const result = await session.process();

  // Verify all countries were processed
  assertEquals(result.data.length, 5);
  assertEquals(result.metrics.recordsProcessed, 5);
  assertEquals(result.metrics.recordsFailed, 0);

  // Check that all countries are normalized to the same time scale
  // With 4 monthly and 1 quarterly, monthly should win (80% majority)
  for (const item of result.data) {
    assertExists(item.normalized, `${item.id} should have normalized value`);
    assertExists(item.normalizedUnit, `${item.id} should have normalized unit`);

    // All should be normalized to USD (targetCurrency)
    assertExists(
      item.normalizedUnit?.includes("USD"),
      `${item.id} should be in USD, got ${item.normalizedUnit}`,
    );

    // All should be normalized to millions (majority)
    assertExists(
      item.normalizedUnit?.toLowerCase().includes("million"),
      `${item.id} should be in millions, got ${item.normalizedUnit}`,
    );

    // Check explain object has target selection info
    const explain = (item as unknown as Record<string, unknown>)
      .explain as Record<string, unknown>;
    assertExists(
      explain?.targetSelection,
      `${item.id} should have targetSelection`,
    );
    assertEquals(
      // deno-lint-ignore no-explicit-any
      (explain.targetSelection as any).selected.time,
      "month",
      `${item.id} should be normalized to month`,
    );
  }

  // Verify specific conversions
  const usa = result.data.find((d) => d.id === "bot_USA");
  assertEquals(
    usa?.normalized,
    100,
    "USA value should remain 100 (already in USD millions/month)",
  );

  const gbr = result.data.find((d) => d.id === "bot_GBR");
  assertExists(gbr?.normalized);
  // GBP 50 million -> USD at 0.79 rate = 50 / 0.79 ≈ 63.29
  assertEquals(
    Math.round(gbr.normalized!),
    63,
    "GBR should be converted from GBP to USD",
  );

  const deu = result.data.find((d) => d.id === "bot_DEU");
  assertExists(deu?.normalized);
  // EUR 200 million/quarter -> EUR 66.67 million/month -> USD at 0.92 rate = 66.67 / 0.92 ≈ 72.46
  assertEquals(
    Math.round(deu.normalized!),
    72,
    "DEU should be converted from quarterly to monthly and EUR to USD",
  );

  // Check that metadata is preserved
  for (const item of result.data) {
    assertExists(
      (item.metadata as Record<string, unknown>)?.countryISO,
      `${item.id} should preserve countryISO in metadata`,
    );
  }
});

Deno.test("EconifyBatchSession - returns normalized data correctly", async () => {
  const session = new EconifyBatchSession({
    targetCurrency: "USD",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92 },
    },
  });

  // Add data points
  session.addDataPoints([
    {
      id: "1",
      name: "Trade Balance",
      value: 1000,
      unit: "USD million/year",
      metadata: { country: "USA" },
    },
    {
      id: "2",
      name: "Trade Balance",
      value: 2000,
      unit: "EUR million/year",
      metadata: { country: "Germany" },
    },
    {
      id: "3",
      name: "Trade Balance",
      value: 500,
      unit: "USD billion/year",
      metadata: { country: "China" },
    },
  ]);

  const result = await session.process();

  // All items should be returned with normalized values
  assertEquals(result.data.length, 3);

  // Check structure of returned data
  for (const item of result.data) {
    // Core normalized fields
    assertExists(item.normalized, "Should have normalized value");
    assertExists(item.normalizedUnit, "Should have normalized unit");

    // Original fields preserved
    assertExists(item.id, "Should preserve id");
    assertExists(item.name, "Should preserve name");
    assertExists(item.value, "Should preserve original value");
    assertExists(item.unit, "Should preserve original unit");
    assertExists(item.metadata, "Should preserve metadata");

    // Normalization details
    const itemWithExplain = item as unknown as Record<string, unknown>;
    if (itemWithExplain.explain) {
      assertExists(
        (itemWithExplain.explain as Record<string, unknown>).targetSelection,
        "Should have target selection in explain",
      );
    }
  }

  // With 2 millions vs 1 billion, millions should win (66% majority)
  const usaItem = result.data.find((d) => d.id === "1");
  assertExists(usaItem?.normalizedUnit?.includes("million"));

  // China's value should be converted from billions to millions
  const chinaItem = result.data.find((d) => d.id === "3");
  assertEquals(
    chinaItem?.normalized,
    500000,
    "500 billion should become 500,000 million",
  );
});
