/**
 * Seasonal adjustment for time series
 */

export interface SeasonalOptions {
  method?: "moving_average" | "decomposition" | "x13";
  period?: number;
  trend?: boolean;
}

/**
 * Remove seasonal patterns from time series
 */
export function deseasonalize(
  data: Array<{ date: Date; value: number }>,
  options: SeasonalOptions = {},
): Array<{ date: Date; value: number; seasonal: number; adjusted: number }> {
  const { method = "moving_average", period = 12 } = options;

  switch (method) {
    case "moving_average":
      return deseasonalizeMA(data, period);
    case "decomposition":
      return decomposeTimeSeries(data, period);
    default:
      throw new Error(`Method ${method} not implemented`);
  }
}

/**
 * Moving average deseasonalization
 */
function deseasonalizeMA(
  data: Array<{ date: Date; value: number }>,
  period: number,
): Array<{ date: Date; value: number; seasonal: number; adjusted: number }> {
  // Calculate centered moving average
  const trend = calculateCenteredMA(
    data.map((d) => d.value),
    period,
  );

  // Calculate seasonal component
  const seasonal = calculateSeasonalComponent(
    data.map((d) => d.value),
    trend,
    period,
  );

  // Remove seasonal component
  return data.map((point, i) => ({
    date: point.date,
    value: point.value,
    seasonal: seasonal[i % period],
    adjusted: point.value - seasonal[i % period],
  }));
}

/**
 * Classical decomposition
 */
function decomposeTimeSeries(
  data: Array<{ date: Date; value: number }>,
  period: number,
): Array<{ date: Date; value: number; seasonal: number; adjusted: number }> {
  const values = data.map((d) => d.value);

  // Step 1: Calculate trend using moving average
  const trend = calculateCenteredMA(values, period);

  // Step 2: Detrend the series
  const detrended = values.map((v, i) => v - (trend[i] || 0));

  // Step 3: Calculate seasonal indices
  const seasonalIndices = new Array(period).fill(0);
  const counts = new Array(period).fill(0);

  for (let i = 0; i < detrended.length; i++) {
    const seasonIndex = i % period;
    seasonalIndices[seasonIndex] += detrended[i];
    counts[seasonIndex]++;
  }

  for (let i = 0; i < period; i++) {
    seasonalIndices[i] /= counts[i];
  }

  // Step 4: Create adjusted series
  return data.map((point, i) => ({
    date: point.date,
    value: point.value,
    seasonal: seasonalIndices[i % period],
    adjusted: point.value - seasonalIndices[i % period],
  }));
}

/**
 * Calculate centered moving average
 */
function calculateCenteredMA(values: number[], period: number): number[] {
  const result: number[] = [];
  const halfPeriod = Math.floor(period / 2);

  for (let i = 0; i < values.length; i++) {
    if (i < halfPeriod || i >= values.length - halfPeriod) {
      result.push(values[i]); // Use original value at boundaries
    } else {
      const start = i - halfPeriod;
      const end = i + halfPeriod + 1;
      const slice = values.slice(start, end);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      result.push(avg);
    }
  }

  return result;
}

/**
 * Calculate seasonal component
 */
function calculateSeasonalComponent(
  values: number[],
  trend: number[],
  period: number,
): number[] {
  const seasonal = new Array(period).fill(0);
  const counts = new Array(period).fill(0);

  for (let i = 0; i < values.length; i++) {
    const seasonIndex = i % period;
    seasonal[seasonIndex] += values[i] - trend[i];
    counts[seasonIndex]++;
  }

  return seasonal.map((s, i) => s / counts[i]);
}

/**
 * Detect seasonality in time series
 */
export function detectSeasonality(
  data: Array<{ value: number }>,
  maxPeriod = 24,
): { hasSeasonal: boolean; period?: number; strength?: number } {
  const values = data.map((d) => d.value);

  if (values.length < maxPeriod * 2) {
    return { hasSeasonal: false };
  }

  // Use autocorrelation to detect periodicity
  let maxCorr = 0;
  let bestPeriod = 0;

  for (let lag = 2; lag <= maxPeriod; lag++) {
    const corr = autocorrelation(values, lag);
    if (corr > maxCorr) {
      maxCorr = corr;
      bestPeriod = lag;
    }
  }

  // Threshold for detecting seasonality
  const hasSeasonality = maxCorr > 0.5;

  return {
    hasSeasonal: hasSeasonality,
    period: hasSeasonality ? bestPeriod : undefined,
    strength: maxCorr,
  };
}

/**
 * Calculate autocorrelation at given lag
 */
function autocorrelation(values: number[], lag: number): number {
  const n = values.length - lag;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (values[i] - mean) * (values[i + lag] - mean);
  }

  for (let i = 0; i < values.length; i++) {
    denominator += Math.pow(values[i] - mean, 2);
  }

  return numerator / denominator;
}
