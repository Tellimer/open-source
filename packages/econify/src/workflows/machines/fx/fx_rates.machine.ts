/*
Machine: FX Rates
Purpose: Choose source (live/fallback), fetch and compose FX table, annotate source.
Inputs: { config }
Output: { rates, source, sourceId }
Key states: chooseSource → fetchLive|fetchFallback → composeFXTable → annotateSource → done
*/

import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import { fetchLiveFXRates, type FXTable } from "../../../main.ts";
import type { PipelineConfig } from "../../economic-data-workflow.ts";
import type { FXRatesOutput } from "../shared/types.ts";

export const fxRatesMachine = setup({
  types: {
    context: {} as {
      config: PipelineConfig;
      result?: FXRatesOutput;
      tempRates?: FXTable;
      tempSource?: "live" | "fallback";
      tempSourceId?: string;
    },
    input: {} as { config: PipelineConfig },
  },
  actors: {
    fetchLive: fromPromise(
      async ({ input }: { input: { config: PipelineConfig } }) => {
        const cfg = input.config || {};
        const res = await fetchLiveFXRates(cfg.targetCurrency || "USD", {
          fallback: cfg.fxFallback,
          cache: true,
        });
        return {
          rates: res as FXTable,
          source: "live" as const,
          sourceId: "ECB",
        };
      },
    ),
  },
}).createMachine({
  id: "fxRates",
  context: ({ input }) => ({ config: input.config }),
  initial: "chooseSource",
  states: {
    chooseSource: {
      always: [
        {
          target: "fetchLive",
          guard: ({ context }) => !!context.config?.useLiveFX,
        },
        { target: "fetchFallback" },
      ],
    },

    fetchLive: {
      invoke: {
        src: "fetchLive",
        input: ({ context }) => ({ config: context.config }),
        onDone: {
          target: "composeFXTable",
          actions: assign({
            tempRates: ({ event }) => (event as any).output.rates as FXTable,
            tempSource: (_) => "live" as const,
            tempSourceId: (_) => "ECB",
          }),
        },
        onError: { target: "fetchFallback" },
      },
    },

    fetchFallback: {
      entry: assign(({ context }) => {
        const cfg = context.config || {};
        if (!cfg.fxFallback) {
          throw new Error(
            "fxFallback rates are required when useLiveFX is false",
          );
        }
        return {
          tempRates: cfg.fxFallback as FXTable,
          tempSource: "fallback" as const,
          tempSourceId: "SNP",
        };
      }),
      always: { target: "composeFXTable" },
    },

    composeFXTable: {
      entry: assign(({ context }) => {
        const out: FXRatesOutput = {
          rates: context.tempRates!,
          source: context.tempSource!,
          sourceId: context.tempSourceId!,
        };
        return { result: out };
      }),
      always: { target: "annotateSource" },
    },

    annotateSource: {
      // Placeholder for future enrichment; currently a no-op since compose already set it.
      always: { target: "done" },
    },

    done: {
      type: "final",
      output: ({ context }) => context.result!,
    },
  },
  output: ({ context }) => context.result!,
});
