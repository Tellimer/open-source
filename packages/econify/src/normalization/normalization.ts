/**
 * Combined normalization functions that integrate currency, magnitude, and time scaling
 */

import type { FXTable, Scale, TimeScale } from "../types.ts";
import { normalizeCurrencyValue } from "../currency/currency.ts";
import {
  getScale,
  parseTimeScale,
  rescaleMagnitude,
  rescaleTime,
} from "../scale/scale.ts";
import { CURRENCY_CODES, parseUnit } from "../units/units.ts";
import {
  allowsCurrency,
  allowsMagnitude,
  allowsTimeConversion,
  allowsTimeDimension,
} from "./indicator_type_rules.ts";

// ----------------------- Combined Normalization -----------------------

/**
 * Normalize a flow value by parsing magnitude and time scale from unit text.
 *
 * - Applies magnitude conversion if needed (e.g. billions -> millions)
 * - Applies time rescaling if needed (e.g. quarter -> year)
 *
 * @param value Input numeric value
 * @param options.unitText Unit text containing scale/time hints
 * @param options.to Optional target time scale
 * @param options.targetMagnitude Optional target magnitude
 * @param options.temporalAggregation Optional temporal aggregation from @tellimer/classify
 * @returns Normalized numeric value
 */
export function normalizeFlowValue(
  value: number,
  options: {
    unitText: string;
    to?: TimeScale;
    targetMagnitude?: Scale;
    temporalAggregation?: string;
  },
): number {
  const parsed = parseUnit(options.unitText);

  if (!parsed.timeScale && options.to) {
    throw new Error(
      `Cannot convert to ${options.to} - no time scale found in "${options.unitText}"`,
    );
  }

  let result = value;

  // Handle magnitude scaling
  if (
    parsed.scale &&
    options.targetMagnitude &&
    parsed.scale !== options.targetMagnitude
  ) {
    result = rescaleMagnitude(result, parsed.scale, options.targetMagnitude);
  }

  // Handle time scaling with temporal aggregation awareness
  if (parsed.timeScale && options.to && parsed.timeScale !== options.to) {
    result = rescaleTime(
      result,
      parsed.timeScale,
      options.to,
      options.temporalAggregation,
    );
  }

  return result;
}

/**
 * Normalize a monetary flow: magnitude → time → currency conversion.
 *
 * @param value Input numeric value
 * @param opts.fromCurrency Source currency code
 * @param opts.toCurrency Target currency code
 * @param opts.fx FX table
 * @param opts.unitText Optional unit text for magnitude/time inference
 * @param opts.toMagnitude Optional target magnitude
 * @param opts.fromTimeScale Optional explicit source time scale
 * @param opts.toTimeScale Target time scale
 * @returns Normalized amount in target currency and time scale
 */
export function normalizeMonetary(
  value: number,
  opts: {
    fromCurrency: string;
    toCurrency: string;
    fx: FXTable;
    unitText?: string;
    toMagnitude?: Scale;
    fromTimeScale?: TimeScale | null;
    toTimeScale: TimeScale;
    temporalAggregation?: string;
  },
): number {
  const fromScale = getScale(opts.unitText);
  const targetScale = opts.toMagnitude ?? fromScale;
  const magnitudeNormalized = rescaleMagnitude(value, fromScale, targetScale);
  const fromBasis = opts.fromTimeScale ?? parseTimeScale(opts.unitText);
  if (!fromBasis) {
    throw new Error("Cannot infer 'from' time basis for flow normalization.");
  }
  const timeNormalized = rescaleTime(
    magnitudeNormalized,
    fromBasis,
    opts.toTimeScale,
    opts.temporalAggregation,
  );
  return normalizeCurrencyValue(
    timeNormalized,
    opts.fromCurrency,
    opts.toCurrency,
    opts.fx,
  );
}

/**
 * Normalize a monetary flow using enhanced unit parsing before conversions.
 *
 * This version attempts to parse scale/time from unitText first, before
 * applying magnitude/time and currency conversions.
 *
 * @param value Input numeric value
 * @param opts Options including currencies, FX, and target scales
 * @returns Normalized amount in target currency/time
 */
export function normalizeMonetaryFlow(
  value: number,
  opts: {
    fromCurrency: string;
    toCurrency: string;
    fx: FXTable;
    unitText?: string;
    toMagnitude?: Scale;
    fromTimeScale?: TimeScale | null;
    toTimeScale: TimeScale;
    temporalAggregation?: string;
  },
): number {
  // Try enhanced unit parsing first
  const parsed = parseUnit(opts.unitText || "");
  const detectedScale = parsed.scale || getScale(opts.unitText);
  const detectedTimeScale = parsed.timeScale || parseTimeScale(opts.unitText);

  // Use detected values if not explicitly provided
  const fromScale = detectedScale;
  const targetScale = opts.toMagnitude ?? fromScale;
  const magnitudeNormalized = rescaleMagnitude(value, fromScale, targetScale);
  const fromBasis = opts.fromTimeScale ?? detectedTimeScale;
  if (!fromBasis) {
    throw new Error("Cannot infer 'from' time basis for flow normalization.");
  }
  const timeNormalized = rescaleTime(
    magnitudeNormalized,
    fromBasis,
    opts.toTimeScale,
    opts.temporalAggregation,
  );
  return normalizeCurrencyValue(
    timeNormalized,
    opts.fromCurrency,
    opts.toCurrency,
    opts.fx,
  );
}

/**
 * Generic normalization using parsed unit components.
 *
 * Applies magnitude, time, and currency conversions when targets are provided.
 * For count indicators, only applies magnitude and time scaling (no currency conversion).
 *
 * @param value Input numeric value
 * @param unitText Unit text to parse
 * @param options Optional conversion targets and FX table
 * @returns Normalized numeric value
 */
export function normalizeValue(
  value: number,
  unitText: string,
  options?: {
    toCurrency?: string;
    toMagnitude?: Scale;
    toTimeScale?: TimeScale;
    fx?: FXTable;
    // Explicit metadata fields - use if provided, otherwise parse from unitText
    explicitCurrency?: string | null;
    explicitScale?: Scale | null;
    explicitTimeScale?: TimeScale | null;
    // Context for count detection
    indicatorName?: string;
    // indicator_type from @tellimer/classify package
    indicatorType?: string | null;
    // temporal_aggregation from @tellimer/classify package
    temporalAggregation?: string | null;
  },
): number {
  const parsed = parseUnit(unitText);
  let result = value;

  // Use explicit fields if provided, otherwise fall back to parsed values
  const effectiveCurrencyRaw = options?.explicitCurrency || parsed.currency;
  const effectiveCurrency = effectiveCurrencyRaw &&
      CURRENCY_CODES.has(effectiveCurrencyRaw.toUpperCase())
    ? effectiveCurrencyRaw.toUpperCase()
    : null;
  // Fallback to getScale when parsed.scale is missing so magnitude normalization always works
  const effectiveScale = options?.explicitScale || parsed.scale ||
    getScale(unitText);
  // Prefer unit time scale over dataset periodicity (reporting frequency)
  const effectiveTimeScale = parsed.timeScale || options?.explicitTimeScale;

  // Use indicator_type + temporal_aggregation from @tellimer/classify package for normalization decisions
  // temporal_aggregation takes priority over indicator_type for time conversion
  const temporalAgg = options?.temporalAggregation;
  const shouldAllowMagnitude = allowsMagnitude(options?.indicatorType);
  const shouldAllowTime = allowsTimeConversion(
    options?.indicatorType,
    temporalAgg,
  );
  const shouldAllowCurrency = allowsCurrency(options?.indicatorType);

  // Handle magnitude scaling - indicator type must allow it AND unit must have a scale
  // Physical units (tonnes, barrels, celsius) without explicit scale cannot be scaled
  const isPhysicalUnit = parsed.category === "physical" ||
    parsed.category === "energy" ||
    parsed.category === "temperature";

  if (
    shouldAllowMagnitude &&
    !isPhysicalUnit &&
    effectiveScale &&
    options?.toMagnitude &&
    effectiveScale !== options.toMagnitude
  ) {
    result = rescaleMagnitude(result, effectiveScale, options.toMagnitude);
  }

  // Handle time scaling - use allowsTimeConversion which respects temporal_aggregation
  if (options?.toTimeScale) {
    // Special handling for non-convertible temporal aggregation types
    if (effectiveTimeScale && effectiveTimeScale !== options.toTimeScale) {
      if (temporalAgg === "period-cumulative") {
        if (typeof console !== "undefined") {
          console.warn(
            `⚠️ Skipping time conversion for period-cumulative indicator from ${effectiveTimeScale} to ${options.toTimeScale}. ` +
            `YTD/running totals cannot be annualized by simple multiplication. Value unchanged.`,
          );
        }
        // Don't convert - let value pass through unchanged
      } else if (temporalAgg === "point-in-time") {
        if (typeof console !== "undefined") {
          console.warn(
            `⚠️ Skipping time conversion for point-in-time indicator from ${effectiveTimeScale} to ${options.toTimeScale}. ` +
            `Snapshot values are not cross-comparable across time periods. Value unchanged.`,
          );
        }
        // Don't convert - let value pass through unchanged
      } else if (shouldAllowTime) {
        // Time conversion can be performed - rescaleTime will handle validation
        result = rescaleTime(
          result,
          effectiveTimeScale,
          options.toTimeScale,
          temporalAgg,
        );
      }
    } else if (shouldAllowTime && !effectiveTimeScale) {
      // Time conversion requested but no source time scale available
      if (typeof console !== "undefined") {
        console.warn(
          `⚠️ Time conversion to ${options.toTimeScale} requested but no source time scale found in unit "${unitText}" or explicit fields. Value unchanged.`,
        );
      }
    }
    // If effectiveTimeScale === options.toTimeScale, no conversion needed
  }

  // Handle currency conversion - use indicator type rules
  // Only convert currency for currency-denominated types
  // Skip for dimensionless types (percentage, ratio, index, etc.)
  if (
    shouldAllowCurrency &&
    effectiveCurrency &&
    options?.toCurrency &&
    options.fx &&
    effectiveCurrency !== options.toCurrency
  ) {
    result = normalizeCurrencyValue(
      result,
      effectiveCurrency,
      options.toCurrency,
      options.fx,
    );
  }

  return result;
}
