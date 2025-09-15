# Wages Data Processing Guide

## 🎯 Problem Solved

Econify's unified pipeline automatically handles wages data normalization
issues:

**Before:**

- Value range: 29.68 to 7,473,636 (meaningless comparison)
- Mixed units: ALL/Month, ARS/Month, CAD/Hour, CNY/Year
- Mixed time scales: Hourly, Monthly, Yearly
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
import { processEconomicData } from "econify";

async function processIndicators(data: any[]) {
  // The pipeline automatically:
  // ✅ Detects wages data
  // ✅ Handles mixed time scales
  // ✅ Converts currencies
  // ✅ Excludes index values
  // ✅ Uses appropriate magnitude (ones, not millions)

  const result = await processEconomicData(data, {
    targetCurrency: "USD",
    targetTimeScale: "month",
    excludeIndexValues: true, // Skip non-currency data like "points"
    exemptions: {
      categoryGroups: ["IMF WEO"], // Skip specific categories
      indicatorNames: ["Index"]    // Skip index data
    }
  });

  return result.data; // Normalized, comparable data
}
  );
}
```

### Real-World Examples

#### Example 1: Mixed Wages Data

```typescript
const wagesData = [
  {
    id: "ARG",
    name: "Argentina Minimum Wage",
    value: 1674890.753,
    unit: "ARS/Month",
  },
  {
    id: "USA",
    name: "US Federal Minimum Wage",
    value: 7.25,
    unit: "USD/hour",
  },
  {
    id: "CRI",
    name: "Costa Rica Wage Index",
    value: 6225.77,
    unit: "points", // Will be excluded automatically
  },
];

const result = await processEconomicData(wagesData, {
  targetCurrency: "USD",
  targetTimeScale: "month",
  excludeIndexValues: true,
});

// Result: All wages normalized to USD/month, index excluded
```

#### Example 2: With Exemptions

```typescript
const mixedData = [
  { id: "TEL_CCR", name: "Credit Rating", value: 85, unit: "points" },
  {
    id: "WAGES_MFG",
    name: "Manufacturing Wages",
    value: 3250,
    unit: "EUR/month",
  },
];

const result = await processEconomicData(mixedData, {
  targetCurrency: "USD",
  exemptions: {
    indicatorIds: ["TEL_CCR"], // Skip credit ratings
    indicatorNames: ["Index"], // Skip any index data
  },
});
```

## 📊 Automatic Processing Results

The unified pipeline automatically handles complex transformations:

### Sample Transformations

**Argentina (ARG):**

- Original: 1,674,890.753 ARS/Month
- Normalized: $1,243.42 USD/month
- ✅ Currency conversion + magnitude correction

**Venezuela (VEN):**

- Original: 13,000,000 VEF/Month
- Normalized: $3.10 USD/month
- ✅ Handles old Venezuelan currency

**USA (USA):**

- Original: 7.25 USD/hour
- Normalized: $1,257.33 USD/month
- ✅ Time scale conversion (hour → month)

**Costa Rica (CRI):**

- Original: 6,225.77 points
- Result: Excluded (not currency data)
- ✅ Automatically detected and excluded

## 🎛️ Configuration Options

```typescript
const options = {
  targetCurrency: "USD", // Target currency
  targetTimeScale: "month", // Target time period
  excludeIndexValues: true, // Exclude non-currency data
  exemptions: { // Skip specific indicators
    indicatorIds: ["TEL_CCR"],
    categoryGroups: ["IMF WEO"],
    indicatorNames: ["Index"],
  },
  fxFallback: {/* rates */}, // Backup FX rates
};
```

## ✅ Key Benefits

1. **Zero Configuration**: Automatic wages detection
2. **Robust Processing**: Handles mixed data types
3. **Smart Exclusions**: Automatically skips index/points data
4. **Flexible Exemptions**: Skip specific indicators
5. **Fallback Support**: Graceful handling of missing FX rates
6. **Full Test Coverage**: 205 passing tests

## � Getting Started

```bash
# Install econify
npm install econify

# Use in your code
import { processEconomicData } from "econify";
```

See `modern-pipeline-example.ts` for complete working examples.

The unified pipeline makes wages processing simple and automatic! 🎉
