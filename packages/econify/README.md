<p align="">
  <a href="https://tellimer.com" target="_blank" rel="noopener">
    <img src="./assets/tellimer-logo.avif" width="400" alt="Tellimer" />
  </a>
</p>

# @tellimer/econify

[![JSR](https://img.shields.io/jsr/v/%40tellimer/econify?label=JSR&logo=deno&style=flat)](https://jsr.io/@tellimer/econify)
[![codecov](https://codecov.io/github/Tellimer/open-source/graph/badge.svg?token=FFHUVGQA4T&flag=econify)](https://codecov.io/github/Tellimer/open-source)

[![Test Coverage](https://img.shields.io/badge/tests-459%20passing-brightgreen)](https://github.com/Tellimer/open-source)
[![Quality](https://img.shields.io/badge/quality-production%20ready-blue)](https://github.com/Tellimer/open-source)
[![Deno](https://img.shields.io/badge/deno-2.0+-green)](https://deno.land)

A comprehensive Deno/TypeScript package for **economic data normalization and
conversion** with advanced features for currency conversion, magnitude scaling,
time period standardization, quality assessment, and batch processing. Perfect
for financial institutions, economic research, data pipelines, and quantitative
analysis.

**Note:** For indicator classification (determining if an indicator is a stock,
flow, ratio, etc.), use the separate
[@tellimer/classify](https://jsr.io/@tellimer/classify) package. Econify focuses
solely on normalization and conversion, using the `indicator_type` field from
classify to make smart normalization decisions.

**✅ Production Ready** • **459 Tests Passing** • **100% Reliability** • **Zero
Linting Issues** • **Enhanced Explain Metadata** • **Type Safe**

## 🌊 XState Pipeline Architecture

<p align="center">
  <img src="./assets/xstate-machine.png" alt="Econify XState Pipeline State Machine" width="900" />
</p>

_Robust data processing pipeline powered by XState v5 with automatic quality
assessment, error handling, and interactive control flow._

## ✨ Features

### Core Capabilities

- 🎯 **Smart Auto-Targeting** — Intelligently skip time dimension for stock/rate
  indicators (e.g., Population, Debt, CPI) while applying it to flows (GDP,
  Exports) — prevents incorrect conversions like "12,814 employed persons" ÷ 3 →
  "4,271 per month". Accepts `indicator_type` and `temporal_aggregation` from
  [@tellimer/classify](https://jsr.io/@tellimer/classify) package to make
  normalization decisions
- 🛡️ **Temporal Aggregation Validation** — Dual validation using both
  `indicator_type` and `temporal_aggregation` to detect economically nonsensical
  combinations (e.g., stock+period-rate) and prevent incorrect conversions with
  clear warnings
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
- 🏷️ **Explicit Metadata Fields** — Pass `periodicity`, `scale`, and
  `currency_code` as separate fields instead of concatenating into unit strings

### Advanced Features

- 🌊 **Data Processing Pipeline** — Clean API that abstracts XState complexity
  for external consumers
- 💼 **Wages Data Normalization** — Specialized handling for mixed wage/salary
  data with different currencies and time periods
- 🚫 **Normalization Exemptions** — Skip normalization for specific indicators,
  categories, or name patterns (e.g., IMF WEO, credit ratings, custom indices)
- ⏰ **Advanced Time Sampling** — Comprehensive upsampling and downsampling for
  economic time series
- 💱 **Live FX Rates** — Fetch real-time exchange rates from multiple sources
  with fallback
- 📈 **Historical Analysis** — Time-series normalization with historical FX
  rates
- 💰 **Inflation Adjustment** — Adjust values for inflation using CPI data
- 🧠 **Smart Unit Inference** — Automatically detect units from context
- 🏆 **Data Quality Assessment** — Comprehensive quality scoring across 6
  dimensions with outlier detection, completeness analysis, and actionable
  recommendations
- 🛡️ **Unit Type Consistency Detection** — Detect semantic unit type mismatches
  (count vs index) within indicator groups
- 📊 **Scale Outlier Detection** — Identify magnitude scale issues (100x
  differences) from inconsistent labeling
- ⚡ **Batch Processing** — Process large datasets efficiently with validation
  and error recovery
- 🔌 **Custom Units** — Define domain-specific units (emissions, crypto,
  commodities)
- 📊 **Statistical Tools** — Aggregations with proper unit handling and edge
  case management
- 🌊 **Seasonal Adjustment** — Remove seasonal patterns from time series data
- 💾 **Smart Caching** — Cache computations for better performance with TTL
  support
- ➕ **Unit Algebra** — Mathematical operations preserving units with
  floating-point precision
- 📁 **Universal I/O** — Import/export CSV, JSON, Excel with automatic unit
  detection
- 🛡️ **Production Ready** — 223 comprehensive tests, zero hanging promises,
  robust error handling

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

// Wages processing (automatic detection in main API)
import { normalizeWagesData } from "jsr:@tellimer/econify/wages";

// Time sampling
import {
  convertWageTimeScale,
  processWageTimeSeries,
  resampleTimeSeries,
} from "jsr:@tellimer/econify/time";
```

## 🚀 Quick Start

### Batch Processing (NEW in v1.1.0)

Process multiple countries/regions for an indicator together to ensure
consistent normalization:

```typescript
import { EconifyBatchSession } from "@tellimer/econify";

// Create a batch session
const session = new EconifyBatchSession({
  targetCurrency: "USD",
  autoTargetByIndicator: true,
  autoTargetDimensions: ["magnitude", "time"],
  fxFallback: { base: "USD", rates: { EUR: 0.92, GBP: 0.79 } },
});

// Add all countries for "Balance of Trade"
session.addDataPoint({
  id: "BALANCE_OF_TRADE",
  name: "Balance of Trade",
  value: 100,
  unit: "USD million/month",
  metadata: { countryISO: "USA" },
});

session.addDataPoint({
  id: "BALANCE_OF_TRADE",
  name: "Balance of Trade",
  value: 0.2,
  unit: "EUR billion/quarter",
  metadata: { countryISO: "DEU" },
});

// Process all together for consistent normalization
const result = await session.process();
// All countries normalized to same units (e.g., USD millions/month)
```

See [docs/batch-processing.md](./docs/batch-processing.md) for detailed
documentation.

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
  targetTimeScale: "month", // 🆕 Standardize time periods to monthly

  // Provide exchange rates with dates
  fxFallback: {
    base: "USD",
    rates: { EUR: 0.92 },
    dates: { EUR: "2024-01-15T10:30:00Z" }, // When each rate was last updated
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

### Explicit Metadata Fields

Pass metadata as separate fields instead of concatenating into unit strings for
cleaner, more reliable processing:

```ts
import { processEconomicData } from "jsr:@tellimer/econify";

// Clean database-style data with explicit metadata
const economicData = [
  {
    value: -482.58,
    unit: "XOF Billion", // Clean unit without time info
    periodicity: "Quarterly", // 🆕 Explicit periodicity
    scale: "Billions", // 🆕 Explicit scale
    currency_code: "XOF", // 🆕 Explicit currency
    name: "Benin Balance of Trade",
  },
  {
    value: -181.83,
    unit: "BDT Billion", // Clean unit
    periodicity: "Monthly", // 🆕 Different periodicity
    scale: "Billions", // 🆕 Explicit scale
    currency_code: "BDT", // 🆕 Different currency
    name: "Bangladesh Balance of Trade",
  },
];

const result = await processEconomicData(economicData, {
  targetCurrency: "USD",
  targetMagnitude: "millions",
  targetTimeScale: "month", // 🎯 Convert all to monthly
  explain: true, // 🔍 Show conversion details
  fxFallback: {
    base: "USD",
    rates: { XOF: 558.16, BDT: 121.61 },
  },
});

// Check enhanced conversion details
result.data.forEach((item) => {
  console.log(
    `${item.name}: ${item.normalized?.toFixed(2)} ${item.normalizedUnit}`,
  );

  // 🆕 Enhanced explain metadata with comprehensive details
  if (item.explain?.conversion) {
    console.log(`  🔄 Conversion: ${item.explain.conversion.summary}`);
    console.log(`  📊 Total Factor: ${item.explain.conversion.totalFactor}`);
    console.log("  📋 Steps:");
    item.explain.conversion.steps.forEach((step, i) => {
      console.log(`     ${i + 1}. ${step}`);
    });
  }

  // 🆕 Detailed periodicity information
  if (item.explain?.periodicity?.adjusted) {
    console.log(
      `  ⏰ Time: ${item.explain.periodicity.description} (${item.explain.periodicity.direction})`,
    );
  }

  // 🆕 Detailed magnitude information
  if (item.explain?.magnitude) {
    console.log(
      `  📏 Scale: ${item.explain.magnitude.description} (${item.explain.magnitude.direction})`,
    );
  }

  // Enhanced FX information
  if (item.explain?.fx) {
    console.log(
      `  💱 FX: ${item.explain.fx.currency} → ${item.explain.fx.base} (rate: ${item.explain.fx.rate})${
        item.explain.fx.asOf ? ` as of ${item.explain.fx.asOf}` : ""
      }`,
    );
  }
});
```

**Benefits:**

- **Higher Accuracy**: Explicit fields are more reliable than string parsing
- **Better Performance**: Less string parsing overhead
- **Cleaner Code**: Matches database schema directly
- **Smart Fallback**: Falls back to unit string parsing when explicit fields not
  provided

## 🔍 Enhanced Explain Metadata

Get comprehensive transparency into all normalization decisions with the
enhanced explain metadata system:

```ts
const result = await processEconomicData(
  [
    {
      value: -6798.401,
      unit: "USD Million",
      periodicity: "Yearly",
      scale: "Millions",
      currency_code: "USD",
      name: "Afghanistan Balance of Trade",
    },
  ],
  {
    targetCurrency: "USD",
    targetMagnitude: "millions",
    targetTimeScale: "month",
    explain: true, // 🔍 Enable enhanced explain metadata
  },
);

const item = result.data[0];
console.log("Enhanced Explain Metadata:");
console.log(JSON.stringify(item.explain, null, 2));
```

**Enhanced Features:**

- **🔄 Conversion Summary**: Complete step-by-step conversion chain
- **📏 Magnitude Details**: Direction ("upscale"/"downscale"), factor, and
  descriptions
- **⏰ Periodicity Details**: Factor, direction ("upsample"/"downsample"), clear
  descriptions
- **🏷️ Complete Units**: Both simple and full unit strings with time periods
- **🧮 Total Factor**: Overall conversion factor for manual verification
- **🎯 Separate Components**: Individual currency, scale, and periodicity fields
  for easy frontend access

**Example Output:**

```json
{
  "periodicity": {
    "original": "year",
    "target": "month",
    "adjusted": true,
    "factor": 0.08333333333333333,
    "direction": "upsample",
    "description": "year → month (÷12)"
  },
  "units": {
    "originalUnit": "USD millions",
    "normalizedUnit": "USD millions per month",
    "originalFullUnit": "USD millions per year",
    "normalizedFullUnit": "USD millions per month"
  },
  "currency": {
    "original": "USD",
    "normalized": "USD"
  },
  "scale": {
    "original": "millions",
    "normalized": "millions"
  },
  "timeScale": {
    "original": "year",
    "normalized": "month"
  },
  "conversion": {
    "summary": "USD millions per year → USD millions per month",
    "totalFactor": 0.08333333333333333,
    "steps": ["Time: year → month (÷12)"]
  }
}
```

**Frontend Usage:**

```javascript
// ✅ Direct access - no string parsing needed!
const originalCurrency = item.explain.currency?.original; // "USD"
const normalizedScale = item.explain.scale?.normalized; // "millions"
const originalTime = item.explain.timeScale?.original; // "year"

// ✅ Easy conditional logic
const currencyChanged =
  item.explain.currency?.original !== item.explain.currency?.normalized;
const scaleChanged =
  item.explain.scale?.original !== item.explain.scale?.normalized;
const timeChanged =
  item.explain.timeScale?.original !== item.explain.timeScale?.normalized;

// ✅ Build UI components easily
const ConversionDisplay = () => (
  <div>
    <span>{item.explain.currency?.original}</span>
    <span>{item.explain.scale?.original}</span>
    <span>→</span>
    <span>{item.explain.currency?.normalized}</span>
    <span>{item.explain.scale?.normalized}</span>
  </div>
);
```

### Auto‑Target by Indicator: targetSelection in Explain

When `autoTargetByIndicator` is enabled, Econify detects the most common
currency, magnitude and time basis per indicator series (e.g., per indicator
name) and normalizes minority values to match.

**Smart Time Normalization**: Auto-targeting respects the `indicator_type` field
from [@tellimer/classify](https://jsr.io/@tellimer/classify) to make intelligent
decisions:

- `indicator_type: "flow"` → Time normalization applied (e.g., GDP, exports)
- `indicator_type: "stock"` → Time normalization skipped (e.g., population,
  debt)
- `indicator_type: "count"` → Currency conversion skipped (e.g., car
  registrations)

For transparency, the explain metadata includes a `targetSelection` section with
the chosen targets, observed shares, and rationale.

Enable and inspect:

```ts
const result = await processEconomicData(data, {
  autoTargetByIndicator: true,
  indicatorKey: "name", // default
  autoTargetDimensions: ["currency", "magnitude", "time"],
  minMajorityShare: 0.5,
  tieBreakers: {
    currency: "prefer-targetCurrency", // falls back to USD if no targetCurrency
    magnitude: "prefer-millions",
    time: "prefer-month",
  },
  targetCurrency: "USD", // optional, used by tie-breaker
  explain: true,
  useLiveFX: false,
  fxFallback: { base: "USD", rates: { EUR: 0.8511 } },
});

for (const item of result.data) {
  console.log(item.explain?.targetSelection);
}
```

Payload shape:

```json
{
  "mode": "auto-by-indicator",
  "indicatorKey": "Balance of Trade",
  "selected": { "currency": "USD", "magnitude": "millions", "time": "month" },
  "shares": {
    "currency": { "USD": 0.67, "EUR": 0.33 },
    "magnitude": { "millions": 1.0 },
    "time": { "month": 0.67, "quarter": 0.33 }
  },
  "reason": "currency=majority(USD,0.67); magnitude=majority(millions,1.00); time=tie-break(prefer-month)"
}
```

Notes:

- `shares` are per-dimension observed shares within the indicator group
  (0.0–1.0).
- `selected` shows the effective targets applied during normalization per group.
- `reason` clarifies why each dimension was chosen:
  - `majority(X,share)` if the top share ≥ `minMajorityShare`
  - `tie-break(rule)` if no majority and a tie-breaker preference was applied
  - `none` if neither condition was met
- Auto-targeting uses `indicator_type` from
  [@tellimer/classify](https://jsr.io/@tellimer/classify) to intelligently skip
  time normalization for stocks/rates and currency conversion for counts
- Monetary domains (GDP, debt, trade, etc.) are auto‑targeted. Percentages,
  counts, and physical/commodity domains are left unchanged.
- You can control inclusion via `allowList`/`denyList` to force specific
  indicators in/out of auto-targeting.

#### Example with Indicator Classification

Auto-targeting works best when you provide `indicator_type` from the classify
package:

```ts
import { processEconomicData } from "@tellimer/econify";

// Data with indicator_type from @tellimer/classify
const data = [
  {
    name: "GDP",
    value: 100,
    unit: "USD Million per quarter",
    indicator_type: "flow", // From classify package
    is_currency_denominated: true,
  },
  {
    name: "Population",
    value: 12814,
    unit: "Thousands",
    indicator_type: "stock", // From classify package
    is_currency_denominated: false,
  },
];

const result = await processEconomicData(data, {
  autoTargetByIndicator: true,
  targetTimeScale: "month",
  explain: true,
});

// GDP (flow): Time normalized to monthly ✓
// Population (stock): Time normalization skipped ✓
```

See a runnable example:
[examples/auto_targets_example.ts](./examples/auto_targets_example.ts)

### Temporal Aggregation & Validation

Econify uses **dual validation** with both `indicator_type` and
`temporal_aggregation` from
[@tellimer/classify](https://jsr.io/@tellimer/classify) to ensure economically
correct normalizations.

#### The Three Normalization Dimensions

Econify normalizes data across three independent dimensions:

1. **Magnitude** (scale): thousands → millions → billions
2. **Time Scale**: daily → monthly → quarterly → annual
3. **Currency**: EUR → USD, NGN → USD, etc.

#### Temporal Aggregation Types

The `temporal_aggregation` field from
[@tellimer/classify](https://jsr.io/@tellimer/classify) tells econify **how
values accumulate over time**, which is critical for determining if time
conversions are valid:

| Type                | Description             | Time Conversion | Example                     |
| ------------------- | ----------------------- | --------------- | --------------------------- |
| `point-in-time`     | Snapshot at a moment    | ❌ **Blocked**  | Debt level, CPI index       |
| `period-cumulative` | Running total (YTD)     | ❌ **Blocked**  | YTD revenue, cumulative GDP |
| `not-applicable`    | Dimensionless           | ❌ **Blocked**  | Ratios, percentages         |
| `period-rate`       | Flow rate during period | ✅ **Allowed**  | GDP quarterly → annual      |
| `period-total`      | Sum over period         | ✅ **Allowed**  | Total transactions          |
| `period-average`    | Average over period     | ✅ **Allowed**  | Avg temperature             |

#### Understanding Time Scale Normalization: Upscaling vs Downscaling

Time scale normalization converts values between different time periods (daily,
monthly, quarterly, annual). The operation type depends on the direction of
conversion:

##### Downscaling (Making Periods Smaller)

**Definition**: Converting from a **larger** time period to a **smaller** one by
**dividing**.

When you downscale, you're asking: _"If this is the total for a year, what's the
rate per month?"_

**Mathematical Operation**: Division by the period ratio

**Examples:**

```typescript
// Annual → Monthly (Downscaling)
// Annual GDP: $1,200 billion per year → Monthly GDP: $100 billion per month
$1,200 billion/year ÷ 12 = $100 billion/month

// Quarterly → Monthly (Downscaling)
// Quarterly exports: $300 million per quarter → Monthly exports: $100 million per month
$300 million/quarter ÷ 3 = $100 million/month

// Weekly → Daily (Downscaling)
// Weekly production: $700k per week → Daily production: $100k per day
$700k/week ÷ 7 = $100k/day
```

**When Downscaling Works:**

- ✅ `period-rate`: Flow rates can be divided (GDP annual → monthly)
- ✅ `period-total`: Totals can be divided to get per-period amounts
- ✅ `period-average`: Averages can be divided assuming uniform distribution

**When Downscaling FAILS:**

- ❌ `point-in-time`: Can't divide a snapshot (Debt level has no time dimension)
- ❌ `period-cumulative`: Can't divide YTD totals (December YTD ÷ 12 ≠ monthly
  rate)
- ❌ `not-applicable`: Can't divide dimensionless values (Ratio × time =
  nonsense)

##### Upscaling (Making Periods Larger)

**Definition**: Converting from a **smaller** time period to a **larger** one by
**multiplying**.

When you upscale, you're asking: _"If this is the rate per month, what's the
total for a year?"_

**Mathematical Operation**: Multiplication by the period ratio

**Examples:**

```typescript
// Monthly → Annual (Upscaling)
// Monthly GDP: $100 billion per month → Annual GDP: $1,200 billion per year
$100 billion/month × 12 = $1,200 billion/year

// Monthly → Quarterly (Upscaling)
// Monthly imports: $50 million per month → Quarterly imports: $150 million per quarter
$50 million/month × 3 = $150 million/quarter

// Daily → Weekly (Upscaling)
// Daily sales: $10k per day → Weekly sales: $70k per week
$10k/day × 7 = $70k/week
```

**When Upscaling Works:**

- ✅ `period-rate`: Flow rates can be multiplied (GDP monthly → annual)
- ✅ `period-total`: Totals can be summed across periods
- ✅ `period-average`: Averages can be scaled assuming uniform distribution

**When Upscaling FAILS:**

- ❌ `point-in-time`: Can't multiply a snapshot (Debt × 12 = nonsense)
- ❌ `period-cumulative`: Can't multiply YTD totals (Q1 YTD × 4 ≠ annual total)
- ❌ `not-applicable`: Can't multiply dimensionless values (Ratio × 12 =
  nonsense)

##### Complete Normalization: All Three Dimensions

Econify normalizes across **three independent dimensions** in a specific order
for accuracy:

**Order of Operations:**

1. **Magnitude scaling** (thousands ↔ millions ↔ billions)
2. **Time scale conversion** (daily ↔ monthly ↔ quarterly ↔ annual)
3. **Currency conversion** (EUR → USD, NGN → USD, etc.)

**Why This Order Matters:**

Time conversion must happen before currency conversion for wages and hourly
rates. For example:

- ✅ Correct: Convert CAD/Hour → CAD/Month (time), then CAD/Month → USD/Month
  (currency)
- ❌ Wrong: Convert CAD/Hour → USD/Hour (currency), then try to convert to
  monthly

**Real-World Example: Complete Normalization**

```typescript
// Original data from database
{
  name: "Bangladesh Balance of Trade",
  value: -181.83,
  unit: "BDT Billion",
  periodicity: "Monthly",
  currency_code: "BDT",
  scale: "Billions",
  indicator_type: "flow",
  temporal_aggregation: "period-rate"
}

// Target: USD Millions per Year

// Step 1: Magnitude scaling (Billions → Millions)
// Operation: Upscale by multiplying × 1,000
-181.83 billion × 1,000 = -181,830 million
// Result: -181,830 BDT millions per month

// Step 2: Time conversion (Monthly → Annual)
// Operation: Upscale by multiplying × 12
// Valid because temporal_aggregation = "period-rate" (flow rate)
-181,830 million/month × 12 = -2,181,960 million/year
// Result: -2,181,960 BDT millions per year

// Step 3: Currency conversion (BDT → USD)
// Operation: Divide by exchange rate (121.61 BDT per USD)
-2,181,960 million ÷ 121.61 = -17,945.23 million
// Result: -17,945.23 USD millions per year

// Final normalized value
{
  normalized: -17945.23,
  normalizedUnit: "USD millions per year",
  explain: {
    conversion: {
      summary: "BDT billions per month → USD millions per year",
      totalFactor: 98.6842, // Combined: ×1000 ×12 ÷121.61
      steps: [
        "Magnitude: billions → millions (×1,000)",
        "Time: month → year (×12)",
        "Currency: BDT → USD (÷121.61)"
      ]
    },
    magnitude: {
      original: "billions",
      normalized: "millions",
      factor: 1000,
      direction: "upscale",
      description: "billions → millions (×1,000)"
    },
    periodicity: {
      original: "month",
      target: "year",
      factor: 12,
      direction: "upsample",
      description: "month → year (×12)"
    },
    fx: {
      currency: "BDT",
      base: "USD",
      rate: 121.61,
      source: "fallback"
    }
  }
}
```

##### Why Period-Cumulative and Point-in-Time Block Conversion

**Problem with Period-Cumulative (YTD totals):**

```typescript
// WRONG: Multiplying YTD values
{
  name: "YTD Revenue (as of March)",
  value: 1000, // $1,000M accumulated Jan-Mar
  temporal_aggregation: "period-cumulative"
}

// ❌ INCORRECT: Multiply by 12 to get annual?
1000 × 12 = 12,000 // This assumes March YTD × 12 = Annual total (WRONG!)

// ✅ CORRECT: Skip conversion, warn user
"⚠️ Skipping time conversion for period-cumulative indicator.
 YTD/running totals cannot be annualized by simple multiplication."

// Why it's wrong:
// - YTD is cumulative: Jan ($100) + Feb ($150) + Mar ($200) = $450
// - March YTD ($450) × 12 = $5,400 (nonsense!)
// - Actual annual = sum of all 12 months, not YTD × 12
```

**Problem with Point-in-Time (Snapshots):**

```typescript
// WRONG: Converting snapshot values
{
  name: "National Debt (end of quarter)",
  value: 25000, // $25 trillion at a specific moment
  temporal_aggregation: "point-in-time"
}

// ❌ INCORRECT: Convert quarterly to annual?
25,000 × 4 = 100,000 // Multiplying a debt snapshot makes no sense

// ✅ CORRECT: Skip conversion, warn user
"⚠️ Skipping time conversion for point-in-time indicator.
 Snapshot values are not cross-comparable across time periods."

// Why it's wrong:
// - Debt is a stock measured at one moment in time
// - Q1 debt level × 4 ≠ anything meaningful
// - Time dimension doesn't apply to snapshot values
```

##### Understanding Magnitude Scaling

Magnitude scaling converts between different numerical scales (thousands,
millions, billions):

**Upscaling (Making Numbers Smaller by Using Larger Units):**

```typescript
// Thousands → Millions (Divide by 1,000)
5,000 thousand ÷ 1,000 = 5 million

// Millions → Billions (Divide by 1,000)
5,000 million ÷ 1,000 = 5 billion

// Ones → Thousands (Divide by 1,000)
5,000 ones ÷ 1,000 = 5 thousand
```

**Downscaling (Making Numbers Larger by Using Smaller Units):**

```typescript
// Billions → Millions (Multiply by 1,000)
5 billion × 1,000 = 5,000 million

// Millions → Thousands (Multiply by 1,000)
5 million × 1,000 = 5,000 thousand

// Thousands → Ones (Multiply by 1,000)
5 thousand × 1,000 = 5,000 ones
```

**Complete Example with All Three Dimensions:**

```typescript
// Original: German GDP
{
  value: 0.99,
  unit: "EUR Trillion per quarter",
  indicator_type: "flow",
  temporal_aggregation: "period-rate"
}

// Target: USD Millions per month

// Step 1: Magnitude (Trillion → Million)
// Trillions are bigger than millions, so we multiply
0.99 trillion × 1,000,000 = 990,000 million
// Direction: "downscale" (larger numbers, smaller unit)

// Step 2: Time (Quarter → Month)
// Quarter is bigger than month, so we divide
990,000 million/quarter ÷ 3 = 330,000 million/month
// Direction: "downsample" (smaller period)

// Step 3: Currency (EUR → USD at rate 1.10)
330,000 million × 1.10 = 363,000 million
// Result: $363,000 million per month (or $363 billion/month)

// Total conversion factor: ×1,000,000 ÷3 ×1.10 = ×366,666.67
```

#### Dual Validation Logic

Econify validates compatibility between `indicator_type` and
`temporal_aggregation` to catch economically nonsensical combinations:

**Incompatible Combinations (blocked with warnings):**

- `stock` + `period-rate` — Stocks are levels, not flows
- `stock` + `period-total` — Stocks don't accumulate over time
- `price` + `period-rate` — Prices are snapshots, not flows
- `ratio` + `period-cumulative` — Ratios don't accumulate
- `flow` + `not-applicable` — Flows measure activity over time
- `volume` + `not-applicable` — Volumes measure activity over time
- `count` + `not-applicable` — Counts measure activity over time

**Example with Validation:**

```ts
import { processEconomicData } from "@tellimer/econify";

// Data with indicator_type and temporal_aggregation from classify
const data = [
  {
    name: "GDP",
    value: 5000,
    unit: "USD Million",
    periodicity: "Quarterly",
    indicator_type: "flow", // From classify
    temporal_aggregation: "period-rate", // From classify
    // ✅ Compatible: flow + period-rate is economically valid
  },
  {
    name: "National Debt",
    value: 1000000,
    unit: "USD Million",
    periodicity: "Monthly",
    indicator_type: "stock", // From classify
    temporal_aggregation: "point-in-time", // From classify
    // ✅ Compatible: stock + point-in-time is economically valid
  },
  {
    name: "YTD Revenue",
    value: 12000,
    unit: "USD Million",
    periodicity: "Monthly",
    indicator_type: "flow", // From classify
    temporal_aggregation: "period-cumulative", // From classify
    // ✅ Valid but blocks time conversion (can't annualize YTD totals)
  },
];

const result = await processEconomicData(data, {
  targetTimeScale: "year",
  targetCurrency: "USD",
  fxFallback: { base: "USD", rates: {} },
});

// GDP (flow + period-rate): Converted quarterly → annual (×4) ✓
// National Debt (stock + point-in-time): Time conversion skipped ✓
// YTD Revenue (period-cumulative): Time conversion blocked with warning ✓
```

#### Warning Messages

When incompatible conversions are attempted, econify logs warnings and skips the
conversion:

```
⚠️ Skipping time conversion for period-cumulative indicator from month to year.
   YTD/running totals cannot be annualized by simple multiplication. Value unchanged.

⚠️ Skipping time conversion for point-in-time indicator from month to year.
   Snapshot values are not cross-comparable across time periods. Value unchanged.

⚠️ stock indicator with period-rate temporal aggregation is incompatible.
   This combination doesn't make economic sense. Blocking time conversion to be conservative.
```

#### Benefits of Dual Validation

1. **Prevents Incorrect Math**: Blocks conversions like multiplying YTD totals
   by 12 to get annual totals
2. **Economic Accuracy**: Ensures indicator types match their temporal behavior
   (stocks vs flows)
3. **Clear Warnings**: Explains why conversions are blocked without breaking the
   pipeline
4. **Conservative Approach**: When there's conflict, blocks conversion to avoid
   incorrect data
5. **Data Flows Through**: Warnings are logged but data continues through
   pipeline unchanged

#### Batch/Streaming note

- Batch and streaming helpers currently operate item-by-item with fixed targets.
  If you need auto-target-by-indicator at scale, group items by indicator (e.g.,
  name), compute targets per group (handled automatically by
  `processEconomicData` with `autoTargetByIndicator: true`), and process each
  group. Native batch support for auto-targeting can be added if needed.

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

const data = [{ value: 100, unit: "USD", name: "Valid Data" }];

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

### Wages Data Processing

Handle mixed wage data with different currencies and time periods using the
unified API:

```ts
import { processEconomicData } from "jsr:@tellimer/econify";

// Mixed wages data (real-world scenario)
const wagesData = [
  {
    id: "CAN_WAGES",
    value: 29.68,
    unit: "CAD/Hour",
    name: "Canada Average Wages",
    metadata: { country: "CAN" },
  },
  {
    id: "AUS_WAGES",
    value: 1432.6,
    unit: "AUD/Week",
    name: "Australia Average Wages",
    metadata: { country: "AUS" },
  },
  {
    id: "CHN_WAGES",
    value: 124110,
    unit: "CNY/Year",
    name: "China Average Wages",
    metadata: { country: "CHN" },
  },
  {
    id: "EUR_WAGES",
    value: 3200,
    unit: "EUR/Month",
    name: "Europe Average Wages",
    metadata: { country: "EUR" },
  },
];

// Process with automatic wages detection + time + currency conversion
const result = await processEconomicData(wagesData, {
  targetCurrency: "USD", // Convert all to USD
  targetTimeScale: "month", // Standardize to monthly
  fxFallback: fxRates,
});

// Results: All wages now in USD/month for comparison
console.log("Comparable wages in USD/month:");
result.data.forEach((item) => {
  if (item.normalized) {
    console.log(
      `${item.metadata.country}: $${
        Math.round(
          item.normalized,
        ).toLocaleString()
      }`,
    );
  }
});
// CAN: $15,931 USD/month (was 29.68 CAD/Hour)
// AUS: $4,084 USD/month (was 1432.6 AUD/Week)
```

#### FX Fallback & Reliability

Wages processing includes robust FX rate handling:

```ts
// Option 1: With explicit FX rates (recommended)
const result = await processEconomicData(wagesData, {
  targetCurrency: "USD",
  useLiveFX: false, // Use provided rates
  fxFallback: {
    base: "USD",
    rates: {
      CAD: 1.36,
      AUD: 1.52,
      EUR: 0.92,
      // Add all currencies in your data
    },
  },
});

// Option 2: With live FX + fallback (production)
const result = await processEconomicData(wagesData, {
  targetCurrency: "USD",
  useLiveFX: true, // Try live rates first
  fxFallback: fallbackRates, // Use if live rates fail
});

// Option 3: Graceful degradation (no FX rates)
const result = await processEconomicData(wagesData, {
  targetCurrency: "USD",
  useLiveFX: false,
  // No fxFallback - processes without currency conversion
});
// ⚠️ Warning: "No FX rates available for wage normalization"
// ✅ Still processes data, but no currency conversion
// CHN: $1,427 USD/month (was 124110 CNY/Year)
// EUR: $3,478 USD/month (was 3200 EUR/Month)
```

### Normalization Exemptions

Skip normalization for specific indicators that shouldn't be processed:

```ts
import { processEconomicData } from "jsr:@tellimer/econify";

const mixedData = [
  {
    id: "TEL_CCR",
    value: 85,
    unit: "points",
    name: "Credit Rating",
    metadata: { categoryGroup: "Tellimer" },
  },
  {
    id: "IMF_GDP",
    value: 2.5,
    unit: "percent",
    name: "GDP Growth Rate",
    metadata: { categoryGroup: "IMF WEO" },
  },
  {
    id: "WAGES_MFG",
    value: 50000,
    unit: "USD/Year",
    name: "Manufacturing Wages",
    metadata: { categoryGroup: "Labor Stats" },
  },
];

const result = await processEconomicData(mixedData, {
  targetCurrency: "EUR",
  targetMagnitude: "millions",
  exemptions: {
    // Skip specific indicator IDs
    indicatorIds: ["TEL_CCR"],

    // Skip entire category groups
    categoryGroups: ["IMF WEO", "Tellimer"],

    // Skip indicators with certain name patterns
    indicatorNames: ["Credit Rating", "Index"],
  },
  fxFallback: {
    base: "USD",
    rates: { EUR: 0.85 },
  },
});

// Results:
// ✅ TEL_CCR: 85 points (exempted - unchanged)
// ✅ IMF_GDP: 2.5 percent (exempted - unchanged)
// ✅ WAGES_MFG: 3,541.67 EUR/month (processed - normalized)
```

**Common exemption use cases:**

- **IMF WEO data**: Already standardized, shouldn't be re-normalized
- **Credit ratings**: Qualitative/ordinal data that doesn't need currency
  conversion
- **Custom indices**: Proprietary calculations that should remain untouched
- **Tellimer composites**: Internal indicators with specific formatting
  requirements

### Time Resampling & Standardization

Econify automatically handles time period conversion to ensure consistent
reporting:

```ts
// Mixed time periods in your data
const mixedTimeData = [
  { value: 300, unit: "Million USD per Quarter", name: "Quarterly Sales" },
  { value: 1200, unit: "Million USD per Year", name: "Annual Revenue" },
  { value: 50, unit: "Million USD per Week", name: "Weekly Production" },
];

// Standardize everything to monthly reporting
const result = await processEconomicData(mixedTimeData, {
  targetCurrency: "USD",
  targetTimeScale: "month", // Convert all to monthly
  fxFallback: { base: "USD", rates: {} },
});

// Results: All data now in consistent monthly format
result.data.forEach((item) => {
  console.log(`${item.name}: ${item.normalized} ${item.normalizedUnit}`);
});
// Quarterly Sales: 100 USD millions/month (was 300/quarter)
// Annual Revenue: 100 USD millions/month (was 1200/year)
// Weekly Production: 217 USD millions/month (was 50/week)
```

#### Supported Time Scales

- **`hour`** - Hourly data
- **`day`** - Daily data
- **`week`** - Weekly data
- **`month`** - Monthly data (recommended for consistency)
- **`quarter`** - Quarterly data
- **`year`** - Annual data

#### Automatic Conversion

Econify uses accurate conversion factors:

- **Weekly → Monthly**: ×4.33 (52 weeks ÷ 12 months)
- **Quarterly → Monthly**: ÷3 (3 months per quarter)
- **Annual → Monthly**: ÷12 (12 months per year)
- **Hourly → Monthly**: ×173.33 (2080 work hours ÷ 12 months)

### Advanced Time Sampling

For complex time series analysis, use the advanced sampling functions:

```ts
import {
  convertWageTimeScale,
  processWageTimeSeries,
  resampleTimeSeries,
} from "jsr:@tellimer/econify/time";

// Upsample yearly to monthly with linear interpolation
const yearlyData = [
  { date: new Date("2022-01-01"), value: 50000 },
  { date: new Date("2023-01-01"), value: 52000 },
  { date: new Date("2024-01-01"), value: 54000 },
];

const monthlyData = resampleTimeSeries(yearlyData, "month", {
  method: "linear", // or "step", "average", "sum"
});

// Convert wage time scales with work hours accuracy
const monthlyWage = convertWageTimeScale(25, "hour", "month", "hourly");
// Uses 173.33 work hours/month, not 730 calendar hours

// Process mixed wage frequencies
const mixedWages = [
  { value: 30, unit: "USD/Hour", country: "USA" },
  { value: 1500, unit: "EUR/Week", country: "DEU" },
  { value: 60000, unit: "GBP/Year", country: "GBR" },
];

const standardized = processWageTimeSeries(mixedWages, "month");
// All converted to monthly frequency with proper time factors
```

## 🏆 Data Quality Assessment

Comprehensive quality assessment with 6 dimensions and actionable insights:

```ts
import { assessDataQuality } from "jsr:@tellimer/econify";

// Sample data with various quality issues
const data = [
  { value: 100, unit: "USD", date: "2023-01-01", source: "Federal Reserve" },
  { value: 105, unit: "USD", date: "2023-03-01" }, // Missing February
  { value: 999999, unit: "USD", date: "2023-04-01" }, // Outlier
  { value: "103", unit: "EUR", date: "2023-05-01" }, // Mixed types
  { value: 108, unit: "USD", date: "2023-05-01", source: "Unknown Blog" }, // Duplicate date, unreliable source
];

const qualityReport = assessDataQuality(data, {
  checkOutliers: true,
  checkConsistency: true,
  checkCompleteness: true,
  expectedSchema: {
    requiredFields: ["value", "unit", "date"],
  },
});

console.log("📊 Quality Assessment:");
console.log(`Overall Score: ${qualityReport.overall}/100`);
console.log("\n📈 Dimensions:");
Object.entries(qualityReport.dimensions).forEach(([dim, score]) => {
  console.log(`  ${dim}: ${score}/100`);
});

console.log("\n⚠️ Issues Found:");
qualityReport.issues.forEach((issue) => {
  console.log(`  ${issue.severity}: ${issue.type} - ${issue.message}`);
});

console.log("\n💡 Recommendations:");
qualityReport.recommendations.forEach((rec) => {
  console.log(`  • ${rec}`);
});

// Output:
// 📊 Quality Assessment:
// Overall Score: 67/100
//
// 📈 Dimensions:
//   completeness: 70/100
//   consistency: 60/100
//   validity: 80/100
//   accuracy: 75/100
//   timeliness: 85/100
//   uniqueness: 90/100
//
// ⚠️ Issues Found:
//   warning: missing_values - Expected 5 data points, found 4
//   warning: outliers - 1 statistical outliers detected
//   warning: mixed_data_types - Mixed data types detected
//   warning: inconsistent_units - Multiple units detected: USD, EUR
//   warning: duplicate_dates - Duplicate dates found
//   warning: unreliable_sources - 1 sources with low reliability
//
// 💡 Recommendations:
//   • Fill missing data points or adjust collection frequency
//   • Review outlier values for accuracy
//   • Standardize data types across all fields
//   • Convert all values to a consistent unit
//   • Remove or consolidate duplicate entries
//   • Verify data from unreliable sources
```

### Quality Dimensions Explained

- **Completeness** (25% weight): Missing values, temporal gaps, required fields
- **Consistency** (15% weight): Unit consistency, data type uniformity,
  duplicate handling
- **Validity** (25% weight): Data format validation, range checks, type
  validation
- **Accuracy** (15% weight): Outlier detection, precision analysis,
  reasonableness checks
- **Timeliness** (10% weight): Data freshness, temporal ordering, update
  frequency
- **Uniqueness** (10% weight): Duplicate detection, primary key validation

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

// Advanced time series resampling
function resampleTimeSeries(
  data: TimeSeries[],
  targetFrequency: TimeScale,
  options?: SamplingOptions,
): TimeSeries[];

// Convert wage time scales with work hours accuracy
function convertWageTimeScale(
  value: number,
  fromScale: TimeScale,
  toScale: TimeScale,
  wageType?: "hourly" | "salary",
): number;
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
    dates?: Record<string, string>; // When each rate was last updated
  };

  // Exemptions - skip normalization for specific indicators
  exemptions?: {
    indicatorIds?: string[]; // e.g., ['TEL_CCR', 'CUSTOM_INDEX']
    categoryGroups?: string[]; // e.g., ['IMF WEO', 'Tellimer']
    indicatorNames?: string[]; // e.g., ['Credit Rating', 'Index']
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

interface TimeSeries {
  date: Date;
  value: number;
  metadata?: any;
}

interface SamplingOptions {
  method:
    | "linear"
    | "step"
    | "average"
    | "sum"
    | "end_of_period"
    | "start_of_period";
  fillMissing?: boolean;
  fillValue?: number;
  preserveSeasonality?: boolean;
}
```

## 📖 Complete API Reference

### `processEconomicData()`

Main function for processing economic data through the complete pipeline.

```typescript
async function processEconomicData(
  data: ParsedData[],
  options?: ProcessingOptions,
): Promise<PipelineResult>;
```

#### Input: `ParsedData`

```typescript
interface ParsedData {
  // Required fields
  value: number; // The numeric value
  unit: string; // Unit string (e.g., "USD Million", "percent")

  // Recommended fields
  id?: string | number; // Unique identifier
  name?: string; // Indicator name (used for grouping with autoTargetByIndicator)

  // Optional metadata
  year?: number; // Year for the data point
  date?: string | Date; // Date for the data point
  description?: string; // Description text
  context?: string; // Additional context

  // Explicit metadata (preferred over concatenated units)
  // These take precedence over unit string parsing when provided
  periodicity?: string; // "Quarterly", "Monthly", "Yearly"
  scale?: string; // "Millions", "Billions", "Thousands"
  currency_code?: string; // ISO currency code (e.g., "USD", "EUR", "SAR")

  // Classification metadata (from @tellimer/classify package)
  // When provided, these are used instead of econify's internal classification
  indicator_type?: string; // e.g., "flow", "stock", "percentage", "ratio"
  is_currency_denominated?: boolean; // true for currency amounts
  temporal_aggregation?: string; // "point-in-time" | "period-rate" | "period-cumulative" | "period-average" | "period-total" | "not-applicable"

  // Additional metadata
  metadata?: Record<string, unknown>; // Custom metadata

  // Output fields (added by pipeline)
  normalized?: number; // Normalized value
  normalizedUnit?: string; // Normalized unit string
  parsedUnit?: ParsedUnit; // Parsed unit details
  inferredUnit?: string; // Inferred unit (if inferUnits enabled)
  realValue?: number; // Inflation-adjusted value
  explain?: Explain; // Detailed normalization metadata (if explain enabled)
  pipeline?: {
    // Pipeline metadata
    qualityScore?: number;
    processingTime?: number;
    inferredUnit?: string;
  };
}
```

#### Options: `ProcessingOptions`

```typescript
interface ProcessingOptions {
  // ═══════════════════════════════════════════════════════════
  // NORMALIZATION TARGETS
  // ═══════════════════════════════════════════════════════════

  /** Target currency for conversion (e.g., "USD", "EUR") */
  targetCurrency?: string;

  /** Target magnitude scale */
  targetMagnitude?:
    | "ones"
    | "thousands"
    | "millions"
    | "billions"
    | "trillions";

  /** Target time scale for flow indicators */
  targetTimeScale?: "year" | "quarter" | "month" | "week" | "day" | "hour";

  // ═══════════════════════════════════════════════════════════
  // AUTO-TARGETING (Smart Normalization)
  // ═══════════════════════════════════════════════════════════

  /**
   * Enable auto-targeting per indicator group
   * Automatically determines appropriate normalization targets
   * based on the most common units in each indicator group
   */
  autoTargetByIndicator?: boolean;

  /**
   * Which dimensions to auto-target
   * Default: ["magnitude", "currency", "time"]
   */
  autoTargetDimensions?: Array<"magnitude" | "currency" | "time">;

  /**
   * Minimum share required to select a majority value
   * Default: 0.5 (50% of items must share a unit)
   */
  minMajorityShare?: number;

  /**
   * Grouping key for indicator series
   * Default: 'name' (groups by the 'name' field)
   * Can also provide a resolver function to derive the key from the row
   */
  indicatorKey?: string | ((item: ParsedData) => string);

  /**
   * Tie-breaker preferences when no majority exists
   */
  tieBreakers?: {
    currency?: "prefer-targetCurrency" | "prefer-USD" | "none";
    magnitude?: "prefer-millions" | "none";
    time?: "prefer-month" | "none";
  };

  /**
   * Optional allow/deny lists to force in/out certain indicators
   */
  allowList?: string[];
  denyList?: string[];

  // ═══════════════════════════════════════════════════════════
  // QUALITY CONTROLS (NEW)
  // ═══════════════════════════════════════════════════════════

  /**
   * Enable unit type consistency detection
   * Detects semantic unit type mismatches (count vs index vs percentage)
   */
  detectUnitTypeMismatches?: boolean;

  /**
   * Unit type consistency options
   */
  unitTypeOptions?: {
    /** Threshold for dominant type (default: 0.67 = 67% majority) */
    dominantTypeThreshold?: number;

    /** Include detailed type distribution statistics */
    includeDetails?: boolean;

    /** Remove incompatible items from results */
    filterIncompatible?: boolean;
  };

  /**
   * Enable scale outlier detection
   * Detects magnitude scale issues (100x+ differences)
   */
  detectScaleOutliers?: boolean;

  /**
   * Scale outlier detection options
   */
  scaleOutlierOptions?: {
    /** Minimum cluster size for majority (default: 0.67 = 67%) */
    clusterThreshold?: number;

    /** Magnitude difference threshold in log10 units
     * 1.0 = 10x, 2.0 = 100x (default), 3.0 = 1000x */
    magnitudeDifferenceThreshold?: number;

    /** Include detailed cluster distribution */
    includeDetails?: boolean;

    /** Remove outlier items from results */
    filterOutliers?: boolean;
  };

  /** Minimum overall quality score (0-100) for data to pass */
  minQualityScore?: number;

  // ═══════════════════════════════════════════════════════════
  // FX RATES
  // ═══════════════════════════════════════════════════════════

  /**
   * Fallback FX rates table
   * Used when live rates are unavailable
   */
  fxFallback?: {
    base: string; // Base currency (e.g., "USD")
    rates: Record<string, number>; // Currency rates
    dates?: Record<string, string>; // When each rate was last updated
  };

  // ═══════════════════════════════════════════════════════════
  // EXEMPTIONS (Skip Normalization)
  // ═══════════════════════════════════════════════════════════

  /**
   * Skip normalization for specific indicators
   */
  exemptions?: {
    /** Indicator IDs to exempt (e.g., ['TEL_CCR', 'CUSTOM_INDEX']) */
    indicatorIds?: string[];

    /** Category groups to exempt (e.g., ['IMF WEO', 'Tellimer']) */
    categoryGroups?: string[];

    /** Indicator names to exempt (e.g., ['Credit Rating', 'Index']) */
    indicatorNames?: string[];
  };

  // ═══════════════════════════════════════════════════════════
  // SPECIAL HANDLING (Data Quality Issues)
  // ═══════════════════════════════════════════════════════════

  /**
   * Special handling for indicators with known data quality issues
   * Override units/scales for specific indicators
   */
  specialHandling?: {
    unitOverrides?: Array<{
      /** Indicator IDs to apply override to */
      indicatorIds?: string[];
      /** Indicator names to apply override to (case-insensitive) */
      indicatorNames?: string[];
      /** Override the unit field (e.g., "Units" instead of "Thousand") */
      overrideUnit?: string;
      /** Override the scale field (e.g., null to prevent scaling) */
      overrideScale?: string | null;
      /** Reason for the override (for documentation/logging) */
      reason?: string;
    }>;
  };

  // ═══════════════════════════════════════════════════════════
  // ADVANCED OPTIONS
  // ═══════════════════════════════════════════════════════════

  /** Automatically infer units from context */
  inferUnits?: boolean;

  /** Adjust for inflation using CPI data */
  adjustInflation?: boolean;

  /** Remove seasonal patterns from time series */
  removeSeasonality?: boolean;

  /** Use live FX rates (fetched from external sources) */
  useLiveFX?: boolean;

  /** Validate schema with required fields */
  validateSchema?: boolean;

  /** Required fields for validation */
  requiredFields?: string[];

  /** Output format for results */
  outputFormat?: "json" | "csv" | "parquet";

  /** Include detailed normalization metadata (default: false) */
  explain?: boolean;

  // ═══════════════════════════════════════════════════════════
  // WAGES-SPECIFIC OPTIONS
  // ═══════════════════════════════════════════════════════════

  /** Exclude index values from wages data */
  excludeIndexValues?: boolean;

  /** Include wage-specific metadata in results */
  includeWageMetadata?: boolean;

  // ═══════════════════════════════════════════════════════════
  // CALLBACKS
  // ═══════════════════════════════════════════════════════════

  /** Progress callback (step name, progress 0-1) */
  onProgress?: (step: string, progress: number) => void;

  /** Warning callback */
  onWarning?: (warning: string) => void;

  /** Error callback */
  onError?: (error: Error) => void;
}
```

#### Output: `PipelineResult`

```typescript
interface PipelineResult {
  /** Processed data (all items if no filtering, or only passed items) */
  data: ParsedData[];

  /** Items filtered due to incompatible unit types (if filterIncompatible=true) */
  incompatibleUnits?: ParsedData[];

  /** Items filtered as scale outliers (if filterOutliers=true) */
  outliers?: ParsedData[];

  /** Warning messages */
  warnings: string[];

  /** Error messages */
  errors: Error[];

  /** Processing metrics */
  metrics: {
    processingTime: number; // Time in milliseconds
    recordsProcessed: number; // Total records processed
    recordsFailed: number; // Records that failed
    qualityScore?: number; // Overall quality score (0-100)
  };

  /** Per-indicator target selections (when autoTargetByIndicator is enabled) */
  targetSelectionsByIndicator?: Record<
    string,
    {
      currency?: string;
      magnitude?: string;
      timeScale?: string;
    }
  >;
}
```

Each item in `data` will have an `explain` field with normalization details:

```typescript
interface ExplainMetadata {
  // Original values
  originalValue: number;
  originalUnit: string;

  // Normalized values
  normalizedValue: number;
  normalizedUnit: string;

  // Conversions applied
  conversions: {
    currency?: { from: string; to: string; rate: number };
    magnitude?: { from: string; to: string; factor: number };
    time?: { from: string; to: string; factor: number };
  };

  // Quality warnings (if any)
  qualityWarnings?: Array<{
    type: "unit-type-mismatch" | "scale-outlier" | "quality-issue";
    severity: "low" | "medium" | "high";
    message: string;
    context?: any;
  }>;

  // Auto-targeting info (if enabled)
  autoTarget?: {
    dimension: "currency" | "magnitude" | "time";
    target: string;
    confidence: number;
  };
}
```

### Complete Usage Examples

#### Basic Normalization

```typescript
const result = await processEconomicData(data, {
  targetCurrency: "USD",
  targetMagnitude: "billions",
});

console.log(result.data[0].normalized); // Normalized value
console.log(result.data[0].explain); // Detailed conversion info
```

#### Auto-Targeting (Recommended)

```typescript
// Automatically determine best targets per indicator group
const result = await processEconomicData(data, {
  autoTargetByIndicator: true,
  autoTargetDimensions: ["magnitude", "currency", "time"],
});

// Each indicator group normalized to its most common unit
result.data.forEach((item) => {
  console.log(item.explain?.autoTarget); // Shows what target was chosen
});
```

#### Quality Controls

```typescript
// Development mode - warnings only
const devResult = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    filterIncompatible: false, // Keep all data
    includeDetails: true, // Get statistics
  },
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    filterOutliers: false, // Keep all data
    includeDetails: true, // Get cluster info
  },
});

// Review warnings
devResult.data.forEach((item) => {
  item.explain?.qualityWarnings?.forEach((warning) => {
    console.log(`⚠️ ${item.id}: ${warning.type} - ${warning.message}`);
  });
});

// Production mode - automatic filtering
const prodResult = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    filterIncompatible: true, // Auto-remove
  },
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    filterOutliers: true, // Auto-remove
  },
});

console.log("Clean data:", prodResult.data.length);
console.log("Filtered incompatible:", prodResult.incompatibleUnits?.length);
console.log("Filtered outliers:", prodResult.outliers?.length);
```

#### Comprehensive Configuration

```typescript
const result = await processEconomicData(data, {
  // Targets
  targetCurrency: "EUR",
  targetMagnitude: "millions",
  targetTimeScale: "month",

  // Auto-targeting
  autoTargetByIndicator: true,
  autoTargetDimensions: ["magnitude", "currency"],
  autoTargetThreshold: 0.67,

  // Quality controls
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    dominantTypeThreshold: 0.67,
    filterIncompatible: true,
    includeDetails: true,
  },
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    clusterThreshold: 0.67,
    magnitudeDifferenceThreshold: 2.0, // 100x
    filterOutliers: true,
    includeDetails: true,
  },
  minQualityScore: 70,

  // FX rates
  fxFallback: {
    base: "USD",
    rates: {
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.5,
    },
    dates: {
      EUR: "2025-01-10",
      GBP: "2025-01-10",
      JPY: "2025-01-10",
    },
  },

  // Exemptions
  exemptions: {
    indicatorIds: ["TEL_CCR"],
    categoryGroups: ["IMF WEO"],
    indicatorNames: ["Credit Rating", "Risk Index"],
  },

  // Callbacks
  onProgress: (step, progress) => {
    console.log(`${step}: ${(progress * 100).toFixed(0)}%`);
  },
  onWarning: (warning) => {
    console.warn("⚠️", warning);
  },
  onError: (error) => {
    console.error("❌", error.message);
  },
});
```

### Batch Processing API

For processing multiple indicators with consistent normalization:

```typescript
import { EconifyBatchSession } from "@tellimer/econify";

// Create session
const session = new EconifyBatchSession({
  targetCurrency: "USD",
  autoTargetByIndicator: true,
  detectUnitTypeMismatches: true,
  detectScaleOutliers: true,
});

// Add data points
data.forEach((item) => session.addDataPoint(item));

// Process all together
const result = await session.process();

// Access results
console.log("Processed:", result.data);
console.log("Warnings:", result.warnings);
console.log("Quality filtered:", result.incompatibleUnits, result.outliers);
```

See [Batch Processing Guide](./docs/guides/batch-processing.md) for detailed
documentation.

### Quality Control APIs

#### Unit Type Classification

```typescript
import {
  areUnitsCompatible,
  classifyUnitType,
} from "@tellimer/econify/quality";

// Classify a unit
const result = classifyUnitType("USD Million");
// → { type: "currency-amount", confidence: 1.0, matchedPattern: "..." }

// Check compatibility
const compatible = areUnitsCompatible("count", "count"); // → true
const incompatible = areUnitsCompatible("count", "index"); // → false
```

**Unit Types:**

- `percentage` - %, percent, percent of GDP
- `index` - points, Index (2020=100), basis points
- `count` - persons, thousand, million, billion
- `currency-amount` - USD Million, EUR Billion
- `physical` - celsius, mm, GWh, BBL/D
- `rate` - per 1000 people, per capita
- `ratio` - times, ratio, debt to equity
- `duration` - days, years, months
- `unknown` - Unrecognized patterns

See [Unit Type Consistency Guide](./docs/guides/unit-type-consistency.md) for
details.

#### Scale Outlier Detection

```typescript
import { detectScaleOutliers } from "@tellimer/econify/quality";

const result = detectScaleOutliers(data, {
  clusterThreshold: 0.67, // 67% majority required
  magnitudeDifferenceThreshold: 2.0, // 100x difference
  includeDetails: true,
});

// Items with outlier warnings
result.data.forEach((item) => {
  const warning = item.explain?.qualityWarnings?.find(
    (w) => w.type === "scale-outlier",
  );
  if (warning) {
    console.log(`Outlier: ${item.id}`);
    console.log(`Magnitude: ${warning.context.itemMagnitude}`);
    console.log(`Difference: ${warning.context.magnitudeDifference} log units`);
  }
});
```

See [Scale Outlier Detection Guide](./docs/guides/scale-outlier-detection.md)
for details.

### Validation API

```typescript
import { validateEconomicData } from "@tellimer/econify";

// Validate before processing
const validation = await validateEconomicData(data, {
  requiredFields: ["value", "units", "indicator"],
});

if (!validation.isValid) {
  console.error("Validation errors:", validation.errors);
  validation.errors.forEach((error) => {
    console.log(`- Item ${error.itemIndex}: ${error.message}`);
  });
}
```

### Time Sampling API

```typescript
import { resampleTimeSeries } from "@tellimer/econify/time";

// Upsample or downsample time series
const resampled = resampleTimeSeries(timeSeries, "month", {
  method: "linear", // Interpolation method
  fillMissing: true, // Fill missing values
  preserveSeasonality: true,
});
```

**Resampling Methods:**

- `linear` - Linear interpolation
- `step` - Step function (last value carries forward)
- `average` - Average over period
- `sum` - Sum over period
- `end_of_period` - Use end value
- `start_of_period` - Use start value

See [Time Sampling Guide](./docs/guides/time-sampling.md) for details.

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

### Using Classification from @tellimer/classify

Econify accepts indicator classification from the
[@tellimer/classify](https://jsr.io/@tellimer/classify) package to make smart
normalization decisions:

```ts
import { processEconomicData } from "jsr:@tellimer/econify";

// Classification comes from @tellimer/classify package
const data = [
  {
    value: 100,
    unit: "USD Million",
    name: "GDP",
    indicator_type: "flow", // From classify package
    is_currency_denominated: true, // From classify package
  },
  {
    value: 12814,
    unit: "Persons",
    name: "Employed Persons",
    indicator_type: "stock", // From classify package
    is_currency_denominated: false, // From classify package
  },
];

const result = await processEconomicData(data, {
  targetCurrency: "USD",
  targetTimeScale: "month",
});

// GDP (flow): time normalization applied
// Employed Persons (stock): time normalization skipped (correct!)
```

**Note:** For indicator classification, use the
[@tellimer/classify](https://jsr.io/@tellimer/classify) package. Econify uses
the `indicator_type` field from classify to make normalization decisions.

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

### FX Rate Dates & Transparency

Include when each exchange rate was last updated for full transparency:

```ts
// From your SNP database - include dates for each rate
const fxFallback = {
  base: "USD",
  rates: {
    XOF: 558.16,
    EUR: 0.92,
    GBP: 0.79,
  },
  dates: {
    XOF: "2024-01-15T10:30:00Z", // When XOF rate was last updated
    EUR: "2024-01-15T09:45:00Z", // When EUR rate was last updated
    GBP: "2024-01-15T11:15:00Z", // When GBP rate was last updated
  },
};

const result = await processEconomicData(data, {
  targetCurrency: "USD",
  fxFallback,
  explain: true,
});

// The explain metadata will include the date for each FX conversion:
// {
//   "fx": {
//     "currency": "XOF",
//     "base": "USD",
//     "rate": 558.16,
//     "asOf": "2024-01-15T10:30:00Z",  // ← Date included!
//     "source": "fallback",
//     "sourceId": "SNP"
//   }
// }
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
- **Wages**: CAD/Hour, AUD/Week, CNY/Year (with work hours accuracy)
- **Custom**: Any domain-specific units you define

## 💼 Wages Data Normalization

### Problem Solved

Economic wage data often comes in incomparable formats:

**Before Normalization:**

```
CAN: 29.68 CAD/Hour
AUS: 1,432.6 AUD/Week
CHN: 124,110 CNY/Year
Value range: 29.68 to 124,110 (meaningless comparison)
```

**After Complete Pipeline:**

```
CAN: $15,931 USD/month
AUS: $4,084 USD/month
CHN: $1,427 USD/month
Value range: $1,427 - $15,931 USD/month (comparable!)
```

### Key Features

- **Work Hours vs Calendar Hours**: Hourly wages use 173.33 work hours/month,
  not 730 calendar hours
- **Mixed Frequency Handling**: Automatic conversion between hourly, weekly,
  monthly, yearly
- **Currency + Time Conversion**: Proper order (time first, then currency) for
  accuracy
- **Index Value Separation**: Distinguishes wage amounts from wage
  indices/points
- **Comprehensive Metadata**: Tracks all conversion steps and exclusion reasons

### Time Sampling Methods

| Method          | Use Case                 | Example                              |
| --------------- | ------------------------ | ------------------------------------ |
| `linear`        | Smooth wage progression  | Yearly salary → monthly estimates    |
| `average`       | Typical wage calculation | Daily wages → monthly average        |
| `sum`           | Total compensation       | Weekly pay → monthly total           |
| `step`          | Fixed wage periods       | Quarterly bonus → monthly allocation |
| `end_of_period` | Latest wage rate         | Use most recent wage data            |

## 💰 Wages Normalization with Explain Metadata

### Problem Solved

Minimum wages and other wage indicators now include comprehensive explain
metadata showing FX rates, conversion steps, and normalization details.
Previously, wages processing would complete successfully but return empty
explain metadata objects.

```ts
// Before: Empty explain metadata
{
  "normalized_value": 219.645293315143,
  "explain": {} // ❌ Empty!
}

// After: Complete explain metadata
{
  "normalized_value": 219.645293315143,
  "explain": {
    "currency": { "original": "ARS", "normalized": "USD" },
    "fx": { "rate": 0.000682, "source": "fallback" },
    "conversion": { "summary": "ARS/Month → USD/Month" }
  } // ✅ Complete!
}
```

### Key Features

- **FX Rate Details**: Shows exact exchange rates used in conversion
- **Source Tracking**: Indicates whether live or fallback rates were used
- **Conversion Summary**: Clear description of normalization steps
- **Consistent Metadata**: Same explain format as other economic indicators

## 🛠️ API Reference

### Core Types

```ts
type Scale =
  | "trillions"
  | "billions"
  | "millions"
  | "thousands"
  | "hundreds"
  | "ones";
type TimeScale = "year" | "quarter" | "month" | "week" | "day" | "hour";

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

## 🚀 Performance & Reliability

### Production Metrics

- **Test Coverage**: 459 comprehensive tests with 100% pass rate
- **Execution Speed**: Complete test suite runs in ~7 seconds
- **Memory Safety**: Zero memory leaks, proper async cleanup
- **Error Handling**: Robust error recovery with graceful degradation
- **Type Safety**: Full TypeScript coverage with strict mode
- **Code Quality**: Zero linting issues across 98 files with strict standards
- **Temporal Validation**: Dual validation with indicator_type and
  temporal_aggregation

### Performance Optimizations

- **Smart Caching**: Reduces redundant computations by up to 90% with TTL
  support
- **Parallel Processing**: Batch operations utilize all CPU cores efficiently
- **Streaming Support**: Process large datasets without memory issues
- **Optimized Parsing**: Unit detection in <1ms per operation
- **Lazy Loading**: Load only required modules on demand
- **Async Operations**: Proper timeout handling prevents hanging promises

## 🧪 Testing & Quality Assurance

### Comprehensive Test Suite

- **459 Tests**: Complete coverage across all modules and edge cases
- **100% Pass Rate**: All tests passing with zero failures
- **Fast Execution**: Full suite completes in ~7 seconds
- **Reliable**: No flaky tests, proper async handling
- **Temporal Aggregation Coverage**: All 6 temporal aggregation types tested
  across all pipeline paths

### Test Categories

- **Unit Tests**: Individual function and module testing
- **Integration Tests**: End-to-end workflow validation
- **Edge Case Tests**: Boundary conditions and error scenarios
- **Performance Tests**: Caching, memory usage, and speed validation
- **Quality Tests**: Data quality assessment validation
- **Indicator Type Tests**: Integration with @tellimer/classify indicator types
- **Temporal Aggregation Tests**: Comprehensive coverage of all 6
  temporal_aggregation types
- **Validation Tests**: Dual validation logic for indicator_type +
  temporal_aggregation compatibility

### Module Coverage

- ✅ **Normalization**: Unit value normalization with indicator type rules
- ✅ **Temporal Aggregation**: All 6 temporal_aggregation types with dual
  validation
- ✅ **Auto-Targeting**: Smart auto-targeting with indicator type awareness
- ✅ **Batch Processing**: Consistent multi-country normalization with
  temporal_aggregation support
- ✅ **Aggregations**: Statistical operations
- ✅ **Algebra**: Unit mathematics
- ✅ **Cache**: Smart caching system
- ✅ **Currency**: FX operations
- ✅ **Custom Units**: Domain-specific units
- ✅ **FX**: Live exchange rates
- ✅ **Inference**: Unit inference
- ✅ **Quality**: Data quality assessment
- ✅ **Wages**: Wages processing
- ✅ **Workflows**: Pipeline operations
- ✅ **All Other Modules**: 100% coverage

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

### 🚀 Getting Started

- **[Documentation Index](./docs/README.md)** - Complete documentation
  navigation
- **[Examples](./examples/README.md)** - Code examples for all features

### 📖 Guides

- **[Quality Controls](./docs/guides/quality-controls.md)** - **⭐ NEW**
  Comprehensive overview of data quality checks
- **[Unit Type Consistency](./docs/guides/unit-type-consistency.md)** - **⭐
  NEW** Detect semantic unit type mismatches
- **[Scale Outlier Detection](./docs/guides/scale-outlier-detection.md)** - **⭐
  NEW** Identify magnitude scale issues
- **[Batch Processing](./docs/guides/batch-processing.md)** - Process multiple
  indicators consistently
- **[Per-Indicator Normalization](./docs/guides/per-indicator-normalization.md)** -
  Understanding normalization strategies
- **[Special Handling](./docs/guides/special-handling.md)** - Override units for
  data quality issues
- **[Time Sampling](./docs/guides/time-sampling.md)** - Advanced time resampling
- **[Wages Processing](./docs/guides/wages-processing.md)** - Specialized wage
  data handling

### 📘 Reference

- **[Explain Metadata](./docs/reference/explain-metadata.md)** - Metadata
  structure reference
- **[Integration Brief](./docs/reference/integration-brief.md)** - Integration
  overview
- **[Implementation Instructions](./docs/reference/implementation-instructions.md)** -
  API implementation details

### 🔧 Development

- **[Test Coverage](./docs/development/test-coverage.md)** - Test coverage
  overview
- **[E2E Test Findings](./docs/development/e2e-test-findings.md)** - Test
  results and findings
- **[Known Data Issues](./docs/development/known-data-issues.md)** - Real-world
  data quality issues

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
working with economic data. **Production-ready with 459 comprehensive tests**
ensuring reliability and quality for mission-critical applications.

Special thanks to:

- The Deno team for an amazing runtime and excellent testing framework
- Financial data providers for API access and real-world data challenges
- The open-source community for inspiration and quality standards
- XState team for robust state management capabilities
- Contributors who helped achieve 100% test coverage

---

**Need help?** [Open an issue](https://github.com/Tellimer/open-source/issues)
or check our [examples](./examples).
