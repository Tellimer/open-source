/**
 * Integration tests for specific user scenarios
 *
 * Tests the exact issues reported by users:
 * 1. Car registration data not being normalized properly
 * 2. Minimum wages missing explain metadata
 */

import { assertEquals, assertExists, assertFalse } from "@std/assert";
import { processEconomicData } from "./main.ts";
import type { FXTable } from "./types.ts";

import type { ParsedData } from "./main.ts";

// Exact data from user's car registration example
const carRegistrationUserData = [
  {
    indicator_id: "CAR_REGISTRATIONS",
    indicator_name: "Car Registrations",
    indicator_type: "count", // From @tellimer/classify
    countries: {
      ARG: {
        value: 50186.0,
        unit: "Thousands",
        tooltip: {
          indicatorId: "ARGENTINACAREEG",
          currency: null,
          units: "Thousands",
          periodicity: "Monthly",
        },
      },
      AUS: {
        value: 16245.0,
        unit: "Units",
        tooltip: {
          indicatorId: "AUSTRALIACARREG",
          currency: null,
          units: "Units",
          periodicity: "Monthly",
        },
      },
      BHR: {
        value: 338.02,
        unit: "Hundreds",
        tooltip: {
          indicatorId: "BAHRAINCARREG",
          currency: null,
          units: "Hundreds",
          periodicity: "Monthly",
        },
      },
    },
  },
];

// Exact data from user's minimum wages example
const minimumWagesUserData = [
  {
    indicator_id: "MINIMUM_WAGES",
    indicator_name: "Minimum Wages",
    indicator_type: "flow", // From @tellimer/classify - wages are flow
    countries: {
      AGO: {
        value: 32181.15,
        unit: "AOA/Month",
        tooltip: {
          indicatorId: "ANGOLAMINWAG",
          currency: "AOA",
          units: "AOA/Month",
          periodicity: "Yearly",
          original_value: "32181.150",
        },
      },
      ALB: {
        value: 40000.0,
        unit: "ALL/Month",
        tooltip: {
          indicatorId: "ALBANIAMINWAG",
          currency: "ALL",
          units: "ALL/Month",
          periodicity: "Quarterly",
          original_value: "40000.000",
        },
      },
      ARG: {
        value: 322000.0,
        unit: "ARS/Month",
        tooltip: {
          indicatorId: "ARGENTINAMINWAG",
          currency: "ARS",
          units: "ARS/Month",
          periodicity: "Monthly",
          original_value: "322000.000",
        },
      },
    },
  },
];

// Convert user data format to econify format
function convertUserDataToEconifyFormat(
  userData: Array<Record<string, unknown>>,
): ParsedData[] {
  const result: Array<Record<string, unknown>> = [];

  for (const indicator of userData) {
    for (
      const [countryCode, countryData] of Object.entries(
        (indicator as { countries: Record<string, unknown> }).countries,
      )
    ) {
      const data = countryData as Record<string, unknown>;
      const tooltip = (data.tooltip ?? {}) as Record<string, unknown>;
      result.push({
        id: `${countryCode}_${
          (indicator as { indicator_id: string }).indicator_id
        }`,
        name: `${countryCode} ${
          (indicator as { indicator_name: string }).indicator_name
        }`,
        value: data.value as number,
        unit: data.unit as string,
        currency: tooltip.currency as string | null | undefined,
        periodicity: tooltip.periodicity as string | null | undefined,
        indicator_type:
          (indicator as { indicator_type?: string }).indicator_type,
      });
    }
  }

  return result as unknown as ParsedData[];
}

// FX rates similar to what would be used in production
const productionFX: FXTable = {
  base: "USD",
  rates: {
    AOA: 912.5, // Angola Kwanza
    ALL: 92.0, // Albanian Lek
    ARS: 1465.0, // Argentine Peso
  },
};

Deno.test("User Scenario - Car registrations normalization", async () => {
  const carRegData = convertUserDataToEconifyFormat(carRegistrationUserData);

  const result = await processEconomicData(carRegData, {
    targetCurrency: "USD",
    targetMagnitude: "ones",
    explain: true,
    useLiveFX: false,
    fxFallback: productionFX,
  });

  assertEquals(result.data.length, 3);

  // Test Argentina (Thousands)
  const argItem = result.data.find((item) => String(item.id).includes("ARG"));
  assertExists(argItem);
  assertEquals(argItem.normalized, 50186000); // 50186 * 1000
  assertEquals(argItem.normalizedUnit, "ones");

  // Should NOT have currency conversion
  if (argItem.explain?.fx) {
    assertFalse(
      true,
      "Argentina car registrations should not have FX conversion",
    );
  }

  // Test Australia (Units)
  const ausItem = result.data.find((item) => String(item.id).includes("AUS"));
  assertExists(ausItem);
  assertEquals(ausItem.normalized, 16245); // 16245 * 1
  assertEquals(ausItem.normalizedUnit, "ones");

  // Test Bahrain (Hundreds)
  const bhrItem = result.data.find((item) => String(item.id).includes("BHR"));
  assertExists(bhrItem);
  assertEquals(bhrItem.normalized, 33802); // 338.02 * 100
  assertEquals(bhrItem.normalizedUnit, "ones");

  console.log(
    "✅ Car registrations normalized correctly without currency conversion",
  );
});

Deno.test("User Scenario - Minimum wages explain metadata", async () => {
  const wagesData = convertUserDataToEconifyFormat(minimumWagesUserData);

  const result = await processEconomicData(wagesData, {
    targetCurrency: "USD",
    targetMagnitude: "ones",
    explain: true, // This should now work for wages
    useLiveFX: false,
    fxFallback: productionFX,
  });

  assertEquals(result.data.length, 3);

  // Test each wage item has explain metadata
  result.data.forEach((item) => {
    assertExists(item.normalized);
    assertExists(item.normalizedUnit);
    assertEquals(item.normalizedUnit, "USD per month");

    // Should have explain metadata (this was the bug)
    assertExists(item.explain, `${item.id} missing explain metadata`);
    assertExists(item.explain.currency);
    assertExists(item.explain.fx);

    // Check currency conversion details
    assertEquals(item.explain.currency.normalized, "USD");
    assertExists(item.explain.fx.rate);
    assertEquals(item.explain.fx.source, "fallback");

    // Should have conversion summary
    assertExists(item.explain.conversion);
    assertExists(item.explain.conversion.summary);
  });

  // Test specific values match expected conversions
  const agoItem = result.data.find((item) => String(item.id).includes("AGO"));
  assertExists(agoItem);
  const expectedAgoValue = 32181.15 / 912.5; // AOA to USD
  assertEquals(Math.abs(agoItem.normalized! - expectedAgoValue) < 0.01, true);

  console.log("✅ Minimum wages now include complete explain metadata");
});

Deno.test("User Scenario - Mixed data processing", async () => {
  // Combine both car registrations and wages data
  const carRegData = convertUserDataToEconifyFormat(carRegistrationUserData);
  const wagesData = convertUserDataToEconifyFormat(minimumWagesUserData);
  const mixedData = [...carRegData, ...wagesData];

  const result = await processEconomicData(mixedData, {
    targetCurrency: "USD",
    targetMagnitude: "ones",
    explain: true,
    useLiveFX: false,
    fxFallback: productionFX,
  });

  assertEquals(result.data.length, 6);

  // Separate the two types by indicator id to avoid formatting brittleness
  const carRegItems = result.data.filter((item) =>
    String(item.id).includes("_CAR_REGISTRATIONS")
  );
  const wageItems = result.data.filter((item) =>
    String(item.id).includes("_MINIMUM_WAGES")
  );

  assertEquals(carRegItems.length, 3);
  assertEquals(wageItems.length, 3);

  // Car registrations should not have FX conversion
  carRegItems.forEach((item) => {
    assertEquals(item.normalizedUnit, "ones");
    if (item.explain?.fx) {
      assertFalse(
        true,
        `Car registration ${item.id} should not have FX conversion`,
      );
    }
  });

  // Wages should have explain metadata with FX conversion
  wageItems.forEach((item) => {
    assertEquals(item.normalizedUnit, "USD per month");
    assertExists(item.explain, `Wage ${item.id} missing explain metadata`);
    assertExists(item.explain.fx);
    assertEquals(item.explain.currency?.normalized, "USD");
  });

  console.log("✅ Mixed data processing works correctly for both scenarios");
});

Deno.test("User Scenario - Backwards compatibility", async () => {
  // Test that existing functionality still works
  const traditionalData = [
    {
      id: "GDP_TEST",
      name: "GDP Test",
      value: 1000,
      unit: "USD Million",
    },
    {
      id: "INFLATION_TEST",
      name: "Inflation Test",
      value: 3.5,
      unit: "%",
    },
  ];

  const result = await processEconomicData(traditionalData, {
    targetCurrency: "USD",
    targetMagnitude: "millions",
    explain: true,
    useLiveFX: false,
    fxFallback: productionFX,
  });

  assertEquals(result.data.length, 2);

  // GDP should be normalized to millions
  const gdpItem = result.data.find((item) => item.id === "GDP_TEST");
  assertExists(gdpItem);
  assertEquals(gdpItem.normalized, 1000);
  assertEquals(gdpItem.normalizedUnit, "USD millions");

  // Inflation should remain as percentage
  const inflationItem = result.data.find((item) =>
    item.id === "INFLATION_TEST"
  );
  assertExists(inflationItem);
  assertEquals(inflationItem.normalized, 3.5);
  assertEquals(inflationItem.normalizedUnit, "%");

  console.log("✅ Backwards compatibility maintained");
});
