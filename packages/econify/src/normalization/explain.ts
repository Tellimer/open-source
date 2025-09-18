/**
 * Helper functions for building explain metadata during normalization
 */

import { parseUnit } from "../units/units.ts";
import { getScale } from "../scale/scale.ts";
import { parseTimeScaleFromUnit } from "../time/time-sampling.ts";
import type { Explain, FXTable, Scale, TimeScale } from "../types.ts";
import { PER_YEAR, SCALE_MAP } from "../patterns.ts";
import { parseWithCustomUnits } from "../custom/custom_units.ts";
import { isCountIndicator, isCountUnit } from "../count/count-normalization.ts";

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
    /** Optional indicator name to improve domain detection */
    indicatorName?: string | null;
  },
): Explain {
  const parsed = parseUnit(originalUnit);
  const explain: Explain = {};

  // Use explicit fields if provided, otherwise fall back to parsed values
  const effectiveCurrency = options.explicitCurrency || parsed.currency;
  const effectiveScale = options.explicitScale || parsed.scale;
  // Prefer time component extracted from unit over dataset periodicity (reporting frequency)
  const effectiveTimeScale = parsed.timeScale || options.explicitTimeScale;

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
        // Include the date if available from FX table
        asOf: options.fx.dates?.[effectiveCurrency],
        source: "fallback", // We'll enhance this when we have live FX info
        sourceId: "SNP", // Default for fallback
      };
    }
  }

  // Magnitude information - only provide when scaling actually occurs
  const originalScale = effectiveScale || getScale(originalUnit);
  const targetScale = options.toMagnitude || originalScale;
  if (originalScale !== targetScale) {
    // Using SCALE_MAP imported from patterns.ts

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

  // Surface dataset reporting frequency separately (explicit periodicity)
  if (options.explicitTimeScale) {
    (explain as { reportingFrequency?: TimeScale }).reportingFrequency = options
      .explicitTimeScale;
  }
  if (
    originalTimeScale && targetTimeScale &&
    originalTimeScale !== targetTimeScale
  ) {
    // Using PER_YEAR imported from patterns.ts

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

  // Units information (currency vs non-currency domains)
  const isNonCurrencyCategory =
    !!(parsed.category && parsed.category !== "currency" &&
      parsed.category !== "composite");

  let originalUnitString: string | undefined;
  let normalizedUnitString: string;
  let originalFullUnit: string | undefined;
  let normalizedFullUnit: string;

  // Detect per-capita indicators for special handling (keep scale as ones; no millions label)
  const isPerCapita = /\bper\s*capita\b/i.test(options.indicatorName ?? "");

  // Detect stock-like indicators (levels), e.g. reserves, money supply, M0/M1/M2, monetary base
  const isStockLikeGlobal =
    /(reserve(s)?|stock(s)?|money\s*supply|\bM0\b|\bM1\b|\bM2\b|monetary\s*base|broad\s*money|narrow\s*money)/i
      .test(options.indicatorName ?? "");

  if (isNonCurrencyCategory) {
    // Use base unit label (e.g., "units", "GWh", "CO2 tonnes") and avoid currency
    const base = parsed.normalized || "units";
    originalUnitString = base;
    normalizedUnitString = options.toTimeScale
      ? `${base} per ${options.toTimeScale}`
      : base;
    originalFullUnit = originalTimeScale
      ? `${base} per ${originalTimeScale}`
      : base;
    normalizedFullUnit = options.toTimeScale
      ? `${base} per ${options.toTimeScale}`
      : base;
  } else {
    // Monetary/currency-based units (default behavior)
    originalUnitString = buildOriginalUnitString(
      effectiveCurrency,
      originalScale,
    );
    normalizedUnitString = buildNormalizedUnitString(
      options.toCurrency || effectiveCurrency,
      targetScale,
      options.toTimeScale,
    );

    // Build full unit strings with time periods
    originalFullUnit = buildFullUnitString(
      effectiveCurrency,
      originalScale,
      originalTimeScale || undefined,
    );
    normalizedFullUnit = buildFullUnitString(
      options.toCurrency || effectiveCurrency,
      targetScale,
      options.toTimeScale,
    ) || normalizedUnitString;

    // Per-capita: avoid adding scale label like 'millions' to currency units
    if (isPerCapita) {
      normalizedUnitString = buildNormalizedUnitString(
        options.toCurrency || effectiveCurrency,
        "ones",
        options.toTimeScale,
      );
      normalizedFullUnit = buildFullUnitString(
        options.toCurrency || effectiveCurrency,
        "ones",
        options.toTimeScale,
      ) || normalizedUnitString;
    }

    // Stock-like currency indicators: omit per-time in unit strings
    if (isStockLikeGlobal) {
      normalizedUnitString = buildNormalizedUnitString(
        options.toCurrency || effectiveCurrency,
        targetScale,
        undefined,
      );
      originalFullUnit = buildFullUnitString(
        effectiveCurrency,
        originalScale,
        undefined,
      );
      normalizedFullUnit = buildFullUnitString(
        options.toCurrency || effectiveCurrency,
        targetScale,
        undefined,
      ) || normalizedUnitString;
    }
  }

  explain.units = {
    originalUnit: originalUnitString || originalUnit,
    normalizedUnit: normalizedUnitString,
    originalFullUnit: originalFullUnit || originalUnit,
    normalizedFullUnit: normalizedFullUnit,
  };

  // Per-capita: align explain components (no magnitude scaling, scale stays 'ones')
  if (isPerCapita) {
    if ((explain as { magnitude?: unknown }).magnitude) {
      delete (explain as { magnitude?: unknown }).magnitude;
    }
    if (
      (explain as { scale?: { original?: unknown; normalized?: unknown } })
        .scale
    ) {
      (explain as { scale?: { original?: unknown; normalized?: unknown } })
        .scale!.normalized = "ones" as unknown as Scale;
    }
  }

  // Surface detected domain for FE formatting using robust detection
  const text = `${options.indicatorName ?? ""} ${originalUnit}`.trim();
  const lower = text.toLowerCase();
  const customDomain = parseWithCustomUnits(text) ||
    parseWithCustomUnits(originalUnit);
  let detectedDomain: string | undefined;

  // 1) Wages (router prioritizes this bucket)
  const nameLower = (options.indicatorName ?? "").toLowerCase();
  const isWageName =
    /\bwage\b|\bminimum\s*wage\b|\bwages\b|\bsalary\b|\bearnings\b|\bcompensation\b|\bpay\b/i
      .test(nameLower);
  // IMPORTANT: Do NOT infer wages solely from currency+time (too broad: e.g., trade balances)
  if (isWageName) {
    detectedDomain = "wages";
  }

  // 2) Domain units registry (emissions, commodities, agriculture, metals)
  if (!detectedDomain && customDomain) {
    detectedDomain =
      (customDomain as unknown as { category?: string }).category;
  }

  // 3) Direct percentage and count checks aligned with router
  if (!detectedDomain && parsed.category === "percentage") {
    detectedDomain = "percentage";
  }
  if (
    !detectedDomain &&
    (isCountIndicator(options.indicatorName ?? undefined, originalUnit) ||
      isCountUnit(originalUnit))
  ) {
    detectedDomain = "count";
  }

  // 4) Energy via parsed category
  if (!detectedDomain && parsed.category === "energy") {
    detectedDomain = "energy";
  }

  // 5) Heuristic fallbacks to align with workflow router predicates
  if (!detectedDomain) {
    if (
      /(gwh|\bmegawatts?\b|\bmw\b|\bterajoules?\b|\btj\b|\bmmbtu\b|\bbtu\b)/i
        .test(lower)
    ) {
      detectedDomain = "energy";
    } else if (
      /(troy\s*oz|barrels?|\bbbls?\b|crude|wti|brent|gold)/i.test(lower)
    ) {
      detectedDomain = "commodity";
    } else if (/\bbushels?\b|short\s+tons?|metric\s+tonnes?/i.test(lower)) {
      detectedDomain = "agriculture";
    } else if (
      /\bsilver\b|\bcopper\b|\bsteel\b|\blithium\b|\bnickel\b|\bzinc\b/i.test(
        lower,
      )
    ) {
      detectedDomain = "metals";
    } else if (/(co2e?|carbon\s+credits?)/i.test(lower)) {
      detectedDomain = "emissions";
    }
  }

  // Prefer metals over generic agriculture when both keywords present (e.g., "copper tonnes")
  if (
    detectedDomain === "agriculture" &&
    /\bcopper\b|\bsilver\b|\bsteel\b|\blithium\b|\bnickel\b|\bzinc\b/i.test(
      lower,
    )
  ) {
    detectedDomain = "metals";
  }
  // Prefer metals over generic commodity when precious/industrial metal keywords present
  if (
    detectedDomain === "commodity" &&
    /\bgold\b|\bsilver\b|\bcopper\b|\bsteel\b|\blithium\b|\bnickel\b|\bzinc\b/i
      .test(lower)
  ) {
    detectedDomain = "metals";
  }

  if (detectedDomain) {
    explain.domain = detectedDomain;
  }

  // Enforce non-currency presentation when domain indicates non-currency
  const isNonCurrencyDomain = !!(detectedDomain && [
    "count",
    "percentage",
    "energy",
    "commodity",
    "agriculture",
    "metals",
    "emissions",
  ].includes(detectedDomain));

  if (isNonCurrencyDomain) {
    const base = parsed.normalized || "units";
    const nameLower2 = (options.indicatorName ?? "").toLowerCase();
    const isStockLike = /\breserve(s)?\b|\bstock(s)?\b/.test(nameLower2);

    originalUnitString = base;
    normalizedUnitString = options.toTimeScale && !isStockLike
      ? `${base} per ${options.toTimeScale}`
      : base;
    originalFullUnit = originalTimeScale && !isStockLike
      ? `${base} per ${originalTimeScale}`
      : base;
    normalizedFullUnit = options.toTimeScale && !isStockLike
      ? `${base} per ${options.toTimeScale}`
      : base;

    explain.units = {
      originalUnit: originalUnitString || originalUnit,
      normalizedUnit: normalizedUnitString,
      originalFullUnit: originalFullUnit || originalUnit,
      normalizedFullUnit: normalizedFullUnit,
    };

    // Ensure no currency component is emitted for non-currency domains
    if ((explain as { currency?: unknown }).currency) {
      delete (explain as { currency?: unknown }).currency;
    }

    // Keep scale component aligned with no magnitude change for non-currency
    if (
      (explain as { scale?: { original?: unknown; normalized?: unknown } })
        .scale
    ) {
      (explain as { scale?: { original?: unknown; normalized?: unknown } })
        .scale!.normalized =
          (explain as { scale?: { original?: unknown; normalized?: unknown } })
            .scale!.original;
    }

    // Suppress magnitude scaling for non-currency domains
    if ((explain as { magnitude?: unknown }).magnitude) {
      delete (explain as { magnitude?: unknown }).magnitude;
    }
  }

  // Base unit for non-currency measures to support frontend formatting
  if (
    (parsed.category && parsed.category !== "currency" &&
      parsed.category !== "composite") ||
    isNonCurrencyDomain
  ) {
    explain.baseUnit = {
      normalized: parsed.normalized,
      category: parsed.category,
    };
  }

  // 🆕 Separate component fields for easy frontend access
  if (
    !isNonCurrencyCategory && !isNonCurrencyDomain &&
    (effectiveCurrency || options.toCurrency)
  ) {
    explain.currency = {
      original: effectiveCurrency,
      normalized: options.toCurrency || effectiveCurrency || "USD",
    };
  }

  if (originalScale || targetScale) {
    explain.scale = {
      original: originalScale,
      normalized: targetScale,
    };
  }

  if (originalTimeScale || options.toTimeScale) {
    explain.timeScale = {
      original: originalTimeScale || undefined,
      normalized: options.toTimeScale,
    };
  }

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
