/**
 * Comprehensive tests for temporal aggregation integration in batch processing
 */

import { assertEquals, assertExists } from "jsr:@std/assert@^1.0.0";
import { processBatch } from "./batch.ts";
import type { BatchItem } from "./batch.ts";

Deno.test("Batch: period-cumulative BLOCKS time conversion", async () => {
  const items: BatchItem[] = [
    {
      id: "YTD_SALES",
      name: "YTD Sales",
      value: 1000,
      unit: "USD Million",
      periodicity: "Monthly",
      indicator_type: "flow",
      temporal_aggregation: "period-cumulative", // YTD - cannot convert!
    },
  ];

  // Should skip conversion and keep value unchanged (warns but doesn't throw)
  const result = await processBatch(items, {
    toTimeScale: "year",
    toMagnitude: "millions",
  });

  assertEquals(result.successful.length, 1);
  const item = result.successful[0];
  // Value should NOT be multiplied - conversion was skipped
  assertEquals(item.normalized, 1000);
  // Unit should NOT include time dimension
  assertEquals(item.normalizedUnit, "USD millions");
});

Deno.test("Batch: period-total allows time conversion", async () => {
  const items: BatchItem[] = [
    {
      id: "MONTHLY_SALES",
      name: "Monthly Total Sales",
      value: 100,
      unit: "USD Million",
      periodicity: "Monthly",
      indicator_type: "flow",
      temporal_aggregation: "period-total", // Sum over period - can convert
    },
  ];

  const result = await processBatch(items, {
    toTimeScale: "year",
    toMagnitude: "millions",
  });

  assertEquals(result.successful.length, 1);
  const item = result.successful[0];
  assertEquals(item.normalized, 1200); // 100 * 12 months
  assertEquals(item.normalizedUnit, "USD millions per year");
});

Deno.test("Batch: period-total BLOCKS time conversion for discrete types (count)", async () => {
  // Tourist Arrivals scenario: count + period-total should NOT be time-converted
  const items: BatchItem[] = [
    {
      id: "TOURIST_ARRIVALS",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      periodicity: "Quarterly",
      indicator_type: "count", // Discrete type
      temporal_aggregation: "period-total", // Total over quarter
    },
  ];

  const result = await processBatch(items, {
    toTimeScale: "month",
    toMagnitude: "ones",
    explain: true,
  });

  assertEquals(result.successful.length, 1);
  const item = result.successful[0];

  // Should ONLY apply magnitude scaling (thousands -> ones)
  // Should NOT divide by 3 (quarter -> month)
  assertEquals(item.normalized, 520394000); // 520394 * 1000, NOT ÷ 3
  assertEquals(item.normalizedUnit, "ones");

  // Explain metadata should show adjusted=false
  assertExists(item.explain);
  assertExists(item.explain.periodicity);
  assertEquals(item.explain.periodicity.adjusted, false);
  assertEquals(item.explain.periodicity.factor, 1);
  assertEquals(
    item.explain.periodicity.description,
    "Time conversion blocked (count with period-total)",
  );
});

Deno.test("Batch: period-total BLOCKS time conversion for discrete types (count) - with time in unit", async () => {
  // Armenia scenario: count + period-total with explicit time in unit should keep original time
  const items: BatchItem[] = [
    {
      id: "ARMENIA_TOURISTS",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands per quarter",
      periodicity: "Quarterly",
      indicator_type: "count", // Discrete type
      temporal_aggregation: "period-total", // Total over quarter
    },
  ];

  const result = await processBatch(items, {
    toTimeScale: "month",
    toMagnitude: "ones",
    explain: true,
  });

  assertEquals(result.successful.length, 1);
  const item = result.successful[0];

  // Should ONLY apply magnitude scaling (thousands -> ones)
  // Should NOT divide by 3 (quarter -> month)
  assertEquals(item.normalized, 520394000); // 520394 * 1000, NOT ÷ 3
  // Should keep original time dimension since conversion was blocked
  assertEquals(item.normalizedUnit, "ones per quarter"); // Keep "per quarter", not "per month"!

  // Explain metadata should show adjusted=false
  assertExists(item.explain);
  assertExists(item.explain.periodicity);
  assertEquals(item.explain.periodicity.adjusted, false);
  assertEquals(item.explain.periodicity.factor, 1);
  assertEquals(
    item.explain.periodicity.description,
    "Time conversion blocked (count with period-total)",
  );
});

Deno.test("Batch: period-rate allows time conversion", async () => {
  const items: BatchItem[] = [
    {
      id: "GDP_GROWTH",
      name: "GDP Growth Rate",
      value: 5000,
      unit: "USD Billion",
      periodicity: "Quarterly",
      indicator_type: "flow",
      temporal_aggregation: "period-rate", // Flow rate - can convert
    },
  ];

  const result = await processBatch(items, {
    toTimeScale: "year",
    toMagnitude: "billions",
  });

  assertEquals(result.successful.length, 1);
  const item = result.successful[0];
  assertEquals(item.normalized, 20000); // 5000 * 4 quarters
  assertEquals(item.normalizedUnit, "USD billions per year");
});

Deno.test("Batch: period-average allows time conversion", async () => {
  const items: BatchItem[] = [
    {
      id: "AVG_TEMP",
      name: "Average Temperature",
      value: 20,
      unit: "Celsius",
      periodicity: "Monthly",
      indicator_type: "balance", // Temperature can be modeled as balance
      temporal_aggregation: "period-average", // Average over period
    },
  ];

  const result = await processBatch(items, {
    toTimeScale: "year",
  });

  assertEquals(result.successful.length, 1);
  const item = result.successful[0];
  assertEquals(item.normalized, 240); // 20 * 12 months (mathematically valid)
  assertEquals(item.normalizedUnit, "celsius per year");
});

Deno.test("Batch: point-in-time BLOCKS time conversion (via allowTimeConversion)", async () => {
  const items: BatchItem[] = [
    {
      id: "STOCK_LEVEL",
      name: "Inventory Stock",
      value: 1000,
      unit: "Units",
      periodicity: "Monthly",
      indicator_type: "stock",
      temporal_aggregation: "point-in-time", // Snapshot - should not convert
    },
  ];

  const result = await processBatch(items, {
    toTimeScale: "year", // Request time conversion
  });

  assertEquals(result.successful.length, 1);
  const item = result.successful[0];
  // Should NOT be multiplied - time conversion blocked by temporal_aggregation
  assertEquals(item.normalized, 1000);
  // Unit should NOT include time dimension
  assertEquals(item.normalizedUnit, "ones");
});

Deno.test("Batch: not-applicable blocks time conversion", async () => {
  const items: BatchItem[] = [
    {
      id: "DEBT_RATIO",
      name: "Debt to GDP Ratio",
      value: 45.5,
      unit: "%",
      periodicity: "Quarterly",
      indicator_type: "ratio",
      temporal_aggregation: "not-applicable", // Dimensionless
    },
  ];

  const result = await processBatch(items, {
    toTimeScale: "year", // Request time conversion
  });

  assertEquals(result.successful.length, 1);
  const item = result.successful[0];
  // Should NOT be multiplied
  assertEquals(item.normalized, 45.5);
  assertEquals(item.normalizedUnit, "%");
});

Deno.test("Batch: All 6 temporal aggregation types in one batch", async () => {
  const items: BatchItem[] = [
    // 1. point-in-time
    {
      id: "STOCK",
      name: "Foreign Reserves",
      value: 100,
      unit: "USD Billion",
      periodicity: "Monthly",
      indicator_type: "stock",
      temporal_aggregation: "point-in-time",
    },
    // 2. period-total
    {
      id: "TOTAL",
      name: "Total Transactions",
      value: 50,
      unit: "USD Million",
      periodicity: "Monthly",
      indicator_type: "flow",
      temporal_aggregation: "period-total",
    },
    // 3. period-rate
    {
      id: "RATE",
      name: "GDP",
      value: 5000,
      unit: "USD Billion",
      periodicity: "Quarterly",
      indicator_type: "flow",
      temporal_aggregation: "period-rate",
    },
    // 4. period-average
    {
      id: "AVG",
      name: "Avg Price",
      value: 10,
      unit: "USD",
      periodicity: "Monthly",
      indicator_type: "price",
      temporal_aggregation: "period-average",
    },
    // 5. not-applicable
    {
      id: "RATIO",
      name: "Debt Ratio",
      value: 50,
      unit: "%",
      periodicity: "Quarterly",
      indicator_type: "ratio",
      temporal_aggregation: "not-applicable",
    },
    // 6. period-cumulative - will be skipped due to error handling
    {
      id: "YTD",
      name: "YTD Sales",
      value: 1000,
      unit: "USD Million",
      periodicity: "Monthly",
      indicator_type: "flow",
      temporal_aggregation: "period-cumulative",
    },
  ];

  const result = await processBatch(items, {
    toTimeScale: "year",
    // Don't specify toMagnitude - let each item keep its original magnitude
    // This test focuses on temporal aggregation, not magnitude conversion
  });

  // period-cumulative should succeed but not be converted (warns instead of failing)
  assertEquals(result.failed.length, 0);
  assertEquals(result.successful.length, 6);

  // Verify each type
  const stock = result.successful.find((i) => i.id === "STOCK");
  const total = result.successful.find((i) => i.id === "TOTAL");
  const rate = result.successful.find((i) => i.id === "RATE");
  const avg = result.successful.find((i) => i.id === "AVG");
  const ratio = result.successful.find((i) => i.id === "RATIO");
  const ytd = result.successful.find((i) => i.id === "YTD");

  assertExists(stock);
  assertExists(total);
  assertExists(rate);
  assertExists(avg);
  assertExists(ratio);
  assertExists(ytd);

  // point-in-time: no time conversion (100 billion stays 100 billion)
  assertEquals(stock.normalized, 100);

  // period-total: sum and convert (50 million * 12 = 600 million)
  assertEquals(total.normalized, 600); // 50M * 12 months

  // period-rate: convert (5000 billion * 4 quarters)
  assertEquals(rate.normalized, 20000);

  // period-average: convert (10 USD * 12 months = 120 USD)
  assertEquals(avg.normalized, 120);

  // not-applicable: no conversion
  assertEquals(ratio.normalized, 50);

  // period-cumulative: NO time conversion (1000 million stays 1000 million)
  assertEquals(ytd.normalized, 1000);
  assertEquals(ytd.normalizedUnit, "USD millions"); // No time dimension added
});

Deno.test("Batch: temporal_aggregation takes priority over indicator_type", async () => {
  // A flow indicator with point-in-time aggregation
  // temporal_aggregation should override indicator_type rules
  const items: BatchItem[] = [
    {
      id: "SPECIAL",
      name: "Flow with point-in-time aggregation",
      value: 100,
      unit: "USD Million",
      periodicity: "Monthly",
      indicator_type: "flow", // Would normally allow time conversion
      temporal_aggregation: "point-in-time", // But this blocks it!
    },
  ];

  const result = await processBatch(items, {
    toTimeScale: "year",
    toMagnitude: "millions",
  });

  assertEquals(result.successful.length, 1);
  const item = result.successful[0];
  // Should NOT be converted due to temporal_aggregation
  assertEquals(item.normalized, 100);
  assertEquals(item.normalizedUnit, "USD millions");
});

Deno.test("Batch: Missing temporal_aggregation falls back to indicator_type", async () => {
  const items: BatchItem[] = [
    {
      id: "FLOW_NO_TEMPORAL",
      name: "GDP",
      value: 100,
      unit: "USD Million",
      periodicity: "Monthly",
      indicator_type: "flow",
      // NO temporal_aggregation - should use indicator_type rules
    },
  ];

  const result = await processBatch(items, {
    toTimeScale: "year",
    toMagnitude: "millions",
  });

  assertEquals(result.successful.length, 1);
  const item = result.successful[0];
  // Should convert based on indicator_type=flow allowing time dimension
  assertEquals(item.normalized, 1200); // 100 * 12
  assertEquals(item.normalizedUnit, "USD millions per year");
});

Deno.test("Batch: Explain metadata with temporal_aggregation", async () => {
  const items: BatchItem[] = [
    {
      id: "EXPLAINED",
      name: "Monthly Sales",
      value: 100,
      unit: "USD Million",
      periodicity: "Monthly",
      indicator_type: "flow",
      temporal_aggregation: "period-total",
    },
  ];

  const result = await processBatch(items, {
    toTimeScale: "year",
    toMagnitude: "millions",
    explain: true,
  });

  assertEquals(result.successful.length, 1);
  const item = result.successful[0];

  assertExists(item.explain);
  assertExists(item.explain.periodicity);

  // Should explain the time conversion
  assertEquals(item.explain.periodicity.original, "month");
  assertEquals(item.explain.periodicity.target, "year");
  assertEquals(item.explain.periodicity.factor, 12);
});
