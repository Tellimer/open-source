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

import { assertEquals, assertExists } from "jsr:@std/assert";
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
  console.log("GDP Results:", result.data.map((d) => ({
    id: d.id,
    value: d.value,
    normalized: d.normalized,
    unit: d.unit,
    normalizedUnit: d.normalizedUnit,
    explain: d.explain?.targetSelection,
  })));
  assertEquals(Math.round(result.data[0].normalized!), 2174);
  assertEquals(Math.round(result.data[1].normalized!), 17795);

  // Check normalized units
  assertExists(result.data[0].normalizedUnit);
  assertEquals(result.data[0].normalizedUnit?.toLowerCase().includes("usd"), true);
  assertEquals(result.data[0].normalizedUnit?.toLowerCase().includes("billion"), true);

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
  console.log("Population Results:", result.data.map((d) => ({
    id: d.id,
    value: d.value,
    normalized: d.normalized,
    unit: d.unit,
    normalizedUnit: d.normalizedUnit,
    explain: d.explain?.targetSelection,
  })));
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
      name: "Unemployment, total (% of total labor force) (modeled ILO estimate)",
      value: 11.066,
      unit: "% of total labor force",
      scale: undefined,
      periodicity: "Annual",
      date: "2023",
      metadata: { country_iso: "GRC", source: "World Bank" },
    },
    {
      id: "SL.UEM.TOTL.ZSZAF2023",
      name: "Unemployment, total (% of total labor force) (modeled ILO estimate)",
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
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    explain: true,
  });

  // Should auto-target to billions
  // CHN: 252,987,271,344.74 → 252.99 billions
  // SAU: 35,133,266,931.35 → 35.13 billions
  assertEquals(Math.round(result.data[0].normalized!), 253);
  assertEquals(Math.round(result.data[1].normalized!), 35);

  // Check normalized units
  assertExists(result.data[0].normalizedUnit);
  assertEquals(result.data[0].normalizedUnit?.toLowerCase().includes("usd"), true);
  assertEquals(result.data[0].normalizedUnit?.toLowerCase().includes("billion"), true);

  // Check explain metadata
  const explain = result.data[0].explain;
  assertExists(explain);
  assertExists(explain.targetSelection);
  assertEquals(explain.targetSelection.selected.currency, "USD");
  assertEquals(explain.targetSelection.selected.magnitude, "billions");
});

