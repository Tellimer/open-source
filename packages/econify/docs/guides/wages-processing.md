# Wages Data Processing Guide

## 🎯 Problem Solved

Econify's unified pipeline automatically handles wages data normalization
issues:

**Before:**

- Value range: 29.68 to 7,473,636 (meaningless comparison)
- Mixed units: ALL/Month, ARS/Month, CAD/Hour, CNY/Year, points
- Mixed time scales: Hourly, Monthly, Yearly
- Mixed data types: Currency amounts vs index values
- Incomparable data across countries

**After:**

- Value range: $1,427 - $82,209 USD/month (meaningful comparison)
- Consistent units: All in USD/month
- Comparable wage data across countries
- Proper handling of different data types

## 🚀 Simple Integration

### Unified Pipeline (Recommended)

The econify pipeline **automatically detects and processes wages data** - no
special handling needed!

```typescript
import { processEconomicDataByIndicator } from "@tellimer/econify";

const result = await processEconomicDataByIndicator(wagesData, {
  targetCurrency: "USD",
  targetMagnitude: "ones",
  targetTimeScale: "month",
  autoTargetByIndicator: true,
  indicatorKey: "name",
  explain: true,
});

// ✅ Wages automatically normalized to USD/month
console.log(result.data[0].normalizedUnit); // "USD per month"
```

### With FX Rates (For Currency Conversion)

```typescript
import { processEconomicDataByIndicator } from "@tellimer/econify";

const result = await processEconomicDataByIndicator(wagesData, {
  targetCurrency: "USD",
  targetMagnitude: "ones",
  targetTimeScale: "month",
  autoTargetByIndicator: true,
  indicatorKey: "name",
  fxRates: {
    EUR: 1.1,
    GBP: 1.3,
    JPY: 0.0067,
    // ... other rates
  },
  explain: true,
});
```

## How It Works

The wages service automatically:

1. **Detects Wages Data**: Identifies wage indicators by name patterns
2. **Separates Data Types**: Distinguishes currency-based wages from index
   values
3. **Normalizes Currency Values**: Converts all to target currency and time
   scale
4. **Handles Index Values**: Keeps them separate (can't be meaningfully
   converted)
5. **Provides Statistics**: Summary of normalization results

## Solution Details

### 1. Data Type Separation

The system distinguishes between:

- **Currency-based wages**: AMD/Month, AUD/Week, CAD/Hour, CNY/Year
- **Index values**: Points, index numbers (excluded from currency normalization)

### 2. Currency Normalization

When FX rates are provided:

- Converts all currency values to target currency (e.g., USD)
- Applies appropriate exchange rates
- Maintains time scale information

### 3. Time Scale Conversion

Handles different reporting periods:

- **Hourly** → Monthly (×160 hours/month)
- **Weekly** → Monthly (×4.33 weeks/month)
- **Monthly** → No conversion needed
- **Yearly** → Monthly (÷12 months/year)

### 4. Statistics & Explain Metadata

Provides detailed information about the normalization:

```typescript
{
  explain: {
    mode: "wages-specialized",
    currency: {
      original: "EUR",
      normalized: "USD",
      fxRate: 1.1
    },
    scale: {
      original: "ones",
      normalized: "ones"
    },
    periodicity: {
      original: "month",
      normalized: "month"
    }
  }
}
```

## Advanced Usage

### Direct Wages Service (For Custom Workflows)

If you need more control, you can use the wages service directly:

```typescript
import { processWagesData } from "@tellimer/econify/wages";

const result = await processWagesData(wagesData, {
  targetCurrency: "USD",
  targetTimeScale: "month",
  fxRates: {
    EUR: 1.1,
    GBP: 1.3,
    // ...
  },
});

console.log(result.comparable); // Currency-based wages in USD/month
console.log(result.indexValues); // Index values (kept separate)
console.log(result.stats); // Normalization statistics
```

## Common Patterns

### Pattern 1: Auto-Targeting with Wages

```typescript
const result = await processEconomicDataByIndicator(data, {
  autoTargetByIndicator: true,
  autoTargetDimensions: ["currency", "magnitude", "time"],
  indicatorKey: "name",
  fxRates: myFxRates,
});
```

### Pattern 2: Explicit Targeting

```typescript
const result = await processEconomicDataByIndicator(data, {
  targetCurrency: "USD",
  targetMagnitude: "ones",
  targetTimeScale: "month",
  indicatorKey: "name",
  fxRates: myFxRates,
});
```

### Pattern 3: Without FX Rates (Time Scale Only)

```typescript
const result = await processEconomicDataByIndicator(data, {
  targetTimeScale: "month",
  indicatorKey: "name",
  // No fxRates - will only convert time scales
});
```

## Troubleshooting

### Issue: Wages not being normalized

**Solution**: Ensure your indicator names match the wages patterns:

- "Wages in Manufacturing"
- "Average Wage"
- "Minimum Wage"
- "Hourly Wage"
- etc.

### Issue: Currency conversion not working

**Solution**: Provide FX rates in the options:

```typescript
{
  fxRates: {
    EUR: 1.1,
    GBP: 1.3,
    // ... all currencies in your data
  }
}
```

### Issue: Time scale conversion incorrect

**Solution**: Ensure your data has proper time scale information:

- In the unit string: "EUR/Month", "USD/Hour"
- Or in metadata: `periodicity: "Monthly"`

## Examples

See the [wages processing example](../../examples/wages_processing_example.ts)
for a complete working example.

## Related Documentation

- [Batch Processing Guide](./batch-processing.md)
- [Time Sampling Guide](./time-sampling.md)
- [Explain Metadata Reference](../reference/explain-metadata.md)
