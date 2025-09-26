/**
 * Percentages domain machine for V2 workflows
 *
 * Validates and passes through percentage values unchanged
 */

import { assign, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../shared/types.ts";
import { processPercentagesBatch } from "../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface PercentagesInput {
  config: Record<string, unknown>;
  items: ParsedData[];
}

interface PercentagesOutput {
  items: ParsedData[];
}

interface PercentagesContext extends PercentagesInput {
  results: ParsedData[];
}

// ============================================================================
// Machine Definition
// ============================================================================

export const percentagesMachine = setup({
  types: {
    context: {} as PercentagesContext,
    input: {} as PercentagesInput,
  },
}).createMachine({
  id: "percentages",
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
            const processed = processPercentagesBatch(context.items);
            console.log(
              "[V2 percentages] processed",
              processed.length,
              "items",
            );
            return processed;
          } catch (error) {
            console.error("[Percentages] Processing error:", error);
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
                  "Percentage processing failed, using original value",
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
  output: ({ context }) => ({ items: context.results } as PercentagesOutput),
});
