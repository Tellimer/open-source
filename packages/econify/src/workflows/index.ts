/**
 * Clean workflow API for external consumption
 * No XState knowledge or dependencies required
 */

// Export the clean API functions
export { 
  processEconomicData,
  processEconomicDataAuto,
  validateEconomicData,
} from './pipeline_api.ts';

// Export types
export type {
  PipelineOptions,
  PipelineResult,
} from './pipeline_api.ts';

// Types from pipeline_v5
export type {
  PipelineConfig,
  ParsedData,
  PipelineError,
} from './pipeline_v5.ts';

// Note: Simple pipeline alternative available if needed
// Can be implemented without XState dependencies