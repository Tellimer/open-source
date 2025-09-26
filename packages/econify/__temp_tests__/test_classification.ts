import { bucketForItem } from "./src/workflowsV2/classify/taxonomy.ts";

const testCases = [
  { name: "Electricity Price", unit: "EUR/MWh", expected: "commodities" },
  { name: "Oil Price", unit: "USD per barrel", expected: "commodities" },
  { name: "Oil Exports", unit: "USD Million", expected: "monetaryStock" },
  { name: "Gold Reserves", unit: "USD Million", expected: "monetaryStock" },
  { name: "Oil Production", unit: "barrels", expected: "commodities" },
  { name: "GDP", unit: "USD billions", expected: "monetaryStock" },
];

console.log("V2 Classification Test:");
console.log("=".repeat(50));
for (const test of testCases) {
  const result = bucketForItem(
    { name: test.name, unit: test.unit, value: 100 } as any,
  );
  const status = result === test.expected ? "✅" : "❌";
  console.log(
    `${status} ${test.name} (${test.unit}): ${result} (expected: ${test.expected})`,
  );
}
