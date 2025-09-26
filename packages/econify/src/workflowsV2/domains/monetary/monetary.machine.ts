import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import type { FXTable, Scale, TimeScale } from "../../shared/types.ts";
import type { ParsedData } from "../../shared/types.ts";
import { timeBasisMachine } from "./time_basis.machine.ts";
import { targetsMachine } from "./targets.machine.ts";
import { normalizeMonetaryBatch } from "./batch.ts";
import { autoTargetEnabled, hasConfigTargetTime } from "../../shared/guards.ts";

interface MonetaryInput {
  config: {
    targetCurrency?: string;
    targetMagnitude?: Scale;
    targetTimeScale?: TimeScale;
    autoTargetByIndicator?: boolean;
    explain?: boolean;
  } & Record<string, unknown>;
  items: ParsedData[];
  isStock?: boolean; // Flag to indicate if items are stocks (true) or flows (false)
  fx?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
}
interface MonetaryOutput {
  items: ParsedData[];
}

export const monetaryMachine = setup({
  types: {
    context: {} as MonetaryInput & {
      preferredTime?: TimeScale;
      selected?: { currency?: string; magnitude?: Scale; time?: TimeScale };
    },
    input: {} as MonetaryInput,
  },
  actors: {
    batch: fromPromise(async ({
      input,
    }: {
      input: Required<Pick<MonetaryInput, "items" | "config">> & {
        isStock?: boolean;
        preferredTime?: TimeScale;
        selected?: { currency?: string; magnitude?: Scale; time?: TimeScale };
        fx?: FXTable;
        fxSource?: "live" | "fallback";
        fxSourceId?: string;
      };
    }) => {
      const toCurrency = input.selected?.currency ??
        input.config.targetCurrency;
      const toMagnitude = (input.selected?.magnitude as Scale | undefined) ??
        (input.config.targetMagnitude as Scale | undefined);
      const toTimeScale = (input.selected?.time as TimeScale | undefined) ??
        input.preferredTime ?? input.config.targetTimeScale;
      const out = await normalizeMonetaryBatch(input.items, {
        isStock: input.isStock,
        toCurrency,
        toMagnitude,
        toTimeScale,
        fx: input.fx,
        explain: input.config.explain ?? true,
        fxSource: input.fxSource,
        fxSourceId: input.fxSourceId,
      });
      return out as ParsedData[];
    }),
  },
}).createMachine({
  id: "monetaryV2",
  context: ({ input }) => ({
    ...input,
    preferredTime: undefined,
    selected: undefined,
  }),
  initial: "timeBasis",
  states: {
    timeBasis: {
      initial: "decide",
      states: {
        decide: {
          always: [
            { guard: hasConfigTargetTime(), target: "done" },
            { target: "infer" },
          ],
        },
        infer: {
          invoke: {
            src: timeBasisMachine,
            input: ({ context }) => ({ items: context.items, prefer: "month" }),
            onDone: {
              target: "done",
              actions: [
                assign({
                  preferredTime: ({ event }) =>
                    (event as any).output.preferredTimeScale,
                }),
                () => console.log("[V2 monetary] time-basis inferred"),
              ],
            },
          },
        },
        done: { type: "final" },
      },
      onDone: "targets",
    },
    targets: {
      initial: "decide",
      states: {
        decide: {
          always: [
            { guard: autoTargetEnabled(), target: "auto" },
            { target: "useConfig" },
          ],
        },
        auto: {
          invoke: {
            src: targetsMachine,
            input: ({ context }) => ({
              items: context.items,
              config: context.config,
              prefer: context.preferredTime ?? "month",
            }),
            onDone: {
              target: "done",
              actions: assign({
                selected: ({ event }) => (event as any).output.selected,
              }),
            },
          },
        },
        useConfig: {
          entry: assign({
            selected: ({ context }) => ({
              currency: context.config.targetCurrency,
              magnitude:
                (context.config.targetMagnitude as Scale | undefined) ??
                  "millions",
              time: context.config.targetTimeScale ?? context.preferredTime,
            }),
          }),
          always: { target: "done" },
        },
        done: { type: "final" },
      },
      onDone: "batch",
    },
    batch: {
      invoke: {
        src: "batch",
        input: ({ context }) => ({
          items: context.items,
          config: context.config,
          isStock: context.isStock,
          preferredTime: context.preferredTime,
          selected: context.selected,
          fx: context.fx,
          fxSource: context.fxSource,
          fxSourceId: context.fxSourceId,
        }),
        onDone: {
          target: "done",
          actions: [
            assign({
              items: ({ event }) => (event as any).output as ParsedData[],
            }),
            () => console.log("[V2 monetary] batch done"),
          ],
        },
      },
    },
    done: {
      type: "final",
      output: ({ context }) => ({ items: context.items }) as MonetaryOutput,
    },
  },
  output: ({ context }) => ({ items: context.items }) as MonetaryOutput,
});
