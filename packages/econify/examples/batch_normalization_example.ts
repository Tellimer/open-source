/**
 * Example: Using EconifyBatchSession for proper per-indicator normalization
 *
 * This example shows how to process Balance of Trade data for multiple countries,
 * ensuring that all countries are normalized to the same time scale and magnitude.
 */

import {
  EconifyBatchSession,
  type ParsedData,
  type PipelineOptions,
} from "../src/main.ts";

// Example function showing how the consuming app should be refactored
interface TempIndicatorData {
  indicator_name: string;
  indicator_id: string;
  countries: Record<string, unknown[]>;
  rowData: Map<string, Record<string, unknown>>;
}

/**
 * Determines if a unit string represents a monetary value that needs currency conversion
 */
function isMonetaryUnit(unitString: string): boolean {
  if (!unitString) return false;

  const upperUnit = unitString.toUpperCase();

  // Check for non-monetary units that should NOT be converted
  const nonMonetaryUnits = [
    "%",
    "PERCENT",
    "PERCENTAGE",
    "POINTS",
    "POINT",
    "INDEX",
    "CELSIUS",
    "FAHRENHEIT",
    "KELVIN",
    "MM",
    "CM",
    "M",
    "KM",
    "MILLIMETER",
    "CENTIMETER",
    "METER",
    "KILOMETER",
    "THOUSAND",
    "MILLION",
    "BILLION",
    "TRILLION", // When used alone without currency
    "TONS",
    "TON",
    "KG",
    "KILOGRAM",
    "GRAM",
    "BARREL",
    "BARRELS",
    "BBL",
    "UNITS",
    "UNIT",
  ];

  // If unit contains any non-monetary indicator, don't convert
  for (const nonMonetary of nonMonetaryUnits) {
    if (upperUnit.includes(nonMonetary)) {
      // Special case: Check if it's actually a currency amount (e.g., "USD MILLION")
      const currencyCodes = [
        "USD",
        "EUR",
        "GBP",
        "JPY",
        "CNY",
        "CAD",
        "AUD",
        "CHF",
      ];
      const hasCurrency = currencyCodes.some((code) =>
        upperUnit.includes(code)
      );

      // If it has scale words (thousand, million, etc.) but no currency, it's not monetary
      if (
        ["THOUSAND", "MILLION", "BILLION", "TRILLION"].includes(nonMonetary) &&
        !hasCurrency
      ) {
        return false;
      }

      // For other non-monetary units, always return false
      if (
        !["THOUSAND", "MILLION", "BILLION", "TRILLION"].includes(nonMonetary)
      ) {
        return false;
      }
    }
  }

  // Check for currency codes
  const commonCurrencies = [
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "CNY",
    "CAD",
    "AUD",
    "CHF",
    "SEK",
    "NOK",
    "DKK",
    "NZD",
    "SGD",
    "HKD",
    "KRW",
    "ZAR",
    "INR",
    "BRL",
    "RUB",
    "MXN",
    "DOLLAR",
    "EURO",
    "POUND",
    "YEN",
    "YUAN",
    "RUPEE",
    "REAL",
    "PESO",
  ];

  return commonCurrencies.some((currency) => upperUnit.includes(currency));
}

export async function normalizeGroupedIndicatorWithEconify(
  indicator: TempIndicatorData,
  opts: {
    enabled: boolean;
    countryRegionMap: Map<string, unknown>;
    fxRates: { [currency: string]: number };
    fxDates?: { [currency: string]: string };
  },
) {
  const { enabled, countryRegionMap, fxRates } = opts;
  const processed: { [countryISO: string]: unknown } = {};

  if (!enabled) {
    // Handle disabled case...
    return processed;
  }

  // First, scan through data points to determine if this indicator is monetary
  let isMonetaryIndicator = false;
  for (const [countryISO, dataPoints] of Object.entries(indicator.countries)) {
    if ((dataPoints as unknown[]).length === 0) continue;

    const metaRow = indicator.rowData.get(countryISO);
    const unitsRaw = (metaRow?.units || "").trim();
    const scale = (metaRow?.scale || "").trim();
    const periodicity = (metaRow?.periodicity || "").trim();
    const extractedCurrency = unitsRaw.split("/")[0].split(" ")[0];
    const currency = (metaRow?.currency_code || extractedCurrency || "").trim();

    let unitString = unitsRaw;
    if (
      currency && !unitString.toUpperCase().startsWith(currency.toUpperCase())
    ) {
      unitString = unitString ? `${currency} ${unitString}` : currency;
    }
    if (scale && !unitString.toLowerCase().includes(scale.toLowerCase())) {
      unitString = unitString ? `${unitString} ${scale}` : scale;
    }
    if (
      periodicity &&
      !unitString.toLowerCase().includes(periodicity.toLowerCase())
    ) {
      unitString = unitString ? `${unitString} ${periodicity}` : periodicity;
    }
    if (!unitString) unitString = "USD";

    if (isMonetaryUnit(unitString)) {
      isMonetaryIndicator = true;
      break;
    }
  }

  // Create a batch session for this indicator
  const sessionOptions: PipelineOptions = {
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    indicatorKey: "name",
    minMajorityShare: 0.6,
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    minQualityScore: 30,
    inferUnits: true,
    useLiveFX: false,
    fxFallback: { base: "USD", rates: fxRates, dates: opts.fxDates || {} },
    explain: true,
  };

  // Only set targetCurrency for monetary indicators
  if (isMonetaryIndicator) {
    sessionOptions.targetCurrency = "USD";
  }

  const session = new EconifyBatchSession(sessionOptions);

  // Collect ALL countries' data points into the batch
  const countryMap = new Map<
    string,
    { countryISO: string; originalData: unknown }
  >();

  for (const [countryISO, dataPoints] of Object.entries(indicator.countries)) {
    if ((dataPoints as unknown[]).length === 0) continue;

    const latestPoint = (dataPoints as unknown[])[0] as Record<string, unknown>;
    const metaRow = indicator.rowData.get(countryISO);

    // Build unit string from metadata
    const unitsRaw = (metaRow?.units || "").trim();
    const scale = (metaRow?.scale || "").trim();
    const periodicity = (metaRow?.periodicity || "").trim();
    const extractedCurrency = unitsRaw.split("/")[0].split(" ")[0];
    const currency = (metaRow?.currency_code || extractedCurrency || "").trim();

    let unitString = unitsRaw;
    const ciIncludes = (hay: string, needle: string) =>
      hay.toLowerCase().includes(needle.toLowerCase());

    if (
      currency && !unitString.toUpperCase().startsWith(currency.toUpperCase())
    ) {
      unitString = unitString ? `${currency} ${unitString}` : currency;
    }
    if (scale && !ciIncludes(unitString, scale)) {
      unitString = unitString ? `${unitString} ${scale}` : scale;
    }
    if (periodicity && !ciIncludes(unitString, periodicity)) {
      unitString = unitString ? `${unitString} ${periodicity}` : periodicity;
    }
    if (!unitString) unitString = "USD";

    // Add to batch with unique ID and metadata
    const dataPoint: ParsedData = {
      value: latestPoint.value,
      unit: unitString,
      periodicity: periodicity || undefined,
      scale: scale || undefined,
      currency_code: currency || undefined,
      name: indicator.indicator_name,
      id: `${indicator.indicator_id}_${countryISO}`,
      date: latestPoint.date,
      metadata: {
        countryISO,
        originalData: latestPoint,
      },
    };

    session.addDataPoint(dataPoint);
    countryMap.set(dataPoint.id!, { countryISO, originalData: latestPoint });
  }

  // Process ALL countries together in a single batch
  // This ensures auto-targets are computed across all countries
  const result = await session.process();

  // Map results back to countries
  for (const normalizedItem of result.data) {
    const mapping = countryMap.get(normalizedItem.id!);
    if (!mapping) continue;

    const { countryISO, originalData } = mapping;
    const regionData = countryRegionMap.get(countryISO);
    const explain = (normalizedItem as Record<string, unknown>).explain;

    processed[countryISO] = {
      date: originalData.date,
      value: normalizedItem.normalized!,
      is_forecasted: originalData.is_forecasted,
      color: "",
      region: regionData?.majorRegionSlug || null,
      region_slug: regionData?.majorRegionSlug || null,
      tooltip: {
        original_value: originalData.value,
        normalized_value: normalizedItem.normalized!,
        normalization_metadata: {
          method: explain?.fx?.source === "live" ? "econify_live" : "econify",
          quality: {
            score: result.metrics.qualityScore || 0,
            confidence: result.metrics.qualityScore > 80
              ? "high"
              : result.metrics.qualityScore > 60
              ? "medium"
              : "low",
            status: result.metrics.qualityScore > 70
              ? "passed"
              : "passed_with_warnings",
            notes: result.warnings,
          },
          explain: explain,
        },
      },
    };
  }

  return processed;
}

// Example usage
// Example usage
// Run with: deno run examples/batch_normalization_example.ts
export async function example() {
  // Simulate Balance of Trade data for multiple countries
  const indicator = {
    indicator_id: "BALANCE_OF_TRADE",
    indicator_name: "Balance of Trade",
    countries: {
      USA: [{ value: 100, date: "2024-01", is_forecasted: false }],
      GBR: [{ value: 50, date: "2024-01", is_forecasted: false }],
      DEU: [{ value: 200, date: "2024-01", is_forecasted: false }],
      JPN: [{ value: -150, date: "2024-01", is_forecasted: false }],
    },
    rowData: new Map([
      ["USA", {
        units: "million",
        scale: "Million",
        periodicity: "month",
        currency_code: "USD",
      }],
      ["GBR", {
        units: "million",
        scale: "Million",
        periodicity: "month",
        currency_code: "GBP",
      }],
      ["DEU", {
        units: "million",
        scale: "Million",
        periodicity: "quarter",
        currency_code: "EUR",
      }],
      ["JPN", {
        units: "billion",
        scale: "Billion",
        periodicity: "month",
        currency_code: "JPY",
      }],
    ]),
  };

  const result = await normalizeGroupedIndicatorWithEconify(indicator, {
    enabled: true,
    countryRegionMap: new Map(),
    fxRates: { USD: 1, GBP: 0.79, EUR: 0.92, JPY: 150 },
  });

  console.log("Normalized results:");
  for (const [country, data] of Object.entries(result)) {
    console.log(
      `${country}: ${data.value} (originally ${data.tooltip.original_value})`,
    );
  }

  // All countries should now be normalized to:
  // - USD currency (targetCurrency)
  // - Monthly time scale (majority: 3 monthly vs 1 quarterly)
  // - Millions magnitude (majority: 3 millions vs 1 billion)
}

// Alternative: Using processEconomicDataByIndicator for multiple indicators
// Alternative example with multiple indicators
export async function multipleIndicatorsExample() {
  const data: ParsedData[] = [
    // Balance of Trade for various countries
    {
      id: "bot_usa",
      name: "Balance of Trade",
      value: 100,
      unit: "USD million/month",
    },
    {
      id: "bot_gbr",
      name: "Balance of Trade",
      value: 50,
      unit: "GBP million/month",
    },
    {
      id: "bot_deu",
      name: "Balance of Trade",
      value: 200,
      unit: "EUR million/quarter",
    },

    // GDP for various countries
    { id: "gdp_usa", name: "GDP", value: 25000, unit: "USD billion/year" },
    { id: "gdp_gbr", name: "GDP", value: 3100, unit: "GBP billion/year" },
    { id: "gdp_deu", name: "GDP", value: 4200, unit: "EUR billion/year" },
  ];

  // Process all indicators, each normalized within its own group
  const { processEconomicDataByIndicator } = await import("../src/main.ts");

  const result = await processEconomicDataByIndicator(data, {
    targetCurrency: "USD",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time"],
    fxFallback: {
      base: "USD",
      rates: { GBP: 0.79, EUR: 0.92 },
    },
  });

  // Balance of Trade items will be normalized to monthly (2/3 majority)
  // GDP items will be normalized to yearly (3/3 unanimous)
  console.log(`Processed ${result.data.length} items across indicators`);
}
