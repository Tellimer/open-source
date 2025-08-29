/**
 * Advanced time sampling for upsampling and downsampling economic data
 * Handles conversion between different time frequencies with proper interpolation
 */

import type { TimeScale } from "../types.ts";

// Define the time scale type locally if not available in types
type LocalTimeScale = "hour" | "day" | "week" | "month" | "quarter" | "year";
import { PER_YEAR } from "../patterns.ts";

export type SamplingMethod =
  | "linear" // Linear interpolation
  | "step" // Step function (hold value)
  | "average" // Average over period
  | "sum" // Sum over period
  | "end_of_period" // Use end-of-period value
  | "start_of_period"; // Use start-of-period value

export interface TimeSeries {
  date: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface SamplingOptions {
  method: SamplingMethod;
  fillMissing?: boolean;
  fillValue?: number;
  preserveSeasonality?: boolean;
}

/**
 * Current implementation: Simple ratio-based conversion
 * This works for flow data (rates, wages per time period)
 */
export function simpleTimeConversion(
  value: number,
  from: LocalTimeScale,
  to: LocalTimeScale,
): number {
  if (from === to) return value;
  return value * (PER_YEAR[from] / PER_YEAR[to]);
}

/**
 * Enhanced time sampling for time series data
 * Handles upsampling (e.g., yearly to monthly) and downsampling (e.g., daily to monthly)
 */
export function resampleTimeSeries(
  data: TimeSeries[],
  targetFrequency: LocalTimeScale,
  options: SamplingOptions = { method: "linear" },
): TimeSeries[] {
  if (data.length === 0) return [];

  // Sort data by date
  const sortedData = [...data].sort((a, b) =>
    a.date.getTime() - b.date.getTime()
  );

  // Determine if this is upsampling or downsampling
  const sourceFrequency = inferFrequency(sortedData);
  const isUpsampling = PER_YEAR[targetFrequency] > PER_YEAR[sourceFrequency];

  if (isUpsampling) {
    return upsample(sortedData, targetFrequency, options);
  } else {
    return downsample(sortedData, targetFrequency, options);
  }
}

/**
 * Upsample data to higher frequency (e.g., yearly to monthly)
 */
function upsample(
  data: TimeSeries[],
  targetFrequency: TimeScale,
  options: SamplingOptions,
): TimeSeries[] {
  const result: TimeSeries[] = [];

  for (let i = 0; i < data.length - 1; i++) {
    const current = data[i];
    const next = data[i + 1];

    // Generate intermediate points
    const intermediatePoints = generateIntermediatePoints(
      current,
      next,
      targetFrequency,
      options.method,
    );

    result.push(...intermediatePoints);
  }

  // Add the last point
  if (data.length > 0) {
    result.push(data[data.length - 1]);
  }

  return result;
}

/**
 * Downsample data to lower frequency (e.g., daily to monthly)
 */
function downsample(
  data: TimeSeries[],
  targetFrequency: TimeScale,
  options: SamplingOptions,
): TimeSeries[] {
  const result: TimeSeries[] = [];
  const groups = groupByPeriod(data, targetFrequency);

  for (const [period, points] of groups) {
    if (points.length === 0) continue;

    let aggregatedValue: number;

    switch (options.method) {
      case "average":
        aggregatedValue = points.reduce((sum, p) => sum + p.value, 0) /
          points.length;
        break;
      case "sum":
        aggregatedValue = points.reduce((sum, p) => sum + p.value, 0);
        break;
      case "end_of_period":
        aggregatedValue = points[points.length - 1].value;
        break;
      case "start_of_period":
        aggregatedValue = points[0].value;
        break;
      default:
        aggregatedValue = points.reduce((sum, p) => sum + p.value, 0) /
          points.length;
    }

    result.push({
      date: new Date(period),
      value: aggregatedValue,
      metadata: {
        method: options.method,
        sourcePoints: points.length,
        period: targetFrequency,
      },
    });
  }

  return result;
}

/**
 * Generate intermediate points between two data points
 */
function generateIntermediatePoints(
  start: TimeSeries,
  end: TimeSeries,
  frequency: TimeScale,
  method: SamplingMethod,
): TimeSeries[] {
  const points: TimeSeries[] = [];
  const startTime = start.date.getTime();
  const endTime = end.date.getTime();
  const duration = endTime - startTime;

  // Calculate number of intermediate points needed
  const intervalMs = getIntervalMs(frequency);
  const numPoints = Math.floor(duration / intervalMs);

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints; // Interpolation factor (0 to 1)
    const date = new Date(startTime + (duration * t));

    let value: number;
    switch (method) {
      case "linear":
        value = start.value + (end.value - start.value) * t;
        break;
      case "step":
        value = start.value;
        break;
      default:
        value = start.value + (end.value - start.value) * t;
    }

    points.push({
      date,
      value,
      metadata: {
        interpolated: true,
        method,
        factor: t,
      },
    });
  }

  return points;
}

/**
 * Group data points by time period
 */
function groupByPeriod(
  data: TimeSeries[],
  frequency: LocalTimeScale,
): Map<string, TimeSeries[]> {
  const groups = new Map<string, TimeSeries[]>();

  for (const point of data) {
    const periodKey = getPeriodKey(point.date, frequency);

    if (!groups.has(periodKey)) {
      groups.set(periodKey, []);
    }
    groups.get(periodKey)!.push(point);
  }

  return groups;
}

/**
 * Get period key for grouping (e.g., "2024-01" for monthly)
 */
function getPeriodKey(date: Date, frequency: LocalTimeScale): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  switch (frequency) {
    case "year":
      return `${year}`;
    case "quarter":
      return `${year}-Q${Math.ceil(month / 3)}`;
    case "month":
      return `${year}-${month.toString().padStart(2, "0")}`;
    case "week": {
      const weekNum = Math.ceil(day / 7);
      return `${year}-${month.toString().padStart(2, "0")}-W${weekNum}`;
    }
    case "day":
      return `${year}-${month.toString().padStart(2, "0")}-${
        day.toString().padStart(2, "0")
      }`;
    case "hour":
      return `${year}-${month.toString().padStart(2, "0")}-${
        day.toString().padStart(2, "0")
      }-${date.getHours()}`;
    default:
      return date.toISOString();
  }
}

/**
 * Get interval in milliseconds for a frequency
 */
function getIntervalMs(frequency: TimeScale): number {
  const msPerDay = 24 * 60 * 60 * 1000;

  switch (frequency) {
    case "year":
      return 365 * msPerDay;
    case "quarter":
      return 91 * msPerDay; // ~3 months
    case "month":
      return 30 * msPerDay; // ~30 days
    case "week":
      return 7 * msPerDay;
    case "day":
      return msPerDay;
    case "hour":
      return 60 * 60 * 1000;
    default:
      return msPerDay;
  }
}

/**
 * Infer frequency from time series data
 */
function inferFrequency(data: TimeSeries[]): LocalTimeScale {
  if (data.length < 2) return "month"; // Default

  // Calculate average interval between points
  const intervals = [];
  for (let i = 1; i < Math.min(data.length, 10); i++) {
    intervals.push(data[i].date.getTime() - data[i - 1].date.getTime());
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const avgDays = avgInterval / (24 * 60 * 60 * 1000);

  // Map to closest frequency
  if (avgDays < 2) return "day";
  if (avgDays < 10) return "week";
  if (avgDays < 45) return "month";
  if (avgDays < 120) return "quarter";
  return "year";
}

/**
 * Convert wage data with proper time scaling
 * Handles the specific case of wage/salary data
 */
export function convertWageTimeScale(
  value: number,
  fromScale: LocalTimeScale,
  toScale: LocalTimeScale,
  wageType: "hourly" | "salary" = "salary",
): number {
  if (fromScale === toScale) return value;

  // For hourly wages, assume standard work hours
  if (fromScale === "hour") {
    const hoursPerYear = wageType === "hourly" ? 2080 : (365 * 24); // 40 hrs/week * 52 weeks
    const annualValue = value * hoursPerYear;
    return annualValue / PER_YEAR[toScale];
  }

  // For other conversions, use standard ratio
  return simpleTimeConversion(value, fromScale, toScale);
}

/**
 * Specialized wage time series processing
 */
export function processWageTimeSeries(
  wages: Array<{ date: Date; value: number; unit: string; country?: string }>,
  targetFrequency: LocalTimeScale = "month",
): Array<{ date: Date; value: number; unit: string; country?: string }> {
  const result = [];

  for (const wage of wages) {
    // Parse the time scale from unit
    const timeScale = parseTimeScaleFromUnit(wage.unit);
    if (!timeScale) {
      result.push(wage); // Can't convert, keep original
      continue;
    }

    // Convert to target frequency
    const convertedValue = convertWageTimeScale(
      wage.value,
      timeScale as LocalTimeScale,
      targetFrequency,
    );
    const newUnit = wage.unit.replace(
      new RegExp(`/(${timeScale}|${timeScale}s?)`, "i"),
      `/${targetFrequency}`,
    );

    result.push({
      ...wage,
      value: convertedValue,
      unit: newUnit,
    });
  }

  return result;
}

/**
 * Parse time scale from unit string
 */
function parseTimeScaleFromUnit(unit: string): TimeScale | null {
  const lowerUnit = unit.toLowerCase();

  if (lowerUnit.includes("hour")) return "hour";
  if (lowerUnit.includes("day")) return "day";
  if (lowerUnit.includes("week")) return "week";
  if (lowerUnit.includes("month")) return "month";
  if (lowerUnit.includes("quarter")) return "quarter";
  if (lowerUnit.includes("year")) return "year";

  return null;
}
