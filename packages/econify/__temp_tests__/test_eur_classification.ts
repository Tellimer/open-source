import { bucketForItem } from "./src/workflowsV2/classify/taxonomy.ts";

const testItems = [
  { name: "National Debt (Medium)", unit: "EUR Million", value: 5000 },
  { name: "Monthly Salary (EUR)", unit: "EUR per month", value: 3800 },
];

for (const item of testItems) {
  const result = bucketForItem(item as any);
  console.log(`${item.name} (${item.unit}): ${result}`);
}
