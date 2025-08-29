/**
 * Example usage of wages normalization with real data
 */

import {
  getComparableWagesData,
  getWageNormalizationSummary,
  normalizeWagesData,
  type WageDataPoint,
} from "./wages-normalization.ts";
import type { FXTable } from "../types.ts";

// Example FX rates (in production, fetch from live API)
const fx: FXTable = {
  base: "USD",
  rates: {
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.36,
    AUD: 1.52,
    AMD: 387.5,
    AZN: 1.70,
    BGN: 1.80,
    BAM: 1.80,
    BRL: 5.15,
    CNY: 7.25,
    CZK: 22.8,
    CUP: 24.0,
  },
};

/**
 * Convert your wages data format to the expected format
 */
function convertWagesDataFormat(wagesIndicatorData: {
  countries: Record<string, unknown>;
}): WageDataPoint[] {
  const wagePoints: WageDataPoint[] = [];

  for (
    const [countryCode, countryData] of Object.entries(
      wagesIndicatorData.countries,
    )
  ) {
    const data = countryData as {
      value: string;
      tooltip?: {
        indicatorId?: string;
        currency?: string;
        units?: string;
        periodicity?: string;
        sources?: unknown[];
        original_value?: string;
        normalized_value?: string;
        normalization_metadata?: unknown;
      };
    };

    wagePoints.push({
      country: countryCode,
      value: parseFloat(data.value),
      unit: data.tooltip?.units || "unknown",
      currency: data.tooltip?.currency,
      date: data.date,
      metadata: {
        indicatorId: data.tooltip?.indicatorId,
        sources: data.tooltip?.sources,
        periodicity: data.tooltip?.periodicity,
        original_value: data.tooltip?.original_value,
        normalized_value: data.tooltip?.normalized_value,
        normalization_metadata: data.tooltip?.normalization_metadata,
      },
    });
  }

  return wagePoints;
}

/**
 * Main function to process wages data
 */
export function processWagesData(wagesIndicatorData: {
  indicator_id: string;
  indicator_name: string;
  value_range: { min: number; max: number };
  countries: Record<string, unknown>;
}) {
  console.log("🔧 Processing Wages in Manufacturing Data...\n");

  // Convert to our format
  const wagePoints = convertWagesDataFormat(wagesIndicatorData);
  console.log(`📊 Found ${wagePoints.length} countries with wage data\n`);

  // Show original data issues
  console.log("❌ Original Data Issues:");
  console.log(
    `Value range: ${wagesIndicatorData.value_range.min} to ${wagesIndicatorData.value_range.max}`,
  );
  console.log("Mixed units found:");
  const units = [...new Set(wagePoints.map((w) => w.unit))];
  units.forEach((unit) => console.log(`  - ${unit}`));
  console.log("");

  // Normalize the data
  const normalizedResults = normalizeWagesData(wagePoints, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    fx,
    excludeIndexValues: false, // Keep index values for analysis
    includeMetadata: true,
  });

  // Get summary
  const summary = getWageNormalizationSummary(normalizedResults);
  console.log("📈 Normalization Summary:");
  console.log(`Total countries: ${summary.total}`);
  console.log(`Successfully normalized: ${summary.normalized}`);
  console.log(`Excluded: ${summary.excluded}`);
  console.log(
    `Data types: ${summary.dataTypes.currency} currency, ${summary.dataTypes.index} index, ${summary.dataTypes.unknown} unknown`,
  );

  if (summary.statistics) {
    console.log(
      `Normalized value range: $${Math.round(summary.statistics.min)} - $${
        Math.round(summary.statistics.max)
      } USD/month`,
    );
    console.log(`Mean: $${Math.round(summary.statistics.mean)} USD/month`);
    console.log(`Median: $${Math.round(summary.statistics.median)} USD/month`);
  }
  console.log("");

  // Show exclusion reasons
  if (Object.keys(summary.exclusionReasons).length > 0) {
    console.log("⚠️  Exclusion Reasons:");
    Object.entries(summary.exclusionReasons).forEach(([reason, count]) => {
      console.log(`  - ${reason}: ${count} countries`);
    });
    console.log("");
  }

  // Get comparable data only
  const comparableData = getComparableWagesData(normalizedResults);
  console.log("✅ Comparable Wage Data (Currency-based only):");
  console.log(
    `${comparableData.length} countries with comparable monthly wages in USD:`,
  );

  // Sort by normalized value for better display
  const sortedComparable = comparableData
    .sort((a, b) => (b.normalizedValue || 0) - (a.normalizedValue || 0))
    .slice(0, 10); // Top 10

  sortedComparable.forEach((item) => {
    console.log(
      `  ${item.country}: $${
        Math.round(item.normalizedValue!)
      } USD/month (was ${item.originalValue} ${item.originalUnit})`,
    );
  });

  if (comparableData.length > 10) {
    console.log(`  ... and ${comparableData.length - 10} more countries`);
  }
  console.log("");

  // Show index-based data separately
  const indexData = normalizedResults.filter((r) => r.dataType === "index");
  if (indexData.length > 0) {
    console.log("📊 Index-based Wage Data (not directly comparable):");
    indexData.forEach((item) => {
      console.log(
        `  ${item.country}: ${item.originalValue} ${item.originalUnit}`,
      );
    });
    console.log("");
  }

  return {
    original: wagePoints,
    normalized: normalizedResults,
    comparable: comparableData,
    summary,
  };
}

/**
 * Example with your actual data structure
 */
export function exampleUsage() {
  // Your wages data structure (truncated for example)
  const wagesData = {
    indicator_id: "WAGES_IN_MANUFACTURING",
    indicator_name: "Wages in Manufacturing",
    value_range: { min: 4.1, max: 5582097 },
    countries: {
      ARM: {
        value: "240450.000",
        tooltip: {
          units: "AMD/Month",
          currency: "AMD",
          periodicity: "Monthly",
        },
      },
      AUS: {
        value: "1631.100",
        tooltip: {
          units: "AUD/Week",
          currency: "AUD",
          periodicity: "Quarterly",
        },
      },
      AUT: {
        value: "132.100",
        tooltip: {
          units: "points",
          currency: null,
          periodicity: "Monthly",
        },
      },
      CAN: {
        value: "30.660",
        tooltip: {
          units: "CAD/Hour",
          currency: "CAD",
          periodicity: "Monthly",
        },
      },
    },
  };

  return processWagesData(wagesData);
}

// Run example if this file is executed directly
if (import.meta.main) {
  exampleUsage();
}
