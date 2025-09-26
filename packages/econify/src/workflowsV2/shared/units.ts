/**
 * Units utilities for V2 (copied from ../../../units/units.ts)
 *
 * This file contains unit parsing functions needed by V2 workflows.
 * All dependencies have been localized to make V2 independent.
 */

import type { Scale, TimeScale } from "./types.ts";

// Re-export the main functions that V2 needs
export {
  extractCurrency,
  extractScale,
  extractTimeScale,
  parseUnit,
} from "../../units/units.ts";

// Re-export types that V2 might need
export type {
  ParsedUnit,
  UnitCategory,
  UnitPattern,
} from "../../units/units.ts";
