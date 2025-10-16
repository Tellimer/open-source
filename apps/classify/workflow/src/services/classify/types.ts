/**
 * Classification types for the indicator classification workflow
 */

import { type UnitSemanticType } from "../../utils/unit-classifier.ts";

/**
 * Normalization result from parsing units
 */
export interface NormalizationResult {
  originalUnits: string;
  parsedScale: string; // thousands|millions|billions|raw
  normalizedScale: string; // Standardized scale enum: raw-units|hundreds|thousands|millions|billions|trillions|percent|index
  parsedUnitType: UnitSemanticType;
  parsedCurrency: string | null;
  parsingConfidence: number;
  matchedPattern?: string;
}

/**
 * Time inference result
 */
export interface TimeInferenceResult {
  reportingFrequency:
    | "daily"
    | "monthly"
    | "quarterly"
    | "annual"
    | "point-in-time";
  timeBasis: "per-period" | "point-in-time" | "cumulative";
  confidence: number;
  reasoning: string;
  sourceUsed: "units" | "periodicity" | "time-series" | "unknown";
}

/**
 * Scale inference result
 */
export interface ScaleInferenceResult {
  scale:
    | "raw-units"
    | "percent"
    | "thousands"
    | "millions"
    | "billions"
    | "index";
  confidence: number;
  reasoning: string;
}

/**
 * Currency check result
 */
export interface CurrencyCheckResult {
  isCurrencyDenominated: boolean;
  detectedCurrency: string | null;
  confidence: number;
  reasoning: string;
}

/**
 * Family assignment result
 */
export interface FamilyAssignmentResult {
  family:
    | "physical-fundamental"
    | "numeric-measurement"
    | "price-value"
    | "change-movement"
    | "composite-derived"
    | "temporal"
    | "qualitative";
  confidence: number;
  reasoning: string;
}

/**
 * Type classification result
 */
export interface TypeClassificationResult {
  indicatorType:
    | "stock"
    | "flow"
    | "balance"
    | "capacity"
    | "volume"
    | "count"
    | "percentage"
    | "ratio"
    | "spread"
    | "share"
    | "price"
    | "yield"
    | "rate"
    | "volatility"
    | "gap"
    | "index"
    | "correlation"
    | "elasticity"
    | "multiplier"
    | "duration"
    | "probability"
    | "threshold"
    | "sentiment"
    | "allocation"
    | "other";
  temporalAggregation:
    | "point-in-time"
    | "period-rate"
    | "period-cumulative"
    | "period-average"
    | "period-total"
    | "not-applicable";
  confidence: number;
  reasoning: string;
}

/**
 * Boolean review result
 */
export interface BooleanReviewResult {
  isCorrect: boolean;
  incorrectFields: string[];
  reasoning: string;
  confidence: number;
}

/**
 * Final review result
 */
export interface FinalReviewResult {
  reviewMakesSense: boolean;
  correctionsApplied: Record<string, unknown>;
  finalReasoning: string;
  confidence: number;
}

/**
 * Complete classification result
 */
export interface CompleteClassification {
  indicatorId: string;
  name: string;
  units?: string;
  normalized: NormalizationResult;
  time: TimeInferenceResult;
  scale: ScaleInferenceResult;
  currency: CurrencyCheckResult;
  family: FamilyAssignmentResult;
  type: TypeClassificationResult;
  review: BooleanReviewResult;
  finalReview?: FinalReviewResult;
  overallConfidence: number;
  createdAt: string;
}
