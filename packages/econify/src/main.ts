/**
 * @tellimer/econify — Economic data normalization and conversion utility
 *
 * Econify focuses on normalization and conversion of economic data:
 * - Currency conversion (150+ currencies)
 * - Magnitude scaling (trillions, billions, millions, thousands)
 * - Time period standardization (yearly, quarterly, monthly, etc.)
 * - Batch processing for consistent normalization
 * - Quality assessment and validation
 *
 * For indicator classification (determining if an indicator is stock, flow, ratio, etc.),
 * see the @tellimer/classify package. Econify accepts classification results via the
 * `indicator_type` and `is_currency_denominated` fields.
 *
 * Usage:
 *   import { processEconomicData } from "@tellimer/econify";
 *
 *   const data = [
 *     { value: 100, unit: "EUR Million", name: "GDP", indicator_type: "flow" },
 *   ];
 *
 *   const result = await processEconomicData(data, {
 *     targetCurrency: "USD",
 *     targetMagnitude: "billions",
 *     fxFallback: { base: "USD", rates: { EUR: 0.92 } },
 *   });
 */

// Re-export all types
export type {
  Classification,
  Explain,
  FXTable,
  IndicatorInput,
  IndicatorType,
  NormalizationExemptions,
  Scale,
  TimeScale,
} from "./types.ts";

// Re-export patterns and constants
export {
  CURRENCY_SYMBOLS,
  CURRENCY_WORDS,
  FLOW_PATTERNS,
  ISO_CODES,
  PER_YEAR,
  RATE_PATTERNS,
  RATE_UNIT_PATTERNS,
  SCALE_MAP,
  SCALE_TOKENS,
  STOCK_PATTERNS,
  TIME_TOKENS,
  TIME_UNIT_PATTERNS,
} from "./patterns.ts";

// Classification removed - use @tellimer/classify package instead

// Re-export currency functions
export { normalizeCurrencyValue } from "./currency/currency.ts";

// Re-export scale functions
export {
  detectScale,
  fromMillions,
  getScale,
  parseTimeScale,
  rescaleFlow,
  rescaleMagnitude,
  rescaleTime,
  toMillions,
} from "./scale/scale.ts";

// Re-export normalization functions
export {
  normalizeFlowValue,
  normalizeMonetary,
  normalizeMonetaryFlow,
  normalizeValue,
} from "./normalization/normalization.ts";

// Re-export units functions
export {
  COUNT_PATTERNS,
  CURRENCY_CODES,
  ENERGY_PATTERNS,
  extractCurrency,
  extractScale,
  extractTimeScale,
  INDEX_PATTERNS,
  isMonetaryUnit,
  isPercentageUnit,
  MAGNITUDE_PATTERNS,
  type ParsedUnit,
  parseUnit,
  PERCENTAGE_PATTERNS,
  PHYSICAL_PATTERNS,
  type UnitCategory,
  type UnitPattern,
} from "./units/units.ts";

// Re-export live FX
export {
  clearExpiredCache,
  fetchLiveFXRates,
  type FXRateResponse,
  type FXSource,
  getAvailableCurrencies,
  type LiveFXOptions,
} from "./fx/live_fx.ts";

// Re-export historical data
export {
  calculateChanges,
  getHistoricalFXRates,
  type HistoricalDataPoint,
  type HistoricalOptions,
  normalizeHistorical,
  normalizeTimeSeries,
  resampleTimeSeries,
} from "./historical/historical.ts";

// Re-export inflation adjustment
export {
  adjustForInflation,
  adjustForPPP,
  adjustTimeSeriesForInflation,
  getAvailableCountries,
  getAvailableYears,
  getInflationRate,
  type InflationOptions,
  nominalToReal,
  realGrowthRate,
  realToNominal,
} from "./inflation/inflation.ts";

// Re-export unit inference
export {
  type CompanyContext,
  type InferenceContext,
  type InferredUnit,
  inferUnit,
  validateInferredUnit,
} from "./inference/inference.ts";

// Re-export data quality
export {
  assessDataQuality,
  type DataPoint,
  type DataSchema,
  type QualityIssue,
  type QualityOptions,
  type QualityRule,
  type QualityScore,
} from "./quality/quality.ts";

// Re-export batch processing
export {
  type BatchItem,
  type BatchOptions,
  type BatchResult,
  type BatchStats,
  createBatchProcessor,
  processBatch,
  streamProcess,
} from "./batch/batch.ts";

// Re-export custom units
export {
  convertCustomUnit,
  type CustomUnit,
  DOMAIN_UNITS,
  getCustomUnit,
  loadDomainUnits,
  parseWithCustomUnits,
  registerCustomUnit,
  registerCustomUnits,
} from "./custom/custom_units.ts";

// Re-export aggregations
export {
  aggregate,
  type AggregationOptions,
  type AggregationResult,
  movingAverage,
} from "./aggregations/aggregations.ts";

// Re-export caching
export { type CacheOptions, withCache } from "./cache/cache.ts";

// Re-export unit algebra
export {
  chain,
  unitAdd,
  UnitChain,
  unitDivide,
  unitMultiply,
  unitPower,
  unitSubtract,
  type UnitValue,
} from "./algebra/algebra.ts";

// Re-export IO utilities
export {
  type ExportFormat,
  type ExportOptions,
  exportTo,
  type ImportFormat,
  importFrom,
  type ImportOptions,
} from "./io/io.ts";

// Re-export seasonal adjustment
export {
  deseasonalize,
  detectSeasonality,
  type SeasonalOptions,
} from "./seasonal/seasonal.ts";

// Re-export API for data pipeline processing
export {
  // Batch processing APIs for proper indicator normalization
  EconifyBatchSession,
  type PipelineOptions,
  type PipelineResult,
  processEconomicData,
  processEconomicDataAuto,
  processEconomicDataByIndicator,
  validateEconomicData,
} from "./api/index.ts";

// Re-export workflow types for advanced users
export type {
  ParsedData,
  PipelineConfig,
  PipelineError,
  SpecialHandling,
  UnitOverride,
} from "./workflows/index.ts";

// Count normalization removed - use indicator_type from @tellimer/classify instead

// Re-export exemption utilities
export {
  createExemptionSummary,
  type ExemptionCheckData,
  filterExemptions,
  shouldExemptFromNormalization,
} from "./exemptions/exemptions.ts";

// Re-export FX validation utilities
export {
  suggestFXRateCorrection,
  validateAndCorrectFXRates,
  validateFXRates,
} from "./fx/fx-validation.ts";
