/**
 * Tests for units module
 */

import { assertEquals } from "jsr:@std/assert";
import {
  extractCurrency,
  extractScale,
  extractTimeScale,
  isMonetaryUnit,
  isPercentageUnit,
  parseUnit,
} from "./units.ts";

Deno.test("parseUnit - currency units", () => {
  const result = parseUnit("USD Million");
  assertEquals(result.category, "currency");
  assertEquals(result.currency, "USD");
  assertEquals(result.scale, "millions");
  assertEquals(result.isComposite, false);
});

Deno.test("parseUnit - composite monetary flow units", () => {
  const result = parseUnit("EUR Billion per year");
  assertEquals(result.category, "composite");
  assertEquals(result.currency, "EUR");
  assertEquals(result.scale, "billions");
  assertEquals(result.timeScale, "year");
  assertEquals(result.isComposite, true);
});

Deno.test("parseUnit - percentage units", () => {
  const tests = [
    { input: "percent of GDP", normalized: "% of GDP" },
    { input: "percentage points", normalized: "pp" },
    { input: "percent", normalized: "%" },
    { input: "basis points", normalized: "bps" },
  ];

  for (const test of tests) {
    const result = parseUnit(test.input);
    assertEquals(result.category, "percentage");
    assertEquals(result.normalized, test.normalized);
  }
});

Deno.test("parseUnit - physical units", () => {
  const tests = [
    { input: "BBL/D/1K", category: "physical", normalized: "BBL/D/1K" },
    { input: "Tonnes", category: "physical", normalized: "tonnes" },
    { input: "mm", category: "physical", normalized: "mm" },
    { input: "celsius", category: "temperature", normalized: "celsius" },
  ];

  for (const test of tests) {
    const result = parseUnit(test.input);
    assertEquals(result.category, test.category);
    assertEquals(result.normalized, test.normalized);
  }
});

Deno.test("parseUnit - energy units", () => {
  const tests = [
    { input: "Gigawatt-hour", normalized: "GWh" },
    { input: "Terajoule", normalized: "TJ" },
  ];

  for (const test of tests) {
    const result = parseUnit(test.input);
    assertEquals(result.category, "energy");
    assertEquals(result.normalized, test.normalized);
  }
});

Deno.test("parseUnit - index and points", () => {
  const tests = [
    { input: "points", normalized: "points" },
    { input: "Index", normalized: "index" },
  ];

  for (const test of tests) {
    const result = parseUnit(test.input);
    assertEquals(result.category, "index");
    assertEquals(result.normalized, test.normalized);
  }
});

Deno.test("parseUnit - population and count units", () => {
  const tests = [
    { input: "Persons", category: "population", normalized: "persons" },
    { input: "per 1000 people", category: "rate", normalized: "per 1000 people" },
    { input: "doses per 100 people", category: "count", normalized: "doses per 100 people" },
    { input: "doses", category: "count", normalized: "doses" },
    { input: "Units", category: "count", normalized: "units" },
  ];

  for (const test of tests) {
    const result = parseUnit(test.input);
    assertEquals(result.category, test.category);
    assertEquals(result.normalized, test.normalized);
  }
});

Deno.test("parseUnit - complex real-world examples", () => {
  const tests = [
    {
      input: "USD Million",
      currency: "USD",
      scale: "millions",
      category: "currency",
    },
    {
      input: "EUR Billion per year",
      currency: "EUR",
      scale: "billions",
      timeScale: "year",
      category: "composite",
    },
    {
      input: "percent of GDP",
      category: "percentage",
      normalized: "% of GDP",
    },
    {
      input: "BBL/D/1K",
      category: "physical",
      normalized: "BBL/D/1K",
    },
    {
      input: "KES Billion",
      currency: "KES",
      scale: "billions",
      category: "currency",
    },
  ];

  for (const test of tests) {
    const result = parseUnit(test.input);
    assertEquals(result.category, test.category);
    if (test.currency) assertEquals(result.currency, test.currency);
    if (test.scale) assertEquals(result.scale, test.scale);
    if (test.timeScale) assertEquals(result.timeScale, test.timeScale);
    if (test.normalized) assertEquals(result.normalized, test.normalized);
  }
});

Deno.test("isMonetaryUnit", () => {
  assertEquals(isMonetaryUnit("USD Million"), true);
  assertEquals(isMonetaryUnit("EUR Billion per year"), true);
  assertEquals(isMonetaryUnit("percent of GDP"), false);
  assertEquals(isMonetaryUnit("points"), false);
  assertEquals(isMonetaryUnit("BBL/D/1K"), false);
});

Deno.test("isPercentageUnit", () => {
  assertEquals(isPercentageUnit("percent of GDP"), true);
  assertEquals(isPercentageUnit("percentage points"), true);
  assertEquals(isPercentageUnit("USD Million"), false);
  assertEquals(isPercentageUnit("points"), false);
});

Deno.test("extractCurrency", () => {
  assertEquals(extractCurrency("USD Million"), "USD");
  assertEquals(extractCurrency("EUR Billion per year"), "EUR");
  assertEquals(extractCurrency("KES Billion"), "KES");
  assertEquals(extractCurrency("percent of GDP"), null);
  assertEquals(extractCurrency("points"), null);
});

Deno.test("extractScale", () => {
  assertEquals(extractScale("USD Million"), "millions");
  assertEquals(extractScale("EUR Billion"), "billions");
  assertEquals(extractScale("NGN Thousand"), "thousands");
  assertEquals(extractScale("USD"), null);
  assertEquals(extractScale("percent"), null);
});

Deno.test("extractTimeScale", () => {
  assertEquals(extractTimeScale("USD Million per year"), "year");
  assertEquals(extractTimeScale("EUR/Month"), "month");
  assertEquals(extractTimeScale("quarterly"), "quarter");
  assertEquals(extractTimeScale("USD Million"), null);
  assertEquals(extractTimeScale("percent"), null);
});

Deno.test("parseUnit - ratio patterns (USD/Liter, KRW/Hour)", () => {
  const tests = [
    {
      input: "USD/Liter",
      category: "composite",
      currency: "USD",
      isComposite: true,
      special: "price per volume",
    },
    {
      input: "KRW/Hour",
      category: "composite", 
      currency: "KRW",
      timeScale: "hour",
      isComposite: true,
      special: "wage",
    },
    {
      input: "EUR/kg",
      category: "composite",
      currency: "EUR",
      isComposite: true,
      special: "price per weight",
    },
    {
      input: "USD/day",
      category: "composite",
      currency: "USD",
      timeScale: "day",
      isComposite: true,
    },
  ];

  for (const test of tests) {
    const result = parseUnit(test.input);
    assertEquals(result.category, test.category);
    assertEquals(result.currency, test.currency);
    assertEquals(result.isComposite, test.isComposite);
    if (test.timeScale) assertEquals(result.timeScale, test.timeScale);
    if (test.special) assertEquals(result.components.special, test.special);
  }
});

Deno.test("parseUnit - additional physical units", () => {
  const tests = [
    { input: "hectares", category: "physical", normalized: "hectares" },
    { input: "MT", category: "physical", normalized: "MT" },
    { input: "days", category: "time", normalized: "days" },
    { input: "months", category: "time", normalized: "months" },
  ];

  for (const test of tests) {
    const result = parseUnit(test.input);
    assertEquals(result.category, test.category);
    assertEquals(result.normalized, test.normalized);
  }
});

Deno.test("parseUnit - additional count units", () => {
  const tests = [
    { input: "households", category: "count", normalized: "households" },
    { input: "workers", category: "population", normalized: "workers" },
    { input: "students", category: "population", normalized: "students" },
    { input: "vehicles", category: "count", normalized: "vehicles" },
  ];

  for (const test of tests) {
    const result = parseUnit(test.input);
    assertEquals(result.category, test.category);
    assertEquals(result.normalized, test.normalized);
  }
});