<p align="left">
  <a href="https://tellimer.com" target="_blank" rel="noopener">
    <img src="../../packages/countrify/assets/tellimer-logo.avif" width="400" alt="Tellimer" />
  </a>
</p>

# @tellimer/classify

LLM-powered economic indicator classification and metadata enrichment for
TypeScript/Deno. Automatically classify indicators as
stock/flow/count/percentage/index/ratio and enrich with currency denomination,
temporal aggregation, and heat map orientation using OpenAI, Anthropic, or
Google Gemini.

[![JSR Scope](https://jsr.io/badges/@tellimer)](https://jsr.io/@tellimer)

## Features

### Core Classification

- 🤖 **Multi-Provider LLM Support** — Use OpenAI, Anthropic Claude, or Google
  Gemini
- 📊 **Economic Indicator Classification** — 26 types across 7 categories
  (stock, flow, index, percentage, ratio, etc.)
- 🏷️ **Rich Metadata Enrichment** — Category, temporal aggregation, currency
  denomination, heat map orientation, confidence
- 🎯 **Time Series Validation** — Statistical analysis detects cumulative (YTD)
  patterns from actual data
- 🔄 **Batch Processing** — Efficiently process multiple indicators with
  automatic batching

### V2 Pipeline (Advanced)

- 🔁 **6-Stage Pipeline** — Router → Specialist → Validation → Orientation →
  Flagging → Review
- 🧠 **Context Passing** — Full reasoning chain passed between stages for
  improved accuracy
- 📈 **Statistical Time Series Analysis** — Detects Dec/Jan ratios, monotonic
  increase, year-boundary resets
- 🎯 **Type-Aware Filtering** — Only validates indicator types that can be
  cumulative (94% reduction in analysis)
- 🗄️ **SQLite Database** — Structured storage with queryable results and
  validation evidence
- ✅ **100% Test Accuracy** — Validated on 100 real economic indicators

### Reliability & Performance

- 🔗 **ID-Based Pairing** — Automatic indicator ID generation and response
  pairing
- 🔁 **Individual Retry Logic** — Failed indicators retried up to 3 times with
  exponential backoff
- 📊 **Comprehensive Statistics** — Detailed tracking with retry counts and
  processing time
- 🛡️ **Robust Error Handling** — Graceful degradation with detailed error
  messages
- 💪 **Full TypeScript Support** — Complete type definitions for all APIs
- ⚡ **Modern Runtime Support** — Deno, Node.js, Bun, and Cloudflare Workers

## Installation

```bash
deno add @tellimer/classify
```

Or import directly:

```ts
import { classifyIndicators } from "jsr:@tellimer/classify";
```

## Quick Start

```typescript
import { classifyIndicators } from "@tellimer/classify";

const indicators = [
  {
    name: "Gross Domestic Product",
    units: "USD billions",
    currency_code: "USD",
    periodicity: "quarterly",
    source: "World Bank",
    sample_values: [21000, 21500, 22000],
  },
  {
    name: "Unemployment Rate",
    units: "%",
    periodicity: "monthly",
    source: "Bureau of Labor Statistics",
    sample_values: [3.5, 3.6, 3.7],
  },
];

const config = {
  provider: "openai",
  apiKey: "your-openai-api-key",
  model: "gpt-4o", // optional, defaults to latest reasoning model
};

const enriched = await classifyIndicators(indicators, config);

console.log(enriched[0].classification);
// {
//   indicator_category: "physical-fundamental",
//   indicator_type: "flow",
//   temporal_aggregation: "period-rate",
//   is_currency_denominated: true,
//   heat_map_orientation: "higher-is-positive",
//   confidence: 0.95
// }

console.log(enriched[1].classification);
// {
//   indicator_category: "numeric-measurement",
//   indicator_type: "percentage",
//   temporal_aggregation: "not-applicable",
//   is_currency_denominated: false,
//   heat_map_orientation: "lower-is-positive",
//   confidence: 0.98
// }
```

## Supported LLM Providers

### OpenAI

```typescript
import { classifyIndicators } from "@tellimer/classify";

const config = {
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o", // or "gpt-4o-mini", "gpt-4-turbo"
  temperature: 0.1,
  maxTokens: 2000,
};

const enriched = await classifyIndicators(indicators, config);
```

### Anthropic Claude

```typescript
import { classifyIndicators } from "@tellimer/classify";

const config = {
  provider: "anthropic",
  apiKey: "sk-ant-...",
  model: "claude-3-5-sonnet-20241022", // or "claude-3-opus-20240229"
  temperature: 0.1,
  maxTokens: 2000,
};

const enriched = await classifyIndicators(indicators, config);
```

### Google Gemini

```typescript
import { classifyIndicators } from "@tellimer/classify";

const config = {
  provider: "gemini",
  apiKey: "AIza...",
  model: "gemini-2.0-flash-thinking-exp-01-21", // or "gemini-1.5-pro"
  temperature: 0.1,
  maxTokens: 2000,
};

const enriched = await classifyIndicators(indicators, config);
```

## Advanced Usage

### Batch Processing with Options

```typescript
import { classifyIndicatorsWithOptions } from "@tellimer/classify";

const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: {
    provider: "anthropic",
    apiKey: "your-api-key",
  },
  batchSize: 5, // Process 5 indicators per API call
  includeReasoning: true, // Include LLM reasoning in response
  maxRetries: 3, // Retry failed requests up to 3 times
  retryDelay: 1000, // Wait 1 second between retries
  debug: true, // Enable debug logging
});

// Comprehensive statistics
console.log(`Total indicators: ${result.summary.total}`);
console.log(`Successfully classified: ${result.summary.successful}`);
console.log(`Failed: ${result.summary.failed}`);
console.log(`Success rate: ${result.summary.successRate.toFixed(1)}%`);
console.log(`Processing time: ${result.processingTime}ms`);
console.log(`API calls made: ${result.apiCalls}`);
console.log(`Retries performed: ${result.retries}`);

// Handle failures with retry information
for (const failure of result.failed) {
  console.error(
    `Failed to classify ${failure.indicator.name}: ${failure.error} (after ${failure.retries} retries)`,
  );
}
```

### Single Indicator Classification

```typescript
import { classifyIndicator } from "@tellimer/classify";

const indicator = {
  name: "Consumer Price Index",
  units: "Index (2015=100)",
  periodicity: "monthly",
  sample_values: [100, 102, 104],
};

const enriched = await classifyIndicator(indicator, {
  provider: "gemini",
  apiKey: "your-api-key",
});

console.log(enriched.classification.indicator_type); // "index"
```

### With Reasoning

```typescript
const enriched = await classifyIndicators(indicators, {
  provider: "openai",
  apiKey: "your-api-key",
  includeReasoning: true,
});

console.log(enriched[0].classification.reasoning);
// "This is a flow indicator because GDP measures economic output over a period..."
```

### ID-Based Pairing and Retry Logic

The package automatically ensures reliable pairing between requests and
responses:

```typescript
// Indicators automatically get unique IDs
const indicators = [
  { name: "GDP", units: "USD billions" },
  { name: "Unemployment Rate", units: "%" },
];

const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: { provider: "openai", apiKey: "..." },
  maxRetries: 3, // Each failed indicator retried up to 3 times
  debug: true, // See detailed progress
});

// Each enriched indicator has matching ID
console.log(result.enriched[0].id); // "ind_1_1234567890_abc123"
console.log(result.enriched[0].classification.indicator_id); // Same ID

// Or provide your own IDs
const customIndicators = [
  { id: "gdp_2024", name: "GDP", units: "USD billions" },
  { id: "unemp_2024", name: "Unemployment Rate", units: "%" },
];
```

**Key Features:**

- ✅ Automatic unique ID generation (or use your own)
- ✅ LLM responses validated to include matching IDs
- ✅ Order-independent pairing (responses can be in any order)
- ✅ Individual indicator retry (up to 3 times with exponential backoff)
- ✅ Batch processing with fallback to individual retries
- ✅ Detailed error tracking per indicator

See [Pairing and Retry Logic](./docs/PAIRING_AND_RETRY.md) for complete
documentation.

## V2 Pipeline - Advanced Multi-Stage Classification

The V2 pipeline provides production-grade classification with 6 specialized
stages, context passing, and time series validation:

```typescript
import { classifyV2 } from "@tellimer/classify/v2";

const results = await classifyV2(indicators, {
  llmConfig: {
    provider: "anthropic",
    apiKey: "your-api-key",
    model: "claude-sonnet-4-5-20250929",
  },
  db: "./classify.db", // SQLite database path
  debug: true,
});

// 6-stage pipeline:
// 1. Router: Assign indicator to family (7 families)
// 2. Specialist: Family-specific classification with expert prompts
// 3. Validation: Statistical time series analysis for cumulative patterns
// 4. Orientation: Heat map orientation (higher/lower is positive)
// 5. Flagging: Rule-based quality checks (low confidence, mismatches)
// 6. Review: LLM corrects flagged indicators

console.log(results.summary);
// {
//   total: 100,
//   successful: 100,
//   validated: 6,  // 6 indicators analyzed for cumulative patterns
//   flagged: 0,
//   reviewed: 0,
//   successRate: 100
// }
```

### V2 Features

**🔁 Context Passing**: Each stage receives full reasoning from previous stages

```typescript
// Stage 2 (Specialist) receives Stage 1 (Router) reasoning:
{
  router_family: "physical-fundamental",
  router_reasoning: "GDP measures economic output over a period (flow)",
  router_confidence: 0.95
}
```

**📈 Time Series Validation**: Statistical detection of cumulative (YTD)
patterns

```typescript
// Validation results stored in database:
{
  is_cumulative: true,
  cumulative_confidence: 0.92,
  has_seasonal_reset: true,
  dec_jan_ratio: 12.6,  // December is 12.6x January (typical of YTD)
  validation_reasoning: "Strong evidence: Dec/Jan ratio 12.6, monotonic increase 100%, resets at year boundary"
}
```

**🎯 Type-Aware Filtering**: Only analyzes types that CAN be cumulative

- ✅ Analyzed: flow, volume, balance, count (e.g., "GDP YTD", "Exports YTD")
- ⏭️ Skipped: index, percentage, price, ratio, rate, stock (94% reduction)

**🗄️ Database Storage**: Queryable SQLite database with full audit trail

```sql
SELECT * FROM validation_results
WHERE is_cumulative = 1 AND cumulative_confidence > 0.9;
```

## Documentation

Complete documentation is organized in the `/docs` directory:

- **[Documentation Index](./docs/README.md)** - Complete documentation guide
- **[Quick Start](./docs/QUICK_START.md)** - Get started in 5 minutes
- **[V1 Pipeline](./docs/v1/README.md)** - Default single-pass pipeline
- **[V2 Pipeline](./docs/v2/README.md)** - Advanced multi-stage pipeline ⭐
- **[V1 to V2 Migration](./docs/MIGRATION.md)** - Upgrade guide

### V2 Pipeline Documentation

- **[V2 Architecture](./docs/v2/ARCHITECTURE.md)** - 6-stage pipeline design
- **[Database Setup](./docs/v2/DATABASE.md)** - SQLite schema and queries
- **[AI SDK Integration](./docs/v2/AI_SDK.md)** - Type-safe structured output
- **[Time Series Validation](./docs/TIME_SERIES_VALIDATION_SUMMARY.md)** -
  Statistical cumulative detection

### Key Documentation

- [Type Validation](./docs/TYPE_VALIDATION.md) - Understanding indicator types
- [Prompt Engineering](./docs/PROMPT_ENGINEERING.md) - How LLM prompts work
- [Testing Guide](./docs/TESTING_GUIDE.md) - Running and adding tests
- [Cost Tracking](./docs/COST_TRACKING.md) - Detailed cost estimation
- [Quick Cost Guide](./docs/QUICK_COST_GUIDE.md) - Fast cost lookup
- [Performance Benchmarks](./docs/BENCHMARKING.md) - Performance analysis

## API Reference

### Types

#### `Indicator`

Input indicator object with existing metadata:

```typescript
interface Indicator {
  id?: string; // Optional unique ID (auto-generated if not provided)
  name: string;
  units?: string;
  currency_code?: string;
  periodicity?: string;
  source?: string;
  description?: string;
  sample_values?: number[];
  [key: string]: unknown;
}
```

#### `ClassifiedMetadata`

LLM-classified metadata:

```typescript
type IndicatorCategory =
  | "physical-fundamental"
  | "numeric-measurement"
  | "price-value"
  | "change-movement"
  | "composite-derived"
  | "temporal"
  | "qualitative"
  | "other";

type IndicatorType =
  // Physical/Fundamental
  | "stock"
  | "flow"
  | "balance"
  | "capacity"
  | "volume"
  // Numeric/Measurement
  | "count"
  | "percentage"
  | "ratio"
  | "spread"
  | "share"
  // Price/Value
  | "price"
  | "yield"
  // Change/Movement
  | "rate"
  | "volatility"
  | "gap"
  // Composite/Derived
  | "index"
  | "correlation"
  | "elasticity"
  | "multiplier"
  // Temporal
  | "duration"
  | "probability"
  | "threshold"
  // Qualitative
  | "sentiment"
  | "allocation"
  // Fallback
  | "other";

type TemporalAggregation =
  | "point-in-time" // Snapshot at a moment
  | "period-rate" // Rate/flow during period
  | "period-cumulative" // Running total over period
  | "period-average" // Average over period
  | "period-total" // Sum over period
  | "not-applicable"; // No temporal dimension

interface ClassifiedMetadata {
  indicator_id: string; // Matches the indicator's ID
  indicator_category: IndicatorCategory;
  indicator_type: IndicatorType;
  temporal_aggregation: TemporalAggregation;
  is_currency_denominated: boolean; // Whether values are in currency units
  heat_map_orientation: "higher-is-positive" | "lower-is-positive" | "neutral";
  confidence?: number; // 0-1
  reasoning?: string;
  [key: string]: unknown;
}
```

#### `EnrichedIndicator`

Indicator with classification:

```typescript
interface EnrichedIndicator extends Indicator {
  classification: ClassifiedMetadata;
}
```

#### `LLMConfig`

LLM provider configuration:

```typescript
interface LLMConfig {
  provider: "openai" | "anthropic" | "gemini";
  apiKey: string;
  model?: string;
  temperature?: number; // 0-1, default: 0.1
  maxTokens?: number; // default: 2000
  timeout?: number; // milliseconds, default: 30000
  [key: string]: unknown;
}
```

### Functions

#### `classifyIndicators(indicators, config)`

Classify multiple indicators.

- **Parameters:**
  - `indicators: Indicator[]` - Array of indicators to classify
  - `config: LLMConfig` - LLM configuration
- **Returns:** `Promise<EnrichedIndicator[]>`

#### `classifyIndicator(indicator, config)`

Classify a single indicator.

- **Parameters:**
  - `indicator: Indicator` - Indicator to classify
  - `config: LLMConfig` - LLM configuration
- **Returns:** `Promise<EnrichedIndicator>`

#### `classifyIndicatorsWithOptions(indicators, options)`

Classify with advanced options including batching and error handling.

- **Parameters:**
  - `indicators: Indicator[]` - Array of indicators to classify
  - `options: ClassificationOptions` - Classification options
- **Returns:** `Promise<ClassificationResult>`

#### `ClassificationResult`

Result with comprehensive statistics:

```typescript
interface FailedIndicator {
  indicator: Indicator;
  error: string;
  retries: number; // Number of retry attempts made
}

interface ClassificationResult {
  enriched: EnrichedIndicator[];
  failed: FailedIndicator[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    successRate: number; // Percentage (0-100)
  };
  processingTime: number; // Milliseconds
  apiCalls: number;
  retries: number; // Total retries performed
}
```

## Indicator Types

The classifier uses a comprehensive taxonomy with 26 indicator types organized
into 7 categories:

### Physical/Fundamental

- **stock**: Absolute levels at a point in time (government debt, foreign
  reserves, population, wealth)
- **flow**: Throughput over a period (GDP, income, exports, spending,
  production)
- **balance**: Net positions that can be negative (trade balance, budget
  deficit/surplus, current account)
- **capacity**: Maximum potential (potential GDP, production capacity, labor
  force)
- **volume**: Transaction quantities (contract volumes, trade volumes,
  transaction counts)

### Numeric/Measurement

- **count**: Discrete units (number of jobs, housing starts, unemployment
  claims, bankruptcies)
- **percentage**: 0-100% bounded values (unemployment rate, capacity
  utilization, tax rate)
- **ratio**: Relative multiples (debt-to-GDP, price-to-earnings, loan-to-value)
- **spread**: Absolute differences (yield curve spread, bid-ask spread, interest
  rate differential)
- **share**: Compositional breakdown (labor share of income, consumption % of
  GDP, market share)

### Price/Value

- **price**: Market-clearing levels (interest rates, exchange rates, commodity
  prices, asset prices)
- **yield**: Returns/efficiency (bond yields, dividend yield, productivity, ROI)

### Change/Movement

- **rate**: Directional change over time (inflation rate, growth rate, change in
  unemployment)
- **volatility**: Statistical dispersion (VIX, price volatility, earnings
  volatility)
- **gap**: Deviation from potential/trend (output gap, unemployment gap,
  inflation gap)

### Composite/Derived

- **index**: Composite indicators (CPI, PMI, consumer confidence index, stock
  market index)
- **correlation**: Relationship strength (Phillips curve coefficient, beta)
- **elasticity**: Responsiveness measures (price elasticity of demand, income
  elasticity)
- **multiplier**: Causal transmission coefficients (fiscal multiplier, money
  multiplier, velocity)

### Temporal

- **duration**: Time-based measures (unemployment duration, bond duration,
  average tenure)
- **probability**: Statistical likelihood (recession probability, default
  probability, forecast probability)
- **threshold**: Critical levels/targets (inflation target, debt ceiling,
  reserve requirement)

### Qualitative

- **sentiment**: Categorical/ordinal measures (consumer confidence, business
  sentiment, credit rating)
- **allocation**: Portfolio/resource composition (asset allocation, budget
  allocation, sector weights)

### Fallback

- **other**: Only if none of the above categories apply

### Classification Decision Tree

The LLM uses this decision tree to ensure accurate classification:

1. Can the value be negative (deficit/surplus)? → **balance**
2. Is it a causal transmission coefficient? → **multiplier**
3. Is it deviation from trend/potential? → **gap**
4. Is it a policy target or critical limit? → **threshold**
5. Is it part of a closed budget/identity? → **share**
6. Is it a composite of multiple indicators? → **index**
7. Is it bounded between 0-100%? → **percentage**
8. Is it a discrete count? → **count**
9. Is it an absolute level at a point in time? → **stock**
10. Is it measured over a period? → **flow**
11. Otherwise, choose the most appropriate category or **other**

## Temporal Aggregation

The classifier determines how indicator values aggregate over time:

- **point-in-time**: Snapshot at a specific moment
  - Examples: Stock level (414.8M barrels right now), current price, population
    today
  - Characteristic: Single value at a moment, not accumulated

- **period-rate**: Rate or flow during a period
  - Examples: GDP per quarter, production rate (13.4M bpd), monthly income
  - Characteristic: Throughput or rate measured over time

- **period-cumulative**: Running total accumulated over a period
  - Examples: YTD production (4.89B barrels so far), cumulative sales this year
  - Characteristic: Sum that grows throughout the period

- **period-average**: Average calculated over a period
  - Examples: Average temperature this month, average price this quarter
  - Characteristic: Mean value across the period

- **period-total**: Sum of discrete events in a period
  - Examples: Total transactions this week, daily contract volume (450k
    contracts)
  - Characteristic: Count or sum of distinct occurrences

- **not-applicable**: No temporal dimension
  - Examples: Ratios (debt-to-GDP), percentages, correlations
  - Characteristic: Derived values without time accumulation

### Key Distinctions

- **Stock (point-in-time) ≠ Cumulative (period-cumulative)**
  - Inventory level vs YTD production

- **Flow (period-rate) ≠ Cumulative (period-cumulative)**
  - Production rate vs accumulated production

- **Volume (period-total) ≠ Cumulative (period-cumulative)**
  - Daily transactions vs YTD transaction count

## Heat Map Orientation

The classifier determines whether higher or lower values are considered positive
for visualization purposes:

- **higher-is-positive**: Higher values are better (e.g., GDP growth,
  employment, exports, productivity)
- **lower-is-positive**: Lower values are better (e.g., unemployment rate,
  inflation rate, debt levels, poverty rate)
- **neutral**: Neither direction is inherently positive (e.g., exchange rates,
  interest rates in some contexts, population)

This helps with:

- Color coding in heat maps (green for positive, red for negative)
- Trend visualization (up arrows for improvements, down arrows for
  deterioration)
- Dashboard design and data presentation
- Automatic alert thresholds

## Error Handling

The package includes robust error handling:

```typescript
import { ClassificationError } from "@tellimer/classify";

try {
  const enriched = await classifyIndicators(indicators, config);
} catch (error) {
  if (error instanceof ClassificationError) {
    console.error(`Provider: ${error.provider}`);
    console.error(`Message: ${error.message}`);
    console.error(`Cause:`, error.cause);
  }
}
```

## Testing

The package includes comprehensive unit and integration tests using real
economic indicator data covering all 26 indicator types across 7 categories.

### Running Tests

```bash
# Create .env file with API keys (optional - tests will skip providers without keys)
echo 'GEMINI_API_KEY=your-key-here' > .env

# Run all tests (unit + integration)
deno task test

# Run only unit tests (no API calls, fast)
deno task test:unit

# Run only integration tests (requires API keys)
deno task test:int

# Run dry run tests (no API calls, cost estimation)
deno task test:dry

# Run tests in watch mode
deno task test:watch

# Run tests with coverage
deno task test:cov
```

**Note:** Integration tests automatically skip providers without API keys. Use
Gemini 2.5 Flash (free tier) to avoid costs.

**Integration test costs** (33 indicators):

- Gemini 2.5 Flash: **Free**
- GPT-4o-mini: **$0.01**
- GPT-4o: **$0.09**
- Claude 3.5 Sonnet: **$0.12**

### Test Coverage

The test suite includes:

- **Schema Validation** (95%+ pass rate target)
  - All required fields present
  - Correct field types
  - Valid enum values
  - ID matching
  - Category-type consistency

- **Classification Accuracy** (85%+ accuracy target)
  - Comparison against ground truth
  - Per-field accuracy tracking
  - Mismatch analysis with reasoning

- **Test Fixtures**
  - 20+ real economic indicators
  - 12-24+ data points per indicator
  - Temporal data format (date/value pairs)
  - Expected classifications (ground truth)
  - Coverage of all 26 indicator types

### Test Fixtures

Test fixtures are located in `tests/fixtures/` and include real economic
indicators:

- `physical_fundamental.json` - Stock, flow, balance, capacity, volume
- `numeric_measurement.json` - Count, percentage, ratio, spread, share
- `price_value.json` - Price, yield
- `change_movement.json` - Rate, volatility, gap
- `composite_derived.json` - Index, correlation, elasticity, multiplier
- `temporal.json` - Duration, probability, threshold
- `qualitative.json` - Sentiment, allocation
- `edge_cases.json` - Ambiguous indicators and boundary conditions

Each fixture includes indicator metadata, time series data, and expected
classifications for validation.

**Edge Cases** test challenging scenarios:

- Indicators that don't fit standard categories (happiness index, climate risk)
- Ambiguous classifications (capacity utilization %, share vs percentage)
- Boundary conditions (P/E ratio, growth rates, tax rates as thresholds)
- Unusual units (forex reserves in "months of imports")

### Adding New Test Cases

1. Add indicator data to appropriate fixture file in `tests/fixtures/`
2. Include expected classification (ground truth)
3. Ensure 12-24+ data points for temporal pattern detection
4. Run tests to validate

See `tests/README.md` for detailed testing documentation.

## License

MIT

## Contributing

Contributions are welcome! Please see the
[main repository](https://github.com/Tellimer/open-source) for contribution
guidelines.
