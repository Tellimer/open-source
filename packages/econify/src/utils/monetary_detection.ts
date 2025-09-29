/**
 * Utility functions for detecting monetary vs non-monetary data
 */

import type { ParsedData } from "../workflows/economic-data-workflow.ts";

/**
 * Determines if a unit string represents a monetary value that needs currency conversion
 */
export function isMonetaryUnit(unitString: string): boolean {
  if (!unitString) return false;

  const upperUnit = unitString.toUpperCase();

  // Check for non-monetary units that should NOT be converted
  const nonMonetaryPatterns = [
    // Percentages
    /\b(PERCENT|PERCENTAGE|%)\b/,
    // Index/Points
    /\b(POINTS?|INDEX)\b/,
    // Temperature
    /\b(CELSIUS|FAHRENHEIT|KELVIN|°[CFK])\b/,
    // Distance/Length
    /\b(MM|CM|M|KM|MILLIMETERS?|CENTIMETERS?|METERS?|KILOMETERS?)\b/,
    // Weight
    /\b(TONS?|KG|KILOGRAMS?|GRAMS?|LBS?|POUNDS?)\b/,
    // Volume
    /\b(BARRELS?|BBL|LITERS?|GALLONS?)\b/,
    // Generic units
    /\b(UNITS?|ITEMS?|PEOPLE|PERSONS?)\b/,
    // Rates (when not monetary)
    /^(RATE|RATIO|SCORE)$/,
  ];

  // Check if unit matches any non-monetary pattern
  for (const pattern of nonMonetaryPatterns) {
    if (pattern.test(upperUnit)) {
      // Special case: Check if it's actually a currency amount with scale
      // e.g., "USD MILLION" should be monetary, but "MILLION" alone is not
      const currencyCodes = [
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
        "ZAR",
        "INR",
        "BRL",
        "RUB",
        "MXN",
        "ARS",
        "CLP",
        "COP",
        "PEN",
        "THB",
        "MYR",
        "IDR",
        "PHP",
        "VND",
        "PLN",
        "CZK",
        "HUF",
        "RON",
        "BGN",
        "HRK",
        "RSD",
        "TRY",
        "ILS",
        "EGP",
        "AED",
        "SAR",
        "QAR",
        "KWD",
        "BHD",
        "OMR",
        "JOD",
        "MAD",
        "TND",
        "NGN",
        "GHS",
        "KES",
        "UGX",
        "TZS",
        "ZMW",
        "BWP",
        "ZAR",
      ];

      const hasCurrency = currencyCodes.some((code) =>
        upperUnit.includes(code)
      );

      // If it's a scale word without currency, it's not monetary
      if (
        /\b(THOUSAND|MILLION|BILLION|TRILLION)\b/.test(upperUnit) &&
        !hasCurrency
      ) {
        return false;
      }

      // For other non-monetary patterns, always return false
      if (!/\b(THOUSAND|MILLION|BILLION|TRILLION)\b/.test(upperUnit)) {
        return false;
      }
    }
  }

  // Check for currency indicators
  const currencyPatterns = [
    // Currency codes (3-letter ISO codes)
    /\b[A-Z]{3}\b/,
    // Currency names
    /\b(DOLLAR|EURO|POUND|YEN|YUAN|RUPEE|REAL|PESO|FRANC|KRONA|KRONE|RAND|RINGGIT|BAHT|WON|LIRA|DINAR|DIRHAM|RIYAL|SHILLING|NAIRA|CEDI|PESO)\b/,
    // Currency symbols (though these might not appear in unit strings)
    /[$€£¥₹₽₩]/,
  ];

  // Additional currency codes to check specifically
  const specificCurrencyCodes = [
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
    "ZAR",
    "INR",
    "BRL",
    "RUB",
    "MXN",
  ];

  // Check if unit contains any specific currency code
  for (const code of specificCurrencyCodes) {
    if (upperUnit.includes(code)) {
      return true;
    }
  }

  // Check if it matches general currency patterns
  for (const pattern of currencyPatterns) {
    if (pattern.test(upperUnit)) {
      // Exclude some common non-currency 3-letter codes
      const nonCurrencyCodes = ["GDP", "CPI", "PMI", "PPI", "API", "BBL"];
      const matches = upperUnit.match(/\b[A-Z]{3}\b/g) || [];

      // If we found 3-letter codes, check they're not in the exclusion list
      if (matches.length > 0) {
        const hasNonCurrency = matches.some((match) =>
          nonCurrencyCodes.includes(match)
        );
        if (!hasNonCurrency) {
          return true;
        }
      } else if (!/\b[A-Z]{3}\b/.test(pattern.source)) {
        // If the pattern wasn't specifically for 3-letter codes, it's a currency
        return true;
      }
    }
  }

  return false;
}

/**
 * Analyzes a batch of data points to determine if the indicator is monetary
 */
export function isMonetaryIndicator(dataPoints: ParsedData[]): boolean {
  if (dataPoints.length === 0) return false;

  // Check if majority of data points have monetary units
  const monetaryCount =
    dataPoints.filter((d) => d.unit && isMonetaryUnit(d.unit)).length;
  const totalWithUnits = dataPoints.filter((d) => d.unit).length;

  if (totalWithUnits === 0) return false;

  // Consider it monetary if more than 50% of items with units are monetary
  return (monetaryCount / totalWithUnits) > 0.5;
}
