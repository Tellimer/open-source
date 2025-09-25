/*
Machine: Default Monetary Domain
Purpose: Core monetary normalization using selected time basis; wires timeBasisMachine child.
Inputs: { config, items, fxRates?, fxSource?, fxSourceId?, explain? }
Output: { processed }
Key states: prepare → timeBasis (invoke) → coreNormalize → done
*/

import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import type { PipelineConfig } from "../../../economic-data-workflow.ts";
import type { ParsedData } from "../../../../main.ts";
import type { FXTable, Scale, TimeScale } from "../../../../types.ts";
import { processBatch } from "../../../../batch/batch.ts";
import {
  type AutoTargets,
  computeAutoTargets,
} from "../../../../normalization/auto_targets.ts";
import { timeBasisMachine } from "./time_basis.machine.ts";
import { enhanceExplainWithFXSource } from "../../../../normalization/explain.ts";
import { autoTargetMachine } from "../../targets/index.ts";
import { monetaryNormalizationMachine } from "./monetary_normalization.machine.ts";

interface DefaultMonetaryInput {
  config: PipelineConfig;
  items: ParsedData[];
  fx?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
  autoTargets?: AutoTargets;
}

interface DefaultMonetaryOutput {
  items: ParsedData[];
  explain?: boolean;
}

export const defaultMonetaryMachine = setup({
  types: {
    context: {} as {
      config: PipelineConfig;
      items: ParsedData[];
      fx?: FXTable;
      explain?: boolean;
      preferredTimeScale?: TimeScale;
      fxSource?: "live" | "fallback";
      fxSourceId?: string;
      autoTargets?: AutoTargets;
    },
    input: {} as DefaultMonetaryInput,
  },
  actors: {
    autoTarget: fromPromise(
      async ({ input }: { input: DefaultMonetaryInput }) => {
        // TODO: integrate computeAutoTargets and group-by-indicator selection
        return input.items;
      },
    ),

    coreNormalize: fromPromise(
      async ({ input }: { input: DefaultMonetaryInput }) => {
        const { config, items, fx, fxSource, fxSourceId } = input;
        const preferredTimeScale = (input as any).preferredTimeScale as
          | TimeScale
          | undefined;
        const batchOptions = {
          validate: false as const,
          handleErrors: "skip" as const,
          parallel: true,
          toCurrency: config.targetCurrency,
          toMagnitude: config.targetMagnitude as Scale,
          toTimeScale: preferredTimeScale ?? config.targetTimeScale,
          fx,
          explain: config.explain,
        };

        const out: ParsedData[] = [];

        if (config.autoTargetByIndicator) {
          const precomputed = (input as any).autoTargets as
            | AutoTargets
            | undefined;
          const auto = precomputed ?? computeAutoTargets(items, {
            indicatorKey: config.indicatorKey ?? "name",
            autoTargetDimensions: config.autoTargetDimensions,
            minMajorityShare: config.minMajorityShare,
            tieBreakers: config.tieBreakers,
            targetCurrency: config.targetCurrency,
            allowList: config.allowList,
            denyList: config.denyList,
          });
          const groups = new Map<string, ParsedData[]>();
          for (const it of items) {
            const key = String(it.name ?? "");
            const list = groups.get(key) ?? [];
            list.push(it);
            groups.set(key, list);
          }
          for (const [key, grpItems] of groups.entries()) {
            const sel = auto.get(key);
            // Decide time selection for auto-target: use unit/periodicity-derived selection when time dimension is enabled
            const timeDimEnabled =
              (config.autoTargetDimensions ?? ["currency", "magnitude", "time"]).includes("time");
            const selectedTime = timeDimEnabled
              ? sel?.time
              : (batchOptions.toTimeScale as TimeScale | undefined);
            const res = await processBatch(grpItems, {
              ...batchOptions,
              toCurrency: sel?.currency ?? batchOptions.toCurrency,
              toMagnitude: (sel?.magnitude as Scale | undefined) ?? batchOptions.toMagnitude,
              toTimeScale: selectedTime,
            });
            // Attach explain.targetSelection if requested
            if (config.explain && sel) {
              for (const m of res.successful) {
                (m.explain ||= {}).targetSelection = {
                  mode: "auto-by-indicator",
                  indicatorKey: key,
                  selected: {
                    currency: sel.currency,
                    magnitude: sel.magnitude as Scale | undefined,
                    time: selectedTime,
                  },
                  shares: sel.shares as any,
                  reason: sel.reason ?? (sel.currency || sel.magnitude || sel.time ? "majority/tie-break" : "none"),
                } as any;

                // Enrich FX source info if available
                if (m.explain?.fx && (fxSource || fxSourceId)) {
                  const asOf = m.explain.fx.asOf;
                  m.explain = enhanceExplainWithFXSource(
                    m.explain as any,
                    (fxSource ?? "fallback") as any,
                    fxSourceId,
                    asOf,
                  );
                }
              }
            } else if (config.explain) {
              // Even without a selected auto target, attach FX source info if present
              for (const m of res.successful) {
                if (m.explain?.fx && (fxSource || fxSourceId)) {
                  const asOf = m.explain.fx.asOf;
                  m.explain = enhanceExplainWithFXSource(
                    m.explain as any,
                    (fxSource ?? "fallback") as any,
                    fxSourceId,
                    asOf,
                  );
                }
              }
            }
            out.push(...res.successful);
          }
        } else {
          const res = await processBatch(items, batchOptions);
          if (config.explain) {
            for (const m of res.successful) {
              if (m.explain?.fx && (fxSource || fxSourceId)) {
                const asOf = m.explain.fx.asOf;
                m.explain = enhanceExplainWithFXSource(
                  m.explain as any,
                  (fxSource ?? "fallback") as any,
                  fxSourceId,
                  asOf,
                );
              }
            }
          }
          out.push(...res.successful);
        }

        return out;
      },
    ),
    attachExplain: fromPromise(
      async ({ input }: { input: DefaultMonetaryInput }) => {
        // TODO: build explain metadata per item; for now, pass-through
        return input.items;
      },
    ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QTAMwIYFcA2AXAsgPYB2Yu6ATgJ4B0WuhAKpTLgJbFQDEEJYNHAG6EA1vxQYcBPuWp1MDZhVYcoCIYQDG6diQDaABgC6ho4lAAHQrDa7i5kAA9EAJgMA2Gh5cAWAOwuAKwAnO4+AIzBBn4ANCBUiAAcAMxeLsk+7r5+ie4G-skAvoVxElh4RKSytOwAtmAAQug2sDx8AsTCYjRlUpVklDVs9U0t6p1aOmz6xqYOVjZ2Ds4IOQZefgZBfj7J4YE+LuFxCQgpaRlZ-rn5fkUlIL0VMoM0xIQUtejYbABeqm1SB0uuI0OVpFVXu9Pt8-qpxsJtHZTHMkCAFrZpvY0Stwm5gjQfIFkvkfMEdrljvEkqktpdsjcCsVSmC+i85GBHBZsOgOADeECNN0nhCBhyuTy+ZwEZNkbNjPNrJiSMtEOEsi4aMlEi53MFDolgpFkoETjSLpkGXkmcyQO8UPA0SL+tVFYssaqEABadxm73uW3O9m0ehMFhkVRu5XY0ArQ5+xLhGiBAyp8J+dzhPFhHWB1nPSFyOqNZpsR2WJVLHGIA4EgzBZKbLYuYLk8I+BNJlNpjNZ3U+RKBPOSAti2jQr4-f6cKNV2OIYKGrz7QKBHbJYKBdNU06J5OpgzpzPZgdDh5Bwu0Tnc3nESNojFzpxqnzRGiD4IuPzE9V5Ted-dUwCdxEhyMkMmHcEXVeAUwFnD1qwQcJEx8d8KUCPIQOQlw-XCAxUm-VMjl2PE-FCM9iiAA */
  id: "defaultMonetary",
  context: ({ input }) => ({
    config: input.config,
    items: input.items,
    fx: input.fx,
    explain: input.config.explain,
    preferredTimeScale: input.config.targetTimeScale as TimeScale | undefined,
    fxSource: input.fxSource,
    fxSourceId: input.fxSourceId,
  }),
  initial: "autoTargeting",
  states: {
    autoTargeting: {
      invoke: {
        src: autoTargetMachine,
        input: ({ context }) => ({
          config: context.config,
          items: context.items,
        }),
        onDone: {
          target: "timeBasis",
          actions: assign({
            autoTargets: ({ event }) => (event as any).output.selections,
          }),
        },
      },
    },
    timeBasis: {
      invoke: {
        src: timeBasisMachine,
        input: ({ context }) => ({
          config: context.config,
          items: context.items,
          fx: context.fx,
        }),
        onDone: {
          target: "normalizing",
          actions: assign({
            items: ({ event }) => (event as any)?.output?.items ?? [],
            preferredTimeScale: ({ event }) =>
              (event as any)?.output?.preferredTimeScale,
          }),
        },
      },
    },
    normalizing: {
      invoke: {
        src: monetaryNormalizationMachine,
        input: ({ context }) => ({
          config: context.config,
          items: context.items,
          fx: context.fx,
          fxSource: context.fxSource,
          fxSourceId: context.fxSourceId,
          preferredTimeScale: context.preferredTimeScale,
          autoTargets: context.autoTargets,
        }),
        onDone: {
          target: "explaining",
          actions: assign({ items: ({ event }) => (event as any).output.items }),
        },
      },
    },
    explaining: {
      invoke: {
        src: "attachExplain",
        input: ({ context }) => ({
          config: context.config,
          items: context.items,
          fx: context.fx,
        }),
        onDone: {
          target: "done",
          actions: assign({ items: ({ event }) => event.output }),
        },
      },
    },
    done: {
      type: "final",
      output: ({ context }): DefaultMonetaryOutput => ({
        items: context.items,
        explain: context.explain,
      }),
    },
  },
  output: ({ context }): DefaultMonetaryOutput => ({
    items: context.items,
    explain: context.explain,
  }),
});

