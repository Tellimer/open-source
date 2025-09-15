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
import type { FXTable, Scale } from "../types.ts";
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
  },
): Promise<ParsedData[]> {
  if (!fxRates) {
    console.warn(
      "⚠️  No FX rates available for wage normalization, using standard processing with wages-appropriate magnitude",
    );

    // Filter out index values if excludeIndexValues is true
    let dataToProcess = data;
    if (config.excludeIndexValues) {
      dataToProcess = data.filter((item) => {
        const parsed = parseUnit(item.unit);
        const isIndex = isIndexOrPointsUnit(item.unit, parsed);
        return !isIndex;
      });
    }

    const result = await processBatch(dataToProcess, {
      validate: false,
      handleErrors: "skip",
      parallel: true,
      toCurrency: config.targetCurrency,
      toMagnitude: "ones" as Scale, // Always use "ones" for wages, not millions
      fx: fxRates,
    });
    return result.successful;
  }

  // Convert to wage data format
  const wagePoints = data.map((item) => ({
    country: String(item.id || "unknown"),
    value: item.value,
    unit: item.unit,
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
  });

  // Convert back to ParsedData format
  const result: ParsedData[] = [];

  for (let i = 0; i < data.length; i++) {
    const originalItem = data[i];
    const wageResult = normalizedWages[i];

    if (wageResult.excluded) {
      // If excludeIndexValues is true, skip excluded items entirely
      // If excludeIndexValues is false, keep excluded items but mark them
      if (!config.excludeIndexValues) {
        result.push({
          ...originalItem,
          normalized: originalItem.value, // Keep original value
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
      // If excludeIndexValues is true, we skip this item (don't add to result)
    } else if (wageResult.normalizedValue !== undefined) {
      // Successfully normalized
      result.push({
        ...originalItem,
        normalized: wageResult.normalizedValue,
        normalizedUnit: wageResult.normalizedUnit ||
          `${config.targetCurrency || "USD"}/month`,
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
    } else {
      // Failed to normalize - keep original
      result.push({
        ...originalItem,
        metadata: {
          ...originalItem.metadata,
          wageNormalization: {
            excluded: false,
            dataType: wageResult.dataType,
            error: "Failed to normalize",
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
    }/month`,
  );

  return result;
}
