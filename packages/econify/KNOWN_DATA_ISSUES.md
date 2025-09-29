# Known Data Quality Issues

This document catalogs real-world data quality issues discovered through E2E testing with production database data. Each issue includes the root cause, impact, and recommended fixes.

---

## 1. CPI Index Values - Extreme Magnitudes

### Issue
CPI index values with extreme magnitudes (10k+, millions) that are not rebased to 100.

### Examples
- **Bulgaria CPI**: 10,076.2 points (not rebased to 100)
- **South Sudan CPI Transportation**: 2,810,349.21 points (hyperinflation, not rebased)
- **Venezuela CPI**: 30,966,553,343.1 points (extreme hyperinflation)

### Root Cause
Different data sources use different base years and don't normalize to a common base (e.g., 2010=100).

### Current Behavior
- Index/points values are classified as "counts" (non-monetary)
- Values are processed without normalization
- No automatic exclusion of index values in general pipeline

### Recommended Fixes
1. **Use exemptions** to exclude CPI indicators:
   ```typescript
   exemptions: {
     indicatorNames: ["Consumer Price Index", "CPI Transportation"]
   }
   ```
2. **Database correction**: Rebase all CPI series to common base year (e.g., 2010=100)
3. **Add validation**: Flag index values > 10,000 as potentially incorrect

### Test Coverage
- `E2E: CPI Index Values - Extreme Values Processed as Counts`

---

## 2. Government Debt - Currency Mislabeling

### Issue
Jamaica Government Debt labeled as "USD Million" when it's actually "JMD Million" (Jamaican Dollar).

### Examples
- **Jamaica**: 2,242,379 "USD Million" → Should be "JMD Million"
  - As USD: $2.2 trillion (impossible - Jamaica GDP is ~$16B)
  - As JMD: JMD 2.2 trillion ÷ 157.5 = $14B USD (reasonable for 87% debt-to-GDP)

### Root Cause
Database unit field contains incorrect currency code, likely due to:
- Manual data entry errors
- Automatic import assuming USD as default
- Source data ambiguity

### Current Behavior
- System trusts the database unit field
- No automatic currency validation against country context
- Produces implausible results (e.g., $2.2T debt for small economy)

### Recommended Fixes
1. **Database correction**: Update unit field from "USD Million" to "JMD Million"
2. **Add validation**: Flag debt values > 10x GDP as suspicious
3. **Country-currency mapping**: Validate currency against country ISO code
4. **Use FX rates**: When corrected, apply proper FX conversion

### Test Coverage
- `E2E: Government Debt - Currency Mislabeling (JMD labeled as USD)`

---

## 3. GDP "CNY Hundred Million" - Scale Parsing Bug

### Issue
Chinese GDP data uses "CNY Hundred Million" (亿, yi = 100 million) but was being parsed as "CNY Million", causing 100x underreporting.

### Examples
- **China Q2 2025 GDP Constant Prices**: 630,101 hundred million CNY
  - **Wrong**: 630,101 million CNY ÷ 7.2 = 87.5 billion USD (100x too small!)
  - **Correct**: 630,101 × 100 million CNY ÷ 7.2 = 8,751 billion USD ✅

### Root Cause
1. Unit parser didn't recognize "hundred million" as a distinct scale
2. Database `scale` field said "Millions" which overrode parsed unit
3. Chinese accounting uses 亿 (yi) = 100 million as standard unit

### Fix Applied ✅
1. **Added new scale type**: `"hundred-millions"` with value `1e8`
2. **Added pattern recognition**: `/\bhundred\s+mill?i?on?s?\b/i` (must come before "million" pattern)
3. **Priority override**: When unit text contains "hundred million", prefer parsed scale over database scale field

### Validation
- Verified against Trading Economics: China Q2 2025 GDP = 630,101 CNY Hundred Million
- Calculated: 630,101 × 100M ÷ 7.2 = 8,751 billion USD
- Expected: China H1 2025 GDP ~$9 trillion ✅ (matches!)

### Test Coverage
- `E2E: GDP Level Series - Magnitude and Unit Confusion`

---

## 4. Consumer Spending - Currency Normalization

### Issue
Consumer Spending values in local currency (XOF, MXN) appearing as large numbers without context.

### Examples
- **Burkina Faso**: 6,297,940 XOF Billion
- **Mexico**: 18,177,881 MXN Million

### Root Cause
Not an actual bug - these are correct values in local currency that need FX conversion.

### Current Behavior ✅
- System correctly identifies currency (XOF, MXN)
- Applies FX conversion when rates provided
- Produces reasonable USD values

### Recommended Action
- Ensure FX rates are always provided for multi-currency datasets
- Consider auto-fetching live FX rates for common currencies

### Test Coverage
- `E2E: Consumer Spending - Currency Normalization (XOF, MXN)`

---

## 5. Government Revenue (Iran) - Extreme Magnitude

### Issue
Iran Government Revenue with 10¹¹–10¹⁵ magnitude values.

### Examples
- **Iran 2030**: 127,649,242.695 "National currency" "Billions"
  - This is IRR (Iranian Rial) billions = 127.6 trillion IRR
  - At IRR/USD ~600,000: $213 billion USD (reasonable for Iran)

### Root Cause
- "National currency" is ambiguous (doesn't specify IRR)
- Iranian Rial is highly devalued (600,000:1 vs USD)
- Large numbers are correct but need proper currency specification

### Current Behavior
- Without currency specification, value stays in original magnitude
- With explicit "IRR Billion" and FX rates, converts correctly

### Recommended Fixes
1. **Database correction**: Replace "National currency" with explicit "IRR"
2. **Country-currency mapping**: Auto-detect IRR for Iran data
3. **Add metadata**: Include FX rate source and date

### Test Coverage
- `E2E: Government Revenue - Extreme Magnitude Values (IRN)`

---

## 6. GDP per Capita - Near-Zero Values

### Issue
Boss reported ISL 0.0048295 and QAT 0.0051824 (near-zero values) suggesting missing ×1,000 or ×1,000,000 scale factors.

### Examples
- **Iceland**: 0.0048295 (should be ~$90,000)
- **Qatar**: 0.0051824 (should be ~$80,000)

### Root Cause
Could not reproduce in current database. Possible causes:
- Missing scale factor in unit field
- Database value stored in wrong magnitude
- Historical data issue that was corrected

### Current Behavior
- System processes values as-is
- No automatic scale factor detection for implausible per capita values

### Recommended Fixes
1. **Add validation**: Flag GDP per capita < $100 or > $200,000 as suspicious
2. **Database audit**: Search for near-zero per capita values
3. **Add scale hints**: Use country context (high-income countries should have high per capita)

### Test Coverage
- `E2E: GDP per Capita - Scale Factor Issues` (documents expected behavior)

---

## Summary of Fixes Applied

| Issue | Status | Fix Type |
|-------|--------|----------|
| CPI Extreme Values | ✅ Documented | Use exemptions |
| Government Debt Mislabeling | ✅ Documented | Database correction needed |
| CNY Hundred Million | ✅ **FIXED** | Code + pattern recognition |
| Consumer Spending | ✅ Working | No fix needed |
| Iran Revenue | ✅ Documented | Database correction recommended |
| GDP per Capita | ⚠️ Cannot reproduce | Validation recommended |

---

## Recommendations for Data Quality

### 1. Database Corrections
- Fix currency mislabeling (JAM debt: USD → JMD)
- Replace "National currency" with explicit currency codes
- Rebase CPI series to common base year

### 2. Validation Rules
- Flag debt > 10x GDP
- Flag GDP per capita < $100 or > $200,000
- Flag index values > 10,000
- Validate currency against country ISO

### 3. Metadata Enhancements
- Add FX rate source and date
- Add data quality flags
- Add base year for index series

### 4. Processing Improvements
- Auto-fetch live FX rates
- Country-currency mapping
- Automatic outlier detection

