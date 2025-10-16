/**
 * Unit Type Classification System
 *
 * Classifies economic indicator units into semantic categories to detect
 * incompatible unit type mixing (e.g., count vs index vs percentage).
 *
 * Based on comprehensive analysis of 100+ unique unit types from the database.
 * Copied from packages/econify/src/quality/unit_type_classifier.ts
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
export const CURRENCY_CODES = [
  "all", // Albanian Lek
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
    const regex = new RegExp(`\\b${code}\\b|${code}[-/]|[-/]${code}`);
    return regex.test(lowerUnit);
  });
}

/**
 * Comprehensive unit type classifier
 */
export function classifyUnitType(
  unit: string | null | undefined,
): UnitTypeClassification {
  if (!unit || unit.trim() === "") {
    return { type: "unknown", confidence: 0.0 };
  }

  const normalized = unit.trim();
  const lower = normalized.toLowerCase();

  // PERCENTAGE patterns
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
  if (
    lower === "points" ||
    lower === "index" ||
    lower === "basis points" ||
    lower === "bps" ||
    lower.includes("index (") ||
    lower.includes("index points")
  ) {
    return {
      type: "index",
      confidence: 1.0,
      matchedPattern: "index/points pattern",
      normalizedUnit: "index",
    };
  }

  // PRICE/COST patterns
  if (
    hasCurrencyCode(lower) &&
    (lower.includes("/") || lower.includes(" per "))
  ) {
    return {
      type: "rate",
      confidence: 1.0,
      matchedPattern: "price/cost pattern (currency per unit)",
      normalizedUnit: "currency per unit",
    };
  }

  // RATE patterns
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

  // DURATION patterns
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

  // PHYSICAL UNIT patterns
  const physicalPatterns = [
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
    "tj",
    "gj",
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
    "celsius",
    "fahrenheit",
    "kelvin",
    "degree",
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
    "mt",
    "kt",
    "kg",
    "sq km",
    "square km",
    "square metre",
    "square meter",
    "sq. metre",
    "hectare",
    "acre",
    "square",
    "km/h",
    "mph",
    "knot",
    "pascal",
    "bar",
    "psi",
    "atm",
    "voltage",
    "ampere",
    "volt",
  ];

  if (physicalPatterns.some((pattern) => lower.includes(pattern))) {
    return {
      type: "physical",
      confidence: 1.0,
      matchedPattern: "physical unit pattern",
      normalizedUnit: "physical",
    };
  }

  // CURRENCY AMOUNT patterns
  const hasCurrency = hasCurrencyCode(lower);

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
    lower.includes("sipri tiv") ||
    lower.includes("amt, current")
  ) {
    return {
      type: "currency-amount",
      confidence: 1.0,
      matchedPattern: "special currency pattern",
      normalizedUnit: "currency",
    };
  }

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

  // COUNT patterns
  const countPatterns = [
    "persons",
    "person",
    "people",
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
    "companies",
    "company",
    "enterprises",
    "enterprise",
    "firms",
    "firm",
    "individuals",
    "units",
    "unit",
    "items",
    "item",
    "doses",
    "dose",
    "tonnes",
    "tons",
    "ton",
    "number",
    "count",
    "total",
    "quantity",
    "households",
    "household",
    "families",
    "family",
    "dwellings",
    "dwelling",
    "employees",
    "employee",
    "workers",
    "worker",
    "students",
    "student",
    "pupils",
    "pupil",
    "vehicles",
    "vehicle",
    "cars",
    "car",
    "flights",
    "flight",
    "arrivals",
    "arrival",
    "visitors",
    "visitor",
    "tourists",
    "tourist",
    "passengers",
    "passenger",
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
      confidence: 0.9,
      matchedPattern: "count/quantity pattern",
      normalizedUnit: "count",
    };
  }

  return {
    type: "unknown",
    confidence: 0.0,
    normalizedUnit: normalized,
  };
}
