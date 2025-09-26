/**
 * Debug test to see actual V2 output vs expectations
 */

import { assertEquals } from "jsr:@std/assert";
import { processEconomicData } from "../../api/pipeline_api.ts";
import type { ParsedData } from "../shared/types.ts";

Deno.test("Debug: See Actual V2 Output", async () => {
  const testItems = [
    {
      id: "gdp_usd_m",
      value: 25000,
      unit: "USD Million",
      name: "GDP (Medium Economy)",
    },
    {
      id: "wage_usd_month",
      value: 4500,
      unit: "USD per month",
      name: "Monthly Salary",
    },
    {
      id: "pop_total",
      value: 50000000,
      unit: "persons",
      name: "Total Population",
    },
    {
      id: "unemployment_rate",
      value: 5.2,
      unit: "percent",
      name: "Unemployment Rate",
    },
  ];

  const result = await processEconomicData(testItems as ParsedData[], {
    engine: "v2",
    targetCurrency: "USD",
    targetMagnitude: "millions",
    targetTimeScale: "month",
    minQualityScore: 60,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: { EUR: 1.1, GBP: 1.25, JPY: 0.007 },
      dates: { EUR: "2024-01-01" },
    },
    explain: true,
  });

  console.log("\n=== ACTUAL V2 OUTPUT ===");
  for (const item of result.data) {
    console.log(`${item.id}:`);
    console.log(
      `  value: ${item.value} -> normalized: ${
        (item as any).normalizedValue || item.normalized
      }`,
    );
    console.log(
      `  unit: "${item.unit}" -> normalizedUnit: "${item.normalizedUnit}"`,
    );
    console.log(`  explain:`, JSON.stringify(item.explain, null, 2));
    console.log("");
  }

  console.log(`\n=== METRICS ===`);
  console.log(`Processed: ${result.metrics.recordsProcessed}`);
  console.log(`Failed: ${result.metrics.recordsFailed}`);
  console.log(`Quality: ${result.metrics.qualityScore}`);
  console.log(`Warnings: ${result.warnings.length}`);
  if (result.warnings.length > 0) {
    console.log("Warning details:", result.warnings);
  }
});
