import { computeAutoTargets } from "./src/normalization/auto_targets.ts";
import type { ParsedData } from "./src/workflows/economic-data-workflow.ts";

const data: ParsedData[] = [
  { id: "AUS", value: 11027, unit: "USD Million", name: "Balance of Trade" },
  { id: "AUT", value: 365.1, unit: "EUR Million", name: "Balance of Trade" },
  {
    id: "AZE",
    value: 2445459.7,
    unit: "USD Thousand per quarter",
    name: "Balance of Trade",
  },
];

const targets = computeAutoTargets(data, {
  indicatorKey: "name",
  minMajorityShare: 0.5,
  tieBreakers: {
    currency: "prefer-targetCurrency",
    magnitude: "prefer-millions",
    time: "prefer-month",
  },
  targetCurrency: "USD",
});

console.log("AutoTargets: ", [...targets.entries()]);
