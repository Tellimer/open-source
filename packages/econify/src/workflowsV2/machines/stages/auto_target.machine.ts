/**
 * Global Auto-Targeting Machine for V2 Pipeline
 *
 * This machine implements the same auto-targeting logic as V1 but for the V2 pipeline.
 * It analyzes all input data to detect majority patterns and sets global targets
 * that are then used by domain processors.
 */

import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import type { ParsedData } from "../../shared/types.ts";
import { computeAutoTargets } from "../../../normalization/auto_targets.ts";
import type {
  AutoTargetOptions,
  AutoTargets,
} from "../../../normalization/auto_targets.ts";

interface AutoTargetInput {
  config: {
    autoTargetByIndicator?: boolean;
    indicatorKey?: string;
    autoTargetDimensions?: Array<"currency" | "magnitude" | "time">;
    minMajorityShare?: number;
    tieBreakers?: {
      currency?: "prefer-targetCurrency" | "prefer-USD" | "none";
      magnitude?:
        | "prefer-millions"
        | "prefer-billions"
        | "prefer-thousands"
        | "none";
      time?: "prefer-month" | "prefer-quarter" | "prefer-year" | "none";
    };
    targetCurrency?: string;
    targetMagnitude?: string;
    targetTimeScale?: string;
    allowList?: string[];
    denyList?: string[];
  };
  parsedData: ParsedData[];
}

interface AutoTargetOutput {
  parsedData: ParsedData[];
  autoTargets?: AutoTargets;
  warnings: string[];
}

export const autoTargetMachine = setup({
  types: {
    context: {} as AutoTargetInput & {
      autoTargets?: AutoTargets;
      warnings: string[];
    },
    input: {} as AutoTargetInput,
  },
  actors: {
    computeTargets: fromPromise(
      async ({ input }: { input: AutoTargetInput }) => {
        const { config, parsedData } = input;

        if (
          !config.autoTargetByIndicator || parsedData.length === 0
        ) {
          return {
            autoTargets: undefined,
            warnings: [],
          };
        }

        try {
          const options: AutoTargetOptions = {
            indicatorKey: (config.indicatorKey as any) ?? "name",
            autoTargetDimensions: config.autoTargetDimensions,
            minMajorityShare: config.minMajorityShare,
            tieBreakers: {
              currency: config.tieBreakers?.currency === "prefer-USD"
                ? "prefer-USD"
                : "prefer-targetCurrency",
              magnitude: config.tieBreakers?.magnitude === "prefer-millions"
                ? "prefer-millions"
                : "prefer-targetMagnitude",
              time: config.tieBreakers?.time === "prefer-month"
                ? "prefer-month"
                : "prefer-targetTimeScale",
            },
            targetCurrency: config.targetCurrency,
            targetMagnitude: config.targetMagnitude,
            targetTimeScale: config.targetTimeScale,
            allowList: config.allowList,
            denyList: config.denyList,
          };

          console.log(
            `[V2 Auto-Target] Input data:`,
            parsedData.map((d) => ({
              name: d.name,
              unit: d.unit,
              currency_code: d.currency_code,
            })),
          );

          console.log(`[V2 Auto-Target] Options:`, options);

          const autoTargets = computeAutoTargets(parsedData, options);

          console.log(
            `[V2 Auto-Target] Computed targets for ${parsedData.length} items:`,
            {
              indicators: autoTargets.size,
              allTargets: Object.fromEntries(autoTargets),
              sampleTargets: Array.from(autoTargets.keys()).slice(0, 3).map(
                (key) => ({
                  indicator: key,
                  targets: autoTargets.get(key),
                }),
              ),
            },
          );

          return {
            autoTargets,
            warnings: [],
          };
        } catch (error) {
          console.error(
            "[V2 Auto-Target] Error computing auto-targets:",
            error,
          );
          return {
            autoTargets: undefined,
            warnings: [
              `Auto-targeting failed: ${
                (error as Error).message || "Unknown error"
              }`,
            ],
          };
        }
      },
    ),
  },
}).createMachine({
  id: "autoTargetV2",
  context: ({ input }) => ({
    ...input,
    autoTargets: undefined,
    warnings: [],
  }),
  initial: "decide",
  states: {
    decide: {
      always: [
        {
          guard: ({ context }) => context.config.autoTargetByIndicator === true,
          target: "computing",
        },
        {
          target: "passthrough",
        },
      ],
    },
    passthrough: {
      entry: ({ context }) => {
        console.log(
          "[V2 Auto-Target] Auto-targeting disabled, passing through",
        );
      },
      always: { target: "done" },
    },
    computing: {
      entry: ({ context }) => {
        console.log(
          `[V2 Auto-Target] Computing auto-targets for ${context.parsedData.length} items`,
        );
      },
      invoke: {
        src: "computeTargets",
        input: ({ context }) => ({
          config: context.config,
          parsedData: context.parsedData,
        }),
        onDone: {
          target: "applyTargets",
          actions: assign({
            autoTargets: ({ event }) => (event as any).output.autoTargets,
            warnings: ({ context, event }) => [
              ...context.warnings,
              ...(event as any).output.warnings,
            ],
          }),
        },
        onError: {
          target: "error",
          actions: assign({
            warnings: ({ context, event }) => [
              ...context.warnings,
              `Auto-targeting error: ${
                (event as any).error?.message || "Unknown error"
              }`,
            ],
          }),
        },
      },
    },
    applyTargets: {
      entry: assign(({ context }) => {
        if (!context.autoTargets) {
          return { parsedData: context.parsedData };
        }

        // Apply auto-targets to parsed data by adding metadata
        const updatedData = context.parsedData.map((item) => {
          const indicatorKey =
            item[context.config.indicatorKey as keyof ParsedData] ||
            item.name || "";
          const targets = context.autoTargets!.get(String(indicatorKey));

          if (targets) {
            return {
              ...item,
              autoTargetMetadata: {
                targets,
                applied: true,
              },
            };
          }

          return item;
        });

        console.log(
          `[V2 Auto-Target] Applied targets to ${updatedData.length} items`,
        );
        return { parsedData: updatedData };
      }),
      always: { target: "done" },
    },
    error: {
      entry: ({ context }) => {
        console.error(
          "[V2 Auto-Target] Auto-targeting failed, continuing without targets",
        );
      },
      always: { target: "done" },
    },
    done: {
      type: "final",
      output: ({ context }) => ({
        parsedData: context.parsedData,
        autoTargets: context.autoTargets,
        warnings: context.warnings,
      } as AutoTargetOutput),
    },
  },
  output: ({ context }) => ({
    parsedData: context.parsedData,
    autoTargets: context.autoTargets,
    warnings: context.warnings,
  } as AutoTargetOutput),
});
