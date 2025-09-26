/**
 * Comprehensive unit detection and normalization utilities
 */

import type { Scale, TimeScale } from "../types.ts";

// Currency codes from the data
export const CURRENCY_CODES: ReadonlySet<string> = new Set<string>([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "CAD",
  "AUD",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "NZD",
  "SGD",
  "HKD",
  "KRW",
  "INR",
  "RUB",
  "BRL",
  "MXN",
  "ZAR",
  "TRY",
  "AED",
  "SAR",
  "THB",
  "MYR",
  "IDR",
  "PHP",
  "VND",
  "PKR",
  "BDT",
  "NGN",
  "EGP",
  "ARS",
  "COP",
  "CLP",
  "PEN",
  "UYU",
  "BOB",
  "PYG",
  "VEF", // Venezuelan Bolívar Fuerte (old)
  "VES", // Venezuelan Bolívar Soberano (current)
  "CRC",
  "GTQ",
  "HNL",
  "NIO",
  "DOP",
  "JMD",
  "TTD",
  "BBD",
  "BSD",
  "BZD",
  "XCD",
  "HTG",
  "SRD",
  "GYD",
  "AWG",
  "KYD",
  "BMD",
  "PAB",
  "MAD",
  "DZD",
  "TND",
  "LYD",
  "JOD",
  "LBP",
  "SYP",
  "IQD",
  "KWD",
  "BHD",
  "OMR",
  "QAR",
  "ILS",
  "GEL",
  "AMD",
  "AZN",
  "KZT",
  "KGS",
  "TJS",
  "TMT",
  "UZS",
  "AFN",
  "MMK",
  "LAK",
  "KHR",
  "NPR",
  "LKR",
  "MVR",
  "BTN",
  "MNT",
  "KPW",
  "TWD",
  "MOP",
  "BND",
  "FJD",
  "PGK",
  "WST",
  "SBD",
  "TOP",
  "VUV",
  "XPF",
  "ETB",
  "KES",
  "TZS",
  "UGX",
  "RWF",
  "BIF",
  "MGA",
  "MWK",
  "MZN",
  "ZMW",
  "ZWL",
  "BWP",
  "NAD",
  "SZL",
  "LSL",
  "GHS",
  "GMD",
  "GNF",
  "LRD",
  "SLL",
  "XOF",
  "XAF",
  "CVE",
  "STN",
  "SCR",
  "MUR",
  "KMF",
  "DJF",
  "ERN",
  "SSP",
  "SDG",
  "MRU",
  "ALL",
  "MKD",
  "RSD",
  "BAM",
  "BGN",
  "RON",
  "MDL",
  "UAH",
  "BYN",
  "PLN",
  "CZK",
  "HUF",
  "HRK",
  "ISK",
  "CUP",
  "AOA",
  "CDF",
]);

// Unit patterns with their categories
export interface UnitPattern {
  pattern: RegExp;
  category: UnitCategory;
  scale?: Scale;
  timeScale?: TimeScale;
  normalized?: string;
}

export type UnitCategory =
  | "currency"
  | "percentage"
  | "index"
  | "physical"
  | "energy"
  | "temperature"
  | "population"
  | "count"
  | "rate"
  | "time"
  | "composite"
  | "unknown";

// Magnitude patterns (can be combined with currencies)
export const MAGNITUDE_PATTERNS: UnitPattern[] = [
  { pattern: /\btrill?i?on?s?\b/i, category: "currency", scale: "trillions" },
  {
    pattern: /\bbill?i?on?s?\b|\bbn\b/i,
    category: "currency",
    scale: "billions",
  },
  {
    pattern: /\bmill?i?on?s?\b|\bmn\b|\bmio\b/i,
    category: "currency",
    scale: "millions",
  },
  {
    pattern: /\bthou?sand?s?\b|\bk\b/i,
    category: "currency",
    scale: "thousands",
  },
  { pattern: /\bhundreds?\b/i, category: "currency", scale: "hundreds" },
];

// Time-based patterns for flow indicators
export const TIME_PATTERNS: UnitPattern[] = [
  {
    pattern: /per\s+year|\/year|\/yr|annual/i,
    category: "time",
    timeScale: "year",
  },
  {
    pattern: /per\s+quarter|\/quarter|\/q\b|quarterly/i,
    category: "time",
    timeScale: "quarter",
  },
  {
    pattern: /per\s+month|\/month|\/mo\b|monthly/i,
    category: "time",
    timeScale: "month",
  },
  {
    pattern: /per\s+week|\/week|\/wk\b|weekly/i,
    category: "time",
    timeScale: "week",
  },
  {
    pattern: /per\s+day|\/day|\/d\b|daily/i,
    category: "time",
    timeScale: "day",
  },
  {
    pattern: /per\s+hour|\/hour|\/hr?\b|hourly/i,
    category: "time",
    timeScale: "hour",
  },
];

// Percentage and ratio patterns
export const PERCENTAGE_PATTERNS: UnitPattern[] = [
  {
    pattern: /percent\s+of\s+GDP/i,
    category: "percentage",
    normalized: "% of GDP",
  },
  {
    pattern: /percent\s+of\s+potential\s+GDP/i,
    category: "percentage",
    normalized: "% of potential GDP",
  },
  {
    pattern: /percent\s+change/i,
    category: "percentage",
    normalized: "% change",
  },
  {
    pattern: /percentage\s+points?/i,
    category: "percentage",
    normalized: "pp",
  },
  {
    pattern: /\bpp\b/i,
    category: "percentage",
    normalized: "pp",
  },
  { pattern: /percent|%/i, category: "percentage", normalized: "%" },
  {
    pattern: /basis\s+points?|bps/i,
    category: "percentage",
    normalized: "bps",
  },
];

// Physical quantity patterns
export const PHYSICAL_PATTERNS: UnitPattern[] = [
  {
    pattern: /BBL\/D\/1K|barrels?\s+per\s+day/i,
    category: "physical",
    normalized: "BBL/D/1K",
  },
  {
    pattern: /thousand\s+tonnes/i,
    category: "physical",
    normalized: "thousand tonnes",
  },
  { pattern: /tonnes?|tons?/i, category: "physical", normalized: "tonnes" },
  { pattern: /kg|kilogram/i, category: "physical", normalized: "kg" },
  { pattern: /kt\b/i, category: "physical", normalized: "KT" },
  { pattern: /mm\b|millimeters?/i, category: "physical", normalized: "mm" },
  { pattern: /celsius|°C/i, category: "temperature", normalized: "celsius" },
  {
    pattern: /liters?|litres?|liter\b|l\b/i,
    category: "physical",
    normalized: "liters",
  },
  { pattern: /gallons?/i, category: "physical", normalized: "gallons" },
  { pattern: /cubic\s+feet/i, category: "physical", normalized: "cubic feet" },
  {
    pattern: /square\s+met(?:re|er)/i,
    category: "physical",
    normalized: "sq meter",
  },
  { pattern: /hectares?|ha\b/i, category: "physical", normalized: "hectares" },
  { pattern: /mt\b/i, category: "physical", normalized: "MT" },
  { pattern: /days?\b/i, category: "time", normalized: "days" },
  { pattern: /months?\b/i, category: "time", normalized: "months" },
  { pattern: /years?\b/i, category: "time", normalized: "years" },
  { pattern: /hours?\b/i, category: "time", normalized: "hours" },
];

// Energy patterns
export const ENERGY_PATTERNS: UnitPattern[] = [
  {
    pattern: /gigawatt[\s-]?hours?|gwh/i,
    category: "energy",
    normalized: "GWh",
  },
  { pattern: /terajoules?|tj\b/i, category: "energy", normalized: "TJ" },
  { pattern: /megawatts?|mw\b/i, category: "energy", normalized: "MW" },
];

// Index and point patterns
export const INDEX_PATTERNS: UnitPattern[] = [
  { pattern: /points?(?!\s+of)/i, category: "index", normalized: "points" },
  { pattern: /index/i, category: "index", normalized: "index" },
  { pattern: /\bdxy\b/i, category: "index", normalized: "DXY" },
];

// Population and count patterns
export const COUNT_PATTERNS: UnitPattern[] = [
  {
    pattern: /doses?\s+per\s+100\s+people/i,
    category: "count",
    normalized: "doses per 100 people",
  },
  {
    pattern: /per\s+1000\s+people/i,
    category: "rate",
    normalized: "per 1000 people",
  },
  {
    pattern: /per\s+(?:one\s+)?million\s+people/i,
    category: "rate",
    normalized: "per million people",
  },
  {
    pattern: /car\s+registrations?/i,
    category: "count",
    normalized: "car registrations",
  },
  {
    pattern: /vehicle\s+registrations?/i,
    category: "count",
    normalized: "vehicle registrations",
  },
  { pattern: /persons?/i, category: "population", normalized: "persons" },
  { pattern: /people/i, category: "population", normalized: "people" },
  { pattern: /doses?/i, category: "count", normalized: "doses" },
  { pattern: /units?(?!\s+of)/i, category: "count", normalized: "units" },
  { pattern: /dwellings?/i, category: "count", normalized: "dwellings" },
  {
    pattern: /companies?(?:\s+and\s+individuals)?/i,
    category: "count",
    normalized: "companies",
  },
  { pattern: /individuals?/i, category: "count", normalized: "individuals" },
  { pattern: /households?/i, category: "count", normalized: "households" },
  {
    pattern: /workers?|employees?/i,
    category: "population",
    normalized: "workers",
  },
  { pattern: /students?/i, category: "population", normalized: "students" },
  { pattern: /vehicles?/i, category: "count", normalized: "vehicles" },
  { pattern: /number\s+of/i, category: "count", normalized: "count" },
];

/**
 * Parse a unit string and extract its components
 */
export interface ParsedUnit {
  original: string;
  category: UnitCategory;
  currency?: string;
  scale?: Scale;
  timeScale?: TimeScale;
  normalized?: string;
  isComposite: boolean;
  components: {
    currency?: string;
    magnitude?: string;
    time?: string;
    special?: string;
  };
}

/**
 * Detect if unit contains a ratio pattern (e.g., USD/Liter, KRW/Hour)
 */
function detectRatio(unitText: string): {
  numerator?: string;
  denominator?: string;
  isRatio: boolean;
} {
  // Check for currency/something patterns
  const ratioPattern = /([A-Z]{3})\s*\/\s*(.+)/i;
  const match = ratioPattern.exec(unitText);

  if (match) {
    const possibleCurrency = match[1].toUpperCase();
    if (CURRENCY_CODES.has(possibleCurrency)) {
      return {
        numerator: possibleCurrency,
        denominator: match[2],
        isRatio: true,
      };
    }
  }

  return { isRatio: false };
}

/**
 * Parse unit text to extract structured information
 */
export function parseUnit(unitText: string): ParsedUnit {
  if (!unitText) {
    return {
      original: "",
      category: "unknown",
      isComposite: false,
      components: {},
    };
  }

  const normalized = unitText.trim();
  const result: ParsedUnit = {
    original: normalized,
    category: "unknown",
    isComposite: false,
    components: {},
  };

  // Check for currency codes
  for (const code of CURRENCY_CODES) {
    const regex = new RegExp(`\\b${code}\\b`, "i");
    if (regex.test(normalized)) {
      result.currency = code.toUpperCase();
      result.category = "currency";
      result.components.currency = code;
      break;
    }
  }

  // Check for magnitude/scale (but not if it's part of a compound physical unit)
  if (
    !normalized.includes("thousand tonnes") &&
    !normalized.includes("thousand tons") &&
    !normalized.includes("million tonnes") &&
    !normalized.includes("million tons") &&
    !normalized.includes("billion tonnes") &&
    !normalized.includes("billion tons")
  ) {
    for (const pattern of MAGNITUDE_PATTERNS) {
      if (pattern.pattern.test(normalized)) {
        result.scale = pattern.scale;
        result.components.magnitude = pattern.scale;
        if (!result.category || result.category === "unknown") {
          result.category = pattern.category;
        }
        break;
      }
    }
  }

  // Check for time scale
  for (const pattern of TIME_PATTERNS) {
    if (pattern.pattern.test(normalized)) {
      result.timeScale = pattern.timeScale;
      result.components.time = pattern.timeScale;
      if (result.category === "currency" || result.scale) {
        result.category = "composite"; // Currency/magnitude + time = flow
        result.isComposite = true;
      }
      break;
    }
  }

  // Check for percentages (overrides other categories)
  for (const pattern of PERCENTAGE_PATTERNS) {
    if (pattern.pattern.test(normalized)) {
      result.category = "percentage";
      result.normalized = pattern.normalized;
      break;
    }
  }

  // Check for energy units (before physical to catch compound energy terms)
  if (result.category === "unknown") {
    for (const pattern of ENERGY_PATTERNS) {
      if (pattern.pattern.test(normalized)) {
        result.category = pattern.category;
        result.normalized = pattern.normalized;
        break;
      }
    }
  }

  // Check for physical units
  if (result.category === "unknown") {
    for (const pattern of PHYSICAL_PATTERNS) {
      if (pattern.pattern.test(normalized)) {
        result.category = pattern.category;
        result.normalized = pattern.normalized;
        break;
      }
    }
  }

  // Check for indices
  if (result.category === "unknown") {
    for (const pattern of INDEX_PATTERNS) {
      if (pattern.pattern.test(normalized)) {
        result.category = pattern.category;
        result.normalized = pattern.normalized;
        break;
      }
    }
  }

  // Check for counts
  if (result.category === "unknown") {
    for (const pattern of COUNT_PATTERNS) {
      if (pattern.pattern.test(normalized)) {
        result.category = pattern.category;
        result.normalized = pattern.normalized;
        break;
      }
    }
  }

  // Check for ratios (e.g., USD/Liter, KRW/Hour)
  const ratio = detectRatio(normalized);
  if (ratio.isRatio) {
    result.category = "composite";
    result.isComposite = true;
    if (ratio.numerator && CURRENCY_CODES.has(ratio.numerator)) {
      result.currency = ratio.numerator;
      result.components.currency = ratio.numerator;
    }

    // Check if denominator is a known unit
    if (ratio.denominator) {
      const denomLower = ratio.denominator.toLowerCase();
      if (denomLower.includes("hour") || denomLower === "hr") {
        result.timeScale = "hour";
        result.components.time = "hour";
        result.components.special = "wage";
      } else if (denomLower.includes("liter") || denomLower === "l") {
        result.components.special = "price per volume";
      } else if (denomLower.includes("kg") || denomLower.includes("kilogram")) {
        result.components.special = "price per weight";
      } else if (denomLower.includes("day")) {
        result.timeScale = "day";
        result.components.time = "day";
      }
    }
  }

  return result;
}

/**
 * Determine if a unit represents a monetary value
 */
export function isMonetaryUnit(unitText: string): boolean {
  const parsed = parseUnit(unitText);
  return parsed.category === "currency" || parsed.category === "composite";
}

/**
 * Determine if a unit represents a percentage or ratio
 */
export function isPercentageUnit(unitText: string): boolean {
  const parsed = parseUnit(unitText);
  return parsed.category === "percentage";
}

/**
 * Extract currency code from unit text
 */
export function extractCurrency(unitText: string): string | null {
  const parsed = parseUnit(unitText);
  return parsed.currency || null;
}

/**
 * Extract scale/magnitude from unit text
 */
export function extractScale(unitText: string): Scale | null {
  const parsed = parseUnit(unitText);
  return parsed.scale || null;
}

/**
 * Extract time scale from unit text
 */
export function extractTimeScale(unitText: string): TimeScale | null {
  const parsed = parseUnit(unitText);
  return parsed.timeScale || null;
}
