import { assertEquals } from "jsr:@std/assert@1";
import {
  areUnitsCompatible,
  classifyUnitType,
  getUnitTypeDescription,
  type UnitSemanticType,
} from "./unit_type_classifier.ts";

Deno.test("classifyUnitType - Percentage patterns", () => {
  const percentageUnits = [
    "%",
    "percent",
    "Percent",
    "PERCENT",
    "percentage",
    "Percentage",
    "pct",
    "pp",
    "percentage points",
    "percent of GDP",
    "Percent of GDP",
    "percent of total",
    "% of GDP",
    "% of total",
    "percentage of revenue",
  ];

  percentageUnits.forEach((unit) => {
    const result = classifyUnitType(unit);
    assertEquals(
      result.type,
      "percentage",
      `Expected "${unit}" to be classified as percentage, got ${result.type}`,
    );
    assertEquals(result.confidence, 1.0);
  });
});

Deno.test("classifyUnitType - Index patterns", () => {
  const indexUnits = [
    "points",
    "Points",
    "POINTS",
    "index",
    "Index",
    "INDEX",
    "Index (2020=100)",
    "Index (2015=100)",
    "basis points",
    "bps",
    "index points",
  ];

  indexUnits.forEach((unit) => {
    const result = classifyUnitType(unit);
    assertEquals(
      result.type,
      "index",
      `Expected "${unit}" to be classified as index, got ${result.type}`,
    );
    assertEquals(result.confidence, 1.0);
  });
});

Deno.test("classifyUnitType - Currency amount patterns", () => {
  const currencyUnits = [
    "USD Million",
    "EUR Million",
    "EUR Billion",
    "GBP Thousand",
    "JPY Billion",
    "Million USD",
    "Billion EUR",
    "Thousands of Euros",
    "Millions of Dollars",
    "CHF Million",
    "AUD Billion",
    "CAD Million",
    "SEK Million",
    "NOK Billion",
    "RUB Million",
    "INR Billion",
    "BRL Million",
    "ZAR Million",
    "MXN Billion",
    "TRY Million",
    "KRW Billion",
    "SGD Million",
    "HKD Billion",
    "THB Million",
    "IDR Billion",
    "MYR Million",
    "PHP Billion",
    "CLP Million",
    "COP Billion",
    "PEN Million",
    "ARS Million",
    "EGP Billion",
    "NGN Million",
    "USD mn",
    "EUR bn",
  ];

  currencyUnits.forEach((unit) => {
    const result = classifyUnitType(unit);
    assertEquals(
      result.type,
      "currency-amount",
      `Expected "${unit}" to be classified as currency-amount, got ${result.type}`,
    );
  });
});

Deno.test("classifyUnitType - Rate patterns", () => {
  const rateUnits = [
    "per 1000 people",
    "per 1,000 people",
    "doses per 100 people",
    "per capita",
    "per person",
    "per thousand",
    "per million",
    "per sq km",
    "per-capita",
    "per-person",
    "/100 people",
    "/1000 people",
    "/1,000 people",
    "cases per 100,000",
  ];

  rateUnits.forEach((unit) => {
    const result = classifyUnitType(unit);
    assertEquals(
      result.type,
      "rate",
      `Expected "${unit}" to be classified as rate, got ${result.type}`,
    );
    assertEquals(result.confidence, 1.0);
  });
});

Deno.test("classifyUnitType - Ratio patterns", () => {
  const ratioUnits = [
    "times",
    "ratio",
    "multiple",
    "x",
    "coefficient",
    "debt to equity",
    "debt to GDP",
    "ratio of X to Y",
  ];

  ratioUnits.forEach((unit) => {
    const result = classifyUnitType(unit);
    assertEquals(
      result.type,
      "ratio",
      `Expected "${unit}" to be classified as ratio, got ${result.type}`,
    );
    assertEquals(result.confidence, 1.0);
  });
});

Deno.test("classifyUnitType - Duration patterns", () => {
  const durationUnits = [
    "days",
    "day",
    "years",
    "year",
    "months",
    "month",
    "hours",
    "hour",
    "minutes",
    "minute",
    "seconds",
    "second",
    "weeks",
    "week",
  ];

  durationUnits.forEach((unit) => {
    const result = classifyUnitType(unit);
    assertEquals(
      result.type,
      "duration",
      `Expected "${unit}" to be classified as duration, got ${result.type}`,
    );
    assertEquals(result.confidence, 1.0);
  });
});

Deno.test("classifyUnitType - Physical unit patterns", () => {
  const physicalUnits = [
    // Energy
    "Gigawatt-hour",
    "GWh",
    "Terajoule",
    "TJ",
    "Megawatt-hour",
    "MWh",
    "Kilowatt-hour",
    "kWh",
    "BTU",
    // Volume
    "BBL/D/1K",
    "cubic meters",
    "m3",
    "liters",

    // Temperature
    "celsius",
    "Celsius",
    "fahrenheit",
    "kelvin",
    // Distance
    "mm",
    "cm",
    "meters",
    "kilometers",
    "km",
    "miles",
    // Weight (as physical, not count)
    "mt", // metric tons in physical context
    // Area
    "sq km",
    "hectares",
    "acres",
    // Speed
    "km/h",
    "mph",
    "knots",
  ];

  physicalUnits.forEach((unit) => {
    const result = classifyUnitType(unit);
    assertEquals(
      result.type,
      "physical",
      `Expected "${unit}" to be classified as physical, got ${result.type}`,
    );
    assertEquals(result.confidence, 1.0);
  });
});

Deno.test("classifyUnitType - Count patterns", () => {
  const countUnits = [
    "Persons",
    "persons",
    "people",
    "Thousand",
    "thousand",
    "Million",
    "million",
    "Billion",
    "billion",
    "Companies",
    "companies",
    "Enterprises",
    "enterprises",
    "Tonnes", // Weight as count
    "tons",
    "Units",
    "units",
    "Number",
    "number",
    "number of companies",
    "total enterprises",
    "count of items",
    "households",
    "employees",
    "students",
    "vehicles",
    "arrivals",
    "visitors",
    "tourists",
    "passengers",
    "flights",
    "subscribers",
    "users",
    "customers",
    "births",
    "deaths",
    "cases",
    "incidents",
    "transactions",
    "contracts",
    "projects",
  ];

  countUnits.forEach((unit) => {
    const result = classifyUnitType(unit);
    assertEquals(
      result.type,
      "count",
      `Expected "${unit}" to be classified as count, got ${result.type}`,
    );
  });
});

Deno.test("classifyUnitType - Unknown patterns", () => {
  const unknownUnits = [
    "",
    "   ",
    null,
    undefined,
    "xyz123",
    "????????",
  ];

  unknownUnits.forEach((unit) => {
    const result = classifyUnitType(unit);
    assertEquals(
      result.type,
      "unknown",
      `Expected "${unit}" to be classified as unknown, got ${result.type}`,
    );
  });
});

Deno.test("areUnitsCompatible - Same types are compatible", () => {
  const types: UnitSemanticType[] = [
    "percentage",
    "index",
    "count",
    "currency-amount",
    "physical",
    "rate",
    "ratio",
    "duration",
  ];

  types.forEach((type) => {
    assertEquals(
      areUnitsCompatible(type, type),
      true,
      `Expected ${type} to be compatible with itself`,
    );
  });
});

Deno.test("areUnitsCompatible - Count with count is compatible", () => {
  // Different count scales should be compatible
  assertEquals(areUnitsCompatible("count", "count"), true);
});

Deno.test("areUnitsCompatible - Currency with currency is compatible", () => {
  // Different currency scales/currencies should be compatible
  assertEquals(areUnitsCompatible("currency-amount", "currency-amount"), true);
});

Deno.test("areUnitsCompatible - Unknown is incompatible", () => {
  const types: UnitSemanticType[] = [
    "percentage",
    "index",
    "count",
    "currency-amount",
    "physical",
    "rate",
    "ratio",
    "duration",
  ];

  types.forEach((type) => {
    assertEquals(
      areUnitsCompatible("unknown", type),
      false,
      `Expected unknown to be incompatible with ${type}`,
    );
    assertEquals(
      areUnitsCompatible(type, "unknown"),
      false,
      `Expected ${type} to be incompatible with unknown`,
    );
  });
});

Deno.test("areUnitsCompatible - Cross-type incompatibilities", () => {
  // Count vs Index
  assertEquals(areUnitsCompatible("count", "index"), false);
  assertEquals(areUnitsCompatible("index", "count"), false);

  // Count vs Percentage
  assertEquals(areUnitsCompatible("count", "percentage"), false);
  assertEquals(areUnitsCompatible("percentage", "count"), false);

  // Index vs Percentage
  assertEquals(areUnitsCompatible("index", "percentage"), false);
  assertEquals(areUnitsCompatible("percentage", "index"), false);

  // Physical vs Count
  assertEquals(areUnitsCompatible("physical", "count"), false);
  assertEquals(areUnitsCompatible("count", "physical"), false);

  // Rate vs Count
  assertEquals(areUnitsCompatible("rate", "count"), false);
  assertEquals(areUnitsCompatible("count", "rate"), false);

  // Currency vs Count
  assertEquals(areUnitsCompatible("currency-amount", "count"), false);
  assertEquals(areUnitsCompatible("count", "currency-amount"), false);

  // Ratio vs Percentage
  assertEquals(areUnitsCompatible("ratio", "percentage"), false);
  assertEquals(areUnitsCompatible("percentage", "ratio"), false);

  // Duration vs Count
  assertEquals(areUnitsCompatible("duration", "count"), false);
  assertEquals(areUnitsCompatible("count", "duration"), false);
});

Deno.test("getUnitTypeDescription - Returns descriptions for all types", () => {
  const types: UnitSemanticType[] = [
    "percentage",
    "index",
    "count",
    "currency-amount",
    "physical",
    "rate",
    "ratio",
    "duration",
    "unknown",
  ];

  types.forEach((type) => {
    const description = getUnitTypeDescription(type);
    assertEquals(
      typeof description,
      "string",
      `Expected description for ${type} to be a string`,
    );
    assertEquals(
      description.length > 0,
      true,
      `Expected description for ${type} to be non-empty`,
    );
  });
});

Deno.test("classifyUnitType - Real database examples", () => {
  // From top 100 unique units in database
  const realExamples: Array<[string, UnitSemanticType]> = [
    ["%", "percentage"],
    ["points", "index"],
    ["USD Million", "currency-amount"],
    ["percent of GDP", "percentage"],
    ["EUR Million", "currency-amount"],
    ["Persons", "count"],
    ["Thousand", "count"],
    ["celsius", "physical"],
    ["mm", "physical"],
    ["percent", "percentage"],
    ["per 1000 people", "rate"],
    ["doses per 100 people", "rate"],
    ["Gigawatt-hour", "physical"],
    ["BBL/D/1K", "physical"],
    ["Million", "count"],
    ["Percent", "percentage"],
    ["EUR Billion", "currency-amount"],
    ["Index (2020=100)", "index"],
    ["Terajoule", "physical"],
    ["Tonnes", "count"],
    ["Companies", "count"],
    ["years", "duration"],
    ["times", "ratio"],
  ];

  realExamples.forEach(([unit, expectedType]) => {
    const result = classifyUnitType(unit);
    assertEquals(
      result.type,
      expectedType,
      `Expected "${unit}" to be classified as ${expectedType}, got ${result.type}`,
    );
  });
});
