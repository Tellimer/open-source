/**
 * Specialized normalization for wages data that handles mixed unit types
 * (currency/time vs index/points) and normalizes to comparable values
 */

import { parseUnit } from "../units/units.ts";
import { normalizeValue } from "../normalization/normalization.ts";
import type { FXTable } from "../types.ts";

export interface WageDataPoint {
  country: string;
  value: number;
  unit: string;
  currency?: string | null;
  date?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedWageData {
  country: string;
  originalValue: number;
  originalUnit: string;
  normalizedValue?: number;
  normalizedUnit?: string;
  dataType: "currency" | "index" | "unknown";
  excluded?: boolean;
  exclusionReason?: string;
  date?: string;
  metadata?: Record<string, unknown>;
}

export interface WageNormalizationOptions {
  targetCurrency?: string;
  targetTimeScale?: "hour" | "day" | "week" | "month" | "year";
  fx?: FXTable;
  excludeIndexValues?: boolean;
  includeMetadata?: boolean;
}

/**
 * Normalize wages data handling mixed currency and index values
 */
export function normalizeWagesData(
  wageData: WageDataPoint[],
  options: WageNormalizationOptions = {},
): NormalizedWageData[] {
  const {
    targetCurrency = "USD",
    targetTimeScale = "month",
    fx,
    excludeIndexValues = false,
    includeMetadata = true,
  } = options;

  const results: NormalizedWageData[] = [];

  for (const dataPoint of wageData) {
    const result: NormalizedWageData = {
      country: dataPoint.country,
      originalValue: dataPoint.value,
      originalUnit: dataPoint.unit,
      dataType: "unknown",
      date: dataPoint.date,
    };

    if (includeMetadata && dataPoint.metadata) {
      result.metadata = dataPoint.metadata;
    }

    try {
      // Parse the unit to understand its structure
      const parsed = parseUnit(dataPoint.unit);

      // Determine data type
      if (isIndexOrPointsUnit(dataPoint.unit, parsed)) {
        result.dataType = "index";

        if (excludeIndexValues) {
          result.excluded = true;
          result.exclusionReason =
            "Index/points values excluded from normalization";
        } else {
          // Keep index values as-is since they can't be meaningfully converted
          result.normalizedValue = dataPoint.value;
          result.normalizedUnit = dataPoint.unit;
        }
      } else if (isCurrencyTimeUnit(dataPoint.unit, parsed)) {
        result.dataType = "currency";

        if (!fx) {
          throw new Error("FX rates required for currency normalization");
        }

        // Normalize currency/time values
        const normalized = normalizeValue(dataPoint.value, dataPoint.unit, {
          toCurrency: targetCurrency,
          toTimeScale: targetTimeScale,
          fx,
        });

        result.normalizedValue = normalized;
        result.normalizedUnit = `${targetCurrency}/${targetTimeScale}`;
      } else {
        result.dataType = "unknown";
        result.excluded = true;
        result.exclusionReason = `Unknown unit type: ${dataPoint.unit}`;
      }
    } catch (error) {
      result.excluded = true;
      result.exclusionReason = `Normalization error: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }

    results.push(result);
  }

  return results;
}

/**
 * Check if a unit represents an index or points value
 */
function isIndexOrPointsUnit(
  unitText: string,
  parsed: { category?: string; currency?: string; timeScale?: string },
): boolean {
  const lowerUnit = unitText.toLowerCase();

  // Check for explicit index/points indicators
  if (
    lowerUnit.includes("points") ||
    lowerUnit.includes("index") ||
    lowerUnit.includes("idx") ||
    parsed.category === "index"
  ) {
    return true;
  }

  // Check for units that are typically indices (no currency, no time scale)
  if (
    !parsed.currency && !parsed.timeScale &&
    (lowerUnit === "points" || lowerUnit === "" || lowerUnit === "units")
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a unit represents a currency per time period (wage)
 */
function isCurrencyTimeUnit(
  unitText: string,
  parsed: { currency?: string; timeScale?: string },
): boolean {
  // Must have both currency and time scale
  if (parsed.currency && parsed.timeScale) {
    return true;
  }

  // Check for common wage patterns
  const wagePatterns = [
    /[a-z]{3}\/hour/i,
    /[a-z]{3}\/day/i,
    /[a-z]{3}\/week/i,
    /[a-z]{3}\/month/i,
    /[a-z]{3}\/year/i,
    /[a-z]{3}\s+(per\s+)?(hour|day|week|month|year)/i,
  ];

  return wagePatterns.some((pattern) => pattern.test(unitText));
}

/**
 * Get summary statistics for normalized wages data
 */
export function getWageNormalizationSummary(results: NormalizedWageData[]) {
  const total = results.length;
  const normalized =
    results.filter((r) => !r.excluded && r.normalizedValue !== undefined)
      .length;
  const excluded = results.filter((r) => r.excluded).length;
  const currencyBased = results.filter((r) => r.dataType === "currency").length;
  const indexBased = results.filter((r) => r.dataType === "index").length;
  const unknown = results.filter((r) => r.dataType === "unknown").length;

  const normalizedValues = results
    .filter((r): r is NormalizedWageData & { normalizedValue: number } =>
      !r.excluded && r.normalizedValue !== undefined
    )
    .map((r) => r.normalizedValue);

  const stats = normalizedValues.length > 0
    ? {
      min: Math.min(...normalizedValues),
      max: Math.max(...normalizedValues),
      mean: normalizedValues.reduce((a, b) => a + b, 0) /
        normalizedValues.length,
      median: normalizedValues.toSorted((a, b) =>
        a - b
      )[Math.floor(normalizedValues.length / 2)],
    }
    : null;

  return {
    total,
    normalized,
    excluded,
    dataTypes: {
      currency: currencyBased,
      index: indexBased,
      unknown,
    },
    statistics: stats,
    exclusionReasons: results
      .filter((r) => r.excluded)
      .reduce((acc, r) => {
        const reason = r.exclusionReason || "Unknown";
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
  };
}

/**
 * Filter normalized wages data to only include comparable values
 */
export function getComparableWagesData(
  results: NormalizedWageData[],
): NormalizedWageData[] {
  return results.filter((r) =>
    !r.excluded &&
    r.dataType === "currency" &&
    r.normalizedValue !== undefined
  );
}
