/**
 * Wages-specific pipeline integration and orchestration
 *
 * This module handles the integration of wages processing into the main econify pipeline.
 * It provides specialized handling for mixed wage data (currency vs index values) and
 * coordinates between the core pipeline and wages-specific normalization logic.
 */

import { processBatch } from "../batch/batch.ts";
import {
  getComparableWagesData,
  isIndexOrPointsUnit,
  normalizeWagesData,
} from "../wages/wages-normalization.ts";
import type { ParsedData } from "../workflows/economic-data-workflow.ts";
import type { FXTable, Scale, TimeScale } from "../types.ts";
import { parseUnit } from "../units/units.ts";

/**
 * Detect if the data appears to be wages-related
 */
export function detectWagesData(data: ParsedData[]): boolean {
  if (data.length === 0) return false;

  // Check for wage-related patterns in names or units
  const wagePatterns = [
    /wage/i,
    /salary/i,
    /income/i,
    /earnings/i,
    /compensation/i,
    /pay/i,
  ];

  const timeUnitPatterns = [
    /\/hour/i,
    /\/day/i,
    /\/week/i,
    /\/month/i,
    /\/year/i,
    /per hour/i,
    /per day/i,
    /per week/i,
    /per month/i,
    /per year/i,
  ];

  // Check if any items have wage-like names or time-based units
  const hasWageNames = data.some((item) =>
    wagePatterns.some((pattern) => pattern.test(item.name || ""))
  );

  const hasTimeUnits = data.some((item) =>
    timeUnitPatterns.some((pattern) => pattern.test(item.unit || ""))
  );

  // Also check for mixed currency and index data (common in wages datasets)
  const hasCurrencyUnits = data.some((item) => {
    const parsed = parseUnit(item.unit);
    return parsed.currency && parsed.timeScale;
  });

  const hasIndexUnits = data.some((item) => {
    const parsed = parseUnit(item.unit);
    return isIndexOrPointsUnit(item.unit, parsed);
  });

  const hasMixedTypes = hasCurrencyUnits && hasIndexUnits;

  return hasWageNames || hasTimeUnits || hasMixedTypes;
}

/**
 * Process wages data with specialized normalization
 */
export async function processWagesData(
  data: ParsedData[],
  fxRates: FXTable | undefined,
  config: {
    targetCurrency?: string;
    targetMagnitude?: string;
    targetTimeScale?: string;
    excludeIndexValues?: boolean;
    includeWageMetadata?: boolean;
    explain?: boolean;
    fxSource?: "live" | "fallback";
    fxSourceId?: string;
  },
): Promise<ParsedData[]> {
  if (!fxRates) {
    console.warn(
      "⚠️  No FX rates available for wage normalization, using standard processing with wages-appropriate magnitude",
    );

    // Apply index/points exclusion even without FX, to honor user preference
    const excludeIndexes = config.excludeIndexValues ?? true;
    const items = excludeIndexes
      ? data.filter((item) =>
        !isIndexOrPointsUnit(item.unit, parseUnit(item.unit))
      )
      : data;

    if (excludeIndexes && items.length !== data.length) {
      const excluded = data.length - items.length;
      console.log(
        `🧹 Excluded ${excluded} index/points item(s) from wages dataset`,
      );
    }

    if (items.length === 0) return [];

    const result = await processBatch(items, {
      validate: false,
      handleErrors: "skip",
      parallel: true,
      toCurrency: config.targetCurrency,
      toMagnitude: "ones" as Scale, // Always use "ones" for wages, not millions
      toTimeScale: config.targetTimeScale as TimeScale | undefined, // Apply time scale conversion
      fx: fxRates,
      explain: config.explain,
      fxSource: config.fxSource,
      fxSourceId: config.fxSourceId,
    });
    return result.successful;
  }

  // Convert to wage data format
  const wagePoints = data.map((item) => ({
    country: String(item.id || "unknown"),
    value: item.value,
    unit: item.unit,
    // Preserve indicator name for domain detection in explain metadata
    name: item.name,
    currency: item.metadata?.currency as string | undefined,
    date: item.metadata?.date as string | undefined,
    metadata: item.metadata,
  }));

  // Apply wage-specific normalization
  // Note: normalizeWagesData doesn't use targetMagnitude - wages should always be in "ones" (regular USD amounts)
  const normalizedWages = normalizeWagesData(wagePoints, {
    targetCurrency: config.targetCurrency || "USD",
    targetTimeScale:
      (config.targetTimeScale as "hour" | "day" | "week" | "month" | "year") ||
      "month", // Use config or default to monthly
    fx: fxRates,
    excludeIndexValues: config.excludeIndexValues ?? true, // Use config value, default to true
    includeMetadata: config.includeWageMetadata ?? true,
    explain: config.explain ?? false, // Pass through explain option
  });

  // Convert back to ParsedData format
  const result: ParsedData[] = [];

  for (let i = 0; i < data.length; i++) {
    const originalItem = data[i];
    const wageResult = normalizedWages[i];

    if (wageResult.excluded) {
      // Respect excludeIndexValues flag: keep excluded items only if explicitly requested
      if (config.excludeIndexValues === false) {
        result.push({
          ...originalItem,
          normalized: originalItem.value,
          normalizedUnit: originalItem.unit,
          metadata: {
            ...originalItem.metadata,
            wageNormalization: {
              excluded: true,
              reason: wageResult.exclusionReason,
              dataType: wageResult.dataType,
            },
          },
        });
      }
    } else if (wageResult.normalizedValue !== undefined) {
      // Successfully normalized
      result.push({
        ...originalItem,
        normalized: wageResult.normalizedValue,
        normalizedUnit: wageResult.normalizedUnit ||
          `${config.targetCurrency || "USD"} per month`,
        explain: wageResult.explain, // Include explain metadata if available
        metadata: {
          ...originalItem.metadata,
          wageNormalization: {
            excluded: false,
            dataType: wageResult.dataType,
            originalValue: wageResult.originalValue,
            originalUnit: wageResult.originalUnit,
          },
        },
      });
    }
  }

  // Log processing summary
  const comparableData = getComparableWagesData(normalizedWages);
  console.log(`✅ Processed ${normalizedWages.length} wage data points`);
  console.log(
    `📊 ${comparableData.length} comparable wage values in ${
      config.targetCurrency || "USD"
    } per month`,
  );

  return result;
}
