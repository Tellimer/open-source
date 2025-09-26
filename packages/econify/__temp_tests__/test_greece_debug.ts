import { processEconomicData } from "./src/api/pipeline_api.ts";

const testData = [
  {
    id: "greece-debt",
    value: 356.4,
    unit: "EUR Billion",
    name: "Government Debt",
    currency_code: "EUR",
    periodicity: "Quarterly",
    scale: "Billions",
  },
];

const result = await processEconomicData(testData, {
  engine: "v2",
  targetCurrency: "USD",
  targetMagnitude: "millions",
  explain: true,
  fxFallback: {
    base: "USD",
    rates: { EUR: 0.92 },
    dates: { EUR: "2024-10-31" },
  },
});

console.log("Result unit:", result.data[0].normalizedUnit);
console.log("Result value:", result.data[0].normalized);
console.log("Expected:", 356.4 * 1000 / 0.92 / 3);
