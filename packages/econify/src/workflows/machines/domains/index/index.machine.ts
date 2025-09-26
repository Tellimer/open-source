/*
Machine: Index Domain
Purpose: Explicit no-op normalization for index/points; add local explain note when enabled.
Inputs: { config, items, explain? }
Output: { processed }
Key states: prepare -> passthrough -> done
*/

import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../../../../main.ts";
import type { PipelineConfig } from "../../../economic-data-workflow.ts";

interface IndexInput {
  config: PipelineConfig;
  items: ParsedData[];
  explain?: boolean;
}

export const indexDomainMachine = setup({
  types: {
    context: {} as {
      config: PipelineConfig;
      items: ParsedData[];
      explain?: boolean;
      processed?: ParsedData[];
    },
    input: {} as IndexInput,
  },
  actors: {
    passthrough: fromPromise(async ({ input }: { input: IndexInput }) => {
      return input.items;
    }),
  },
}).createMachine({
  id: "index-domain",
  context: ({ input }) => ({
    config: input.config,
    items: input.items,
    explain: input.explain,
  }),
  initial: "prepare",
  states: {
    prepare: { always: { target: "passthrough" } },
    passthrough: {
      invoke: {
        src: "passthrough",
        input: ({ context }) => ({
          config: context.config,
          items: context.items,
          explain: context.explain,
        }),
        onDone: {
          target: "done",
          actions: assign(({ event, context }) => {
            const out = (event as { output: ParsedData[] }).output;
            if (!context.explain) return { processed: out };
            const processed = out.map((it) => {
              const existing =
                (it as unknown as { explain?: Record<string, unknown> })
                  .explain ?? {};
              const merged: Record<string, unknown> = { ...existing };
              if (merged["domain"] == null) merged["domain"] = "index";
              merged["note"] = "no-op normalization";
              return { ...it, explain: merged } as ParsedData;
            });
            return { processed };
          }),
        },
      },
    },
    done: {
      type: "final",
      output: ({ context }) => ({ processed: context.processed ?? [] }),
    },
  },
});
