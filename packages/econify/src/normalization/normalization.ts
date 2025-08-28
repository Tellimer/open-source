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
import { parseUnit } from "../units/units.ts";

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
    toTimeScale?: TimeScale;
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
    opts.toTimeScale!,
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
  },
): number {
  const parsed = parseUnit(unitText);
  let result = value;

  // Handle magnitude scaling
  if (
    parsed.scale &&
    options?.toMagnitude &&
    parsed.scale !== options.toMagnitude
  ) {
    result = rescaleMagnitude(result, parsed.scale, options.toMagnitude);
  }

  // Handle time scaling
  if (
    parsed.timeScale &&
    options?.toTimeScale &&
    parsed.timeScale !== options.toTimeScale
  ) {
    result = rescaleTime(result, parsed.timeScale, options.toTimeScale);
  }

  // Handle currency conversion
  if (
    parsed.currency &&
    options?.toCurrency &&
    options.fx &&
    parsed.currency !== options.toCurrency
  ) {
    result = normalizeCurrencyValue(
      result,
      parsed.currency,
      options.toCurrency,
      options.fx,
    );
  }

  return result;
}
