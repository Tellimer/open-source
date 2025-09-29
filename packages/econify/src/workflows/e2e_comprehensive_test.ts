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

import { assertEquals, assertExists } from "jsr:@std/assert@1";
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

  // Check normalized units contain "gigawatt"
  assertExists(result.data[0].normalizedUnit);
  assertEquals(
    result.data[0].normalizedUnit?.toLowerCase().includes("gigawatt"),
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
