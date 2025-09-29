# End-to-End Test Findings

## Test Date: 2025-09-29

## Summary
Comprehensive E2E testing with real World Bank data revealed **4 critical issues** affecting non-IMF indicators.

---

## Issue 1: Auto-Targeting Overrides Explicit `targetMagnitude`

**Test:** GDP (World Bank, monetary flow, annual, USD)

**Expected Behavior:**
- When `targetMagnitude: "billions"` is explicitly set, it should be used
- GDP values should be scaled: 2,173,665,655,937 → 2,174 billions

**Actual Behavior:**
- Auto-targeting detects `magnitude: "ones"` (100% majority)
- Overrides the explicit `targetMagnitude: "billions"` setting
- Values remain unscaled: 2,173,665,655,937 (in ones)

**Root Cause:**
- Auto-targeting runs AFTER explicit targets are set
- Auto-targeting majority (100% "ones") overrides user's explicit choice

**Impact:** HIGH
- Makes it impossible to force a specific magnitude for indicators without explicit scale in database
- World Bank data often lacks scale metadata, relying on implicit understanding

**Recommendation:**
- Explicit `targetMagnitude` should take precedence over auto-targeting
- Or: Add a `preferExplicitTargets: boolean` option

---

## Issue 2: Count Indicators Return Empty Results

**Test:** Population (World Bank, stock, annual, count)

**Expected Behavior:**
- Population data should be normalized and returned
- Values should be scaled to millions: 1,410,710,000 → 1,411 millions

**Actual Behavior:**
- `result.data` is EMPTY (`[]`)
- All population records are dropped during processing
- Console shows: `DEBUG classified as counts: SP.POP.TOTLCHN2023 Population, total Number`

**Root Cause:**
- Count indicators are being classified correctly
- But somewhere in the pipeline they're being filtered out or not returned

**Impact:** CRITICAL
- All count-type indicators from World Bank are unusable
- Affects: Population, Employment, Vehicle Registrations, Building Permits, etc.

**Recommendation:**
- Trace count processing pipeline to find where data is lost
- Check if counts bucket is being returned in final results

---

## Issue 3: Index Indicators Not Labeled as "Index"

**Test:** CPI Index (World Bank, index, annual)

**Expected Behavior:**
- Normalized unit should contain "index"
- Values should remain unchanged (index values are dimensionless)

**Actual Behavior:**
- Classified as counts: `DEBUG classified as non-monetary -> counts`
- Normalized unit does NOT contain "index"
- Test assertion fails: `unitLower.includes("index")` returns `false`

**Root Cause:**
- Unit "Index, 2010=100" is being parsed but "index" classification is lost
- Routed to counts bucket instead of a dedicated index bucket

**Impact:** MEDIUM
- Index indicators lose their semantic meaning
- Makes it unclear that values are index points vs counts

**Recommendation:**
- Add dedicated index classification and routing
- Preserve "index" in normalized unit string
- Consider adding base year to metadata (e.g., "2010=100")

---

## Issue 4: Time Conversion Warnings for Annual Data

**Test:** All tests with `periodicity: "Annual"`

**Expected Behavior:**
- Annual data should be recognized from `periodicity` field
- No time conversion warnings

**Actual Behavior:**
- Warning: `⚠️ Time conversion to year requested but no source time scale found in unit "Current USD" or explicit fields. Value unchanged.`
- Auto-targeting selects `time: "year"` but can't find source time scale

**Root Cause:**
- `periodicity: "Annual"` field is not being parsed to extract time scale
- Only looking in `unit` string and explicit `timeScale` field

**Impact:** LOW (warnings only, values are correct)
- Clutters logs with false warnings
- May confuse users

**Recommendation:**
- Enhance `parseTimeScale` to check `periodicity` field
- Map "Annual" → "year", "Monthly" → "month", etc.

---

## Test Coverage

### ✅ Working Correctly:
- **Unemployment Rate** (percentage) - Values unchanged, correct classification
- **Inflation Rate** (percentage) - Values unchanged, correct classification

### ❌ Issues Found:
- **GDP** (monetary flow) - Auto-targeting overrides explicit magnitude
- **Population** (stock/count) - Data completely lost
- **CPI Index** (index) - Not labeled as index
- **Current Account** (monetary flow) - Same as GDP

---

## Data Sources Tested:
- World Bank (6 indicators)
- Bruegel (REER - not yet tested)
- European Central Bank (Interest Rate - not yet tested)

---

## Next Steps:

1. **Fix Issue #2 (CRITICAL):** Investigate why count indicators return empty results
2. **Fix Issue #1 (HIGH):** Ensure explicit targets take precedence over auto-targeting
3. **Fix Issue #3 (MEDIUM):** Add proper index classification and labeling
4. **Fix Issue #4 (LOW):** Parse periodicity field for time scale

5. **Expand test coverage:**
   - Add REER (index, monthly)
   - Add Interest Rate (percentage, daily)
   - Add more count indicators (Building Permits, Vehicle Registrations)
   - Add commodity indicators (Oil, Gold)
   - Add mixed periodicity tests (monthly + annual in same indicator)

---

## Test File Location:
`packages/econify/src/workflows/e2e_comprehensive_test.ts`

## Test Results:
```
FAILED | 2 passed | 4 failed (25ms)
```

