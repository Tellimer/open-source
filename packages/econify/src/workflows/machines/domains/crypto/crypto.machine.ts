/*
Machine: Crypto Domain
Purpose: Explicit no-op normalization for cryptocurrency units; add local explain note when enabled.
Inputs: { config, items, explain? }
Output: { processed }
Key states: prepare → passthrough → done
*/

import { setup, fromPromise, assign } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../../../../main.ts";
import type { PipelineConfig } from "../../../economic-data-workflow.ts";

interface CryptoInput {
  config: PipelineConfig;
  items: ParsedData[];
  explain?: boolean;
}

export const cryptoMachine = setup({
  types: {
    context: {} as { config: PipelineConfig; items: ParsedData[]; explain?: boolean; processed?: ParsedData[] },
    input: {} as CryptoInput,
  },
  actors: {
    passthrough: fromPromise(async ({ input }: { input: CryptoInput }) => {
      // No-op: return items unchanged
      return input.items;
    }),
  },
}).createMachine({
  id: "crypto",
  context: ({ input }) => ({ config: input.config, items: input.items, explain: input.explain }),
  initial: "prepare",
  states: {
    prepare: { always: { target: "passthrough" } },
    passthrough: {
      invoke: {
        src: "passthrough",
        input: ({ context }) => ({ config: context.config, items: context.items, explain: context.explain }),
        onDone: {
          target: "done",
          actions: assign(({ event, context }) => {
            const out = (event as { output: ParsedData[] }).output;
            if (!context.explain) return { processed: out };
            const processed = out.map((it) => {
              const existing = (it as unknown as { explain?: Record<string, unknown> }).explain ?? {};
              const merged: Record<string, unknown> = { ...existing };
              if (merged["domain"] == null) merged["domain"] = "crypto";
              merged["note"] = "no-op normalization";
              return { ...it, explain: merged } as ParsedData;
            });
            return { processed };
          }),
        },
      },
    },
    done: { type: "final", output: ({ context }) => ({ processed: context.processed ?? [] }) },
  },
});

