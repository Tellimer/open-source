/**
 * @tellimer/classify - LLM-based economic indicator classification
 *
 * This package provides LLM-powered classification and metadata enrichment
 * for economic indicators. It supports multiple LLM providers including
 * OpenAI, Anthropic, and Google Gemini.
 *
 * @example
 * ```ts
 * import { classifyIndicators } from "@tellimer/classify";
 *
 * const indicators = [
 *   {
 *     name: "GDP",
 *     units: "USD",
 *     currency_code: "USD",
 *     periodicity: "quarterly",
 *     source: "World Bank",
 *     sample_values: [21000000000000, 21500000000000, 22000000000000]
 *   }
 * ];
 *
 * const config = {
 *   provider: "openai",
 *   apiKey: "your-api-key",
 *   model: "gpt-4o"
 * };
 *
 * const enriched = await classifyIndicators(indicators, config);
 * console.log(enriched[0].indicator_type); // "flow"
 * console.log(enriched[0].is_monetary); // true
 * ```
 *
 * @module
 */

export * from "./src/classify.ts";
export * from "./src/types.ts";
export * from "./src/providers/index.ts";

// Cost tracking utilities
export {
  calculateCost,
  estimateTokens,
  extractTokenUsage,
  formatCost,
  formatTokens,
} from "./src/utils/token_counter.ts";

export {
  type CostSummary,
  getCostSummary,
  printCostProjections,
  printCostSummary,
  projectCost,
} from "./src/utils/cost_summary.ts";

// ═══════════════════════════════════════════════════════════════════════════
// V2 Pipeline Exports
// ═══════════════════════════════════════════════════════════════════════════

// Main V2 pipeline
export { classifyIndicatorsV2 } from "./src/v2/pipeline.ts";

// V2 types
export type {
  DatabaseConfig,
  FlaggedIndicator,
  IndicatorFamily,
  OrientationResult,
  PipelineVersion,
  ReviewAction,
  ReviewDecision,
  RouterResult,
  SpecialistResult,
  V2Classification,
  V2Config,
  V2PipelineResult,
  V2PipelineStage,
} from "./src/v2/types.ts";

// Database clients
export {
  createLocalDatabase,
  createRemoteDatabase,
  V2DatabaseClient,
} from "./src/v2/db/client.ts";

// Individual stage functions (for advanced usage)
export { routeIndicators } from "./src/v2/router/router.ts";
export { classifyByFamily } from "./src/v2/specialist/specialist.ts";
export { classifyOrientations } from "./src/v2/orientation/orientation.ts";
export { applyFlaggingRules } from "./src/v2/review/flagging.ts";
export { reviewFlaggedIndicators } from "./src/v2/review/review.ts";

// Storage utilities
export {
  getClassificationStats,
  readClassifications,
} from "./src/v2/output/storage.ts";
export { getEscalatedIndicators } from "./src/v2/review/storage.ts";

// Telemetry and logging
export {
  createTelemetryCollector,
  TelemetryCollector,
} from "./src/v2/telemetry/collector.ts";
export { createLogger, logger, V2Logger } from "./src/v2/telemetry/logger.ts";
export type {
  ErrorTelemetryEvent,
  PipelineTelemetry,
  StageTelemetryEvent,
} from "./src/v2/telemetry/collector.ts";
export type {
  LogEntry,
  LoggerConfig,
  LogLevel,
} from "./src/v2/telemetry/logger.ts";
