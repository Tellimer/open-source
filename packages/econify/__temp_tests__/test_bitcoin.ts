import { bucketForItem } from "./src/workflowsV2/classify/taxonomy.ts";

const item = {
  id: "bitcoin_full",
  value: 5,
  unit: "bitcoin",
  name: "Bitcoin Reserve",
};
const result = bucketForItem(item as any);
console.log(`Bitcoin classification: ${result} (expected: crypto)`);
