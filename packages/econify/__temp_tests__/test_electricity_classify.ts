import { bucketForItem } from "./src/workflowsV2/classify/taxonomy.ts";

const testItem = {
  id: "spain-electricity-price-2024",
  value: 87.5,
  unit: "EUR/MWh",
  name: "Electricity Price",
  country_iso: "ESP",
  date: "2024-10-31",
  category_group: "Business",
  source_name: "Tellimer Database",
  currency_code: "EUR",
  periodicity: "Daily",
};

console.log("Testing Electricity Price classification:");
console.log("Item:", testItem);
const result = bucketForItem(testItem as any);
console.log("Result:", result);
console.log("Expected: commodities (should not have FX conversion)");
