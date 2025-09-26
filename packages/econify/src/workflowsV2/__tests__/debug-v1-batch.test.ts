/**
 * Debug test to see what V1 batch processing returns
 */

import { assertEquals } from "jsr:@std/assert";
import { processBatch } from "../../batch/batch.ts";

Deno.test("Debug: V1 Batch Processing Output", async () => {
  const testItems = [
    { id: "gdp_test", value: 25000, unit: "USD Million", name: "GDP Test" },
    { id: "wage_test", value: 4500, unit: "USD per month", name: "Wage Test" },
  ];

  console.log("\n=== INPUT TO V1 BATCH ===");
  console.log(JSON.stringify(testItems, null, 2));

  const result = await processBatch(testItems, {
    toCurrency: "USD",
    toMagnitude: "millions",
    toTimeScale: "month",
    explain: true,
  });

  console.log("\n=== V1 BATCH RESULT ===");
  console.log(`Total: ${result.stats.total}`);
  console.log(`Successful: ${result.stats.successful}`);
  console.log(`Failed: ${result.stats.failed}`);
  console.log(`Skipped: ${result.stats.skipped}`);

  console.log("\n=== SUCCESSFUL ITEMS ===");
  for (const item of result.successful) {
    console.log(`${item.id}:`);
    console.log(`  value: ${item.value} -> normalized: ${item.normalized}`);
    console.log(
      `  unit: "${item.unit}" -> normalizedUnit: "${item.normalizedUnit}"`,
    );
    console.log(
      `  explain:`,
      item.explain ? JSON.stringify(item.explain, null, 2) : "none",
    );
    console.log("");
  }

  if (result.failed.length > 0) {
    console.log("\n=== FAILED ITEMS ===");
    for (const failed of result.failed) {
      console.log(`${failed.item.id}: ${failed.reason}`);
      console.log(`Error:`, failed.error);
    }
  }

  if (result.skipped.length > 0) {
    console.log("\n=== SKIPPED ITEMS ===");
    for (const skipped of result.skipped) {
      console.log(`${skipped.item.id}: ${skipped.reason}`);
    }
  }
});
