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

  // Magnitude information - only provide when scaling actually occurs
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
    const direction = SCALE_MAP[originalScale] > SCALE_MAP[targetScale]
      ? "downscale"
      : "upscale";
    const description = `${originalScale} → ${targetScale} (×${factor})`;

    explain.magnitude = {
      originalScale,
      targetScale,
      factor,
      direction,
      description,
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
    const PER_YEAR = {
      year: 1,
      quarter: 4,
      month: 12,
      week: 52,
      day: 365,
      hour: 8760,
    };

    const factor = PER_YEAR[originalTimeScale] / PER_YEAR[targetTimeScale];
    const direction = PER_YEAR[originalTimeScale] < PER_YEAR[targetTimeScale]
      ? "upsample"
      : "downsample";

    // Create clear description with intuitive conversion factors
    let description: string;
    if (direction === "upsample") {
      // Going to more frequent time scale (e.g., year → month)
      const divisionFactor = PER_YEAR[targetTimeScale] /
        PER_YEAR[originalTimeScale];
      description =
        `${originalTimeScale} → ${targetTimeScale} (÷${divisionFactor})`;
    } else {
      // Going to less frequent time scale (e.g., month → year)
      const multiplicationFactor = PER_YEAR[originalTimeScale] /
        PER_YEAR[targetTimeScale];
      description =
        `${originalTimeScale} → ${targetTimeScale} (×${multiplicationFactor})`;
    }

    explain.periodicity = {
      original: originalTimeScale,
      target: targetTimeScale,
      adjusted: true,
      factor,
      direction,
      description,
    };
  } else if (targetTimeScale) {
    explain.periodicity = {
      original: originalTimeScale || undefined,
      target: targetTimeScale,
      adjusted: false,
      factor: 1,
      direction: "none",
      description: originalTimeScale
        ? `No conversion needed (${originalTimeScale})`
        : "No source time scale available",
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

  // Build full unit strings with time periods
  const originalFullUnit = buildFullUnitString(
    effectiveCurrency,
    originalScale,
    originalTimeScale || undefined,
  );
  const normalizedFullUnit = buildFullUnitString(
    options.toCurrency || effectiveCurrency,
    targetScale,
    options.toTimeScale,
  );

  explain.units = {
    originalUnit: originalUnitString || originalUnit,
    normalizedUnit: normalizedUnitString,
    originalFullUnit: originalFullUnit || originalUnit,
    normalizedFullUnit: normalizedFullUnit,
  };

  // Conversion summary - order: Scale → Currency → Time (logical processing order)
  const conversionSteps: string[] = [];
  let totalFactor = 1;

  if (explain.magnitude && explain.magnitude.factor !== 1) {
    conversionSteps.push(`Scale: ${explain.magnitude.description}`);
    totalFactor *= explain.magnitude.factor;
  }

  if (explain.fx) {
    conversionSteps.push(
      `Currency: ${explain.fx.currency} → ${explain.fx.base} (rate: ${explain.fx.rate})`,
    );
    totalFactor *= 1 / explain.fx.rate;
  }

  if (explain.periodicity?.adjusted) {
    conversionSteps.push(`Time: ${explain.periodicity.description}`);
    totalFactor *= explain.periodicity.factor || 1;
  }

  if (conversionSteps.length > 0) {
    explain.conversion = {
      steps: conversionSteps,
      summary: `${originalFullUnit || originalUnit} → ${normalizedFullUnit}`,
      totalFactor,
    };
  }

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
 * Build full unit string with time period
 */
function buildFullUnitString(
  currency?: string,
  scale?: Scale,
  timeScale?: TimeScale,
): string | undefined {
  if (!currency) return undefined;

  const parts: string[] = [currency];

  if (scale && scale !== "ones") {
    parts.push(scale);
  }

  if (timeScale) {
    parts.push(`per ${timeScale}`);
  }

  return parts.join(" ");
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
