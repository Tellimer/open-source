import { bucketForItem } from "./src/workflowsV2/classify/taxonomy.ts";

const testCases = [
  // Monetary Stocks (point-in-time values)
  { name: "M2 Money Supply", unit: "KRW Trillion" },
  { name: "Government Debt", unit: "EUR Billion" },
  { name: "External Debt", unit: "USD Million" },
  { name: "Gold Reserves", unit: "USD Million" },

  // Monetary Flows (money movement over time)
  { name: "Current Account", unit: "USD Million" },
  { name: "Exports", unit: "USD Million" },
  { name: "FDI", unit: "EUR Million" },
  { name: "Remittances", unit: "USD Million" },
  { name: "Trade Balance", unit: "MYR Million" },
  { name: "Average Wages", unit: "INR" },
  { name: "Minimum Wage", unit: "THB per day" },

  // Commodities/Energy
  { name: "Electricity Price", unit: "EUR/MWh" },
  { name: "Natural Gas Production", unit: "Billion Cubic Meters" },
  { name: "Oil Production", unit: "BBL/D/1K" },
  { name: "Copper Production", unit: "Thousands of Tonnes" },

  // Counts
  { name: "Tourist Arrivals", unit: "ones" },
  { name: "Car Sales", unit: "units" },

  // Percentages
  { name: "Inflation Rate", unit: "%" },
  { name: "Unemployment Rate", unit: "%" },

  // Indices
  { name: "Stock Market Index", unit: "Points" },
  { name: "Consumer Price Index", unit: "Index 2015=100" },
];

console.log("\n=== Classification Summary ===\n");
const buckets: Record<string, string[]> = {};

for (const test of testCases) {
  const bucket = bucketForItem(test as any);
  if (!buckets[bucket]) buckets[bucket] = [];
  buckets[bucket].push(`${test.name} (${test.unit})`);
  console.log(`${test.name.padEnd(25)} ${test.unit.padEnd(25)} → ${bucket}`);
}

console.log("\n=== By Bucket ===");
for (const [bucket, items] of Object.entries(buckets)) {
  console.log(`\n${bucket} (${items.length} items):`);
  items.forEach((item) => console.log(`  - ${item}`));
}
