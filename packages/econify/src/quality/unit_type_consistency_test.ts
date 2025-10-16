import { assertEquals, assertExists } from "jsr:@std/assert@1";
import type { ParsedData } from "../workflows/economic-data-workflow.ts";
import {
  detectUnitTypeInconsistencies,
  getUnitTypeStats,
} from "./unit_type_consistency.ts";

Deno.test("detectUnitTypeInconsistencies - Mixed count and index types", () => {
  const data: ParsedData[] = [
    // 4 count items
    {
      id: "BRA",
      name: "Tourism",
      value: 6770000,
      unit: "Thousand",
      date: "2020-01-01",
    },
    {
      id: "ARG",
      name: "Tourism",
      value: 7400000,
      unit: "Thousand",
      date: "2020-01-01",
    },
    {
      id: "CHL",
      name: "Tourism",
      value: 4500000,
      unit: "Million",
      date: "2020-01-01",
    },
    {
      id: "PER",
      name: "Tourism",
      value: 4400000,
      unit: "persons",
      date: "2020-01-01",
    },
    // 1 index item (outlier)
    {
      id: "ARM",
      name: "Tourism",
      value: 150.5,
      unit: "Index (2020=100)",
      date: "2020-01-01",
    },
  ];

  const result = detectUnitTypeInconsistencies(data, {
    includeDetails: true,
  });

  // All items should be in data (no filtering)
  assertEquals(result.data.length, 5);
  assertEquals(result.incompatible, undefined);

  // Find Armenia (should have warning)
  const armenia = result.data.find((item) => item.id === "ARM");
  assertExists(armenia);
  assertExists(armenia.explain?.qualityWarnings);
  assertEquals(armenia.explain.qualityWarnings.length, 1);
  assertEquals(armenia.explain.qualityWarnings[0].type, "data-quality");
  assertEquals(armenia.explain.qualityWarnings[0].severity, "warning");
  assertEquals(
    armenia.explain.qualityWarnings[0].message.includes("Unit type mismatch"),
    true,
  );
  assertEquals(
    armenia.explain.qualityWarnings[0].message.includes("index"),
    true,
  );
  assertEquals(
    armenia.explain.qualityWarnings[0].message.includes("count"),
    true,
  );

  // Other items should not have warnings
  const brazil = result.data.find((item) => item.id === "BRA");
  assertEquals(brazil?.explain?.qualityWarnings, undefined);
});

Deno.test("detectUnitTypeInconsistencies - Filter incompatible items", () => {
  const data: ParsedData[] = [
    {
      id: "USA",
      name: "GDP Growth",
      value: 2.5,
      unit: "%",
      date: "2020-01-01",
    },
    {
      id: "GBR",
      name: "GDP Growth",
      value: 1.8,
      unit: "percent",
      date: "2020-01-01",
    },
    {
      id: "JPN",
      name: "GDP Growth",
      value: 0.5,
      unit: "Percent",
      date: "2020-01-01",
    },
    // This one is incompatible (points instead of percent)
    {
      id: "CHN",
      name: "GDP Growth",
      value: 150.0,
      unit: "points",
      date: "2020-01-01",
    },
  ];

  const result = detectUnitTypeInconsistencies(data, {
    filterIncompatible: true,
  });

  // Should have 3 items in data (compatible ones)
  assertEquals(result.data.length, 3);

  // Should have 1 in incompatible
  assertEquals(result.incompatible?.length, 1);

  // China should be in incompatible array
  const china = result.incompatible?.find((item) => item.id === "CHN");
  assertExists(china);
  assertExists(china.explain?.qualityWarnings);
  assertEquals(
    china.explain.qualityWarnings[0].message.includes("Unit type mismatch"),
    true,
  );

  // China should NOT be in data array
  const chinaInData = result.data.find((item) => item.id === "CHN");
  assertEquals(chinaInData, undefined);

  // USA should be in data
  const usa = result.data.find((item) => item.id === "USA");
  assertExists(usa);
});

Deno.test("detectUnitTypeInconsistencies - Multiple indicator groups", () => {
  const data: ParsedData[] = [
    // Group 1: Tourism (counts) - 3 counts + 1 index = 75% counts (meets threshold)
    {
      id: "BRA",
      name: "Tourism",
      value: 6770000,
      unit: "Thousand",
      date: "2020-01-01",
    },
    {
      id: "ARG",
      name: "Tourism",
      value: 7400000,
      unit: "Million",
      date: "2020-01-01",
    },
    {
      id: "CHL",
      name: "Tourism",
      value: 4500000,
      unit: "Thousand",
      date: "2020-01-01",
    },
    {
      id: "ARM",
      name: "Tourism",
      value: 150.5,
      unit: "Index (2020=100)",
      date: "2020-01-01",
    },
    // Group 2: Inflation (percentages) - 3 percentages + 1 count = 75% percentages (meets threshold)
    {
      id: "USA",
      name: "Inflation",
      value: 2.5,
      unit: "%",
      date: "2020-01-01",
    },
    {
      id: "GBR",
      name: "Inflation",
      value: 1.8,
      unit: "percent",
      date: "2020-01-01",
    },
    {
      id: "DEU",
      name: "Inflation",
      value: 1.2,
      unit: "Percent",
      date: "2020-01-01",
    },
    {
      id: "JPN",
      name: "Inflation",
      value: 50000,
      unit: "Thousand",
      date: "2020-01-01",
    }, // Wrong!
  ];

  const result = detectUnitTypeInconsistencies(data, {
    filterIncompatible: true,
  });

  // Should filter out 2 incompatible items
  assertEquals(result.data.length, 6);
  assertEquals(result.incompatible?.length, 2);

  // Armenia (index) should be incompatible
  const armenia = result.incompatible?.find((item) => item.id === "ARM");
  assertExists(armenia);

  // Japan (count instead of percentage) should be incompatible
  const japan = result.incompatible?.find((item) => item.id === "JPN");
  assertExists(japan);
});

Deno.test("detectUnitTypeInconsistencies - Compatible count scales", () => {
  const data: ParsedData[] = [
    {
      id: "BRA",
      name: "Population",
      value: 214,
      unit: "Million",
      date: "2020-01-01",
    },
    {
      id: "ARG",
      name: "Population",
      value: 45000,
      unit: "Thousand",
      date: "2020-01-01",
    },
    {
      id: "CHL",
      name: "Population",
      value: 19116201,
      unit: "persons",
      date: "2020-01-01",
    },
    {
      id: "URY",
      name: "Population",
      value: 3500,
      unit: "Thousand",
      date: "2020-01-01",
    },
  ];

  const result = detectUnitTypeInconsistencies(data);

  // All should pass - different count scales are compatible
  assertEquals(result.data.length, 4);
  assertEquals(result.incompatible, undefined);

  // None should have warnings
  result.data.forEach((item) => {
    assertEquals(item.explain?.qualityWarnings, undefined);
  });
});

Deno.test("detectUnitTypeInconsistencies - Compatible currency scales", () => {
  const data: ParsedData[] = [
    {
      id: "USA",
      name: "GDP",
      value: 21000,
      unit: "USD Billion",
      date: "2020-01-01",
    },
    {
      id: "GBR",
      name: "GDP",
      value: 2800000,
      unit: "USD Million",
      date: "2020-01-01",
    },
    {
      id: "JPN",
      name: "GDP",
      value: 5000000,
      unit: "Million USD",
      date: "2020-01-01",
    },
    {
      id: "DEU",
      name: "GDP",
      value: 3800000,
      unit: "EUR Million",
      date: "2020-01-01",
    },
  ];

  const result = detectUnitTypeInconsistencies(data);

  // All should pass - different currency scales/currencies are compatible
  assertEquals(result.data.length, 4);
  assertEquals(result.incompatible, undefined);

  // None should have warnings
  result.data.forEach((item) => {
    assertEquals(item.explain?.qualityWarnings, undefined);
  });
});

Deno.test("detectUnitTypeInconsistencies - Single item group (no check)", () => {
  const data: ParsedData[] = [
    {
      id: "USA",
      name: "Special Metric",
      value: 100,
      unit: "custom unit",
      date: "2020-01-01",
    },
  ];

  const result = detectUnitTypeInconsistencies(data);

  // Single item should pass without checks
  assertEquals(result.data.length, 1);
  assertEquals(result.incompatible, undefined);
  assertEquals(result.data[0].explain?.qualityWarnings, undefined);
});

Deno.test("detectUnitTypeInconsistencies - No dominant type (fragmented)", () => {
  const data: ParsedData[] = [
    {
      id: "A",
      name: "Mixed Metric",
      value: 100,
      unit: "%",
      date: "2020-01-01",
    },
    {
      id: "B",
      name: "Mixed Metric",
      value: 200,
      unit: "points",
      date: "2020-01-01",
    },
    {
      id: "C",
      name: "Mixed Metric",
      value: 300,
      unit: "Thousand",
      date: "2020-01-01",
    },
  ];

  const result = detectUnitTypeInconsistencies(data, {
    dominantTypeThreshold: 0.67, // Need 67% for dominant type
  });

  // No dominant type (33% each), so no warnings
  assertEquals(result.data.length, 3);
  assertEquals(result.incompatible, undefined);

  result.data.forEach((item) => {
    assertEquals(item.explain?.qualityWarnings, undefined);
  });
});

Deno.test("detectUnitTypeInconsistencies - Empty data", () => {
  const data: ParsedData[] = [];

  const result = detectUnitTypeInconsistencies(data);

  assertEquals(result.data.length, 0);
  assertEquals(result.incompatible, undefined);
});

Deno.test("detectUnitTypeInconsistencies - Items with existing warnings", () => {
  const data: ParsedData[] = [
    {
      id: "USA",
      name: "Metric",
      value: 100,
      unit: "%",
      date: "2020-01-01",
      explain: {
        qualityWarnings: [{
          type: "normalization-issue",
          severity: "info",
          message: "Existing warning",
        }],
      },
    },
    {
      id: "GBR",
      name: "Metric",
      value: 200,
      unit: "percent",
      date: "2020-01-01",
    },
    {
      id: "FRA",
      name: "Metric",
      value: 150,
      unit: "Percent",
      date: "2020-01-01",
    },
    {
      id: "JPN",
      name: "Metric",
      value: 300,
      unit: "points",
      date: "2020-01-01",
    }, // Incompatible - 1 index vs 3 percentages = 75% percentages
  ];

  const result = detectUnitTypeInconsistencies(data);

  // USA should keep existing warning (no new warnings added)
  const usa = result.data.find((item) => item.id === "USA");
  assertEquals(usa?.explain?.qualityWarnings?.length, 1);
  assertEquals(usa?.explain?.qualityWarnings?.[0].message, "Existing warning");

  // Japan should have unit type warning
  const japan = result.data.find((item) => item.id === "JPN");
  assertEquals(japan?.explain?.qualityWarnings?.length, 1);
  assertEquals(
    japan?.explain?.qualityWarnings?.[0].message.includes("Unit type mismatch"),
    true,
  );
});

Deno.test("getUnitTypeStats - Distribution by type", () => {
  const data: ParsedData[] = [
    { id: "1", name: "A", value: 1, unit: "%", date: "2020" },
    { id: "2", name: "A", value: 2, unit: "percent", date: "2020" },
    { id: "3", name: "B", value: 3, unit: "points", date: "2020" },
    { id: "4", name: "B", value: 4, unit: "Index", date: "2020" },
    { id: "5", name: "C", value: 5, unit: "Thousand", date: "2020" },
    { id: "6", name: "C", value: 6, unit: "Million", date: "2020" },
    { id: "7", name: "D", value: 7, unit: "USD Million", date: "2020" },
  ];

  const stats = getUnitTypeStats(data);

  assertEquals(stats.totalItems, 7);
  assertEquals(stats.byType.percentage, 2);
  assertEquals(stats.byType.index, 2);
  assertEquals(stats.byType.count, 2);
  assertEquals(stats.byType["currency-amount"], 1);

  // Check by indicator
  assertEquals(stats.byIndicator["A"].percentage, 2);
  assertEquals(stats.byIndicator["B"].index, 2);
  assertEquals(stats.byIndicator["C"].count, 2);
  assertEquals(stats.byIndicator["D"]["currency-amount"], 1);
});

Deno.test("detectUnitTypeInconsistencies - Real world example (Tourist Arrivals)", () => {
  const data: ParsedData[] = [
    {
      id: "BRA",
      name: "Tourist Arrivals",
      value: 6770000,
      unit: "Thousand",
      date: "2020-01-01",
    },
    {
      id: "ARG",
      name: "Tourist Arrivals",
      value: 7400000,
      unit: "Thousand",
      date: "2020-01-01",
    },
    {
      id: "CHL",
      name: "Tourist Arrivals",
      value: 4500000,
      unit: "Thousand",
      date: "2020-01-01",
    },
    {
      id: "ARM",
      name: "Tourist Arrivals",
      value: 520000000,
      unit: "persons", // Scale outlier but same unit TYPE
      date: "2020-01-01",
    },
  ];

  const result = detectUnitTypeInconsistencies(data);

  // All should be compatible (both Thousand and persons are "count" type)
  assertEquals(result.data.length, 4);
  assertEquals(result.incompatible, undefined);

  // None should have unit type warnings
  // (though Armenia might have scale outlier warning from different check)
  result.data.forEach((item) => {
    const hasUnitTypeWarning = item.explain?.qualityWarnings?.some((w) =>
      w.message.includes("Unit type mismatch")
    ) || false;
    assertEquals(hasUnitTypeWarning, false);
  });
});
