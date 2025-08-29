# Wages Data Pipeline Integration Guide

## 🎯 Problem Solved

Your wages data had severe normalization issues:

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

## 🚀 Integration Options

### Option 1: Middleware Pattern (Recommended)

Add wage detection and processing to your existing pipeline:

```typescript
import { processWagesIndicator } from "./wages/pipeline-integration.ts";

async function processIndicator(indicatorData: any, fxRates: FXTable) {
  // Detect wages indicators
  const isWages = detectWagesIndicator(
    indicatorData.indicator_id,
    indicatorData,
  );

  if (isWages) {
    const result = await processWagesIndicator(indicatorData, fxRates);
    return result.normalized; // Returns normalized indicator data
  }

  // Standard processing for non-wages indicators
  return await standardProcessing(indicatorData, fxRates);
}

function detectWagesIndicator(id: string, data: any): boolean {
  const wageKeywords = ["wage", "wages", "salary", "WAGINMAN", "WAG"];
  return wageKeywords.some((keyword) =>
    id.toLowerCase().includes(keyword) ||
    data.indicator_name?.toLowerCase().includes(keyword)
  );
}
```

### Option 2: Configuration-Based Processing

Define which indicators need wage processing:

```typescript
const WAGE_INDICATORS = [
  "WAGES_IN_MANUFACTURING",
  "WAGES",
  "AVERAGE_WAGES",
  "MINIMUM_WAGE",
  /.*WAG.*/, // Regex patterns
];

async function processWithConfig(indicatorData: any, fxRates: FXTable) {
  const needsWageProcessing = WAGE_INDICATORS.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(indicatorData.indicator_id);
    }
    return indicatorData.indicator_id === pattern;
  });

  if (needsWageProcessing) {
    const result = await processWagesIndicator(indicatorData, fxRates);
    return result.normalized;
  }

  return indicatorData;
}
```

### Option 3: Enhanced Pipeline Service

Replace the existing `normalizeDataService` with enhanced version:

```typescript
import { enhancedNormalizeDataService } from "./wages/pipeline-integration.ts";

// In your pipeline configuration
const pipelineMachine = createMachine({
  // ... other states
  normalizing: {
    invoke: {
      src: enhancedNormalizeDataService, // Uses wage-aware processing
      // ... rest of configuration
    },
  },
});
```

## 📊 Results

### Sample Transformation

**Albania (ALB):**

- Original: 7,473,636 ALL/Month
- Normalized: $82,209 USD/month
- Conversion: 7,473,636 ÷ 90.91 (ALL/USD rate)

**Canada (CAN):**

- Original: 29.68 CAD/Hour
- Normalized: $15,931 USD/month
- Conversion: 29.68 × (365×24÷12) ÷ 1.36 (time + currency)

**Argentina (ARG):**

- Original: 1,627,306 ARS/Month
- Normalized: $4,649 USD/month
- Conversion: 1,627,306 ÷ 350 (ARS/USD rate)

### Value Range Improvement

- **Original range**: 29.68 - 7,473,636 (250,000x difference)
- **Normalized range**: $1,427 - $82,209 (58x difference)
- **Meaningful comparison**: All values now represent monthly wages in USD

## 🔧 Implementation Steps

1. **Add the wages module** to your project
2. **Choose integration pattern** (middleware recommended)
3. **Configure FX rates** for currency conversion
4. **Test with your data** using the provided examples
5. **Deploy** the enhanced processing

## 📁 Files Added

- `wages-normalization.ts` - Core normalization logic
- `pipeline-integration.ts` - Pipeline integration functions
- `integration-example.ts` - Usage examples and patterns
- `*_test.ts` - Comprehensive tests
- `README.md` - Detailed documentation

## 🎛️ Configuration Options

```typescript
const options = {
  targetCurrency: "USD", // Target currency for normalization
  targetTimeScale: "month", // Target time period
  excludeIndexValues: false, // Whether to exclude index/points data
  includeMetadata: true, // Include normalization metadata
};
```

## ✅ Benefits

1. **Comparable Data**: All wage values in same unit (USD/month)
2. **Proper Handling**: Separates currency values from index values
3. **Transparency**: Clear metadata about normalization applied
4. **Flexibility**: Configurable target currency and time scale
5. **Robust**: Handles errors gracefully with detailed reporting
6. **Tested**: Comprehensive test suite ensures reliability

## 🚦 Next Steps

1. **Integrate** into your existing pipeline using preferred pattern
2. **Test** with your full wages dataset
3. **Extend** to other similar indicators (salaries, compensation, etc.)
4. **Monitor** results and adjust FX rates as needed

The solution transforms incomparable wages data into meaningful, comparable
economic indicators while maintaining transparency about the normalization
process.
