/**
 * Specialist Stage - Mechanical Validation
 * IMPORTANT: Only mechanical checks, NO semantic fixes
 * @module
 */

import type { IndicatorFamily, SpecialistResult } from "../types.ts";
import type { IndicatorType, TemporalAggregation } from "../../types.ts";
import {
  INDICATOR_TYPE_TO_CATEGORY,
  VALID_TEMPORAL_AGGREGATIONS,
} from "../../types.ts";

/**
 * Validation error details
 */
export interface ValidationError {
  indicator_id: string;
  field: string;
  value: unknown;
  expected: string;
  errorType:
    | "missing_field"
    | "invalid_enum"
    | "invalid_type"
    | "category_mismatch";
}

/**
 * Valid types per family (mechanical constraint)
 */
const VALID_TYPES_BY_FAMILY: Record<IndicatorFamily, IndicatorType[]> = {
  "physical-fundamental": ["stock", "flow", "balance", "capacity", "volume"],
  "numeric-measurement": ["count", "percentage", "ratio", "spread", "share"],
  "price-value": ["price", "yield"],
  "change-movement": ["rate", "volatility", "gap"],
  "composite-derived": ["index", "correlation", "elasticity", "multiplier"],
  temporal: ["duration", "probability", "threshold"],
  qualitative: ["sentiment", "allocation"],
  other: ["other"],
};

/**
 * Validate specialist result - mechanical checks only
 */
export function validateSpecialistResult(
  result: SpecialistResult,
  family: IndicatorFamily,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Check required fields exist
  if (!result.indicator_id) {
    errors.push({
      indicator_id: result.indicator_id || "unknown",
      field: "indicator_id",
      value: result.indicator_id,
      expected: "non-empty string",
      errorType: "missing_field",
    });
  }

  if (!result.indicator_type) {
    errors.push({
      indicator_id: result.indicator_id,
      field: "indicator_type",
      value: result.indicator_type,
      expected: "one of valid indicator types",
      errorType: "missing_field",
    });
  }

  if (!result.temporal_aggregation) {
    errors.push({
      indicator_id: result.indicator_id,
      field: "temporal_aggregation",
      value: result.temporal_aggregation,
      expected: "one of valid temporal aggregations",
      errorType: "missing_field",
    });
  }

  if (typeof result.is_currency_denominated !== "boolean") {
    errors.push({
      indicator_id: result.indicator_id,
      field: "is_currency_denominated",
      value: result.is_currency_denominated,
      expected: "boolean (true or false)",
      errorType: "invalid_type",
    });
  }

  if (
    typeof result.confidence_cls !== "number" ||
    result.confidence_cls < 0 ||
    result.confidence_cls > 1
  ) {
    errors.push({
      indicator_id: result.indicator_id,
      field: "confidence_cls",
      value: result.confidence_cls,
      expected: "number between 0 and 1",
      errorType: "invalid_type",
    });
  }

  // 2. Check enum membership
  const validTypes = VALID_TYPES_BY_FAMILY[family];
  if (result.indicator_type && !validTypes.includes(result.indicator_type)) {
    errors.push({
      indicator_id: result.indicator_id,
      field: "indicator_type",
      value: result.indicator_type,
      expected: validTypes.join(", "),
      errorType: "invalid_enum",
    });
  }

  if (
    result.temporal_aggregation &&
    !VALID_TEMPORAL_AGGREGATIONS.includes(result.temporal_aggregation as never)
  ) {
    errors.push({
      indicator_id: result.indicator_id,
      field: "temporal_aggregation",
      value: result.temporal_aggregation,
      expected: VALID_TEMPORAL_AGGREGATIONS.join(", "),
      errorType: "invalid_enum",
    });
  }

  // 3. Check category ← type mapping (mechanical derivation)
  if (result.indicator_type) {
    const expectedCategory = INDICATOR_TYPE_TO_CATEGORY[result.indicator_type];
    if (expectedCategory !== family) {
      errors.push({
        indicator_id: result.indicator_id,
        field: "indicator_type",
        value: result.indicator_type,
        expected:
          `type that belongs to family ${family}, not ${expectedCategory}`,
        errorType: "category_mismatch",
      });
    }
  }

  return errors;
}

/**
 * Apply automatic mechanical fixes (ONLY safe, deterministic fixes)
 */
export function applyMechanicalFixes(
  result: SpecialistResult,
  _family: IndicatorFamily,
): SpecialistResult {
  const fixed = { ...result };

  // 1. Clamp confidence to [0, 1]
  if (typeof fixed.confidence_cls === "number") {
    fixed.confidence_cls = Math.max(0, Math.min(1, fixed.confidence_cls));
  }

  // 2. Normalize boolean values (if LLM returned string)
  if (typeof fixed.is_currency_denominated === "string") {
    fixed.is_currency_denominated =
      (fixed.is_currency_denominated as string).toLowerCase() === "true";
  } else if (typeof fixed.is_currency_denominated !== "boolean") {
    // Default to false if invalid
    fixed.is_currency_denominated = false;
  }

  // 3. Lowercase and trim enum values
  if (typeof fixed.indicator_type === "string") {
    fixed.indicator_type = fixed.indicator_type
      .toLowerCase()
      .trim() as IndicatorType;
  }

  if (typeof fixed.temporal_aggregation === "string") {
    fixed.temporal_aggregation = fixed.temporal_aggregation
      .toLowerCase()
      .trim() as TemporalAggregation;
  }

  // NO semantic fixes - if type doesn't match family, let it fail

  return fixed;
}

/**
 * Check if result passes validation
 */
export function isValidResult(
  result: SpecialistResult,
  family: IndicatorFamily,
): boolean {
  const errors = validateSpecialistResult(result, family);
  return errors.length === 0;
}
