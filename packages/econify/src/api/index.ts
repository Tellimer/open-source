/**
 * Public API for Econify
 *
 * This module provides the main public API functions for economic data processing.
 * These functions abstract away the complexity of XState workflows and provide
 * a simple, clean interface for users.
 */

// Export the main API functions
export {
  processEconomicData,
  processEconomicDataAuto,
  validateEconomicData,
} from "./pipeline_api.ts";

// Export API types
export type { PipelineOptions, PipelineResult } from "./pipeline_api.ts";

// Export batch processing API
export {
  EconifyBatchSession,
  processEconomicDataByIndicator,
} from "./batch_session_api.ts";

// Export QA helper: auto target detection (dry-run)
export { computeAutoTargets } from "../normalization/auto_targets.ts";
export type {
  AutoTargetOptions,
  AutoTargets,
} from "../normalization/auto_targets.ts";

// Export monetary detection utilities
export {
  isMonetaryIndicator,
  isMonetaryUnit,
} from "../utils/monetary_detection.ts";
