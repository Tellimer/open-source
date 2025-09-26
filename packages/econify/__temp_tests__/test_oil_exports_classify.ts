import { bucketForItem } from "./src/workflowsV2/classify/taxonomy.ts";

const testItem = {
  id: "russia-oil-exports-2024",
  value: 6984,
  unit: "USD Million",
  name: "Oil Exports",
  currency_code: "USD",
};

console.log("Testing Oil Exports classification:");
const result = bucketForItem(testItem as any);
console.log("Result:", result);
console.log("Expected: monetaryStock (has USD currency)");
