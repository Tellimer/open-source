/**
 * Indices domain machine for V2 workflows
 *
 * Passes through index values with metadata
 */

import { assign, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../shared/types.ts";
import { processIndicesBatch } from "../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface IndicesInput {
  config: Record<string, unknown>;
  items: ParsedData[];
}

interface IndicesOutput {
  items: ParsedData[];
}

interface IndicesContext extends IndicesInput {
  results: ParsedData[];
}

// ============================================================================
// Machine Definition
// ============================================================================

export const indicesMachine = setup({
  types: {
    context: {} as IndicesContext,
    input: {} as IndicesInput,
  },
}).createMachine({
  id: "indices",
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
            const processed = processIndicesBatch(context.items);
            console.log("[V2 indices] processed", processed.length, "items");
            return processed;
          } catch (error) {
            console.error("[Indices] Processing error:", error);
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
                  "Indices processing failed, using original value",
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
  output: ({ context }) => ({ items: context.results } as IndicesOutput),
});
