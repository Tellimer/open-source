/**
 * Agriculture domain machine for V2 workflows
 *
 * Passes through agriculture units with optional FX conversion
 */

import { assign, setup } from "npm:xstate@^5.20.2";
import type { FXTable, ParsedData } from "../shared/types.ts";
import { processAgricultureBatch } from "../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface AgricultureInput {
  config: Record<string, unknown>;
  items: ParsedData[];
  fx?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
}

interface AgricultureOutput {
  items: ParsedData[];
}

interface AgricultureContext extends AgricultureInput {
  results: ParsedData[];
}

// ============================================================================
// Machine Definition
// ============================================================================

export const agricultureMachine = setup({
  types: {
    context: {} as AgricultureContext,
    input: {} as AgricultureInput,
  },
}).createMachine({
  id: "agriculture",
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
            const processed = processAgricultureBatch(context.items);
            console.log(
              "[V2 agriculture] processed",
              processed.length,
              "items",
            );
            return processed;
          } catch (error) {
            console.error("[Agriculture] Processing error:", error);
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
                  "Agriculture processing failed, using original value",
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
  output: ({ context }) => ({ items: context.results } as AgricultureOutput),
});
