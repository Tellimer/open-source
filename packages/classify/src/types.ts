/**
 * Type definitions for the classify package
 * @module
 */

/**
 * Supported LLM providers
 */
export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

/**
 * Economic indicator types - Comprehensive taxonomy
 *
 * Physical/Fundamental:
 * - stock: Absolute levels (debt, reserves, wealth)
 * - flow: Throughput over time (GDP, income, spending)
 * - balance: Net positions that can be negative (trade balance, budget deficit)
 * - capacity: Maximum potential (potential GDP, production capacity)
 * - volume: Transaction quantities (contract volumes, trade volumes)
 *
 * Numeric/Measurement:
 * - count: Discrete units (jobs, housing starts, claims)
 * - percentage: 0-100% bounded values (unemployment rate, capacity utilization)
 * - ratio: Relative multiples (debt-to-GDP, price-to-earnings)
 * - spread: Absolute differences (yield curve spread, bid-ask spread)
 * - share: Compositional breakdown (labor share, consumption % of GDP)
 *
 * Price/Value:
 * - price: Market-clearing levels (interest rates, FX rates, commodity prices)
 * - yield: Returns/efficiency (bond yields, productivity, ROI)
 *
 * Change/Movement:
 * - rate: Directional change (inflation rate, growth rate)
 * - volatility: Statistical dispersion (VIX, price volatility)
 * - gap: Deviation from potential/trend (output gap, unemployment gap)
 *
 * Composite/Derived:
 * - index: Composite indicators (CPI, PMI, confidence indices)
 * - correlation: Relationship strength (Phillips curve coefficient)
 * - elasticity: Responsiveness measures (price elasticity of demand)
 * - multiplier: Causal transmission coefficients (fiscal multiplier, money multiplier)
 *
 * Temporal:
 * - duration: Time-based measures (unemployment duration, bond duration)
 * - probability: Statistical likelihood (recession probability, default probability)
 * - threshold: Critical levels/targets (inflation target, debt ceiling)
 *
 * Qualitative:
 * - sentiment: Categorical/ordinal (consumer confidence, business sentiment)
 * - allocation: Portfolio/resource composition (asset allocation, budget allocation)
 *
 * - other: If none of the above apply
 */
export type IndicatorType =
  // Physical/Fundamental
  | 'stock'
  | 'flow'
  | 'balance'
  | 'capacity'
  | 'volume'
  // Numeric/Measurement
  | 'count'
  | 'percentage'
  | 'ratio'
  | 'spread'
  | 'share'
  // Price/Value
  | 'price'
  | 'yield'
  // Change/Movement
  | 'rate'
  | 'volatility'
  | 'gap'
  // Composite/Derived
  | 'index'
  | 'correlation'
  | 'elasticity'
  | 'multiplier'
  // Temporal
  | 'duration'
  | 'probability'
  | 'threshold'
  // Qualitative
  | 'sentiment'
  | 'allocation'
  // Fallback
  | 'other';

/**
 * All valid indicator types as a constant array for validation
 */
export const VALID_INDICATOR_TYPES: readonly IndicatorType[] = [
  // Physical/Fundamental
  'stock',
  'flow',
  'balance',
  'capacity',
  'volume',
  // Numeric/Measurement
  'count',
  'percentage',
  'ratio',
  'spread',
  'share',
  // Price/Value
  'price',
  'yield',
  // Change/Movement
  'rate',
  'volatility',
  'gap',
  // Composite/Derived
  'index',
  'correlation',
  'elasticity',
  'multiplier',
  // Temporal
  'duration',
  'probability',
  'threshold',
  // Qualitative
  'sentiment',
  'allocation',
  // Fallback
  'other',
] as const;

/**
 * Mapping from indicator type to its category
 */
export const INDICATOR_TYPE_TO_CATEGORY: Record<
  IndicatorType,
  IndicatorCategory
> = {
  // Physical/Fundamental
  stock: 'physical-fundamental',
  flow: 'physical-fundamental',
  balance: 'physical-fundamental',
  capacity: 'physical-fundamental',
  volume: 'physical-fundamental',
  // Numeric/Measurement
  count: 'numeric-measurement',
  percentage: 'numeric-measurement',
  ratio: 'numeric-measurement',
  spread: 'numeric-measurement',
  share: 'numeric-measurement',
  // Price/Value
  price: 'price-value',
  yield: 'price-value',
  // Change/Movement
  rate: 'change-movement',
  volatility: 'change-movement',
  gap: 'change-movement',
  // Composite/Derived
  index: 'composite-derived',
  correlation: 'composite-derived',
  elasticity: 'composite-derived',
  multiplier: 'composite-derived',
  // Temporal
  duration: 'temporal',
  probability: 'temporal',
  threshold: 'temporal',
  // Qualitative
  sentiment: 'qualitative',
  allocation: 'qualitative',
  // Fallback
  other: 'other',
};

/**
 * Indicator category - high-level grouping
 */
export type IndicatorCategory =
  | 'physical-fundamental'
  | 'numeric-measurement'
  | 'price-value'
  | 'change-movement'
  | 'composite-derived'
  | 'temporal'
  | 'qualitative'
  | 'other';

/**
 * All valid indicator categories as a constant array for validation
 */
export const VALID_INDICATOR_CATEGORIES: readonly IndicatorCategory[] = [
  'physical-fundamental',
  'numeric-measurement',
  'price-value',
  'change-movement',
  'composite-derived',
  'temporal',
  'qualitative',
  'other',
] as const;

/**
 * Temporal aggregation type - how values accumulate over time
 */
export type TemporalAggregation =
  | 'point-in-time' // Snapshot at a moment (stock level, current price)
  | 'period-rate' // Rate/flow during period (GDP per quarter, production per day)
  | 'period-cumulative' // Running total over period (YTD production, cumulative sales)
  | 'period-average' // Average over period (average temperature, average price)
  | 'period-total' // Sum over period (total transactions, total volume)
  | 'not-applicable'; // Doesn't have temporal dimension (ratios, percentages)

/**
 * All valid temporal aggregations as a constant array for validation
 */
export const VALID_TEMPORAL_AGGREGATIONS: readonly TemporalAggregation[] = [
  'point-in-time',
  'period-rate',
  'period-cumulative',
  'period-average',
  'period-total',
  'not-applicable',
] as const;

/**
 * Heat map orientation indicating whether higher or lower values are positive
 */
export type HeatMapOrientation =
  | 'higher-is-positive' // Higher values are better (e.g., GDP, employment)
  | 'lower-is-positive' // Lower values are better (e.g., unemployment, inflation)
  | 'neutral'; // Neither direction is inherently positive (e.g., exchange rates)

/**
 * All valid heat map orientations as a constant array for validation
 */
export const VALID_HEAT_MAP_ORIENTATIONS: readonly HeatMapOrientation[] = [
  'higher-is-positive',
  'lower-is-positive',
  'neutral',
] as const;

/**
 * Temporal data point with date and value
 */
export interface TemporalDataPoint {
  /** Date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Numeric value at this date */
  value: number;
}

/**
 * Input indicator object with existing metadata
 */
export interface Indicator {
  /** Unique identifier for the indicator (optional, will be auto-generated if not provided) */
  id?: string;
  /** Indicator name */
  name: string;
  /** Units of measurement */
  units?: string;
  /** Currency code (e.g., USD, EUR) */
  currency_code?: string;
  /** Frequency of data collection (e.g., monthly, quarterly, annual) */
  periodicity?: string;
  /** Data source information */
  source?: string;
  /** Description of the indicator */
  description?: string;
  /**
   * Sample data values from the indicator
   * Can be either:
   * - Simple number array: [100, 102, 104]
   * - Temporal data points: [{date: '2021-01-01', value: 100}, {date: '2021-02-01', value: 102}]
   *
   * Temporal format enables better detection of:
   * - Period-cumulative patterns (YTD totals)
   * - Seasonal patterns
   * - Growth trends
   */
  sample_values?: number[] | TemporalDataPoint[];
  /** Any additional metadata fields */
  [key: string]: unknown;
}

/**
 * LLM-classified metadata for an indicator
 */
export interface ClassifiedMetadata {
  /** Indicator ID to match with original request */
  indicator_id: string;
  /** High-level category (physical-fundamental, numeric-measurement, etc.) */
  indicator_category: IndicatorCategory;
  /** Specific type of indicator (stock, flow, count, etc.) */
  indicator_type: IndicatorType;
  /** How values aggregate over time (point-in-time, period-cumulative, etc.) */
  temporal_aggregation: TemporalAggregation;
  /** Whether the indicator represents monetary values */
  is_monetary: boolean;
  /** Heat map orientation - whether higher or lower values are positive */
  heat_map_orientation: HeatMapOrientation;
  /** Confidence score for the classification (0-1) */
  confidence?: number;
  /** Additional reasoning or notes from the LLM */
  reasoning?: string;
  /** Any other relevant classification metadata */
  [key: string]: unknown;
}

/**
 * Enriched indicator with LLM-classified metadata
 */
export interface EnrichedIndicator extends Indicator {
  /** LLM-classified metadata */
  classification: ClassifiedMetadata;
}

/**
 * Configuration for LLM provider
 */
export interface LLMConfig {
  /** LLM provider to use */
  provider: LLMProvider;
  /** API key or credentials */
  apiKey: string;
  /** Model name (defaults to latest reasoning-capable model) */
  model?: string;
  /** Temperature for generation (0-1, lower = more deterministic) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Additional provider-specific parameters */
  [key: string]: unknown;
}

/**
 * Options for classification
 */
export interface ClassificationOptions {
  /** LLM configuration */
  llmConfig: LLMConfig;
  /** Batch size for processing multiple indicators */
  batchSize?: number;
  /** Whether to include reasoning in the response */
  includeReasoning?: boolean;
  /** Maximum number of retries on failure */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Dry run mode - estimate costs without making actual LLM calls */
  dryRun?: boolean;
  /** Suppress all console output except errors */
  quiet?: boolean;
}

/**
 * Error thrown during classification
 */
export class ClassificationError extends Error {
  public readonly provider: LLMProvider;
  public override readonly cause?: Error;

  constructor(message: string, provider: LLMProvider, cause?: Error) {
    super(message);
    this.name = 'ClassificationError';
    this.provider = provider;
    this.cause = cause;
  }
}

/**
 * Failed indicator with error details
 */
export interface FailedIndicator {
  /** Original indicator that failed */
  indicator: Indicator;
  /** Error message */
  error: string;
  /** Number of retry attempts made */
  retries: number;
}

/**
 * Token usage and cost information
 */
export interface TokenUsage {
  /** Input tokens (prompt) */
  inputTokens: number;
  /** Output tokens (completion) */
  outputTokens: number;
  /** Total tokens */
  totalTokens: number;
  /** Estimated cost in USD */
  estimatedCost: number;
  /** Provider used */
  provider: LLMProvider;
  /** Model used */
  model: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Average time per indicator in milliseconds */
  avgTimePerIndicator: number;
  /** Throughput in indicators per second */
  throughput: number;
  /** Average tokens per indicator */
  avgTokensPerIndicator: number;
  /** Average cost per indicator in USD */
  avgCostPerIndicator: number;
}

/**
 * Result of a classification operation
 */
export interface ClassificationResult {
  /** Successfully enriched indicators */
  enriched: EnrichedIndicator[];
  /** Indicators that failed to classify after all retries */
  failed: FailedIndicator[];
  /** Summary statistics */
  summary: {
    /** Total number of indicators processed */
    total: number;
    /** Number of successful classifications */
    successful: number;
    /** Number of failed classifications */
    failed: number;
    /** Success rate as percentage (0-100) */
    successRate: number;
  };
  /** Total processing time in milliseconds */
  processingTime: number;
  /** Number of API calls made */
  apiCalls: number;
  /** Number of retries performed */
  retries: number;
  /** Token usage and cost information */
  tokenUsage: TokenUsage;
  /** Performance metrics */
  performance: PerformanceMetrics;
}

/**
 * LLM provider interface
 */
export interface LLMProviderInterface {
  /** Provider name */
  readonly name: LLMProvider;

  /**
   * Classify a batch of indicators
   * @param indicators - Array of indicators to classify
   * @param config - LLM configuration
   * @returns Array of classified metadata
   */
  classify(
    indicators: Indicator[],
    config: LLMConfig
  ): Promise<ClassifiedMetadata[]>;

  /**
   * Validate the configuration
   * @param config - LLM configuration to validate
   * @throws {ClassificationError} If configuration is invalid
   */
  validateConfig(config: LLMConfig): void;
}

/**
 * Default model names for each provider
 */
export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-2.0-flash-thinking-exp-01-21',
};

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  temperature: 0.1,
  maxTokens: 2000,
  timeout: 30000,
  batchSize: 10,
  maxRetries: 3,
  retryDelay: 1000,
  includeReasoning: false,
  debug: false,
} as const;
