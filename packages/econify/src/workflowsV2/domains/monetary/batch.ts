import type { FXTable, Scale, TimeScale } from "../../shared/types.ts";
import type { ParsedData } from "../../shared/types.ts";
import { processBatch } from "../../shared/batch.ts";
import { enhanceExplainWithFXSource } from "../../shared/explain.ts";

export interface MonetaryBatchOptions {
  isStock?: boolean; // Flag to indicate if items are stocks (true) or flows (false/undefined)
  toCurrency?: string;
  toMagnitude?: Scale;
  toTimeScale?: TimeScale;
  fx?: FXTable;
  explain?: boolean;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
}

export async function normalizeMonetaryBatch(
  items: ParsedData[],
  options: MonetaryBatchOptions,
): Promise<ParsedData[]> {
  console.log(
    `[V2 monetary batch] Processing ${items.length} items with options:`,
    {
      toCurrency: options.toCurrency,
      toMagnitude: options.toMagnitude,
      toTimeScale: options.toTimeScale,
      hasFX: !!options.fx,
      fxBase: options.fx?.base,
      fxRates: Object.keys(options.fx?.rates || {}),
    },
  );
  // Detect if items are flows (have time component) or stocks (no time component)
  const isFlow = (item: ParsedData): boolean => {
    // If isStock flag is explicitly set, use it
    if (options.isStock !== undefined) {
      return !options.isStock;
    }

    // Fallback: Check if item has per/hour/day/week/month/year in the unit
    const unit = (item.unit || "").toLowerCase();
    const hasTimeInUnit =
      /\b(per\s+(hour|day|week|month|year|quarter|annum)|\/\s*(hour|day|week|month|year|quarter))\b/i
        .test(unit);

    // Important: periodicity alone does NOT determine stock vs flow
    // Stocks can be reported monthly/quarterly but are still point-in-time values
    return hasTimeInUnit;
  };

  // Separate stocks from flows
  const stocks = items.filter((item) => !isFlow(item));
  const flows = items.filter((item) => isFlow(item));

  // Process stocks without time conversion
  console.log(
    `[V2 monetary batch] Processing ${stocks.length} stocks:`,
    stocks.map((s) => `${s.id}: ${s.value} ${s.unit}`),
  );
  const stockResults = stocks.length > 0
    ? await processBatch(stocks, {
      validate: false as const,
      handleErrors: "skip" as const,
      parallel: true,
      toCurrency: options.toCurrency,
      toMagnitude: options.toMagnitude,
      // Allow time conversion for stocks when provided; we'll strip time suffix later.
      toTimeScale: options.toTimeScale,
      fx: options.fx,
      explain: options.explain,
    })
    : { successful: [] };

  // Process flows with time conversion
  console.log(
    `[V2 monetary batch] Processing ${flows.length} flows:`,
    flows.map((f) => `${f.id}: ${f.value} ${f.unit}`),
  );
  const flowResults = flows.length > 0
    ? await processBatch(flows, {
      validate: false as const,
      handleErrors: "skip" as const,
      parallel: true,
      toCurrency: options.toCurrency,
      toMagnitude: options.toMagnitude,
      toTimeScale: options.toTimeScale,
      fx: options.fx,
      explain: options.explain,
    })
    : { successful: [] };

  // Combine results
  const res = {
    successful: [...stockResults.successful, ...flowResults.successful],
  };

  if (options.explain && (options.fxSource || options.fxSourceId)) {
    for (const m of res.successful) {
      if (m.explain?.fx) {
        const asOf = m.explain.fx.asOf || options.fx?.asOf ||
          (options.fx as any)?.date;
        m.explain = enhanceExplainWithFXSource(
          m.explain as any,
          (options.fxSource ?? "fallback") as any,
          options.fxSourceId,
          asOf,
        );
      }
    }
  }

  // Map V1 field names to V2 field names and enrich periodicity for stocks
  const mapped = res.successful.map((item: any) => ({
    ...item,
    normalizedValue: item.normalized, // Map V1 'normalized' to V2 'normalizedValue'
    normalizedUnit: item.normalizedUnit, // Pass through normalizedUnit from V1
  })) as ParsedData[];

  if (options.explain) {
    for (const it of mapped as any[]) {
      it.explain ||= {};
      if (options.isStock) {
        // For stocks, we allow time conversion but keep normalizedUnit free of time suffix.
        if (typeof it.normalizedUnit === "string") {
          it.normalizedUnit = it.normalizedUnit.replace(
            /\s*(per\s+(month|quarter|year|week|day|hour)|\/\s*(month|quarter|year|week|day|hour))\b/gi,
            "",
          );
        }
        // Only synthesize periodicity explain if processBatch didn't provide one
        if (!it.explain.periodicity) {
          const target = options.toTimeScale || "month";
          it.explain.periodicity = {
            original: it.periodicity || undefined,
            target,
            normalized: target,
            conversionDirection: "none",
          } as any;
        }
      }
    }
  }

  return mapped as ParsedData[];
}
