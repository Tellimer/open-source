/**
 * Statistical aggregations with unit handling
 */

import { normalizeValue } from "../normalization/normalization.ts";
import { parseUnit } from "../units/units.ts";
import type { FXTable } from "../types.ts";

/** Options for aggregate() controlling method and normalization. */
export interface AggregationOptions {
  method:
    | "sum"
    | "average"
    | "median"
    | "weightedAverage"
    | "geometricMean"
    | "harmonicMean";
  weights?: number[] | string;
  normalizeFirst?: boolean;
  targetUnit?: string;
  fx?: FXTable;
  skipInvalid?: boolean;
}

/** Result of aggregate() including metadata. */
export interface AggregationResult {
  value: number;
  unit: string;
  method: string;
  count: number;
  metadata?: {
    min?: number;
    max?: number;
    stdDev?: number;
    variance?: number;
  };
}

/**
 * Aggregate values with proper unit handling
 */
export function aggregate(
  data: Array<{ value: number; unit: string; weight?: number }>,
  options: AggregationOptions,
): AggregationResult {
  const {
    method,
    normalizeFirst = true,
    targetUnit,
    fx,
    skipInvalid = true,
  } = options;

  // Normalize to common unit if needed
  let values: number[] = [];
  const finalUnit = targetUnit || data[0]?.unit || "unknown";

  if (normalizeFirst && targetUnit) {
    for (const item of data) {
      try {
        const normalized = normalizeValue(item.value, item.unit, {
          fx,
          ...parseTargetUnit(targetUnit),
        });
        values.push(normalized);
      } catch (error) {
        if (!skipInvalid) throw error;
        console.warn(`Skipping invalid item: ${error}`);
      }
    }
  } else {
    values = data.map((d) => d.value);
  }

  if (values.length === 0) {
    throw new Error("No valid values to aggregate");
  }

  // Perform aggregation
  let result: number;
  switch (method) {
    case "sum":
      result = sum(values);
      break;
    case "average":
      result = average(values);
      break;
    case "median":
      result = median(values);
      break;
    case "weightedAverage":
      result = weightedAverage(values, extractWeights(data, options.weights));
      break;
    case "geometricMean":
      result = geometricMean(values);
      break;
    case "harmonicMean":
      result = harmonicMean(values);
      break;
    default:
      throw new Error(`Unknown aggregation method: ${method}`);
  }

  // Calculate metadata
  const metadata = {
    min: Math.min(...values),
    max: Math.max(...values),
    stdDev: standardDeviation(values),
    variance: variance(values),
  };

  return {
    value: result,
    unit: finalUnit,
    method,
    count: values.length,
    metadata,
  };
}

/**
 * Parse target unit string
 */
function parseTargetUnit(targetUnit: string): {
  currency?: string;
  scale?: string;
  timeScale?: string;
} {
  const parsed = parseUnit(targetUnit);
  return {
    currency: parsed.currency,
    scale: parsed.scale,
    timeScale: parsed.timeScale,
  };
}

/**
 * Extract weights
 */
function extractWeights(
  data: Array<{ value: number; unit: string; weight?: number }>,
  weights?: number[] | string,
): number[] {
  if (Array.isArray(weights)) {
    return weights;
  }

  if (typeof weights === "string" && weights === "value") {
    return data.map((d) => Math.abs(d.value));
  }

  return data.map((d) => d.weight || 1);
}

// Statistical functions
function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function average(values: number[]): number {
  return sum(values) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function weightedAverage(values: number[], weights: number[]): number {
  const weightSum = sum(weights);
  return values.reduce((acc, val, i) => acc + val * weights[i], 0) / weightSum;
}

function geometricMean(values: number[]): number {
  const product = values.reduce((a, b) => a * b, 1);
  return Math.pow(product, 1 / values.length);
}

function harmonicMean(values: number[]): number {
  const reciprocalSum = values.reduce((a, b) => a + 1 / b, 0);
  return values.length / reciprocalSum;
}

function variance(values: number[]): number {
  const mean = average(values);
  return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
}

function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

/**
 * Moving average with unit preservation
 */
export function movingAverage(
  series: Array<{ value: number; unit: string; timestamp?: Date }>,
  window: number,
  centered = false,
): Array<{ value: number; unit: string; timestamp?: Date }> {
  const result: Array<{ value: number; unit: string; timestamp?: Date }> = [];

  for (let i = 0; i < series.length; i++) {
    const start = centered
      ? Math.max(0, i - Math.floor(window / 2))
      : Math.max(0, i - window + 1);
    const end = centered
      ? Math.min(series.length, i + Math.ceil(window / 2))
      : i + 1;
    const slice = series.slice(start, end);

    if (slice.length > 0) {
      const avg = aggregate(slice, { method: "average" });
      result.push({
        value: avg.value,
        unit: series[i].unit,
        timestamp: series[i].timestamp,
      });
    }
  }

  return result;
}
