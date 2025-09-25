import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import {
  adjustForInflation,
  deseasonalize,
  type ParsedData,
} from "../../../../main.ts";
import type { PipelineConfig } from "../../../economic-data-workflow.ts";

interface AdjustmentInput {
  config: PipelineConfig;
  normalizedData?: ParsedData[];
  adjustedData?: ParsedData[];
}

interface AdjustmentOutput {
  adjustedData?: ParsedData[];
  warnings?: string[];
}

export const adjustmentMachine = setup({
  types: {
    context: {} as {
      config: PipelineConfig;
      normalizedData?: ParsedData[];
      adjustedData?: ParsedData[];
      warnings: string[];
    },
    input: {} as AdjustmentInput,
  },
  actors: {
    doInflation: fromPromise(async ({ input }: { input: AdjustmentInput }) => {
      const src = input.normalizedData;
      if (!src) return src;
      // Mirror existing logic: compute realValue on each item
      return src.map((item) => ({
        ...item,
        realValue: adjustForInflation(item.normalized || item.value, {
          fromYear: item.year || 2020,
          toYear: 2024,
          country: "US",
        }),
      }));
    }),
    doDeseasonalize: fromPromise(
      async ({ input }: { input: AdjustmentInput }) => {
        const data = input.adjustedData || input.normalizedData;
        if (!data || data.length < 24) return data;
        const timeSeries = data.map((item) => ({
          date: new Date(item.date || Date.now()),
          value: item.realValue || item.normalized || item.value,
        }));
        const deseasonalized = deseasonalize(timeSeries, {
          method: "decomposition",
          period: 12,
        });
        const byTime = new Map(
          deseasonalized.map((d) => [d.date.getTime(), d.value]),
        );
        return data.map((item) => ({
          ...item,
          realValue: byTime.get(new Date(item.date || Date.now()).getTime()) ??
            item.realValue ?? item.value,
        }));
      },
    ),
  },
}).createMachine({
  id: "adjustment",
  context: ({ input }) => ({
    config: input.config,
    normalizedData: input.normalizedData,
    adjustedData: input.adjustedData,
    warnings: [],
  }),
  initial: "checkingInflation",
  states: {
    checkingInflation: {
      always: [
        {
          target: "inflation",
          guard: ({ context }) => context.config.adjustInflation === true,
        },
        { target: "checkingSeasonality" },
      ],
    },

    inflation: {
      invoke: {
        src: "doInflation",
        input: ({ context }) => ({
          config: context.config,
          normalizedData: context.normalizedData,
        }),
        onDone: {
          target: "checkingSeasonality",
          actions: assign({ adjustedData: ({ event }) => event.output }),
        },
        onError: {
          target: "checkingSeasonality",
          actions: assign({
            warnings: ({ context, event }) => [
              ...context.warnings,
              (event as any)?.error?.message || "Inflation adjustment failed",
            ],
          }),
        },
      },
    },

    checkingSeasonality: {
      always: [
        {
          target: "seasonality",
          guard: ({ context }) => context.config.removeSeasonality === true,
        },
        { target: "done" },
      ],
    },

    seasonality: {
      invoke: {
        src: "doDeseasonalize",
        input: ({ context }) => ({
          config: context.config,
          normalizedData: context.normalizedData,
          adjustedData: context.adjustedData,
        }),
        onDone: {
          target: "done",
          actions: assign({ adjustedData: ({ event }) => event.output }),
        },
        onError: {
          target: "done",
          actions: assign({
            warnings: ({ context, event }) => [
              ...context.warnings,
              (event as any)?.error?.message || "Seasonality removal failed",
            ],
          }),
        },
      },
    },

    done: {
      type: "final",
      output: ({ context }): AdjustmentOutput => ({
        adjustedData: context.adjustedData,
        warnings: context.warnings,
      }),
    },
  },
  output: ({ context }): AdjustmentOutput => ({
    adjustedData: context.adjustedData,
    warnings: context.warnings,
  }),
});

