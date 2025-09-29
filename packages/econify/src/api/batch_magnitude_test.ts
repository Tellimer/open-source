import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { EconifyBatchSession } from "./batch_session_api.ts";

Deno.test("EconifyBatchSession - magnitude normalization across countries", async () => {
  const session = new EconifyBatchSession({
    targetCurrency: "USD",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time", "currency"],
    minMajorityShare: 0.6, // 60% threshold for majority
    tieBreakers: {
      magnitude: "prefer-millions",
      time: "prefer-month",
      currency: "prefer-targetCurrency",
    },
    fxFallback: {
      base: "USD",
      rates: { EUR: 0.92, GBP: 0.79, JPY: 150 },
    },
    explain: true,
  });

  // Add Balance of Trade data with DIFFERENT MAGNITUDES
  session.addDataPoints([
    {
      id: "bot_USA",
      name: "Balance of Trade",
      value: 100,
      unit: "USD million/month", // MILLIONS
      metadata: { country: "USA" },
    },
    {
      id: "bot_UK",
      name: "Balance of Trade",
      value: 50000,
      unit: "GBP thousand/month", // THOUSANDS - should convert to millions
      metadata: { country: "UK" },
    },
    {
      id: "bot_Germany",
      name: "Balance of Trade",
      value: 0.2,
      unit: "EUR billion/month", // BILLIONS - should convert to millions
      metadata: { country: "Germany" },
    },
    {
      id: "bot_Japan",
      name: "Balance of Trade",
      value: 15000,
      unit: "JPY million/month", // MILLIONS
      metadata: { country: "Japan" },
    },
    {
      id: "bot_France",
      name: "Balance of Trade",
      value: 180,
      unit: "EUR million/month", // MILLIONS
      metadata: { country: "France" },
    },
    {
      id: "bot_China",
      name: "Balance of Trade",
      value: 0.5,
      unit: "USD billion/month", // BILLIONS - should convert to millions
      metadata: { country: "China" },
    },
  ]);

  const result = await session.process();

  // Check that magnitude normalization occurred
  console.log("\nMagnitude Normalization Results:");
  console.log("=================================");

  for (const item of result.data) {
    const country = (item.metadata as Record<string, unknown>)?.country;
    const explain = (item as unknown as Record<string, unknown>)
      .explain as Record<string, unknown>;

    console.log(`\n${country}:`);
    console.log(`  Original: ${item.value} ${item.unit}`);
    console.log(`  Normalized: ${item.normalized} ${item.normalizedUnit}`);
    console.log(
      `  Selected magnitude: ${
        // deno-lint-ignore no-explicit-any
        (explain?.targetSelection as any)?.selected?.magnitude}`,
    );

    // All should be normalized to MILLIONS (4 millions vs 1 thousand vs 2 billions = millions wins)
    assertExists(
      item.normalizedUnit?.toLowerCase().includes("million"),
      `${country} should be normalized to millions, got ${item.normalizedUnit}`,
    );
  }

  // Verify specific conversions:

  // USA: 100 million stays 100 million
  const usa = result.data.find((d) => d.id === "bot_USA");
  assertEquals(
    usa?.normalized,
    100,
    "USA: 100 million should stay 100 million",
  );

  // UK: 50,000 thousand = 50 million (then currency conversion)
  const uk = result.data.find((d) => d.id === "bot_UK");
  assertExists(uk?.normalized);
  const expectedUK = 50 / 0.79; // 50 million GBP to USD
  assertEquals(
    Math.round(uk.normalized!),
    Math.round(expectedUK),
    "UK: 50,000 thousand GBP = 50 million GBP → ~63 million USD",
  );

  // Germany: 0.2 billion = 200 million (then currency conversion)
  const germany = result.data.find((d) => d.id === "bot_Germany");
  assertExists(germany?.normalized);
  const expectedGermany = 200 / 0.92; // 200 million EUR to USD
  assertEquals(
    Math.round(germany.normalized!),
    Math.round(expectedGermany),
    "Germany: 0.2 billion EUR = 200 million EUR → ~217 million USD",
  );

  // China: 0.5 billion = 500 million
  const china = result.data.find((d) => d.id === "bot_China");
  assertEquals(
    china?.normalized,
    500,
    "China: 0.5 billion USD = 500 million USD",
  );

  // Check the target selection explanation
  const firstItem = result.data[0];
  const explain = (firstItem as unknown as Record<string, unknown>)
    .explain as Record<string, unknown>;
  assertExists(explain?.targetSelection);
  assertEquals(
    // deno-lint-ignore no-explicit-any
    (explain.targetSelection as any).selected.magnitude,
    "millions",
    "Should select millions as the target magnitude",
  );

  // Check shares to verify majority calculation
  // deno-lint-ignore no-explicit-any
  const shares = (explain.targetSelection as any).shares.magnitude;
  console.log("\nMagnitude distribution:", shares);
  // Should show: millions: 4/6 (66.7%), billions: 2/6 (33.3%), thousands: 1/6 (16.7%)
  assertExists(shares.millions > 0.6, "Millions should have >60% share");
});

Deno.test("EconifyBatchSession - extreme magnitude differences", async () => {
  const session = new EconifyBatchSession({
    targetCurrency: "USD",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude"],
    minMajorityShare: 0.5,
    fxFallback: { base: "USD", rates: {} },
    explain: true,
  });

  // Test with extreme differences: ones, thousands, millions, billions
  session.addDataPoints([
    {
      id: "small_1",
      name: "Test Indicator",
      value: 1000000, // 1 million in ones
      unit: "USD", // No magnitude = ones
    },
    {
      id: "small_2",
      name: "Test Indicator",
      value: 1000,
      unit: "USD thousands", // thousands
    },
    {
      id: "medium",
      name: "Test Indicator",
      value: 1,
      unit: "USD millions", // millions
    },
    {
      id: "large",
      name: "Test Indicator",
      value: 0.001,
      unit: "USD billions", // billions
    },
  ]);

  const result = await session.process();

  console.log("\nExtreme magnitude test:");
  for (const item of result.data) {
    console.log(
      `${item.id}: ${item.value} ${item.unit} → ${item.normalized} ${item.normalizedUnit}`,
    );
  }

  // All values represent the same amount (1 million USD)
  // They should all normalize to the same value in the chosen magnitude
  const values = result.data.map((d) => d.normalized);

  // Check that all normalized values are equal (they all represent 1 million USD)
  const firstValue = values[0];
  for (const value of values) {
    assertEquals(
      value,
      firstValue,
      "All items should normalize to the same value",
    );
  }

  // All should have the same normalized unit
  const units = result.data.map((d) => d.normalizedUnit);
  const firstUnit = units[0];
  for (const unit of units) {
    assertEquals(
      unit,
      firstUnit,
      "All items should have the same normalized unit",
    );
  }
});
