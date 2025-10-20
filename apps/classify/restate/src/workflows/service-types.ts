/**
 * Service type definitions for workflow service client calls
 * These types allow TypeScript to properly type-check service invocations
 */

import type {
  IndicatorInput,
  TimeSeriesPoint,
  StalenessResult,
  MagnitudeResult,
  FalseReadingResult,
  UnitChangeResult,
  ConsistencyResult,
  ConsolidatedQualityReport,
  LLMQualityReview,
  IndicatorMetadata,
  ConsensusResult,
  ConsensusSummaryReport,
  LLMConsensusReview,
} from "../types.ts";

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

//
// ============================================================================
// DATA QUALITY SERVICE TYPES
// ============================================================================
//

// Staleness Detector Service
export interface StalenessDetectorService {
  detect: (input: {
    indicator_id: string;
    time_series: TimeSeriesPoint[];
    expected_frequency: string; // from classification
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: StalenessResult;
  }>;
}

// Magnitude Detector Service
export interface MagnitudeDetectorService {
  detect: (input: {
    indicator_id: string;
    time_series: TimeSeriesPoint[];
    indicator_type: string; // from classification
    is_cumulative: boolean; // from classification
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: MagnitudeResult;
  }>;
}

// False Reading Detector Service
export interface FalseReadingDetectorService {
  detect: (input: {
    indicator_id: string;
    time_series: TimeSeriesPoint[];
    indicator_type: string; // for context
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: FalseReadingResult;
  }>;
}

// Unit Change Detector Service
export interface UnitChangeDetectorService {
  detect: (input: {
    indicator_id: string;
    time_series: TimeSeriesPoint[];
    expected_scale: string; // from classification
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: UnitChangeResult;
  }>;
}

// Consistency Checker Service
export interface ConsistencyCheckerService {
  check: (input: {
    indicator_id: string;
    time_series: TimeSeriesPoint[];
    is_cumulative: boolean;
    temporal_aggregation: string;
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: ConsistencyResult;
  }>;
}

// Quality Consolidator Service
export interface QualityConsolidatorService {
  consolidate: (input: {
    indicator_id: string;
    staleness: StalenessResult;
    magnitude: MagnitudeResult;
    false_readings: FalseReadingResult;
    unit_changes: UnitChangeResult;
    consistency: ConsistencyResult;
  }) => Promise<{
    success: boolean;
    result: ConsolidatedQualityReport;
  }>;
}

// Quality Review Service (LLM)
export interface QualityReviewService {
  review: (input: {
    indicator_id: string;
    name: string;
    consolidated_report: ConsolidatedQualityReport;
    time_series_summary: {
      count: number;
      date_range: { start: string; end: string };
      mean: number;
      std_dev: number;
    };
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: LLMQualityReview & {
      provider: string;
      model: string;
      created_at: string;
    };
  }>;
}

//
// ============================================================================
// CONSENSUS ANALYSIS SERVICE TYPES
// ============================================================================
//

// Unit Consensus Detector Service
export interface UnitConsensusDetectorService {
  detect: (input: {
    indicator_name: string;
    indicators: IndicatorMetadata[];
    consensus_threshold: number; // e.g., 0.75 for 75%
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: ConsensusResult;
  }>;
}

// Scale Consensus Detector Service
export interface ScaleConsensusDetectorService {
  detect: (input: {
    indicator_name: string;
    indicators: IndicatorMetadata[];
    consensus_threshold: number;
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: ConsensusResult;
  }>;
}

// Frequency Consensus Detector Service
export interface FrequencyConsensusDetectorService {
  detect: (input: {
    indicator_name: string;
    indicators: IndicatorMetadata[];
    consensus_threshold: number;
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: ConsensusResult;
  }>;
}

// Currency Consensus Detector Service
export interface CurrencyConsensusDetectorService {
  detect: (input: {
    indicator_name: string;
    indicators: IndicatorMetadata[];
    consensus_threshold: number;
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: ConsensusResult;
  }>;
}

// Time Basis Consensus Detector Service
export interface TimeBasisConsensusDetectorService {
  detect: (input: {
    indicator_name: string;
    indicators: IndicatorMetadata[];
    consensus_threshold: number;
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: ConsensusResult;
  }>;
}

// Consensus Consolidator Service
export interface ConsensusConsolidatorService {
  consolidate: (input: {
    indicator_name: string;
    total_indicators: number;
    unit_consensus: ConsensusResult;
    scale_consensus: ConsensusResult;
    frequency_consensus: ConsensusResult;
    currency_consensus: ConsensusResult;
    time_basis_consensus: ConsensusResult;
  }) => Promise<{
    success: boolean;
    result: ConsensusSummaryReport;
  }>;
}

// Consensus Review Service (LLM)
export interface ConsensusReviewService {
  review: (input: {
    indicator_name: string;
    summary_report: ConsensusSummaryReport;
    sample_indicators: IndicatorMetadata[]; // Sample for context
    llm_provider?: string;
  }) => Promise<{
    success: boolean;
    result: LLMConsensusReview & {
      provider: string;
      model: string;
      created_at: string;
    };
  }>;
}
