/**
 * FX utilities for V2 (copied from ../../../fx/index.ts)
 *
 * This file contains FX rate functions needed by V2 workflows.
 * All dependencies have been localized to make V2 independent.
 */

import type { FXTable } from "./types.ts";

// Re-export the main functions that V2 needs
export { fetchLiveFXRates } from "../../fx/index.ts";
