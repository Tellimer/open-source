/**
 * Enhanced pipeline integration with wage-specific handling
 */

import { processBatch } from "../batch/batch.ts";
import {
  getComparableWagesData,
  type NormalizedWageData,
  normalizeWagesData,
} from "./wages-normalization.ts";
import type { ParsedData, PipelineContext } from "../workflows/pipeline_v5.ts";
import type { FXTable, Scale } from "../types.ts";

/**
 * Enhanced normalize data service with wage-specific handling
 */
export async function enhancedNormalizeDataService(
  input: PipelineContext,
): Promise<ParsedData[]> {
  const { parsedData, fxRates, config } = input;

  if (!parsedData) {
    throw new Error("No parsed data available");
  }

  // Check if this is wages data that needs special handling
  const isWagesData = detectWagesData(parsedData);

  if (isWagesData) {
    console.log("🔧 Detected wages data - applying specialized normalization");
    return await processWagesData(parsedData, fxRates, config);
  } else {
    // Use standard processing for non-wages data
    const result = await processBatch(parsedData, {
      validate: false,
      handleErrors: "skip",
      parallel: true,
      toCurrency: config.targetCurrency,
      toMagnitude: config.targetMagnitude,
      toTimeScale: config.targetTimeScale,
      fx: fxRates,
    });
    return result.successful;
  }
}

/**
 * Detect if the data represents wages/salary information
 */
function detectWagesData(data: ParsedData[]): boolean {
  // Check for wage-related indicators in names or metadata
  const wageKeywords = [
    "wage",
    "wages",
    "salary",
    "salaries",
    "earnings",
    "compensation",
    "pay",
    "income",
    "remuneration",
    "WAGINMAN",
    "WAG",
  ];

  // Check indicator names and IDs
  for (const item of data) {
    const name = (item.name || "").toLowerCase();
    const id = (item.id || "").toString().toLowerCase();
    const description = (item.description || "").toLowerCase();

    if (
      wageKeywords.some((keyword) =>
        name.includes(keyword) ||
        id.includes(keyword) ||
        description.includes(keyword)
      )
    ) {
      return true;
    }
  }

  // Check for wage-like unit patterns
  const wageUnitPatterns = [
    /[a-z]{3}\/hour/i,
    /[a-z]{3}\/day/i,
    /[a-z]{3}\/week/i,
    /[a-z]{3}\/month/i,
    /[a-z]{3}\/year/i,
    /per\s+(hour|day|week|month|year)/i,
  ];

  const hasWageUnits = data.some((item) =>
    wageUnitPatterns.some((pattern) => pattern.test(item.unit || ""))
  );

  return hasWageUnits;
}

/**
 * Process wages data with specialized normalization
 */
async function processWagesData(
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
      "⚠️  No FX rates available for wage normalization, using standard processing",
    );
    const result = await processBatch(data, {
      validate: false,
      handleErrors: "skip",
      parallel: true,
      toCurrency: config.targetCurrency,
      toMagnitude: config.targetMagnitude as Scale,
      fx: fxRates,
    });
    return result.successful;
  }

  // Convert to wage data format
  const wagePoints = data.map((item) => ({
    country: item.id?.toString() || "unknown",
    value: item.value,
    unit: item.unit || "unknown",
    currency: item.parsedUnit?.currency,
    date: item.date?.toString(),
    metadata: item.metadata,
  }));

  // Apply wage-specific normalization
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
      // Keep excluded items but mark them
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
      // Fallback to original
      result.push({
        ...originalItem,
        normalized: originalItem.value,
        normalizedUnit: originalItem.unit,
        metadata: {
          ...originalItem.metadata,
          wageNormalization: {
            excluded: false,
            dataType: wageResult.dataType,
            note: "No normalization applied",
          },
        },
      });
    }
  }

  console.log(`✅ Processed ${result.length} wage data points`);
  const comparable = result.filter((item) => {
    const wageNorm = item.metadata?.wageNormalization as {
      excluded?: boolean;
      dataType?: string;
    };
    return !wageNorm?.excluded && wageNorm?.dataType === "currency";
  });
  console.log(
    `📊 ${comparable.length} comparable wage values in ${
      config.targetCurrency || "USD"
    }/month`,
  );

  return result;
}

/**
 * Create enhanced pipeline configuration for wages
 */
export function createWagesPipelineConfig(options: {
  targetCurrency?: string;
  targetTimeScale?: "hour" | "day" | "week" | "month" | "year";
  fxRates?: FXTable;
  minQualityScore?: number;
} = {}) {
  return {
    targetCurrency: options.targetCurrency || "USD",
    targetTimeScale: options.targetTimeScale || "month",
    targetMagnitude: "ones" as const,
    minQualityScore: options.minQualityScore || 60,
    adjustInflation: false,
    removeSeasonality: false,
    inferUnits: true,
    fxFallback: options.fxRates,
  };
}

/**
 * Process wages indicator data end-to-end
 */
export interface IndicatorData {
  indicator_id: string;
  indicator_name: string;
  countries: Record<string, {
    value: string | number;
    tooltip?: {
      currency?: string;
      units?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface ProcessingResult {
  original: IndicatorData;
  normalized: IndicatorData;
  summary: {
    total: number;
    normalized: number;
    excluded: number;
    comparable: number;
    dataTypes: { currency: number; index: number; unknown: number };
    valueRange?: { min: number; max: number; mean: number } | null;
  };
  comparable: NormalizedWageData[];
}

export function processWagesIndicator(
  indicatorData: IndicatorData,
  fxRates: FXTable,
  options: {
    targetCurrency?: string;
    targetTimeScale?: string;
    excludeIndexValues?: boolean;
  } = {},
): ProcessingResult {
  const { targetCurrency = "USD", excludeIndexValues = true } = options;

  // Convert indicator data to wage points format
  const wagePoints = Object.entries(indicatorData.countries || {}).map((
    [country, data],
  ) => ({
    country,
    value: parseFloat(String(data.value)),
    unit: data.tooltip?.units || "unknown",
    currency: data.tooltip?.currency,
    date: String(data.date || ""),
    metadata: {
      indicatorId: data.tooltip?.indicatorId,
      sources: data.tooltip?.sources,
      periodicity: data.tooltip?.periodicity,
      region: data.region,
      regionSlug: data.regionSlug,
      original_value: data.tooltip?.original_value,
      normalized_value: data.tooltip?.normalized_value,
      normalization_metadata: data.tooltip?.normalization_metadata,
    },
  }));

  // Apply normalization
  const normalizedResults = normalizeWagesData(wagePoints, {
    targetCurrency,
    targetTimeScale:
      (options.targetTimeScale as "hour" | "day" | "week" | "month" | "year") ||
      "month",
    fx: fxRates,
    excludeIndexValues,
    includeMetadata: true,
  });

  // Get comparable data
  const comparableData = getComparableWagesData(normalizedResults);

  // Create summary
  const summary = {
    total: normalizedResults.length,
    normalized: normalizedResults.filter((r) => !r.excluded).length,
    excluded: normalizedResults.filter((r) => r.excluded).length,
    comparable: comparableData.length,
    dataTypes: {
      currency:
        normalizedResults.filter((r) => r.dataType === "currency").length,
      index: normalizedResults.filter((r) => r.dataType === "index").length,
      unknown: normalizedResults.filter((r) => r.dataType === "unknown").length,
    },
    valueRange: comparableData.length > 0
      ? {
        min: Math.min(...comparableData.map((d) => d.normalizedValue!)),
        max: Math.max(...comparableData.map((d) => d.normalizedValue!)),
        mean: comparableData.reduce((sum, d) => sum + d.normalizedValue!, 0) /
          comparableData.length,
      }
      : null,
  };

  // Update the original indicator data with normalized values
  const updatedIndicatorData = {
    ...indicatorData,
    value_range: summary.valueRange
      ? {
        min: Math.round(summary.valueRange.min),
        max: Math.round(summary.valueRange.max),
      }
      : indicatorData.value_range,
    countries: {} as Record<string, unknown>,
  };

  // Update country data with normalized values
  for (const result of normalizedResults) {
    const originalCountryData = indicatorData.countries[result.country];
    if (originalCountryData) {
      updatedIndicatorData.countries[result.country] = {
        ...originalCountryData,
        value: result.excluded
          ? originalCountryData.value
          : result.normalizedValue,
        tooltip: {
          ...originalCountryData.tooltip,
          units: result.excluded
            ? originalCountryData.tooltip?.units
            : result.normalizedUnit,
          wage_normalization: {
            excluded: result.excluded,
            exclusion_reason: result.exclusionReason,
            data_type: result.dataType,
            original_value: result.originalValue,
            original_unit: result.originalUnit,
          },
        },
      };
    }
  }

  return {
    original: indicatorData,
    normalized: updatedIndicatorData as IndicatorData,
    summary,
    comparable: comparableData,
  };
}
