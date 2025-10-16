/**
 * Integration tests for unit type consistency detection in pipeline
 */

import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { processEconomicData } from "./pipeline_api.ts";

Deno.test("processEconomicData - Detect unit type mismatches with warnings only", async () => {
  const data = [
    // Tourism - 3 counts + 1 index (75% count, meets threshold)
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
      unit: "Index (2020=100)", // Incompatible!
      date: "2020-01-01",
    },
  ];

  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    detectUnitTypeMismatches: true,
    unitTypeOptions: {
      includeDetails: true,
    },
  });

  // All items should be in result (no filtering)
  assertEquals(result.data.length, 4);
  assertEquals(result.incompatibleUnits, undefined);

  // Armenia should have unit type warning
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
});

Deno.test("processEconomicData - Filter incompatible unit types", async () => {
  const data = [
    // GDP Growth - 3 percentages + 1 index (75% percentage, meets threshold)
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
      id: "DEU",
      name: "GDP Growth",
      value: 1.2,
      unit: "Percent",
      date: "2020-01-01",
    },
    {
      id: "CHN",
      name: "GDP Growth",
      value: 150.0,
      unit: "points", // Incompatible!
      date: "2020-01-01",
    },
  ];

  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    detectUnitTypeMismatches: true,
    unitTypeOptions: {
      filterIncompatible: true,
    },
  });

  // Should filter out China
  assertEquals(result.data.length, 3);
  assertEquals(result.incompatibleUnits?.length, 1);

  // China should be in incompatibleUnits array
  const china = result.incompatibleUnits?.find((item) => item.id === "CHN");
  assertExists(china);
  assertExists(china.explain?.qualityWarnings);
  assertEquals(
    china.explain.qualityWarnings[0].message.includes("Unit type mismatch"),
    true,
  );

  // China should NOT be in data
  const chinaInData = result.data.find((item) => item.id === "CHN");
  assertEquals(chinaInData, undefined);
});

Deno.test("processEconomicData - Compatible unit types (different count scales)", async () => {
  const data = [
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
  ];

  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    detectUnitTypeMismatches: true,
  });

  // All should pass - different count scales are compatible
  assertEquals(result.data.length, 3);
  assertEquals(result.incompatibleUnits, undefined);

  // None should have unit type warnings
  result.data.forEach((item) => {
    const hasUnitTypeWarning = item.explain?.qualityWarnings?.some((w) =>
      w.message.includes("Unit type mismatch")
    ) || false;
    assertEquals(hasUnitTypeWarning, false);
  });
});

Deno.test("processEconomicData - Works with both scale outlier AND unit type detection", async () => {
  const data = [
    // Tourism - mixed issues: scale outlier (ARM high value) + unit type mismatch (ARM index)
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
      unit: "Thousand",
      date: "2020-01-01",
    },
    {
      id: "ARM",
      name: "Tourism",
      value: 520000000, // BOTH scale outlier AND wrong unit type
      unit: "Index (2020=100)",
      date: "2020-01-01",
    },
  ];

  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    detectScaleOutliers: true,
    scaleOutlierOptions: {
      includeDetails: true,
    },
    detectUnitTypeMismatches: true,
    unitTypeOptions: {
      includeDetails: true,
    },
  });

  // All items in result (no filtering enabled)
  assertEquals(result.data.length, 4);

  // Armenia should have unit type warning (not scale outlier since unit type is different)
  const armenia = result.data.find((item) => item.id === "ARM");
  assertExists(armenia);
  assertExists(armenia.explain?.qualityWarnings);

  // Should have unit type warning
  const hasUnitTypeWarning = armenia.explain.qualityWarnings.some((w) =>
    w.message.includes("Unit type mismatch")
  );
  assertEquals(hasUnitTypeWarning, true);
});

Deno.test("processEconomicData - Unit type detection disabled by default", async () => {
  const data = [
    {
      id: "USA",
      name: "Metric",
      value: 100,
      unit: "%",
      date: "2020-01-01",
    },
    {
      id: "CHN",
      name: "Metric",
      value: 150,
      unit: "points", // Would be flagged if detection was on
      date: "2020-01-01",
    },
  ];

  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    // detectUnitTypeMismatches NOT enabled
  });

  // No warnings should be added
  result.data.forEach((item) => {
    assertEquals(item.explain?.qualityWarnings, undefined);
  });
});
