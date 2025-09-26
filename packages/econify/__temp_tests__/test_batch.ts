import { processBatch } from "./src/batch/batch.ts";

const problematicData = [
  {
    value: NaN,
    unit: "USD",
    name: "Invalid Value",
  },
  {
    value: Infinity,
    unit: "EUR",
    name: "Infinite Value",
  },
];

console.log("Testing processBatch with NaN and Infinity...");
const start = Date.now();

try {
  const result = await processBatch(problematicData, {
    validate: false,
    handleErrors: "skip",
    parallel: true,
    toCurrency: "USD",
  });
  console.log("Success! Result:", result);
  console.log(`Completed in`, Date.now() - start, `ms`);
} catch (error: any) {
  console.log(`Error after`, Date.now() - start, `ms:`, error.message);
}
