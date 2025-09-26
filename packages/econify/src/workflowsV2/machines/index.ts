/**
 * V2 Pipeline Machines
 *
 * Organized collection of all V2 state machines for the complete pipeline.
 * Provides clean imports and better organization than the flat structure.
 */

// Stage machines (validation, parsing, quality)
export * from "./stages/index.ts";

// FX machines
export * from "./fx/index.ts";
