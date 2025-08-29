/**
 * Example of integrating wage-specific handling into existing pipeline
 */

import { processWagesIndicator } from "./pipeline-integration.ts";
import type { FXTable } from "../types.ts";

interface IndicatorData {
  indicator_id: string;
  indicator_name: string;
  countries: Record<string, unknown>;
  [key: string]: unknown;
}

interface ProcessingResult {
  original: IndicatorData;
  normalized: IndicatorData;
  summary: unknown;
  comparable: unknown[];
}

// Example FX rates (in production, fetch from your FX service)
const fx: FXTable = {
  base: "USD",
  rates: {
    EUR: 0.92,
    ALL: 90.91,
    ARS: 350.0,
    AMD: 387.5,
    AUD: 1.52,
    AZN: 1.70,
    BGN: 1.80,
    BHD: 0.377,
    BAM: 1.80,
    BYN: 3.20,
    BRL: 5.15,
    BWP: 13.5,
    CAD: 1.36,
    CHF: 0.88,
    CLP: 950.0,
    CNY: 7.25,
    CRC: 520.0,
    CUP: 24.0,
    CZK: 22.8,
    DKK: 6.85,
  },
};

/**
 * Enhanced indicator processing with wage-specific handling
 */
export function processIndicatorWithWageHandling(
  indicatorData: IndicatorData,
  fxRates: FXTable = fx,
): ProcessingResult | IndicatorData {
  const indicatorId = indicatorData.indicator_id;

  // Check if this is a wages-related indicator
  const isWagesIndicator = detectWagesIndicator(indicatorId, indicatorData);

  if (isWagesIndicator) {
    console.log(`🔧 Processing wages indicator: ${indicatorId}`);

    const result = processWagesIndicator(indicatorData, fxRates, {
      targetCurrency: "USD",
      excludeIndexValues: false,
    });

    console.log(`✅ Wages processing complete:`);
    console.log(`   - Total countries: ${result.summary.total}`);
    console.log(`   - Comparable values: ${result.summary.comparable}`);
    console.log(
      `   - Value range: $${
        Math.round(result.summary.valueRange?.min || 0)
      } - $${Math.round(result.summary.valueRange?.max || 0)} USD/month`,
    );

    return result.normalized;
  } else {
    console.log(`📊 Processing standard indicator: ${indicatorId}`);
    // Return original data for non-wages indicators
    // In your actual implementation, you'd apply standard normalization here
    return indicatorData;
  }
}

/**
 * Detect if an indicator is wages-related
 */
function detectWagesIndicator(
  indicatorId: string,
  indicatorData: IndicatorData,
): boolean {
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

  // Check indicator ID and name
  const id = indicatorId.toLowerCase();
  const name = (indicatorData.indicator_name || "").toLowerCase();

  if (
    wageKeywords.some((keyword) =>
      id.includes(keyword) || name.includes(keyword)
    )
  ) {
    return true;
  }

  // Check if countries have wage-like units
  const countries = indicatorData.countries || {};
  const sampleCountries = Object.values(countries).slice(0, 5) as Record<
    string,
    unknown
  >[];

  const hasWageUnits = sampleCountries.some((country) => {
    const units = country.tooltip?.units || "";
    return /[A-Z]{3}\/(Hour|Day|Week|Month|Year)/i.test(units);
  });

  return hasWageUnits;
}

/**
 * Example usage with your actual data
 */
export function exampleUsage() {
  // Your wages data
  const wagesData = {
    indicator_id: "WAGES",
    indicator_name: "Wages",
    value_range: { min: 29.68, max: 7473636.363636364 },
    countries: {
      ALB: {
        date: "2025-03-31",
        value: 7473636.363636364,
        tooltip: {
          indicatorId: "ALBANIAWAG",
          currency: "ALL",
          units: "ALL/Month",
          periodicity: "Quarterly",
          original_value: "82210.000",
        },
      },
      ARG: {
        date: "2025-05-31",
        value: "1627306.000",
        tooltip: {
          indicatorId: "ARGENTINAWAG",
          currency: "ARS",
          units: "ARS/Month",
          periodicity: "Monthly",
        },
      },
      CAN: {
        date: "2023-07-31",
        value: "29.680",
        tooltip: {
          indicatorId: "CANADAWAG",
          currency: "CAD",
          units: "CAD/Hour",
          periodicity: "Monthly",
        },
      },
      CHN: {
        date: "2024-12-31",
        value: "124110.000",
        tooltip: {
          indicatorId: "CHINAWAG",
          currency: "CNY",
          units: "CNY/Year",
          periodicity: "Yearly",
        },
      },
    },
  };

  console.log("🚀 Processing wages indicator...\n");

  const processed = processIndicatorWithWageHandling(wagesData);

  console.log("\n📊 Results:");
  console.log(
    `Original value range: ${wagesData.value_range.min} - ${wagesData.value_range.max}`,
  );
  console.log(
    `Normalized value range: ${processed.value_range.min} - ${processed.value_range.max}`,
  );

  console.log("\n🔍 Sample normalized countries:");
  Object.entries(processed.countries).slice(0, 3).forEach(
    ([country, data]) => {
      const original =
        wagesData.countries[country as keyof typeof wagesData.countries];
      console.log(`${country}:`);
      console.log(`  Original: ${original.value} ${original.tooltip.units}`);
      console.log(
        `  Normalized: ${Math.round(data.value)} ${data.tooltip.units}`,
      );
      console.log(`  Data type: ${data.tooltip.wage_normalization.data_type}`);
    },
  );

  return processed;
}

/**
 * Integration patterns for different scenarios
 */
export const integrationPatterns = {
  // Pattern 1: Middleware approach
  middlewarePattern(indicatorData: IndicatorData, fxRates: FXTable) {
    // Add this as middleware in your data processing pipeline
    if (detectWagesIndicator(indicatorData.indicator_id, indicatorData)) {
      return processWagesIndicator(indicatorData, fxRates);
    }
    return { normalized: indicatorData }; // Pass through for non-wages
  },

  // Pattern 2: Service layer approach
  serviceLayerPattern(indicators: IndicatorData[], fxRates: FXTable) {
    const processed = [];

    for (const indicator of indicators) {
      if (detectWagesIndicator(indicator.indicator_id, indicator)) {
        const result = processWagesIndicator(indicator, fxRates);
        processed.push(result.normalized);
      } else {
        processed.push(indicator); // Standard processing would go here
      }
    }

    return processed;
  },

  // Pattern 3: Frontend detection approach
  clientSidePattern(indicatorData: IndicatorData) {
    // This could run in the frontend to detect and handle wages data
    const isWages = detectWagesIndicator(
      indicatorData.indicator_id,
      indicatorData,
    );

    if (isWages) {
      // Apply client-side normalization or request normalized data
      return {
        ...indicatorData,
        requiresWageNormalization: true,
        suggestedTargetUnit: "USD/month",
      };
    }

    return indicatorData;
  },

  // Pattern 4: Configuration-based approach
  configBasedPattern: {
    // Define which indicators need wage processing
    wageIndicators: [
      "WAGES_IN_MANUFACTURING",
      "WAGES",
      "AVERAGE_WAGES",
      "MINIMUM_WAGE",
      /.*WAG.*/, // Regex patterns
    ],

    process(indicatorData: IndicatorData, fxRates: FXTable) {
      const needsWageProcessing = this.wageIndicators.some((pattern) => {
        if (pattern instanceof RegExp) {
          return pattern.test(indicatorData.indicator_id);
        }
        return indicatorData.indicator_id === pattern;
      });

      if (needsWageProcessing) {
        const result = processWagesIndicator(indicatorData, fxRates);
        return result.normalized;
      }

      return indicatorData;
    },
  },
};

// Run example if this file is executed directly
if (import.meta.main) {
  exampleUsage();
}
