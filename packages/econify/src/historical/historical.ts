/**
 * Historical data support for time-series analysis
 */

import type { FXTable, Scale, TimeScale } from "../types.ts";
import { normalizeValue } from "../normalization/normalization.ts";
import { fetchLiveFXRates } from "../fx/live_fx.ts";

export interface HistoricalDataPoint {
  date: Date;
  value: number;
  unit: string;
}

export interface HistoricalOptions {
  date?: Date | string;
  toCurrency?: string;
  toMagnitude?: Scale;
  toTimeScale?: TimeScale;
  fxSource?: "historical" | "current";
  interpolate?: boolean;
}

export interface HistoricalFXCache {
  [date: string]: FXTable;
}

// Cache for historical FX rates
const historicalFXCache: HistoricalFXCache = {};

/**
 * Normalize a value using historical FX rates
 */
export async function normalizeHistorical(
  value: number,
  unit: string,
  options: HistoricalOptions = {},
): Promise<number> {
  const {
    date = new Date(),
    toCurrency,
    toMagnitude,
    toTimeScale,
    fxSource = "historical",
    interpolate = false,
  } = options;

  const dateStr = typeof date === "string"
    ? date
    : date.toISOString().split("T")[0];

  // Get FX rates for the specified date
  const fx = await getHistoricalFXRates(dateStr, fxSource);

  // Use standard normalization with historical rates
  return normalizeValue(value, unit, {
    toCurrency,
    toMagnitude,
    toTimeScale,
    fx,
  });
}

/**
 * Get historical FX rates for a specific date
 */
export async function getHistoricalFXRates(
  date: string,
  source: "historical" | "current" = "historical",
): Promise<FXTable> {
  // Check cache first
  if (historicalFXCache[date]) {
    return historicalFXCache[date];
  }

  if (source === "current") {
    // Use current rates as approximation
    return await fetchLiveFXRates("USD");
  }

  // Fetch historical rates from API
  try {
    const response = await fetchHistoricalFromAPI(date);
    historicalFXCache[date] = response;
    return response;
  } catch (error) {
    console.warn(
      `Failed to fetch historical rates for ${date}, using current rates`,
    );
    return await fetchLiveFXRates("USD");
  }
}

/**
 * Fetch historical rates from API
 */
async function fetchHistoricalFromAPI(date: string): Promise<FXTable> {
  const url = `https://api.frankfurter.app/${date}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      base: data.base,
      rates: data.rates,
    };
  } catch (error) {
    throw new Error(`Failed to fetch historical rates: ${error}`);
  }
}

/**
 * Process time series data with normalization
 */
export async function normalizeTimeSeries(
  series: HistoricalDataPoint[],
  options: Omit<HistoricalOptions, "date"> = {},
): Promise<HistoricalDataPoint[]> {
  const normalized: HistoricalDataPoint[] = [];

  for (const point of series) {
    const value = await normalizeHistorical(
      point.value,
      point.unit,
      { ...options, date: point.date },
    );

    normalized.push({
      date: point.date,
      value,
      unit: buildNormalizedUnit(point.unit, options),
    });
  }

  return normalized;
}

/**
 * Build normalized unit string
 */
function buildNormalizedUnit(
  originalUnit: string,
  options: Omit<HistoricalOptions, "date">,
): string {
  const parts: string[] = [];

  if (options.toCurrency) {
    parts.push(options.toCurrency);
  }

  if (options.toMagnitude) {
    parts.push(options.toMagnitude);
  }

  if (options.toTimeScale) {
    parts.push(`per ${options.toTimeScale}`);
  }

  return parts.join(" ") || originalUnit;
}

/**
 * Calculate period-over-period changes
 */
export function calculateChanges(
  series: HistoricalDataPoint[],
  type: "absolute" | "percentage" | "log" = "percentage",
): Array<HistoricalDataPoint & { change?: number }> {
  if (series.length < 2) {
    return series.map((p) => ({ ...p, change: undefined }));
  }

  return series.map((point, index) => {
    if (index === 0) {
      return { ...point, change: undefined };
    }

    const prev = series[index - 1].value;
    const curr = point.value;

    let change: number;
    switch (type) {
      case "absolute":
        change = curr - prev;
        break;
      case "percentage":
        change = ((curr - prev) / prev) * 100;
        break;
      case "log":
        change = Math.log(curr / prev);
        break;
    }

    return { ...point, change };
  });
}

/**
 * Resample time series to different frequency
 */
export function resampleTimeSeries(
  series: HistoricalDataPoint[],
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
  aggregation: "sum" | "average" | "last" | "first" = "average",
): HistoricalDataPoint[] {
  const grouped = groupByPeriod(series, frequency);
  const resampled: HistoricalDataPoint[] = [];

  for (const [period, points] of Object.entries(grouped)) {
    const date = new Date(period);
    let value: number;

    switch (aggregation) {
      case "sum":
        value = points.reduce((sum, p) => sum + p.value, 0);
        break;
      case "average":
        value = points.reduce((sum, p) => sum + p.value, 0) / points.length;
        break;
      case "last":
        value = points[points.length - 1].value;
        break;
      case "first":
        value = points[0].value;
        break;
    }

    resampled.push({
      date,
      value,
      unit: points[0].unit,
    });
  }

  return resampled.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Group time series by period
 */
function groupByPeriod(
  series: HistoricalDataPoint[],
  frequency: string,
): Record<string, HistoricalDataPoint[]> {
  const grouped: Record<string, HistoricalDataPoint[]> = {};

  for (const point of series) {
    const key = getPeriodKey(point.date, frequency);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(point);
  }

  return grouped;
}

/**
 * Get period key for grouping
 */
function getPeriodKey(date: Date, frequency: string): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const quarter = Math.floor(month / 3);
  const week = getWeekNumber(date);

  switch (frequency) {
    case "daily":
      return date.toISOString().split("T")[0];
    case "weekly":
      return `${year}-W${week}`;
    case "monthly":
      return `${year}-${String(month + 1).padStart(2, "0")}`;
    case "quarterly":
      return `${year}-Q${quarter + 1}`;
    case "yearly":
      return String(year);
    default:
      return date.toISOString();
  }
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
