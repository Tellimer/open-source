import { bucketForItem } from "./src/workflowsV2/classify/taxonomy.ts";

const testCases = [
  { name: "M2 Money Supply", unit: "KRW Trillion" },
  { name: "Government Debt", unit: "EUR Billion" },
  { name: "External Debt", unit: "USD Million" },
  { name: "Average Wages", unit: "INR" },
  { name: "Exports", unit: "USD Million" },
];

for (const test of testCases) {
  const bucket = bucketForItem(test as any);
  console.log(`${test.name} (${test.unit}) -> ${bucket}`);
}
