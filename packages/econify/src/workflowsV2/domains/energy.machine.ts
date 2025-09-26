/**
 * Energy domain machine for V2 workflows
 *
 * Passes through energy units without normalization
 */

import { assign, setup } from "npm:xstate@^5.20.2";
import type { FXTable, ParsedData } from "../shared/types.ts";
import { processEnergyBatch } from "../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface EnergyInput {
  config: Record<string, unknown>;
  items: ParsedData[];
  fx?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
}

interface EnergyOutput {
  items: ParsedData[];
}

interface EnergyContext extends EnergyInput {
  results: ParsedData[];
}

// ============================================================================
// Machine Definition
// ============================================================================

export const energyMachine = setup({
  types: {
    context: {} as EnergyContext,
    input: {} as EnergyInput,
  },
}).createMachine({
  id: "energy",
  context: ({ input }) => ({
    ...input,
    results: [],
  }),
  initial: "processing",
  states: {
    processing: {
      entry: assign({
        results: ({ context }) => {
          try {
            const processed = processEnergyBatch(context.items);
            console.log("[V2 energy] processed", processed.length, "items");
            return processed;
          } catch (error) {
            console.error("[Energy] Processing error:", error);
            return context.items.map((item) => ({
              ...item,
              normalizedValue: item.value,
              normalizedUnit: item.unit,
              qualityScore: 1.0,
              explain: {
                originalUnit: item.unit,
                normalizedUnit: item.unit,
                conversionApplied: false,
                conversionSummary:
                  "Energy processing failed, using original value",
              },
            }));
          }
        },
      }),
      always: { target: "done" },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => ({ items: context.results } as EnergyOutput),
});
