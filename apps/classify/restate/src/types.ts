/**
 * Shared types for Classify Workflow
 * @module
 */

import { z } from 'zod';

/**
 * Sample time series value
 */
export const sampleValueSchema = z.object({
  date: z.string(),
  value: z.number(),
});

/**
 * Indicator input schema
 */
export const indicatorInputSchema = z.object({
  indicator_id: z.string(),
  name: z.string(),
  units: z.string().optional(),
  description: z.string().optional(),
  periodicity: z.string().optional(),
  sample_values: z.array(sampleValueSchema).optional(),
  // Additional contextual fields
  source_name: z.string().optional(),
  source_url: z.string().optional(),
  long_name: z.string().optional(),
  category_group: z.string().optional(),
  dataset: z.string().optional(),
  aggregation_method: z.string().optional(),
  scale: z.string().optional(),
  topic: z.string().optional(),
  currency_code: z.string().optional(),
});

export type IndicatorInput = z.infer<typeof indicatorInputSchema>;
export type SampleValue = z.infer<typeof sampleValueSchema>;

/**
 * LLM Provider options
 */
export type LLMProvider = 'local' | 'openai' | 'anthropic';

/**
 * Batch classification request
 */
export const batchClassifyRequestSchema = z.object({
  indicators: z.array(indicatorInputSchema).min(1).max(100),
  llm_provider: z.enum(['local', 'openai', 'anthropic']).optional().default('local'),
});

export type BatchClassifyRequest = z.infer<typeof batchClassifyRequestSchema>;

/**
 * Normalization result
 */
export interface NormalizationResult {
  originalUnits: string;
  parsedScale: string | null;
  normalizedScale: string;
  parsedUnitType: string;
  parsedCurrency: string | null;
  parsingConfidence: number;
}

/**
 * Time inference result
 */
export interface TimeInferenceResult {
  reportingFrequency: string;
  timeBasis: string;
  confidence: number;
  reasoning?: string;
  sourceUsed?: string;
}

/**
 * Cumulative detection result
 */
export interface CumulativeDetectionResult {
  is_cumulative: boolean;
  pattern_type: string;
  confidence: number;
  evidence?: Record<string, any>;
  reasoning?: string;
}

/**
 * Family assignment result
 */
export interface FamilyAssignmentResult {
  family: string;
  confidence: number;
  reasoning?: string;
}

/**
 * Type classification result
 */
export interface TypeClassificationResult {
  indicatorType: string;
  temporalAggregation: string;
  heatMapOrientation: string;
  confidence: number;
  reasoning?: string;
}

/**
 * Boolean review result
 */
export interface BooleanReviewResult {
  passed: boolean;
  fieldsWrong?: string[];
  reason?: string;
  confidence: number;
}

/**
 * Final review result
 */
export interface FinalReviewResult {
  status: 'passed' | 'corrected' | 'failed';
  corrections?: Record<string, any>;
  reasoning?: string;
  confidence: number;
}

/**
 * Complete classification result
 */
export interface ClassificationResult {
  indicator_id: string;
  name: string;

  // Normalization
  original_units?: string;
  parsed_scale?: string;
  parsed_unit_type?: string;
  parsed_currency?: string;
  parsing_confidence?: number;

  // Time inference
  reporting_frequency?: string;
  time_basis?: string;
  time_confidence?: number;
  time_reasoning?: string;

  // Cumulative detection
  is_cumulative?: boolean;
  cumulative_pattern_type?: string;
  cumulative_confidence?: number;

  // Family & Type
  family?: string;
  family_confidence?: number;
  indicator_type?: string;
  temporal_aggregation?: string;
  heat_map_orientation?: string;
  type_confidence?: number;

  // Reviews
  boolean_review_passed?: boolean;
  final_review_status?: string;

  // Overall
  overall_confidence?: number;
  review_status?: 'passed' | 'corrected' | 'failed';

  // Metadata
  provider?: string;
  model?: string;
  created_at?: string;
  updated_at?: string;
}

//
// ============================================================================
// DATA QUALITY TYPES
// ============================================================================
//

/**
 * Time series data point
 */
export const timeSeriesPointSchema = z.object({
  date: z.string(),
  value: z.number(),
});

export type TimeSeriesPoint = z.infer<typeof timeSeriesPointSchema>;

/**
 * Check types for data quality analysis
 */
export type CheckType =
  | 'staleness'
  | 'magnitude_change'
  | 'false_reading'
  | 'unit_change'
  | 'consistency';

/**
 * Issue severity levels
 */
export type Severity = 1 | 2 | 3 | 4 | 5; // 1=low, 5=critical

/**
 * Check status
 */
export type CheckStatus = 'passed' | 'flagged' | 'critical';

/**
 * Quality flag schema
 */
export const qualityFlagSchema = z.object({
  check_type: z.enum(['staleness', 'magnitude_change', 'false_reading', 'unit_change', 'consistency']),
  status: z.enum(['passed', 'flagged', 'critical']),
  severity: z.number().min(1).max(5),
  message: z.string(),
  details: z.record(z.unknown()),
  affected_dates: z.array(z.string()).optional(),
});

export type QualityFlag = z.infer<typeof qualityFlagSchema>;

/**
 * Staleness detection result
 */
export interface StalenessResult {
  has_staleness: boolean;
  expected_frequency_days: number;
  actual_gap_days: number;
  last_data_point: string;
  days_since_last_update: number;
  flags: QualityFlag[];
}

/**
 * Magnitude detection result
 */
export interface MagnitudeResult {
  has_anomalies: boolean;
  mean: number;
  std_dev: number;
  outliers: Array<{
    date: string;
    value: number;
    z_score: number;
  }>;
  sudden_changes: Array<{
    from_date: string;
    to_date: string;
    from_value: number;
    to_value: number;
    change_magnitude: number;
    change_percent: number;
  }>;
  flags: QualityFlag[];
}

/**
 * False reading detection result
 */
export interface FalseReadingResult {
  has_issues: boolean;
  impossible_values: Array<{
    date: string;
    value: number;
    reason: string;
  }>;
  flat_periods: Array<{
    start_date: string;
    end_date: string;
    value: number;
    duration_days: number;
  }>;
  repeating_patterns: Array<{
    pattern: number[];
    occurrences: number;
    dates: string[];
  }>;
  decimal_errors: Array<{
    date: string;
    value: number;
    suspected_correct_value: number;
    scale_factor: number;
  }>;
  flags: QualityFlag[];
}

/**
 * Unit change detection result
 */
export interface UnitChangeResult {
  has_changes: boolean;
  regime_shifts: Array<{
    date: string;
    scale_factor: number;
    before_mean: number;
    after_mean: number;
  }>;
  flags: QualityFlag[];
}

/**
 * Consistency check result
 */
export interface ConsistencyResult {
  is_consistent: boolean;
  monotonicity_violations: Array<{
    date: string;
    value: number;
    expected_direction: 'increasing' | 'decreasing';
  }>;
  temporal_inconsistencies: Array<{
    date: string;
    issue: string;
  }>;
  flags: QualityFlag[];
}

/**
 * Consolidated quality report
 */
export interface ConsolidatedQualityReport {
  indicator_id: string;
  total_checks: number;
  passed_checks: number;
  flagged_count: number;
  critical_count: number;
  all_flags: QualityFlag[];
  staleness: StalenessResult;
  magnitude: MagnitudeResult;
  false_readings: FalseReadingResult;
  unit_changes: UnitChangeResult;
  consistency: ConsistencyResult;
  overall_score: number; // 0-100
}

/**
 * LLM quality review schema
 */
export const llmQualityReviewSchema = z.object({
  overall_assessment: z.enum(['clean', 'minor_issues', 'major_issues', 'unusable']),
  validated_issues: z.array(z.object({
    check_type: z.string(),
    is_valid: z.boolean(),
    reasoning: z.string(),
    root_cause: z.string().optional(),
    impact: z.enum(['low', 'medium', 'high', 'critical']),
  })),
  recommended_actions: z.array(z.object({
    action: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    description: z.string(),
  })),
  usability_verdict: z.enum(['use_as_is', 'use_with_caution', 'investigate_first', 'do_not_use']),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
});

export type LLMQualityReview = z.infer<typeof llmQualityReviewSchema>;

/**
 * Complete data quality report
 */
export interface DataQualityReport {
  report_id: string;
  indicator_id: string;
  name: string;
  checked_at: string;

  // Raw checks
  consolidated_report: ConsolidatedQualityReport;

  // LLM validation (null if no issues found)
  llm_review: LLMQualityReview | null;

  // Summary
  status: 'clean' | 'minor_issues' | 'major_issues' | 'unusable';
  requires_attention: boolean;

  // Metadata
  time_series_count: number;
  date_range: {
    start: string;
    end: string;
  };
}

/**
 * Data quality check request
 */
export const dataQualityCheckRequestSchema = z.object({
  indicator_ids: z.array(z.string()).min(1).max(100),
  llm_provider: z.enum(['local', 'openai', 'anthropic']).optional().default('openai'),
});

export type DataQualityCheckRequest = z.infer<typeof dataQualityCheckRequestSchema>;

//
// ============================================================================
// CONSENSUS ANALYSIS TYPES
// ============================================================================
//

/**
 * Indicator metadata for consensus analysis
 */
export interface IndicatorMetadata {
  indicator_id: string;
  name: string;
  units?: string;
  normalized_scale: string;
  reporting_frequency: string;
  parsed_currency: string | null;
  time_basis: string;
  indicator_type: string;
  temporal_aggregation: string;
  source_name?: string;
  country?: string;
  region?: string;
}

/**
 * Consensus dimension types
 */
export type ConsensusDimension =
  | 'units'
  | 'scale'
  | 'frequency'
  | 'currency'
  | 'time_basis'
  | 'indicator_type'
  | 'temporal_aggregation';

/**
 * Outlier indicator
 */
export interface ConsensusOutlier {
  indicator_id: string;
  dimension: ConsensusDimension;
  outlier_value: string;
  consensus_value: string;
  deviation_percentage: number;
  source_name?: string;
  country?: string;
  region?: string;
}

/**
 * Consensus result for a single dimension
 */
export interface ConsensusResult {
  dimension: ConsensusDimension;
  consensus_value: string;
  consensus_percentage: number;
  total_indicators: number;
  consensus_count: number;
  value_distribution: Record<string, number>; // { "celsius": 95, "fahrenheit": 20, ... }
  outliers: ConsensusOutlier[];
  has_strong_consensus: boolean; // true if >= 75%
}

/**
 * Consolidated consensus summary
 */
export interface ConsensusSummaryReport {
  indicator_name: string;
  total_indicators: number;
  total_checks: number; // 5 dimensions
  dimensions_with_consensus: number;
  dimensions_with_issues: number;
  total_outliers: number;
  unit_consensus: ConsensusResult;
  scale_consensus: ConsensusResult;
  frequency_consensus: ConsensusResult;
  currency_consensus: ConsensusResult;
  time_basis_consensus: ConsensusResult;
  all_outliers: ConsensusOutlier[];
  status: "highly_consistent" | "mostly_consistent" | "inconsistent" | "critical_inconsistency";
}

/**
 * LLM consensus review schema
 */
export const llmConsensusReviewSchema = z.object({
  overall_assessment: z.enum(['highly_consistent', 'mostly_consistent', 'inconsistent', 'critical_inconsistency']),
  validated_outliers: z.array(z.object({
    indicator_id: z.string(),
    dimension: z.string(),
    is_valid_outlier: z.boolean(), // true = intentional difference, false = likely error
    reasoning: z.string(),
    root_cause: z.string().optional(),
    recommended_action: z.enum(['no_action', 'document_difference', 'investigate', 'correct_error', 'standardize']),
  })),
  standardization_recommendations: z.array(z.object({
    dimension: z.string(),
    current_consensus: z.string(),
    recommended_standard: z.string(),
    affected_indicators: z.array(z.string()),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    rationale: z.string(),
  })),
  regional_patterns: z.array(z.object({
    region: z.string(),
    pattern: z.string(),
    is_expected: z.boolean(),
  })).optional(),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
});

export type LLMConsensusReview = z.infer<typeof llmConsensusReviewSchema>;

/**
 * Complete consensus analysis report
 */
export interface ConsensusAnalysisReport {
  report_id: string;
  indicator_name: string;
  analyzed_at: string;

  // Summary
  summary_report: ConsensusSummaryReport;

  // LLM validation (null if no outliers)
  llm_review: LLMConsensusReview | null;

  // Status
  status: 'highly_consistent' | 'mostly_consistent' | 'inconsistent' | 'critical_inconsistency';
  requires_action: boolean;
}

/**
 * Consensus analysis request
 */
export const consensusAnalysisRequestSchema = z.object({
  indicator_names: z.array(z.string()).min(1).max(50),
  min_sample_size: z.number().min(3).max(100).optional().default(5),
  consensus_threshold: z.number().min(0.5).max(1.0).optional().default(0.75), // 75%
  llm_provider: z.enum(['local', 'openai', 'anthropic']).optional().default('openai'),
});

export type ConsensusAnalysisRequest = z.infer<typeof consensusAnalysisRequestSchema>;
