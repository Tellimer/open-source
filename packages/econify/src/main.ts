/**
 * Econ Normalizer — Deno/TypeScript utility for classifying indicators (stock/flow/rate/currency)
 * and normalizing monetary values via exchange rates.
 *
 * Usage (Deno):
 *   import {
 *     classifyIndicator,
 *     isStock, isFlow, isRate, isCurrency,
 *     normalizeCurrencyValue,
 *     normalizeMonetary,
 *     normalizeMonetaryFlow,
 *   } from "./deno-econ-normalizer.ts";
 *
 *   const t = classifyIndicator({ name: "Government debt (EUR)", unit: "EUR bn" });
 *   // => "stock"
 *
 *   const normalized = normalizeCurrencyValue(125_000_000, "EUR", "USD", { base: "EUR", rates: { USD: 1.1 } });
 *   // => 137_500_000
 */

// Re-export all types
export type {
  Classification,
  FXTable,
  IndicatorInput,
  IndicatorType,
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

// Re-export classification functions
export {
  classifyIndicator,
  isCurrency,
  isFlow,
  isRate,
  isStock,
} from "./classification/classification.ts";

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
  normalizeValue
} from "./normalization/normalization.ts";

// Re-export units functions
export {
  CURRENCY_CODES,
  COUNT_PATTERNS,
  ENERGY_PATTERNS,
  INDEX_PATTERNS,
  MAGNITUDE_PATTERNS,
  PERCENTAGE_PATTERNS,
  PHYSICAL_PATTERNS,
  extractCurrency,
  extractScale,
  extractTimeScale,
  isMonetaryUnit,
  isPercentageUnit,
  parseUnit,
  type ParsedUnit,
  type UnitCategory,
  type UnitPattern,
} from "./units/units.ts";

// Re-export live FX
export {
  fetchLiveFXRates,
  getAvailableCurrencies,
  clearExpiredCache,
  type FXSource,
  type LiveFXOptions,
  type FXRateResponse,
} from "./fx/live_fx.ts";

// Re-export historical data
export {
  normalizeHistorical,
  getHistoricalFXRates,
  normalizeTimeSeries,
  calculateChanges,
  resampleTimeSeries,
  type HistoricalDataPoint,
  type HistoricalOptions,
} from "./historical/historical.ts";

// Re-export inflation adjustment
export {
  adjustForInflation,
  getInflationRate,
  nominalToReal,
  realToNominal,
  realGrowthRate,
  adjustTimeSeriesForInflation,
  adjustForPPP,
  getAvailableCountries,
  getAvailableYears,
  type InflationOptions,
} from "./inflation/inflation.ts";

// Re-export unit inference
export {
  inferUnit,
  validateInferredUnit,
  type InferenceContext,
  type CompanyContext,
  type InferredUnit,
} from "./inference/inference.ts";

// Re-export data quality
export {
  assessDataQuality,
  type DataPoint,
  type QualityScore,
  type QualityIssue,
  type QualityOptions,
  type DataSchema,
  type QualityRule,
} from "./quality/quality.ts";

// Re-export batch processing
export {
  processBatch,
  createBatchProcessor,
  streamProcess,
  type BatchItem,
  type BatchOptions,
  type BatchResult,
  type BatchStats,
} from "./batch/batch.ts";

// Re-export custom units
export {
  registerCustomUnit,
  registerCustomUnits,
  getCustomUnit,
  parseWithCustomUnits,
  convertCustomUnit,
  loadDomainUnits,
  DOMAIN_UNITS,
  type CustomUnit,
} from "./custom/custom_units.ts";

// Re-export aggregations
export {
  aggregate,
  movingAverage,
  type AggregationOptions,
  type AggregationResult,
} from "./aggregations/aggregations.ts";

// Re-export caching
export {
  withCache,
  type CacheOptions,
} from "./cache/cache.ts";

// Re-export unit algebra
export {
  unitMultiply,
  unitDivide,
  unitAdd,
  unitSubtract,
  unitPower,
  chain,
  UnitChain,
  type UnitValue,
} from "./algebra/algebra.ts";

// Re-export IO utilities
export {
  exportTo,
  importFrom,
  type ExportOptions,
  type ImportOptions,
  type ExportFormat,
  type ImportFormat,
} from "./io/io.ts";

// Re-export seasonal adjustment
export {
  deseasonalize,
  detectSeasonality,
  type SeasonalOptions,
} from "./seasonal/seasonal.ts";

// Re-export workflows for data pipeline processing
export {
  processEconomicData,
  processEconomicDataAuto,
  validateEconomicData,
  type PipelineOptions,
  type PipelineResult,
  type PipelineConfig,
  type ParsedData,
  type PipelineError,
} from './workflows/index.ts';
