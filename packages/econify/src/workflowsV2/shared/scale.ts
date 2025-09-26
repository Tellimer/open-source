/**
 * Scale utilities for V2 (copied from ../../../scale/scale.ts)
 *
 * This file contains scale parsing functions needed by V2 workflows.
 * All dependencies have been localized to make V2 independent.
 */

import type { TimeScale } from "./types.ts";

// Re-export the main functions that V2 needs
export { getScale, parseTimeScale } from "../../scale/scale.ts";

// Re-export types that V2 might need
// ScaleOrder type removed - not exported from scale.ts
