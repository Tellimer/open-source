/**
 * Smart FX Detection Logic for V2 Pipeline
 *
 * Determines when FX rates are needed based on domain bucket analysis.
 * Handles both explicit monetary domains and price-based indicators.
 */

import type { ParsedData } from "../shared/types.ts";
import type { V2Buckets } from "./types.ts";

/**
 * Currency codes that require FX conversion
 */
const MAJOR_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
  "INR",
  "BRL",
  "RUB",
  "KRW",
  "MXN",
  "ZAR",
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
  "TRY",
  "ILS",
  "AED",
  "SAR",
  "QAR",
];

/**
 * Price indicator patterns that suggest currency per unit pricing
 */
const PRICE_PATTERNS = [
  // Commodities
  /\b(usd|eur|gbp|jpy|cad|aud|chf|cny)\s*(per|\/)\s*(barrel|bbl|ounce|oz|tonne|ton|pound|lb|gallon|gal)/i,

  // Agriculture
  /\b(usd|eur|gbp|jpy|cad|aud|chf|cny)\s*(per|\/)\s*(bushel|bu|tonne|ton|pound|lb|head|acre)/i,

  // Metals
  /\b(usd|eur|gbp|jpy|cad|aud|chf|cny)\s*(per|\/)\s*(ounce|oz|troy\s*oz|tonne|ton|pound|lb)/i,

  // Energy
  /\b(usd|eur|gbp|jpy|cad|aud|chf|cny)\s*(per|\/)\s*(mwh|kwh|gwh|btu|mmbtu|therm|barrel)/i,

  // Generic currency per unit
  /\b(usd|eur|gbp|jpy|cad|aud|chf|cny)\s*(per|\/)/i,
];

/**
 * Check if an individual item needs FX conversion
 */
export function itemNeedsFX(item: ParsedData): boolean {
  // Check explicit currency_code field
  if (item.currency_code) {
    return true;
  }

  // Check parsed unit for currency information
  if (item.parsedUnit) {
    const { currency, category } = item.parsedUnit;
    if (currency || category === "currency" || category === "composite") {
      return true;
    }
  }

  // Check unit string for price patterns
  const unit = item.unit?.toLowerCase() || "";
  if (PRICE_PATTERNS.some((pattern) => pattern.test(unit))) {
    return true;
  }

  // Check for standalone currency codes
  const currencyRegex = new RegExp(
    `\\b(${MAJOR_CURRENCIES.join("|")})\\b`,
    "i",
  );
  if (currencyRegex.test(unit)) {
    return true;
  }

  return false;
}

/**
 * Check if a list of items contains any that need FX
 */
export function itemsNeedFX(items: ParsedData[]): boolean {
  return items.some((item) => itemNeedsFX(item));
}

/**
 * Analyze domain buckets to determine if FX is needed
 */
export function needsFXForBuckets(buckets: V2Buckets): boolean {
  // Monetary domains always need FX if they have items
  if (buckets.monetaryStock.length > 0 || buckets.monetaryFlow.length > 0) {
    return true;
  }

  // Check price-based domains for currency components
  const priceBasedDomains = [
    ...buckets.commodities,
    ...buckets.agriculture,
    ...buckets.metals,
    ...buckets.energy,
  ];

  return itemsNeedFX(priceBasedDomains);
}

/**
 * Get detailed FX requirements analysis for debugging
 */
export function analyzeFXRequirements(buckets: V2Buckets): {
  needsFX: boolean;
  reasons: string[];
  monetaryCount: number;
  priceBasedCount: number;
  nonFXCount: number;
} {
  const reasons: string[] = [];
  let monetaryCount = 0;
  let priceBasedCount = 0;
  let nonFXCount = 0;

  // Count monetary items
  monetaryCount = buckets.monetaryStock.length + buckets.monetaryFlow.length;
  if (monetaryCount > 0) {
    reasons.push(`${monetaryCount} monetary indicators require FX`);
  }

  // Check price-based domains
  const priceBasedDomains = [
    { name: "commodities", items: buckets.commodities },
    { name: "agriculture", items: buckets.agriculture },
    { name: "metals", items: buckets.metals },
    { name: "energy", items: buckets.energy },
  ];

  for (const domain of priceBasedDomains) {
    const fxItems = domain.items.filter((item) => itemNeedsFX(item));
    if (fxItems.length > 0) {
      priceBasedCount += fxItems.length;
      reasons.push(
        `${fxItems.length} ${domain.name} price indicators require FX`,
      );
    }
  }

  // Count non-FX items
  const nonFXDomains = [
    ...buckets.counts,
    ...buckets.percentages,
    ...buckets.indices,
    ...buckets.ratios,
    ...buckets.crypto,
  ];

  // Add non-price items from price-based domains
  for (const domain of priceBasedDomains) {
    nonFXDomains.push(...domain.items.filter((item) => !itemNeedsFX(item)));
  }

  nonFXCount = nonFXDomains.length;

  const needsFX = monetaryCount > 0 || priceBasedCount > 0;

  if (!needsFX && nonFXCount > 0) {
    reasons.push(
      `${nonFXCount} indicators do not require FX (counts, percentages, indices, ratios, crypto, physical volumes)`,
    );
  }

  return {
    needsFX,
    reasons,
    monetaryCount,
    priceBasedCount,
    nonFXCount,
  };
}

/**
 * Extract currency codes from items that need FX
 */
export function extractRequiredCurrencies(buckets: V2Buckets): string[] {
  const currencies = new Set<string>();

  const allItems = [
    ...buckets.monetaryStock,
    ...buckets.monetaryFlow,
    ...buckets.commodities,
    ...buckets.agriculture,
    ...buckets.metals,
    ...buckets.energy,
  ];

  for (const item of allItems) {
    if (itemNeedsFX(item)) {
      // Extract from currency_code field
      if (item.currency_code) {
        currencies.add(item.currency_code.toUpperCase());
      }

      // Extract from parsed unit
      if (item.parsedUnit?.currency) {
        currencies.add(item.parsedUnit.currency.toUpperCase());
      }

      // Extract from unit string
      const unit = item.unit?.toLowerCase() || "";
      for (const currency of MAJOR_CURRENCIES) {
        if (new RegExp(`\\b${currency.toLowerCase()}\\b`).test(unit)) {
          currencies.add(currency);
        }
      }
    }
  }

  return Array.from(currencies).sort();
}
