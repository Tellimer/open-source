/**
 * Comprehensive End-to-End Testing for Econify
 *
 * Tests multiple indicator types with REAL DATABASE DATA from non-IMF sources:
 * - Monetary flows (GDP, Current Account Balance)
 * - Stocks (Population)
 * - Percentages (Unemployment Rate, Inflation Rate)
 * - Indexes (CPI, REER)
 * - Different periodicities (Annual, Monthly)
 * - Different scales (Billions, Millions, Units, None)
 * - Auto-targeting behavior
 * - Explain metadata accuracy
 * - Normalization correctness
 *
 * Data sources: World Bank, Bruegel, European Central Bank
 */

import { assert, assertEquals, assertExists } from "jsr:@std/assert@1";
import { processEconomicDataByIndicator } from "../api/batch_session_api.ts";
import type { ParsedData } from "./economic-data-workflow.ts";

Deno.test("E2E: GDP (World Bank, monetary flow, annual, USD)", async () => {
  // Real data from World Bank for 2023
  // NOTE: World Bank data doesn't include explicit scale, so values are in "ones"
  const data: ParsedData[] = [
    {
      id: "NY.GDP.MKTP.CDBRA2023",
      name: "GDP (current US$)",
      value: 2173665655937.270,
      unit: "Current USD",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "BRA", source: "World Bank" },
    },
    {
      id: "NY.GDP.MKTP.CDCHN2023",
      name: "GDP (current US$)",
      value: 17794783039552.000,
      unit: "Current USD",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "CHN", source: "World Bank" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    targetCurrency: "USD",
    targetMagnitude: "billions", // Explicitly target billions since data has no scale
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Should be scaled to billions
  // BRA: 2,173,665,655,937 → 2,173.67 billions
  // CHN: 17,794,783,039,552 → 17,794.78 billions
  console.log(
    "GDP Results:",
    result.data.map((d) => ({
      id: d.id,
      value: d.value,
      normalized: d.normalized,
      unit: d.unit,
      normalizedUnit: d.normalizedUnit,
      explain: d.explain?.targetSelection,
    })),
  );
  assertEquals(Math.round(result.data[0].normalized!), 2174);
  assertEquals(Math.round(result.data[1].normalized!), 17795);

  // Check normalized units
  assertExists(result.data[0].normalizedUnit);
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("usd"),
    true,
  );
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("billion"),
    true,
  );

  // Check explain metadata
  const explain = result.data[0].explain;
  assertExists(explain);
  assertExists(explain.targetSelection);
  assertEquals(explain.targetSelection.selected.magnitude, "billions");

  // Check shares at indicator level
  assertExists(result.targetSelectionsByIndicator);
  const gdpSelection = result.targetSelectionsByIndicator["gdp (current us$)"];
  assertExists(gdpSelection);
});

Deno.test("E2E: Population (World Bank, stock, annual, count)", async () => {
  // Real data from World Bank for 2023
  const data: ParsedData[] = [
    {
      id: "SP.POP.TOTLCHN2023",
      name: "Population, total",
      value: 1410710000.000,
      unit: "Number",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "CHN", source: "World Bank" },
    },
    {
      id: "SP.POP.TOTLIDN2023",
      name: "Population, total",
      value: 281190067.000,
      unit: "Number",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "IDN", source: "World Bank" },
    },
    {
      id: "SP.POP.TOTLIND2023",
      name: "Population, total",
      value: 1438069596.000,
      unit: "Number",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "IND", source: "World Bank" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    targetMagnitude: "millions", // Explicitly target millions since data has no scale
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Population is a stock - should NOT be time-normalized
  // Should auto-target to millions for readability
  // CHN: 1,410,710,000 → 1,410.71 millions
  // IDN: 281,190,067 → 281.19 millions
  // IND: 1,438,069,596 → 1,438.07 millions
  console.log(
    "Population Results:",
    result.data.map((d) => ({
      id: d.id,
      value: d.value,
      normalized: d.normalized,
      unit: d.unit,
      normalizedUnit: d.normalizedUnit,
      explain: d.explain?.targetSelection,
    })),
  );
  assertEquals(Math.round(result.data[0].normalized!), 1411);
  assertEquals(Math.round(result.data[1].normalized!), 281);
  assertEquals(Math.round(result.data[2].normalized!), 1438);

  // Check normalized units
  assertExists(result.data[0].normalizedUnit);

  // Check explain
  const explain = result.data[0].explain;
  assertExists(explain);
  assertExists(explain.targetSelection);
  assertEquals(explain.targetSelection.selected.magnitude, "millions");
});

Deno.test("E2E: Unemployment Rate (World Bank, percentage, annual)", async () => {
  // Real data from World Bank for 2023
  const data: ParsedData[] = [
    {
      id: "SL.UEM.TOTL.ZSGRC2023",
      name:
        "Unemployment, total (% of total labor force) (modeled ILO estimate)",
      value: 11.066,
      unit: "% of total labor force",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "GRC", source: "World Bank" },
    },
    {
      id: "SL.UEM.TOTL.ZSZAF2023",
      name:
        "Unemployment, total (% of total labor force) (modeled ILO estimate)",
      value: 32.098,
      unit: "% of total labor force",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "ZAF", source: "World Bank" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Percentages should remain unchanged
  assertEquals(result.data[0].normalized, 11.066);
  assertEquals(result.data[1].normalized, 32.098);

  // Check that it's classified as percentage
  assertExists(result.data[0].normalizedUnit);
  const unitLower = result.data[0].normalizedUnit!.toLowerCase();
  assertEquals(unitLower.includes("percent") || unitLower.includes("%"), true);
});

Deno.test("E2E: Inflation Rate (World Bank, percentage, annual)", async () => {
  // Real data from World Bank for 2023 - includes hyperinflation case
  const data: ParsedData[] = [
    {
      id: "FP.CPI.TOTL.ZGTUR2023",
      name: "Inflation, consumer prices (annual %)",
      value: 53.859,
      unit: "Annual %",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "TUR", source: "World Bank" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Percent change should remain unchanged
  assertEquals(result.data[0].normalized, 53.859);

  // Check that it's classified as percentage
  assertExists(result.data[0].normalizedUnit);
  const unitLower = result.data[0].normalizedUnit!.toLowerCase();
  assertEquals(unitLower.includes("percent") || unitLower.includes("%"), true);
});

Deno.test("E2E: CPI Index (World Bank, index, annual)", async () => {
  // Real data from World Bank for 2023
  const data: ParsedData[] = [
    {
      id: "FP.CPI.TOTLBRA2023",
      name: "Consumer price index (2010 = 100)",
      value: 213.875,
      unit: "Index, 2010=100",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "BRA", source: "World Bank" },
    },
    {
      id: "FP.CPI.TOTLIND2023",
      name: "Consumer price index (2010 = 100)",
      value: 216.862,
      unit: "Index, 2010=100",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "IND", source: "World Bank" },
    },
    {
      id: "FP.CPI.TOTLZAF2023",
      name: "Consumer price index (2010 = 100)",
      value: 194.897,
      unit: "Index, 2010=100",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "ZAF", source: "World Bank" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Index values should remain unchanged
  assertEquals(result.data[0].normalized, 213.875);
  assertEquals(result.data[1].normalized, 216.862);
  assertEquals(result.data[2].normalized, 194.897);

  // Check that it's classified as index
  assertExists(result.data[0].normalizedUnit);
  const unitLower = result.data[0].normalizedUnit!.toLowerCase();
  assertEquals(unitLower.includes("index"), true);
});

Deno.test("E2E: Current Account Balance (World Bank, monetary flow, annual, USD)", async () => {
  // Real data from World Bank for 2023
  const data: ParsedData[] = [
    {
      id: "BN.CAB.XOKA.CDCHN2023",
      name: "Current account balance (BoP, current US$)",
      value: 252987271344.740,
      unit: "Current USD",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "CHN", source: "World Bank" },
    },
    {
      id: "BN.CAB.XOKA.CDSAU2023",
      name: "Current account balance (BoP, current US$)",
      value: 35133266931.351,
      unit: "Current USD",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "SAU", source: "World Bank" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    targetCurrency: "USD",
    targetMagnitude: "billions", // Explicitly target billions since data has no scale
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Should be scaled to billions
  // CHN: 252,987,271,344.74 → 252.99 billions
  // SAU: 35,133,266,931.35 → 35.13 billions
  assertEquals(Math.round(result.data[0].normalized!), 253);
  assertEquals(Math.round(result.data[1].normalized!), 35);

  // Check normalized units
  assertExists(result.data[0].normalizedUnit);
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("usd"),
    true,
  );
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("billion"),
    true,
  );

  // Check explain metadata
  const explain = result.data[0].explain;
  assertExists(explain);
  assertExists(explain.targetSelection);
  assertEquals(explain.targetSelection.selected.currency, "USD");
  assertEquals(explain.targetSelection.selected.magnitude, "billions");
});

Deno.test("E2E: Business Confidence (Bank of Albania, points, monthly)", async () => {
  // Real data from Bank of Albania for 2024
  const data: ParsedData[] = [
    {
      id: "ALBANIABUSCON_ALB_2024-10",
      name: "Business Confidence",
      value: -3.1,
      unit: "points",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: { country_iso: "ALB", source: "Bank of Albania" },
    },
    {
      id: "ALBANIABUSCON_ALB_2024-11",
      name: "Business Confidence",
      value: -2.5,
      unit: "points",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-11-30",
      metadata: { country_iso: "ALB", source: "Bank of Albania" },
    },
    {
      id: "ALBANIABUSCON_ALB_2024-12",
      name: "Business Confidence",
      value: -2.2,
      unit: "points",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-12-31",
      metadata: { country_iso: "ALB", source: "Bank of Albania" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Points should remain unchanged (dimensionless)
  assertEquals(result.data[0].normalized, -3.1);
  assertEquals(result.data[1].normalized, -2.5);
  assertEquals(result.data[2].normalized, -2.2);

  // Check normalized units contain "points"
  assertExists(result.data[0].normalizedUnit);
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("point"),
    true,
  );
});

Deno.test("E2E: Corporate Tax Rate (Guatemala, percentage, yearly)", async () => {
  // Real data from Guatemala tax authority
  const data: ParsedData[] = [
    {
      id: "GTMCORPTAX_GTM_2023",
      name: "Corporate Tax Rate",
      value: 25.0,
      unit: "%",
      scale: undefined,
      periodicity: "Yearly",
      date: "2023-12-31",
      metadata: {
        country_iso: "GTM",
        source: "Superintendence of the Tax Administration",
      },
    },
    {
      id: "GTMCORPTAX_GTM_2024",
      name: "Corporate Tax Rate",
      value: 25.0,
      unit: "%",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: {
        country_iso: "GTM",
        source: "Superintendence of the Tax Administration",
      },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Percentages should remain unchanged
  assertEquals(result.data[0].normalized, 25.0);
  assertEquals(result.data[1].normalized, 25.0);

  // Check normalized unit is "%"
  assertEquals(result.data[0].normalizedUnit, "%");
  assertEquals(result.data[1].normalizedUnit, "%");
});

Deno.test("E2E: Stock Market Index (Bulgaria SOFIX, points, daily)", async () => {
  // Real data from Bulgarian stock exchange
  const data: ParsedData[] = [
    {
      id: "SOFIX_BGR_2024-01-02",
      name: "Stock Market",
      value: 768.87,
      unit: "points",
      scale: undefined,
      periodicity: "Daily",
      date: "2024-01-02",
      metadata: { country_iso: "BGR", source: "OTC/CFD" },
    },
    {
      id: "SOFIX_BGR_2024-01-03",
      name: "Stock Market",
      value: 757.78,
      unit: "points",
      scale: undefined,
      periodicity: "Daily",
      date: "2024-01-03",
      metadata: { country_iso: "BGR", source: "OTC/CFD" },
    },
    {
      id: "SOFIX_BGR_2024-01-04",
      name: "Stock Market",
      value: 764.52,
      unit: "points",
      scale: undefined,
      periodicity: "Daily",
      date: "2024-01-04",
      metadata: { country_iso: "BGR", source: "OTC/CFD" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Points should remain unchanged (index values are dimensionless)
  assertEquals(result.data[0].normalized, 768.87);
  assertEquals(result.data[1].normalized, 757.78);
  assertEquals(result.data[2].normalized, 764.52);

  // Check normalized units contain "points"
  assertExists(result.data[0].normalizedUnit);
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("point"),
    true,
  );
});

Deno.test("E2E: Gold Reserves (World Gold Council, tonnes, quarterly)", async () => {
  // Real data from World Gold Council for Q4 2024
  const data: ParsedData[] = [
    {
      id: "SPAINGOLRES_ESP_2024Q4",
      name: "Gold Reserves",
      value: 281.58,
      unit: "Tonnes",
      scale: undefined,
      periodicity: "Quarterly",
      date: "2024-12-31",
      metadata: { country_iso: "ESP", source: "World Gold Council" },
    },
    {
      id: "SWEDENGOLRES_SWE_2024Q4",
      name: "Gold Reserves",
      value: 125.72,
      unit: "Tonnes",
      scale: undefined,
      periodicity: "Quarterly",
      date: "2024-12-31",
      metadata: { country_iso: "SWE", source: "World Gold Council" },
    },
    {
      id: "KENYAGOLRES_KEN_2024Q4",
      name: "Gold Reserves",
      value: 0.02,
      unit: "Tonnes",
      scale: undefined,
      periodicity: "Quarterly",
      date: "2024-12-31",
      metadata: { country_iso: "KEN", source: "World Gold Council" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Tonnes should remain unchanged (physical unit, no scaling)
  assertEquals(result.data[0].normalized, 281.58);
  assertEquals(result.data[1].normalized, 125.72);
  assertEquals(result.data[2].normalized, 0.02);

  // Check normalized units contain "tonnes"
  assertExists(result.data[0].normalizedUnit);
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("tonne"),
    true,
  );
});

Deno.test("E2E: Gasoline Prices (Singapore, USD/Liter, monthly)", async () => {
  // Real data from Singapore Petroleum Company
  const data: ParsedData[] = [
    {
      id: "SingaporeGasPri_SGP_2024-10",
      name: "Gasoline Prices",
      value: 2.45,
      unit: "USD/Liter",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: {
        country_iso: "SGP",
        source: "Singapore Petroleum Company Limited",
      },
    },
    {
      id: "SingaporeGasPri_SGP_2024-11",
      name: "Gasoline Prices",
      value: 2.38,
      unit: "USD/Liter",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-11-30",
      metadata: {
        country_iso: "SGP",
        source: "Singapore Petroleum Company Limited",
      },
    },
    {
      id: "SingaporeGasPri_SGP_2024-12",
      name: "Gasoline Prices",
      value: 2.42,
      unit: "USD/Liter",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-12-31",
      metadata: {
        country_iso: "SGP",
        source: "Singapore Petroleum Company Limited",
      },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    targetCurrency: "USD",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Prices should remain unchanged (already in USD per unit volume)
  assertEquals(result.data[0].normalized, 2.45);
  assertEquals(result.data[1].normalized, 2.38);
  assertEquals(result.data[2].normalized, 2.42);

  // Check normalized units - composite units (USD/Liter) should be preserved
  assertExists(result.data[0].normalizedUnit);
  // The unit should contain the original composite structure
  assertEquals(
    result.data[0].normalizedUnit?.includes("USD") ||
      result.data[0].normalizedUnit?.toLowerCase().includes("usd"),
    true,
  );
});

Deno.test("E2E: Electricity Production (Austria EUROSTAT, Gigawatt-hour, monthly)", async () => {
  // Real data from EUROSTAT for Austria
  const data: ParsedData[] = [
    {
      id: "OEELECTRICITY_AUT_2024-01",
      name: "Electricity Production",
      value: 7240.02,
      unit: "Gigawatt-hour",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-01-31",
      metadata: { country_iso: "AUT", source: "EUROSTAT" },
    },
    {
      id: "OEELECTRICITY_AUT_2024-02",
      name: "Electricity Production",
      value: 6850.15,
      unit: "Gigawatt-hour",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-02-29",
      metadata: { country_iso: "AUT", source: "EUROSTAT" },
    },
    {
      id: "OEELECTRICITY_AUT_2024-03",
      name: "Electricity Production",
      value: 6920.45,
      unit: "Gigawatt-hour",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-03-31",
      metadata: { country_iso: "AUT", source: "EUROSTAT" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Energy values should remain unchanged (physical unit)
  assertEquals(result.data[0].normalized, 7240.02);
  assertEquals(result.data[1].normalized, 6850.15);
  assertEquals(result.data[2].normalized, 6920.45);

  // Check normalized units contain "gigawatt" or "gwh"
  assertExists(result.data[0].normalizedUnit);
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("gigawatt") ||
      result.data[0].normalizedUnit?.toLowerCase().includes("gwh"),
    true,
  );
});

Deno.test("E2E: Government Spending to GDP (Japan OECD, percent of GDP, yearly)", async () => {
  // Real data from OECD for Japan
  const data: ParsedData[] = [
    {
      id: "JAPANGSTG_JPN_2021",
      name: "Government Spending to GDP",
      value: 42.1,
      unit: "percent of GDP",
      scale: undefined,
      periodicity: "Yearly",
      date: "2021-12-31",
      metadata: { country_iso: "JPN", source: "OECD" },
    },
    {
      id: "JAPANGSTG_JPN_2022",
      name: "Government Spending to GDP",
      value: 41.3,
      unit: "percent of GDP",
      scale: undefined,
      periodicity: "Yearly",
      date: "2022-12-31",
      metadata: { country_iso: "JPN", source: "OECD" },
    },
    {
      id: "JAPANGSTG_JPN_2023",
      name: "Government Spending to GDP",
      value: 40.8,
      unit: "percent of GDP",
      scale: undefined,
      periodicity: "Yearly",
      date: "2023-12-31",
      metadata: { country_iso: "JPN", source: "OECD" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Ratio values should remain unchanged (already in percentage)
  assertEquals(result.data[0].normalized, 42.1);
  assertEquals(result.data[1].normalized, 41.3);
  assertEquals(result.data[2].normalized, 40.8);

  // Check normalized units - should be treated as percentage
  assertExists(result.data[0].normalizedUnit);
  // "percent of GDP" should be recognized as a ratio/percentage
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("percent") ||
      result.data[0].normalizedUnit?.includes("%"),
    true,
  );
});

Deno.test("E2E: Cement Production (Kenya, Tonnes, monthly)", async () => {
  // Real data from Kenya National Bureau of Statistics
  const data: ParsedData[] = [
    {
      id: "KENYACEMPRO_KEN_2024-10",
      name: "Cement Production",
      value: 805234,
      unit: "Tonnes",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: {
        country_iso: "KEN",
        source: "Kenya National Bureau of Statistics",
      },
    },
    {
      id: "KENYACEMPRO_KEN_2024-11",
      name: "Cement Production",
      value: 812456,
      unit: "Tonnes",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-11-30",
      metadata: {
        country_iso: "KEN",
        source: "Kenya National Bureau of Statistics",
      },
    },
    {
      id: "KENYACEMPRO_KEN_2024-12",
      name: "Cement Production",
      value: 798123,
      unit: "Tonnes",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-12-31",
      metadata: {
        country_iso: "KEN",
        source: "Kenya National Bureau of Statistics",
      },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    targetMagnitude: "thousands", // Scale to thousands for readability
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Physical units like "Tonnes" don't have implicit scale, so targetMagnitude doesn't apply
  // Values remain unchanged
  console.log(
    "Cement Production Results:",
    result.data.map((d) => ({
      value: d.value,
      normalized: d.normalized,
      unit: d.unit,
      normalizedUnit: d.normalizedUnit,
    })),
  );

  assertEquals(result.data[0].normalized, 805234);
  assertEquals(result.data[1].normalized, 812456);
  assertEquals(result.data[2].normalized, 798123);

  // Check normalized units contain "tonnes"
  assertExists(result.data[0].normalizedUnit);
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("tonne"),
    true,
  );
});

Deno.test("E2E: Temperature (World Bank, celsius, yearly)", async () => {
  // Real data from World Bank climate data
  const data: ParsedData[] = [
    {
      id: "BRATEMP_BRA_2024",
      name: "Temperature",
      value: 26.02,
      unit: "celsius",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: { country_iso: "BRA", source: "Worldbank" },
    },
    {
      id: "ZAFTEMP_ZAF_2024",
      name: "Temperature",
      value: 18.99,
      unit: "celsius",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: { country_iso: "ZAF", source: "Worldbank" },
    },
    {
      id: "INDTEMP_IND_2024",
      name: "Temperature",
      value: 25.15,
      unit: "celsius",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: { country_iso: "IND", source: "Worldbank" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Temperature values should remain unchanged (physical measurement)
  assertEquals(result.data[0].normalized, 26.02);
  assertEquals(result.data[1].normalized, 18.99);
  assertEquals(result.data[2].normalized, 25.15);

  // Check normalized units contain "celsius"
  assertExists(result.data[0].normalizedUnit);
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("celsius"),
    true,
  );
});

Deno.test("E2E: Precipitation (World Bank, mm, yearly)", async () => {
  // Real data from World Bank climate data
  const data: ParsedData[] = [
    {
      id: "PHLPREC_PHL_2024",
      name: "Precipitation",
      value: 2768.13,
      unit: "mm",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: { country_iso: "PHL", source: "Worldbank" },
    },
    {
      id: "KENPREC_KEN_2024",
      name: "Precipitation",
      value: 726.63,
      unit: "mm",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: { country_iso: "KEN", source: "Worldbank" },
    },
    {
      id: "THAPREC_THA_2024",
      name: "Precipitation",
      value: 1622.45,
      unit: "mm",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: { country_iso: "THA", source: "Worldbank" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Precipitation values should remain unchanged (physical measurement)
  assertEquals(result.data[0].normalized, 2768.13);
  assertEquals(result.data[1].normalized, 726.63);
  assertEquals(result.data[2].normalized, 1622.45);

  // Check normalized units contain "mm"
  assertExists(result.data[0].normalizedUnit);
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("mm"),
    true,
  );
});

Deno.test("E2E: Crude Oil Production (OPEC, BBL/D/1K, monthly)", async () => {
  // Real data from OPEC
  const data: ParsedData[] = [
    {
      id: "IRAQCRUOILPRO_IRQ_2024-10",
      name: "Crude Oil Production",
      value: 3742,
      unit: "BBL/D/1K",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: {
        country_iso: "IRQ",
        source: "Organization of the Petroleum Exporting Countries",
      },
    },
    {
      id: "SAUCRUOILPRO_SAU_2024-10",
      name: "Crude Oil Production",
      value: 8965,
      unit: "BBL/D/1K",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: {
        country_iso: "SAU",
        source: "Organization of the Petroleum Exporting Countries",
      },
    },
    {
      id: "ARECRUOILPRO_ARE_2024-10",
      name: "Crude Oil Production",
      value: 2856,
      unit: "BBL/D/1K",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: {
        country_iso: "ARE",
        source: "Organization of the Petroleum Exporting Countries",
      },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Oil production values should remain unchanged (specialized unit)
  assertEquals(result.data[0].normalized, 3742);
  assertEquals(result.data[1].normalized, 8965);
  assertEquals(result.data[2].normalized, 2856);

  // Check normalized units preserve the specialized format
  assertExists(result.data[0].normalizedUnit);
  assertEquals(
    result.data[0].normalizedUnit?.includes("BBL") ||
      result.data[0].normalizedUnit?.toLowerCase().includes("barrel"),
    true,
  );
});

Deno.test("E2E: Retirement Age (Government sources, Years, yearly)", async () => {
  // Real data from government pension authorities
  const data: ParsedData[] = [
    {
      id: "BANGLADESHRETAGEWOM_BGD_2024",
      name: "Retirement Age Women",
      value: 59,
      unit: "Years",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: {
        country_iso: "BGD",
        source: "Government of the People's Republic of Bangladesh",
      },
    },
    {
      id: "JAPANRETAGEMEN_JPN_2024",
      name: "Retirement Age Men",
      value: 65,
      unit: "Years",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: {
        country_iso: "JPN",
        source: "Ministry of Health, Labour and Welfare, Japan",
      },
    },
    {
      id: "GERMANYRETAGEWOM_DEU_2024",
      name: "Retirement Age Women",
      value: 67,
      unit: "Years",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: { country_iso: "DEU", source: "Federal Ministry of Finance" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Age values should remain unchanged (duration measurement)
  // Data is grouped by indicator name, so order is: Women (BGD, DEU), Men (JPN)
  assertEquals(result.data[0].normalized, 59); // BGD Women
  assertEquals(result.data[1].normalized, 67); // DEU Women
  assertEquals(result.data[2].normalized, 65); // JPN Men

  // Check normalized units contain "years"
  assertExists(result.data[0].normalizedUnit);
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("year"),
    true,
  );
});

Deno.test("E2E: Steel Production (World Steel Association, Thousand Tonnes, monthly)", async () => {
  // Real data from World Steel Association
  const data: ParsedData[] = [
    {
      id: "CHSTEEL_CHN_2024-10",
      name: "Steel Production",
      value: 77400,
      unit: "Thousand Tonnes",
      scale: "Thousands",
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: { country_iso: "CHN", source: "World Steel Association" },
    },
    {
      id: "INSTEEL_IND_2024-10",
      name: "Steel Production",
      value: 14100,
      unit: "Thousand Tonnes",
      scale: "Thousands",
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: { country_iso: "IND", source: "World Steel Association" },
    },
    {
      id: "JPNSTEEL_JPN_2024-10",
      name: "Steel Production",
      value: 7250,
      unit: "Thousand Tonnes",
      scale: "Thousands",
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: { country_iso: "JPN", source: "World Steel Association" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Values already in thousands, should remain unchanged
  assertEquals(result.data[0].normalized, 77400);
  assertEquals(result.data[1].normalized, 14100);
  assertEquals(result.data[2].normalized, 7250);

  // Check normalized units
  // Note: Database has explicit scale="Thousands", so it's treated as count data
  // The normalized unit will be "Thousands" (the magnitude)
  assertExists(result.data[0].normalizedUnit);
  assertEquals(result.data[0].normalizedUnit, "Thousands");
});

Deno.test("E2E: Wages in Manufacturing (EUROSTAT, EUR/Month, monthly)", async () => {
  // Real data from national statistics offices
  const data: ParsedData[] = [
    {
      id: "CROATIAWAGINMAN_HRV_2024-10",
      name: "Wages in Manufacturing",
      value: 1321,
      unit: "EUR/Month",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: { country_iso: "HRV", source: "Croatian Bureau of Statistics" },
    },
    {
      id: "MONTENEGROWAGINMAN_MNE_2024-10",
      name: "Wages in Manufacturing",
      value: 1208,
      unit: "EUR/Month",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: {
        country_iso: "MNE",
        source: "Statistical Office of Montenegro",
      },
    },
    {
      id: "SLOVENIAWAGINMAN_SVN_2024-10",
      name: "Wages in Manufacturing",
      value: 1850,
      unit: "EUR/Month",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: {
        country_iso: "SVN",
        source: "Statistical Office of the Republic of Slovenia",
      },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    targetCurrency: "EUR",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Wage values should remain unchanged (already in EUR per month)
  assertEquals(result.data[0].normalized, 1321);
  assertEquals(result.data[1].normalized, 1208);
  assertEquals(result.data[2].normalized, 1850);

  // Check normalized units contain EUR and time dimension
  assertExists(result.data[0].normalizedUnit);
  assertEquals(result.data[0].normalizedUnit?.includes("EUR"), true);
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("month") ||
      result.data[0].normalizedUnit?.includes("/"),
    true,
  );
});

Deno.test("E2E: Average Weekly Hours (China, Hours, monthly)", async () => {
  // Real data from National Bureau of Statistics of China
  const data: ParsedData[] = [
    {
      id: "CHNAVGWEEKLYHOURS_CHN_2024-10",
      name: "Average Weekly Hours",
      value: 48.5,
      unit: "Hours",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: {
        country_iso: "CHN",
        source: "National Bureau of Statistics of China",
      },
    },
    {
      id: "CHNAVGWEEKLYHOURS_CHN_2024-11",
      name: "Average Weekly Hours",
      value: 48.3,
      unit: "Hours",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-11-30",
      metadata: {
        country_iso: "CHN",
        source: "National Bureau of Statistics of China",
      },
    },
    {
      id: "CHNAVGWEEKLYHOURS_CHN_2024-12",
      name: "Average Weekly Hours",
      value: 48.7,
      unit: "Hours",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-12-31",
      metadata: {
        country_iso: "CHN",
        source: "National Bureau of Statistics of China",
      },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Hours values should remain unchanged (time measurement)
  assertEquals(result.data[0].normalized, 48.5);
  assertEquals(result.data[1].normalized, 48.3);
  assertEquals(result.data[2].normalized, 48.7);

  // Check normalized units
  // Note: "Hours" is classified as a time dimension, so only periodicity is shown
  assertExists(result.data[0].normalizedUnit);
  assertEquals(result.data[0].normalizedUnit, "per month");
});

Deno.test("E2E: Nurses per 1000 people (OECD, per 1000 people, yearly)", async () => {
  // Real data from OECD health statistics
  const data: ParsedData[] = [
    {
      id: "ISNURS_ISL_2024",
      name: "Nurses",
      value: 15.66,
      unit: "per 1000 people",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: { country_iso: "ISL", source: "OECD" },
    },
    {
      id: "NORWEGNURS_NOR_2024",
      name: "Nurses",
      value: 18.24,
      unit: "per 1000 people",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: { country_iso: "NOR", source: "OECD" },
    },
    {
      id: "SWITZERLANDNURS_CHE_2024",
      name: "Nurses",
      value: 17.96,
      unit: "per 1000 people",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: { country_iso: "CHE", source: "OECD" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Ratio values should remain unchanged (per capita measurement)
  assertEquals(result.data[0].normalized, 15.66);
  assertEquals(result.data[1].normalized, 18.24);
  assertEquals(result.data[2].normalized, 17.96);

  // Check normalized units contain the ratio
  assertExists(result.data[0].normalizedUnit);
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("per") ||
      result.data[0].normalizedUnit?.includes("/"),
    true,
  );
});

Deno.test("E2E: Wages Mixed Periodicities - Upsampling & Downsampling", async () => {
  // Test data with monthly, quarterly, and yearly wages
  // This tests auto-targeting time scale and up/down sampling
  const data: ParsedData[] = [
    // Monthly wages (Ecuador) - should be unchanged when targeting month
    {
      id: "ECUADORWAG_ECU_2024-10",
      name: "Wages",
      value: 548.26,
      unit: "USD/Month",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: { country_iso: "ECU", source: "Banco Central del Ecuador" },
    },
    {
      id: "ECUADORWAG_ECU_2024-11",
      name: "Wages",
      value: 550.12,
      unit: "USD/Month",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-11-30",
      metadata: { country_iso: "ECU", source: "Banco Central del Ecuador" },
    },
    // Quarterly wages (Estonia) - should be downsampled to monthly (÷3)
    {
      id: "ESTAVERAGEHE_EST_2024Q2",
      name: "Wages",
      value: 12.94,
      unit: "EUR/Hour",
      scale: undefined,
      periodicity: "Quarterly",
      date: "2024-06-30",
      metadata: { country_iso: "EST", source: "Statistics Estonia" },
    },
    {
      id: "ESTAVERAGEHE_EST_2024Q3",
      name: "Wages",
      value: 13.15,
      unit: "EUR/Hour",
      scale: undefined,
      periodicity: "Quarterly",
      date: "2024-09-30",
      metadata: { country_iso: "EST", source: "Statistics Estonia" },
    },
    // Yearly wages (Dominican Republic) - should be downsampled to monthly (÷12)
    {
      id: "DOMMINIMUMWAGES_DOM_2024",
      name: "Wages",
      value: 16993.2,
      unit: "DOP/Month",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: {
        country_iso: "DOM",
        source: "Ministry of Labor, Dominican Republic",
      },
    },
    {
      id: "DOMMINIMUMWAGES_DOM_2025",
      name: "Wages",
      value: 17500.0,
      unit: "DOP/Month",
      scale: undefined,
      periodicity: "Yearly",
      date: "2025-12-31",
      metadata: {
        country_iso: "DOM",
        source: "Ministry of Labor, Dominican Republic",
      },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    targetTimeScale: "month", // Force all to monthly
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Monthly USD/Month data should remain unchanged
  assertEquals(result.data[0].normalized, 548.26); // ECU monthly
  assertEquals(result.data[1].normalized, 550.12); // ECU monthly

  // Quarterly EUR/Hour should be converted to monthly EUR/Month
  // 12.94 EUR/hour × 730 hours/month ≈ 9446.2 EUR/month
  assertEquals(Math.round(result.data[2].normalized!), 9446); // EST quarterly
  assertEquals(Math.round(result.data[3].normalized!), 9600); // EST quarterly

  // Yearly DOP/Month should remain unchanged (already "per month", just different reporting frequency)
  // The unit is already "per month", so no time conversion needed
  assertEquals(result.data[4].normalized, 16993.2); // DOM yearly
  assertEquals(result.data[5].normalized, 17500); // DOM yearly

  // Check that all have monthly time scale in normalized unit
  assertExists(result.data[0].normalizedUnit);
  result.data.forEach((item) => {
    assertExists(item.normalizedUnit);
    // Should contain "month" or "per month" in the normalized unit
    assertEquals(
      item.normalizedUnit?.toLowerCase().includes("month") ||
        item.normalizedUnit?.toLowerCase().includes("/month"),
      true,
    );
  });
});

Deno.test("E2E: Wages Auto-Targeting - Diverse Time Scales", async () => {
  // Test auto-targeting with wages in different time units
  // System should detect dominant time scale and convert all to that scale
  const data: ParsedData[] = [
    // Monthly wages (dominant - 4 out of 9 items)
    {
      id: "ECU_WAGES_2024_10",
      name: "Wages",
      value: 548.26,
      unit: "USD/Month",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: { country_iso: "ECU", source: "Banco Central del Ecuador" },
    },
    {
      id: "ECU_WAGES_2024_11",
      name: "Wages",
      value: 550.12,
      unit: "USD/Month",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-11-30",
      metadata: { country_iso: "ECU", source: "Banco Central del Ecuador" },
    },
    {
      id: "DOM_WAGES_2024",
      name: "Wages",
      value: 16993.2,
      unit: "DOP/Month",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: {
        country_iso: "DOM",
        source: "Ministry of Labor, Dominican Republic",
      },
    },
    {
      id: "DOM_WAGES_2025",
      name: "Wages",
      value: 17500.0,
      unit: "DOP/Month",
      scale: undefined,
      periodicity: "Yearly",
      date: "2025-12-31",
      metadata: {
        country_iso: "DOM",
        source: "Ministry of Labor, Dominican Republic",
      },
    },
    // Hourly wages (2 items)
    {
      id: "CAN_WAGES_2023_07",
      name: "Wages",
      value: 29.68,
      unit: "CAD/Hour",
      scale: undefined,
      periodicity: "Monthly",
      date: "2023-07-31",
      metadata: { country_iso: "CAN", source: "Statistics Canada" },
    },
    {
      id: "EST_WAGES_2024Q2",
      name: "Wages",
      value: 12.94,
      unit: "EUR/Hour",
      scale: undefined,
      periodicity: "Quarterly",
      date: "2024-06-30",
      metadata: { country_iso: "EST", source: "Statistics Estonia" },
    },
    // Weekly wages (2 items)
    {
      id: "AUS_MINWAGE_2023",
      name: "Wages",
      value: 882.8,
      unit: "AUD/week",
      scale: undefined,
      periodicity: "Yearly",
      date: "2023-07-01",
      metadata: { country_iso: "AUS", source: "Fair Work Commission" },
    },
    {
      id: "AUS_MINWAGE_2022",
      name: "Wages",
      value: 812.6,
      unit: "AUD/week",
      scale: undefined,
      periodicity: "Yearly",
      date: "2022-07-01",
      metadata: { country_iso: "AUS", source: "Fair Work Commission" },
    },
    // Yearly wages (1 item)
    {
      id: "CHN_WAGES_2024",
      name: "Wages",
      value: 124110.0,
      unit: "CNY/Year",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: {
        country_iso: "CHN",
        source: "National Bureau of Statistics of China",
      },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"], // Auto-detect dominant time scale
    indicatorKey: "name",
    explain: true,
  });

  // Should have processed all items
  assertEquals(result.data.length, 9);

  // All items should be normalized (wages processing should handle all)
  result.data.forEach((item) => {
    assertExists(item.normalized);
    assertExists(item.normalizedUnit);
  });

  // Check that dominant time scale (month) was auto-detected
  // Since 4/9 items are "per month", that should be the target
  const monthlyItems = result.data.filter((d) =>
    d.normalizedUnit?.toLowerCase().includes("month")
  );

  // At least the monthly items should remain monthly
  assert(
    monthlyItems.length >= 4,
    `Expected at least 4 monthly items, got ${monthlyItems.length}`,
  );

  // Check explain metadata exists
  result.data.forEach((item) => {
    if (item.explain) {
      assertExists(item.explain.domain);
      assertEquals(item.explain.domain, "wages");
    }
  });
});

Deno.test("E2E: Wages with FX Rates - Currency & Time Conversion", async () => {
  // Test wages processing with FX rates for currency conversion
  // AND time scale conversion (hour/week/month/year → month)
  const data: ParsedData[] = [
    // Monthly wages in different currencies
    {
      id: "ECU_WAGES_2024_10",
      name: "Wages",
      value: 548.26,
      unit: "USD/Month",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-10-31",
      metadata: { country_iso: "ECU", source: "Banco Central del Ecuador" },
    },
    {
      id: "DOM_WAGES_2024",
      name: "Wages",
      value: 16993.2,
      unit: "DOP/Month",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: {
        country_iso: "DOM",
        source: "Ministry of Labor, Dominican Republic",
      },
    },
    // Hourly wages (should convert to monthly: × 730 hours/month)
    {
      id: "CAN_WAGES_2023_07",
      name: "Wages",
      value: 29.68,
      unit: "CAD/Hour",
      scale: undefined,
      periodicity: "Monthly",
      date: "2023-07-31",
      metadata: { country_iso: "CAN", source: "Statistics Canada" },
    },
    {
      id: "EST_WAGES_2024Q2",
      name: "Wages",
      value: 12.94,
      unit: "EUR/Hour",
      scale: undefined,
      periodicity: "Quarterly",
      date: "2024-06-30",
      metadata: { country_iso: "EST", source: "Statistics Estonia" },
    },
    // Weekly wages (should convert to monthly: × 4.33 weeks/month)
    {
      id: "AUS_MINWAGE_2023",
      name: "Wages",
      value: 882.8,
      unit: "AUD/week",
      scale: undefined,
      periodicity: "Yearly",
      date: "2023-07-01",
      metadata: { country_iso: "AUS", source: "Fair Work Commission" },
    },
    // Yearly wages (should convert to monthly: ÷ 12)
    {
      id: "CHN_WAGES_2024",
      name: "Wages",
      value: 124110.0,
      unit: "CNY/Year",
      scale: undefined,
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: {
        country_iso: "CHN",
        source: "National Bureau of Statistics of China",
      },
    },
  ];

  // Provide FX rates for currency conversion
  const fxRates = {
    base: "USD",
    rates: {
      DOP: 58.5, // Dominican Peso
      CAD: 1.36, // Canadian Dollar
      EUR: 0.92, // Euro
      AUD: 1.52, // Australian Dollar
      CNY: 7.25, // Chinese Yuan
    },
  };

  const result = await processEconomicDataByIndicator(data, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    autoTargetByIndicator: false, // Use explicit targets
    indicatorKey: "name",
    explain: true,
    useLiveFX: false,
    fxFallback: fxRates,
  });

  // Should have processed all items
  assertEquals(result.data.length, 6);

  // All items should be normalized to USD per month
  result.data.forEach((item) => {
    assertExists(item.normalized);
    assertExists(item.normalizedUnit);
    assertEquals(item.normalizedUnit, "USD per month");
  });

  // Check specific conversions
  // 1. USD/Month - should remain unchanged
  assertEquals(result.data[0].normalized, 548.26);

  // 2. DOP/Month → USD/Month (16993.2 DOP ÷ 58.5 = 290.48 USD)
  assertEquals(Math.round(result.data[1].normalized!), 290);

  // 3. CAD/Hour → USD/Month (29.68 CAD/hour × 730 hours/month ÷ 1.36 = 15,931 USD/month)
  assertEquals(Math.round(result.data[2].normalized!), 15931);

  // 4. EUR/Hour → USD/Month (12.94 EUR/hour × 730 hours/month ÷ 0.92 ≈ 10,268 USD/month)
  assertEquals(Math.round(result.data[3].normalized!), 10268);

  // 5. AUD/week → USD/Month (882.8 AUD/week × 4.33 weeks/month ÷ 1.52 ≈ 2,517 USD/month)
  assertEquals(Math.round(result.data[4].normalized!), 2517);

  // 6. CNY/Year → USD/Month (124110 CNY/year ÷ 12 months ÷ 7.25 = 1,427 USD/month)
  assertEquals(Math.round(result.data[5].normalized!), 1427);

  // Check explain metadata for FX conversions
  result.data.forEach((item, index) => {
    if (index > 0) { // Skip USD (no FX conversion needed)
      assertExists(item.explain);
      assertExists(item.explain?.fx);
      assertEquals(item.explain?.fx?.base, "USD");
      assertEquals(item.explain?.fx?.source, "fallback");
      assertEquals(item.explain?.domain, "wages");
    }
  });

  // Check time scale conversions in explain
  result.data.forEach((item) => {
    assertExists(item.explain);
    assertExists(item.explain?.periodicity);
    assertEquals(item.explain?.periodicity?.target, "month");
  });
});

Deno.test("E2E: CPI Index Values - Extreme Values Processed as Counts", async () => {
  // REAL ISSUE: CPI index values with extreme magnitudes (10k+, millions)
  // These are index/points values that are currently processed as "counts"
  // NOTE: excludeIndexValues only works for wages, not general pipeline
  // RECOMMENDATION: Use exemptions to exclude CPI/index indicators
  const data: ParsedData[] = [
    // Bulgaria CPI - 10,076 points (not rebased to 100)
    {
      id: "BULGARIACONPRIINDCPI_BGR_2025_08",
      name: "Consumer Price Index CPI",
      value: 10076.2,
      unit: "points",
      scale: undefined,
      periodicity: "Monthly",
      date: "2025-08-31",
      metadata: {
        country_iso: "BGR",
        source: "National Statistical Institute, Bulgaria",
      },
    },
    // South Sudan CPI Transportation - 2.8 million points (hyperinflation, not rebased)
    {
      id: "SOUTHSUDACPITRA_SSD_2024_06",
      name: "CPI Transportation",
      value: 2810349.21,
      unit: "points",
      scale: undefined,
      periodicity: "Monthly",
      date: "2024-06-30",
      metadata: {
        country_iso: "SSD",
        source: "National Bureau of Statistics, South Sudan",
      },
    },
    // World Bank CPI (properly rebased to 100)
    {
      id: "FP.CPI.TOTL_BGR_2024",
      name: "Consumer price index (2010 = 100)",
      value: 155.381,
      unit: "Index, 2010=100",
      scale: undefined,
      periodicity: "Annual",
      date: "2024",
      metadata: { country_iso: "BGR", source: "World Bank" },
    },
  ];

  // Test 1: Without exemptions - index values are processed as counts
  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    indicatorKey: "name",
    explain: true,
  });

  // Currently, index/points values are processed (not excluded)
  assertEquals(result.data.length, 3);

  // Values remain unchanged (no currency conversion for counts)
  assertEquals(result.data[0].normalized, 10076.2);
  assertEquals(result.data[1].normalized, 2810349.21);
  assertEquals(result.data[2].normalized, 155.381);

  // Units are preserved
  assertEquals(result.data[0].normalizedUnit, "points");
  assertEquals(result.data[1].normalizedUnit, "points");
  assert(result.data[2].normalizedUnit?.toLowerCase().includes("index"));

  // Test 2: With exemptions - exclude CPI indicators
  const resultExempted = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    indicatorKey: "name",
    explain: true,
    exemptions: {
      indicatorNames: [
        "Consumer Price Index CPI",
        "CPI Transportation",
        "Consumer price index",
      ],
    },
  });

  // With exemptions, CPI indicators should be excluded from normalization
  // but still returned in the results (as exempted items)
  assertEquals(resultExempted.data.length, 3);

  // Exempted items should have original values
  assertEquals(resultExempted.data[0].normalized, undefined);
  assertEquals(resultExempted.data[1].normalized, undefined);
  assertEquals(resultExempted.data[2].normalized, undefined);
});

Deno.test("E2E: Government Debt - Currency Mislabeling (JMD labeled as USD)", async () => {
  // REAL ISSUE: Jamaica Government Debt is 2,242,379 "USD Million"
  // But this is actually JMD (Jamaican Dollar), not USD!
  // Jamaica's GDP is ~$16B USD, so $2.2 trillion debt is impossible
  // Actual debt is ~JMD 2.2 trillion = ~USD 14B (reasonable for 87% debt-to-GDP)

  const data: ParsedData[] = [
    // Jamaica - MISLABELED as USD Million (actually JMD Million)
    {
      id: "JAMAICAGOVDEB_JAM_2025_07",
      name: "Government Debt",
      value: 2242378.97,
      unit: "USD Million", // ❌ WRONG - should be JMD Million
      scale: "Millions",
      periodicity: "Monthly",
      date: "2025-07-31",
      metadata: { country_iso: "JAM", source: "Bank of Jamaica" },
    },
  ];

  // Test 1: With the mislabeled unit (USD Million)
  const resultMislabeled = await processEconomicDataByIndicator(data, {
    targetCurrency: "USD",
    targetMagnitude: "billions",
    autoTargetByIndicator: false,
    indicatorKey: "name",
    explain: true,
  });

  // With mislabeled unit, it would convert to billions
  // 2,242,378.97 million → 2,242.38 billion (WRONG - too high!)
  assertEquals(Math.round(resultMislabeled.data[0].normalized!), 2242);
  assertEquals(resultMislabeled.data[0].normalizedUnit, "USD billions");

  // Test 2: With correct currency (JMD Million)
  const dataCorrect: ParsedData[] = [
    {
      id: "JAMAICAGOVDEB_JAM_2025_07_CORRECTED",
      name: "Government Debt",
      value: 2242378.97,
      unit: "JMD Million", // ✅ CORRECT
      scale: "Millions",
      periodicity: "Monthly",
      date: "2025-07-31",
      metadata: { country_iso: "JAM", source: "Bank of Jamaica" },
    },
  ];

  const fxRates = {
    base: "USD",
    rates: {
      JMD: 157.5, // Jamaican Dollar to USD rate
    },
  };

  const resultCorrect = await processEconomicDataByIndicator(dataCorrect, {
    targetCurrency: "USD",
    targetMagnitude: "billions",
    autoTargetByIndicator: false,
    indicatorKey: "name",
    explain: true,
    useLiveFX: false,
    fxFallback: fxRates,
  });

  // With correct currency: 2,242,378.97 JMD million ÷ 157.5 = 14,237 USD million = 14.24 USD billion
  // This is reasonable for Jamaica (GDP ~$16B, debt-to-GDP ~87%)
  assertEquals(Math.round(resultCorrect.data[0].normalized!), 14);
  assertEquals(resultCorrect.data[0].normalizedUnit, "USD billions");

  // Verify explain metadata shows the FX conversion
  assertExists(resultCorrect.data[0].explain);
  assertExists(resultCorrect.data[0].explain?.fx);
  assertEquals(resultCorrect.data[0].explain?.fx?.currency, "JMD");
  assertEquals(resultCorrect.data[0].explain?.fx?.rate, 157.5);
});

Deno.test("E2E: Consumer Spending - Currency Normalization (XOF, MXN)", async () => {
  // REAL ISSUE: Consumer Spending values look like LCY millions needing currency conversion
  // BFA: 6,297,940 XOF Billion (West African CFA Franc)
  // MEX: 18,177,881 MXN Million (Mexican Peso)

  const data: ParsedData[] = [
    // Burkina Faso - XOF Billion
    {
      id: "BURKINAFACONSPE_BFA_2024",
      name: "Consumer Spending",
      value: 6297940,
      unit: "XOF Billion",
      scale: "Billions",
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: {
        country_iso: "BFA",
        source: "Central Bank of West African States (BCEAO)",
      },
    },
    // Mexico - MXN Million
    {
      id: "MEXICOCONSPE_MEX_2024_Q3",
      name: "Consumer Spending",
      value: 18177881.125,
      unit: "MXN Million",
      scale: "Millions",
      periodicity: "Quarterly",
      date: "2024-09-30",
      metadata: {
        country_iso: "MEX",
        source: "Instituto Nacional de Estadística y Geografía (INEGI)",
      },
    },
  ];

  const fxRates = {
    base: "USD",
    rates: {
      XOF: 600, // West African CFA Franc to USD
      MXN: 20, // Mexican Peso to USD
    },
  };

  const result = await processEconomicDataByIndicator(data, {
    targetCurrency: "USD",
    targetMagnitude: "billions",
    autoTargetByIndicator: false,
    indicatorKey: "name",
    explain: true,
    useLiveFX: false,
    fxFallback: fxRates,
  });

  assertEquals(result.data.length, 2);

  // BFA: 6,297,940 XOF billion ÷ 600 = 10,496.57 USD billion
  const bfaResult = result.data.find((d) => d.metadata?.country_iso === "BFA");
  assertExists(bfaResult);
  assertEquals(Math.round(bfaResult.normalized!), 10497);
  assertEquals(bfaResult.normalizedUnit, "USD billions");

  // MEX: 18,177,881 MXN million ÷ 20 = 908,894 USD million = 908.89 USD billion
  const mexResult = result.data.find((d) => d.metadata?.country_iso === "MEX");
  assertExists(mexResult);
  assertEquals(Math.round(mexResult.normalized!), 909);
  assertEquals(mexResult.normalizedUnit, "USD billions");

  // Verify explain metadata
  assertExists(bfaResult.explain?.fx);
  assertEquals(bfaResult.explain?.fx?.currency, "XOF");
  assertEquals(bfaResult.explain?.fx?.rate, 600);

  assertExists(mexResult.explain?.fx);
  assertEquals(mexResult.explain?.fx?.currency, "MXN");
  assertEquals(mexResult.explain?.fx?.rate, 20);
});

Deno.test("E2E: GDP Level Series - Magnitude and Unit Confusion", async () => {
  // REAL ISSUE: GDP values with confusing magnitude labels
  // CHN: "CNY Hundred Million" - is this millions or hundred millions?
  // BRA: "BRL Million" for GDP components
  // These need proper magnitude detection and normalization

  const data: ParsedData[] = [
    // China - CNY Hundred Million (confusing unit!)
    {
      id: "CHINAGDPCONPRI_CHN_2025_Q2",
      name: "GDP Constant Prices",
      value: 630101,
      unit: "CNY Hundred Million",
      scale: "Millions", // Database says "Millions" but unit says "Hundred Million"!
      periodicity: "Quarterly",
      date: "2025-06-30",
      metadata: {
        country_iso: "CHN",
        source: "National Bureau of Statistics of China",
      },
    },
    // Brazil - BRL Million (GDP component)
    {
      id: "BRAZILGDPFROSER_BRA_2022_Q1",
      name: "GDP from Services",
      value: 184515.235,
      unit: "BRL Million",
      scale: "Millions",
      periodicity: "Quarterly",
      date: "2022-03-31",
      metadata: {
        country_iso: "BRA",
        source: "Instituto Brasileiro de Geografia e Estatística (IBGE)",
      },
    },
    // India - INR Billion (for comparison)
    {
      id: "INDIAGDP_IND_2024",
      name: "GDP",
      value: 326057.5,
      unit: "INR Billion",
      scale: "Billions",
      periodicity: "Yearly",
      date: "2024-12-31",
      metadata: {
        country_iso: "IND",
        source: "Ministry of Statistics",
      },
    },
  ];

  const fxRates = {
    base: "USD",
    rates: {
      CNY: 7.2,
      BRL: 5.0,
      INR: 83.0,
    },
  };

  // Test with auto-targeting (should detect dominant magnitude)
  const resultAuto = await processEconomicDataByIndicator(data, {
    targetCurrency: "USD",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude"],
    indicatorKey: "name",
    explain: true,
    useLiveFX: false,
    fxFallback: fxRates,
  });

  assertEquals(resultAuto.data.length, 3);

  // Test with explicit target magnitude (billions)
  const resultExplicit = await processEconomicDataByIndicator(data, {
    targetCurrency: "USD",
    targetMagnitude: "billions",
    autoTargetByIndicator: false,
    indicatorKey: "name",
    explain: true,
    useLiveFX: false,
    fxFallback: fxRates,
  });

  assertEquals(resultExplicit.data.length, 3);

  // CHN: 630,101 CNY hundred million = 63,010,100 CNY million ÷ 7.2 = 8,751,402 USD million = 8,751 USD billion
  // FIXED: Parser now correctly recognizes "hundred million" and overrides database scale field
  const chnResult = resultExplicit.data.find((d) =>
    d.metadata?.country_iso === "CHN"
  );
  assertExists(chnResult);
  assertEquals(Math.round(chnResult.normalized!), 8751); // ✅ Correct!
  assertEquals(chnResult.normalizedUnit, "USD billions");

  // BRA: 184,515 BRL million ÷ 5.0 = 36,903 USD million = 36.9 USD billion
  const braResult = resultExplicit.data.find((d) =>
    d.metadata?.country_iso === "BRA"
  );
  assertExists(braResult);
  assertEquals(Math.round(braResult.normalized!), 37);
  assertEquals(braResult.normalizedUnit, "USD billions");

  // IND: 326,057.5 INR billion ÷ 83.0 = 3,928 USD billion
  const indResult = resultExplicit.data.find((d) =>
    d.metadata?.country_iso === "IND"
  );
  assertExists(indResult);
  assertEquals(Math.round(indResult.normalized!), 3928);
  assertEquals(indResult.normalizedUnit, "USD billions");

  // Verify FX conversions in explain
  assertExists(chnResult.explain?.fx);
  assertExists(braResult.explain?.fx);
  assertExists(indResult.explain?.fx);
});

Deno.test("E2E: Government Revenue - Extreme Magnitude Values (IRN)", async () => {
  // REAL ISSUE: Iran Government Revenue with 10¹¹–10¹⁵ magnitude
  // Value: 127,649,242.695 "National currency" "Billions"
  // This is IRR (Iranian Rial) billions = 127.6 trillion IRR
  // With IRR/USD ~600,000, this = ~$213 billion (reasonable for Iran)

  const data: ParsedData[] = [
    {
      id: "GGR_IRN_2030",
      name: "General government revenue",
      value: 127649242.695,
      unit: "National currency",
      scale: "Billions",
      periodicity: "Biannually",
      date: "2030",
      metadata: {
        country_iso: "IRN",
        source: "IMFWEO",
      },
    },
  ];

  // Test 1: Without currency specification (should detect as IRR)
  const resultNoCurrency = await processEconomicDataByIndicator(data, {
    targetMagnitude: "billions",
    autoTargetByIndicator: false,
    indicatorKey: "name",
    explain: true,
  });

  assertEquals(resultNoCurrency.data.length, 1);
  // Without FX, value stays in billions: 127,649,242.695 billion
  assertEquals(Math.round(resultNoCurrency.data[0].normalized!), 127649243);

  // Test 2: With proper currency detection and FX rates
  const dataWithCurrency: ParsedData[] = [
    {
      id: "GGR_IRN_2030_CORRECTED",
      name: "General government revenue",
      value: 127649242.695,
      unit: "IRR Billion", // Explicit currency
      scale: "Billions",
      periodicity: "Biannually",
      date: "2030",
      metadata: {
        country_iso: "IRN",
        source: "IMFWEO",
      },
    },
  ];

  const fxRates = {
    base: "USD",
    rates: {
      IRR: 600000, // Iranian Rial to USD (highly devalued)
    },
  };

  const resultWithFX = await processEconomicDataByIndicator(dataWithCurrency, {
    targetCurrency: "USD",
    targetMagnitude: "billions",
    autoTargetByIndicator: false,
    indicatorKey: "name",
    explain: true,
    useLiveFX: false,
    fxFallback: fxRates,
  });

  assertEquals(resultWithFX.data.length, 1);
  // 127,649,242.695 IRR billion ÷ 600,000 = 212,749 USD billion = 212.7 trillion USD
  // Wait, that's wrong! The value should be: 127,649,242.695 billion IRR ÷ 600,000 = 212.75 billion USD
  assertEquals(Math.round(resultWithFX.data[0].normalized!), 213);
  assertEquals(resultWithFX.data[0].normalizedUnit, "USD billions");

  assertExists(resultWithFX.data[0].explain?.fx);
  assertEquals(resultWithFX.data[0].explain?.fx?.currency, "IRR");
  assertEquals(resultWithFX.data[0].explain?.fx?.rate, 600000);
});

Deno.test("E2E: GDP per Capita - Scale Factor Issues", async () => {
  // ISSUE: Boss mentioned ISL 0.0048295 and QAT 0.0051824 (near-zero values)
  // These values suggest missing ×1,000 or ×1,000,000 scale factors
  // Simulating the issue with hypothetical data

  const data: ParsedData[] = [
    // Iceland - hypothetical near-zero value (should be ~$90k)
    {
      id: "GDPPC_ISL_WRONG",
      name: "GDP per Capita",
      value: 0.0048295,
      unit: "USD", // Missing "Thousand" or "Million"
      scale: undefined,
      periodicity: "Annual",
      date: "2024",
      metadata: {
        country_iso: "ISL",
        source: "Hypothetical",
      },
    },
    // Qatar - hypothetical near-zero value (should be ~$80k)
    {
      id: "GDPPC_QAT_WRONG",
      name: "GDP per Capita",
      value: 0.0051824,
      unit: "USD",
      scale: undefined,
      periodicity: "Annual",
      date: "2024",
      metadata: {
        country_iso: "QAT",
        source: "Hypothetical",
      },
    },
    // Correct values for comparison
    {
      id: "GDPPC_ISL_CORRECT",
      name: "GDP per Capita",
      value: 91269.298,
      unit: "USD",
      scale: "Units",
      periodicity: "Annual",
      date: "2024",
      metadata: {
        country_iso: "ISL",
        source: "IMFWEO",
      },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    targetCurrency: "USD",
    targetMagnitude: "ones",
    autoTargetByIndicator: false,
    indicatorKey: "name",
    explain: true,
  });

  assertEquals(result.data.length, 3);

  // Wrong values stay near-zero (no scale factor applied)
  const islWrong = result.data.find((d) => d.id === "GDPPC_ISL_WRONG");
  assertExists(islWrong);
  assert(
    islWrong.normalized! < 1,
    "Near-zero value should stay near-zero without scale factor",
  );

  const qatWrong = result.data.find((d) => d.id === "GDPPC_QAT_WRONG");
  assertExists(qatWrong);
  assert(
    qatWrong.normalized! < 1,
    "Near-zero value should stay near-zero without scale factor",
  );

  // Correct value is properly scaled
  const islCorrect = result.data.find((d) => d.id === "GDPPC_ISL_CORRECT");
  assertExists(islCorrect);
  assertEquals(Math.round(islCorrect.normalized!), 91269);
  assertEquals(islCorrect.normalizedUnit, "USD");

  // NOTE: The fix would require:
  // 1. Database correction: Add proper scale ("Thousand" or "Million") to unit field
  // 2. OR: Use specialHandling.unitOverrides to correct specific indicators
  // 3. OR: Add validation rules to detect implausible GDP per capita values
});

Deno.test("E2E: Employed Persons (STOCK indicator - should NOT get time conversion)", async () => {
  // Real-world scenario from user's data
  // Employed Persons is a STOCK (snapshot/level), not a FLOW
  // The periodicity is just the release cadence, NOT a measurement period
  const data: ParsedData[] = [
    {
      id: "ANGOLAEMPPER",
      name: "Employed Persons",
      value: 12814.558,
      unit: "Thousand",
      scale: "Thousands",
      periodicity: "Quarterly",
      date: "2025-03-31",
      metadata: { country_iso: "AGO", source: "Instituto Nacional de Estatística" },
    },
    {
      id: "ALBANIAEMPPER",
      name: "Employed Persons",
      value: 1168,
      unit: "Thousand",
      scale: "Thousands",
      periodicity: "Quarterly",
      date: "2025-03-31",
      metadata: { country_iso: "ALB", source: "INSTAT" },
    },
    {
      id: "ARMENIAEMPPER",
      name: "Employed Persons",
      value: 827,
      unit: "Thousand",
      scale: "Thousands",
      periodicity: "Monthly",
      date: "2025-07-31",
      metadata: { country_iso: "ARM", source: "National Statistical Service" },
    },
  ];

  const result = await processEconomicDataByIndicator(data, {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"], // Include time - should be auto-skipped for stock
    indicatorKey: "name",
    explain: true,
  });

  console.log(
    "Employed Persons Results:",
    result.data.map((d) => ({
      id: d.id,
      original: d.value,
      normalized: d.normalized,
      unit: d.unit,
      normalizedUnit: d.normalizedUnit,
      periodicity: d.explain?.periodicity,
      reportingFrequency: d.explain?.reportingFrequency,
    })),
  );

  // CRITICAL: Values should NOT be divided by time period!
  // Stock indicators are snapshots, not flows
  const ago = result.data.find((d) => d.id === "ANGOLAEMPPER");
  assertExists(ago);
  assertEquals(
    Math.round(ago.normalized!),
    12815,
    "Angola: 12,814.558 thousand should stay ~12,815 (NOT divided by 3!)",
  );

  const alb = result.data.find((d) => d.id === "ALBANIAEMPPER");
  assertExists(alb);
  assertEquals(
    Math.round(alb.normalized!),
    1168,
    "Albania: 1,168 thousand should stay 1,168 (NOT divided by 3!)",
  );

  const arm = result.data.find((d) => d.id === "ARMENIAEMPPER");
  assertExists(arm);
  assertEquals(
    Math.round(arm.normalized!),
    827,
    "Armenia: 827 thousand should stay 827 (no conversion)",
  );

  // Check normalized units - should be just "Thousands", NOT "thousands per month"
  assertExists(ago.normalizedUnit);
  assertEquals(
    ago.normalizedUnit,
    "Thousands",
    "Unit should be 'Thousands', NOT 'thousands per month'",
  );

  // Check explain metadata
  const agoExplain = ago.explain;
  assertExists(agoExplain);

  // CRITICAL: No periodicity conversion for stock indicators
  assertEquals(
    agoExplain.periodicity,
    undefined,
    "Stock indicators should NOT have periodicity conversion",
  );

  // Reporting frequency should still be set (it's just release cadence)
  assertEquals(
    agoExplain.reportingFrequency,
    "quarter",
    "Reporting frequency should be set (release cadence)",
  );

  // Check units metadata
  assertExists(agoExplain.units);
  assertEquals(
    agoExplain.units.normalizedFullUnit,
    "Thousands",
    "Full unit should be 'Thousands', NOT 'thousands per quarter'",
  );

  // Check target selection
  assertExists(agoExplain.targetSelection);
  assertEquals(agoExplain.targetSelection.selected.magnitude, "thousands");

  // ✅ CRITICAL: Time should be automatically skipped for stock indicators
  // Even though "time" is in autoTargetDimensions, the system should detect
  // that "Employed Persons" is a stock indicator and skip time auto-targeting
  assertEquals(
    agoExplain.targetSelection.selected.time,
    undefined,
    "Stock indicators should automatically skip time dimension (even when 'time' in autoTargetDimensions)",
  );

  // Verify the reason explains why time was skipped
  assertExists(agoExplain.targetSelection.reason);
  assert(
    agoExplain.targetSelection.reason.includes("time=skipped"),
    "Reason should explain time was skipped for stock indicator",
  );
  assert(
    agoExplain.targetSelection.reason.includes("stock indicator"),
    "Reason should mention it's a stock indicator",
  );
});
