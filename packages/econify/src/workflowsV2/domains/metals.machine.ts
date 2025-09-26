/**
 * Metals domain machine for V2 workflows
 *
 * Passes through metals units with optional FX conversion
 */

import { assign, setup } from "npm:xstate@^5.20.2";
import type { FXTable, ParsedData } from "../shared/types.ts";
import { processMetalsBatch } from "../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface MetalsInput {
  config: Record<string, unknown>;
  items: ParsedData[];
  fx?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
}

interface MetalsOutput {
  items: ParsedData[];
}

interface MetalsContext extends MetalsInput {
  results: ParsedData[];
}

// ============================================================================
// Machine Definition
// ============================================================================

export const metalsMachine = setup({
  types: {
    context: {} as MetalsContext,
    input: {} as MetalsInput,
  },
}).createMachine({
  id: "metals",
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
            const processed = processMetalsBatch(context.items);
            console.log("[V2 metals] processed", processed.length, "items");
            return processed;
          } catch (error) {
            console.error("[Metals] Processing error:", error);
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
                  "Metals processing failed, using original value",
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
  output: ({ context }) => ({ items: context.results } as MetalsOutput),
});
