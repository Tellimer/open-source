import { processEconomicData } from "./src/api/pipeline_api.ts";

const testData = [
  {
    id: "korea-m2",
    value: 3902.5,
    unit: "KRW Trillion",
    name: "M2 Money Supply",
    currency_code: "KRW",
    periodicity: "Monthly",
    scale: "Trillions",
  },
];

const result = await processEconomicData(testData, {
  engine: "v2",
  targetCurrency: "USD",
  targetMagnitude: "millions",
  explain: true,
  fxFallback: {
    base: "USD",
    rates: { KRW: 1325.0 },
    dates: { KRW: "2024-10-31" },
  },
});

console.log("Result unit:", result.data[0].normalizedUnit);
console.log("Result value:", result.data[0].normalized);
