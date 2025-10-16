/**
 * Unit Type Classification System
 *
 * Classifies economic indicator units into semantic categories to detect
 * incompatible unit type mixing (e.g., count vs index vs percentage).
 *
 * Based on comprehensive analysis of 100+ unique unit types from the database.
 */

/**
 * Semantic unit type categories
 */
export type UnitSemanticType =
  | "percentage" // %, percent, percent of GDP, percentage points
  | "index" // Index values, points, basis points
  | "count" // Absolute quantities: persons, thousand, million, tonnes
  | "currency-amount" // Monetary amounts: USD Million, EUR Billion, etc.
  | "physical" // Physical measurements: celsius, mm, MW, BBL/D
  | "rate" // Per-capita or per-unit: per 1000 people, doses per 100 people
  | "ratio" // Pure ratios: times, ratio, multiple
  | "duration" // Time periods: days, years, months
  | "unknown"; // Unclassified units

/**
 * Unit type classification result with confidence
 */
export interface UnitTypeClassification {
  type: UnitSemanticType;
  confidence: number; // 0.0 to 1.0
  matchedPattern?: string; // Which pattern matched
  normalizedUnit?: string; // Normalized form of the unit
}

/**
 * Comprehensive list of currency codes from database (all lowercase)
 */
const CURRENCY_CODES = [
  "usd",
  "eur",
  "gbp",
  "jpy",
  "cny",
  "chf",
  "aud",
  "cad",
  "nzd",
  "sek",
  "nok",
  "dkk",
  "rub",
  "inr",
  "brl",
  "zar",
  "mxn",
  "try",
  "krw",
  "sgd",
  "hkd",
  "thb",
  "idr",
  "myr",
  "php",
  "clp",
  "cop",
  "pen",
  "ars",
  "egp",
  "ngn",
  "kwd",
  "qar",
  "aed",
  "sar",
  "bam",
  "amd",
  "azn",
  "bdt",
  "bhd",
  "bnd",
  "bob",
  "bwp",
  "byn",
  "bzd",
  "crc",
  "cup",
  "cve",
  "czk",
  "djf",
  "dop",
  "dzd",
  "etb",
  "fjd",
  "gel",
  "ghs",
  "gmd",
  "gnf",
  "gtq",
  "gyd",
  "hnl",
  "hrk",
  "htg",
  "huf",
  "iqd",
  "irr",
  "isk",
  "jmd",
  "jod",
  "kes",
  "kgs",
  "khr",
  "kmf",
  "kpw",
  "kzt",
  "lak",
  "lbp",
  "lkr",
  "lrd",
  "lsl",
  "lyd",
  "mad",
  "mdl",
  "mga",
  "mkd",
  "mmk",
  "mnt",
  "mop",
  "mru",
  "mur",
  "mvr",
  "mwk",
  "mzn",
  "nad",
  "nio",
  "npr",
  "omr",
  "pab",
  "pgk",
  "pkr",
  "pln",
  "pyg",
  "ron",
  "rsd",
  "rwf",
  "scr",
  "sdg",
  "sll",
  "sos",
  "srd",
  "ssp",
  "syp",
  "szl",
  "tjs",
  "tnd",
  "top",
  "tzs",
  "uah",
  "ugx",
  "uyu",
  "uzs",
  "ves",
  "vnd",
  "xaf",
  "xof",
  "xpf",
  "yer",
  "zar",
  "zmw",
  "zig",
];

/**
 * Check if a unit string contains a currency code with word boundaries
 * to avoid false matches like "scr" in "subscribers"
 */
function hasCurrencyCode(lowerUnit: string): boolean {
  return CURRENCY_CODES.some((code) => {
    // Use word boundary regex to match currency codes as standalone words
    // or at the start/end of compound patterns like "usd/liter" or "million-usd"
    const regex = new RegExp(`\\b${code}\\b|${code}[-/]|[-/]${code}`);
    return regex.test(lowerUnit);
  });
}

/**
 * Comprehensive unit type classifier
 *
 * Handles all unit patterns found in the database, including:
 * - Case variations (%, percent, Percent, PERCENT)
 * - Spacing variations (percent of GDP, percent_of_GDP)
 * - Scale prefixes (USD Million, Million USD, Thousand)
 * - Currency codes (USD, EUR, GBP, JPY, etc.)
 * - Physical unit variations (celsius, Celsius, C)
 * - Compound units (BBL/D/1K, doses per 100 people)
 *
 * Pattern matching order matters - more specific patterns first!
 */
export function classifyUnitType(
  unit: string | null | undefined,
): UnitTypeClassification {
  if (!unit || unit.trim() === "") {
    return { type: "unknown", confidence: 0.0 };
  }

  const normalized = unit.trim();
  const lower = normalized.toLowerCase();

  // PERCENTAGE patterns (highest priority - very distinct)
  // Matches: %, percent, Percent, percentage, percentage points, percent of GDP, pct, pp
  if (
    normalized === "%" ||
    lower === "percent" ||
    lower === "percentage" ||
    lower === "pct" ||
    lower === "pp" ||
    lower === "percentage points" ||
    lower.includes("percent of gdp") ||
    lower.includes("percent of total") ||
    lower.includes("% of gdp") ||
    lower.includes("% of total") ||
    lower.includes("percentage of")
  ) {
    return {
      type: "percentage",
      confidence: 1.0,
      matchedPattern: "percent/percentage/% pattern",
      normalizedUnit: "%",
    };
  }

  // INDEX / POINTS patterns
  // Matches: points, Points, index, Index, basis points, bps
  if (
    lower === "points" ||
    lower === "index" ||
    lower === "basis points" ||
    lower === "bps" ||
    lower.includes("index (") || // Index (2020=100)
    lower.includes("index points")
  ) {
    return {
      type: "index",
      confidence: 1.0,
      matchedPattern: "index/points pattern",
      normalizedUnit: "index",
    };
  }

  // PRICE/COST patterns (check before rate - more specific: currency per time/unit)
  // Matches: USD/Liter, EUR/Month, USD/Hour, EUR/MWh, EUR/SQ. METRE, etc.
  // Check if it's a price (currency per something)
  if (
    hasCurrencyCode(lower) && (lower.includes("/") || lower.includes(" per "))
  ) {
    // It's a price/cost unit (e.g., USD/Hour, EUR/Month)
    return {
      type: "rate",
      confidence: 1.0,
      matchedPattern: "price/cost pattern (currency per unit)",
      normalizedUnit: "currency per unit",
    };
  }

  // RATE patterns (check before currency/count - more specific)
  // Matches: per 1000 people, doses per 100 people, per capita, per sq km, etc.
  if (
    lower.includes("per ") ||
    lower.includes("per-") ||
    lower.includes("/100") ||
    lower.includes("/1000") ||
    lower.includes("/1,000") ||
    lower.includes("per capita") ||
    lower.includes("per person") ||
    lower.includes("per thousand") ||
    lower.includes("per million") ||
    lower.includes("per one million")
  ) {
    return {
      type: "rate",
      confidence: 1.0,
      matchedPattern: "rate/per-unit pattern",
      normalizedUnit: "per unit",
    };
  }

  // DURATION patterns (exact match only - must check before count patterns)
  // Matches: days, years, months, hours, minutes, seconds
  const durationWords = [
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

  if (durationWords.includes(lower)) {
    return {
      type: "duration",
      confidence: 1.0,
      matchedPattern: "duration pattern",
      normalizedUnit: "time",
    };
  }

  // RATIO patterns
  // Matches: times, ratio, multiple, x, coefficient
  if (
    lower === "times" ||
    lower === "ratio" ||
    lower === "multiple" ||
    lower === "x" ||
    lower === "coefficient" ||
    lower.includes("debt to") ||
    lower.includes("ratio of")
  ) {
    return {
      type: "ratio",
      confidence: 1.0,
      matchedPattern: "ratio pattern",
      normalizedUnit: "ratio",
    };
  }

  // PHYSICAL UNIT patterns (check before count - more specific)
  // Energy: Gigawatt-hour, GWh, Terajoule, TJ, BTU, kWh, MWh
  // Volume: BBL/D/1K, cubic meters, m3, liters, barrels, bushels, cubic feet
  // Temperature: celsius, Celsius, fahrenheit, kelvin
  // Distance: mm, cm, m, km, miles
  // Weight: tonnes, tons, kg, grams, mt, kt (kilotonnes)
  // Area: sq km, square metre, hectares, acres
  // Speed: km/h, mph, knots
  const physicalPatterns = [
    // Energy
    "gwh",
    "gigawatt",
    "twh",
    "terawatt",
    "mwh",
    "megawatt",
    "kwh",
    "kilowatt",
    "wh",
    "watt",
    "terajoule",
    "gigajoule",
    "megajoule",
    "kilojoule",
    "joule",
    "btu",
    "therm",
    "tj", // Must check explicitly
    "gj",
    // Volume/Flow
    "bbl",
    "barrel",
    "cubic",
    "m3",
    "liter",
    "litre",
    "gallon",
    "b/d",
    "bbl/d",
    "bushel",
    "cubic feet",
    "cubic meter",
    // Temperature
    "celsius",
    "fahrenheit",
    "kelvin",
    "degree",
    // Distance
    "millimeter",
    "centimeter",
    "meter",
    "kilometer",
    "mile",
    "yard",
    "foot",
    "inch",
    "mm",
    "cm",
    "km",
    // Weight (as physical, not count)
    "mt", // metric tons in physical context
    "kt", // kilotonnes
    "kg",
    // Area
    "sq km",
    "square km",
    "square metre",
    "square meter",
    "sq. metre",
    "hectare",
    "acre",
    "square",
    // Speed
    "km/h",
    "mph",
    "knot",
    // Other
    "pascal",
    "bar",
    "psi",
    "atm",
    "voltage",
    "ampere",
    "volt",
    "watt",
  ];

  if (physicalPatterns.some((pattern) => lower.includes(pattern))) {
    return {
      type: "physical",
      confidence: 1.0,
      matchedPattern: "physical unit pattern",
      normalizedUnit: "physical",
    };
  }

  // CURRENCY AMOUNT patterns (check before count - more specific)
  // Matches: USD Million, EUR Billion, Million USD, Thousands of Euros, etc.
  const hasCurrency = hasCurrencyCode(lower);

  // Special database patterns (check first for specific patterns)
  if (
    lower.includes("national currency") ||
    lower.includes("local currency") ||
    lower.includes("current usd") ||
    lower.includes("current us$") ||
    lower.includes("dod, current") ||
    lower.includes("constant local currency") ||
    lower.includes("current local currency") ||
    lower.includes("purchasing power parity") ||
    lower.includes("international dollar") ||
    lower.includes("u.s. dollars") ||
    lower.includes("sipri tiv") || // SIPRI Trend Indicator Value
    lower.includes("amt, current")
  ) {
    return {
      type: "currency-amount",
      confidence: 1.0,
      matchedPattern: "special currency pattern",
      normalizedUnit: "currency",
    };
  }

  // Check for currency word forms (dollar, dollars, euro, euros, pound, pounds, etc.)
  const hasCurrencyWord = lower.includes("currency") ||
    lower.includes("dollar") ||
    lower.includes("euro") ||
    lower.includes("pound") ||
    lower.includes("yen") ||
    lower.includes("yuan") ||
    lower.includes("franc") ||
    lower.includes("rupee") ||
    lower.includes("peso") ||
    lower.includes("ruble");

  if (hasCurrency || hasCurrencyWord) {
    return {
      type: "currency-amount",
      confidence: 1.0,
      matchedPattern: "currency amount pattern",
      normalizedUnit: "currency",
    };
  }

  // COUNT patterns (last - catch-all for quantities)
  // Matches: Persons, Thousand, Million, Billion, Companies, Enterprises, Tonnes, Units, Number
  // Also handles "Number of X", "Total X", etc.
  // Includes all scale variations from database
  const countPatterns = [
    "persons",
    "person",
    "people",
    // Scale words (with all case variations from DB)
    "thousand",
    "thousands",
    "million",
    "billion",
    "trillion",
    "hundred million",
    "tens of million",
    "hundred",
    "hundreds",
    "tens of thousands",
    // Organizations
    "companies",
    "company",
    "enterprises",
    "enterprise",
    "firms",
    "firm",
    "individuals",
    // Generic units
    "units",
    "unit",
    "items",
    "item",
    "doses",
    "dose",
    // Weight as count
    "tonnes",
    "tons",
    "ton",
    // Quantifiers
    "number",
    "count",
    "total",
    "quantity",
    // Households/Demographics
    "households",
    "household",
    "families",
    "family",
    "dwellings",
    "dwelling",
    // Employment
    "employees",
    "employee",
    "workers",
    "worker",
    // Education
    "students",
    "student",
    "pupils",
    "pupil",
    // Transportation
    "vehicles",
    "vehicle",
    "cars",
    "car",
    "flights",
    "flight",
    // Tourism
    "arrivals",
    "arrival",
    "visitors",
    "visitor",
    "tourists",
    "tourist",
    "passengers",
    "passenger",
    // Business
    "subscribers",
    "subscriber",
    "users",
    "user",
    "customers",
    "customer",
    "transactions",
    "transaction",
    "transfers",
    "transfer",
    "contracts",
    "contract",
    "projects",
    "project",
    // Vital statistics
    "births",
    "birth",
    "deaths",
    "death",
    "cases",
    "case",
    "incidents",
    "incident",
  ];

  if (
    countPatterns.some((pattern) => lower.includes(pattern)) ||
    lower.startsWith("number of ") ||
    lower.startsWith("total ") ||
    lower.startsWith("count of ")
  ) {
    return {
      type: "count",
      confidence: 0.9, // Slightly lower confidence as it's a catch-all
      matchedPattern: "count/quantity pattern",
      normalizedUnit: "count",
    };
  }

  // If nothing matched, return unknown
  return {
    type: "unknown",
    confidence: 0.0,
    normalizedUnit: normalized,
  };
}

/**
 * Check if two unit types are semantically compatible
 *
 * Compatible combinations:
 * - Same type (percentage + percentage)
 * - Count + Count with different scales (Thousand + Million)
 * - Currency + Currency with different scales/currencies
 *
 * Incompatible combinations:
 * - Count + Index
 * - Count + Percentage
 * - Index + Percentage
 * - Physical + Count
 * - etc.
 */
export function areUnitsCompatible(
  type1: UnitSemanticType,
  type2: UnitSemanticType,
): boolean {
  // Same types are always compatible
  if (type1 === type2) {
    return true;
  }

  // Unknown types are considered incompatible with everything
  if (type1 === "unknown" || type2 === "unknown") {
    return false;
  }

  // Count and Currency can have different scales but same semantic type
  // For example: "Thousand" and "Million" are both counts
  // "USD Million" and "EUR Billion" are both currency amounts
  if (
    (type1 === "count" && type2 === "count") ||
    (type1 === "currency-amount" && type2 === "currency-amount")
  ) {
    return true;
  }

  // All other combinations are incompatible
  return false;
}

/**
 * Get a human-readable description of the unit type
 */
export function getUnitTypeDescription(type: UnitSemanticType): string {
  switch (type) {
    case "percentage":
      return "Percentage or share (%, percent, percent of GDP)";
    case "index":
      return "Index value or points (Index, points, basis points)";
    case "count":
      return "Absolute count or quantity (persons, thousand, million, tonnes)";
    case "currency-amount":
      return "Monetary amount (USD Million, EUR Billion, etc.)";
    case "physical":
      return "Physical measurement (celsius, mm, GWh, BBL/D)";
    case "rate":
      return "Rate or per-unit measure (per 1000 people, per capita)";
    case "ratio":
      return "Ratio or multiple (times, ratio, debt to equity)";
    case "duration":
      return "Time duration (days, years, months)";
    case "unknown":
      return "Unknown or unclassified unit type";
  }
}
