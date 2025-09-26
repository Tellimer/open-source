import { processEconomicData } from "./src/api/pipeline_api.ts";
import { databaseFXRates } from "./src/workflowsV2/__fixtures__/database-real-data.ts";

const testData = [
  {
    id: "korea-m2-money-supply-2024",
    value: 3902.5,
    unit: "KRW Trillion",
    name: "M2 Money Supply",
    country_iso: "KOR",
    date: "2024-09-30",
    category_group: "Money",
    source_name: "Bank of Korea",
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
  fxFallback: databaseFXRates,
});

console.log("Bucket:", result.data[0].bucket);
console.log("Unit:", result.data[0].normalizedUnit);
console.log("Value:", result.data[0].normalized);
