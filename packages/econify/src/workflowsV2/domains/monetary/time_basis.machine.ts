import { assign, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../../shared/types.ts";
import type { TimeScale } from "../../shared/types.ts";
import { extractTimeScale } from "../../shared/units.ts";

interface TimeBasisInput {
  items: ParsedData[];
  prefer?: TimeScale; // tie-break preference (default: month)
}
interface TimeBasisOutput {
  preferredTimeScale?: TimeScale;
}

type Ctx = {
  items: ParsedData[];
  preferredTimeScale?: TimeScale;
  prefer?: TimeScale;
};

export const timeBasisMachine = setup({
  types: { context: {} as Ctx, input: {} as TimeBasisInput },
}).createMachine({
  id: "timeBasisV2",
  context: ({ input }) => ({
    items: input.items,
    prefer: input.prefer ?? "month",
  }),
  initial: "compute",
  states: {
    compute: {
      entry: assign({
        preferredTimeScale: ({ context }) => {
          const counts: Record<string, number> = {};
          for (const it of context.items || []) {
            const ts = extractTimeScale(it.unit || "");
            if (ts) counts[ts] = (counts[ts] || 0) + 1;
          }
          // choose majority
          let best: TimeScale | undefined = undefined;
          let bestCount = 0;
          for (const k of Object.keys(counts)) {
            const c = counts[k]!;
            if (c > bestCount) {
              bestCount = c;
              best = k as TimeScale;
            } else if (c === bestCount && c > 0) {
              // tie-break: prefer month
              if ((k as TimeScale) === "month") best = "month";
            }
          }
          return best ?? (context.prefer as TimeScale | undefined) ?? "month";
        },
      }),
      always: { target: "done" },
    },
    done: {
      type: "final",
      output: ({ context }) =>
        ({ preferredTimeScale: context.preferredTimeScale }) as TimeBasisOutput,
    },
  },
  output: ({ context }) =>
    ({ preferredTimeScale: context.preferredTimeScale }) as TimeBasisOutput,
});
