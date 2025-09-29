import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import type { FXTable, Scale, TimeScale } from "../../shared/types.ts";
import type { ParsedData } from "../../shared/types.ts";
import { timeBasisMachine } from "./time_basis.machine.ts";
import { targetsMachine } from "./targets.machine.ts";
import { normalizeMonetaryBatch } from "./batch.ts";
import { autoTargetEnabled, hasConfigTargetTime } from "../../shared/guards.ts";
import { parseUnit } from "../../shared/units.ts";
import { getScale } from "../../shared/scale.ts";

interface MonetaryInput {
  config: {
    targetCurrency?: string;
    targetMagnitude?: Scale;
    targetTimeScale?: TimeScale;
    autoTargetByIndicator?: boolean;
    explain?: boolean;
  } & Record<string, unknown>;
  items: ParsedData[];
  isStock?: boolean; // Flag to indicate if items are stocks (true) or flows (false)
  fx?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
  autoTargets?: Map<string, any> | Record<string, any>; // Global auto-targets from pipeline
}
interface MonetaryOutput {
  items: ParsedData[];
}

export const monetaryMachine = setup({
  types: {
    context: {} as MonetaryInput & {
      preferredTime?: TimeScale;
      selected?: { currency?: string; magnitude?: Scale; time?: TimeScale };
    },
    input: {} as MonetaryInput,
  },
  actors: {
    batch: fromPromise(async ({
      input,
    }: {
      input: Required<Pick<MonetaryInput, "items" | "config">> & {
        isStock?: boolean;
        preferredTime?: TimeScale;
        selected?: { currency?: string; magnitude?: Scale; time?: TimeScale };
        fx?: FXTable;
        fxSource?: "live" | "fallback";
        fxSourceId?: string;
        autoTargets?: Map<string, any> | Record<string, any>;
      };
    }) => {
      const hasGlobalTargets = !!(input.autoTargets && (
        input.autoTargets instanceof Map
          ? input.autoTargets.size > 0
          : Object.keys(input.autoTargets).length > 0
      ));

      if (hasGlobalTargets) {
        const indicatorKeyName = (input.config as any).indicatorKey ?? "name";
        const targetsMap: Map<string, any> = input.autoTargets instanceof Map
          ? input.autoTargets
          : new Map<string, any>(
            Object.entries(input.autoTargets as Record<string, any>),
          );

        const groups = new Map<string, ParsedData[]>();
        for (const item of input.items) {
          const key = String(
            (item as any)[indicatorKeyName] || item.name || "",
          );
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(item);
        }

        const threshold = (input.config as any)?.minMajorityShare ?? 0.8;
        const results: ParsedData[] = [];

        const extractUnitTime = (u: string): string | undefined => {
          const m =
            /per\s+(month|quarter|year|week|day|hour)|\/(month|quarter|year|week|day|hour)/i
              .exec(
                u,
              );
          return (m?.[1] || m?.[2])?.toLowerCase();
        };

        // Compute global dominance across entire batch for currency & magnitude
        const totalN = input.items.length || 0;
        const curCounts = new Map<string, number>();
        const magCounts = new Map<string, number>();
        for (const it of input.items) {
          const parsed = parseUnit((it as any).unit || "");
          const cur =
            (parsed.currency || (it as any).currency_code?.toUpperCase() ||
              undefined) as string | undefined;
          const mag =
            ((parsed.scale as string | undefined) || ((it as any).scale
              ? getScale((it as any).scale as any)
              : undefined)) as string | undefined;
          if (cur) {
            curCounts.set(cur, (curCounts.get(cur) || 0) + 1);
          }
          if (mag && mag !== "ones") {
            magCounts.set(mag, (magCounts.get(mag) || 0) + 1);
          }
        }
        const topOf = (m: Map<string, number>) => {
          let k: string | undefined;
          let c = 0;
          for (const [kk, vv] of m.entries()) {
            if (vv > c) {
              k = kk;
              c = vv;
            }
          }
          const share = totalN > 0 ? c / totalN : 0;
          return { key: k, share };
        };
        const gCur = topOf(curCounts);
        const gMag = topOf(magCounts);
        const globalCurrency = gCur.key && gCur.share >= threshold
          ? gCur.key
          : undefined;
        const globalMagnitude = gMag.key && gMag.share >= threshold
          ? (gMag.key as Scale)
          : undefined;

        // Compute global time dominance across entire batch (flows-only, symmetric)
        const timeCounts = new Map<string, number>();
        for (const it of input.items) {
          const u = String((it as any).unit || "").toLowerCase();
          const t = extractUnitTime(u) || (String((it as any).periodicity || "").toLowerCase() || undefined);
          if (t) timeCounts.set(t, (timeCounts.get(t) || 0) + 1);
        }
        const gTime = topOf(timeCounts);
        const globalTime: TimeScale | undefined = (!input.isStock) && gTime.key && gTime.share >= threshold
          ? (gTime.key as TimeScale)
          : undefined;

        for (const [key, items] of groups.entries()) {
          const tg = targetsMap.get(key) as any;

          const unitTimes = items
            .map((i) => (i.unit || "").toLowerCase())
            .map((u) => extractUnitTime(u))
            .filter(Boolean) as string[];
          const counts = new Map<string, number>();
          for (const t of unitTimes) counts.set(t, (counts.get(t) || 0) + 1);
          let best: string | undefined;
          let bestCount = 0;
          for (const [k, c] of counts.entries()) {
            if (c > bestCount) {
              best = k;
              bestCount = c;
            }
          }
          const ratio = items.length > 0 ? bestCount / items.length : 0;
          const resolvedTimeBase: TimeScale | undefined =
            (best && ratio >= threshold)
              ? (best as TimeScale)
              : ((tg?.time as TimeScale | undefined) ||
                (input.config.targetTimeScale as TimeScale | undefined) ||
                input.preferredTime);
          const resolvedTime: TimeScale | undefined = globalTime ?? resolvedTimeBase;

          if ((input.config as any)?.explain && tg) {
            for (const item of items) {
              (item as any).explain ||= {};
              const baseReason = tg.reason || "global-auto-target";
              const reason = globalTime
                ? `${baseReason}; time=global-majority(${String(globalTime)},${gTime.share.toFixed(2)})`
                : baseReason;
              (item as any).explain.targetSelection = {
                mode: "auto-by-indicator",
                indicatorKey: key,
                selected: {
                  currency: (globalCurrency ?? tg.currency),
                  magnitude:
                    (globalMagnitude ?? (tg.magnitude as Scale | undefined)),
                  time: resolvedTime,
                },
                shares: tg.shares || {},
                reason,
              };
            }
          }

          const out = await normalizeMonetaryBatch(items, {
            isStock: input.isStock,
            toCurrency:
              (globalCurrency ?? (tg?.currency ?? input.config.targetCurrency)),
            toMagnitude:
              (globalMagnitude ?? ((tg?.magnitude as Scale | undefined) ??
                (input.config.targetMagnitude as Scale | undefined))),
            toTimeScale: resolvedTime,
            fx: input.fx,
            explain: (input.config as any)?.explain ?? true,
            fxSource: input.fxSource,
            fxSourceId: input.fxSourceId,
          });
          // Stamp explicit domain bucket on each item when explain is enabled
          if ((input.config as any)?.explain) {
            const bucket = input.isStock ? "monetaryStock" : "monetaryFlow";
            for (const it of out as ParsedData[]) {
              (it as any).explain ||= {};
              (it as any).explain.domain = { bucket };
            }
          }
          results.push(...(out as ParsedData[]));
        }

        return results;
      }

      const toCurrency = input.selected?.currency ??
        input.config.targetCurrency;
      const toMagnitude = (input.selected?.magnitude as Scale | undefined) ??
        (input.config.targetMagnitude as Scale | undefined);
      const toTimeScale = (input.selected?.time as TimeScale | undefined) ??
        input.preferredTime ?? input.config.targetTimeScale;
      const out = await normalizeMonetaryBatch(input.items, {
        isStock: input.isStock,
        toCurrency,
        toMagnitude,
        toTimeScale,
        fx: input.fx,
        explain: (input.config as any)?.explain ?? true,
        fxSource: input.fxSource,
        fxSourceId: input.fxSourceId,
      });
      // Stamp explicit domain bucket on each item when explain is enabled
      if ((input.config as any)?.explain) {
        const bucket = input.isStock ? "monetaryStock" : "monetaryFlow";
        for (const it of out as ParsedData[]) {
          (it as any).explain ||= {};
          (it as any).explain.domain = { bucket };
        }
      }
      return out as ParsedData[];
    }),
  },
}).createMachine({
  id: "monetaryV2",
  context: ({ input }) => ({
    ...input,
    preferredTime: undefined,
    selected: undefined,
  }),
  initial: "timeBasis",
  states: {
    timeBasis: {
      initial: "decide",
      states: {
        decide: {
          always: [
            { guard: hasConfigTargetTime(), target: "done" },
            { target: "infer" },
          ],
        },
        infer: {
          invoke: {
            src: timeBasisMachine,
            input: ({ context }) => ({ items: context.items, prefer: "month" }),
            onDone: {
              target: "done",
              actions: [
                assign({
                  preferredTime: ({ event }) =>
                    (event as any).output.preferredTimeScale,
                }),
                () => console.log("[V2 monetary] time-basis inferred"),
              ],
            },
          },
        },
        done: { type: "final" },
      },
      onDone: "targets",
    },
    targets: {
      initial: "decide",
      states: {
        decide: {
          entry: ({ context }) => {
            console.log(
              `[V2 monetary] Targets decision - autoTargets:`,
              context.autoTargets,
            );
            console.log(
              `[V2 monetary] Targets decision - autoTargetByIndicator:`,
              context.config.autoTargetByIndicator,
            );
          },
          always: [
            {
              guard: ({ context }) => {
                const hasTargets = context.autoTargets &&
                  (context.autoTargets instanceof Map
                    ? context.autoTargets.size > 0
                    : Object.keys(context.autoTargets).length > 0);
                console.log(
                  `[V2 monetary] Guard useGlobalTargets: ${hasTargets} (Map size: ${
                    context.autoTargets instanceof Map
                      ? context.autoTargets.size
                      : "not a map"
                  })`,
                );
                return !!hasTargets;
              },
              target: "useGlobalTargets",
            },
            {
              guard: ({ context }) => {
                const autoEnabled = autoTargetEnabled()({ context } as any);
                console.log(`[V2 monetary] Guard auto: ${autoEnabled}`);
                return autoEnabled;
              },
              target: "auto",
            },
            { target: "useConfig" },
          ],
        },
        auto: {
          invoke: {
            src: targetsMachine,
            input: ({ context }) => ({
              items: context.items,
              config: context.config,
              prefer: context.preferredTime ?? "month",
            }),
            onDone: {
              target: "done",
              actions: [
                assign({
                  selected: ({ event }) => (event as any).output.selected,
                }),
                assign(({ context, event }) => {
                  try {
                    if ((context.config as any)?.explain) {
                      const sel = (event as any).output.selected as
                        | {
                          currency?: string;
                          magnitude?: Scale;
                          time?: TimeScale;
                        }
                        | undefined;
                      const indicatorKey = context.items[0]?.name || "";
                      if (sel) {
                        for (const item of context.items) {
                          (item as any).explain ||= {};
                          (item as any).explain.targetSelection = {
                            mode: "auto-by-indicator",
                            indicatorKey,
                            selected: {
                              currency: sel.currency,
                              magnitude: sel.magnitude,
                              time: sel.time,
                            },
                            // Local auto-target doesn't compute shares; global targets will
                            // populate shares when available.
                            shares: undefined,
                            reason: "local-auto-target",
                          };
                        }
                      }
                    }
                  } catch (_) {
                    // best-effort explain enrichment; do not fail the pipeline
                  }
                  return {} as any;
                }),
              ],
            },
          },
        },
        useConfig: {
          entry: assign({
            selected: ({ context }) => ({
              currency: context.config.targetCurrency,
              magnitude:
                (context.config.targetMagnitude as Scale | undefined) ??
                  "millions",
              time: context.config.targetTimeScale ?? context.preferredTime,
            }),
          }),
          always: { target: "done" },
        },
        useGlobalTargets: {
          entry: assign((_args) => ({
            // Defer target resolution to the batch actor per-indicator cohort
            selected: undefined,
          })),
          always: { target: "done" },
        },
        done: { type: "final" },
      },
      onDone: "batch",
    },
    batch: {
      invoke: {
        src: "batch",
        input: ({ context }) => ({
          items: context.items,
          config: context.config,
          isStock: context.isStock,
          preferredTime: context.preferredTime,
          selected: context.selected,
          fx: context.fx,
          fxSource: context.fxSource,
          fxSourceId: context.fxSourceId,
          autoTargets: context.autoTargets,
        }),
        onDone: {
          target: "done",
          actions: [
            assign({
              items: ({ event }) => (event as any).output as ParsedData[],
            }),
            () => console.log("[V2 monetary] batch done"),
          ],
        },
      },
    },
    done: {
      type: "final",
      output: ({ context }) => ({ items: context.items }) as MonetaryOutput,
    },
  },
  output: ({ context }) => ({ items: context.items }) as MonetaryOutput,
});
