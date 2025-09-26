import { assign, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../shared/types.ts";
import type { V2Buckets } from "../shared/types.ts";
import type { Scale, TimeScale } from "../../types.ts";
import { fanInMachine } from "./fanin.machine.ts";
import { explainMergeMachine } from "./explain_merge.machine.ts";
import { hasItems } from "../shared/guards.ts";
import { fxMachine } from "../machines/fx/fx.machine.ts";
import { needsFXForBuckets } from "../shared/fx_detection.ts";

// Domain machines (stubs to start)
import { monetaryMachine } from "../domains/monetary/monetary.machine.ts";
import { countsMachine } from "../domains/counts.machine.ts";
import { percentagesMachine } from "../domains/percentages.machine.ts";
import { indicesMachine } from "../domains/indices.machine.ts";
import { ratiosMachine } from "../domains/ratios.machine.ts";
import { energyMachine } from "../domains/energy.machine.ts";
import { commoditiesMachine } from "../domains/commodities.machine.ts";
import { agricultureMachine } from "../domains/agriculture.machine.ts";
import { metalsMachine } from "../domains/metals.machine.ts";
import { cryptoMachine } from "../domains/crypto.machine.ts";

interface RouterInput {
  config: Record<string, unknown> & {
    explain?: boolean;
    targetCurrency?: string;
    targetMagnitude?: Scale;
    targetTimeScale?: TimeScale;
    autoTargetByIndicator?: boolean;
  };
  buckets: V2Buckets;
  exempted: ParsedData[];
  nonExempted: ParsedData[];
}

type RouterContext = RouterInput & {
  processed: Partial<Record<string, ParsedData[]>>;
  fxRates?: any;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
};
interface RouterOutput {
  normalizedData: ParsedData[];
}

export const normalizeRouterMachine = setup({
  types: { context: {} as RouterContext, input: {} as RouterInput },
  actors: {
    fx: fxMachine,
    monetary: monetaryMachine,
    counts: countsMachine,
    percentages: percentagesMachine,
    indices: indicesMachine,
    ratios: ratiosMachine,
    energy: energyMachine,
    commodities: commoditiesMachine,
    agriculture: agricultureMachine,
    metals: metalsMachine,
    crypto: cryptoMachine,
    fanin: fanInMachine,
    explainMerge: explainMergeMachine,
  },
  guards: {
    needsFX: ({ context }) => needsFXForBuckets(context.buckets),
  },
}).createMachine({
  id: "normalizeRouterV2",
  context: ({ input }) => ({ ...input, processed: {} }),
  initial: "checkFX",
  states: {
    checkFX: {
      always: [
        {
          guard: "needsFX",
          target: "fetchFX",
        },
        {
          target: "route",
        },
      ],
    },
    fetchFX: {
      invoke: {
        src: "fx",
        input: ({ context }) => ({
          config: context.config,
        }),
        onDone: {
          target: "route",
          actions: assign({
            fxRates: ({ event }) => (event as any).output.fxRates,
            fxSource: ({ event }) => (event as any).output.fxSource,
            fxSourceId: ({ event }) => (event as any).output.fxSourceId,
          }),
        },
        onError: {
          target: "route",
          actions: () =>
            console.log("[V2 Router] FX fetch failed, proceeding without FX"),
        },
      },
    },
    route: {
      type: "parallel",
      states: {
        monetaryStock: {
          initial: "decide",
          states: {
            decide: {
              always: [{ guard: hasItems("monetaryStock"), target: "run" }, {
                target: "done",
              }],
            },
            run: {
              invoke: {
                src: "monetary",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.monetaryStock,
                  fx: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
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
          initial: "decide",
          states: {
            decide: {
              always: [{ guard: hasItems("monetaryFlow"), target: "run" }, {
                target: "done",
              }],
            },
            run: {
              invoke: {
                src: "monetary",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.monetaryFlow,
                  fx: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
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
        counts: {
          initial: "decide",
          states: {
            decide: {
              always: [{ guard: hasItems("counts"), target: "run" }, {
                target: "done",
              }],
            },
            run: {
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
          initial: "decide",
          states: {
            decide: {
              always: [{ guard: hasItems("percentages"), target: "run" }, {
                target: "done",
              }],
            },
            run: {
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
          initial: "decide",
          states: {
            decide: {
              always: [{ guard: hasItems("indices"), target: "run" }, {
                target: "done",
              }],
            },
            run: {
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
          initial: "decide",
          states: {
            decide: {
              always: [{ guard: hasItems("ratios"), target: "run" }, {
                target: "done",
              }],
            },
            run: {
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
        energy: {
          initial: "decide",
          states: {
            decide: {
              always: [{ guard: hasItems("energy"), target: "run" }, {
                target: "done",
              }],
            },
            run: {
              invoke: {
                src: "energy",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.energy,
                  fx: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                }),
                onDone: {
                  target: "done",
                  actions: assign({
                    processed: ({ context, event }) => ({
                      ...context.processed,
                      energy: (event as any).output.items as ParsedData[],
                    }),
                  }),
                },
              },
            },
            done: { type: "final" },
          },
        },
        commodities: {
          initial: "decide",
          states: {
            decide: {
              always: [{ guard: hasItems("commodities"), target: "run" }, {
                target: "done",
              }],
            },
            run: {
              invoke: {
                src: "commodities",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.commodities,
                  fx: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
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
        agriculture: {
          initial: "decide",
          states: {
            decide: {
              always: [{ guard: hasItems("agriculture"), target: "run" }, {
                target: "done",
              }],
            },
            run: {
              invoke: {
                src: "agriculture",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.agriculture,
                  fx: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                }),
                onDone: {
                  target: "done",
                  actions: assign({
                    processed: ({ context, event }) => ({
                      ...context.processed,
                      agriculture: (event as any).output.items as ParsedData[],
                    }),
                  }),
                },
              },
            },
            done: { type: "final" },
          },
        },
        metals: {
          initial: "decide",
          states: {
            decide: {
              always: [{ guard: hasItems("metals"), target: "run" }, {
                target: "done",
              }],
            },
            run: {
              invoke: {
                src: "metals",
                input: ({ context }) => ({
                  config: context.config,
                  items: context.buckets.metals,
                  fx: context.fxRates,
                  fxSource: context.fxSource,
                  fxSourceId: context.fxSourceId,
                }),
                onDone: {
                  target: "done",
                  actions: assign({
                    processed: ({ context, event }) => ({
                      ...context.processed,
                      metals: (event as any).output.items as ParsedData[],
                    }),
                  }),
                },
              },
            },
            done: { type: "final" },
          },
        },
        crypto: {
          initial: "decide",
          states: {
            decide: {
              always: [{ guard: hasItems("crypto"), target: "run" }, {
                target: "done",
              }],
            },
            run: {
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
      },
      onDone: { target: "fanin" },
    },
    fanin: {
      invoke: {
        src: "fanin",
        input: ({ context }) => ({
          nonExempted: context.nonExempted,
          exempted: context.exempted,
          processed: context.processed,
        }),
        onDone: {
          target: "explain",
          actions: assign({
            processed: ({ event }) => ({
              all: (event as any).output.normalizedData as ParsedData[],
            }),
          }),
        },
      },
    },
    explain: {
      invoke: {
        src: "explainMerge",
        input: ({ context }) => ({
          items: (context.processed?.all || []) as ParsedData[],
          enable: (context.config as any)?.explain,
          config: {
            targetCurrency: (context.config as any)?.targetCurrency,
            targetMagnitude: (context.config as any)?.targetMagnitude,
            targetTimeScale: (context.config as any)?.targetTimeScale,
            autoTargetByIndicator: (context.config as any)
              ?.autoTargetByIndicator,
          },
        }),
        onDone: {
          target: "done",
          actions: assign({
            processed: ({ event }) => ({
              all: (event as any).output.items as ParsedData[],
            }),
          }),
        },
      },
    },
    done: {
      type: "final",
      output: ({ context }) => (({
        normalizedData: (context.processed.all || []) as ParsedData[],
      }) as RouterOutput),
    },
  },
  output: ({ context }) => (({
    normalizedData: (context.processed.all || []) as ParsedData[],
  }) as RouterOutput),
});
