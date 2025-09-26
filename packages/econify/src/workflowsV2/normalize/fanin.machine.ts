import { fromPromise, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../shared/types.ts";

interface FanInInput {
  nonExempted: ParsedData[];
  exempted: ParsedData[];
  processed: Partial<Record<string, ParsedData[]>>;
}

interface FanInOutput {
  normalizedData: ParsedData[];
}

export const fanInMachine = setup({
  types: {
    context: {} as FanInInput,
    input: {} as FanInInput,
  },
  actors: {
    join: fromPromise(async ({ input }: { input: FanInInput }) => {
      // Preserve original order of non-exempted items using their IDs
      const byId = new Map<string | number, ParsedData>();
      for (const key of Object.keys(input.processed || {})) {
        for (const it of input.processed[key] || []) {
          byId.set((it as ParsedData).id!, it as ParsedData);
        }
      }
      const out: ParsedData[] = [];
      for (const orig of input.nonExempted || []) {
        const n = byId.get((orig as ParsedData).id!);
        if (n) out.push(n);
      }
      // Append exempted at end, unchanged
      out.push(...(input.exempted || []));
      return { normalizedData: out } as FanInOutput;
    }),
  },
}).createMachine({
  id: "faninV2",
  context: ({ input }) => ({ ...input }),
  initial: "joining",
  states: {
    joining: {
      invoke: {
        src: "join",
        input: ({ context }) => ({ ...context }),
        onDone: { target: "done" },
      },
    },
    done: {
      type: "final",
      output: ({ event }) => (event as any).output as FanInOutput,
    },
  },
  output: ({ event }) => (event as any).output as FanInOutput,
});
