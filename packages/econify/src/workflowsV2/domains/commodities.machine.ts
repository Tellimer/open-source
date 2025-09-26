/**
 * Commodities domain machine for V2 workflows
 *
 * Passes through commodities units with optional FX conversion
 */

import { assign, fromPromise, setup } from "npm:xstate@^5.20.2";
import type { FXTable, ParsedData } from "../shared/types.ts";
import { parseUnit } from "../../units/units.ts";
import { detectScale } from "../../scale/scale.ts";

// ============================================================================
// Types
// ============================================================================

interface CommoditiesInput {
  config: Record<string, unknown>;
  items: ParsedData[];
  fx?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
}

interface CommoditiesOutput {
  items: ParsedData[];
}

interface CommoditiesContext extends CommoditiesInput {
  results: ParsedData[];
}

// ============================================================================
// Machine Definition
// ============================================================================

export const commoditiesMachine = setup({
  types: {
    context: {} as CommoditiesContext,
    input: {} as CommoditiesInput,
  },
  actors: {
    doProcess: fromPromise(async ({ input }: { input: CommoditiesInput }) => {
      const items = input.items || [];
      if (items.length === 0) return [] as ParsedData[];

      // Split price-like vs quantity items
      const priceLike: ParsedData[] = [];
      const quantities: ParsedData[] = [];
      for (const it of items) {
        const parsed = parseUnit(it.unit || "");
        const unitStr = (it.unit || "").toLowerCase();
        const isPrice = !!parsed.currency &&
          (unitStr.includes(" per ") || unitStr.includes("/"));
        if (isPrice) priceLike.push(it);
        else quantities.push(it);
      }

      const out: ParsedData[] = [];

      // 1) Process quantities: preserve original units (no expansion for commodities)
      if (quantities.length > 0) {
        out.push(
          ...quantities.map((item) => ({
            ...item,
            normalizedValue: item.value,
            normalizedUnit: item.unit, // Preserve original unit completely
            qualityScore: 1.0,
            explain: {
              explainVersion: "v2",
              originalUnit: item.unit,
              normalizedUnit: item.unit,
              conversionApplied: false,
              conversionSummary: "Commodity units preserved in original form",
              domain: "commodities",
            },
          } as ParsedData)),
        );
      }

      // 2) Process price-like: apply FX conversion if needed and available
      if (priceLike.length > 0) {
        out.push(
          ...priceLike.map((item) => {
            const parsed = parseUnit(item.unit || "");
            const targetCurrency = input.config?.targetCurrency as string;
            const fx = input.fx;

            // Check if FX conversion is needed and possible
            const sourceCurrency = parsed.currency;
            const needsFXConversion = sourceCurrency &&
              targetCurrency &&
              sourceCurrency !== targetCurrency &&
              fx?.rates?.[sourceCurrency] &&
              fx?.rates?.[targetCurrency];

            if (needsFXConversion && fx && sourceCurrency) {
              // Apply FX conversion
              const fromRate = fx.rates[sourceCurrency];
              const toRate = fx.rates[targetCurrency];
              const fxRate = toRate / fromRate;
              const convertedValue = (item.value ?? 0) * fxRate;

              // Update unit string to reflect new currency
              const newUnit = (item.unit || "").replace(
                new RegExp(`\\b${sourceCurrency}\\b`, "g"),
                targetCurrency,
              );

              return {
                ...item,
                normalizedValue: convertedValue,
                normalizedUnit: newUnit,
                qualityScore: 1.0,
                explain: {
                  explainVersion: "v2",
                  originalUnit: item.unit,
                  normalizedUnit: newUnit,
                  conversionApplied: true,
                  conversionSummary:
                    `Commodity price converted from ${sourceCurrency} to ${targetCurrency} (rate: ${
                      fxRate.toFixed(4)
                    })`,
                  domain: "commodities",
                  currency: {
                    original: sourceCurrency,
                    normalized: targetCurrency,
                  },
                  fx: {
                    source: input.fxSource || "fallback",
                    sourceId: input.fxSourceId,
                    asOf: fx.asOf || new Date().toISOString(),
                    rate: fxRate,
                  },
                } as any,
              } as ParsedData;
            } else {
              // No FX conversion needed or possible
              return {
                ...item,
                normalizedValue: item.value,
                normalizedUnit: item.unit,
                qualityScore: 1.0,
                explain: {
                  explainVersion: "v2",
                  originalUnit: item.unit,
                  normalizedUnit: item.unit,
                  conversionApplied: false,
                  conversionSummary: needsFXConversion
                    ? "FX conversion needed but rates not available"
                    : "No FX conversion needed for commodity price",
                  domain: "commodities",
                },
              } as ParsedData;
            }
          }),
        );
      }

      return out;
    }),
  },
}).createMachine({
  id: "commodities",
  context: ({ input }) => ({
    ...input,
    results: [],
  }),
  initial: "processing",
  states: {
    processing: {
      invoke: {
        src: "doProcess",
        input: ({ context }) => ({ ...context }),
        onDone: {
          target: "done",
          actions: assign({
            results: ({ event }) => (event as any).output as ParsedData[],
          }),
        },
      },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => ({ items: context.results } as CommoditiesOutput),
});
