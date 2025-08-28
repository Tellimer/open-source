/**
 * Advanced usage examples showcasing all new features
 */

import {
  // Inflation
  adjustForInflation,
  // Aggregations
  aggregate,
  // Data quality
  assessDataQuality,
  type BatchItem,
  calculateChanges,
  chain,
  // Batch processing
  createBatchProcessor,
  // Seasonal adjustment
  deseasonalize,
  detectSeasonality,
  // IO
  exportTo,
  // Live FX
  fetchLiveFXRates,
  // Types
  type FXTable,
  getInflationRate,
  type HistoricalDataPoint,
  importFrom,
  type InferenceContext,
  // Unit inference
  inferUnit,
  loadDomainUnits,
  movingAverage,
  // Historical data
  normalizeTimeSeries,
  normalizeValue,
  // Core functions
  parseUnit,
  // Custom units
  registerCustomUnit,
  // Unit algebra
  unitMultiply,
  type UnitValue,
  // Caching
  withCache,
} from "../src/main.ts";

// Example 1: Live FX rates with caching
async function example1_LiveFX() {
  console.log("\n=== Example 1: Live FX Rates ===");

  // Fetch live rates with fallback
  const fallbackRates: FXTable = {
    base: "USD",
    rates: { EUR: 0.85, GBP: 0.75, JPY: 150 },
  };

  const fx = await fetchLiveFXRates("USD", {
    fallback: fallbackRates,
    cache: true,
    cacheTTL: 3600000, // 1 hour
  });

  console.log("Live FX rates fetched:", fx);

  // Use cached version for performance
  const cachedNormalize = withCache(normalizeValue, {
    ttl: 600000, // 10 minutes
    keyGenerator: (val, unit, opts) => `${val}_${unit}_${JSON.stringify(opts)}`,
  });

  const result = cachedNormalize(100, "EUR Million", {
    toCurrency: "USD",
    toMagnitude: "billions",
    fx,
  });

  console.log("100 EUR Million =", result, "USD Billion");
}

// Example 2: Historical data with inflation adjustment
async function example2_Historical() {
  console.log("\n=== Example 2: Historical Data & Inflation ===");

  // Historical time series
  const historicalData: HistoricalDataPoint[] = [
    { date: new Date("2020-01-01"), value: 100, unit: "USD Million" },
    { date: new Date("2021-01-01"), value: 110, unit: "USD Million" },
    { date: new Date("2022-01-01"), value: 125, unit: "USD Million" },
    { date: new Date("2023-01-01"), value: 140, unit: "USD Million" },
  ];

  // Normalize historical series
  const normalized = await normalizeTimeSeries(historicalData, {
    toCurrency: "EUR",
    toMagnitude: "billions",
    fxSource: "current", // Use current rates for simplicity
  });

  console.log("Normalized time series:", normalized);

  // Calculate year-over-year changes
  const changes = calculateChanges(normalized, "percentage");
  console.log("YoY changes:", changes);

  // Adjust for inflation (2020 to 2024)
  const realValue = adjustForInflation(140, {
    fromYear: 2023,
    toYear: 2020,
    country: "US",
    unit: "USD Million",
  });

  console.log(
    "140 USD Million (2023) =",
    realValue,
    "USD Million (2020 dollars)",
  );

  // Get inflation rate
  const inflationRate = getInflationRate(2020, 2024, "US", true);
  console.log(
    "Annualized inflation 2020-2024:",
    (inflationRate * 100).toFixed(2),
    "%",
  );
}

// Example 3: Smart unit inference
function example3_UnitInference() {
  console.log("\n=== Example 3: Smart Unit Inference ===");

  // Infer from context
  const context: InferenceContext = {
    text: "Revenue increased to 5.2 in the quarter",
    context: "quarterly earnings report",
    company: {
      currency: "USD",
      reportingScale: "billions",
      sector: "technology",
    },
    documentType: "earnings",
  };

  const inferred = inferUnit(5.2, context);
  console.log("Inferred unit:", inferred.unit);
  console.log("Confidence:", inferred.confidence);
  console.log("Reasoning:", inferred.reasoning);
  console.log("Alternatives:", inferred.alternatives);
}

// Example 4: Data quality assessment
function example4_DataQuality() {
  console.log("\n=== Example 4: Data Quality Assessment ===");

  const data = [
    { value: 100, unit: "USD Million" },
    { value: 110, unit: "USD Million" },
    { value: 95, unit: "USD Million" },
    { value: 10000, unit: "USD Million" }, // Outlier
    { value: 105, unit: "EUR Million" }, // Different unit
    { value: NaN, unit: "USD Million" }, // Invalid
  ];

  const quality = assessDataQuality(data, {
    checkOutliers: true,
    checkConsistency: true,
    checkCompleteness: true,
  });

  console.log("Overall quality score:", quality.overall);
  console.log("Quality dimensions:", quality.dimensions);
  console.log("Issues found:", quality.issues.length);
  console.log(
    "Critical issues:",
    quality.issues.filter((i) => i.severity === "critical"),
  );
  console.log("Recommendations:", quality.recommendations);
}

// Example 5: Batch processing with validation
async function example5_BatchProcessing() {
  console.log("\n=== Example 5: Batch Processing ===");

  const batchData: BatchItem[] = [
    { id: 1, value: 100, unit: "USD Million" },
    { id: 2, value: 50, unit: "EUR Billion" },
    { id: 3, value: 1000, unit: "JPY Million" },
    { id: 4, value: -500, unit: "invalid_unit" }, // Will fail
    { id: 5, value: 75, unit: "GBP Thousand" },
  ];

  // Create processor with defaults
  const processor = createBatchProcessor({
    validate: true,
    handleErrors: "skip",
    parallel: true,
    concurrency: 5,
    toCurrency: "USD",
    toMagnitude: "millions",
  });

  // Process with progress tracking
  const result = await processor.process(batchData, {
    progressCallback: (progress) => {
      console.log(`Processing: ${progress.toFixed(0)}%`);
    },
  });

  console.log("Successful:", result.successful.length);
  console.log("Failed:", result.failed.length);
  console.log("Processing stats:", result.stats);
}

// Example 6: Custom units for specialized domains
function example6_CustomUnits() {
  console.log("\n=== Example 6: Custom Units ===");

  // Load domain-specific units
  loadDomainUnits("emissions");
  loadDomainUnits("crypto");

  // Register custom unit
  registerCustomUnit("carbon_intensity", {
    pattern: /gCO2\/kWh/i,
    category: "emissions",
    normalized: "gCO2/kWh",
    conversionFactor: { to: "kgCO2/MWh", factor: 1 },
  });

  // Parse custom units
  const co2 = parseUnit("CO2 tonnes");
  console.log("CO2 tonnes parsed:", co2);

  const btc = parseUnit("BTC");
  console.log("BTC parsed:", btc);
}

// Example 7: Statistical aggregations
function example7_Aggregations() {
  console.log("\n=== Example 7: Statistical Aggregations ===");

  const dataPoints = [
    { value: 100, unit: "USD Million", weight: 0.3 },
    { value: 150, unit: "USD Million", weight: 0.5 },
    { value: 80, unit: "USD Million", weight: 0.2 },
  ];

  // Various aggregation methods
  const sum = aggregate(dataPoints, { method: "sum" });
  console.log("Sum:", sum);

  const avg = aggregate(dataPoints, { method: "average" });
  console.log("Average:", avg);

  const weighted = aggregate(dataPoints, {
    method: "weightedAverage",
    weights: dataPoints.map((d) => d.weight!),
  });
  console.log("Weighted average:", weighted);

  // Moving average for time series
  const series = [
    { value: 100, unit: "USD Million", timestamp: new Date("2023-01") },
    { value: 110, unit: "USD Million", timestamp: new Date("2023-02") },
    { value: 95, unit: "USD Million", timestamp: new Date("2023-03") },
    { value: 105, unit: "USD Million", timestamp: new Date("2023-04") },
  ];

  const ma = movingAverage(series, 3);
  console.log("3-period moving average:", ma);
}

// Example 8: Unit algebra
function example8_UnitAlgebra() {
  console.log("\n=== Example 8: Unit Algebra ===");

  const hourlyWage: UnitValue = { value: 50, unit: "USD/Hour" };
  const hoursWorked: UnitValue = { value: 160, unit: "Hours/Month" };

  // Calculate monthly income
  const monthlyIncome = unitMultiply(hourlyWage, hoursWorked);
  console.log("Monthly income:", monthlyIncome);

  // Chain operations
  const result = chain({ value: 1000, unit: "USD" })
    .divide({ value: 100, unit: "EUR" })
    .multiply({ value: 1.1, unit: "dimensionless" })
    .value();

  console.log("Chain result:", result);
}

// Example 9: Import/Export
async function example9_IO() {
  console.log("\n=== Example 9: Import/Export ===");

  const data = [
    { date: "2024-01", value: 100, unit: "USD Million", category: "revenue" },
    { date: "2024-02", value: 110, unit: "USD Million", category: "revenue" },
    { date: "2024-03", value: 105, unit: "USD Million", category: "revenue" },
  ];

  // Export to CSV
  const csv = exportTo(data, {
    format: "csv",
    headers: true,
    preserveUnits: true,
  });
  console.log("CSV export:\n", csv);

  // Export to JSON with metadata
  const json = exportTo(data, {
    format: "json",
    includeMetadata: true,
  });
  if (typeof json === "string") {
    console.log("JSON export:", json.substring(0, 200), "...");
  } else {
    console.log("JSON export (buffer length):", json.byteLength);
  }

  // Import with auto-detection
  const imported = await importFrom(csv as string, {
    detectUnits: true,
    inferTypes: true,
  });
  console.log("Imported data:", imported);
}

// Example 10: Seasonal adjustment
function example10_Seasonal() {
  console.log("\n=== Example 10: Seasonal Adjustment ===");

  // Generate seasonal data (monthly with quarterly pattern)
  const seasonalData = Array.from({ length: 36 }, (_, i) => ({
    date: new Date(2021, i, 1),
    value: 100 + 10 * Math.sin((2 * Math.PI * i) / 12) + Math.random() * 5,
  }));

  // Detect seasonality
  const detection = detectSeasonality(seasonalData);
  console.log("Seasonality detected:", detection);

  // Remove seasonal component
  const adjusted = deseasonalize(seasonalData, {
    method: "moving_average",
    period: 12,
  });

  console.log("Original vs Adjusted (first 3 months):");
  for (let i = 0; i < 3; i++) {
    console.log(
      `Month ${i + 1}: Original=${seasonalData[i].value.toFixed(2)}, ` +
        `Adjusted=${adjusted[i].adjusted.toFixed(2)}, ` +
        `Seasonal=${adjusted[i].seasonal.toFixed(2)}`,
    );
  }
}

// Run all examples
async function runAllExamples() {
  console.log("🚀 Econify Advanced Features Demo\n");

  try {
    await example1_LiveFX();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("Example 1 skipped (requires network):", msg);
  }

  await example2_Historical();
  example3_UnitInference();
  example4_DataQuality();
  await example5_BatchProcessing();
  example6_CustomUnits();
  example7_Aggregations();
  example8_UnitAlgebra();
  await example9_IO();
  example10_Seasonal();

  console.log("\n✅ All examples completed!");
}

// Run if executed directly
if (import.meta.main) {
  runAllExamples();
}
