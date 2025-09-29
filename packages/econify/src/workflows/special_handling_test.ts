import { assertEquals } from "@std/assert";
import { processEconomicData } from "../api/pipeline_api.ts";
import type { ParsedData } from "./economic-data-workflow.ts";

Deno.test("specialHandling: unitOverrides by indicator name", async () => {
  const data: ParsedData[] = [
    {
      id: "ARGENTINACARREG",
      name: "Car Registrations",
      value: 51766,
      unit: "Thousand", // Misleading label - value is already the count
      scale: "Thousands",
      periodicity: "Monthly",
    },
    {
      id: "AUSTRALIACARREG",
      name: "Car Registrations",
      value: 16245,
      unit: "Units", // Correct label
      periodicity: "Monthly",
    },
  ];

  const result = await processEconomicData(data, {
    specialHandling: {
      unitOverrides: [
        {
          indicatorNames: ["Car Registrations"],
          overrideUnit: "Units",
          overrideScale: null,
          reason: "Database stores 'Thousand' as label, not scale factor",
        },
      ],
    },
    explain: true,
  });

  // Both should have same unit after override
  assertEquals(result.data[0].unit, "Units");
  assertEquals(result.data[1].unit, "Units");

  // ARG should NOT be scaled (51766 stays 51766, not 51766000)
  assertEquals(result.data[0].value, 51766);
  assertEquals(result.data[1].value, 16245);
});

Deno.test("specialHandling: unitOverrides by indicator ID", async () => {
  const data: ParsedData[] = [
    {
      id: "ARGENTINACARREG",
      name: "Car Registrations",
      value: 51766,
      unit: "Thousand",
      scale: "Thousands",
    },
    {
      id: "BRAZILCARREG",
      name: "Car Registrations",
      value: 225400,
      unit: "Thousand",
      scale: "Thousands",
    },
    {
      id: "AUSTRALIACARREG",
      name: "Car Registrations",
      value: 16245,
      unit: "Units",
    },
  ];

  const result = await processEconomicData(data, {
    specialHandling: {
      unitOverrides: [
        {
          indicatorIds: ["ARGENTINACARREG", "BRAZILCARREG"],
          overrideUnit: "Units",
          overrideScale: null,
        },
      ],
    },
  });

  // ARG and BRA should be overridden
  assertEquals(result.data[0].unit, "Units");
  assertEquals(result.data[1].unit, "Units");
  assertEquals(result.data[2].unit, "Units");

  // Values should not be scaled
  assertEquals(result.data[0].value, 51766);
  assertEquals(result.data[1].value, 225400);
  assertEquals(result.data[2].value, 16245);
});

Deno.test("specialHandling: without override, Thousand is scaled", async () => {
  const data: ParsedData[] = [
    {
      id: "ARGENTINACARREG",
      name: "Car Registrations",
      value: 51766,
      unit: "Thousand",
      scale: "Thousands",
    },
  ];

  const result = await processEconomicData(data, {
    // No special handling - should scale normally
    explain: true,
  });

  // Should be scaled: 51766 * 1000 = 51766000
  assertEquals(result.data[0].normalized, 51766000);
});

Deno.test("specialHandling: case-insensitive name matching", async () => {
  const data: ParsedData[] = [
    {
      id: "TEST1",
      name: "car registrations", // lowercase
      value: 100,
      unit: "Thousand",
      scale: "Thousands",
    },
    {
      id: "TEST2",
      name: "CAR REGISTRATIONS", // uppercase
      value: 200,
      unit: "Thousand",
      scale: "Thousands",
    },
    {
      id: "TEST3",
      name: "Car Registrations", // mixed case
      value: 300,
      unit: "Thousand",
      scale: "Thousands",
    },
  ];

  const result = await processEconomicData(data, {
    specialHandling: {
      unitOverrides: [
        {
          indicatorNames: ["Car Registrations"], // Should match all cases
          overrideUnit: "Units",
          overrideScale: null,
        },
      ],
    },
  });

  // All should be overridden
  assertEquals(result.data[0].unit, "Units");
  assertEquals(result.data[1].unit, "Units");
  assertEquals(result.data[2].unit, "Units");

  // Values should not be scaled
  assertEquals(result.data[0].value, 100);
  assertEquals(result.data[1].value, 200);
  assertEquals(result.data[2].value, 300);
});

Deno.test("specialHandling: multiple overrides for different indicators", async () => {
  const data: ParsedData[] = [
    {
      id: "CARREGS",
      name: "Car Registrations",
      value: 1000,
      unit: "Thousand",
      scale: "Thousands",
    },
    {
      id: "POPULATION",
      name: "Population",
      value: 5000,
      unit: "Hundreds",
      scale: "Hundreds",
    },
    {
      id: "GDP",
      name: "GDP",
      value: 100,
      unit: "USD Million",
    },
  ];

  const result = await processEconomicData(data, {
    specialHandling: {
      unitOverrides: [
        {
          indicatorNames: ["Car Registrations"],
          overrideUnit: "Units",
          overrideScale: null,
        },
        {
          indicatorNames: ["Population"],
          overrideUnit: "People",
          overrideScale: null,
        },
      ],
    },
  });

  // Car Registrations and Population should be overridden
  assertEquals(result.data[0].unit, "Units");
  assertEquals(result.data[1].unit, "People");
  // GDP should remain unchanged
  assertEquals(result.data[2].unit, "USD Million");

  // Values should not be scaled for overridden indicators
  assertEquals(result.data[0].value, 1000);
  assertEquals(result.data[1].value, 5000);
});

Deno.test("specialHandling: no match, no override applied", async () => {
  const data: ParsedData[] = [
    {
      id: "GDP",
      name: "GDP",
      value: 100,
      unit: "USD Million",
    },
  ];

  const result = await processEconomicData(data, {
    specialHandling: {
      unitOverrides: [
        {
          indicatorNames: ["Car Registrations"], // Doesn't match GDP
          overrideUnit: "Units",
          overrideScale: null,
        },
      ],
    },
  });

  // Should remain unchanged
  assertEquals(result.data[0].unit, "USD Million");
  assertEquals(result.data[0].value, 100);
});
