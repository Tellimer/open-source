/*
Machine: Time-Basis Selection (Monetary)
Purpose: Derive preferred time scale from config/unit/periodicity with tie-breakers.
Inputs: { config, items }
Output: { preferredTimeScale, items? }
Key states: readConfig → inferByUnit → inferByPeriodicity → applyMajority → applyTieBreakers → setPreferred → done
*/

import { assign, setup } from "npm:xstate@^5.20.2";
import type { PipelineConfig } from "../../../economic-data-workflow.ts";
import type { ParsedData } from "../../../../main.ts";
import type { TimeScale } from "../../../../types.ts";
import { parseTimeScaleFromUnit } from "../../../../time/time-sampling.ts";

interface TimeBasisInput {
  config: PipelineConfig;
  items: ParsedData[];
}

interface TimeBasisOutput {
  items: ParsedData[];
  preferredTimeScale?: TimeScale;
}

export const timeBasisMachine = setup({
  types: {
    context: {} as {
      config: PipelineConfig;
      items: ParsedData[];
      tempUnitTimes?: (TimeScale | undefined)[];
      countsEffective?: Map<TimeScale, number>;
      knownEffective?: number;
      selected?: TimeScale;
      rule?: string;
    },
    input: {} as TimeBasisInput,
  },
}).createMachine({
  id: "timeBasisSelection",
  context: ({ input }) => ({ config: input.config, items: input.items }),
  initial: "readConfig",
  states: {
    readConfig: {
      always: [
        {
          target: "setPreferred",
          guard: ({ context }) => !!context.config.targetTimeScale,
          actions: assign(({ context }) => ({
            selected: context.config.targetTimeScale as TimeScale,
            rule: "target-config",
          })),
        },
        { target: "inferByUnit" },
      ],
    },

    inferByUnit: {
      entry: assign(({ context }) => ({
        tempUnitTimes: context.items.map((it) => parseTimeScaleFromUnit(it.unit || "") || undefined),
      })),
      always: { target: "inferByPeriodicity" },
    },

    inferByPeriodicity: {
      entry: assign(({ context }) => {
        const periodicityToScale = (p?: string): TimeScale | undefined => {
          if (!p) return undefined;
          const s = p.toLowerCase();
          if (s.startsWith("month")) return "month";
          if (s.startsWith("quarter")) return "quarter";
          if (s.startsWith("year")) return "year";
          if (s.startsWith("week")) return "week";
          if (s.startsWith("day")) return "day";
          return undefined;
        };
        const counts = new Map<TimeScale, number>();
        let known = 0;
        const unitList = context.tempUnitTimes || [];
        for (let i = 0; i < context.items.length; i++) {
          const it = context.items[i];
          const unitTs = unitList[i];
          const perTs = unitTs ? undefined : periodicityToScale((it as any).periodicity as string | undefined);
          const eff = unitTs || perTs;
          if (eff) {
            counts.set(eff, (counts.get(eff) || 0) + 1);
            known++;
          }
        }
        return { countsEffective: counts, knownEffective: known };
      }),
      always: { target: "applyMajority" },
    },

    applyMajority: {
      entry: assign(({ context }) => {
        const counts = context.countsEffective ?? new Map();
        const known = context.knownEffective ?? 0;
        if (known > 0) {
          let max = 0;
          let mode: TimeScale | undefined = undefined;
          for (const [k, v] of counts.entries()) {
            if (v > max) { max = v; mode = k; }
          }
          if (mode && max / known >= 0.6) {
            return { selected: mode, rule: "majority-effective" };
          }
        }
        return {};
      }),
      always: { target: "applyTieBreakers" },
    },

    applyTieBreakers: {
      entry: assign(({ context }) => {
        if (!context.selected && context.config.targetTimeScale) {
          return { selected: context.config.targetTimeScale as TimeScale, rule: "default-config" };
        }
        if (!context.selected && context.config.tieBreakers?.time === "prefer-month") {
          return { selected: "month" as TimeScale, rule: "prefer-month-default" };
        }
        return {};
      }),
      always: { target: "setPreferred" },
    },

    setPreferred: {
      entry: assign(({ context }) => {
        if (context.config.explain) {
          const periodicityToScale = (p?: string): TimeScale | undefined => {
            if (!p) return undefined;
            const s = p.toLowerCase();
            if (s.startsWith("month")) return "month";
            if (s.startsWith("quarter")) return "quarter";
            if (s.startsWith("year")) return "year";
            if (s.startsWith("week")) return "week";
            if (s.startsWith("day")) return "day";
            return undefined;
          };
          for (const it of context.items) {
            const inferred = periodicityToScale((it as any).periodicity as string | undefined) ||
              parseTimeScaleFromUnit(it.unit || "") || undefined;
            (it.explain ||= {} as any).timeBasisChoice = {
              preferred: context.selected,
              inferred,
              rule: context.rule ?? "no-preference",
            } as any;
          }
        }
        return {};
      }),
      always: { target: "done" },
    },

    done: {
      type: "final",
      output: ({ context }) => ({ items: context.items, preferredTimeScale: context.selected }) as TimeBasisOutput,
    },
  },
  output: ({ context }) => ({ items: context.items, preferredTimeScale: context.selected }) as TimeBasisOutput,
});

