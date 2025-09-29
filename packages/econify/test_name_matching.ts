#!/usr/bin/env -S deno run --allow-read --allow-env

import { processEconomicData } from "./src/api/pipeline_api.ts";

// Test if slight variations in names cause grouping issues
const testData = [
  // Group 1: Exact name match
  {
    id: "ABW",
    value: -711.55,
    unit: "AWG Million",
    periodicity: "Quarterly",
    name: "Balance of Trade",
  },
  {
    id: "AFG",
    value: -6798.401,
    unit: "USD Million",
    periodicity: "Yearly",
    name: "Balance of Trade",
  },
  {
    id: "AGO",
    value: 3750.6,
    unit: "USD Million",
    periodicity: "Quarterly",
    name: "Balance of Trade",
  },

  // Group 2: Name with extra space (potential issue?)
  {
    id: "ALB",
    value: -48229,
    unit: "ALL Million",
    periodicity: "Monthly",
    name: "Balance of Trade ",
  },
  {
    id: "ARG",
    value: 988,
    unit: "USD Million",
    periodicity: "Monthly",
    name: "Balance of Trade",
  },
  {
    id: "ARM",
    value: -308.2,
    unit: "USD Million",
    periodicity: "Monthly",
    name: "Balance of Trade",
  },

  // Group 3: Name with case difference
  {
    id: "AUS",
    value: 1000,
    unit: "USD Million",
    periodicity: "Monthly",
    name: "balance of trade",
  },
  {
    id: "AUT",
    value: 2000,
    unit: "EUR Million",
    periodicity: "Quarterly",
    name: "Balance Of Trade",
  },
];

console.log("Testing with name variations...\n");

const result = await processEconomicData(testData, {
  autoTargetByIndicator: true,
  indicatorKey: "name",
  autoTargetDimensions: ["currency", "magnitude", "time"],
  minMajorityShare: 0.5,
  tieBreakers: {
    currency: "prefer-targetCurrency",
    magnitude: "prefer-millions",
    time: "prefer-month",
  },
  targetCurrency: "USD",
  explain: true,
  useLiveFX: false,
  fxFallback: {
    base: "USD",
    rates: {
      ALL: 82.53,
      AWG: 1.81,
      EUR: 0.9,
    },
  },
});

// Analyze unique indicator keys found
const indicatorKeys = new Set<string>();
const targetSelections = new Map<string, unknown[]>();

for (const item of result.data) {
  const ts = item.explain?.targetSelection;
  if (ts) {
    indicatorKeys.add(ts.indicatorKey);

    const selKey = JSON.stringify(ts.selected);
    const list = targetSelections.get(selKey) || [];
    list.push({
      id: item.id,
      indicatorKey: ts.indicatorKey,
      originalName: testData.find((d) => d.id === item.id)?.name,
    });
    targetSelections.set(selKey, list);
  }
}

console.log("Indicator Keys Found:", Array.from(indicatorKeys));
console.log("\nTarget Selections:");
console.log("-".repeat(50));

for (const [selKey, items] of targetSelections.entries()) {
  console.log(`\nSelection: ${selKey}`);
  for (const item of items) {
    console.log(
      `  ${item.id}: "${item.originalName}" → key="${item.indicatorKey}"`,
    );
  }
}

if (targetSelections.size > 1) {
  console.log(
    "\n❌ PROBLEM: Different names are causing different target selections!",
  );
} else {
  console.log("\n✅ All variations mapped to same target selection");
}
