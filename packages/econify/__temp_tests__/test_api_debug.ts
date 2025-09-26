import { processEconomicData } from "./src/api/pipeline_api.ts";

const testData = [
  {
    id: "poland-fdi",
    value: 1234.5,
    unit: "EUR Million",
    name: "FDI Inflows",
    periodicity: "Quarterly",
    scale: "Millions",
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

console.log("Result:", JSON.stringify(result.data[0], null, 2));
