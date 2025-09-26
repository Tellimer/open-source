import { assertEquals, assertExists } from "@std/assert";
import {
  bucketForItem,
  type BucketKey,
  isWageLikeName,
} from "../classify/taxonomy.ts";
import type { FixtureData } from "../__fixtures__/indicators-organized.ts";

// Test data with explicit types for each bucket
const testCases: Array<
  { input: FixtureData; expectedBucket: BucketKey; description: string }
> = [
  // Monetary Stock tests
  {
    input: { id: "gdp", value: 1000, unit: "USD", name: "GDP" },
    expectedBucket: "monetaryStock",
    description: "USD without time should be monetary stock",
  },
  {
    input: {
      id: "debt",
      value: 500,
      unit: "EUR millions",
      name: "Government Debt",
    },
    expectedBucket: "monetaryStock",
    description: "EUR millions should be monetary stock",
  },
  {
    input: {
      id: "reserves",
      value: 100,
      unit: "GBP billions",
      name: "Foreign Reserves",
    },
    expectedBucket: "monetaryStock",
    description: "GBP billions should be monetary stock",
  },

  // Monetary Flow tests (including wages)
  {
    input: {
      id: "wage1",
      value: 15,
      unit: "USD per hour",
      name: "Minimum Wage",
    },
    expectedBucket: "monetaryFlow",
    description: "Wage with per hour should be monetary flow",
  },
  {
    input: {
      id: "salary",
      value: 5000,
      unit: "EUR per month",
      name: "Average Salary",
    },
    expectedBucket: "monetaryFlow",
    description: "Salary should be monetary flow",
  },
  {
    input: {
      id: "earnings",
      value: 60000,
      unit: "USD per year",
      name: "Annual Earnings",
    },
    expectedBucket: "monetaryFlow",
    description: "Earnings should be monetary flow",
  },
  {
    input: {
      id: "compensation",
      value: 100,
      unit: "GBP per day",
      name: "Daily Compensation",
    },
    expectedBucket: "monetaryFlow",
    description: "Compensation should be monetary flow",
  },
  {
    input: {
      id: "pay",
      value: 20,
      unit: "USD per hour",
      name: "Hourly Pay Rate",
    },
    expectedBucket: "monetaryFlow",
    description: "Pay should be monetary flow",
  },

  // Non-wage monetary flow (currency with time)
  {
    input: {
      id: "revenue",
      value: 1000,
      unit: "USD per month",
      name: "Monthly Revenue",
    },
    expectedBucket: "monetaryFlow",
    description: "USD per month (non-wage) should be monetary flow",
  },
  {
    input: {
      id: "cost",
      value: 500,
      unit: "EUR per year",
      name: "Annual Operating Cost",
    },
    expectedBucket: "monetaryFlow",
    description: "EUR per year should be monetary flow",
  },

  // Counts tests
  {
    input: { id: "pop", value: 1000000, unit: "Persons", name: "Population" },
    expectedBucket: "counts",
    description: "Persons should be counts",
  },
  {
    input: { id: "units", value: 500, unit: "Units", name: "Production Units" },
    expectedBucket: "counts",
    description: "Units should be counts",
  },
  {
    input: {
      id: "companies",
      value: 100,
      unit: "Companies",
      name: "Number of Companies",
    },
    expectedBucket: "counts",
    description: "Companies should be counts",
  },
  {
    input: {
      id: "million",
      value: 5,
      unit: "Million",
      name: "Population in Millions",
    },
    expectedBucket: "counts",
    description: "Million should be counts",
  },
  {
    input: {
      id: "thousand",
      value: 50,
      unit: "Thousand",
      name: "Items in Thousands",
    },
    expectedBucket: "counts",
    description: "Thousand should be counts",
  },

  // Percentages tests
  {
    input: { id: "inflation", value: 2.5, unit: "%", name: "Inflation Rate" },
    expectedBucket: "percentages",
    description: "% should be percentages",
  },
  {
    input: {
      id: "unemployment",
      value: 5.0,
      unit: "percent",
      name: "Unemployment Rate",
    },
    expectedBucket: "percentages",
    description: "percent should be percentages",
  },
  {
    input: {
      id: "gdp_percent",
      value: 60,
      unit: "percent of GDP",
      name: "Debt to GDP",
    },
    expectedBucket: "percentages",
    description: "percent of GDP should be percentages",
  },
  {
    input: {
      id: "percent_cap",
      value: 10,
      unit: "Percent",
      name: "Interest Rate",
    },
    expectedBucket: "percentages",
    description: "Percent (capitalized) should be percentages",
  },

  // Indices tests
  {
    input: {
      id: "cpi",
      value: 120.5,
      unit: "points",
      name: "Consumer Price Index",
    },
    expectedBucket: "indices",
    description: "points should be indices",
  },
  {
    input: {
      id: "confidence",
      value: 95,
      unit: "Points",
      name: "Consumer Confidence",
    },
    expectedBucket: "indices",
    description: "Points (capitalized) should be indices",
  },
  {
    input: { id: "index", value: 100, unit: "Index", name: "Base Index" },
    expectedBucket: "indices",
    description: "Index should be indices",
  },
  {
    input: {
      id: "idx_2010",
      value: 110,
      unit: "Index 2010=100",
      name: "Price Index",
    },
    expectedBucket: "indices",
    description: "Index with base year should be indices",
  },

  // Ratios tests
  {
    input: { id: "ratio1", value: 1.5, unit: "USD/EUR", name: "Exchange Rate" },
    expectedBucket: "ratios",
    description: "USD/EUR should be ratios",
  },
  {
    input: {
      id: "price_ratio",
      value: 2.5,
      unit: "USD/Liter",
      name: "Gasoline Price",
    },
    expectedBucket: "ratios",
    description: "USD/Liter should be ratios",
  },
  {
    input: {
      id: "density",
      value: 100,
      unit: "persons/km²",
      name: "Population Density",
    },
    expectedBucket: "ratios",
    description: "persons/km² should be ratios",
  },
  {
    input: {
      id: "ratio",
      value: 1.45,
      unit: "Ratio",
      name: "Debt Service Ratio",
    },
    expectedBucket: "indices", // Note: "Ratio" as unit is treated as index, not ratio
    description: "Ratio (as unit name) should be indices",
  },

  // Energy tests
  {
    input: {
      id: "electricity",
      value: 1000,
      unit: "GWh",
      name: "Electricity Production",
    },
    expectedBucket: "commodities",
    description: "GWh should be commodities",
  },
  {
    input: { id: "power", value: 500, unit: "MW", name: "Power Capacity" },
    expectedBucket: "commodities",
    description: "MW should be commodities",
  },
  {
    input: { id: "emissions", value: 100, unit: "KT", name: "CO2 Emissions" },
    expectedBucket: "commodities",
    description: "KT (emissions) should be commodities",
  },
  {
    input: { id: "co2", value: 50, unit: "KT CO2", name: "Carbon Emissions" },
    expectedBucket: "commodities",
    description: "KT CO2 should be commodities",
  },
  {
    input: {
      id: "terajoule",
      value: 75,
      unit: "Terajoule",
      name: "Energy Consumption",
    },
    expectedBucket: "commodities",
    description: "Terajoule should be commodities",
  },
  {
    input: {
      id: "carbon_credits",
      value: 1000,
      unit: "Credits",
      name: "Carbon Credits",
    },
    expectedBucket: "commodities",
    description: "Carbon Credits should be commodities",
  },

  // Commodities tests
  {
    input: {
      id: "oil",
      value: 1000,
      unit: "BBL/D/1K",
      name: "Crude Oil Output",
    },
    expectedBucket: "commodities",
    description: "BBL/D/1K should be commodities",
  },
  {
    input: {
      id: "barrels",
      value: 100,
      unit: "barrels",
      name: "Oil Production",
    },
    expectedBucket: "commodities",
    description: "barrels should be commodities",
  },
  {
    input: { id: "gold", value: 50, unit: "Tonnes", name: "Gold Reserves" },
    expectedBucket: "commodities",
    description: "Gold Tonnes should be commodities",
  },
  {
    input: {
      id: "troy_oz",
      value: 100,
      unit: "troy oz",
      name: "Silver Holdings",
    },
    expectedBucket: "commodities",
    description: "troy oz should be commodities",
  },
  {
    input: {
      id: "crude",
      value: 75,
      unit: "million barrels",
      name: "Crude Oil Reserves",
    },
    expectedBucket: "commodities",
    description: "Crude oil should be commodities",
  },

  // Agriculture tests
  {
    input: {
      id: "wheat",
      value: 1000,
      unit: "metric tonnes",
      name: "Wheat Production",
    },
    expectedBucket: "commodities",
    description: "metric tonnes should be commodities",
  },
  {
    input: { id: "corn", value: 500, unit: "Bushels", name: "Corn Harvest" },
    expectedBucket: "commodities",
    description: "Bushels should be commodities",
  },
  {
    input: { id: "rice", value: 2000, unit: "short tons", name: "Rice Export" },
    expectedBucket: "commodities",
    description: "short tons should be commodities",
  },
  {
    input: {
      id: "coffee",
      value: 100,
      unit: "metric tonnes",
      name: "Coffee Production",
    },
    expectedBucket: "commodities",
    description: "Coffee metric tonnes should be commodities",
  },

  // Metals tests
  {
    input: {
      id: "copper",
      value: 500,
      unit: "copper tonnes",
      name: "Copper Production",
    },
    expectedBucket: "commodities",
    description: "copper tonnes should be commodities",
  },
  {
    input: {
      id: "steel",
      value: 1000,
      unit: "steel tonnes",
      name: "Steel Output",
    },
    expectedBucket: "commodities",
    description: "steel tonnes should be commodities",
  },
  {
    input: {
      id: "silver",
      value: 10,
      unit: "silver troy ounces",
      name: "Silver Mining",
    },
    expectedBucket: "commodities",
    description: "silver troy ounces should be commodities",
  },
  {
    input: {
      id: "aluminum",
      value: 200,
      unit: "Tonnes",
      name: "Aluminum Production",
    },
    expectedBucket: "commodities",
    description: "Aluminum tonnes should be commodities",
  },

  // Crypto tests
  {
    input: { id: "bitcoin", value: 10, unit: "BTC", name: "Bitcoin Holdings" },
    expectedBucket: "crypto",
    description: "BTC should be crypto",
  },
  {
    input: {
      id: "ethereum",
      value: 100,
      unit: "ETH",
      name: "Ethereum Balance",
    },
    expectedBucket: "crypto",
    description: "ETH should be crypto",
  },
  {
    input: {
      id: "bitcoin_full",
      value: 5,
      unit: "bitcoin",
      name: "Bitcoin Reserve",
    },
    expectedBucket: "crypto",
    description: "bitcoin should be crypto",
  },
  {
    input: {
      id: "eth_full",
      value: 50,
      unit: "ethereum",
      name: "Ethereum Holdings",
    },
    expectedBucket: "crypto",
    description: "ethereum should be crypto",
  },
];

Deno.test("taxonomy: bucketForItem classifies all indicator types correctly", () => {
  for (const testCase of testCases) {
    const result = bucketForItem(testCase.input as any);
    assertEquals(
      result,
      testCase.expectedBucket,
      `Failed: ${testCase.description}. Input: ${
        JSON.stringify(testCase.input)
      }`,
    );
  }
});

Deno.test("taxonomy: isWageLikeName identifies wage-related names", () => {
  // Should match wage-like names
  const wageNames = [
    "Minimum Wage",
    "Average Wages",
    "Monthly Salary",
    "Annual Earnings",
    "Compensation Package",
    "Hourly Pay",
    "minimum wage index",
    "WAGES",
    "Base Salary",
    "Total Compensation",
  ];

  for (const name of wageNames) {
    assertEquals(isWageLikeName(name), true, `Should match wage name: ${name}`);
  }

  // Should not match non-wage names
  const nonWageNames = [
    "GDP",
    "Revenue",
    "Cost",
    "Price",
    "Exchange Rate",
    "Interest Rate",
    "Budget",
    "Debt",
  ];

  for (const name of nonWageNames) {
    assertEquals(
      isWageLikeName(name),
      false,
      `Should not match non-wage name: ${name}`,
    );
  }
});

Deno.test("taxonomy: edge cases and ambiguous units", () => {
  // Test ambiguous commodity indicators that could be agriculture
  const goldReserves = {
    id: "gold",
    value: 100,
    unit: "Tonnes",
    name: "Gold Reserves",
  };
  assertEquals(
    bucketForItem(goldReserves),
    "commodities",
    "Gold with Tonnes should be commodities",
  );

  // Test regular tonnes without commodity/agriculture context
  const genericTonnes = {
    id: "generic",
    value: 100,
    unit: "Tonnes",
    name: "Generic Production",
  };
  const result = bucketForItem(genericTonnes);
  assertExists(result, "Generic Tonnes should still classify to a bucket");

  // Test emissions variants
  const co2e = { id: "co2e", value: 100, unit: "MT CO2e", name: "Emissions" };
  assertEquals(
    bucketForItem(co2e),
    "commodities",
    "CO2e should be commodities",
  );

  // Test mixed case handling
  const mixedCase = { id: "mixed", value: 100, unit: "gWh", name: "Energy" };
  assertEquals(
    bucketForItem(mixedCase),
    "commodities",
    "Mixed case GWh should be commodities",
  );
});

Deno.test("taxonomy: monetary flow vs stock differentiation", () => {
  // Test that wages always go to flow regardless of time unit presence
  const wageNoTime = {
    id: "wage",
    value: 5000,
    unit: "USD",
    name: "Minimum Wage",
  };
  assertEquals(
    bucketForItem(wageNoTime),
    "monetaryFlow",
    "Wage without time unit should still be flow",
  );

  // Test that non-wage currency with time goes to flow
  const revenueFlow = {
    id: "rev",
    value: 1000,
    unit: "USD per month",
    name: "Revenue",
  };
  assertEquals(
    bucketForItem(revenueFlow),
    "monetaryFlow",
    "Currency with time (non-wage) should be flow",
  );

  // Test that non-wage currency without time goes to stock
  const revenueStock = { id: "rev", value: 1000, unit: "USD", name: "Revenue" };
  assertEquals(
    bucketForItem(revenueStock),
    "monetaryStock",
    "Currency without time (non-wage) should be stock",
  );
});

Deno.test("taxonomy: ratio detection with slash but no time", () => {
  // Ratios have "/" but no time component
  const exchangeRate = {
    id: "fx",
    value: 1.5,
    unit: "USD/EUR",
    name: "Exchange Rate",
  };
  assertEquals(
    bucketForItem(exchangeRate),
    "ratios",
    "USD/EUR should be ratio",
  );

  const pricePerLiter = {
    id: "price",
    value: 2.5,
    unit: "USD/Liter",
    name: "Fuel Price",
  };
  assertEquals(
    bucketForItem(pricePerLiter),
    "ratios",
    "USD/Liter should be ratio",
  );

  // But currency with time should be flow, not ratio
  const wagePerHour = { id: "wage", value: 15, unit: "USD/hour", name: "Wage" };
  assertEquals(
    bucketForItem(wagePerHour),
    "monetaryFlow",
    "USD/hour should be flow (wage)",
  );

  const revenuePerMonth = {
    id: "rev",
    value: 1000,
    unit: "USD/month",
    name: "Revenue",
  };
  assertEquals(
    bucketForItem(revenuePerMonth),
    "monetaryFlow",
    "USD/month should be flow",
  );
});

Deno.test("taxonomy: all bucket keys are covered", () => {
  const allBuckets: BucketKey[] = [
    "monetaryStock",
    "monetaryFlow",
    "counts",
    "percentages",
    "indices",
    "ratios",
    "commodities",
    "crypto",
  ];

  const coveredBuckets = new Set(testCases.map((tc) => tc.expectedBucket));

  for (const bucket of allBuckets) {
    assertEquals(
      coveredBuckets.has(bucket),
      true,
      `Bucket ${bucket} should have test coverage`,
    );
  }
});
