/**
 * Explain utilities for V2 (copied from ../../../normalization/explain.ts)
 *
 * This file contains explain enhancement functions needed by V2 workflows.
 * All dependencies have been localized to make V2 independent.
 */

// Re-export the main functions that V2 needs
export {
  buildExplainMetadata,
  enhanceExplainWithFXSource,
} from "../../normalization/explain.ts";

// Re-export types that V2 might need
export type { Explain } from "../../types.ts";
