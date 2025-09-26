/**
 * Batch processing utilities for V2 (copied from ../../../batch/batch.ts)
 *
 * This file contains batch processing functions needed by V2 workflows.
 * All dependencies have been localized to make V2 independent.
 */

import { normalizeValue } from "../../normalization/normalization.ts";
import { buildExplainMetadata } from "../../normalization/explain.ts";
import { parseUnit } from "../../units/units.ts";
import {
  isCountIndicator,
  isCountUnit,
} from "../../count/count-normalization.ts";
import { isStock } from "../../classification/classification.ts";
import { assessDataQuality, type QualityScore } from "../../quality/quality.ts";
import { getScale } from "../../scale/scale.ts";
import type { Explain } from "../../types.ts";
import type { FXTable, Scale, TimeScale } from "./types.ts";

// Re-export the main processBatch function that V2 needs
export { processBatch } from "../../batch/batch.ts";

// Re-export types that V2 might need
export type {
  BatchItem,
  BatchOptions,
  BatchResult,
  BatchStats,
} from "../../batch/batch.ts";
