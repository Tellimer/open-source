import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import { fetchLiveFXRates } from "../../shared/fx.ts";
import type { FXTable } from "../../shared/types.ts";

interface FXInput {
  config: {
    useLiveFX?: boolean;
    targetCurrency?: string;
    fxFallback?: FXTable;
  } & Record<string, unknown>;
}

interface FXOutput {
  fxRates: FXTable;
  fxSource: "live" | "fallback";
  fxSourceId: string;
  warnings: string[];
}

type FXContext = FXInput & {
  fxRates?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
  warnings: string[];
};

export const fxMachine = setup({
  types: {
    context: {} as FXContext,
    input: {} as FXInput,
  },
  actors: {
    fetchRates: fromPromise(async ({ input }: { input: FXContext }) => {
      const { config } = input;
      const warnings: string[] = [];

      if (config.useLiveFX) {
        try {
          const rates = await fetchLiveFXRates(config.targetCurrency || "USD", {
            fallback: config.fxFallback,
            cache: true,
          });

          console.log(
            `[V2 FX] Fetched live rates for ${
              Object.keys(rates.rates || {}).length
            } currencies`,
          );

          return {
            fxRates: rates,
            fxSource: "live" as const,
            fxSourceId: "ECB", // Default for live rates
            warnings,
          };
        } catch (error) {
          warnings.push(`Failed to fetch live FX rates: ${error}`);

          // Fallback to static rates
          if (!config.fxFallback) {
            throw new Error(
              "Live FX fetch failed and no fallback rates provided",
            );
          }

          console.log(`[V2 FX] Using fallback rates due to live fetch failure`);

          return {
            fxRates: config.fxFallback,
            fxSource: "fallback" as const,
            fxSourceId: "SNP", // Default for fallback
            warnings,
          };
        }
      } else {
        // Use fallback rates
        if (!config.fxFallback) {
          throw new Error(
            "fxFallback rates are required when useLiveFX is false",
          );
        }

        console.log(
          `[V2 FX] Using fallback rates for ${
            Object.keys(config.fxFallback.rates || {}).length
          } currencies`,
        );

        return {
          fxRates: config.fxFallback,
          fxSource: "fallback" as const,
          fxSourceId: "SNP", // Default for fallback
          warnings,
        };
      }
    }),
  },
}).createMachine({
  id: "fxV2",
  context: ({ input }) => ({
    ...input,
    warnings: [],
  }),
  initial: "fetching",
  states: {
    fetching: {
      invoke: {
        src: "fetchRates",
        input: ({ context }) => context,
        onDone: {
          target: "done",
          actions: assign({
            fxRates: ({ event }) => (event as any).output.fxRates,
            fxSource: ({ event }) => (event as any).output.fxSource,
            fxSourceId: ({ event }) => (event as any).output.fxSourceId,
            warnings: ({ context, event }) => [
              ...context.warnings,
              ...(event as any).output.warnings,
            ],
          }),
        },
        onError: {
          target: "error",
        },
      },
    },
    error: {
      type: "final",
    },
    done: {
      type: "final",
      output: ({ context }) => ({
        fxRates: context.fxRates || { base: "USD", rates: {} },
        fxSource: context.fxSource || "fallback",
        fxSourceId: context.fxSourceId || "unknown",
        warnings: context.warnings,
      } as FXOutput),
    },
  },
  output: ({ context }) => ({
    fxRates: context.fxRates || { base: "USD", rates: {} },
    fxSource: context.fxSource || "fallback",
    fxSourceId: context.fxSourceId || "unknown",
    warnings: context.warnings,
  } as FXOutput),
});
