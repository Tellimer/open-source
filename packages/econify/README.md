<p align="">
  <a href="https://tellimer.com" target="_blank" rel="noopener">
    <img src="./assets/tellimer-logo.avif" width="400" alt="Tellimer" />
  </a>
</p>

# @tellimer/econify

A comprehensive Deno/TypeScript package for **economic data processing** with
advanced features for classification, normalization, quality assessment, and
analysis. Perfect for financial institutions, economic research, data pipelines,
and quantitative analysis.

## ✨ Features

### Core Capabilities

- 🔍 **Smart Classification** — Automatically detect whether an indicator is a
  stock, flow, rate, or currency
- 🌍 **150+ Currency Support** — Convert values between currencies using FX
  tables (USD, EUR, GBP, JPY, NGN, KES, and more)
- 📊 **Magnitude Scaling** — Seamlessly convert between trillions, billions,
  millions, and thousands
- ⏱️ **Time Normalization** — Transform flows across time periods (annual ↔
  quarterly ↔ monthly ↔ daily)
- 🔧 **Unit Parsing Engine** — Parse and understand 200+ economic unit formats
  from real-world data
- 🎯 **Composite Unit Handling** — Handle complex units like "USD Million per
  quarter" or "KRW/Hour"

### Advanced Features

- 🌊 **Data Processing Pipeline** — Clean API that abstracts XState complexity
  for external consumers
- 💱 **Live FX Rates** — Fetch real-time exchange rates from multiple sources
  with fallback
- 📈 **Historical Analysis** — Time-series normalization with historical FX
  rates
- 💰 **Inflation Adjustment** — Adjust values for inflation using CPI data
- 🧠 **Smart Unit Inference** — Automatically detect units from context
- 🏆 **Data Quality Scoring** — Assess data quality across 6 dimensions
- ⚡ **Batch Processing** — Process large datasets efficiently with validation
- 🔌 **Custom Units** — Define domain-specific units (emissions, crypto, etc.)
- 📊 **Statistical Tools** — Aggregations with proper unit handling
- 🌊 **Seasonal Adjustment** — Remove seasonal patterns from time series
- 💾 **Smart Caching** — Cache computations for better performance
- ➕ **Unit Algebra** — Mathematical operations preserving units
- 📁 **Universal I/O** — Import/export CSV, JSON, Excel with unit detection

## 📦 Installation

```sh
deno add jsr:@tellimer/econify
```

Or import directly:

```ts
import {
  normalizeValue,
  parseUnit,
  processEconomicData,
  validateEconomicData,
} from "jsr:@tellimer/econify";
```

## 🚀 Quick Start

### Economic Data Pipeline (Primary Use Case)

Process economic data through a complete pipeline with validation, quality
checks, FX conversion, and normalization - all with a simple API:

```ts
import { processEconomicData } from "jsr:@tellimer/econify";

// Your economic data
const economicData = [
  { value: 100, unit: "USD Million", name: "Q1 Revenue" },
  { value: 110, unit: "USD Million", name: "Q2 Revenue" },
  { value: 16500, unit: "EUR Billion", name: "EU GDP" },
  { value: 3.5, unit: "percent", name: "Inflation Rate" },
];

// Process the data
const result = await processEconomicData(economicData, {
  // Convert everything to EUR billions
  targetCurrency: "EUR",
  targetMagnitude: "billions",

  // Provide exchange rates
  fxFallback: {
    base: "USD",
    rates: { EUR: 0.92 },
  },
});

// Use the results
console.log(`✅ Processed ${result.data.length} indicators`);
console.log(`📊 Quality score: ${result.metrics.qualityScore}/100`);
console.log(`⏱️ Time: ${result.metrics.processingTime}ms\n`);

result.data.forEach((item) => {
  const value = (item.normalized || item.value).toFixed(2);
  const unit = item.normalizedUnit || item.unit;
  console.log(`${item.name}: ${value} ${unit}`);
});
```

### With Progress Tracking

Monitor pipeline progress for better UX in applications:

```ts
const data = [
  { value: 27360, unit: "USD Billion", name: "US GDP", year: 2023 },
  { value: 16500, unit: "EUR Billion", name: "EU GDP", year: 2023 },
  { value: 593, unit: "JPY Trillion", name: "Japan GDP", year: 2023 },
];

const result = await processEconomicData(data, {
  targetCurrency: "USD",
  targetMagnitude: "trillions",
  onProgress: (step, progress) => {
    console.log(`  ${progress}% - ${step}`);
  },
  onWarning: (warning) => {
    console.log(`  ⚠️ Warning: ${warning}`);
  },
  fxFallback: {
    base: "USD",
    rates: { EUR: 0.92, JPY: 150 },
  },
});

console.log(`\n✅ Complete! Processed ${result.data.length} items\n`);
```

### Validate Before Processing

Check data quality before processing to catch issues early:

```ts
import {
  processEconomicData,
  validateEconomicData,
} from "jsr:@tellimer/econify";

const data = [
  { value: 100, unit: "USD", name: "Valid Data" },
];

// Validate first
const validation = await validateEconomicData(data);
console.log(`Valid: ${validation.valid}`);
console.log(`Score: ${validation.score}/100`);

// Only process if valid
if (validation.valid) {
  console.log("✅ Data is valid, processing...");
  const result = await processEconomicData(data);
  console.log(`Processed ${result.data.length} items`);
}
```

### Auto-Continue on Quality Issues

Automatically handle quality review for unattended processing:

```ts
import { processEconomicDataAuto } from "jsr:@tellimer/econify";

// Data with quality issues (outliers)
const data = [
  { value: 100, unit: "USD Million", name: "Normal Value" },
  { value: 999999999, unit: "USD Million", name: "Outlier Value" },
  { value: -50, unit: "USD Million", name: "Negative Value" },
];

const result = await processEconomicDataAuto(data, {
  minQualityScore: 90, // High threshold
  targetCurrency: "EUR",
  onWarning: (warning) => {
    console.log(`  ⚠️ ${warning}`);
  },
  fxFallback: {
    base: "USD",
    rates: { EUR: 0.92 },
  },
});

console.log(`✅ Processed despite quality issues`);
console.log(`  Items: ${result.data.length}`);
console.log(`  Quality: ${result.metrics.qualityScore}/100`);
```

### Real-World Integration

Complete example showing API integration and data processing:

```ts
// Simulate fetching data from an API
const fetchEconomicData = async () => {
  // In reality, this would be an API call
  return [
    {
      id: "gdp_us",
      value: 27360,
      unit: "USD Billion",
      name: "US GDP",
      year: 2023,
    },
    {
      id: "gdp_china",
      value: 17900,
      unit: "USD Billion",
      name: "China GDP",
      year: 2023,
    },
    {
      id: "inflation_us",
      value: 3.4,
      unit: "percent",
      name: "US Inflation",
      year: 2023,
    },
  ];
};

console.log("Fetching economic data...");
const rawData = await fetchEconomicData();

// Validate first
const validation = await validateEconomicData(rawData);
if (!validation.valid) {
  console.error("❌ Data validation failed:", validation.issues);
  return;
}

console.log("✅ Data validated, processing...\n");

// Process with progress tracking
const result = await processEconomicData(rawData, {
  targetCurrency: "EUR",
  targetMagnitude: "trillions",
  inferUnits: true,
  onProgress: (step, progress) => {
    // Update UI progress bar
    const bar = "█".repeat(Math.floor(progress / 10)).padEnd(10, "░");
    console.log(`  [${bar}] ${progress}% - ${step}`);
  },
  fxFallback: {
    base: "USD",
    rates: { EUR: 0.92 },
  },
});

// Display results
console.log("\n📊 Results:");
const gdpData = result.data.filter((d) => d.name?.includes("GDP"));
gdpData.forEach((item) => {
  const value = item.normalized || item.value;
  console.log(`  ${item.name}: €${value.toFixed(3)}T`);
});
```

## 🌊 Pipeline API Reference

### Core Functions

```ts
// Process economic data through the complete pipeline
async function processEconomicData(
  data: ParsedData[],
  options?: PipelineOptions,
): Promise<PipelineResult>;

// Process with automatic quality review handling
async function processEconomicDataAuto(
  data: ParsedData[],
  options?: PipelineOptions,
): Promise<PipelineResult>;

// Validate data without processing
async function validateEconomicData(
  data: ParsedData[],
  options?: { requiredFields?: string[] },
): Promise<ValidationResult>;
```

### Types

```ts
interface PipelineOptions {
  // Normalization targets
  targetCurrency?: string;
  targetMagnitude?:
    | "ones"
    | "thousands"
    | "millions"
    | "billions"
    | "trillions";
  targetTimeScale?: "year" | "quarter" | "month" | "week" | "day" | "hour";

  // Quality control
  minQualityScore?: number; // 0-100, default 70
  inferUnits?: boolean;

  // FX rates
  fxFallback?: {
    base: string;
    rates: Record<string, number>;
  };

  // Callbacks
  onProgress?: (step: string, progress: number) => void;
  onWarning?: (warning: string) => void;
  onError?: (error: Error) => void;
}

interface PipelineResult {
  data: ParsedData[];
  warnings: string[];
  errors: Error[];
  metrics: {
    processingTime: number;
    recordsProcessed: number;
    recordsFailed: number;
    qualityScore?: number;
  };
}

interface ParsedData {
  value: number;
  unit: string;
  name?: string;
  year?: number;
  normalized?: number;
  normalizedUnit?: string;
  metadata?: Record<string, any>;
}
```

## 📚 Core Features

### Unit Parsing Engine

Parse and understand virtually any economic unit format:

```ts
import {
  extractCurrency,
  extractScale,
  extractTimeScale,
  isMonetaryUnit,
  isPercentageUnit,
  parseUnit,
} from "jsr:@tellimer/econify";

// Parse complex units
parseUnit("NGN Billion per quarter"); // Nigerian Naira, billions, quarterly
parseUnit("percent of GDP"); // Percentage type
parseUnit("BBL/D/1K"); // Oil barrels per day
parseUnit("KRW/Hour"); // Korean Won per hour (wages)

// Check unit types
isMonetaryUnit("USD Million"); // true
isPercentageUnit("basis points"); // true

// Extract components
extractCurrency("KES Billion"); // "KES"
extractScale("EUR Million"); // "millions"
extractTimeScale("USD/month"); // "month"
```

### Classification System

Identify economic indicator types with confidence scores:

```ts
import { classifyIndicator } from "jsr:@tellimer/econify";

const result = classifyIndicator({
  name: "Government debt",
  unit: "USD bn",
});
// {
//   type: "stock",
//   confidence: 0.95,
//   signals: ["debt", "USD", "billions"],
//   detectedCurrency: "USD"
// }
```

### Currency Conversion

Convert between 150+ currencies:

```ts
import { normalizeCurrencyValue } from "jsr:@tellimer/econify";

const fx: FXTable = {
  base: "EUR",
  rates: { USD: 1.1, GBP: 0.85, NGN: 1650 },
};

normalizeCurrencyValue(1000, "EUR", "USD", fx); // 1100
normalizeCurrencyValue(1000, "NGN", "USD", fx); // ~0.67
```

### Magnitude & Time Scaling

```ts
import { rescaleMagnitude, rescaleTime } from "jsr:@tellimer/econify";

// Magnitude scaling
rescaleMagnitude(5.2, "billions", "millions"); // 5200

// Time scaling
rescaleTime(100, "month", "year"); // 1200
rescaleTime(500, "quarter", "year"); // 2000
```

## 🚀 Advanced Features

### Live FX Rates

Fetch real-time exchange rates from multiple sources:

```ts
import { fetchLiveFXRates } from "jsr:@tellimer/econify";

// Fetch with automatic fallback
const fx = await fetchLiveFXRates("USD", {
  sources: [
    { name: "ECB", endpoint: "...", priority: 1 },
    { name: "IMF", endpoint: "...", priority: 2 },
  ],
  fallback: localCache,
  cache: true,
  cacheTTL: 3600000, // 1 hour
});

// Use live rates for conversion
const value = normalizeValue(100, "EUR Million", {
  toCurrency: "USD",
  fx,
});
```

### Data Quality Assessment

Assess and improve data quality:

```ts
import { assessDataQuality } from "jsr:@tellimer/econify";

const data = [
  { value: 100, unit: "USD Million" },
  { value: 110, unit: "USD Million" },
  { value: 10000, unit: "USD Million" }, // Outlier
  { value: NaN, unit: "USD Million" }, // Invalid
];

const quality = assessDataQuality(data, {
  checkOutliers: true,
  checkConsistency: true,
  checkCompleteness: true,
  outlierMethod: "iqr",
});

console.log("Quality Score:", quality.overall); // 0-100
console.log("Dimensions:", quality.dimensions);
// {
//   completeness: 75,
//   consistency: 90,
//   validity: 85,
//   accuracy: 70,
//   timeliness: 100,
//   uniqueness: 100
// }
```

### Statistical Aggregations

Perform unit-aware statistical operations:

```ts
import { aggregate, movingAverage } from "jsr:@tellimer/econify";

const data = [
  { value: 100, unit: "USD Million", weight: 0.3 },
  { value: 150, unit: "USD Million", weight: 0.5 },
  { value: 80, unit: "USD Million", weight: 0.2 },
];

// Various aggregation methods
const sum = aggregate(data, { method: "sum" });
const avg = aggregate(data, { method: "average" });
const weighted = aggregate(data, {
  method: "weightedAverage",
  weights: "value", // or custom weights
});
```

## 📊 Supported Units

### Currencies (150+)

- **Major**: USD, EUR, GBP, JPY, CNY, CHF, CAD, AUD
- **African**: NGN, KES, ZAR, EGP, MAD, GHS, TZS, UGX, RWF, ETB
- **Asian**: INR, IDR, THB, VND, PHP, MYR, SGD, HKD, KRW, TWD
- **Latin American**: BRL, MXN, ARS, COP, CLP, PEN, UYU, BOB
- **Middle Eastern**: AED, SAR, QAR, KWD, BHD, OMR, ILS, JOD
- **European**: NOK, SEK, DKK, PLN, CZK, HUF, RON, BGN, HRK
- And 100+ more...

### Magnitudes

- Trillions (trillion, tn)
- Billions (billion, bn)
- Millions (million, mn, mio)
- Thousands (thousand, k)
- Hundreds
- Ones (base unit)

### Time Scales

- Year (annual, /yr, per year)
- Quarter (quarterly, /q, per quarter)
- Month (monthly, /mo, per month)
- Week (weekly, /wk, per week)
- Day (daily, /d, per day)
- Hour (hourly, /hr, per hour)

### Special Units

- **Percentages**: %, percent, bps, pp, % of GDP
- **Energy**: GWh, TJ, MW, kWh, MWh
- **Physical**: BBL/D/1K, tonnes, kg, liters, hectares, m²
- **Indices**: Points, Index
- **Population**: Persons, per 1000 people, households
- **Ratios**: USD/Liter, KRW/Hour, USD/kg
- **Custom**: Any domain-specific units you define

## 🛠️ API Reference

### Core Types

```ts
type Scale = "trillions" | "billions" | "millions" | "thousands" | "ones";
type TimeScale = "year" | "quarter" | "month" | "week" | "day" | "hour";
type IndicatorType = "stock" | "flow" | "rate" | "currency" | "unknown";

interface FXTable {
  base: string;
  rates: Record<string, number>;
}

interface ParsedUnit {
  category: UnitCategory;
  currency?: string;
  scale?: Scale;
  timeScale?: TimeScale;
  normalized?: string;
  isComposite: boolean;
}

interface QualityScore {
  overall: number; // 0-100
  dimensions: {
    completeness: number;
    consistency: number;
    validity: number;
    accuracy: number;
    timeliness: number;
    uniqueness: number;
  };
  issues: QualityIssue[];
  recommendations: string[];
}
```

## 🧪 Testing

```sh
# Run all tests
deno task test:econify

# Run specific test file
deno test src/units/units_test.ts

# Run with coverage
deno test --coverage=coverage
```

## 🚀 Performance

- **Smart Caching**: Reduces redundant computations by up to 90%
- **Parallel Processing**: Batch operations utilize all CPU cores
- **Streaming Support**: Process large datasets without memory issues
- **Optimized Parsing**: Unit detection in <1ms per operation
- **Lazy Loading**: Load only required modules on demand

## 📈 Roadmap

- [ ] GraphQL API wrapper
- [ ] WebAssembly optimization
- [ ] Machine learning for unit inference
- [ ] Blockchain data sources
- [ ] Real-time streaming analytics
- [ ] Distributed processing support
- [ ] Advanced visualization tools
- [ ] Natural language queries

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

```sh
# Clone the monorepo
git clone https://github.com/Tellimer/open-source.git
cd open-source/packages/econify

# Install dependencies (cache)
deno cache src/main.ts

# Run tests
deno task test:econify

# Submit PR
```

## 📄 License

MIT © 2025

## 🙏 Acknowledgments

Built with ❤️ for economists, data analysts, financial engineers, and anyone
working with economic data.

Special thanks to:

- The Deno team for an amazing runtime
- Financial data providers for API access
- The open-source community for inspiration

---

**Need help?** [Open an issue](https://github.com/Tellimer/open-source/issues)
or check our [examples](./examples).
