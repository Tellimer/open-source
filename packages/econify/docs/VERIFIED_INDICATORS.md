# Verified Indicators

This document lists all economic indicators that have been verified to work correctly with econify's smart auto-targeting and classification system.

**Last Updated:** 2025-09-30  
**Econify Version:** 1.2.0+

---

## ✅ Stock Indicators

Stock indicators represent **snapshots at a point in time**. They should **NOT** have time dimension conversion.

### Verified Working

| Indicator | Periodicity Tested | Expected Behavior | Status |
|-----------|-------------------|-------------------|--------|
| **Population** | Yearly, Monthly | No time conversion, units show "millions" (not "per month") | ✅ |
| **Employed Persons** | Monthly | No time conversion, units show "thousands" (not "per month") | ✅ |
| **Government Debt** | Quarterly, Monthly | No time conversion, units show "USD millions" (not "per quarter/month") | ✅ |
| **Foreign Reserves** | Monthly | No time conversion, units show "USD millions" (not "per month") | ✅ |
| **Money Supply M0** | Monthly | No time conversion, units show "USD millions" (not "per month") | ✅ |
| **Money Supply M1** | Monthly | No time conversion, units show "USD millions" (not "per month") | ✅ |
| **Money Supply M2** | Quarterly | No time conversion, units show "EUR millions" (not "per quarter") | ✅ |

### Key Characteristics

- **No time dimension** in normalized units
- **No periodicity conversion** in explain metadata
- **Auto-targeting skips time dimension**: `time=skipped(stock indicator, no time dimension)`
- **Only currency and scale conversions** applied

### Example Export

```json
{
  "indicator_name": "Government Debt",
  "normalized_value": 16773.55,
  "normalized_unit": "USD millions",  // ✅ No "per quarter"
  "explain": {
    "periodicity": undefined,  // ✅ No time conversion
    "target_selection": {
      "selected": {
        "currency": "USD",
        "magnitude": "millions"
        // ✅ No time dimension
      },
      "reason": "magnitude=majority(millions,0.84); time=skipped(stock indicator, no time dimension)"
    }
  }
}
```

---

## ✅ Flow Indicators

Flow indicators represent **activity over a time period**. They **SHOULD** have time dimension conversion.

### Verified Working

| Indicator | Periodicity Tested | Expected Behavior | Status |
|-----------|-------------------|-------------------|--------|
| **GDP (Nominal)** | Yearly | Auto-targets to billions/year (100% majority), no conversion needed | ✅ |
| **GDP Constant Prices** | Yearly, Quarterly | Time conversion (year → quarter ÷4), units show "USD millions per quarter" | ✅ |
| **GDP from Agriculture** | Yearly, Quarterly | Time conversion (year → quarter ÷4), units show "USD millions per quarter" | ✅ |
| **GDP from Construction** | Yearly, Quarterly | Time conversion (year → quarter ÷4), units show "USD millions per quarter" | ✅ |
| **GDP from Manufacturing** | Yearly, Quarterly | Time conversion (year → quarter ÷4), units show "USD millions per quarter" | ✅ |
| **GDP from Services** | Yearly, Quarterly | Time conversion (year → quarter ÷4), units show "USD millions per quarter" | ✅ |
| **Government Revenues** | Yearly, Quarterly, Monthly | Time conversion applied, units show "USD millions per [period]" | ✅ |
| **Exports** | Monthly, Quarterly | Time conversion applied, units show "USD millions per quarter" | ✅ |

### Key Characteristics

- **Time dimension included** in normalized units
- **Periodicity conversion** in explain metadata (when needed)
- **Auto-targeting includes time dimension**: `time=majority(quarter,0.81)`
- **Currency, scale, AND time conversions** applied

### Example Export

```json
{
  "indicator_name": "GDP Constant Prices",
  "original_value": 1060708,  // AFN millions per year
  "normalized_value": 3932.68,  // USD millions per quarter
  "normalized_unit": "USD millions per quarter",  // ✅ Includes time
  "explain": {
    "periodicity": {
      "original": "year",
      "target": "quarter",
      "adjusted": true,
      "factor": 0.25,
      "direction": "upsample",
      "description": "year → quarter (÷4)"
    },
    "target_selection": {
      "selected": {
        "currency": "USD",
        "magnitude": "millions",
        "time": "quarter"  // ✅ Time dimension included
      },
      "reason": "magnitude=majority(millions,0.74); time=majority(quarter,0.81)"
    }
  }
}
```

---

## ✅ Rate Indicators

Rate indicators represent **ratios, percentages, or indices**. They should **NOT** have time dimension conversion.

### Verified Working

| Indicator | Periodicity Tested | Expected Behavior | Status |
|-----------|-------------------|-------------------|--------|
| **GDP Deflator** | Monthly, Quarterly | No time conversion, units show "points" (not "per quarter/month") | ✅ |
| **GDP Annual Growth Rate** | Yearly, Quarterly | No time conversion, units show "%" | ✅ |
| **Inflation Rate** | Monthly | No time conversion, units show "%" | ✅ |
| **Unemployment Rate** | Quarterly, Monthly | No time conversion, units show "%" | ✅ |
| **CPI** | Monthly | No time conversion, units show "index" or "points" | ✅ |

### Key Characteristics

- **No time dimension** in normalized units
- **No periodicity conversion** in explain metadata
- **Auto-targeting skips time dimension**: `time=skipped(rate indicator, no time dimension)`
- **Only currency and scale conversions** applied (if applicable)

### Example Export

```json
{
  "indicator_name": "GDP Deflator",
  "original_value": 101.8,  // Monthly data
  "normalized_value": 101.8,  // ✅ NOT multiplied by 3!
  "normalized_unit": "points",  // ✅ No "per month"
  "explain": {
    "periodicity": undefined,  // ✅ No time conversion
    "target_selection": {
      "selected": {
        "magnitude": "ones",
        "time": undefined  // ✅ Time dimension skipped
      },
      "reason": "magnitude=majority(ones,1.00); time=skipped(rate indicator, no time dimension)"
    }
  }
}
```

---

## ✅ Per Capita Indicators

Per capita indicators are **ratios** (GDP ÷ Population). Current behavior treats them as flow, but since 100% of data is annual, no conversion occurs.

### Verified Working

| Indicator | Periodicity Tested | Expected Behavior | Status |
|-----------|-------------------|-------------------|--------|
| **GDP per Capita** | Yearly | Auto-targets to year (100% majority), no conversion needed | ✅ |
| **GDP per Capita PPP** | Yearly | Auto-targets to year (100% majority), no conversion needed | ✅ |

### Key Characteristics

- **Classified as flow** (but could be argued as rate/ratio)
- **100% annual data** - no quarterly data exists
- **No conversion occurs** (year → year, factor = 1)
- **Units show "USD per year"** (technically correct for annual income)

### Example Export

```json
{
  "indicator_name": "GDP per Capita PPP",
  "original_value": 1983.81,
  "normalized_value": 1983.81,  // ✅ Unchanged
  "normalized_unit": "USD per year",
  "explain": {
    "periodicity": {
      "original": "year",
      "target": "year",
      "adjusted": false,
      "factor": 1,
      "direction": "none"
    },
    "target_selection": {
      "selected": {
        "currency": "USD",
        "magnitude": "ones",
        "time": "year"  // ✅ 100% majority
      },
      "reason": "magnitude=majority(ones,1.00); time=majority(year,1.00)"
    }
  }
}
```

---

## 🔧 Recent Fixes

### 1. GDP Deflator Misclassification (Fixed: 2025-09-30)

**Issue:** GDP Deflator was classified as FLOW (80%) because it contains "GDP"  
**Fix:** Added "deflator" and "gdp deflator" to RATE_PATTERNS with priority detection  
**Result:** GDP Deflator now correctly classified as RATE (90%)

### 2. Stock/Rate Indicator Unit Labeling (Fixed: 2025-09-30)

**Issue:** Stock indicators showing "USD millions per quarter" instead of "USD millions"  
**Fix:** Use classification system to detect stock/rate indicators and omit time dimension from units  
**Result:** Stock/rate indicators now show clean units without time dimension

### 3. Government Revenues Misclassification (Fixed: 2025-09-30)

**Issue:** "Government Revenues" (plural) classified as STOCK instead of FLOW  
**Fix:** Added plural forms ("government revenues", "tax revenues") to FLOW_PATTERNS  
**Result:** Government Revenues now correctly classified as FLOW (80%)

---

## 📊 Auto-Targeting Statistics

Based on verified exports:

| Indicator Type | Typical Magnitude Target | Typical Time Target | Notes |
|----------------|-------------------------|---------------------|-------|
| GDP (Nominal) | billions (100%) | year (100%) | World Bank data |
| GDP Constant Prices | millions (74%) | quarter (81%) | National sources |
| GDP Sectoral | millions (76-78%) | quarter (84-85%) | National sources |
| Government Debt | millions (84%) | N/A (skipped) | Stock indicator |
| Government Revenues | millions (78%) | varies by source | Flow indicator |
| Population | millions/ones | N/A (skipped) | Stock indicator |

---

## 🎯 Testing Recommendations

When adding new indicators, verify:

1. **Classification is correct** (stock/flow/rate)
2. **Time dimension handling** matches indicator type
3. **Units are clean** (no "per month" for stock/rate)
4. **Auto-targeting selects appropriate targets**
5. **Conversions are mathematically correct**

### Test Checklist

- [ ] Indicator classifies correctly (use `classifyIndicator()`)
- [ ] Stock/rate indicators skip time dimension
- [ ] Flow indicators include time dimension
- [ ] Units don't show "per [period]" for stock/rate
- [ ] Periodicity conversion only for flow indicators
- [ ] Auto-targeting reason explains decisions clearly
- [ ] Values are mathematically correct after conversion

---

## 📝 Notes

- **Smart Auto-Targeting** (v1.2.0+) automatically detects indicator type and skips time dimension for stock/rate indicators
- **Per-indicator normalization** allows different indicators to have different target dimensions
- **Classification confidence** typically 80-90% for well-defined indicators
- **Fallback classification** defaults to stock for currency-based indicators without specific patterns

---

## 🔗 Related Documentation

- [Per-Indicator Normalization Guide](./guides/per-indicator-normalization.md)
- [Classification System](../src/classification/classification.ts)
- [Pattern Definitions](../src/patterns.ts)
- [CHANGELOG](../CHANGELOG.md)

