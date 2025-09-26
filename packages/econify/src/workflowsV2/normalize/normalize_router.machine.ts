/**
 * V2 Normalize Router - Optimized Parallel Processing
 *
 * This is the primary router for V2 normalization pipeline.
 *
 * Key Features:
 * - FX rates come from config.fxFallback (no async fetching)
 * - All domains process in parallel
 * - FX detection happens during classification (adds needsFX flag to items)
 * - Domains that need FX receive it directly
 *
 * Architecture:
 * - Classification adds FX metadata to each item
 * - Router passes FX to domains that need it (monetary, commodities, etc.)
 * - No sequential FX detection/fetch overhead
 * - Maximum parallelization for best performance
 */

import { assign, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../shared/types.ts";
import type { FXTable } from "../../types.ts";
import type { V2Buckets } from "../shared/types.ts";
import { needsFXForBuckets } from "../shared/fx_detection.ts";

// Import domain machines
import { monetaryMachine } from "../domains/monetary/monetary.machine.ts";
import { countsMachine } from "../domains/counts.machine.ts";
import { percentagesMachine } from "../domains/percentages.machine.ts";
import { indicesMachine } from "../domains/indices.machine.ts";
import { ratiosMachine } from "../domains/ratios.machine.ts";
import { commoditiesMachine } from "../domains/commodities.machine.ts";
import { cryptoMachine } from "../domains/crypto/crypto.machine.ts";
import { fanInMachine } from "./fanin.machine.ts";
import { explainMergeMachine } from "./explain_merge.machine.ts";

interface RouterContext {
  config: Record<string, unknown>;
  buckets: V2Buckets;
  exempted: ParsedData[];
  nonExempted: ParsedData[];
  processed?: Record<string, ParsedData[]>;
  fxRates?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
}

// Guards are defined inline in the setup function

export const normalizeRouterMachine = setup({
  types: {
    context: {} as RouterContext,
    input: {} as RouterContext,
  },
  actors: {
    monetary: monetaryMachine,
    counts: countsMachine,
    percentages: percentagesMachine,
    indices: indicesMachine,
    ratios: ratiosMachine,
    commodities: commoditiesMachine,
    crypto: cryptoMachine,
    fanin: fanInMachine,
    explainMerge: explainMergeMachine,
  },
  guards: {
    hasItems: (args: any, params: any) => {
      const bucket = params;
      const items =
        (args.context as RouterContext).buckets[bucket as keyof V2Buckets] ||
        [];
      return items.length > 0;
    },
    hasFXItems: (args: any, params: any) => {
      const bucket = params;
      const items =
        (args.context as RouterContext).buckets[bucket as keyof V2Buckets] ||
        [];
      return items.some((item) => (item as any).needsFX);
    },
    needsFX: ({ context }) => {
      return needsFXForBuckets(context.buckets);
    },
  },
}).createMachine({
  id: "normalizeRouterV2Enhanced",
  context: ({ input }) => ({
    ...input,
    processed: {},
    // FX rates are only set if needed - determined by guard
    fxRates: undefined,
    fxSource: undefined,
    fxSourceId: undefined,
  }),
  initial: "checkFX",
  states: {
    checkFX: {
      always: [
        {
          guard: "needsFX",
          target: "setupFX",
          actions: assign({
            fxRates: ({ context }) => (context.config as any).fxFallback,
            fxSource: () => "fallback",
            fxSourceId: () => "SNP",
          }),
        },
        {
          target: "route",
        },
      ],
    },

    setupFX: {
      always: {
        target: "route",
      },
    },

    route: {
      type: "parallel",
      states: {
        // Monetary domains - always process with FX
        monetaryStock: {
          initial: "check",
          states: {
            check: {
              always: [
                {
                  guard: { type: "hasItems", params: "monetaryStock" },
                  target: "processingWithFX",
                },
                { target: "done" },
              ],
            },
            processingWithFX: {
              entry: ({ context }) => {
                console.log(
                  `[V2 Router] Processing monetaryStock with FX (${
                    context.buckets.monetaryStock?.length || 0
                  } items)`,
                );
              },
              invoke: {
                src: "monetary",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.monetaryStock,
                  isStock: true, // Flag to indicate these are stocks, not flows
                  fx: context.fxRates,
                  fxSource: "fallback",
                  fxSourceId: "SNP",
                }),
                onDone: {
                  target: "done",
                  actions: assign({
                    processed: ({ context, event }) => ({
                      ...context.processed,
                      monetaryStock: (event as any).output
                        .items as ParsedData[],
                    }),
                  }),
                },
              },
            },
            done: { type: "final" },
          },
        },

        monetaryFlow: {
          initial: "check",
          states: {
            check: {
              always: [
                {
                  guard: { type: "hasItems", params: "monetaryFlow" },
                  target: "processingWithFX",
                },
                { target: "done" },
              ],
            },
            processingWithFX: {
              entry: ({ context }) => {
                console.log(
                  `[V2 Router] Processing monetaryFlow with FX (${
                    context.buckets.monetaryFlow?.length || 0
                  } items)`,
                );
              },
              invoke: {
                src: "monetary",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.monetaryFlow,
                  isStock: false, // Flag to indicate these are flows, not stocks
                  fx: context.fxRates,
                  fxSource: "fallback",
                  fxSourceId: "SNP",
                }),
                onDone: {
                  target: "done",
                  actions: assign({
                    processed: ({ context, event }) => ({
                      ...context.processed,
                      monetaryFlow: (event as any).output.items as ParsedData[],
                    }),
                  }),
                },
              },
            },
            done: { type: "final" },
          },
        },

        // Physical domains - conditional FX based on items
        commodities: {
          initial: "check",
          states: {
            check: {
              always: [
                {
                  guard: { type: "hasItems", params: "commodities" },
                  target: "checkFX",
                },
                { target: "done" },
              ],
            },
            checkFX: {
              always: [
                {
                  guard: { type: "hasFXItems", params: "commodities" },
                  target: "processingWithConditionalFX",
                },
                {
                  target: "processingNoFX",
                },
              ],
            },
            processingWithConditionalFX: {
              entry: ({ context }) => {
                const items = context.buckets.commodities || [];
                const fxCount = items.filter((i) => (i as any).needsFX).length;
                console.log(
                  `[V2 Router] Processing commodities with conditional FX (${fxCount}/${items.length} items need FX)`,
                );
              },
              invoke: {
                src: "commodities",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.commodities,
                  fx: context.fxRates,
                  fxSource: "fallback",
                  fxSourceId: "SNP",
                }),
                onDone: {
                  target: "done",
                  actions: assign({
                    processed: ({ context, event }) => ({
                      ...context.processed,
                      commodities: (event as any).output.items as ParsedData[],
                    }),
                  }),
                },
              },
            },
            processingNoFX: {
              entry: ({ context }) => {
                console.log(
                  `[V2 Router] Processing commodities without FX (${
                    context.buckets.commodities?.length || 0
                  } items)`,
                );
              },
              invoke: {
                src: "commodities",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.commodities,
                }),
                onDone: {
                  target: "done",
                  actions: assign({
                    processed: ({ context, event }) => ({
                      ...context.processed,
                      commodities: (event as any).output.items as ParsedData[],
                    }),
                  }),
                },
              },
            },
            done: { type: "final" },
          },
        },

        crypto: {
          initial: "check",
          states: {
            check: {
              always: [
                {
                  guard: { type: "hasItems", params: "crypto" },
                  target: "checkFX",
                },
                { target: "done" },
              ],
            },
            checkFX: {
              always: [
                {
                  guard: { type: "hasFXItems", params: "crypto" },
                  target: "processingWithConditionalFX",
                },
                {
                  target: "processingNoFX",
                },
              ],
            },
            processingWithConditionalFX: {
              entry: ({ context }) => {
                const items = context.buckets.crypto || [];
                const fxCount = items.filter((i) => (i as any).needsFX).length;
                console.log(
                  `[V2 Router] Processing crypto with conditional FX (${fxCount}/${items.length} items need FX)`,
                );
              },
              invoke: {
                src: "crypto",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.crypto,
                  fx: context.fxRates,
                  fxSource: "fallback",
                  fxSourceId: "SNP",
                }),
                onDone: {
                  target: "done",
                  actions: assign({
                    processed: ({ context, event }) => ({
                      ...context.processed,
                      crypto: (event as any).output.items as ParsedData[],
                    }),
                  }),
                },
              },
            },
            processingNoFX: {
              invoke: {
                src: "crypto",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.crypto,
                }),
                onDone: {
                  target: "done",
                  actions: assign({
                    processed: ({ context, event }) => ({
                      ...context.processed,
                      crypto: (event as any).output.items as ParsedData[],
                    }),
                  }),
                },
              },
            },
            done: { type: "final" },
          },
        },

        // Simple domains - never need FX
        counts: {
          initial: "check",
          states: {
            check: {
              always: [
                {
                  guard: { type: "hasItems", params: "counts" },
                  target: "processing",
                },
                { target: "done" },
              ],
            },
            processing: {
              entry: ({ context }) => {
                console.log(
                  `[V2 Router] Processing counts (no FX needed, ${
                    context.buckets.counts?.length || 0
                  } items)`,
                );
              },
              invoke: {
                src: "counts",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.counts,
                }),
                onDone: {
                  target: "done",
                  actions: assign({
                    processed: ({ context, event }) => ({
                      ...context.processed,
                      counts: (event as any).output.items as ParsedData[],
                    }),
                  }),
                },
              },
            },
            done: { type: "final" },
          },
        },

        percentages: {
          initial: "check",
          states: {
            check: {
              always: [
                {
                  guard: { type: "hasItems", params: "percentages" },
                  target: "processing",
                },
                { target: "done" },
              ],
            },
            processing: {
              entry: ({ context }) => {
                console.log(
                  `[V2 Router] Processing percentages (no FX needed, ${
                    context.buckets.percentages?.length || 0
                  } items)`,
                );
              },
              invoke: {
                src: "percentages",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.percentages,
                }),
                onDone: {
                  target: "done",
                  actions: assign({
                    processed: ({ context, event }) => ({
                      ...context.processed,
                      percentages: (event as any).output.items as ParsedData[],
                    }),
                  }),
                },
              },
            },
            done: { type: "final" },
          },
        },

        indices: {
          initial: "check",
          states: {
            check: {
              always: [
                {
                  guard: { type: "hasItems", params: "indices" },
                  target: "processing",
                },
                { target: "done" },
              ],
            },
            processing: {
              entry: ({ context }) => {
                console.log(
                  `[V2 Router] Processing indices (no FX needed, ${
                    context.buckets.indices?.length || 0
                  } items)`,
                );
              },
              invoke: {
                src: "indices",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.indices,
                }),
                onDone: {
                  target: "done",
                  actions: assign({
                    processed: ({ context, event }) => ({
                      ...context.processed,
                      indices: (event as any).output.items as ParsedData[],
                    }),
                  }),
                },
              },
            },
            done: { type: "final" },
          },
        },

        ratios: {
          initial: "check",
          states: {
            check: {
              always: [
                {
                  guard: { type: "hasItems", params: "ratios" },
                  target: "processing",
                },
                { target: "done" },
              ],
            },
            processing: {
              entry: ({ context }) => {
                console.log(
                  `[V2 Router] Processing ratios (no FX needed, ${
                    context.buckets.ratios?.length || 0
                  } items)`,
                );
              },
              invoke: {
                src: "ratios",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.ratios,
                }),
                onDone: {
                  target: "done",
                  actions: assign({
                    processed: ({ context, event }) => ({
                      ...context.processed,
                      ratios: (event as any).output.items as ParsedData[],
                    }),
                  }),
                },
              },
            },
            done: { type: "final" },
          },
        },
      },

      onDone: {
        target: "fanin",
      },
    },

    fanin: {
      invoke: {
        src: "fanin",
        input: ({ context }) => ({
          processed: context.processed || {},
          exempted: context.exempted,
          nonExempted: context.nonExempted,
        }),
        onDone: {
          target: "explainMerge",
          actions: assign({
            processed: ({ event }) => ({
              merged: (event as any).output.normalizedData, // fanin returns normalizedData, not merged
            }),
          }),
        },
      },
    },

    explainMerge: {
      invoke: {
        src: "explainMerge",
        input: ({ context }) => ({
          items: (context.processed as any).merged || [],
          enable: (context.config as any).explain || true,
          config: context.config,
          fxSource: "fallback",
          fxSourceId: "SNP",
        }),
        onDone: {
          target: "done",
          actions: assign({
            processed: ({ event }) => ({
              final: (event as any).output.items,
            }),
          }),
        },
      },
    },

    done: {
      type: "final",
      output: ({ context }) => {
        const items = (context.processed as any).final || [];
        return {
          items,
          data: items,
          exempted: context.exempted,
        };
      },
    },
  },
  output: ({ context }) => {
    const items = (context.processed as any).final || [];
    return {
      items,
      data: items,
      exempted: context.exempted,
    };
  },
});
