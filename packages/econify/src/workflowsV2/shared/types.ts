// ============================================================================
// Base Types (copied from main types.ts to make V2 independent)
// ============================================================================

export interface FXTable {
  base: string;
  rates: Record<string, number>;
  /** Optional dates for each rate - when each rate was last updated */
  dates?: Record<string, string>;
  /** Optional timestamp for when the entire table was generated */
  asOf?: string;
}

export type Scale =
  | "ones"
  | "hundreds"
  | "thousands"
  | "millions"
  | "billions"
  | "trillions";

export type TimeScale = "year" | "quarter" | "month" | "week" | "day" | "hour";

// ============================================================================
// Pipeline Configuration (copied from V1 to make V2 independent)
// ============================================================================

import type { Explain, NormalizationExemptions } from "../../types.ts";
import type { ParsedUnit } from "../../units/units.ts";

export interface PipelineConfig {
  minQualityScore?: number;
  targetCurrency?: string;
  targetMagnitude?: Scale;
  targetTimeScale?: TimeScale;
  inferUnits?: boolean;
  adjustInflation?: boolean;
  removeSeasonality?: boolean;
  useLiveFX?: boolean;
  fxFallback?: FXTable;
  validateSchema?: boolean;
  requiredFields?: string[];
  outputFormat?: "json" | "csv" | "parquet";

  // Wages-specific configuration
  excludeIndexValues?: boolean;
  includeWageMetadata?: boolean;

  // Normalization exemptions
  exemptions?: NormalizationExemptions;

  // Auto-target by indicator (additive, off by default)
  autoTargetByIndicator?: boolean;
  /** Grouping key for indicator series (default: 'name') */
  indicatorKey?: "name";
  /** Dimensions to auto-target (default: currency+magnitude+time) */
  autoTargetDimensions?: Array<"currency" | "magnitude" | "time">;
  /** Minimum share required to select a majority value (default: 0.5) */
  minMajorityShare?: number;
  /** Tie-breaker preferences when no majority exists */
  tieBreakers?: {
    currency?: "prefer-targetCurrency" | "prefer-USD" | "none";
    magnitude?: "prefer-millions" | "none";
    time?: "prefer-month" | "none";
  };
  /** Optional allow/deny lists to force in/out certain indicators */
  allowList?: string[];
  denyList?: string[];

  // Metadata explanation
  /** Select pipeline engine (default: "v1"). V2 uses workflowsV2 state machines */
  engine?: "v1" | "v2";

  /** Include detailed normalization metadata for transparency (default: false) */
  explain?: boolean;
}

// ============================================================================
// ParsedData Interface (copied from V1 to make V2 independent)
// ============================================================================

export interface ParsedData {
  id?: string | number;
  value: number;
  unit: string;

  /** Explicit metadata fields - use if provided, otherwise parse from unit string */
  periodicity?: string; // "Quarterly", "Monthly", "Yearly" - takes precedence over unit string parsing
  scale?: string; // "Millions", "Billions", "Thousands" - takes precedence over unit string parsing
  currency_code?: string | null; // "USD", "SAR", "XOF" - takes precedence over unit string parsing
  country_iso?: string; // "USA", "SAU", "CMR" - ISO 3166-1 alpha-3 code
  category_group?: string; //"Trade", "Government", "Energy", "Labour", "Prices", "Wages", "Debt", "Reserves", "Agriculture", "Metals", "Commodities", "Emissions", "Energy", "Temperature", "Population", "Indices", "Percentages", "Rates", "Time", "Counts", "Unknown"?: string; // "Trade", "Government", "Energy" - high-level category
  source_name?: string; // "World Bank", "IMF", "Eurostat", "BLS", "Census Bureau", "Unknown" - high-level source
  expected_domain?: string; // Used for testing

  parsedUnit?: ParsedUnit;
  inferredUnit?: string;
  normalized?: number;
  normalizedUnit?: string;
  realValue?: number;
  year?: number;
  date?: string | Date;
  description?: string;
  name?: string;
  context?: string;
  metadata?: Record<string, unknown>;
  pipeline?: {
    qualityScore?: number;
    processingTime?: number;
    inferredUnit?: string;
  };
  /** Detailed normalization explanation (when explain option is enabled) */
  explain?: Explain;

  /** Internal V2 workflow flag indicating if this item needs FX conversion */
  needsFX?: boolean;
}

// ============================================================================
// Core Pipeline Types
// ============================================================================

/**
 * V2 Pipeline context - shared across all machines
 */
export interface PipelineV2Context {
  // Input data
  input: ParsedData[];
  config: PipelineConfig;

  // Processing state
  items: ParsedData[];
  exempted: ParsedData[];
  buckets: V2Buckets;
  results: ProcessdData[];

  // FX data
  fxRates?: FXTable;
  fxSource?: string;
  fxSourceId?: string;

  // Error handling
  errors: ProcessingError[];

  // Explain metadata
  explain?: ExplainV2Metadata;
}

/**
 * Processed item after domain-specific normalization
 */
export interface ProcessdData extends Omit<ParsedData, "explain"> {
  normalizedValue: number;
  normalizedUnit: string;
  qualityScore: number;
  explain?: ItemExplain;
}

/**
 * Classification facts computed for each item
 */
export interface ClassificationFacts {
  // Currency detection
  hasCurrencyCode: boolean;
  currencyCode?: string;

  // Scale detection
  hasScale: boolean;
  scale?: string;

  // Time detection
  hasTimeScale: boolean;
  timeScale?: string;

  // Domain indicators
  isPhysicalUnit: boolean;
  isPercentage: boolean;
  isIndex: boolean;
  isRatio: boolean;
  isCrypto: boolean;

  // Monetary classification
  isMonetary: boolean;
  monetaryType?: "stock" | "flow";
}

export type MonetaryKind = "monetaryStock" | "monetaryFlow";

export interface V2Buckets {
  monetaryStock: ParsedData[];
  monetaryFlow: ParsedData[]; // includes wages
  counts: ParsedData[];
  percentages: ParsedData[];
  indices: ParsedData[];
  ratios: ParsedData[];
  energy: ParsedData[];
  commodities: ParsedData[];
  agriculture: ParsedData[];
  metals: ParsedData[];
  crypto: ParsedData[];
}

export interface V2ClassifyInput {
  config: Record<string, unknown>;
  parsedData: ParsedData[];
}

export interface V2ClassifyOutput {
  exempted: ParsedData[];
  nonExempted: ParsedData[];
  buckets: V2Buckets;
}

export interface TimeBasisOutput {
  preferredTimeScale?: TimeScale;
}

export interface TargetsOutput {
  selected: {
    currency?: string;
    magnitude?: Scale;
    time?: TimeScale;
  };
}

export interface MonetaryBatchOptions {
  toCurrency?: string;
  toMagnitude?: Scale;
  toTimeScale?: TimeScale;
  fx?: FXTable;
  explain?: boolean;
  fxSource?: string;
  fxSourceId?: string;
}

// ============================================================================
// Domain Classification Types
// ============================================================================

/**
 * Domain bucket identifier
 */
export type DomainBucket =
  | "monetaryStock"
  | "monetaryFlow"
  | "counts"
  | "percentages"
  | "indices"
  | "ratios"
  | "energy"
  | "commodities"
  | "agriculture"
  | "metals"
  | "crypto";

/**
 * Domain processing results
 */
export interface DomainResults {
  [bucket: string]: ProcessdData[];
}

// ============================================================================
// Normalization Types
// ============================================================================

/**
 * Normalization targets for monetary domains
 */
export interface NormalizationTargets {
  currency?: string;
  scale?: string;
  timeScale?: string;

  // Auto-target metadata
  autoTargetUsed: boolean;
  dominanceRatio?: number;
  fallbackReason?: string;
}

/**
 * Time basis inference result
 */
export interface TimeBasisResult {
  inferredTimeScale?: string;
  majorityTimeScale?: string;
  dominanceRatio?: number;
  usedTieBreaker: boolean;
  tieBreaker?: string;
}

/**
 * Auto-target selection result
 */
export interface AutoTargetResult {
  currency?: string;
  scale?: string;
  timeScale?: string;

  // Selection metadata
  currencyDominance?: number;
  scaleDominance?: number;
  timeDominance?: number;

  // Fallback information
  usedFallback: boolean;
  fallbackReason?: string;
}

// ============================================================================
// Explain Metadata Types (V2)
// ============================================================================

/**
 * V2 Explain metadata with flat structure
 */
export interface ExplainV2Metadata {
  explainVersion: "v2";
  explain_version?: string; // Backwards compatibility field

  // Normalization targets
  currency?: {
    original: string;
    normalized: string;
    conversionRate?: number;
  };

  scale?: {
    original: string;
    normalized: string;
    conversionFactor?: number;
  };

  periodicity?: {
    original: string;
    normalized: string;
    conversionDirection?: "up" | "down" | "none";
  };

  // FX information
  fx?: {
    source: string;
    sourceId?: string;
    asOf: string;
    rate?: number;
  };

  // Auto-target information
  autoTarget?: {
    enabled: boolean;
    currency?: {
      selected: string;
      dominance: number;
      threshold: number;
    };
    scale?: {
      selected: string;
      dominance: number;
      threshold: number;
    };
    time?: {
      selected: string;
      dominance: number;
      threshold: number;
    };
  };

  // Processing provenance
  router?: {
    totalBuckets: number;
    processedBuckets: string[];
    skippedBuckets: string[];
  };

  // Domain-specific metadata
  domain?: {
    bucket: DomainBucket;
    processingType: string;
    conversionSummary?: string;
  };
}

/**
 * Item-level explain metadata
 */
export interface ItemExplain {
  originalUnit: string;
  normalizedUnit: string;
  conversionApplied: boolean;
  conversionSummary?: string;
  qualityFactors?: string[];
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Processing error with context
 */
export interface ProcessingError {
  code: string;
  message: string;
  context?: Record<string, unknown>;
  itemId?: string;
  stage?: string;
}

// ============================================================================
// Machine Event Types
// ============================================================================

/**
 * Common events across V2 machines
 */
export type PipelineV2Events =
  | { type: "START"; input: ParsedData[]; config: PipelineConfig }
  | { type: "ITEMS_PARSED"; items: ParsedData[] }
  | { type: "CLASSIFICATION_DONE"; buckets: V2Buckets; exempted: ParsedData[] }
  | {
    type: "FX_READY";
    fxRates: FXTable;
    fxSource: string;
    fxSourceId?: string;
  }
  | { type: "DOMAIN_PROCESSED"; bucket: DomainBucket; results: ProcessdData[] }
  | { type: "ALL_DOMAINS_DONE"; results: DomainResults }
  | { type: "EXPLAIN_MERGED"; explain: ExplainV2Metadata }
  | { type: "ERROR"; error: ProcessingError }
  | { type: "COMPLETE"; output: ParsedData[] };

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Guard function type
 */
export type GuardFunction<
  TContext = PipelineV2Context,
  TEvent = PipelineV2Events,
> = (args: { context: TContext; event: TEvent }) => boolean;

/**
 * Action function type
 */
export type ActionFunction<
  TContext = PipelineV2Context,
  TEvent = PipelineV2Events,
> = (args: { context: TContext; event: TEvent }) => Partial<TContext>;

/**
 * Pure transformation function type
 */
export type TransformFunction<TInput, TOutput> = (input: TInput) => TOutput;
