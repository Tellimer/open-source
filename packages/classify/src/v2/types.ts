/**
 * V2 Pipeline Type Definitions
 * @module
 */

import type {
  ClassificationOptions,
  ClassificationResult,
  ClassifiedMetadata,
  HeatMapOrientation,
  IndicatorCategory,
  IndicatorType,
  LLMProvider,
  TemporalAggregation,
  TokenUsage,
} from "../types.ts";

/**
 * V2 Pipeline Version
 */
export type PipelineVersion = "v1" | "v2";

/**
 * V2 Pipeline Stages
 */
export type V2PipelineStage =
  | "router"
  | "specialist"
  | "orientation"
  | "flagging"
  | "review"
  | "output";

/**
 * Indicator Family (same as category for V2 routing)
 */
export type IndicatorFamily = IndicatorCategory;

/**
 * Database Connection Configuration
 */
export interface DatabaseConfig {
  /** Connection type: local file or remote URL */
  type: "local" | "remote";

  /** Local: Path to SQLite file; Remote: Connection URL (e.g., Railway) */
  path: string;

  /** Remote only: Authentication token/credentials */
  auth?: {
    token?: string;
    username?: string;
    password?: string;
  };

  /** Connection pool settings */
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMs?: number;
  };

  /** Enable WAL mode for better concurrency (local only) */
  walMode?: boolean;

  /** Auto-create schema if not exists */
  autoMigrate?: boolean;
}

/**
 * V2 Pipeline Configuration
 */
export interface V2Config {
  /** Database configuration */
  database: DatabaseConfig;

  /** Threshold settings */
  thresholds?: {
    /** Minimum confidence for router family (default: 0.75) */
    confidenceFamilyMin?: number;
    /** Minimum confidence for specialist classification (default: 0.75) */
    confidenceClsMin?: number;
    /** Minimum confidence for orientation (default: 0.75) */
    confidenceOrientMin?: number;
  };

  /** Review behavior */
  reviewAll?: boolean; // If true, review every item (synthesize flags)

  /** Batch size settings */
  batch?: {
    /** Router batch size (default: 25-50) */
    routerBatchSize?: number;
    /** Specialist batch size per family (default: 25) */
    specialistBatchSize?: number;
    /** Orientation batch size (default: 50) */
    orientationBatchSize?: number;
    /** Review batch size (default: 20) */
    reviewBatchSize?: number;
  };

  /** Concurrency settings */
  concurrency?: {
    /** Router concurrent batches (default: 3-5) */
    router?: number;
    /** Specialist concurrent batches per family (default: 2-3) */
    specialist?: number;
    /** Orientation concurrent batches (default: 3-5) */
    orientation?: number;
    /** Review concurrent batches (default: 1-2) */
    review?: number;
  };

  /** Custom prompts (optional overrides) */
  prompts?: {
    router?: string;
    specialist?: Partial<Record<IndicatorFamily, string>>;
    orientation?: string;
    review?: string;
  };

  /** Model overrides for specific stages (optional) */
  models?: {
    /** Model for router stage (overrides default) */
    router?: string;
    /** Model for specialist stage (overrides default) */
    specialist?: string;
    /** Model for orientation stage (overrides default) */
    orientation?: string;
    /** Model for review stage (overrides default) */
    review?: string;
  };

  /** Enable specific stages (all enabled by default) */
  stages?: {
    router?: boolean;
    specialist?: boolean;
    orientation?: boolean;
    flagging?: boolean;
    review?: boolean;
  };
}

/**
 * Extended Classification Options with V2 support
 */
export interface V2ClassificationOptions extends ClassificationOptions {
  /** Pipeline version (default: 'v1') */
  pipelineVersion?: PipelineVersion;

  /** V2-specific configuration */
  v2?: V2Config;
}

/**
 * Router Stage Result
 */
export interface RouterResult {
  indicator_id: string;
  family: IndicatorFamily;
  confidence_family: number;
  reasoning?: string;
}

/**
 * Specialist Stage Result
 */
export interface SpecialistResult {
  indicator_id: string;
  indicator_type: IndicatorType;
  indicator_category: IndicatorCategory;
  temporal_aggregation: TemporalAggregation;
  is_currency_denominated: boolean;
  confidence_cls: number;
  reasoning?: string;
}

/**
 * Orientation Stage Result
 */
export interface OrientationResult {
  indicator_id: string;
  heat_map_orientation: HeatMapOrientation;
  confidence_orient: number;
  reasoning?: string;
}

/**
 * Flag Types
 */
export type FlagType =
  | "low_confidence_family"
  | "low_confidence_cls"
  | "low_confidence_orient"
  | "temporal_mismatch"
  | "type_mismatch"
  | "orientation_mismatch"
  | "family_mismatch"
  | "rule_violation"
  | "review_all";

/**
 * Flagged Indicator
 */
export interface FlaggedIndicator {
  indicator_id: string;
  flag_type: FlagType;
  flag_reason: string;
  current_value?: string;
  expected_value?: string;
  confidence?: number;
  flagged_at: string;
}

/**
 * Review Action
 */
export type ReviewAction = "confirm" | "fix" | "escalate";

/**
 * Review Decision
 */
export interface ReviewDecision {
  indicator_id: string;
  action: ReviewAction;
  diff?: Partial<ClassifiedMetadata>;
  reason: string;
  confidence: number;
}

/**
 * Review Configuration
 */
export interface ReviewConfig {
  batchSize?: number;
  concurrency?: number;
  debug?: boolean;
  quiet?: boolean;
}

/**
 * Review Batch Result
 */
export interface ReviewBatchResult {
  reviewed: number;
  confirmed: number;
  fixed: number;
  escalated: number;
  decisions: ReviewDecision[];
  processingTime: number;
  apiCalls: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Validation Result (Stage 3)
 */
export interface ValidationResult {
  indicator_id: string;
  is_cumulative: boolean;
  cumulative_confidence: number;
  has_seasonal_reset: boolean;
  is_monotonic_within_year: boolean;
  dec_jan_ratio?: number;
  within_year_increase_pct?: number;
  year_boundaries?: number;
  reset_at_boundary_pct?: number;
  suggested_temporal?: string;
  validation_reasoning?: string;
  data_points_analyzed: number;
}

/**
 * Combined classification data for intermediate stages
 */
export interface ClassificationData {
  indicator_id: string;
  name: string;
  units?: string;
  description?: string;
  family: IndicatorFamily;
  confidence_family: number;
  indicator_type: IndicatorType;
  temporal_aggregation: TemporalAggregation;
  is_currency_denominated?: boolean;
  confidence_cls: number;
  heat_map_orientation: HeatMapOrientation;
  confidence_orient: number;
  validated?: number;
  validation_confidence?: number;
  review_status?: ReviewAction;
  review_reason?: string;
}

/**
 * V2 Classification Output
 */
export interface V2Classification {
  indicator_id: string;
  name: string;
  units?: string;
  description?: string;
  family: IndicatorFamily;
  confidence_family: number;
  reasoning_router?: string;
  indicator_type: IndicatorType;
  temporal_aggregation: TemporalAggregation;
  is_currency_denominated: boolean;
  confidence_cls: number;
  reasoning_specialist?: string;
  validated?: number; // 0 or 1 - whether validation was performed
  validation_confidence?: number; // Confidence from time series validation
  heat_map_orientation: HeatMapOrientation;
  confidence_orient: number;
  review_status?: ReviewAction;
  review_reason?: string;
  provider: string;
  model: string;
  prompt_version?: string;
  created_at: string;
  updated_at: string;
}

/**
 * V2 Stage Metrics
 */
export interface V2StageMetrics {
  stage: V2PipelineStage;
  startTime: string;
  endTime: string;
  durationMs: number;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  throughput: number;
  avgTimePerItem: number;
}

/**
 * V2 Family Metrics
 */
export interface V2FamilyMetrics {
  family: IndicatorFamily;
  count: number;
  successRate: number;
  processingTime: number;
  tokenUsage?: TokenUsage;
  avgConfidence: number;
  flaggedCount: number;
}

/**
 * V2 Pipeline Telemetry
 */
export interface V2PipelineTelemetry {
  executionId: string;
  startTime: string;
  endTime: string;
  totalDurationMs: number;
  stageMetrics: V2StageMetrics[];
  familyMetrics: V2FamilyMetrics[];
  flaggingMetrics: {
    totalFlags: number;
    flagRate: number;
    flagsByType: Record<FlagType, number>;
  };
  reviewMetrics?: {
    totalReviewed: number;
    correctionsApplied: number;
    correctionRate: number;
  };
  tokenUsage: TokenUsage;
  overallSuccessRate: number;
  totalCost: number;
  costByFamily: Record<IndicatorFamily, number>;
  environment: {
    provider: LLMProvider;
    model: string;
    runtime: string;
    version: string;
  };
}

/**
 * V2 Classification Result
 */
export interface V2ClassificationResult extends ClassificationResult {
  /** V2 pipeline telemetry */
  v2Telemetry?: V2PipelineTelemetry;

  /** Flagged indicators */
  flagged?: FlaggedIndicator[];

  /** Review decisions */
  reviewed?: ReviewDecision[];

  /** Family distribution */
  familyDistribution?: Record<IndicatorFamily, number>;
}

/**
 * Pipeline Execution Record
 */
export interface PipelineExecutionRecord {
  execution_id: string;
  started_at: string;
  completed_at?: string;
  total_indicators: number;
  successful_indicators?: number;
  failed_indicators?: number;
  total_api_calls?: number;
  total_cost?: number;
  total_flagged?: number;
  total_reviewed?: number;
  total_fixed?: number;
  total_escalated?: number;
  processing_time_ms?: number;
  provider: string;
  model: string;
  status: "running" | "completed" | "failed";
  error_message?: string;
}

/**
 * V2 Pipeline Result
 */
export interface V2PipelineResult {
  classifications: V2Classification[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    flagged: number;
    reviewed: number;
    fixed: number;
    escalated: number;
  };
  stages: {
    router: {
      processed: number;
      apiCalls: number;
      processingTime: number;
    };
    specialist: {
      processed: number;
      families: number;
      apiCalls: number;
      processingTime: number;
    };
    validation: {
      analyzed: number;
      cumulative: number;
      nonCumulative: number;
      avgConfidence: number;
      processingTime: number;
    };
    orientation: {
      processed: number;
      apiCalls: number;
      processingTime: number;
    };
    flagging: {
      flagged: number;
    };
    review: {
      reviewed: number;
      confirmed: number;
      fixed: number;
      escalated: number;
      apiCalls: number;
      processingTime: number;
    };
  };
  processingTime: number;
  apiCalls: number;
  executionId: string;
}

/**
 * Default V2 Configuration
 */
export const DEFAULT_V2_CONFIG: Required<
  Omit<V2Config, "database" | "prompts" | "models">
> = {
  thresholds: {
    confidenceFamilyMin: 0.75,
    confidenceClsMin: 0.75,
    confidenceOrientMin: 0.75,
  },
  reviewAll: false,
  batch: {
    routerBatchSize: 5,
    specialistBatchSize: 5,
    orientationBatchSize: 5,
    reviewBatchSize: 5,
  },
  concurrency: {
    router: 4,
    specialist: 3,
    orientation: 4,
    review: 2,
  },
  stages: {
    router: true,
    specialist: true,
    orientation: true,
    flagging: true,
    review: true,
  },
};
