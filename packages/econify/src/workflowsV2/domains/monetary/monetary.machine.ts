import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import type { FXTable, Scale, TimeScale } from "../../shared/types.ts";
import type { ParsedData } from "../../shared/types.ts";
import { timeBasisMachine } from "./time_basis.machine.ts";
import { targetsMachine } from "./targets.machine.ts";
import { normalizeMonetaryBatch } from "./batch.ts";
import { autoTargetEnabled, hasConfigTargetTime } from "../../shared/guards.ts";

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
      };
    }) => {
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
        explain: input.config.explain ?? true,
        fxSource: input.fxSource,
        fxSourceId: input.fxSourceId,
      });
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
          entry: assign(({ context }) => {
            // Extract auto-targets for the first item (assuming all items in this batch have same indicator)
            const firstItem = context.items[0];
            if (!firstItem || !context.autoTargets) {
              return {
                selected: {
                  currency: context.config.targetCurrency,
                  magnitude:
                    (context.config.targetMagnitude as Scale | undefined) ??
                      "millions",
                  time: context.config.targetTimeScale ?? context.preferredTime,
                },
              };
            }

            const indicatorKey = firstItem.name || "";
            const targets = context.autoTargets instanceof Map
              ? context.autoTargets.get(indicatorKey)
              : (context.autoTargets as Record<string, any>)[indicatorKey];

            console.log(
              `[V2 monetary] Using global auto-targets for "${indicatorKey}":`,
              targets,
            );

            // Decide time with unit precedence within this batch
            // If any item has a time token in its unit, prefer the mode of unit time tokens
            // BUT only if it is dominant (>= 0.8). Otherwise, fall back to global auto-target
            // selection, then pipeline config, then inferred preferred time.
            const unitTimes = (context.items || [])
              .map((i) => (i.unit || "").toLowerCase())
              .map((u) =>
                /per\s+(month|quarter|year|week|day|hour)|\/(month|quarter|year|week|day|hour)/i
                  .exec(u)?.[1] ||
                (/\/(month|quarter|year|week|day|hour)/i.exec(u)?.[1])
              )
              .filter(Boolean) as string[];

            const { bestUnitTime, bestUnitRatio } = (() => {
              const counts = new Map<string, number>();
              for (const t of unitTimes) {
                counts.set(t, (counts.get(t) || 0) + 1);
              }
              let best: string | undefined;
              let bestCount = 0;
              for (const [k, c] of counts.entries()) {
                if (c > bestCount) {
                  best = k;
                  bestCount = c;
                }
              }
              const totalItems = (context.items || []).length;
              const ratio = totalItems > 0 ? bestCount / totalItems : 0;
              return {
                bestUnitTime: best as TimeScale | undefined,
                bestUnitRatio: ratio,
              };
            })();

            const threshold = (context.config as any)?.minMajorityShare ?? 0.8;
            const resolvedTime: TimeScale | undefined =
              (bestUnitTime && bestUnitRatio >= threshold)
                ? (bestUnitTime as TimeScale)
                : ((targets?.time as TimeScale | undefined) ||
                  context.config.targetTimeScale || context.preferredTime);

            // Populate explain.targetSelection for all items when using global auto-targets
            if (context.config.explain && targets) {
              for (const item of context.items) {
                (item.explain ||= {}).targetSelection = {
                  mode: "auto-by-indicator",
                  indicatorKey: indicatorKey,
                  selected: {
                    currency: targets.currency,
                    magnitude: targets.magnitude as Scale | undefined,
                    time: resolvedTime,
                  },
                  shares: targets.shares || {},
                  reason: targets.reason || "global-auto-target",
                };
              }
            }

            return {
              selected: {
                currency: targets?.currency || context.config.targetCurrency,
                magnitude: (targets?.magnitude as Scale | undefined) ||
                  (context.config.targetMagnitude as Scale | undefined) ||
                  "millions",
                time: resolvedTime,
              },
            };
          }),
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
