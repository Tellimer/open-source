import { bucketForItem } from "./src/workflowsV2/classify/taxonomy.ts";

const testItem = {
  id: "turkey-gold-reserves-2024",
  value: 26943.0,
  unit: "USD Million",
  name: "Gold Reserves",
  country_iso: "TUR",
  date: "2024-10-31",
  category_group: "Money",
  source_name: "Tellimer Database",
  currency_code: "USD",
  periodicity: "Monthly",
  scale: "Millions",
};

console.log("Testing Gold Reserves classification:");
console.log("Item:", testItem);
const result = bucketForItem(testItem as any);
console.log("Result:", result);
console.log("Expected: monetaryStock (reserves with currency)");
