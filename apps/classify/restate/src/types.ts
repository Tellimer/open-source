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
