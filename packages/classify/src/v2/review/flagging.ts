/**
 * Flagging Rules Engine
 * Detects indicators that need review based on confidence and rule violations
 * @module
 */

import type { Indicator, TemporalDataPoint } from "../../types.ts";
import type {
  FlaggedIndicator,
  OrientationResult,
  RouterResult,
  SpecialistResult,
  ValidationResult,
} from "../types.ts";
import { INDICATOR_TYPE_TO_CATEGORY } from "../../types.ts";
import {
  analyzeTimeSeriesPattern,
  formatAnalysisForLLM,
} from "../validation/timeSeriesAnalysis.ts";

/**
 * Flagging thresholds
 */
export interface FlaggingThresholds {
  confidenceFamilyMin: number;
  confidenceClsMin: number;
  confidenceOrientMin: number;
}

/**
 * Default thresholds
 */
export const DEFAULT_THRESHOLDS: FlaggingThresholds = {
  confidenceFamilyMin: 0.75,
  confidenceClsMin: 0.75,
  confidenceOrientMin: 0.75,
};

/**
 * Combined classification data for flagging
 */
export interface ClassificationData {
  indicator: Indicator;
  router?: RouterResult;
  specialist?: SpecialistResult;
  orientation?: OrientationResult;
  validation?: ValidationResult; // Optional: validation results from database
  time_series?: TemporalDataPoint[]; // Optional: actual time series data for validation
}

/**
 * Check if indicator name/description contains pattern
 */
function containsPattern(indicator: Indicator, patterns: string[]): boolean {
  const name = (indicator.name || "").toLowerCase();
  const desc = (indicator.description || "").toLowerCase();
  const text = `${name} ${desc}`;

  return patterns.some((pattern) => text.includes(pattern.toLowerCase()));
}

/**
 * Rule: Low confidence in family (router)
 */
function checkLowConfidenceFamily(
  data: ClassificationData,
  threshold: number,
): FlaggedIndicator | null {
  if (
    data.router &&
    data.router.confidence_family < threshold &&
    data.indicator.id
  ) {
    return {
      indicator_id: data.indicator.id,
      flag_type: "low_confidence_family",
      flag_reason: `Router confidence ${
        data.router.confidence_family.toFixed(
          2,
        )
      } below threshold ${threshold}`,
      confidence: data.router.confidence_family,
      flagged_at: new Date().toISOString(),
    };
  }
  return null;
}

/**
 * Rule: Low confidence in specialist classification
 */
function checkLowConfidenceCls(
  data: ClassificationData,
  threshold: number,
): FlaggedIndicator | null {
  if (
    data.specialist &&
    data.specialist.confidence_cls < threshold &&
    data.indicator.id
  ) {
    return {
      indicator_id: data.indicator.id,
      flag_type: "low_confidence_cls",
      flag_reason: `Classification confidence ${
        data.specialist.confidence_cls.toFixed(
          2,
        )
      } below threshold ${threshold}`,
      confidence: data.specialist.confidence_cls,
      flagged_at: new Date().toISOString(),
    };
  }
  return null;
}

/**
 * Rule: Low confidence in orientation
 */
function checkLowConfidenceOrient(
  data: ClassificationData,
  threshold: number,
): FlaggedIndicator | null {
  if (
    data.orientation &&
    data.orientation.confidence_orient < threshold &&
    data.indicator.id
  ) {
    return {
      indicator_id: data.indicator.id,
      flag_type: "low_confidence_orient",
      flag_reason: `Orientation confidence ${
        data.orientation.confidence_orient.toFixed(
          2,
        )
      } below threshold ${threshold}`,
      confidence: data.orientation.confidence_orient,
      flagged_at: new Date().toISOString(),
    };
  }
  return null;
}

/**
 * Rule: Temporal aggregation mismatch (ratio/percentage/share/spread → not-applicable)
 */
function checkTemporalMismatch(
  data: ClassificationData,
): FlaggedIndicator | null {
  if (!data.specialist || !data.indicator.id) return null;

  const typesThatShouldBeNA = ["ratio", "percentage", "share", "spread"];

  if (
    typesThatShouldBeNA.includes(data.specialist.indicator_type) &&
    data.specialist.temporal_aggregation !== "not-applicable"
  ) {
    // Exception 1: growth rates can be period-rate
    const isGrowthRate = containsPattern(data.indicator, [
      "yoy",
      "y/y",
      "qoq",
      "q/q",
      "mom",
      "m/m",
      "growth",
      "rate",
      "change",
    ]);

    // Exception 2: per-capita/stock ratios measured at a point in time (e.g., "per 1000 people", "per capita")
    const units = (data.indicator.units || "").toLowerCase();
    const isPerCapitaStock =
      /per \d+ people|per capita|per thousand|per million|per 100/.test(
        units,
      ) ||
      containsPattern(data.indicator, [
        "per capita",
        "per 1000",
        "per million",
      ]);

    if (!isGrowthRate && !isPerCapitaStock) {
      return {
        indicator_id: data.indicator.id,
        flag_type: "temporal_mismatch",
        flag_reason:
          `Type '${data.specialist.indicator_type}' should have temporal='not-applicable'`,
        current_value: data.specialist.temporal_aggregation,
        expected_value: "not-applicable",
        flagged_at: new Date().toISOString(),
      };
    }
  }

  // Count/volume → period-total, but allow averages (e.g., 4-week average claims) to use period-average
  if (["count", "volume"].includes(data.specialist.indicator_type)) {
    const text = `${data.indicator.name || ""} ${
      data.indicator.description || ""
    }`.toLowerCase();
    const mentionsAverage =
      /average|avg|4-week|4 week|12-month|12 month|moving average/.test(text);
    if (mentionsAverage) {
      // Accept period-average for averaged count metrics
    } else if (data.specialist.temporal_aggregation !== "period-total") {
      return {
        indicator_id: data.indicator.id,
        flag_type: "temporal_mismatch",
        flag_reason:
          `Type '${data.specialist.indicator_type}' should have temporal='period-total'`,
        current_value: data.specialist.temporal_aggregation,
        expected_value: "period-total",
        flagged_at: new Date().toISOString(),
      };
    }
  }

  // YTD/cumulative → period-cumulative
  // Use validation results from database if available, otherwise fallback to inline analysis
  const nameIndicatesCumulative = containsPattern(data.indicator, [
    "ytd",
    "year-to-date",
    "cumulative",
  ]);

  let timeSeriesIndicatesCumulative = false;
  let timeSeriesConfidence = 0;
  let timeSeriesEvidence = "";

  // Prefer validation results from database (Phase 2)
  if (data.validation) {
    timeSeriesIndicatesCumulative = data.validation.is_cumulative;
    timeSeriesConfidence = data.validation.cumulative_confidence;
    timeSeriesEvidence = data.validation.validation_reasoning || "";
  } else {
    // Fallback to inline analysis (Phase 1) - only for cumulable types
    const CUMULABLE_TYPES = new Set([
      "flow", // GDP YTD, Revenue YTD
      "volume", // Exports YTD, Sales YTD
      "balance", // Trade Balance YTD
      "count", // Housing Starts YTD
    ]);

    const canBeCumulative = CUMULABLE_TYPES.has(data.specialist.indicator_type);

    if (canBeCumulative && data.time_series && data.time_series.length >= 6) {
      const analysis = analyzeTimeSeriesPattern(data.time_series);
      timeSeriesIndicatesCumulative = analysis.is_cumulative;
      timeSeriesConfidence = analysis.cumulative_confidence;
      timeSeriesEvidence = formatAnalysisForLLM(analysis);
    }
  }

  // Flag if EITHER name OR time series indicates cumulative pattern
  const shouldBeCumulative = nameIndicatesCumulative ||
    (timeSeriesIndicatesCumulative && timeSeriesConfidence > 0.7);

  if (
    shouldBeCumulative &&
    data.specialist.temporal_aggregation !== "period-cumulative"
  ) {
    const reason = timeSeriesIndicatesCumulative
      ? `Time series analysis indicates cumulative (YTD) pattern with ${
        (
          timeSeriesConfidence * 100
        ).toFixed(0)
      }% confidence. ${timeSeriesEvidence}`
      : "Name contains YTD/cumulative but temporal is not period-cumulative";

    return {
      indicator_id: data.indicator.id,
      flag_type: "temporal_mismatch",
      flag_reason: reason,
      current_value: data.specialist.temporal_aggregation,
      expected_value: "period-cumulative",
      flagged_at: new Date().toISOString(),
    };
  }

  // Also flag FALSE POSITIVES: name doesn't indicate cumulative, but classified as period-cumulative
  // AND time series shows it's NOT cumulative
  if (
    !nameIndicatesCumulative &&
    data.specialist.temporal_aggregation === "period-cumulative" &&
    data.time_series &&
    data.time_series.length >= 6 &&
    !timeSeriesIndicatesCumulative &&
    timeSeriesConfidence > 0.5
  ) {
    return {
      indicator_id: data.indicator.id,
      flag_type: "temporal_mismatch",
      flag_reason:
        `Classified as period-cumulative but time series shows non-cumulative pattern. ${timeSeriesEvidence}`,
      current_value: "period-cumulative",
      expected_value: "period-total or point-in-time",
      flagged_at: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Rule: Type mismatch (router family vs specialist category)
 */
function checkTypeMismatch(data: ClassificationData): FlaggedIndicator | null {
  if (!data.router || !data.specialist || !data.indicator.id) return null;

  const specialistCategory =
    INDICATOR_TYPE_TO_CATEGORY[data.specialist.indicator_type];

  if (specialistCategory !== data.router.family) {
    return {
      indicator_id: data.indicator.id,
      flag_type: "type_mismatch",
      flag_reason:
        `Specialist category '${specialistCategory}' differs from router family '${data.router.family}'`,
      current_value: specialistCategory,
      expected_value: data.router.family,
      flagged_at: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Rule: Orientation mismatch (specific rules)
 */
function checkOrientationMismatch(
  data: ClassificationData,
): FlaggedIndicator | null {
  if (!data.orientation || !data.indicator.id) return null;

  // Interest rates/yields → neutral
  const isInterestRate = containsPattern(data.indicator, [
    "interest rate",
    "yield",
    "bond rate",
    "policy rate",
  ]);
  if (isInterestRate && data.orientation.heat_map_orientation !== "neutral") {
    return {
      indicator_id: data.indicator.id,
      flag_type: "orientation_mismatch",
      flag_reason: "Interest rates/yields should have neutral orientation",
      current_value: data.orientation.heat_map_orientation,
      expected_value: "neutral",
      flagged_at: new Date().toISOString(),
    };
  }

  // Volatility → lower-is-positive
  const isVolatility = containsPattern(data.indicator, ["volatility", "vix"]) ||
    data.specialist?.indicator_type === "volatility";
  if (
    isVolatility &&
    data.orientation.heat_map_orientation !== "lower-is-positive"
  ) {
    return {
      indicator_id: data.indicator.id,
      flag_type: "orientation_mismatch",
      flag_reason: "Volatility should have lower-is-positive orientation",
      current_value: data.orientation.heat_map_orientation,
      expected_value: "lower-is-positive",
      flagged_at: new Date().toISOString(),
    };
  }

  // Inflation rate → lower-is-positive
  const isInflationRate = containsPattern(data.indicator, [
    "inflation rate",
    "inflation yoy",
    "cpi yoy",
  ]);
  if (
    isInflationRate &&
    data.orientation.heat_map_orientation !== "lower-is-positive"
  ) {
    return {
      indicator_id: data.indicator.id,
      flag_type: "orientation_mismatch",
      flag_reason: "Inflation rate should have lower-is-positive orientation",
      current_value: data.orientation.heat_map_orientation,
      expected_value: "lower-is-positive",
      flagged_at: new Date().toISOString(),
    };
  }

  // Growth rate → higher-is-positive (exclude price growth)
  const isGrowthRate = containsPattern(data.indicator, [
    "gdp growth",
    "growth rate",
    "economic growth",
  ]);
  const isPriceGrowth = containsPattern(data.indicator, [
    "inflation",
    "cpi",
    "ppi",
    "price",
  ]);
  if (
    isGrowthRate &&
    !isPriceGrowth &&
    data.orientation.heat_map_orientation !== "higher-is-positive"
  ) {
    return {
      indicator_id: data.indicator.id,
      flag_type: "orientation_mismatch",
      flag_reason:
        "GDP/economic growth should have higher-is-positive orientation",
      current_value: data.orientation.heat_map_orientation,
      expected_value: "higher-is-positive",
      flagged_at: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Rule: High-precision domain rules that frequently go wrong (optional)
 * Returns 'rule_violation' flags to feed the reviewer.
 */
function checkDomainRuleViolations(
  data: ClassificationData,
): FlaggedIndicator[] {
  const flags: FlaggedIndicator[] = [];
  const { indicator, specialist, router, orientation } = data;
  const id = indicator.id;
  if (!id) return flags;

  const name = (indicator.name || "").toLowerCase();

  // 1) If name suggests index (pmi, ism, index, confidence, climate, optimism) but type != index
  if (
    /(pmi|ism| index\b|confidence|climate|optimism)/.test(name) &&
    specialist &&
    specialist.indicator_type !== "index"
  ) {
    flags.push({
      indicator_id: id,
      flag_type: "rule_violation",
      flag_reason: "Name suggests an INDEX but type is not index",
      current_value: specialist.indicator_type,
      expected_value: "index",
      flagged_at: new Date().toISOString(),
    });
  }

  // 2) FX or Exchange Rate should be NON-MONETARY (dimensionless ratios)
  if (/exchange rate|fx|parallel fx/.test(name) && specialist) {
    if (specialist.is_currency_denominated === true) {
      flags.push({
        indicator_id: id,
        flag_type: "rule_violation",
        flag_reason:
          "FX/Exchange rates are dimensionless ratios, should be is_currency_denominated=false",
        current_value: "true",
        expected_value: "false",
        flagged_at: new Date().toISOString(),
      });
    }
  }

  // 3) Change-movement must be non-monetary
  if (
    router &&
    router.family === "change-movement" &&
    specialist &&
    specialist.is_currency_denominated === true
  ) {
    flags.push({
      indicator_id: id,
      flag_type: "rule_violation",
      flag_reason: "Change-movement indicators must be non-monetary",
      current_value: "true",
      expected_value: "false",
      flagged_at: new Date().toISOString(),
    });
  }

  // 4) Sales/units/starts should be count or volume (suppress if it's a rate/growth/change)
  // Note: Employment Change and Claimant Count Change are exceptions (handled in rule 11)
  if (/(sales|units|starts|advertisements)/.test(name) && specialist) {
    const looksRate = /(yoy|y\/y|qoq|q\/q|mom|m\/m|growth|change)/.test(name);
    const unitsText = (data.indicator.units || "").toLowerCase();
    const looksPercent = unitsText.includes("%") || /percent/.test(unitsText);
    if (!looksRate && !looksPercent) {
      if (
        specialist.indicator_type !== "count" &&
        specialist.indicator_type !== "volume"
      ) {
        flags.push({
          indicator_id: id,
          flag_type: "rule_violation",
          flag_reason:
            "Name suggests count/volume but type is not count/volume",
          current_value: specialist.indicator_type,
          expected_value: "count|volume",
          flagged_at: new Date().toISOString(),
        });
      }
    }
  }

  // 5) Prices Paid/Inventory Costs orientation should be lower-is-positive
  if (/(prices paid|inventory costs)/.test(name) && orientation) {
    if (orientation.heat_map_orientation !== "lower-is-positive") {
      flags.push({
        indicator_id: id,
        flag_type: "rule_violation",
        flag_reason:
          "Costs/prices paid should have lower-is-positive orientation",
        current_value: orientation.heat_map_orientation,
        expected_value: "lower-is-positive",
        flagged_at: new Date().toISOString(),
      });
    }
  }

  // 6) CPI/PCE index level orientation should be neutral
  if (/(cpi|pce).*index/.test(name) && orientation) {
    if (orientation.heat_map_orientation !== "neutral") {
      flags.push({
        indicator_id: id,
        flag_type: "rule_violation",
        flag_reason: "CPI/PCE index level should be neutral orientation",
        current_value: orientation.heat_map_orientation,
        expected_value: "neutral",
        flagged_at: new Date().toISOString(),
      });
    }
  }

  // 7) Price indices (containing "price" + "index") should be non-monetary (dimensionless)
  if (/price.*index|dairy.*trade.*index/.test(name) && specialist) {
    if (specialist.is_currency_denominated === true) {
      flags.push({
        indicator_id: id,
        flag_type: "rule_violation",
        flag_reason: "Price indices are dimensionless ratios (non-monetary)",
        current_value: "true",
        expected_value: "false",
        flagged_at: new Date().toISOString(),
      });
    }
  }

  // 8) Price change rates (producer prices change, import prices mom, etc.) should be non-monetary
  if (
    /(producer.*prices.*change|import.*prices.*mom|export.*prices.*change)/
      .test(
        name,
      ) &&
    specialist
  ) {
    if (specialist.is_currency_denominated === true) {
      flags.push({
        indicator_id: id,
        flag_type: "rule_violation",
        flag_reason: "Price change rates are percentages (non-monetary)",
        current_value: "true",
        expected_value: "false",
        flagged_at: new Date().toISOString(),
      });
    }
  }

  // 9) ISM/Fed diffusion indices (prices paid/received, manufacturing/non-manufacturing prices) should use period-average
  // Note: Specialist stage applies automatic normalization for these patterns
  if (/(ism|fed).*prices|inventory costs/.test(name) && specialist) {
    if (
      specialist.indicator_type === "index" &&
      specialist.temporal_aggregation !== "period-average"
    ) {
      flags.push({
        indicator_id: id,
        flag_type: "rule_violation",
        flag_reason:
          "ISM/Fed price diffusion indices and LMI Inventory Costs should use period-average temporal aggregation (automatic normalization should have been applied in specialist stage)",
        current_value: specialist.temporal_aggregation,
        expected_value: "period-average",
        flagged_at: new Date().toISOString(),
      });
    }
  }

  // 10) Debt indicators (debt, credit, borrowing) should be lower-is-positive
  if (/(debt|borrowing|imf credit)/.test(name) && orientation) {
    if (orientation.heat_map_orientation === "higher-is-positive") {
      flags.push({
        indicator_id: id,
        flag_type: "rule_violation",
        flag_reason: "Debt/borrowing should have lower-is-positive orientation",
        current_value: orientation.heat_map_orientation,
        expected_value: "lower-is-positive",
        flagged_at: new Date().toISOString(),
      });
    }
  }

  // 11) Employment Change and Claimant Count Change (can be negative) should be balance, not count
  // These are net changes that can be positive or negative, not simple counts
  if (/employment change|claimant count change/.test(name) && specialist) {
    if (specialist.indicator_type === "count") {
      flags.push({
        indicator_id: id,
        flag_type: "rule_violation",
        flag_reason:
          "Employment/Claimant Count Change can be negative, should be balance not count",
        current_value: specialist.indicator_type,
        expected_value: "balance",
        flagged_at: new Date().toISOString(),
      });
    }
  }

  // 12) X-week/X-month averages should use period-average temporal aggregation
  if (
    /(4-week|4 week|12-month|12 month|moving average).*average|average.*(4-week|4 week|12-month|12 month)/
      .test(
        name,
      ) &&
    specialist
  ) {
    if (specialist.temporal_aggregation !== "period-average") {
      flags.push({
        indicator_id: id,
        flag_type: "rule_violation",
        flag_reason:
          "X-week/X-month averages should use period-average temporal aggregation",
        current_value: specialist.temporal_aggregation,
        expected_value: "period-average",
        flagged_at: new Date().toISOString(),
      });
    }
  }

  return flags;
}

/**
 * Apply all flagging rules to an indicator
 */
export function applyFlaggingRules(
  data: ClassificationData,
  thresholds: FlaggingThresholds = DEFAULT_THRESHOLDS,
): FlaggedIndicator[] {
  const flags: FlaggedIndicator[] = [];

  // Confidence checks
  const flag1 = checkLowConfidenceFamily(data, thresholds.confidenceFamilyMin);
  if (flag1) flags.push(flag1);

  const flag2 = checkLowConfidenceCls(data, thresholds.confidenceClsMin);
  if (flag2) flags.push(flag2);

  const flag3 = checkLowConfidenceOrient(data, thresholds.confidenceOrientMin);
  if (flag3) flags.push(flag3);

  // Rule checks
  const flag4 = checkTemporalMismatch(data);
  if (flag4) flags.push(flag4);

  const flag5 = checkTypeMismatch(data);
  if (flag5) flags.push(flag5);

  const flag6 = checkOrientationMismatch(data);
  if (flag6) flags.push(flag6);

  // Domain rule violations (high precision)
  flags.push(...checkDomainRuleViolations(data));

  return flags;
}

/**
 * Apply flagging rules to multiple indicators
 */
export function batchApplyFlaggingRules(
  dataItems: ClassificationData[],
  thresholds: FlaggingThresholds = DEFAULT_THRESHOLDS,
): FlaggedIndicator[] {
  const allFlags: FlaggedIndicator[] = [];

  for (const data of dataItems) {
    const flags = applyFlaggingRules(data, thresholds);
    allFlags.push(...flags);
  }

  return allFlags;
}
