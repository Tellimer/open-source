import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../../../../main.ts";
import type { FXTable, Scale, TimeScale } from "../../../../types.ts";
import type { PipelineConfig } from "../../../economic-data-workflow.ts";
import { processBatch } from "../../../../batch/batch.ts";
import { enhanceExplainWithFXSource } from "../../../../normalization/explain.ts";
import {
  type AutoTargets,
  type AutoTargetSelection,
  computeAutoTargets,
} from "../../../../normalization/auto_targets.ts";

interface MonetaryNormalizationInput {
  config: PipelineConfig;
  items: ParsedData[];
  fx?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
  preferredTimeScale?: TimeScale;
  autoTargets?: AutoTargets;
}

interface MonetaryNormalizationOutput {
  items: ParsedData[];
}

interface Group {
  key: string;
  items: ParsedData[];
  selection?: AutoTargetSelection;
}

export const monetaryNormalizationMachine = setup({
  types: {
    context: {} as {
      config: PipelineConfig;
      items: ParsedData[];
      fx?: FXTable;
      fxSource?: "live" | "fallback";
      fxSourceId?: string;
      preferredTimeScale?: TimeScale;
      autoTargets?: AutoTargets;
      groups?: Group[];
      groupIndex?: number;
      out: ParsedData[];
    },
    input: {} as MonetaryNormalizationInput,
  },
  actors: {
    resolveAutoTargets: fromPromise(
      async ({ input }: { input: MonetaryNormalizationInput }) => {
        if (input.autoTargets) return input.autoTargets;
        if (!input.config.autoTargetByIndicator) {
          return undefined as unknown as AutoTargets;
        }
        // Compute if requested but not provided
        const selections = computeAutoTargets(input.items, {
          indicatorKey: input.config.indicatorKey ?? "name",
          autoTargetDimensions: input.config.autoTargetDimensions,
          minMajorityShare: input.config.minMajorityShare,
          tieBreakers: input.config.tieBreakers,
          targetCurrency: input.config.targetCurrency,
          allowList: input.config.allowList,
          denyList: input.config.denyList,
        });
        return selections;
      },
    ),
    normalizeGroup: fromPromise(
      async (
        { input }: { input: MonetaryNormalizationInput & { group: Group } },
      ) => {
        const { config, fx, preferredTimeScale, fxSource, fxSourceId } = input;
        const sel = input.group.selection;
        const res = await processBatch(input.group.items, {
          validate: false as const,
          handleErrors: "skip" as const,
          parallel: true,
          toCurrency: sel?.currency ?? config.targetCurrency,
          toMagnitude: (sel?.magnitude as Scale | undefined) ??
            (config.targetMagnitude as Scale | undefined),
          toTimeScale: (sel?.time as TimeScale | undefined) ??
            preferredTimeScale ?? config.targetTimeScale,
          fx,
          explain: config.explain,
        });

        // Attach explain.targetSelection and enrich FX source if requested
        if (config.explain) {
          for (const m of res.successful) {
            if (sel) {
              (m.explain ||= {}).targetSelection = {
                mode: "auto-by-indicator",
                indicatorKey: input.group.key,
                selected: {
                  currency: sel.currency,
                  magnitude: sel.magnitude as Scale | undefined,
                  time: (sel.time as TimeScale | undefined) ??
                    preferredTimeScale ??
                    (config.targetTimeScale as TimeScale | undefined),
                },
                shares: sel.shares as any,
                reason: sel.reason ??
                  (sel.currency || sel.magnitude || sel.time
                    ? "majority/tie-break"
                    : "none"),
              } as any;
            }
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

        return res.successful as ParsedData[];
      },
    ),
    batchAll: fromPromise(
      async ({ input }: { input: MonetaryNormalizationInput }) => {
        const { config, items, fx, fxSource, fxSourceId, preferredTimeScale } =
          input;
        const res = await processBatch(items, {
          validate: false as const,
          handleErrors: "skip" as const,
          parallel: true,
          toCurrency: config.targetCurrency,
          toMagnitude: config.targetMagnitude as Scale,
          toTimeScale: preferredTimeScale ?? config.targetTimeScale,
          fx,
          explain: config.explain,
        });
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
        return res.successful as ParsedData[];
      },
    ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QEMCuAXA9gFwPZgC4C0A5AMYDGAFmZQHpsBO6A1gJYB2WkAD0QCMmHAG1EAbmGIA2gAYBbXTGkR5KAM0wAnqQCMANgCcAbkUePWlU8AvmJzyA7YuwpqAXwYAbGACwqk8NQ0TC4QAJgB2cMEALZxEACbE2MSARJk8zJkQXHysQhKw4gikNHRU6kI1WgC4lCkAA1Q6HF4cQkpotPZ2lk5GADdOpJ9Xc1t7QWDw5dHxCzl8Xj4B6rQ8YgkpFQ1sDQAtXQoXcKgqAC8ANwgqzJzC2rEisOM0qgC3Xl6uFJ7dH2+JgA2lqkQgZ3O4zKgAyWHm+0wGkM2m0OIAkqmsxmMABWkBjKRcCIBQKQzGPx+f1GAE2k2mcnD0+gUah02n0OmsdGILG6gAVTA62Qw2yiqFBTOiENMopN9mu8qkBJ4M5xBOwAIy1qI+ey6eI8WkvFMYoQbKQacdOB0Vb8fE4Ck49C0hgaN2o01u53PX0d1Gg8a9S-KYtH5Vey44MuskK1W8ul0gV0h0B0eU0+2cOVU+z0e9oBO8QVw0AA5lcBB4NV+f1qlI0uOxiFyaytUk0oF0yH0ySgqGgqk0q0qQ0HgoWgz2gO0OkgA */
  id: "monetaryNormalization",
  context: ({ input }) => ({
    config: input.config,
    items: input.items,
    fx: input.fx,
    fxSource: input.fxSource,
    fxSourceId: input.fxSourceId,
    preferredTimeScale: input.preferredTimeScale,
    autoTargets: input.autoTargets,
    groups: undefined,
    groupIndex: 0,
    out: [],
  }),
  initial: "prepareBatchOptions",
  states: {
    prepareBatchOptions: {
      always: [
        {
          guard: ({ context }) => !!context.config.autoTargetByIndicator,
          target: "resolveAutoTargets",
        },
        { target: "batchAll" },
      ],
    },
    resolveAutoTargets: {
      invoke: {
        src: "resolveAutoTargets",
        input: ({ context }) => ({
          config: context.config,
          items: context.items,
        }),
        onDone: {
          target: "groupByIndicator",
          actions: assign({
            autoTargets: ({ event }) => (event as any).output,
          }),
        },
        onError: { target: "groupByIndicator" },
      },
    },
    groupByIndicator: {
      entry: assign(({ context }) => {
        const groupsMap = new Map<string, ParsedData[]>();
        const keyField =
          (context.config.indicatorKey ?? "name") as keyof ParsedData;
        for (const it of context.items) {
          const key = String((it as any)[keyField] ?? it.name ?? "");
          const list = groupsMap.get(key) ?? [];
          list.push(it);
          groupsMap.set(key, list);
        }
        const groups: Group[] = [];
        for (const [key, items] of groupsMap.entries()) {
          const selection = context.autoTargets?.get(key) as
            | AutoTargetSelection
            | undefined;
          groups.push({ key, items, selection });
        }
        return { groups, groupIndex: 0 };
      }),
      always: { target: "normalizeNextGroup" },
    },
    normalizeNextGroup: {
      always: [
        {
          guard: ({ context }) => (context.groups?.length ?? 0) === 0,
          target: "enrichExplainFX",
        },
        {
          guard: ({ context }) =>
            (context.groupIndex ?? 0) >= (context.groups?.length ?? 0),
          target: "enrichExplainFX",
        },
        { target: "runGroup" },
      ],
    },
    runGroup: {
      invoke: {
        src: "normalizeGroup",
        input: ({ context }) => ({
          config: context.config,
          items: context.items,
          fx: context.fx,
          fxSource: context.fxSource,
          fxSourceId: context.fxSourceId,
          preferredTimeScale: context.preferredTimeScale,
          group: context.groups![context.groupIndex!],
        }),
        onDone: {
          target: "accumulateAndNext",
          actions: assign(({ context, event }) => ({
            out: [...context.out, ...((event as any).output as ParsedData[])],
          })),
        },
        onError: { target: "accumulateAndNext" },
      },
    },
    accumulateAndNext: {
      entry: assign(({ context }) => ({
        groupIndex: (context.groupIndex ?? 0) + 1,
      })),
      always: { target: "normalizeNextGroup" },
    },
    batchAll: {
      invoke: {
        src: "batchAll",
        input: ({ context }) => ({
          config: context.config,
          items: context.items,
          fx: context.fx,
          fxSource: context.fxSource,
          fxSourceId: context.fxSourceId,
          preferredTimeScale: context.preferredTimeScale,
        }),
        onDone: {
          target: "assignBatchAll",
          actions: assign({
            out: ({ event }) => (event as any).output as ParsedData[],
          }),
        },
      },
    },
    assignBatchAll: { always: { target: "enrichExplainFX" } },
    enrichExplainFX: {
      // No-op here because we enriched per-batch; keep for visual clarity
      always: { target: "done" },
    },
    done: {
      type: "final",
      output: ({ context }): MonetaryNormalizationOutput => ({
        items: context.out,
      }),
    },
  },
  output: ({ context }): MonetaryNormalizationOutput => ({
    items: context.out,
  }),
});
