/**
 * Pure functions for computing classification facts
 *
 * These functions analyze items to determine their domain classification
 * without making decisions about routing or processing.
 */

import type { ClassificationFacts, DomainBucket } from "./types.ts";

// ============================================================================
// Currency Detection
// ============================================================================

/**
 * Common currency codes (ISO 4217)
 */
const CURRENCY_CODES = new Set([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "AUD",
  "NZD",
  "CAD",
  "SGD",
  "HKD",
  "NOK",
  "SEK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "HRK",
  "ISK",
  "CNY",
  "INR",
  "KRW",
  "THB",
  "MYR",
  "IDR",
  "PHP",
  "VND",
  "BRL",
  "MXN",
  "ARS",
  "CLP",
  "COP",
  "PEN",
  "UYU",
  "RUB",
  "TRY",
  "ZAR",
  "EGP",
  "NGN",
  "KES",
  "GHS",
  "MAD",
  "TND",
  "AED",
  "SAR",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "ILS",
  "JOD",
  "LBP",
  "SYP",
  "IQD",
  "IRR",
  "AFN",
  "PKR",
  "LKR",
  "BDT",
  "NPR",
  "BTN",
  "MMK",
  "LAK",
  "KHR",
  "VUV",
  "FJD",
  "TOP",
  "WST",
  "SBD",
  "PGK",
  "TWD",
  "MOP",
  "BND",
  "XCD",
  "BBD",
  "BZD",
  "JMD",
  "TTD",
  "GYD",
  "SRD",
  "HTG",
  "DOP",
  "CUP",
  "GTQ",
  "HNL",
  "NIO",
  "CRC",
  "PAB",
  "BSD",
  "KYD",
  "BMD",
  "XPF",
  "XOF",
  "XAF",
  "CDF",
  "AOA",
  "ZMW",
  "MWK",
  "MZN",
  "SZL",
  "LSL",
  "NAD",
  "BWP",
  "ZWL",
  "ETB",
  "ERN",
  "DJF",
  "SOS",
  "UGX",
  "TZS",
  "RWF",
  "BIF",
  "KMF",
  "MGA",
  "MUR",
  "SCR",
  "MVR",
  "GMD",
  "SLL",
  "LRD",
  "GNF",
  "CVE",
  "STN",
  "SDG",
  "SSP",
  "LYD",
  "TJS",
  "UZS",
  "TMT",
  "KGS",
  "KZT",
  "AZN",
  "GEL",
  "AMD",
  "MDL",
  "UAH",
  "BYN",
  "ALL",
  "MKD",
  "RSD",
  "BAM",
  "VEF",
  "VES",
  "BOB",
  "PYG",
  "FKP",
  "GIP",
  "SHP",
  "JEP",
  "GGP",
  "IMP",
  "TVD",
  "ANG",
  "AWG",
  "SVC",
  "YER",
  "MRU",
  "COU",
  "USN",
]);

/**
 * Cryptocurrency codes
 */
const CRYPTO_CODES = new Set([
  "BTC",
  "ETH",
  "XRP",
  "LTC",
  "BCH",
  "ADA",
  "DOT",
  "LINK",
  "BNB",
  "XLM",
  "DOGE",
  "UNI",
  "SOL",
  "MATIC",
  "AVAX",
  "ATOM",
  "TRX",
  "ETC",
  "XMR",
  "VET",
  "FIL",
  "THETA",
  "ALGO",
  "XTZ",
  "EGLD",
  "HBAR",
  "ICP",
  "NEAR",
  "FLOW",
  "MANA",
  "SAND",
  "AXS",
  "CHZ",
  "ENJ",
  "BAT",
  "ZIL",
  "HOT",
  "OMG",
  "ZRX",
  "COMP",
  "MKR",
  "SNX",
  "SUSHI",
  "YFI",
  "AAVE",
  "CRV",
  "BAL",
  "REN",
  "KNC",
  "LRC",
]);

/**
 * Extract currency code from unit string
 */
export function extractCurrencyCode(unit: string): string | undefined {
  if (!unit) return undefined;

  // Clean the unit string
  const cleanUnit = unit.toUpperCase().trim();

  // Direct currency code match
  for (const code of CURRENCY_CODES) {
    if (cleanUnit.includes(code)) {
      return code;
    }
  }

  // Check for crypto codes
  for (const code of CRYPTO_CODES) {
    if (cleanUnit.includes(code)) {
      return code;
    }
  }

  return undefined;
}

/**
 * Check if unit contains a currency code
 */
export function hasCurrencyCode(unit: string): boolean {
  return extractCurrencyCode(unit) !== undefined;
}

/**
 * Check if unit is a cryptocurrency
 */
export function isCryptoCurrency(unit: string): boolean {
  if (!unit) return false;
  const cleanUnit = unit.toUpperCase().trim();
  return Array.from(CRYPTO_CODES).some((code) => cleanUnit.includes(code));
}

// ============================================================================
// Scale Detection
// ============================================================================

/**
 * Scale indicators in unit strings
 */
const SCALE_PATTERNS = [
  { pattern: /\b(thousand|thousands|k)\b/i, scale: "thousands" },
  { pattern: /\b(million|millions|m)\b/i, scale: "millions" },
  { pattern: /\b(billion|billions|b)\b/i, scale: "billions" },
  { pattern: /\b(trillion|trillions|t)\b/i, scale: "trillions" },
  { pattern: /\b(hundred)\b/i, scale: "hundreds" },
  { pattern: /\b(tens of million)\b/i, scale: "tens_of_millions" },
];

/**
 * Extract scale from unit string
 */
export function extractScale(unit: string): string | undefined {
  if (!unit) return undefined;

  for (const { pattern, scale } of SCALE_PATTERNS) {
    if (pattern.test(unit)) {
      return scale;
    }
  }

  return undefined;
}

/**
 * Check if unit contains a scale indicator
 */
export function hasScale(unit: string): boolean {
  return extractScale(unit) !== undefined;
}

// ============================================================================
// Time Scale Detection
// ============================================================================

/**
 * Time scale patterns
 */
const TIME_PATTERNS = [
  { pattern: /\b(per\s+)?(day|daily)\b/i, timeScale: "day" },
  { pattern: /\b(per\s+)?(week|weekly)\b/i, timeScale: "week" },
  { pattern: /\b(per\s+)?(month|monthly)\b/i, timeScale: "month" },
  { pattern: /\b(per\s+)?(quarter|quarterly)\b/i, timeScale: "quarter" },
  { pattern: /\b(per\s+)?(year|yearly|annual|annually)\b/i, timeScale: "year" },
  { pattern: /\b(per\s+)?(hour|hourly)\b/i, timeScale: "hour" },
];

/**
 * Extract time scale from unit string
 */
export function extractTimeScale(unit: string): string | undefined {
  if (!unit) return undefined;

  for (const { pattern, timeScale } of TIME_PATTERNS) {
    if (pattern.test(unit)) {
      return timeScale;
    }
  }

  return undefined;
}

/**
 * Check if unit contains a time scale indicator
 */
export function hasTimeScale(unit: string): boolean {
  return extractTimeScale(unit) !== undefined;
}

// ============================================================================
// Domain Classification
// ============================================================================

/**
 * Physical unit patterns
 */
const PHYSICAL_PATTERNS = [
  /\b(kg|kilogram|gram|tonne|ton|pound|lb|oz|ounce)\b/i, // Weight
  /\b(meter|metre|km|mile|foot|inch|yard)\b/i, // Distance
  /\b(liter|litre|gallon|barrel|cubic)\b/i, // Volume
  /\b(watt|kwh|mwh|gwh|joule|btu|calorie)\b/i, // Energy
  /\b(celsius|fahrenheit|kelvin)\b/i, // Temperature
  /\b(pascal|bar|psi|atm)\b/i, // Pressure
  /\b(second|minute|hour|day|week|month|year)\b/i, // Time units
];

/**
 * Check if unit represents a physical quantity
 */
export function isPhysicalUnit(unit: string): boolean {
  if (!unit) return false;
  return PHYSICAL_PATTERNS.some((pattern) => pattern.test(unit));
}

/**
 * Check if unit represents a percentage
 */
export function isPercentage(unit: string): boolean {
  if (!unit) return false;
  return /\b(percent|percentage|%)\b/i.test(unit);
}

/**
 * Check if unit represents an index
 */
export function isIndex(unit: string): boolean {
  if (!unit) return false;
  return /\b(index|score|rating|points?)\b/i.test(unit);
}

/**
 * Check if unit represents a ratio
 */
export function isRatio(unit: string): boolean {
  if (!unit) return false;
  return /\b(ratio|rate|per\s+\d+|\/)\b/i.test(unit);
}

// ============================================================================
// Main Classification Function
// ============================================================================

/**
 * Compute classification facts for an item
 */
export function computeClassificationFacts(item: any): ClassificationFacts {
  const unit = item.unit || "";
  const categoryGroup = item.category_group || "";

  // Currency detection
  const currencyCode = extractCurrencyCode(unit);
  const hasCurrency = Boolean(currencyCode);
  const isCrypto = isCryptoCurrency(unit);

  // Scale detection
  const scale = extractScale(unit);
  const hasScaleIndicator = Boolean(scale);

  // Time detection
  const timeScale = extractTimeScale(unit);
  const hasTimeIndicator = Boolean(timeScale);

  // Domain classification
  const isPhysical = isPhysicalUnit(unit);
  const isPct = isPercentage(unit);
  const isIdx = isIndex(unit);
  const isRat = isRatio(unit);

  // Monetary classification
  const isMonetary = hasCurrency && !isCrypto;
  let monetaryType: "stock" | "flow" | undefined;

  if (isMonetary) {
    // Determine if it's a stock or flow based on time indicators and category
    const hasTimeComponent = hasTimeIndicator ||
      /flow|income|revenue|expense|wage|salary/i.test(categoryGroup);
    monetaryType = hasTimeComponent ? "flow" : "stock";
  }

  return {
    hasCurrencyCode: hasCurrency,
    currencyCode,
    hasScale: hasScaleIndicator,
    scale,
    hasTimeScale: hasTimeIndicator,
    timeScale,
    isPhysicalUnit: isPhysical,
    isPercentage: isPct,
    isIndex: isIdx,
    isRatio: isRat,
    isCrypto,
    isMonetary,
    monetaryType,
  };
}

/**
 * Determine domain bucket for an item based on its facts
 */
export function bucketForItem(
  item: any,
  facts: ClassificationFacts,
): DomainBucket {
  // Crypto takes precedence
  if (facts.isCrypto) {
    return "crypto";
  }

  // Monetary classification
  if (facts.isMonetary) {
    return facts.monetaryType === "flow" ? "monetaryFlow" : "monetaryStock";
  }

  // Physical domains
  if (facts.isPhysicalUnit) {
    const unit = item.unit?.toLowerCase() || "";
    const categoryGroup = item.category_group?.toLowerCase() || "";

    // Energy domain
    if (
      /energy|power|electricity|watt|kwh|mwh|gwh|joule|btu|calorie|solar|wind|hydro|nuclear|coal|gas|oil/
        .test(unit + " " + categoryGroup)
    ) {
      return "energy";
    }

    // Commodities domain
    if (
      /commodity|oil|gas|gold|silver|copper|aluminum|steel|iron|zinc|nickel|platinum|palladium|barrel|cubic|bcf|tcf/
        .test(unit + " " + categoryGroup)
    ) {
      return "commodities";
    }

    // Agriculture domain
    if (
      /agriculture|crop|grain|wheat|corn|rice|soybean|cotton|sugar|coffee|cocoa|livestock|cattle|pig|chicken|milk|egg/
        .test(unit + " " + categoryGroup)
    ) {
      return "agriculture";
    }

    // Metals domain
    if (
      /metal|gold|silver|copper|aluminum|steel|iron|zinc|nickel|platinum|palladium|tonne|ton|ounce|troy/
        .test(unit + " " + categoryGroup)
    ) {
      return "metals";
    }
  }

  // Abstract domains
  if (facts.isPercentage) {
    return "percentages";
  }

  if (facts.isIndex) {
    return "indices";
  }

  if (facts.isRatio) {
    return "ratios";
  }

  // Default to counts for everything else
  return "counts";
}
