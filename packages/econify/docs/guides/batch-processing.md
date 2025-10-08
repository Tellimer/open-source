# Batch Processing API

The Econify package provides batch processing capabilities to ensure proper
normalization across all items of an indicator. This is critical when processing
data for multiple countries or regions that should be normalized to consistent
units.

**Smart Normalization with Classification**: Batch processing works best when you
provide `indicator_type` and `is_currency_denominated` fields from the
[@tellimer/classify](https://jsr.io/@tellimer/classify) package. These fields enable
intelligent decisions like skipping time normalization for stock indicators or
currency conversion for count indicators.

## The Problem

When processing economic indicators like "Balance of Trade" for multiple
countries, each country might report in different units across three dimensions:

### 1. Currency Differences

- USA: **USD** millions per month
- Germany: **EUR** millions per month
- Japan: **JPY** millions per month

### 2. Magnitude Differences

- USA: USD **millions** per month
- UK: GBP **thousands** per month (smaller scale)
- China: USD **billions** per month (larger scale)

### 3. Time Scale Differences

- USA: USD millions per **month**
- Germany: EUR millions per **quarter**
- Annual reports: USD millions per **year**

If you process each country individually, the auto-target normalization can't
determine the dominant time scale, magnitude, and currency across all countries.
This leads to inconsistent normalization where some countries might be in
millions while others are in billions, or some in monthly while others in
quarterly.

## The Solution: Batch Processing

Econify provides two approaches for batch processing:

### 1. EconifyBatchSession

A session-based API that accumulates data points and processes them together:

```typescript
import { EconifyBatchSession } from "econify";

// Create a session with your normalization options
const session = new EconifyBatchSession({
  targetCurrency: "USD",
  autoTargetByIndicator: true,
  autoTargetDimensions: ["magnitude", "time"],
  minMajorityShare: 0.6,
  tieBreakers: {
    magnitude: "prefer-millions",
    time: "prefer-month",
  },
  fxFallback: { base: "USD", rates: { EUR: 0.92, GBP: 0.79 } },
});

// Add data points for all countries
// Include indicator_type from @tellimer/classify for smart normalization
session.addDataPoint({
  id: "bot_usa",
  name: "Balance of Trade",
  value: 100,
  unit: "USD million/month",
  indicator_type: "flow", // From @tellimer/classify
  is_currency_denominated: true,
  metadata: { country: "USA" },
});

session.addDataPoint({
  id: "bot_germany",
  name: "Balance of Trade",
  value: 200,
  unit: "EUR million/quarter",
  indicator_type: "flow", // From @tellimer/classify
  is_currency_denominated: true,
  metadata: { country: "Germany" },
});

session.addDataPoint({
  id: "bot_japan",
  name: "Balance of Trade",
  value: -150,
  unit: "JPY billion/month",
  indicator_type: "flow", // From @tellimer/classify
  is_currency_denominated: true,
  metadata: { country: "Japan" },
});

// Process all countries together
const result = await session.process();

// All countries are now normalized consistently:
// - Currency: USD (as specified in targetCurrency)
// - Time: month (2 monthly vs 1 quarterly = 67% majority)
// - Magnitude: millions (2 millions vs 1 billion = 67% majority)
```

### 2. processEconomicDataByIndicator

A helper function that automatically groups data by indicator and processes each
group:

```typescript
import { processEconomicDataByIndicator } from "econify";

const data = [
  // Balance of Trade items (flow indicator)
  {
    id: "bot_usa",
    name: "Balance of Trade",
    value: 100,
    unit: "USD million/month",
    indicator_type: "flow", // From @tellimer/classify
    is_currency_denominated: true,
  },
  {
    id: "bot_uk",
    name: "Balance of Trade",
    value: 50,
    unit: "GBP million/month",
    indicator_type: "flow",
    is_currency_denominated: true,
  },
  {
    id: "bot_germany",
    name: "Balance of Trade",
    value: 200,
    unit: "EUR million/quarter",
    indicator_type: "flow",
    is_currency_denominated: true,
  },

  // GDP items (flow indicator)
  {
    id: "gdp_usa",
    name: "GDP",
    value: 25000,
    unit: "USD billion/year",
    indicator_type: "flow",
    is_currency_denominated: true,
  },
  {
    id: "gdp_uk",
    name: "GDP",
    value: 3100,
    unit: "GBP billion/year",
    indicator_type: "flow",
    is_currency_denominated: true,
  },
];

const result = await processEconomicDataByIndicator(data, {
  targetCurrency: "USD",
  autoTargetByIndicator: true,
  autoTargetDimensions: ["magnitude", "time"],
  fxFallback: { base: "USD", rates: { EUR: 0.92, GBP: 0.79 } },
});

// Each indicator group is normalized separately:
// - Balance of Trade → monthly (2/3 majority)
// - GDP → yearly (2/2 unanimous)
```

## Magnitude Normalization

The batch processing API handles magnitude normalization across all data points
to ensure consistency. Here's how it works:

### How Magnitude Selection Works

1. **Count Distribution**: The system counts how many data points use each
   magnitude:
   ```
   Example: 4 countries use "millions", 2 use "billions", 1 uses "thousands"
   ```

2. **Check for Majority**: If any magnitude has ≥ `minMajorityShare` (default
   60%), it's selected:
   ```
   millions: 4/7 = 57% (no majority)
   billions: 2/7 = 29%
   thousands: 1/7 = 14%
   ```

3. **Apply Tie-Breaker**: If no majority, use the configured tie-breaker:
   ```typescript
   tieBreakers: {
     magnitude: "prefer-millions"; // Falls back to millions
   }
   ```

4. **Convert All Values**: All data points are converted to the selected
   magnitude:
   ```
   50,000 thousands → 50 millions
   0.2 billions → 200 millions
   100 millions → 100 millions (unchanged)
   ```

### Real-World Example

```typescript
const session = new EconifyBatchSession({
  targetCurrency: "USD",
  autoTargetByIndicator: true,
  autoTargetDimensions: ["magnitude", "time", "currency"],
  minMajorityShare: 0.6,
  tieBreakers: {
    magnitude: "prefer-millions",
    time: "prefer-month",
    currency: "prefer-targetCurrency",
  },
});

// Countries reporting in different magnitudes
session.addDataPoint({
  id: "usa",
  name: "Balance of Trade",
  value: 100,
  unit: "USD million/month", // MILLIONS
});

session.addDataPoint({
  id: "uk",
  name: "Balance of Trade",
  value: 50000,
  unit: "GBP thousand/month", // THOUSANDS (= 50 million)
});

session.addDataPoint({
  id: "china",
  name: "Balance of Trade",
  value: 0.5,
  unit: "USD billion/month", // BILLIONS (= 500 million)
});

const result = await session.process();

// All normalized to millions:
// USA: 100 USD millions/month
// UK: 63.3 USD millions/month (50M GBP → USD)
// China: 500 USD millions/month (0.5B → 500M)
```

### Supported Magnitudes

The system recognizes and converts between:

- `ones` (no magnitude suffix, e.g., "USD")
- `hundreds`
- `thousands` (K)
- `millions` (M, MM)
- `billions` (B, Bn)
- `trillions` (T, Tn)

### Configuration Options

```typescript
{
  // Which dimensions to auto-normalize
  autoTargetDimensions: ['magnitude', 'time', 'currency'],
  
  // Minimum share for majority (0.5 = 50%, 0.6 = 60%)
  minMajorityShare: 0.6,
  
  // Fallback when no majority exists
  tieBreakers: {
    magnitude: "prefer-millions",     // or: "prefer-billions", "prefer-thousands"
    time: "prefer-month",            // or: "prefer-quarter", "prefer-year"
    currency: "prefer-targetCurrency" // or: "prefer-USD", "prefer-EUR"
  }
}
```

## Key Benefits

1. **Consistent Normalization**: All items of the same indicator are normalized
   to the same units
2. **Proper Auto-Targeting**: The dominant time scale and magnitude are computed
   across all items
3. **Indicator Grouping**: Automatically handles multiple indicators with
   different normalization needs
4. **Metadata Preservation**: Original country/region metadata is preserved
   through the pipeline

## API Reference

### EconifyBatchSession

#### Constructor

```typescript
new EconifyBatchSession(options: PipelineOptions)
```

#### Methods

- `addDataPoint(data: ParsedData): void` - Add a single data point to the batch
- `addDataPoints(data: ParsedData[]): void` - Add multiple data points
- `process(): Promise<PipelineResult>` - Process all accumulated data points
- `size(): number` - Get the current batch size
- `clear(): void` - Clear all data points without processing
- `previewAutoTargets(): Map<string, AutoTarget>` - Preview what auto-targets
  would be computed

### processEconomicDataByIndicator

```typescript
async function processEconomicDataByIndicator(
  data: ParsedData[],
  options: PipelineOptions,
): Promise<PipelineResult>;
```

Automatically groups data by indicator name and processes each group with proper
auto-targeting.

## Migration Guide

If your application currently processes countries individually:

### Before (Incorrect)

```typescript
// ❌ Processing countries one by one
for (const [countryISO, dataPoint] of Object.entries(indicator.countries)) {
  const result = await processEconomicData([dataPoint], options);
  // Each country processed in isolation - no cross-country normalization
}
```

### After (Correct)

```typescript
// ✅ Batch processing all countries together
const session = new EconifyBatchSession(options);

for (const [countryISO, dataPoint] of Object.entries(indicator.countries)) {
  session.addDataPoint({
    ...dataPoint,
    metadata: { countryISO },
  });
}

const result = await session.process();
// All countries normalized consistently
```

## Best Practices

1. **Always batch process indicators**: When you have multiple data points for
   the same indicator, process them together
2. **Use unique IDs**: Include country/region identifiers in the ID field to
   track results
3. **Preserve metadata**: Use the metadata field to store country, region, or
   other context
4. **Check batch size**: Use `session.size()` to verify all data points were
   added
5. **Preview targets**: Use `previewAutoTargets()` to debug normalization
   decisions

## Troubleshooting

### Mixed Indicators Warning

If you see "Mixed indicators in batch", you're adding different indicators to
the same session. Each session should process one indicator at a time.

### Inconsistent Normalization

If normalization is still inconsistent:

1. Check that all data points have the same indicator name (case-insensitive)
2. Verify `autoTargetByIndicator: true` is set
3. Use `previewAutoTargets()` to inspect the computed targets
4. Check the `minMajorityShare` threshold (default 0.6 = 60%)

### Performance

For large datasets (>1000 data points), consider:

- Increasing Node.js memory: `node --max-old-space-size=4096`
- Processing indicators in parallel using multiple sessions
- Using streaming APIs for very large datasets
