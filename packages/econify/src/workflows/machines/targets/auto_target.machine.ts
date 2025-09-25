import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import type { ParsedData, Scale } from "../../../main.ts";
import type { PipelineConfig } from "../../economic-data-workflow.ts";
import type {
  AutoTargetOptions,
  AutoTargets,
  AutoTargetSelection,
} from "../../../normalization/auto_targets.ts";
import { computeAutoTargets } from "../../../normalization/auto_targets.ts";

interface AutoTargetInput {
  config: PipelineConfig;
  items: ParsedData[];
}

interface AutoTargetOutput {
  selections: AutoTargets;
}

export const autoTargetMachine = setup({
  types: {
    context: {} as {
      config: PipelineConfig;
      items: ParsedData[];
      grouped?: Map<string, ParsedData[]>;
      selections?: AutoTargets;
    },
    input: {} as AutoTargetInput,
  },
  actors: {
    compute: fromPromise(async ({ input }: { input: AutoTargetInput }) => {
      const { config, items } = input;
      const opts: AutoTargetOptions = {
        indicatorKey: config.indicatorKey ?? "name",
        autoTargetDimensions: config.autoTargetDimensions,
        minMajorityShare: config.minMajorityShare,
        // Use configured tieBreakers as-is. If magnitude tie-break is unresolved and
        // no magnitude is selected by computeAutoTargets, we may fall back to
        // pipeline-config targetMagnitude in a post-processing step.
        tieBreakers: { ...config.tieBreakers },
        targetCurrency: config.targetCurrency,
        allowList: config.allowList,
        denyList: config.denyList,
      };
      const selections = computeAutoTargets(items, opts);
      return { selections } as AutoTargetOutput;
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QEMCuAXA9gFWQJxnQDoo9NUAHASwDsoBiAbQAYBdRUCzWK9KzGhxAAPRMwA0IAJ5iAvrMlosuAmGIBjTAFsKGWgwgCwRWgDdMAa2NKc+QkU069dBGczrkfAS1Y+hXHi9BJBExSRkEZnlFDFtVYjw4TAAbU30mNn9uXn5g0FFI8LlokBpMCDghGxVCLMDcoQKAWgAWAA4ihCa2gHYiFoBOIYAmAba2gGYWgEZZgDYS6rs1EjJKfTqcgUaw6URhlqiFECX4h21dPjpNoJ3CvYQW4en+oYGWnuYBnp6P5gBWRaxGorRKwFJpa4hAJbPKhe4RObMYZEN5td7TAb-QYzIHKZbEQw0MA3BohAoSB49NotV5DCZzbH-aY9OYLeSyIA */
  id: "autoTarget",
  context: ({ input }) => ({
    config: input.config,
    items: input.items,
    grouped: undefined,
    selections: undefined,
  }),
  initial: "grouping",
  states: {
    grouping: {
      entry: assign(({ context }) => {
        const groups = new Map<string, ParsedData[]>();
        for (const it of context.items) {
          const key = String(
            it[context.config.indicatorKey as keyof ParsedData] ?? it.name ??
              "",
          );
          const list = groups.get(key) ?? [];
          list.push(it);
          groups.set(key, list);
        }
        return { grouped: groups };
      }),
      always: { target: "computeShares" },
    },
    computeShares: {
      entry: assign(({ context }) => {
        // Compute selections with shares and initial reasons (majority vs tie-break per dim)
        const selections = computeAutoTargets(context.items, {
          indicatorKey: context.config.indicatorKey ?? "name",
          autoTargetDimensions: context.config.autoTargetDimensions,
          minMajorityShare: context.config.minMajorityShare,
          tieBreakers: { ...context.config.tieBreakers },
          targetCurrency: context.config.targetCurrency,
          allowList: context.config.allowList,
          denyList: context.config.denyList,
        });
        return { selections };
      }),
      always: { target: "evaluateMajority" },
    },
    evaluateMajority: {
      // Majority is already encoded in selections.reason; keep this state for visualization
      always: { target: "applyTieBreakers" },
    },
    applyTieBreakers: {
      entry: assign(({ context }) => {
        const amended: AutoTargets = new Map();
        const sels = context.selections ?? new Map();
        for (const [key, sel] of sels.entries()) {
          const next: AutoTargetSelection = { ...sel, shares: sel.shares };
          if (!next.magnitude) {
            if (context.config.tieBreakers?.magnitude === "prefer-millions") {
              next.magnitude = "millions" as Scale;
              next.reason = next.reason
                ? `${next.reason}; magnitude=tie-break(prefer-millions)`
                : `magnitude=tie-break(prefer-millions)`;
            } else if (context.config.targetMagnitude) {
              next.magnitude = context.config.targetMagnitude as Scale;
              next.reason = next.reason
                ? `${next.reason}; magnitude=tie-break(pipeline-config)`
                : `magnitude=tie-break(pipeline-config)`;
            }
          }
          amended.set(key, next);
        }
        return { selections: amended };
      }),
      always: { target: "assembleSelection" },
    },
    assembleSelection: {
      // Final assembly no-op; selections already contain chosen targets
      always: { target: "done" },
    },
    done: {
      type: "final",
      output: ({ context }): AutoTargetOutput => ({
        selections: context.selections!,
      }),
    },
  },
  output: ({ context }): AutoTargetOutput => ({
    selections: context.selections!,
  }),
});

