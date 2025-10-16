/**
 * Service type definitions for workflow service client calls
 * These types allow TypeScript to properly type-check service invocations
 */

import type { IndicatorInput } from "../types.ts";

// Normalization Service
export interface NormalizationService {
  normalize: (input: IndicatorInput & { llm_provider?: string }) => Promise<{
    success: boolean;
    result: {
      indicator_id: string;
      parsed_scale: string;
      normalized_scale: string;
      parsed_unit_type: string;
      parsed_currency: string | null;
      parsing_confidence: number;
      provider: string;
      model: string;
      created_at: string;
    };
  }>;
}

// Time Inference Service
export interface TimeInferenceService {
  infer: (input: IndicatorInput & {
    parsed_scale?: string;
    parsed_unit_type?: string;
    parsed_currency?: string | null;
    normalized_scale: string;
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    timeResult: {
      reporting_frequency: string;
      time_basis: string;
      confidence: number;
      reasoning: string;
      source_used: string;
    };
    cumulativeResult: {
      is_cumulative: boolean;
      pattern_type: string;
      confidence: number;
      evidence: string;
      reasoning: string;
    };
  }>;
}

// Family Assignment Service
export interface FamilyAssignmentService {
  assign: (input: IndicatorInput & {
    time_basis: string;
    normalized_scale: string;
    is_currency: boolean;
    detected_currency: string | null;
    parsed_unit_type?: string;
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: {
      indicator_id: string;
      family: string;
      confidence: number;
      reasoning: string;
      provider: string;
      model: string;
      created_at: string;
    };
  }>;
}

// Type Classification Service
export interface TypeClassificationService {
  classify: (input: IndicatorInput & {
    family: string;
    time_basis: string;
    normalized_scale: string;
    is_currency: boolean;
    detected_currency?: string | null;
    parsed_unit_type?: string;
    is_cumulative?: boolean;
    cumulative_pattern_type?: string;
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: {
      indicator_id: string;
      indicator_type: string;
      temporal_aggregation: string;
      confidence: number;
      reasoning: string;
      provider: string;
      model: string;
      created_at: string;
    };
  }>;
}

// Boolean Review Service
export interface BooleanReviewService {
  review: (input: {
    indicator_id: string;
    name: string;
    time_basis: string;
    normalized_scale: string;
    is_currency: boolean;
    family: string;
    indicator_type: string;
    temporal_aggregation: string;
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: {
      indicator_id: string;
      is_correct: boolean;
      incorrect_fields: string[];
      reasoning: string;
      confidence: number;
      provider: string;
      model: string;
      created_at: string;
    };
  }>;
}

// Final Review Service
export interface FinalReviewService {
  review: (input: {
    indicator_id: string;
    incorrect_fields: string[];
    review_reasoning: string;
    current_values: {
      family: string;
      type: string;
      temporal_aggregation: string;
      time_basis: string;
      scale: string;
    };
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: {
      indicator_id: string;
      review_makes_sense: boolean;
      corrections_applied: {
        family?: string;
        type?: string;
        temporal_aggregation?: string;
      };
      reasoning: string;
      provider: string;
      model: string;
      created_at: string;
    };
  }>;
}
