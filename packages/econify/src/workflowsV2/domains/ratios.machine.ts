/**
 * Ratios domain machine for V2 workflows
 *
 * Passes through ratio values with validation
 */

import { assign, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../shared/types.ts";
import { processRatiosBatch } from "../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface RatiosInput {
  config: Record<string, unknown>;
  items: ParsedData[];
}

interface RatiosOutput {
  items: ParsedData[];
}

interface RatiosContext extends RatiosInput {
  results: ParsedData[];
}

// ============================================================================
// Machine Definition
// ============================================================================

export const ratiosMachine = setup({
  types: {
    context: {} as RatiosContext,
    input: {} as RatiosInput,
  },
}).createMachine({
  id: "ratios",
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
            const processed = processRatiosBatch(context.items);
            console.log("[V2 ratios] processed", processed.length, "items");
            return processed;
          } catch (error) {
            console.error("[Ratios] Processing error:", error);
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
                  "Ratios processing failed, using original value",
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
  output: ({ context }) => ({ items: context.results } as RatiosOutput),
});
