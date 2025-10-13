/**
 * Helper functions for building explain metadata during normalization
 */

import { parseUnit } from "../units/units.ts";
import { getScale } from "../scale/scale.ts";
import { parseTimeScaleFromUnit } from "../time/time-sampling.ts";
import type { Explain, FXTable, Scale, TimeScale } from "../types.ts";
import { PER_YEAR, SCALE_MAP } from "../patterns.ts";
import { parseWithCustomUnits } from "../custom/custom_units.ts";
import {
  allowsTimeConversion,
  allowsTimeDimension,
  shouldSkipTimeInUnit,
} from "./indicator_type_rules.ts";

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
    /** indicator_type from @tellimer/classify package */
    indicatorType?: string | null;
    /** temporal_aggregation from @tellimer/classify package */
    temporalAggregation?: string | null;
  },
): Explain {
  const parsed = parseUnit(originalUnit);
  const explain: Explain = {};

  // Use explicit fields if provided, otherwise fall back to parsed values
  const effectiveCurrency = options.explicitCurrency || parsed.currency;
  const effectiveScale = options.explicitScale || parsed.scale;

  // Time scale priority:
  // 1. ALWAYS prefer time component extracted from unit string (e.g., "EUR/Month")
  // 2. For FLOW indicators, use periodicity as fallback (it's the measurement period)
  // 3. For indicators without time dimension, DON'T use periodicity (it's just release cadence)
  let effectiveTimeScale = parsed.timeScale;
  if (!effectiveTimeScale && options.explicitTimeScale) {
    // Only use periodicity for indicators that allow time dimension (flow, volume, count)
    // NOT for point-in-time indicators (stock, balance, price, index, percentage, ratio, etc.)
    // Use indicator_type rules from @tellimer/classify package
    if (allowsTimeDimension(options.indicatorType)) {
      effectiveTimeScale = options.explicitTimeScale;
    }
  }

  // FX information
  if (
    effectiveCurrency && options.toCurrency && options.fx &&
    effectiveCurrency !== options.toCurrency
  ) {
    const rate = options.fx.rates[effectiveCurrency];
    if (rate !== undefined) {
      const rateRounded = Number(rate.toFixed(6));
      explain.fx = {
        currency: effectiveCurrency,
        base: "USD",
        rate: rateRounded,
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
  // originalTimeScale comes ONLY from the unit string (e.g., "EUR/Month")
  // NOT from the periodicity field (which is just release cadence)
  const originalTimeScale = effectiveTimeScale ||
    parseTimeScaleFromUnit(originalUnit);
  const targetTimeScale = options.toTimeScale;

  // Surface dataset reporting frequency separately (this is the release cadence, not measurement time)
  if (options.explicitTimeScale) {
    (explain as { reportingFrequency?: TimeScale }).reportingFrequency = options
      .explicitTimeScale;
  }
  if (
    originalTimeScale && targetTimeScale &&
    originalTimeScale !== targetTimeScale
  ) {
    // Check if time conversion is actually allowed for this indicator type + temporal aggregation
    const isTimeConversionAllowed = allowsTimeConversion(
      options.indicatorType || undefined,
      options.temporalAggregation || undefined,
    );

    if (isTimeConversionAllowed) {
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
    } else {
      // Time conversion blocked by indicator type + temporal aggregation rules
      explain.periodicity = {
        original: originalTimeScale,
        target: targetTimeScale,
        adjusted: false,
        factor: 1,
        direction: "none",
        description:
          `Time conversion blocked (${options.indicatorType} with ${options.temporalAggregation})`,
      };
    }
  } else if (targetTimeScale && originalTimeScale) {
    // Only create periodicity object if we have BOTH original and target time scales
    // Don't create it for stock indicators that have no time dimension
    explain.periodicity = {
      original: originalTimeScale,
      target: targetTimeScale,
      adjusted: false,
      factor: 1,
      direction: "none",
      description: `No conversion needed (${originalTimeScale})`,
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

  // Use indicator_type rules from @tellimer/classify package
  // Determines if time period should be omitted from unit strings
  const skipTimeInUnitString = shouldSkipTimeInUnit(options.indicatorType);

  if (isNonCurrencyCategory) {
    // Use base unit label (e.g., "units", "GWh", "CO2 tonnes") and avoid currency
    // Special-case stock-like counts (e.g., Population) to avoid per-time and force base to 'units'
    const nameLower2 = (options.indicatorName ?? "").toLowerCase();
    const isStockLikeNonCurrency =
      /\breserve(s)?\b|\bpopulation\b|\bpop\b|\bpeople\b|\binhabitants\b|\bresidents\b/
        .test(
          nameLower2,
        ) ||
      // Only match "stock" when it's clearly about inventory/levels, not "stock market"
      (/\bstock(s)?\b/.test(nameLower2) &&
        !/market|exchange|index/i.test(nameLower2));
    const base = isStockLikeNonCurrency
      ? "units"
      : (parsed.normalized || "units");

    // Index values (points) should not have time scale added
    const isIndexCategory = parsed.category === "index";
    // Time category units (hours/days/etc) should show ONLY the periodicity, not the unit + periodicity
    const isTimeCategory = parsed.category === "time";

    if (isTimeCategory && !isStockLikeNonCurrency) {
      // For time units (non-stock), show only the periodicity (e.g., "per month" not "hours per month")
      originalUnitString = originalTimeScale
        ? `per ${originalTimeScale}`
        : base;
      normalizedUnitString = options.toTimeScale
        ? `per ${options.toTimeScale}`
        : (originalTimeScale ? `per ${originalTimeScale}` : base);
      originalFullUnit = originalUnitString;
      normalizedFullUnit = normalizedUnitString;
    } else {
      // For other non-currency categories, add time scale unless it's stock-like or index
      const shouldAddTimeScale = !isStockLikeNonCurrency && !isIndexCategory;
      originalUnitString = base;
      normalizedUnitString = options.toTimeScale && shouldAddTimeScale
        ? `${base} per ${options.toTimeScale}`
        : base;
      originalFullUnit = originalTimeScale && shouldAddTimeScale
        ? `${base} per ${originalTimeScale}`
        : base;
      normalizedFullUnit = options.toTimeScale && shouldAddTimeScale
        ? `${base} per ${options.toTimeScale}`
        : base;
    }

    // For stock-like non-currency indicators (e.g., Population), reflect monthly basis without math
    if (isStockLikeNonCurrency && options.toTimeScale) {
      explain.periodicity = {
        original: originalTimeScale || undefined,
        target: options.toTimeScale,
        adjusted: false,
        factor: 1,
        direction: "none",
        description: originalTimeScale
          ? `Level: no time conversion (${originalTimeScale} → ${options.toTimeScale})`
          : "Level: no time conversion",
      };
    }
  } else {
    // Monetary/currency-based units (default behavior)
    originalUnitString = buildOriginalUnitString(
      effectiveCurrency,
      originalScale,
    );
    // For monetary units, only preserve original time scale if it was explicitly in the unit string
    // (not just in metadata periodicity). This prevents adding "per month" to stock indicators.
    const hasTimeInUnit = !!parsed.timeScale;

    // Use target time scale unless conversion was explicitly blocked
    // Check if time conversion was blocked (not just "no conversion needed")
    const timeWasBlocked = explain.periodicity?.adjusted === false &&
      explain.periodicity?.description?.includes("blocked");
    const effectiveTargetTime: TimeScale | undefined = timeWasBlocked
      ? (hasTimeInUnit && originalTimeScale ? originalTimeScale : undefined)
      : (options.toTimeScale ||
        (hasTimeInUnit && originalTimeScale ? originalTimeScale : undefined));

    normalizedUnitString = buildNormalizedUnitString(
      options.toCurrency || effectiveCurrency,
      targetScale,
      effectiveTargetTime,
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
      effectiveTargetTime,
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

    // Indicators with skipTimeInUnit: omit per-time in unit strings
    // This includes: stock, balance, capacity, price, percentage, ratio, rate, index, etc.
    if (skipTimeInUnitString) {
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
  // Use indicator_type from @tellimer/classify for count/volume detection
  if (
    !detectedDomain &&
    (options.indicatorType === "count" || options.indicatorType === "volume")
  ) {
    detectedDomain = "count";
  }

  // 4) Energy via parsed category
  if (!detectedDomain && parsed.category === "energy") {
    detectedDomain = "energy";
  }

  // 4b) Monetary aggregates (money supply, M0/M1/M2, monetary base)
  // Apply only for currency-based indicators; non-currency stock-like (e.g., Gold Reserves) should remain metals/commodity
  if (
    !detectedDomain && skipTimeInUnitString && parsed.category === "currency"
  ) {
    detectedDomain = "monetary_aggregate";
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
    // Prefer custom domain normalized unit over parsed.normalized for better specificity
    const base = customDomain?.normalized || parsed.normalized || "units";
    const nameLower2 = (options.indicatorName ?? "").toLowerCase();
    const isStockLike =
      /\breserve(s)?\b|\bstock(s)?\b|\bpopulation\b|\bpop\b|\bpeople\b|\binhabitants\b|\bresidents\b/
        .test(nameLower2);

    const isCountDomain = typeof detectedDomain !== "undefined" &&
      detectedDomain === "count";

    if (isCountDomain) {
      // For count domain, reflect scale label (thousands/millions/ones) instead of a physical base unit
      // Capitalize scale labels for consistency (Thousands, Millions, etc.)
      const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      const origLabel = (originalScale && originalScale !== "ones")
        ? titleCase(originalScale)
        : "ones";
      const normLabel = (targetScale && targetScale !== "ones")
        ? titleCase(targetScale)
        : "ones";

      // Only add time scale if original unit STRING had one (use parsed.timeScale, not originalTimeScale which includes metadata)
      // This prevents adding "per month" to units like "Thousands" that don't have time in the unit string
      const unitHadTimeScale = !!parsed.timeScale;
      originalUnitString = isStockLike || !unitHadTimeScale
        ? origLabel
        : `${origLabel} per ${parsed.timeScale}`;

      // For normalized unit: add time scale if conversion happened OR if original had time
      // Check if time conversion was blocked (not just "no conversion needed")
      const timeWasBlocked = explain.periodicity?.adjusted === false &&
        explain.periodicity?.description?.includes("blocked");
      const timeWasConverted = explain.periodicity?.adjusted === true;
      const effectiveNormalizedTime = timeWasBlocked
        ? parsed.timeScale
        : (options.toTimeScale || parsed.timeScale);

      // Show time dimension if: (1) time was converted, OR (2) original had time dimension
      const shouldShowTime = !isStockLike &&
        (timeWasConverted || unitHadTimeScale);
      normalizedUnitString = shouldShowTime && effectiveNormalizedTime
        ? `${normLabel} per ${effectiveNormalizedTime}`
        : normLabel;
      originalFullUnit = originalUnitString;
      normalizedFullUnit = normalizedUnitString;
    } else {
      // Non-currency physical domains (energy/commodities/agriculture/metals/emissions): keep base unit; no magnitude label
      // Percentages, counts, and index values should not have time scale added
      // Time category units (hours/days/etc) should show ONLY the periodicity, not the unit + periodicity
      const isTimeCategory = parsed.category === "time";
      const isIndexCategory = parsed.category === "index";
      const shouldAddTimeScale = !isStockLike &&
        detectedDomain !== "percentage" &&
        detectedDomain !== "count" &&
        !isIndexCategory;

      // For time category units, show only the periodicity (e.g., "per month" not "hours per month")
      if (isTimeCategory) {
        originalUnitString = originalTimeScale
          ? `per ${originalTimeScale}`
          : base;
        normalizedUnitString = options.toTimeScale
          ? `per ${options.toTimeScale}`
          : (originalTimeScale ? `per ${originalTimeScale}` : base);
        originalFullUnit = originalUnitString;
        normalizedFullUnit = normalizedUnitString;
      } else {
        originalUnitString = base;
        normalizedUnitString = options.toTimeScale && shouldAddTimeScale
          ? `${base} per ${options.toTimeScale}`
          : base;
        originalFullUnit = originalTimeScale && shouldAddTimeScale
          ? `${base} per ${originalTimeScale}`
          : base;
        normalizedFullUnit = options.toTimeScale && shouldAddTimeScale
          ? `${base} per ${options.toTimeScale}`
          : base;
      }
    }

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

    // Suppress magnitude scaling for non-currency physical domains, but keep it for count domain
    if (
      (explain as { magnitude?: unknown }).magnitude &&
      detectedDomain !== "count"
    ) {
      delete (explain as { magnitude?: unknown }).magnitude;
    }

    // For stock-like non-currency indicators (e.g., Population), reflect monthly target without conversion
    if (isStockLike) {
      const target = options.toTimeScale;
      const original = originalTimeScale || undefined;
      if (target) {
        explain.periodicity = {
          original,
          target,
          adjusted: false,
          factor: 1,
          direction: "none",
          description: original
            ? `No conversion needed (stock-like level at ${original})`
            : "No source time scale available",
        };
      }

      // Also ensure timeScale component does not suggest per-time conversion
      if ((explain as { timeScale?: unknown }).timeScale) {
        (explain as {
          timeScale?: { original?: unknown; normalized?: unknown };
        })
          .timeScale = {
            original,
            normalized: target,
          } as unknown as typeof explain.timeScale;
      }
    }
  }

  // Base unit for non-currency measures to support frontend formatting
  if (
    (parsed.category && parsed.category !== "currency" &&
      parsed.category !== "composite") ||
    isNonCurrencyDomain
  ) {
    let baseCategory = parsed.category;
    if (isNonCurrencyDomain) {
      // For non-currency domains, prefer a safe category mapping
      baseCategory = (detectedDomain === "count")
        ? "count"
        : (parsed.category && parsed.category !== "currency"
          ? parsed.category
          : "unknown");
    }
    explain.baseUnit = {
      normalized: parsed.normalized,
      category: baseCategory,
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
  // For indicators that skip time in unit (stock, balance, price, etc.), suppress timeScale component
  if (
    skipTimeInUnitString && parsed.category === "currency" &&
    (explain as { timeScale?: unknown }).timeScale
  ) {
    delete (explain as { timeScale?: unknown }).timeScale;
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
