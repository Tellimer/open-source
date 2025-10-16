/**
 * Rule-based inference functions for currency, scale, and time
 * Fast, deterministic alternatives to LLM-based inference
 */

import type { UnitSemanticType } from "./unit-classifier.ts";

/**
 * Rule-based currency check
 * Uses the parsed results from normalization
 */
export function checkCurrencyRuleBased(input: {
  parsedUnitType: UnitSemanticType;
  parsedCurrency: string | null;
}): {
  isCurrencyDenominated: boolean;
  detectedCurrency: string | null;
  confidence: number;
  reasoning: string;
} {
  const isCurrency = input.parsedUnitType === "currency-amount" ||
    input.parsedCurrency !== null;

  return {
    isCurrencyDenominated: isCurrency,
    detectedCurrency: input.parsedCurrency,
    confidence: 1.0, // Rule-based is deterministic
    reasoning: isCurrency
      ? `Currency detected from unit type: ${input.parsedUnitType}, currency code: ${input.parsedCurrency || "N/A"}`
      : `Not currency-denominated. Unit type: ${input.parsedUnitType}`,
  };
}

/**
 * Rule-based scale inference
 * Uses the parsed scale from normalization, with validation
 */
export function inferScaleRuleBased(input: {
  parsedScale: string;
  name: string;
  units?: string;
}): {
  scale: string;
  confidence: number;
  reasoning: string;
} {
  // Map parsed scale to schema enum
  let scale: string;
  const lower = input.parsedScale.toLowerCase();

  if (lower === "raw" || lower === "raw-units" || lower === "ones") {
    scale = "raw-units";
  } else if (lower.includes("percent") || lower === "%") {
    scale = "percent";
  } else if (lower.includes("thousand")) {
    scale = "thousands";
  } else if (lower.includes("million")) {
    scale = "millions";
  } else if (lower.includes("billion")) {
    scale = "billions";
  } else if (lower.includes("index")) {
    scale = "index";
  } else {
    scale = "raw-units"; // Default fallback
  }

  return {
    scale,
    confidence: 1.0, // Rule-based is deterministic
    reasoning: `Scale determined from parsed units: ${input.parsedScale}`,
  };
}

/**
 * Analyze time series data to detect reporting frequency
 */
function analyzeTimeSeriesFrequency(
  sampleValues: Array<{ date: string; value: number }>,
): {
  frequency: "daily" | "monthly" | "quarterly" | "annual" | "point-in-time";
  confidence: number;
} | null {
  if (!sampleValues || sampleValues.length < 2) {
    return null;
  }

  try {
    // Parse dates and filter out invalid/aggregate dates (like "last10YearsAvg")
    const dates = sampleValues
      .map((sv) => new Date(sv.date))
      .filter((d) => !isNaN(d.getTime())) // Remove invalid dates
      .sort((a, b) => a.getTime() - b.getTime());

    // Need at least 2 valid dates to calculate intervals
    if (dates.length < 2) {
      return null;
    }

    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const daysDiff = (dates[i].getTime() - dates[i - 1].getTime()) /
        (1000 * 60 * 60 * 24);
      intervals.push(daysDiff);
    }

    // Calculate median interval
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];

    // Determine frequency based on median interval
    let frequency: "daily" | "monthly" | "quarterly" | "annual" |
      "point-in-time";
    let confidence = 0.9;

    if (medianInterval < 7) {
      frequency = "daily";
    } else if (medianInterval < 45) {
      // ~1-6 weeks = monthly
      frequency = "monthly";
    } else if (medianInterval < 180) {
      // ~2-5 months = quarterly
      frequency = "quarterly";
    } else if (medianInterval < 450) {
      // ~6-14 months = annual
      frequency = "annual";
    } else {
      // Very sparse data
      frequency = "point-in-time";
      confidence = 0.6;
    }

    return { frequency, confidence };
  } catch (error) {
    return null;
  }
}

/**
 * Determine time basis from indicator name and unit type
 */
function determineTimeBasis(input: {
  name: string;
  units?: string;
  parsedUnitType: UnitSemanticType;
}): {
  timeBasis: "per-period" | "point-in-time" | "cumulative";
  confidence: number;
  reasoning: string;
} {
  const lower = input.name.toLowerCase();
  const unitsLower = (input.units || "").toLowerCase();

  // Cumulative patterns
  if (
    lower.includes("cumulative") ||
    lower.includes("year-to-date") ||
    lower.includes("ytd") ||
    unitsLower.includes("cumulative")
  ) {
    return {
      timeBasis: "cumulative",
      confidence: 1.0,
      reasoning: "Cumulative detected in name or units",
    };
  }

  // Point-in-time patterns (stocks, balances, rates, indices)
  if (
    // Stocks and balances
    lower.includes("reserve") ||
    lower.includes("debt outstanding") ||
    lower.includes("stock") ||
    lower.includes("balance") ||
    // Rates and prices
    lower.includes("rate") ||
    lower.includes("price") ||
    lower.includes("yield") ||
    // Indices and ratios
    input.parsedUnitType === "index" ||
    input.parsedUnitType === "ratio" ||
    input.parsedUnitType === "percentage" ||
    // Population counts
    lower.includes("population")
  ) {
    return {
      timeBasis: "point-in-time",
      confidence: 0.9,
      reasoning: "Point-in-time indicator based on name/type patterns",
    };
  }

  // Per-period patterns (flows, changes, growth)
  if (
    lower.includes("growth") ||
    lower.includes("change") ||
    lower.includes("flow") ||
    lower.includes("export") ||
    lower.includes("import") ||
    lower.includes("trade") ||
    lower.includes("investment") ||
    lower.includes("gdp") ||
    lower.includes("gni") ||
    lower.includes("revenue") ||
    lower.includes("expenditure") ||
    lower.includes("production") ||
    lower.includes("sales")
  ) {
    return {
      timeBasis: "per-period",
      confidence: 0.9,
      reasoning: "Per-period indicator based on flow/change patterns",
    };
  }

  // Currency amounts are usually per-period (except reserves/debt)
  if (input.parsedUnitType === "currency-amount") {
    return {
      timeBasis: "per-period",
      confidence: 0.7,
      reasoning:
        "Currency amount assumed per-period (flow) unless explicitly a stock",
    };
  }

  // Default fallback
  return {
    timeBasis: "point-in-time",
    confidence: 0.5,
    reasoning: "Default assumption: point-in-time (no clear pattern detected)",
  };
}

/**
 * Extract reporting frequency from units or periodicity
 */
function extractFrequencyFromMetadata(input: {
  units?: string;
  periodicity?: string;
}): {
  frequency: "daily" | "monthly" | "quarterly" | "annual" | "point-in-time";
  confidence: number;
  source: "units" | "periodicity";
} | null {
  const unitsLower = (input.units || "").toLowerCase();
  const periodicityLower = (input.periodicity || "").toLowerCase();

  // Check units first
  if (unitsLower.includes("per day") || unitsLower.includes("daily")) {
    return { frequency: "daily", confidence: 1.0, source: "units" };
  }
  if (unitsLower.includes("per month") || unitsLower.includes("monthly")) {
    return { frequency: "monthly", confidence: 1.0, source: "units" };
  }
  if (
    unitsLower.includes("per quarter") || unitsLower.includes("quarterly")
  ) {
    return { frequency: "quarterly", confidence: 1.0, source: "units" };
  }
  if (
    unitsLower.includes("per year") || unitsLower.includes("annual") ||
    unitsLower.includes("yearly")
  ) {
    return { frequency: "annual", confidence: 1.0, source: "units" };
  }

  // Check periodicity
  if (periodicityLower.includes("daily")) {
    return { frequency: "daily", confidence: 0.95, source: "periodicity" };
  }
  if (periodicityLower.includes("monthly")) {
    return { frequency: "monthly", confidence: 0.95, source: "periodicity" };
  }
  if (periodicityLower.includes("quarterly")) {
    return { frequency: "quarterly", confidence: 0.95, source: "periodicity" };
  }
  if (periodicityLower.includes("annual") || periodicityLower.includes("year")) {
    return { frequency: "annual", confidence: 0.95, source: "periodicity" };
  }

  return null;
}

/**
 * Rule-based time inference
 * Analyzes time series data, units, periodicity, and name patterns
 */
export function inferTimeRuleBased(input: {
  name: string;
  units?: string;
  periodicity?: string;
  parsedUnitType: UnitSemanticType;
  sampleValues?: Array<{ date: string; value: number }>;
}): {
  reportingFrequency: "daily" | "monthly" | "quarterly" | "annual" |
    "point-in-time";
  timeBasis: "per-period" | "point-in-time" | "cumulative";
  confidence: number;
  reasoning: string;
  sourceUsed: "units" | "periodicity" | "time-series" | "unknown";
} {
  // Step 1: Try to get frequency from metadata (units/periodicity)
  const metadataFreq = extractFrequencyFromMetadata({
    units: input.units,
    periodicity: input.periodicity,
  });

  // Step 2: Try to get frequency from time series analysis
  const timeSeriesFreq = input.sampleValues
    ? analyzeTimeSeriesFrequency(input.sampleValues)
    : null;

  // Step 3: Determine which source to trust
  let reportingFrequency: "daily" | "monthly" | "quarterly" | "annual" |
    "point-in-time";
  let sourceUsed: "units" | "periodicity" | "time-series" | "unknown";
  let frequencyConfidence: number;

  if (timeSeriesFreq && metadataFreq) {
    // If both available, trust time series over metadata (as per original prompt)
    reportingFrequency = timeSeriesFreq.frequency;
    sourceUsed = "time-series";
    frequencyConfidence = timeSeriesFreq.confidence;
  } else if (metadataFreq) {
    reportingFrequency = metadataFreq.frequency;
    sourceUsed = metadataFreq.source;
    frequencyConfidence = metadataFreq.confidence;
  } else if (timeSeriesFreq) {
    reportingFrequency = timeSeriesFreq.frequency;
    sourceUsed = "time-series";
    frequencyConfidence = timeSeriesFreq.confidence;
  } else {
    reportingFrequency = "point-in-time";
    sourceUsed = "unknown";
    frequencyConfidence = 0.3;
  }

  // Step 4: Determine time basis
  const timeBasisResult = determineTimeBasis({
    name: input.name,
    units: input.units,
    parsedUnitType: input.parsedUnitType,
  });

  // Overall confidence is average of frequency and time basis confidence
  const overallConfidence = (frequencyConfidence +
    timeBasisResult.confidence) / 2;

  return {
    reportingFrequency,
    timeBasis: timeBasisResult.timeBasis,
    confidence: overallConfidence,
    reasoning:
      `Frequency: ${reportingFrequency} (from ${sourceUsed}). Time basis: ${timeBasisResult.timeBasis} (${timeBasisResult.reasoning})`,
    sourceUsed,
  };
}
