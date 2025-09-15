/**
 * XState Workflows
 *
 * This module contains XState state machine workflows for complex data processing.
 * For simple API access, use the functions from src/api/ instead.
 */

// Export XState workflows
export { pipelineMachine, createPipeline } from "./economic-data-workflow.ts";

// Export workflow types
export type {
  ParsedData,
  PipelineConfig,
  PipelineContext,
  PipelineError,
} from "./economic-data-workflow.ts";

// Note: Simple pipeline alternative available if needed
// Can be implemented without XState dependencies
