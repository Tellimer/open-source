/*
Machine: Counts Domain
Purpose: Normalize counts by scale only; no currency/time conversion; add explain when enabled.
Inputs: { config, items, fxRates?, fxSource?, fxSourceId?, explain? }
Output: { processed }
Key states: prepare → normalizeCounts → enrichExplain → done
*/

import { setup, fromPromise } from "npm:xstate@^5.20.2";
import type { ParsedData, FXTable, Scale } from "../../../../main.ts";
import type { PipelineConfig } from "../../../economic-data-workflow.ts";
import { processBatch } from "../../../../batch/batch.ts";

interface CountsInput {
  config: PipelineConfig;
  items: ParsedData[];
  fxRates?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
  explain?: boolean;
}

interface CountsOutput { processed: ParsedData[] }

export const countsMachine = setup({
  types: {
    context: {} as CountsInput & { processed?: ParsedData[] },
    input: {} as CountsInput,
  },
  actors: {
    normalizeCounts: fromPromise(async ({ input }: { input: CountsInput }) => {
      const res = await processBatch(input.items, {
        validate: false,
        handleErrors: "skip",
        parallel: true,
        toCurrency: undefined,
        toMagnitude: "ones" as Scale,
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
  id: "counts",
  context: ({ input }) => ({ ...input }),
  initial: "prepare",
  states: {
    prepare: {
      always: { target: "normalizeCounts" },
    },

    normalizeCounts: {
      invoke: {
        src: "normalizeCounts",
        input: ({ context }) => ({ ...context }),
        onDone: {
          target: "enrichExplain",
          actions: ({ event, context }) => { context.processed = (event as any).output as ParsedData[]; },
        },
      },
    },

    enrichExplain: {
      // Placeholder for future explain enrichment specific to counts
      always: { target: "done" },
    },

    done: { type: "final", output: ({ context }) => ({ processed: (context.processed ?? []) as ParsedData[] }) as CountsOutput },
  },
  output: ({ context }) => ({ processed: (context.processed ?? []) as ParsedData[] }) as CountsOutput,
});

