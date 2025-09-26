import { assign, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../shared/types.ts";

interface DomainInput {
  config: Record<string, unknown>;
  items: ParsedData[];
}
interface DomainOutput {
  items: ParsedData[];
}

export const cryptoMachine = setup({
  types: { context: {} as DomainInput, input: {} as DomainInput },
}).createMachine({
  id: "cryptoV2",
  context: ({ input }) => ({ ...input }),
  initial: "process",
  states: {
    process: {
      always: {
        target: "done",
        actions: assign(({ context }) => ({
          items: (context.items || []).map((it) => ({
            ...it,
            normalizedValue: it.normalized ?? it.value,
            normalizedUnit: it.normalizedUnit ?? it.unit,
          })),
        })),
      },
    },
    done: {
      type: "final",
      output: ({ context }) => ({ items: context.items }) as DomainOutput,
    },
  },
  output: ({ context }) => ({ items: context.items }) as DomainOutput,
});
