# Wages Data Normalization

This module provides specialized normalization for wages data that handles mixed
unit types commonly found in economic indicators like "Wages in Manufacturing".

## Problem Solved

The original wages data had several issues making it incomparable:

- **Mixed Units**: AMD/Month, AUD/Week, CAD/Hour, CNY/Year, points, etc.
- **Huge Value Range**: 4.1 to 5,582,097 (meaningless for comparison)
- **Mixed Data Types**: Currency amounts vs index values
- **Different Time Scales**: Hourly, weekly, monthly, yearly reporting

## Solution

The `normalizeWagesData()` function:

1. **Separates Data Types**: Distinguishes currency-based wages from index
   values
2. **Normalizes Currency Values**: Converts all to USD/month for comparison
3. **Handles Index Values**: Keeps them separate since they can't be
   meaningfully converted
4. **Provides Statistics**: Summary of normalization results

## Usage

```typescript
import {
  getComparableWagesData,
  normalizeWagesData,
} from "./wages-normalization.ts";
import type { FXTable } from "../types.ts";

// Your FX rates
const fx: FXTable = {
  base: "USD",
  rates: {
    EUR: 0.92,
    AMD: 387.5,
    AUD: 1.52,
    CAD: 1.36,
    // ... other currencies
  },
};

// Convert your wages data format
const wagePoints = Object.entries(wagesData.countries).map((
  [country, data],
) => ({
  country,
  value: parseFloat(data.value),
  unit: data.tooltip?.units || "unknown",
  currency: data.tooltip?.currency,
  date: data.date,
}));

// Normalize the data
const results = normalizeWagesData(wagePoints, {
  targetCurrency: "USD",
  targetTimeScale: "month",
  fx,
  excludeIndexValues: false,
});

// Get only comparable currency-based data
const comparable = getComparableWagesData(results);
```

## Results

**Before Normalization:**

- Value range: 4.1 to 5,582,097
- Mixed units: AMD/Month, AUD/Week, points, CAD/Hour
- Mixed currencies: CAD, AUD, CNY, EUR, etc.
- Mixed time periods: Hour, Week, Month, Year

**After Complete Pipeline (Time + Currency):**

- Comparable range: $1,427 - $15,931 USD/month
- Single currency: USD
- Single time period: Month
- Work hours vs calendar hours handled correctly
- Index values handled separately

## Example Output

```
✅ Complete Pipeline Results (Time + Currency Conversion):
4 countries with comparable monthly wages in USD:
  CAN: $15,931 USD/month (was 29.68 CAD/Hour → work hours conversion)
  AUS: $4,084 USD/month (was 1432.6 AUD/Week → 4.33 weeks/month)
  EUR: $3,478 USD/month (was 3200 EUR/Month → currency only)
  CHN: $1,427 USD/month (was 124110 CNY/Year → ÷12 months)

📊 Index-based Wage Data (not directly comparable):
  AUT: 132.1 points
  BEL: 114.4 points
```

## Integration Options

### Option 1: Pre-process wages data

```typescript
// Before sending to frontend
if (indicatorId === "WAGES_IN_MANUFACTURING") {
  const normalizedWages = normalizeWagesData(rawData, {
    fx,
    targetCurrency: "USD",
  });
  const comparableData = getComparableWagesData(normalizedWages);
  // Use comparableData for visualization
}
```

### Option 2: Add to pipeline

```typescript
// In your data processing pipeline
const wageNormalizer = createBatchProcessor({
  toCurrency: "USD",
  toTimeScale: "month",
  fx: fxRates,
});
```

### Option 3: Frontend handling

```typescript
// In frontend, detect wages data and apply normalization
if (indicator.indicator_id === "WAGES_IN_MANUFACTURING") {
  const normalized = await normalizeWagesData(indicator.countries);
  // Display normalized data with proper context
}
```

## Files

- `wages-normalization.ts` - Main normalization functions
- `wages-normalization_test.ts` - Comprehensive tests
- `example-usage.ts` - Working example with your data format
- `README.md` - This documentation

## Benefits

1. **Comparable Data**: All currency wages in same unit (USD/month)
2. **Proper Handling**: Index values kept separate, not mixed with currency
3. **Transparency**: Clear indication of what was normalized vs excluded
4. **Flexibility**: Can target different currencies and time scales
5. **Robust**: Handles errors gracefully with detailed reporting
