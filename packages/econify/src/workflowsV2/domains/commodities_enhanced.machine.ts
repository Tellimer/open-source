/**
 * Enhanced Commodities Machine with Conditional FX Processing
 *
 * Handles both priced commodities (USD/barrel) and quantities (barrels)
 * Applies FX only when needed based on item metadata
 */

import { assign, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../shared/types.ts";
import type { FXTable, Scale, TimeScale } from "../shared/types.ts";
import { normalizeMonetaryBatch } from "./monetary/batch.ts";

interface DomainInput {
  config: Record<string, unknown>;
  items: ParsedData[];
  fx?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
}

interface DomainOutput {
  items: ParsedData[];
}

// Helper to split items by FX requirement
function splitByFX(items: ParsedData[]) {
  const fxItems: ParsedData[] = [];
  const nonFXItems: ParsedData[] = [];

  items.forEach((item) => {
    if ((item as any).needsFX) {
      fxItems.push(item);
    } else {
      nonFXItems.push(item);
    }
  });

  return { fxItems, nonFXItems };
}

// Process items that need FX conversion (prices)
async function processFXItems(
  items: ParsedData[],
  config: any,
  fx?: FXTable,
): Promise<ParsedData[]> {
  if (!items.length || !fx) return items;

  // Use the monetary batch processor for FX conversion
  const result = await normalizeMonetaryBatch(items, {
    toCurrency: config.targetCurrency || "USD",
    toMagnitude: config.targetMagnitude || "millions",
    toTimeScale: null, // No time conversion for commodities
    fx,
    explain: config.explain,
    fxSource: "fallback",
    fxSourceId: "SNP",
  });

  return result;
}

// Process items that don't need FX (quantities)
function processNonFXItems(items: ParsedData[]): ParsedData[] {
  return items.map((item) => {
    // Apply magnitude scaling if present
    let normalized = item.value;
    let normalizedUnit = item.unit;

    const unit = item.unit?.toLowerCase() || "";

    // Check for magnitude keywords
    if (unit.includes("thousand") || unit.includes("1k")) {
      normalized = item.value * 1000;
      normalizedUnit = unit.replace(/thousand|1k/gi, "").trim();
    } else if (unit.includes("million")) {
      normalized = item.value * 1000000;
      normalizedUnit = unit.replace(/million/gi, "").trim();
    } else if (unit.includes("billion")) {
      normalized = item.value * 1000000000;
      normalizedUnit = unit.replace(/billion/gi, "").trim();
    }

    return {
      ...item,
      normalizedValue: normalized ?? item.value,
      normalizedUnit: normalizedUnit ?? item.unit,
    };
  });
}

export const commoditiesEnhancedMachine = setup({
  types: {
    context: {} as DomainInput & {
      fxItems?: ParsedData[];
      nonFXItems?: ParsedData[];
      processedFX?: ParsedData[];
      processedNonFX?: ParsedData[];
    },
    input: {} as DomainInput,
  },
}).createMachine({
  id: "commoditiesEnhanced",
  description: "Commodities processor with conditional FX (💱?)",
  context: ({ input }) => ({ ...input }),
  initial: "analyzingItems",
  states: {
    analyzingItems: {
      description: "Checking which items need FX conversion",
      entry: assign(({ context }) => {
        const { fxItems, nonFXItems } = splitByFX(context.items || []);
        console.log(
          `[Commodities] Analyzing: ${fxItems.length} need FX, ${nonFXItems.length} don't need FX`,
        );
        return { fxItems, nonFXItems };
      }),
      always: [
        {
          guard: ({ context }) => (context.fxItems?.length || 0) > 0,
          target: "parallelProcessing",
          description: "Has items needing FX (prices)",
        },
        {
          target: "quantityProcessing",
          description: "Only quantities (no FX needed)",
        },
      ],
    },

    parallelProcessing: {
      description: "💱 Processing prices and quantities in parallel",
      type: "parallel",
      states: {
        fxProcessing: {
          description: "Converting currency prices",
          initial: "converting",
          states: {
            converting: {
              invoke: {
                src: async ({ context }) => {
                  console.log(
                    `[Commodities] Converting ${context.fxItems?.length} priced items`,
                  );
                  return processFXItems(
                    context.fxItems || [],
                    context.config,
                    context.fx,
                  );
                },
                onDone: {
                  target: "done",
                  actions: assign({
                    processedFX: ({ event }) => event.output,
                  }),
                },
              },
            },
            done: { type: "final" },
          },
        },

        quantityProcessing: {
          description: "Processing pure quantities",
          initial: "processing",
          states: {
            processing: {
              entry: assign({
                processedNonFX: ({ context }) => {
                  console.log(
                    `[Commodities] Processing ${context.nonFXItems?.length} quantity items`,
                  );
                  return processNonFXItems(context.nonFXItems || []);
                },
              }),
              always: { target: "done" },
            },
            done: { type: "final" },
          },
        },
      },

      onDone: {
        target: "merging",
      },
    },

    quantityProcessing: {
      description: "🔢 Processing quantities without FX",
      entry: assign({
        processedNonFX: ({ context }) => {
          console.log(
            `[Commodities] Processing all ${context.items?.length} items as quantities`,
          );
          return processNonFXItems(context.items || []);
        },
      }),
      always: { target: "done" },
    },

    merging: {
      description: "Merging FX and non-FX results",
      entry: assign({
        items: ({ context }) => {
          const merged = [
            ...(context.processedFX || []),
            ...(context.processedNonFX || []),
          ];
          console.log(`[Commodities] Merged ${merged.length} total items`);
          return merged;
        },
      }),
      always: { target: "done" },
    },

    done: {
      type: "final",
      output: ({ context }) => ({
        items: context.items || [],
      } as DomainOutput),
    },
  },
  output: ({ context }) => ({
    items: context.items || [],
  } as DomainOutput),
});
