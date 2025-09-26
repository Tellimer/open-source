/*
Machine: Percentages Domain
Purpose: Pass-through with validation; no currency/time/magnitude normalization.
Inputs: { config, items, explain? }
Output: { processed }
Key states: prepare → validateDimensionless → passthrough → explainNote → done
*/

import { fromPromise, setup } from "npm:xstate@^5.20.2";
import type { FXTable, ParsedData, Scale } from "../../../../main.ts";
import type { PipelineConfig } from "../../../economic-data-workflow.ts";
import { processBatch } from "../../../../batch/batch.ts";

interface PercentagesInput {
  config: PipelineConfig;
  items: ParsedData[];
  fxRates?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
  explain?: boolean;
}

interface PercentagesOutput {
  processed: ParsedData[];
}

export const percentagesMachine = setup({
  types: {
    context: {} as PercentagesInput & { processed?: ParsedData[] },
    input: {} as PercentagesInput,
  },
  actors: {
    passthrough: fromPromise(async ({ input }: { input: PercentagesInput }) => {
      const res = await processBatch(input.items, {
        validate: false,
        handleErrors: "skip",
        parallel: true,
        toCurrency: undefined,
        toMagnitude: undefined as unknown as Scale,
        toTimeScale: undefined,
        fx: input.fxRates,
        explain: input.explain,
        fxSource: input.fxSource,
        fxSourceId: input.fxSourceId,
      });
      return res.successful;
    }),
  },
}).createMachine({
  id: "percentages",
  context: ({ input }) => ({ ...input }),
  initial: "prepare",
  states: {
    prepare: {
      always: { target: "validateDimensionless" },
    },

    validateDimensionless: {
      // Today we rely on the router to classify percentages.
      // Keep a state for visualization; could add assertions later.
      always: { target: "passthrough" },
    },

    passthrough: {
      invoke: {
        src: "passthrough",
        input: ({ context }) => ({ ...context }),
        onDone: {
          target: "explainNote",
          actions: ({ event, context }) => {
            context.processed = (event as any).output as ParsedData[];
          },
        },
      },
    },

    explainNote: {
      // Placeholder: annotate that percentages are dimensionless and unchanged.
      always: { target: "done" },
    },

    done: {
      type: "final",
      output: ({ context }) =>
        ({
          processed: (context.processed ?? []) as ParsedData[],
        }) as PercentagesOutput,
    },
  },
  output: ({ context }) =>
    ({
      processed: (context.processed ?? []) as ParsedData[],
    }) as PercentagesOutput,
});
