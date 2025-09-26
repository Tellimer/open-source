import { assign, setup } from "npm:xstate@^5.20.2";
import type { Scale, TimeScale } from "../../shared/types.ts";
import type { ParsedData } from "../../shared/types.ts";
import {
  extractCurrency,
  extractScale,
  parseUnit,
} from "../../shared/units.ts";
import { parseTimeScale } from "../../shared/scale.ts";

export interface TargetsSelection {
  currency?: string;
  magnitude?: Scale;
  time?: TimeScale;
}
interface TargetsInput {
  items: ParsedData[];
  config: {
    targetCurrency?: string;
    targetMagnitude?: Scale;
    targetTimeScale?: TimeScale;
    autoTargetByIndicator?: boolean;
  };
  prefer?: TimeScale;
  threshold?: number; // dominance threshold, default 0.8
}
interface TargetsOutput {
  selected: TargetsSelection;
}

type Ctx = TargetsInput & { selected?: TargetsSelection };

function mode<T extends string | undefined>(
  values: (T | null | undefined)[],
): { value?: T; ratio: number } {
  const counts = new Map<T, number>();
  let total = 0;
  for (const v of values) {
    if (v) {
      counts.set(v as T, (counts.get(v as T) || 0) + 1);
      total++;
    }
  }
  let best: T | undefined = undefined;
  let bestCount = 0;
  for (const [k, c] of counts.entries()) {
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  const ratio = total > 0 ? bestCount / total : 0;
  return { value: best, ratio };
}

export const targetsMachine = setup({
  types: { context: {} as Ctx, input: {} as TargetsInput },
}).createMachine({
  id: "targetsV2",
  context: ({ input }) => ({ ...input, selected: undefined }),
  initial: "decide",
  states: {
    decide: {
      always: [
        {
          guard: ({ context }) =>
            context.config?.autoTargetByIndicator === true,
          target: "auto",
        },
        { target: "useConfig" },
      ],
    },

    auto: {
      entry: assign(({ context }) => {
        const thresh = context.threshold ?? 0.8;
        const currencies = (context.items || []).map((i) =>
          extractCurrency((i as any).unit || "") || undefined
        );
        const scales = (context.items || []).map((i) =>
          extractScale((i as any).unit || "") || undefined
        );

        // Extract time scales using the same logic as auto-targeting
        const timeScales = (context.items || []).map((i) => {
          const unitTs = parseUnit((i as any).unit || "").timeScale;
          return unitTs ??
            ((i as any).periodicity
              ? parseTimeScale((i as any).periodicity)
              : undefined);
        });

        const mCurrency = mode<string | undefined>(currencies);
        const mScale = mode<Scale | undefined>(scales as (Scale | undefined)[]);
        const mTime = mode<TimeScale | undefined>(timeScales);

        const selected: TargetsSelection = {
          currency: mCurrency.ratio >= thresh
            ? mCurrency.value
            : (context.config?.targetCurrency || undefined),
          magnitude: (mScale.ratio >= thresh
            ? mScale.value
            : (context.config?.targetMagnitude || "millions")) as Scale,
          time: mTime.ratio >= thresh
            ? mTime.value
            : (context.config?.targetTimeScale ?? context.prefer),
        };
        return { selected } as Partial<Ctx>;
      }),
      always: { target: "done" },
    },

    useConfig: {
      entry: assign(({ context }) => {
        const selected: TargetsSelection = {
          currency: context.config?.targetCurrency,
          magnitude: (context.config?.targetMagnitude ?? "millions") as Scale,
          time: context.prefer ?? context.config?.targetTimeScale,
        };
        return { selected } as Partial<Ctx>;
      }),
      always: { target: "done" },
    },

    done: {
      type: "final",
      output: ({ context }) =>
        ({ selected: context.selected || {} }) as TargetsOutput,
    },
  },
  output: ({ context }) =>
    ({ selected: context.selected || {} }) as TargetsOutput,
});
