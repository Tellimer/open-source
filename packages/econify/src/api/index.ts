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
