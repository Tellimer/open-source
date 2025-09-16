/**
 * FX rate validation utilities to catch obviously wrong rates
 */

import type { FXTable } from "../types.ts";

/**
 * Known reasonable FX rate ranges for major currencies (rates per USD)
 * These are rough ranges to catch obviously wrong rates
 */
const REASONABLE_FX_RANGES: Record<string, { min: number; max: number }> = {
  // Major currencies (typically < 10 per USD)
  EUR: { min: 0.7, max: 1.3 },
  GBP: { min: 0.6, max: 1.0 },
  CHF: { min: 0.7, max: 1.2 },
  CAD: { min: 1.0, max: 1.6 },
  AUD: { min: 1.0, max: 1.8 },
  NZD: { min: 1.2, max: 2.0 },

  // Asian currencies
  JPY: { min: 80, max: 200 },
  CNY: { min: 6, max: 8 },
  KRW: { min: 1000, max: 1500 },
  INR: { min: 70, max: 100 },

  // African currencies (often high rates)
  XOF: { min: 400, max: 700 }, // West African CFA Franc
  XAF: { min: 400, max: 700 }, // Central African CFA Franc
  NGN: { min: 400, max: 2000 }, // Nigerian Naira
  ZAR: { min: 10, max: 25 }, // South African Rand

  // Latin American
  BRL: { min: 3, max: 8 }, // Brazilian Real
  MXN: { min: 15, max: 25 }, // Mexican Peso
  ARS: { min: 100, max: 2000 }, // Argentine Peso

  // Middle East
  AED: { min: 3.5, max: 4.0 }, // UAE Dirham
  SAR: { min: 3.5, max: 4.0 }, // Saudi Riyal
};

/**
 * Validate FX rates in a table to catch obviously wrong values
 */
export function validateFXRates(fxTable: FXTable): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const [currency, rate] of Object.entries(fxTable.rates)) {
    const range = REASONABLE_FX_RANGES[currency.toUpperCase()];

    if (!range) {
      // Unknown currency - just check for obviously wrong values
      if (rate <= 0) {
        errors.push(`${currency}: Rate ${rate} is zero or negative`);
      } else if (rate < 0.001) {
        warnings.push(`${currency}: Rate ${rate} seems very low (< 0.001)`);
      } else if (rate > 100000) {
        warnings.push(`${currency}: Rate ${rate} seems very high (> 100,000)`);
      }
      continue;
    }

    // Check against known reasonable ranges
    if (rate <= 0) {
      errors.push(`${currency}: Rate ${rate} is zero or negative`);
    } else if (rate < range.min) {
      const factor = range.min / rate;
      if (factor > 10) {
        errors.push(
          `${currency}: Rate ${rate} is ${
            factor.toFixed(1)
          }x too low (expected ${range.min}-${range.max})`,
        );
      } else {
        warnings.push(
          `${currency}: Rate ${rate} is below expected range ${range.min}-${range.max}`,
        );
      }
    } else if (rate > range.max) {
      const factor = rate / range.max;
      if (factor > 10) {
        errors.push(
          `${currency}: Rate ${rate} is ${
            factor.toFixed(1)
          }x too high (expected ${range.min}-${range.max})`,
        );
      } else {
        warnings.push(
          `${currency}: Rate ${rate} is above expected range ${range.min}-${range.max}`,
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Get a corrected FX rate suggestion for obviously wrong rates
 */
export function suggestFXRateCorrection(
  currency: string,
  wrongRate: number,
): number | null {
  const range = REASONABLE_FX_RANGES[currency.toUpperCase()];
  if (!range) return null;

  const midpoint = (range.min + range.max) / 2;

  // If rate is way too low, try multiplying by common factors
  if (wrongRate < range.min / 10) {
    for (const factor of [1000, 100, 10]) {
      const corrected = wrongRate * factor;
      if (corrected >= range.min && corrected <= range.max) {
        return corrected;
      }
    }
  }

  // If rate is way too high, try dividing by common factors
  if (wrongRate > range.max * 10) {
    for (const factor of [1000, 100, 10]) {
      const corrected = wrongRate / factor;
      if (corrected >= range.min && corrected <= range.max) {
        return corrected;
      }
    }
  }

  // Return midpoint as fallback
  return midpoint;
}

/**
 * Validate and optionally auto-correct FX rates
 */
export function validateAndCorrectFXRates(
  fxTable: FXTable,
  autoCorrect = false,
): {
  correctedTable: FXTable;
  validation: ReturnType<typeof validateFXRates>;
  corrections: Array<{ currency: string; original: number; corrected: number }>;
} {
  const validation = validateFXRates(fxTable);
  const corrections: Array<
    { currency: string; original: number; corrected: number }
  > = [];

  if (!autoCorrect || validation.isValid) {
    return {
      correctedTable: fxTable,
      validation,
      corrections,
    };
  }

  const correctedRates = { ...fxTable.rates };

  // Try to auto-correct obvious errors
  for (const [currency, rate] of Object.entries(fxTable.rates)) {
    const suggestion = suggestFXRateCorrection(currency, rate);
    if (suggestion && suggestion !== rate) {
      correctedRates[currency] = suggestion;
      corrections.push({
        currency,
        original: rate,
        corrected: suggestion,
      });
    }
  }

  return {
    correctedTable: {
      ...fxTable,
      rates: correctedRates,
    },
    validation: validateFXRates({ ...fxTable, rates: correctedRates }),
    corrections,
  };
}
