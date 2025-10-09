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
 * @returns Normalized numeric value
 */
export function normalizeFlowValue(
  value: number,
  options: {
    unitText: string;
    to?: TimeScale;
    targetMagnitude?: Scale;
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

  // Handle time scaling
  if (parsed.timeScale && options.to && parsed.timeScale !== options.to) {
    result = rescaleTime(result, parsed.timeScale, options.to);
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
    // Cumulative/YTD detection flag
    isCumulative?: boolean;
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

  // Count detection removed - this function is deprecated
  // Use indicator_type from @tellimer/classify package instead
  const isCountData = false;

  // Handle magnitude scaling (skip for percentage and physical units)
  const isPercentage = parsed.category === "percentage";
  // Physical units (tonnes, barrels, celsius, etc.) should not have magnitude scaling
  // Only monetary, count, and composite units should be scaled
  const isPhysicalUnit = parsed.category === "physical" ||
    parsed.category === "energy" ||
    parsed.category === "temperature" ||
    parsed.category === "index";
  if (
    !isPercentage &&
    !isPhysicalUnit &&
    effectiveScale &&
    options?.toMagnitude &&
    effectiveScale !== options.toMagnitude
  ) {
    result = rescaleMagnitude(result, effectiveScale, options.toMagnitude);
  }

  // Handle time scaling
  if (options?.toTimeScale) {
    // Check if this is cumulative/YTD data (skip time conversion)
    const isCumulative = options?.isCumulative === true;

    // For stock-like count indicators (e.g., Population), skip time conversion entirely
    const isCountStockLike = /\b(population|inhabitants|residents|people)\b/i
      .test(
        options?.indicatorName || "",
      );

    if (isCumulative) {
      // Skip time conversion for cumulative/YTD series
      console.warn(
        `⚠️ Skipping time conversion for cumulative/YTD data: "${
          options?.indicatorName || "unknown"
        }"`,
      );
    } else if (!isCountStockLike) {
      if (effectiveTimeScale && effectiveTimeScale !== options.toTimeScale) {
        // Time conversion can be performed
        result = rescaleTime(result, effectiveTimeScale, options.toTimeScale);
      } else if (!effectiveTimeScale) {
        // Time conversion requested but no source time scale available
        console.warn(
          `⚠️ Time conversion to ${options.toTimeScale} requested but no source time scale found in unit "${unitText}" or explicit fields. Value unchanged.`,
        );
      }
      // If effectiveTimeScale === options.toTimeScale, no conversion needed
    }
  }

  // Handle currency conversion (skip for count data)
  if (
    !isCountData &&
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
