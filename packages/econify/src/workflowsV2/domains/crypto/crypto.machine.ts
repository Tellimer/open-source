/**
 * Crypto domain machine for V2 workflows
 *
 * Passes through cryptocurrency units with optional FX conversion
 */

import { assign, setup } from "npm:xstate@^5.20.2";
import type { FXTable, ParsedData } from "../../shared/types.ts";
import { processCryptoBatch } from "../../normalize/batch.ts";

// ============================================================================
// Types
// ============================================================================

interface CryptoInput {
  config: Record<string, unknown>;
  items: ParsedData[];
  fx?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
}

interface CryptoOutput {
  items: ParsedData[];
}

interface CryptoContext extends CryptoInput {
  results: ParsedData[];
}

// ============================================================================
// Machine Definition
// ============================================================================

export const cryptoMachine = setup({
  types: {
    context: {} as CryptoContext,
    input: {} as CryptoInput,
  },
}).createMachine({
  id: "crypto",
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
            const processed = processCryptoBatch(context.items);
            console.log("[V2 crypto] processed", processed.length, "items");
            return processed;
          } catch (error) {
            console.error("[Crypto] Processing error:", error);
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
                  "Crypto processing failed, using original value",
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
  output: ({ context }) => ({ items: context.results } as CryptoOutput),
});
