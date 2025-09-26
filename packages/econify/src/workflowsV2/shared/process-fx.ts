/**
 * Reusable FX processing utility for domain machines
 *
 * This function handles conditional FX conversion for items that need it,
 * while passing through items that don't require FX processing.
 */

import type { ParsedData } from "./types.ts";
import type { FXTable } from "./types.ts";

export interface FXProcessingContext {
  items: ParsedData[];
  config: Record<string, unknown>;
  fx?: FXTable;
  fxSource?: "live" | "fallback";
  fxSourceId?: string;
}

/**
 * Simple currency conversion
 */
function convertCurrency(
  value: number,
  fromCurrency: string,
  toCurrency: string,
  fxTable: FXTable,
): number {
  if (fromCurrency === toCurrency) return value;

  const base = fxTable.base || "USD";

  // Convert to base currency first (if not already)
  const valueInBase = fromCurrency === base
    ? value
    : value / (fxTable.rates?.[fromCurrency] || 1);

  // Then convert to target currency
  return toCurrency === base
    ? valueInBase
    : valueInBase * (fxTable.rates?.[toCurrency] || 1);
}

/**
 * Process items with conditional FX conversion
 *
 * @param context - The context containing items, config, and FX rates
 * @returns Processed items with FX applied where needed
 */
export function processFXForItems(context: FXProcessingContext): ParsedData[] {
  const targetCurrency = (context.config as any).targetCurrency || "USD";

  return (context.items || []).map((item) => {
    // Check if this item needs FX (set during classification)
    const needsFX = (item as any).needsFX;
    const currencyCode = (item as any).currencyCode;

    // Only apply FX if we have all necessary components
    if (
      needsFX && currencyCode && targetCurrency && context.fx &&
      context.fx.rates
    ) {
      try {
        // Apply FX conversion
        const converted = convertCurrency(
          item.value,
          currencyCode,
          targetCurrency,
          context.fx,
        );

        // Update unit to reflect target currency
        const updatedUnit = item.unit?.replace(
          new RegExp(`\\b${currencyCode}\\b`, "g"),
          targetCurrency,
        );

        return {
          ...item,
          normalizedValue: converted,
          normalizedUnit: updatedUnit,
          explain: {
            ...(item.explain || {}),
            explainVersion: "v2",
            domain: (item.explain as any)?.domain,
            currency: {
              original: currencyCode,
              normalized: targetCurrency,
            },
            fxRate: context.fx.rates?.[currencyCode],
            fxSource: context.fxSource,
          },
        };
      } catch (error) {
        // If FX conversion fails, pass through original values
        console.warn(`FX conversion failed for ${currencyCode}: ${error}`);
        return {
          ...item,
          normalizedValue: item.normalized ?? item.value,
          normalizedUnit: item.normalizedUnit ?? item.unit,
          explain: {
            ...(item.explain || {}),
            explainVersion: "v2",
            domain: (item.explain as any)?.domain,
            fxError: `Failed to convert from ${currencyCode}: ${error}`,
          },
        };
      }
    }

    // No FX needed - pass through
    return {
      ...item,
      normalizedValue: item.normalized ?? item.value,
      normalizedUnit: item.normalizedUnit ?? item.unit,
      explain: {
        ...(item.explain || {}),
        explainVersion: "v2",
        domain: (item.explain as any)?.domain,
      },
    };
  });
}
