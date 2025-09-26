/**
 * FX Detection Utilities for V3 Architecture
 *
 * Determines which items need foreign exchange conversion
 * during the classification phase, enabling truly parallel processing
 */

import type { ParsedData } from "../shared/types.ts";

export interface FXDetection {
  needsFX: boolean;
  currencyCode?: string;
  pricePattern?: "per_unit" | "absolute" | "none";
  fxContext?: "price" | "value" | "none";
}

/**
 * Currency codes that require FX conversion
 */
const CURRENCY_REGEX = /\b([A-Z]{3})\b/g;
const CURRENCY_CODES = new Set([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "AUD",
  "CAD",
  "CHF",
  "HKD",
  "NZD",
  "SEK",
  "KRW",
  "SGD",
  "NOK",
  "MXN",
  "INR",
  "RUB",
  "ZAR",
  "TRY",
  "BRL",
  "TWD",
  "DKK",
  "PLN",
  "THB",
  "IDR",
  "HUF",
  "CZK",
  "ILS",
  "CLP",
  "PHP",
  "AED",
  "COP",
  "SAR",
  "MYR",
  "RON",
  "ARS",
  "BGN",
  "HRK",
  "LTL",
  "LVL",
  "EEK",
  "UAH",
  "PEN",
  "VND",
  "NGN",
  "EGP",
  "PKR",
  "BDT",
  "KES",
  "MAD",
  "VEB",
  "UYU",
  "LBP",
  "JOD",
  "KWD",
  "OMR",
  "QAR",
  "BHD",
  "LKR",
  "NPR",
  "MDL",
  "ZWL",
  "SSP",
  "XOF",
  "XAF",
  "XPF",
  "XCD",
  "XDR",
  "XAG",
  "XAU",
  // Pacific Island currencies
  "VUV",
  "WST",
  "SBD",
  "TOP",
  "FJD",
  "PGK",
  "AWG",
  "BBD",
  "BSD",
  "KYD",
]);

/**
 * Price unit patterns (e.g., "per barrel", "/tonne")
 */
const PER_UNIT_PATTERNS = [
  /\bper\s+\w+/i,
  /\/\w+/,
  /\bp\/\w+/i,
];

/**
 * Detect if an item requires FX conversion based on its unit
 */
export function detectFXRequirement(item: ParsedData): FXDetection {
  const unit = item.unit?.trim() || "";

  if (!unit) {
    return {
      needsFX: false,
      pricePattern: "none",
      fxContext: "none",
    };
  }

  // Check for currency codes
  const currencyMatches = Array.from(unit.matchAll(CURRENCY_REGEX));
  const currencies = currencyMatches
    .map((match) => match[1])
    .filter((code) => CURRENCY_CODES.has(code));

  if (currencies.length === 0) {
    return {
      needsFX: false,
      pricePattern: "none",
      fxContext: "none",
    };
  }

  const currencyCode = currencies[0]; // Use first valid currency found

  // Check if it's a price (has "per" or "/" pattern)
  const hasPerUnit = PER_UNIT_PATTERNS.some((pattern) => pattern.test(unit));

  // Determine the FX context
  let pricePattern: "per_unit" | "absolute" | "none";
  let fxContext: "price" | "value" | "none";

  if (hasPerUnit) {
    // e.g., "USD per barrel", "EUR/tonne"
    pricePattern = "per_unit";
    fxContext = "price";
  } else if (currencyCode) {
    // e.g., "USD millions", "EUR", "thousand USD"
    pricePattern = "absolute";
    fxContext = "value";
  } else {
    pricePattern = "none";
    fxContext = "none";
  }

  return {
    needsFX: !!currencyCode,
    currencyCode,
    pricePattern,
    fxContext,
  };
}

/**
 * Detect if a domain bucket has any items needing FX
 */
export function domainNeedsFX(items: ParsedData[]): boolean {
  return items.some((item) => {
    const detection = detectFXRequirement(item);
    return detection.needsFX;
  });
}

/**
 * Split items by FX requirement
 */
export function splitItemsByFX(items: ParsedData[]): {
  fxItems: ParsedData[];
  nonFXItems: ParsedData[];
} {
  const fxItems: ParsedData[] = [];
  const nonFXItems: ParsedData[] = [];

  items.forEach((item) => {
    const detection = detectFXRequirement(item);
    if (detection.needsFX) {
      fxItems.push({
        ...item,
        _fxDetection: detection,
        metadata: {
          ...item.metadata,
          _fxDetection: detection,
        },
      } as any);
    } else {
      nonFXItems.push(item);
    }
  });

  return { fxItems, nonFXItems };
}

/**
 * Check if domain always needs FX (monetary domains)
 */
export function isAlwaysFXDomain(domain: string): boolean {
  return domain === "monetaryStock" || domain === "monetaryFlow";
}

/**
 * Check if domain conditionally needs FX (physical domains with prices)
 */
export function isConditionalFXDomain(domain: string): boolean {
  return ["commodities", "agriculture", "metals", "energy", "crypto"].includes(
    domain,
  );
}

/**
 * Check if domain never needs FX (pure numeric domains)
 */
export function isNeverFXDomain(domain: string): boolean {
  return ["counts", "percentages", "indices", "ratios"].includes(domain);
}
