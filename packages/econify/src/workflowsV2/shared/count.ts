/**
 * Count utilities for V2 (copied from ../../../count/count-normalization.ts)
 *
 * This file contains count detection functions needed by V2 workflows.
 * All dependencies have been localized to make V2 independent.
 */

// Re-export the main functions that V2 needs
export {
  isCountIndicator,
  isCountUnit,
} from "../../count/count-normalization.ts";
