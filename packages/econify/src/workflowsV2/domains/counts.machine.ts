/**
 * Counts domain machine for V2 workflows
 *
 * Normalizes count-based indicators to "ones" unit
 */

import { assign, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../shared/types.ts";
import { processCountsBatch } from "../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface CountsInput {
  config: Record<string, unknown>;
  items: ParsedData[];
}

interface CountsOutput {
  items: ParsedData[];
}

interface CountsContext extends CountsInput {
  results: ParsedData[];
}

// ============================================================================
// Machine Definition
// ============================================================================

export const countsMachine = setup({
  types: {
    context: {} as CountsContext,
    input: {} as CountsInput,
  },
}).createMachine({
  id: "counts",
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
            const processed = processCountsBatch(context.items);
            console.log("[V2 counts] processed", processed.length, "items");
            return processed;
          } catch (error) {
            console.error("[Counts] Processing error:", error);
            return context.items.map((item) => ({
              ...item,
              normalizedValue: item.value,
              normalizedUnit: "ones",
              qualityScore: 0.7,
              explain: {
                originalUnit: item.unit,
                normalizedUnit: "ones",
                conversionApplied: false,
                conversionSummary:
                  "Count processing failed, using original value",
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
  output: ({ context }) => ({ items: context.results } as CountsOutput),
});
