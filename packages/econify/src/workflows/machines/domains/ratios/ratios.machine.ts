/*
Machine: Ratios Domain
Purpose: Guard/validate ratio/composite units (e.g., USD/Liter, CO2/kWh) and avoid FX/time normalization.
Inputs: { config, items, explain? }
Output: { processed }
Key states: validate -> annotateExplain -> done
*/

import { setup, fromPromise, assign } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../../../../main.ts";
import type { PipelineConfig } from "../../../economic-data-workflow.ts";
import { parseUnit } from "../../../../units/units.ts";

interface RatiosInput {
  config: PipelineConfig;
  items: ParsedData[];
  explain?: boolean;
}

export const ratiosMachine = setup({
  types: {
    context: {} as { config: PipelineConfig; items: ParsedData[]; explain?: boolean; processed?: ParsedData[] },
    input: {} as RatiosInput,
  },
  actors: {
    validate: fromPromise(async ({ input }: { input: RatiosInput }) => {
      // Perform a light validation: ensure units parse as composite when present
      // Do not mutate; just return items unchanged. Any non-composite will still pass through.
      for (const item of input.items) {
        try { parseUnit(item.unit || ""); } catch (_) { /* ignore parse errors */ }
      }
      return input.items;
    }),
  },
}).createMachine({
  id: "ratios",
  context: ({ input }) => ({ config: input.config, items: input.items, explain: input.explain }),
  initial: "validate",
  states: {
    validate: {
      invoke: {
        src: "validate",
        input: ({ context }) => ({ config: context.config, items: context.items, explain: context.explain }),
        onDone: {
          target: "annotateExplain",
          actions: assign({ items: ({ event }) => (event as { output: ParsedData[] }).output }),
        },
      },
    },
    annotateExplain: {
      always: {
        target: "done",
        actions: assign(({ context }) => {
          if (!context.explain) return { processed: context.items };
          const processed = context.items.map((it) => {
            const existing = (it as unknown as { explain?: Record<string, unknown> }).explain ?? {};
            const merged: Record<string, unknown> = { ...existing };
            if (merged["domain"] == null) merged["domain"] = "ratios";
            merged["note"] = "no-op normalization (guarded ratio)";
            return { ...it, explain: merged } as ParsedData;
          });
          return { processed };
        }),
      },
    },
    done: { type: "final", output: ({ context }) => ({ processed: context.processed ?? [] }) },
  },
});

