import { bucketForItem } from "./src/workflowsV2/classify/taxonomy.ts";

const testItems = [
  { id: "btc1", value: 1, unit: "BTC", name: "Bitcoin holdings" },
  { id: "eth1", value: 10, unit: "ETH", name: "Ethereum balance" },
  { id: "sol1", value: 100, unit: "SOL", name: "Solana tokens" },
  { id: "ada1", value: 1000, unit: "ADA", name: "Cardano" },
];

console.log("Testing crypto classification:");
for (const item of testItems) {
  const bucket = bucketForItem(item as any);
  console.log(`${item.id} (${item.unit}): ${bucket}`);
  if (bucket !== "crypto") {
    console.error(`  ERROR: Expected 'crypto' but got '${bucket}'`);
  }
}
