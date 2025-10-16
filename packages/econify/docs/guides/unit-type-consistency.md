# Unit Type Consistency Detection

## Overview

Unit Type Consistency Detection is a quality control feature that identifies
semantic unit type mismatches within indicator groups. It prevents mixing
incompatible unit types (like counts and indexes) that would produce meaningless
comparisons.

## The Problem

Economic indicators in the database may have semantically incompatible unit
types grouped together:

```
Indicator: "Tourist Arrivals"
├─ Armenia: 520,394 persons (count)
├─ Brazil: 6,774 thousands (count)
├─ Vietnam: 15,498 thousands (count)
└─ Greece: 100.0 Index (2020=100) (index) ❌ INCOMPATIBLE
```

After normalization, these would be treated as comparable values, but:

- **Counts** represent absolute quantities (520,394 people)
- **Indexes** represent relative change from a base year (100 = 2020 baseline)

Comparing "100 index points" with "15,498,000 people" is semantically
meaningless.

## Root Cause

The database's `units` column contains heterogeneous unit types that indicate
fundamentally different measurement semantics, not just different scales. When
indicators are grouped by name for normalization, these incompatible types get
mixed together.

## Solution Architecture

### Three-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Unit Type Classification                          │
│ classifyUnitType() → Semantic categorization               │
│ - Input: "Index (2020=100)", "Thousand", "USD Million"     │
│ - Output: "index", "count", "currency-amount"              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Compatibility Rules                                │
│ areUnitsCompatible() → Semantic compatibility check        │
│ - Same types: ✅ (percentage + percentage)                  │
│ - Scale variations: ✅ (Thousand + Million)                 │
│ - Different semantics: ❌ (count + index)                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Inconsistency Detection                           │
│ detectUnitTypeInconsistencies() → Find minority types      │
│ - Cluster by indicator group                               │
│ - Find dominant type (67%+ majority)                       │
│ - Flag incompatible minority items                         │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### Step 1: Unit Type Classification

The classifier (`classifyUnitType()`) categorizes 400+ unique unit patterns from
the database into 9 semantic types:

| Type                | Description                    | Examples                               |
| ------------------- | ------------------------------ | -------------------------------------- |
| **percentage**      | Relative proportion (0-100%)   | %, percent, percent of GDP             |
| **index**           | Relative change from base year | points, Index (2020=100), basis points |
| **count**           | Absolute quantity              | persons, thousand, million, tonnes     |
| **currency-amount** | Monetary value                 | USD Million, EUR Billion               |
| **physical**        | Physical measurements          | celsius, mm, GWh, BBL/D                |
| **rate**            | Per-unit ratios                | per 1000 people, per capita            |
| **ratio**           | Dimensionless ratios           | times, ratio, debt to equity           |
| **duration**        | Time periods                   | days, years, months                    |
| **unknown**         | Unrecognized patterns          | (empty, null, unrecognized)            |

#### Classification Logic

The classifier uses **pattern-based matching** with specific ordering (most
specific patterns first):

```typescript
// Simplified classification flow:
1. PERCENTAGE patterns
   - Check for: %, percent, pct, share, proportion
   - Examples: "percent of GDP", "% share"

2. INDEX patterns
   - Check for: index, points, basis points
   - Examples: "Index (2020=100)", "points"

3. DURATION patterns (before count - more specific)
   - Check for: days, years, months, weeks
   - Examples: "days", "years"

4. PHYSICAL patterns (before count)
   - Check for: celsius, mm, gwh, bbl/d, bushels, cubic feet
   - Examples: "Gigawatt-hour", "celsius"

5. PRICE/COST patterns (before rate - more specific)
   - Check for: currency codes + "/" or "per"
   - Examples: "USD/Liter", "EUR/Month"

6. RATE patterns
   - Check for: "per", "/100", "/1000", "per capita"
   - Examples: "per 1000 people", "doses per 100"

7. RATIO patterns
   - Check for: ratio, times, to (in "debt to equity")
   - Examples: "ratio", "times"

8. CURRENCY AMOUNT patterns
   - Check for: currency codes + amount words
   - Examples: "USD Million", "Thousands of Euros"

9. COUNT patterns (last - most general)
   - Check for: persons, thousand, million, billion
   - Examples: "persons", "Thousand", "Million"
```

#### Comprehensive Coverage

The classifier handles **all 400+ unit patterns** found in the database:

**Currency Support (100+ currencies):**

- Major currencies: USD, EUR, GBP, JPY, CNY, CHF, AUD, CAD
- Regional currencies: INR, BRL, ZAR, MXN, TRY, KRW, SGD
- All world currencies: All ISO 4217 currency codes

**Price/Cost Patterns:**

- Currency per volume: USD/Liter, EUR/Barrel
- Currency per time: EUR/Month, USD/Hour, GBP/Day
- Currency per unit: EUR/MWh, USD/SQ. METRE

**Physical Units:**

- Energy: Gigawatt-hour, Terajoule, BBL/D/1K
- Volume: bushels, cubic feet, cubic meter
- Weight: kt (kilotonnes), kg
- Area: square km, square metre, sq. metre
- Temperature: celsius, Celsius, C

**Count Scales:**

- Base words: persons, people, individuals
- Scale prefixes: thousand, thousands, million, hundred million, tens of million
- Demographics: households, dwellings, employees, students, vehicles
- Business: subscribers, users, customers, transactions, contracts
- Health: doses, births, deaths, cases

**Special Database Patterns:**

- `"National currency"` → currency-amount
- `"Purchasing power parity"` → currency-amount
- `"International dollar"` → currency-amount
- `"SIPRI TIV"` → currency-amount (military value)
- `"Current USD"`, `"Constant local currency"` → currency-amount

**Case Variations:**

- Handles: Thousand/thousands, Percent/percent, Million/million

#### Word Boundary Matching

To prevent false positives, currency codes use **word boundary regex**:

```typescript
// ❌ Without word boundaries:
"subscribers" contains "scr" → FALSE MATCH (Seychelles Rupee)

// ✅ With word boundaries:
hasCurrencyCode("subscribers") → false
hasCurrencyCode("scr million") → true
hasCurrencyCode("usd/liter") → true
hasCurrencyCode("million-usd") → true
```

The regex pattern: `\b{code}\b|{code}[-/]|[-/]{code}`

### Step 2: Compatibility Rules

The `areUnitsCompatible()` function defines semantic compatibility:

```typescript
areUnitsCompatible(type1: UnitSemanticType, type2: UnitSemanticType): boolean

Rules:
1. Same types are ALWAYS compatible
   - percentage + percentage ✅
   - index + index ✅

2. Count + Count are compatible (different scales OK)
   - "Thousand" + "Million" ✅
   - "persons" + "Thousand" ✅

3. Currency + Currency are compatible (different scales/currencies OK)
   - "USD Million" + "EUR Billion" ✅
   - "Thousands of Euros" + "Million USD" ✅

4. Unknown types are INCOMPATIBLE with everything
   - unknown + anything ❌

5. All other cross-type combinations are INCOMPATIBLE
   - count + index ❌
   - count + percentage ❌
   - index + percentage ❌
   - physical + count ❌
```

**Why Scale Variations Are Compatible:**

```
Example: Tourist Arrivals
├─ Armenia: 520,394 persons      → count (scale: 1)
├─ Brazil: 6,774 thousands       → count (scale: 1,000)
└─ Vietnam: 15,498 thousands     → count (scale: 1,000)

After normalization:
├─ Armenia: 520,394 people
├─ Brazil: 6,774,000 people  (6,774 × 1,000)
└─ Vietnam: 15,498,000 people (15,498 × 1,000)

✅ All represent the same semantic concept: absolute counts of people
✅ Different scales are just different ways of expressing the same unit
```

### Step 3: Inconsistency Detection

The `detectUnitTypeInconsistencies()` function finds minority incompatible
types:

#### Algorithm

```typescript
1. Group items by indicator name

2. For each group with 2+ items:

   a. Classify each item's unit type

   b. Count type frequencies:
      { "count": 3, "index": 1 }

   c. Find dominant type (67%+ majority by default):
      - Total items: 4
      - count: 3/4 = 75% ✅ DOMINANT
      - index: 1/4 = 25% (minority)

   d. Check compatibility for each item:
      - If item's type is compatible with dominant → OK
      - If item's type is incompatible with dominant → FLAG

   e. Add quality warning to incompatible items:
      {
        type: "unit-type-mismatch",
        severity: "high",
        message: "Unit type 'index' incompatible with dominant type 'count'",
        context: {
          itemUnitType: "index",
          dominantType: "count",
          dominantCount: 3,
          totalCount: 4
        }
      }

3. Return:
   - data: All items (with warnings added to incompatible ones)
   - incompatibleUnits: Array of incompatible items (if filterIncompatible=true)
```

#### Dominant Type Threshold

The **dominant type threshold** (default 67%) determines what constitutes a
clear majority:

```typescript
// 67% threshold (default - strict)
Items: [count, count, index]
- count: 2/3 = 66.7% ❌ NO dominant type (fragmented group)
- No warnings issued (not enough consensus)

// 67% threshold
Items: [count, count, count, index]
- count: 3/4 = 75% ✅ DOMINANT
- index item flagged as incompatible

// 50% threshold (lenient)
Items: [count, count, index, percentage]
- count: 2/4 = 50% ✅ DOMINANT (tie-breaker: most frequent)
- index, percentage items flagged

Configuration:
{
  dominantTypeThreshold: 0.67  // 67% required for clear majority
}
```

**Why 67%?**

- Requires clear 2:1 majority (not just 51% simple majority)
- Prevents false positives from evenly-split data
- Aligns with statistical significance conventions

## Usage

### Basic Usage

```typescript
import { processEconomicData } from "@tellimer/econify";

const result = await processEconomicData(data, {
  autoTargetByIndicator: true,
  detectUnitTypeMismatches: true, // Enable unit type checking
});

// Items with incompatible units have warnings
result.data.forEach((item) => {
  if (item.explain?.qualityWarnings) {
    const unitWarning = item.explain.qualityWarnings.find(
      (w) => w.type === "unit-type-mismatch",
    );
    if (unitWarning) {
      console.log(`${item.id}: ${unitWarning.message}`);
    }
  }
});
```

### Advanced Configuration

```typescript
const result = await processEconomicData(data, {
  autoTargetByIndicator: true,
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    // Threshold for dominant type (default: 0.67 = 67%)
    dominantTypeThreshold: 0.67,

    // Include detailed statistics (default: false)
    includeDetails: true,

    // Remove incompatible items from results (default: false)
    filterIncompatible: true,
  },
});

// Access filtered incompatible items
console.log("Incompatible items:", result.incompatibleUnits);

// Detailed statistics (if includeDetails: true)
result.data.forEach((item) => {
  const warning = item.explain?.qualityWarnings?.find(
    (w) => w.type === "unit-type-mismatch",
  );
  if (warning) {
    console.log({
      id: item.id,
      itemType: warning.context.itemUnitType,
      dominantType: warning.context.dominantType,
      dominantRatio:
        `${warning.context.dominantCount}/${warning.context.totalCount}`,
    });
  }
});
```

### Filtering Mode

When `filterIncompatible: true`, incompatible items are removed from the main
results:

```typescript
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    filterIncompatible: true, // Remove incompatible items
  },
});

// result.data - Only compatible items
// result.incompatibleUnits - Removed incompatible items (preserved)

console.log(`Compatible items: ${result.data.length}`);
console.log(`Filtered out: ${result.incompatibleUnits.length}`);
```

## Integration with Scale Outlier Detection

Unit type consistency and scale outlier detection are **complementary checks**
that can run together:

```typescript
const result = await processEconomicData(data, {
  autoTargetByIndicator: true,

  // Unit type checking (semantic compatibility)
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    filterIncompatible: true,
  },

  // Scale outlier detection (magnitude issues)
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    filterOutliers: true,
    clusterThreshold: 0.67,
    magnitudeDifferenceThreshold: 2.0, // 100x difference
  },
});

// result.data - Items passing both checks
// result.scaleOutliers - Magnitude outliers
// result.incompatibleUnits - Semantic type mismatches
```

**Differences:**

| Check             | Detects                            | Example                             |
| ----------------- | ---------------------------------- | ----------------------------------- |
| **Unit Type**     | Semantic incompatibility           | count vs index, count vs percentage |
| **Scale Outlier** | Magnitude issues (100x difference) | 520,394 vs 6,774 (both counts)      |

**Example:** Tourist Arrivals

```
Input Data:
├─ Armenia: 520,394 persons      (count, magnitude: 520k)
├─ Brazil: 6,774 thousands       (count, magnitude: 6.77M)
├─ Vietnam: 15,498 thousands     (count, magnitude: 15.5M)
└─ Greece: 100 Index (2020=100)  (index, magnitude: 100)

Unit Type Check:
- count: 3 items (75% majority) ✅
- index: 1 item (25% minority) ❌ FLAGGED (semantic mismatch)

Scale Outlier Check (after normalization):
- Armenia: 520,394,000 (magnitude: 8.72 log10)
- Brazil: 6,774,000 (magnitude: 6.83 log10)
- Vietnam: 15,498,000 (magnitude: 7.19 log10)
- Difference: Armenia is 77x larger ❌ FLAGGED (magnitude outlier)

Result:
- Greece removed: semantic type mismatch
- Armenia removed: scale outlier (likely wrong scale labeling)
- Brazil, Vietnam retained: compatible types + similar scales
```

## API Reference

### `classifyUnitType()`

```typescript
function classifyUnitType(
  unit: string | null | undefined,
): UnitTypeClassification;

interface UnitTypeClassification {
  type: UnitSemanticType;
  confidence: number; // 0.0 to 1.0
  matchedPattern?: string; // Which pattern matched
  normalizedUnit?: string; // Normalized representation
}

type UnitSemanticType =
  | "percentage"
  | "index"
  | "count"
  | "currency-amount"
  | "physical"
  | "rate"
  | "ratio"
  | "duration"
  | "unknown";
```

**Examples:**

```typescript
classifyUnitType("percent of GDP");
// → { type: "percentage", confidence: 1.0, matchedPattern: "percentage pattern" }

classifyUnitType("Index (2020=100)");
// → { type: "index", confidence: 1.0, matchedPattern: "index pattern" }

classifyUnitType("Thousand");
// → { type: "count", confidence: 1.0, matchedPattern: "count pattern" }

classifyUnitType("USD Million");
// → { type: "currency-amount", confidence: 1.0, matchedPattern: "currency amount pattern" }

classifyUnitType("USD/Liter");
// → { type: "rate", confidence: 1.0, matchedPattern: "price/cost pattern (currency per unit)" }
```

### `areUnitsCompatible()`

```typescript
function areUnitsCompatible(
  type1: UnitSemanticType,
  type2: UnitSemanticType,
): boolean;
```

**Examples:**

```typescript
areUnitsCompatible("count", "count"); // → true
areUnitsCompatible("percentage", "percentage"); // → true
areUnitsCompatible("currency-amount", "currency-amount"); // → true

areUnitsCompatible("count", "index"); // → false
areUnitsCompatible("count", "percentage"); // → false
areUnitsCompatible("unknown", "count"); // → false
```

### `detectUnitTypeInconsistencies()`

```typescript
function detectUnitTypeInconsistencies(
  data: EconomicData[],
  options?: UnitTypeConsistencyOptions,
): UnitTypeConsistencyResult;

interface UnitTypeConsistencyOptions {
  dominantTypeThreshold?: number; // Default: 0.67
  includeDetails?: boolean; // Default: false
  filterIncompatible?: boolean; // Default: false
}

interface UnitTypeConsistencyResult {
  data: EconomicData[]; // All items (or filtered if filterIncompatible=true)
  incompatibleUnits: EconomicData[]; // Incompatible items (if filterIncompatible=true)
}
```

## Real-World Examples

### Example 1: Tourist Arrivals

```typescript
const data = [
  { id: "ARM", indicator: "Tourist Arrivals", value: 520394, units: "persons" },
  { id: "BRA", indicator: "Tourist Arrivals", value: 6774, units: "thousands" },
  {
    id: "VNM",
    indicator: "Tourist Arrivals",
    value: 15498,
    units: "thousands",
  },
  {
    id: "GRC",
    indicator: "Tourist Arrivals",
    value: 100,
    units: "Index (2020=100)",
  },
];

const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: { filterIncompatible: true },
});

// Classification:
// - persons → count
// - thousands → count
// - Index (2020=100) → index

// Result:
// - count: 3/4 = 75% (dominant)
// - index: 1/4 = 25% (incompatible)
// - Greece filtered out (semantic mismatch)
```

### Example 2: GDP Growth Rate

```typescript
const data = [
  { id: "USA", indicator: "GDP Growth Rate", value: 2.5, units: "%" },
  { id: "CHN", indicator: "GDP Growth Rate", value: 6.0, units: "percent" },
  { id: "IND", indicator: "GDP Growth Rate", value: 7.2, units: "Percent" },
  { id: "BRA", indicator: "GDP Growth Rate", value: 250000, units: "Thousand" },
];

// Classification:
// - %, percent, Percent → percentage
// - Thousand → count

// Result:
// - percentage: 3/4 = 75% (dominant)
// - count: 1/4 = 25% (incompatible)
// - Brazil flagged (likely data entry error)
```

### Example 3: Compatible Scale Variations

```typescript
const data = [
  { id: "ARM", indicator: "Population", value: 2963, units: "Thousand" },
  { id: "USA", indicator: "Population", value: 331, units: "Million" },
  { id: "CHN", indicator: "Population", value: 1412, units: "Million" },
  { id: "IND", indicator: "Population", value: 1.38, units: "Billion" },
];

// Classification:
// - Thousand → count
// - Million → count
// - Billion → count

// Result:
// - count: 4/4 = 100% (all compatible)
// - No warnings (scale variations OK for same semantic type)
```

## Best Practices

### 1. Always Enable for Multi-Country Data

```typescript
// ✅ DO: Enable for indicator-based normalization
const result = await processEconomicData(data, {
  autoTargetByIndicator: true,
  detectUnitTypeMismatches: true,
});

// ❌ DON'T: Skip unit type checking for multi-country indicators
```

### 2. Use Filtering for Clean Datasets

```typescript
// For production pipelines, filter incompatible items
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    filterIncompatible: true, // Remove bad data
  },
});

// Log what was filtered for audit trail
if (result.incompatibleUnits.length > 0) {
  console.log("Filtered incompatible units:", result.incompatibleUnits);
}
```

### 3. Review Warnings in Development

```typescript
// In development, keep warnings-only mode for review
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    filterIncompatible: false, // Keep all data
    includeDetails: true, // Get detailed stats
  },
});

// Review warnings
result.data.forEach((item) => {
  const warning = item.explain?.qualityWarnings?.find(
    (w) => w.type === "unit-type-mismatch",
  );
  if (warning) {
    console.log(`⚠️ ${item.id} (${item.indicator}): ${warning.message}`);
  }
});
```

### 4. Adjust Threshold for Edge Cases

```typescript
// For fragmented data with no clear majority, use lower threshold
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    dominantTypeThreshold: 0.50, // 50% instead of 67%
  },
});
```

### 5. Combine with Scale Outlier Detection

```typescript
// Use both checks together for comprehensive quality control
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: { filterIncompatible: true },

  detectScaleOutliers: true,
  scaleOutlierOptions: { filterOutliers: true },
});
```

## Troubleshooting

### Issue: Too Many False Positives

**Symptom:** Valid items being flagged as incompatible

**Solution:** Lower the dominant type threshold

```typescript
{
  dominantTypeThreshold: 0.50; // More lenient (50% vs 67%)
}
```

### Issue: Missing Incompatibilities

**Symptom:** Obviously incompatible items not being flagged

**Cause:** No clear dominant type (fragmented group)

**Solution:** Check type distribution

```typescript
{
  includeDetails: true; // See detailed type counts
}
```

### Issue: Unknown Unit Types

**Symptom:** Items classified as "unknown" type

**Solution:** Check unit string format, add pattern to classifier if needed

```typescript
classifyUnitType(item.units);
// If returns "unknown", the unit pattern may need to be added
```

## Performance

- **Classification:** O(1) per item (pattern matching)
- **Detection:** O(n) per indicator group (linear scan)
- **Total:** O(n) where n = total items
- **Memory:** O(n) (one pass, no extra data structures)

**Benchmark:** 10,000 items with 100 indicator groups:

- Classification: <5ms
- Detection: <20ms
- Total: <25ms

## See Also

- [Scale Outlier Detection Guide](./scale-outlier-detection.md) -
  Magnitude-based quality checks
- [Batch Processing Guide](./batch-processing.md) - Processing large datasets
- [Per-Indicator Normalization Guide](./per-indicator-normalization.md) -
  Auto-target configuration
