import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../shared/types.ts";
import { filterExemptions } from "./exemptions.ts";
import type {
  V2Buckets,
  V2ClassifyInput,
  V2ClassifyOutput,
} from "../shared/types.ts";
import { bucketForItem } from "./taxonomy.ts";
import { detectFXRequirement } from "./fx-detection.ts";

export const classifyMachine = setup({
  types: {
    context: {} as {
      config: Record<string, unknown>;
      parsedData: ParsedData[];
      exempted?: ParsedData[];
      nonExempted?: ParsedData[];
      buckets?: V2Buckets;
    },
    input: {} as V2ClassifyInput,
  },
  actors: {
    applyExemptions: fromPromise(({ input }: { input: V2ClassifyInput }) => {
      const { exempted, nonExempted } = filterExemptions(
        input.parsedData,
        (input.config as any)?.exemptions,
      );
      return Promise.resolve(
        { exempted, nonExempted } as {
          exempted: ParsedData[];
          nonExempted: ParsedData[];
        },
      );
    }),
    bucketize: fromPromise(({ input }: { input: { items: ParsedData[] } }) => {
      const b: V2Buckets = {
        monetaryStock: [],
        monetaryFlow: [],
        counts: [],
        percentages: [],
        indices: [],
        ratios: [],
        energy: [],
        commodities: [],
        agriculture: [],
        metals: [],
        crypto: [],
      };
      for (const it of input.items) {
        // Add FX detection metadata to each item
        const fxDetection = detectFXRequirement(it);
        const classification = bucketForItem(it);
        const itemWithFX = {
          ...it,
          needsFX: fxDetection.needsFX,
          currencyCode: fxDetection.currencyCode,
          pricePattern: fxDetection.pricePattern,
          explain: {
            ...(it.explain || {}),
            domain: classification,
          },
        };
        (b as any)[classification].push(itemWithFX);
      }
      return Promise.resolve(b);
    }),
  },
}).createMachine({
  id: "classifyV2",
  context: ({ input }) => ({
    config: input.config,
    parsedData: input.parsedData,
  }),
  initial: "exemptions",
  states: {
    exemptions: {
      invoke: {
        src: "applyExemptions",
        input: ({ context }) => ({
          config: context.config,
          parsedData: context.parsedData,
        }),
        onDone: {
          target: "bucketing",
          actions: assign({
            exempted: ({ event }) => (event as any).output.exempted,
            nonExempted: ({ event }) => (event as any).output.nonExempted,
          }),
        },
      },
    },
    bucketing: {
      invoke: {
        src: "bucketize",
        input: ({ context }) => ({ items: context.nonExempted ?? [] }),
        onDone: {
          target: "done",
          actions: assign({ buckets: ({ event }) => (event as any).output }),
        },
      },
    },
    done: {
      type: "final",
      output: ({ context }): V2ClassifyOutput => ({
        exempted: context.exempted ?? [],
        nonExempted: context.nonExempted ?? [],
        buckets: context.buckets!,
      }),
    },
  },
  output: ({ context }): V2ClassifyOutput => ({
    exempted: context.exempted ?? [],
    nonExempted: context.nonExempted ?? [],
    buckets: context.buckets!,
  }),
});
