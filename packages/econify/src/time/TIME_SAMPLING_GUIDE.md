# Advanced Time Sampling for Economic Data

## 🎯 Overview

The econify package now includes sophisticated time sampling capabilities for
upsampling and downsampling economic data across different time periods. This is
especially important for wages data where you have mixed reporting frequencies.

## 📊 Current vs Enhanced Implementation

### Current Implementation (Simple Ratio)

```typescript
// Simple ratio-based conversion
const monthlyWage = hourlyWage * (365 * 24 / 12); // 730 hours/month
```

### Enhanced Implementation (Context-Aware)

```typescript
// Wage-specific conversion considering work hours
const monthlyWage = convertWageTimeScale(hourlyWage, "hour", "month", "hourly");
// Uses 2080 work hours/year = 173.33 hours/month
```

## 🔧 Key Features

### 1. **Multiple Sampling Methods**

- **Linear**: Smooth interpolation between points
- **Step**: Hold previous value (step function)
- **Average**: Mean of values in period
- **Sum**: Total of values in period
- **End/Start of Period**: Use boundary values

### 2. **Wage-Specific Handling**

- **Hourly Wages**: Uses standard work hours (2080/year)
- **Salary Data**: Uses calendar time
- **Mixed Frequencies**: Automatic detection and conversion

### 3. **Time Series Processing**

- **Upsampling**: Low frequency → High frequency (e.g., yearly → monthly)
- **Downsampling**: High frequency → Low frequency (e.g., daily → monthly)
- **Interpolation**: Smart gap filling with multiple methods

## 🚀 Usage Examples

### Basic Time Conversion

```typescript
import { convertWageTimeScale, simpleTimeConversion } from "./time-sampling.ts";

// Simple conversion (current method)
const monthly1 = simpleTimeConversion(25, "hour", "month"); // $18,250

// Enhanced wage conversion
const monthly2 = convertWageTimeScale(25, "hour", "month", "hourly"); // $4,333
```

### Time Series Resampling

```typescript
import { resampleTimeSeries } from "./time-sampling.ts";

// Upsample yearly to monthly with linear interpolation
const monthlyData = resampleTimeSeries(yearlyData, "month", {
  method: "linear",
});

// Downsample daily to monthly with averaging
const monthlyAvg = resampleTimeSeries(dailyData, "month", {
  method: "average",
});
```

### Mixed Wage Processing

```typescript
import { processWageTimeSeries } from "./time-sampling.ts";

const mixedWages = [
  { value: 29.68, unit: "CAD/Hour", country: "CAN" },
  { value: 1432.6, unit: "AUD/Week", country: "AUS" },
  { value: 124110, unit: "CNY/Year", country: "CHN" },
];

// Standardize all to monthly
const monthlyWages = processWageTimeSeries(mixedWages, "month");
```

## 📈 Real-World Results

### Your Wages Data Transformation

**Before (Mixed Units):**

```
CAN: 29.68 CAD/Hour
AUS: 1,432.6 AUD/Week  
CHN: 124,110 CNY/Year
```

**After (Standardized Monthly):**

```
CAN: 4,333 CAD/month (using work hours)
AUS: 6,208 AUD/month (4.33 weeks/month)
CHN: 10,343 CNY/month (÷12 months)
```

### Conversion Factors Applied

- **Hourly → Monthly**: ×173.33 (work hours) vs ×730 (calendar hours)
- **Weekly → Monthly**: ×4.33 (weeks per month)
- **Yearly → Monthly**: ÷12 (months per year)

## 🎛️ Sampling Method Selection

### For Wages Data

| Source → Target     | Recommended Method     | Reason                        |
| ------------------- | ---------------------- | ----------------------------- |
| Hourly → Monthly    | `convertWageTimeScale` | Uses work hours, not calendar |
| Daily → Weekly      | `sum`                  | Total weekly compensation     |
| Monthly → Quarterly | `average`              | Typical quarterly wage        |
| Yearly → Monthly    | Simple division        | Even distribution             |

### For Economic Indicators

| Data Type                | Upsampling | Downsampling    |
| ------------------------ | ---------- | --------------- |
| Flow data (wages, GDP)   | `linear`   | `average`       |
| Stock data (employment)  | `step`     | `end_of_period` |
| Cumulative (total sales) | `linear`   | `sum`           |

## ⚠️ Important Considerations

### 1. **Work Hours vs Calendar Hours**

```typescript
// Wrong: Uses all hours in month (730)
const wrong = hourlyWage * (365 * 24 / 12);

// Right: Uses standard work hours (173.33)
const right = convertWageTimeScale(hourlyWage, "hour", "month", "hourly");
```

### 2. **Seasonal Adjustments**

- Consider seasonal work patterns
- Account for holidays and vacation time
- Use appropriate sampling methods for seasonal data

### 3. **Currency vs Time Conversion Order**

```typescript
// Correct order: Currency first, then time
const step1 = convertCurrency(value, fromCurrency, toCurrency, fxRate);
const step2 = convertWageTimeScale(step1, fromTime, toTime);
```

## 🔗 Integration with Existing Pipeline

### Option 1: Enhanced Normalization

```typescript
import { processWageTimeSeries } from "./time/time-sampling.ts";

// In your wage processing pipeline
const standardizedWages = processWageTimeSeries(wageData, "month");
const normalizedWages = normalizeWagesData(standardizedWages, options);
```

### Option 2: Pipeline Middleware

```typescript
// Add time standardization before currency normalization
if (isWageData(data)) {
  data = processWageTimeSeries(data, "month");
}
const result = await normalizeWagesData(data, options);
```

## 📁 Files Added

- `time-sampling.ts` - Core time sampling functions
- `time-sampling_test.ts` - Comprehensive tests
- `time-sampling-example.ts` - Usage demonstrations
- `TIME_SAMPLING_GUIDE.md` - This documentation

## ✅ Benefits

1. **Accurate Conversions**: Work hours vs calendar hours for wages
2. **Flexible Resampling**: Multiple methods for different data types
3. **Time Series Support**: Handle historical data with gaps
4. **Mixed Frequency Handling**: Automatic detection and conversion
5. **Comprehensive Testing**: All scenarios covered with tests

## 🚦 Next Steps

1. **Integrate** time sampling into your wage normalization pipeline
2. **Test** with your full dataset to validate conversions
3. **Extend** to other economic indicators with time components
4. **Monitor** results and adjust sampling methods as needed

The enhanced time sampling provides much more accurate and contextually
appropriate conversions for economic data, especially wages where the
distinction between work hours and calendar hours is crucial.
