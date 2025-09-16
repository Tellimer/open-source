/**
 * Helper functions for building explain metadata during normalization
 */

import { parseUnit } from "../units/units.ts";
import { getScale } from "../scale/scale.ts";
import { parseTimeScaleFromUnit } from "../time/time-sampling.ts";
import type { Explain, FXTable, Scale, TimeScale } from "../types.ts";

/**
 * Build explain metadata for a normalization operation
 */
export function buildExplainMetadata(
  _originalValue: number,
  originalUnit: string,
  _normalizedValue: number,
  options: {
    toCurrency?: string;
    toMagnitude?: Scale;
    toTimeScale?: TimeScale;
    fx?: FXTable;
    // Explicit metadata fields - use if provided, otherwise parse from originalUnit
    explicitCurrency?: string | null;
    explicitScale?: Scale | null;
    explicitTimeScale?: TimeScale | null;
  },
): Explain {
  const parsed = parseUnit(originalUnit);
  const explain: Explain = {};

  // Use explicit fields if provided, otherwise fall back to parsed values
  const effectiveCurrency = options.explicitCurrency || parsed.currency;
  const effectiveScale = options.explicitScale || parsed.scale;
  const effectiveTimeScale = options.explicitTimeScale || parsed.timeScale;

  // FX information
  if (
    effectiveCurrency && options.toCurrency && options.fx &&
    effectiveCurrency !== options.toCurrency
  ) {
    const rate = options.fx.rates[effectiveCurrency];
    if (rate !== undefined) {
      explain.fx = {
        currency: effectiveCurrency,
        base: "USD",
        rate: rate,
        source: "fallback", // We'll enhance this when we have live FX info
        sourceId: "SNP", // Default for fallback
      };
    }
  }

  // Magnitude information
  const originalScale = effectiveScale || getScale(originalUnit);
  const targetScale = options.toMagnitude || originalScale;
  if (originalScale !== targetScale) {
    const SCALE_MAP = {
      ones: 1,
      thousands: 1_000,
      millions: 1_000_000,
      billions: 1_000_000_000,
      trillions: 1_000_000_000_000,
    };

    const factor = SCALE_MAP[originalScale] / SCALE_MAP[targetScale];
    explain.magnitude = {
      originalScale,
      targetScale,
      factor,
    };
  }

  // Periodicity information
  const originalTimeScale = effectiveTimeScale ||
    parseTimeScaleFromUnit(originalUnit);
  const targetTimeScale = options.toTimeScale;
  if (
    originalTimeScale && targetTimeScale &&
    originalTimeScale !== targetTimeScale
  ) {
    explain.periodicity = {
      original: originalTimeScale,
      target: targetTimeScale,
      adjusted: true,
    };
  } else if (targetTimeScale) {
    explain.periodicity = {
      original: originalTimeScale || undefined,
      target: targetTimeScale,
      adjusted: false,
    };
  }

  // Units information
  const originalUnitString = buildOriginalUnitString(
    effectiveCurrency,
    originalScale,
  );
  const normalizedUnitString = buildNormalizedUnitString(
    options.toCurrency || effectiveCurrency,
    targetScale,
    options.toTimeScale,
  );

  explain.units = {
    originalUnit: originalUnitString || originalUnit,
    normalizedUnit: normalizedUnitString,
  };

  return explain;
}

/**
 * Build original unit string from components
 */
function buildOriginalUnitString(
  currency?: string,
  scale?: Scale,
): string | undefined {
  if (!currency) return undefined;

  const parts: string[] = [currency];
  if (scale && scale !== "ones") {
    parts.push(scale);
  }

  return parts.join(" ");
}

/**
 * Build normalized unit string from components
 */
function buildNormalizedUnitString(
  currency?: string,
  scale?: Scale,
  timeScale?: TimeScale,
): string {
  const parts: string[] = [];

  if (currency) {
    parts.push(currency);
  }

  if (scale && scale !== "ones") {
    parts.push(scale);
  }

  if (timeScale) {
    parts.push(`per ${timeScale}`);
  }

  return parts.length > 0 ? parts.join(" ") : "normalized";
}

/**
 * Enhance explain metadata with FX source information
 */
export function enhanceExplainWithFXSource(
  explain: Explain,
  source: "live" | "fallback",
  sourceId?: string,
  asOf?: string,
): Explain {
  if (explain.fx) {
    return {
      ...explain,
      fx: {
        ...explain.fx,
        source,
        sourceId,
        asOf,
      },
    };
  }
  return explain;
}
