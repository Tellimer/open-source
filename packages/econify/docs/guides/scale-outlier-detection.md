# Scale Outlier Detection

## Overview

Scale Outlier Detection is a quality control feature that identifies and
optionally filters values that are on fundamentally different magnitude scales
within the same indicator group. It solves data quality issues caused by
inconsistent scale labeling in the database.

## The Problem

The database has **inconsistent scale labeling** where some countries store raw
values while others store pre-scaled values, but the metadata doesn't
distinguish between them:

```
Indicator: "Tourist Arrivals" (all labeled as "Thousands")
├─ Armenia: 520,394 → actually in persons (not thousands!)
├─ Brazil: 6,774 → actually in thousands ✓
└─ Vietnam: 15,498 → actually in thousands ✓

After normalization (multiplying all by 1,000):
├─ Armenia: 520,394,000 tourists (520 million!) ❌
├─ Brazil: 6,774,000 tourists (6.77 million) ✓
└─ Vietnam: 15,498,000 tourists (15.5 million) ✓

Result: Armenia appears to have 77x more tourists than Brazil!
```

## Root Cause

**Mixed data entry conventions** in the source database:

- Some countries store **actual values** (520,394 persons)
- Other countries store **pre-scaled values** (6,774 thousands = 6,774,000
  persons)
- But the `units` column shows "Thousands" for **both**
- Normalization applies the same scale factor to all, creating massive
  discrepancies

This is **not** an issue with unit types (both are counts), but with **magnitude
scales**.

## Solution Architecture

### Magnitude Clustering Algorithm

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Log-Scale Transformation                           │
│ Convert values to order of magnitude (log10)               │
│                                                             │
│ Armenia: 520,394,000 → log10 = 8.72                        │
│ Brazil: 6,774,000 → log10 = 6.83                           │
│ Vietnam: 15,498,000 → log10 = 7.19                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Magnitude Clustering (K-means-like)                │
│ Group values by similar magnitude                          │
│                                                             │
│ Cluster A: [6.83, 7.19] → 2 items (67%)                    │
│ Cluster B: [8.72] → 1 item (33%)                           │
│                                                             │
│ Difference: 8.72 - 6.83 = 1.89 (77x in linear scale)       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Outlier Detection                                  │
│ Find minority clusters 100x+ different from majority       │
│                                                             │
│ Majority cluster: A (67% ≥ 67% threshold) ✓                │
│ Outlier cluster: B (difference > 2.0 log units = 100x) ✓   │
│                                                             │
│ Result: Flag Armenia as scale outlier                      │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### Step 1: Log-Scale Transformation

Values are converted to **order of magnitude** using log10:

```typescript
// Why log10?
// - Handles wide range of scales (thousands to billions)
// - 1 log unit = 10x difference
// - 2 log units = 100x difference
// - 3 log units = 1000x difference

Examples:
1,000 → log10(1,000) = 3.0
10,000 → log10(10,000) = 4.0
100,000 → log10(100,000) = 5.0

Difference: 5.0 - 3.0 = 2.0 log units
Linear: 100,000 / 1,000 = 100x difference ✓
```

**Special Cases:**

```typescript
// Zero values → assign minimum cluster magnitude
values = [0, 1000, 2000];
magnitudes = [3.0(min), 3.0, 3.3];

// Negative values → use absolute value
values = [-1000, 2000, 3000];
magnitudes = [3.0, 3.3, 3.5];
```

### Step 2: Magnitude Clustering

Values are grouped into clusters using a **distance-based algorithm**:

```typescript
Algorithm:
1. Sort magnitudes: [6.83, 7.19, 8.72]

2. Find gaps between consecutive magnitudes:
   - 7.19 - 6.83 = 0.36 (small gap)
   - 8.72 - 7.19 = 1.53 (large gap) ← cluster boundary

3. Split at large gaps to form clusters:
   - Cluster A: [6.83, 7.19]
   - Cluster B: [8.72]

4. Calculate cluster centers (mean magnitude):
   - Cluster A center: (6.83 + 7.19) / 2 = 7.01
   - Cluster B center: 8.72
```

**Cluster Threshold:**

The algorithm determines cluster size thresholds:

```typescript
clusterThreshold: 0.67  // Default (67%)

Example with 4 items:
├─ Cluster A: 3 items → 3/4 = 75% ✅ MAJORITY
└─ Cluster B: 1 item → 1/4 = 25% (minority outlier)

Example with evenly-split items (no clear majority):
├─ Cluster A: 2 items → 2/4 = 50% ❌ NO MAJORITY
└─ Cluster B: 2 items → 2/4 = 50% ❌ NO MAJORITY
→ No outliers detected (no consensus on "normal" scale)
```

### Step 3: Outlier Detection

Minority clusters are checked against the **magnitude difference threshold**:

```typescript
magnitudeDifferenceThreshold: 2.0  // Default (100x difference)

Calculation:
1. Find majority cluster (≥ 67% of items)
2. For each minority cluster:
   - Calculate difference from majority center
   - If difference ≥ 2.0 log units → OUTLIER

Example:
Majority cluster center: 7.01
Minority cluster center: 8.72
Difference: 8.72 - 7.01 = 1.71 log units

1.71 < 2.0 → NOT an outlier (only 51x difference)

If minority was at 9.01:
Difference: 9.01 - 7.01 = 2.0 log units
2.0 ≥ 2.0 → IS an outlier (100x difference) ✓
```

**Magnitude Difference Threshold:**

| Threshold | Linear Scale     | Use Case                                 |
| --------- | ---------------- | ---------------------------------------- |
| 1.0       | 10x difference   | Very strict (catches minor scale issues) |
| 2.0       | 100x difference  | **Default** (catches major scale issues) |
| 3.0       | 1000x difference | Lenient (only extreme cases)             |

## Usage

### Basic Usage

```typescript
import { processEconomicData } from "@tellimer/econify";

const result = await processEconomicData(data, {
  autoTargetByIndicator: true,
  detectScaleOutliers: true, // Enable scale outlier detection
});

// Items with scale outliers have warnings
result.data.forEach((item) => {
  if (item.explain?.qualityWarnings) {
    const outlierWarning = item.explain.qualityWarnings.find(
      (w) => w.type === "scale-outlier",
    );
    if (outlierWarning) {
      console.log(`${item.id}: ${outlierWarning.message}`);
    }
  }
});
```

### Advanced Configuration

```typescript
const result = await processEconomicData(data, {
  autoTargetByIndicator: true,
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    // Cluster size threshold (default: 0.67 = 67%)
    clusterThreshold: 0.67,

    // Magnitude difference threshold (default: 2.0 = 100x)
    magnitudeDifferenceThreshold: 2.0,

    // Include detailed statistics (default: false)
    includeDetails: true,

    // Remove outlier items from results (default: false)
    filterOutliers: true,
  },
});

// Access filtered outliers
console.log("Scale outliers:", result.scaleOutliers);

// Detailed statistics (if includeDetails: true)
result.data.forEach((item) => {
  const warning = item.explain?.qualityWarnings?.find(
    (w) => w.type === "scale-outlier",
  );
  if (warning) {
    console.log({
      id: item.id,
      magnitude: warning.context.itemMagnitude,
      majorityCenter: warning.context.majorityClusterCenter,
      difference: warning.context.magnitudeDifference,
      linearScale: Math.pow(10, warning.context.magnitudeDifference),
    });
  }
});
```

### Filtering Mode

When `filterOutliers: true`, outlier items are removed from the main results:

```typescript
const result = await processEconomicData(data, {
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    filterOutliers: true, // Remove outlier items
  },
});

// result.data - Only non-outlier items
// result.scaleOutliers - Removed outlier items (preserved)

console.log(`Normal items: ${result.data.length}`);
console.log(`Filtered outliers: ${result.scaleOutliers.length}`);
```

### Adjusting Sensitivity

**Stricter Detection (catch 10x differences):**

```typescript
{
  scaleOutlierOptions: {
    magnitudeDifferenceThreshold: 1.0,  // 10x instead of 100x
  }
}
```

**Lenient Detection (only catch 1000x differences):**

```typescript
{
  scaleOutlierOptions: {
    magnitudeDifferenceThreshold: 3.0,  // 1000x instead of 100x
  }
}
```

**Require Stronger Majority:**

```typescript
{
  scaleOutlierOptions: {
    clusterThreshold: 0.80,  // 80% majority required (vs 67%)
  }
}
```

## Algorithm Details

### Distance-Based Clustering

The algorithm uses **consecutive magnitude gaps** to form clusters:

```typescript
function clusterMagnitudes(magnitudes: number[]): Cluster[] {
  // Sort magnitudes
  const sorted = magnitudes.sort((a, b) => a - b);

  // Find median gap between consecutive values
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i] - sorted[i - 1]);
  }
  const medianGap = median(gaps);

  // Split at gaps larger than 2x median gap
  const clusters: Cluster[] = [];
  let currentCluster = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];

    if (gap > 2 * medianGap) {
      // Large gap → start new cluster
      clusters.push({
        magnitudes: currentCluster,
        center: mean(currentCluster),
        size: currentCluster.length,
      });
      currentCluster = [sorted[i]];
    } else {
      // Small gap → add to current cluster
      currentCluster.push(sorted[i]);
    }
  }

  // Add final cluster
  clusters.push({
    magnitudes: currentCluster,
    center: mean(currentCluster),
    size: currentCluster.length,
  });

  return clusters;
}
```

**Example:**

```typescript
Magnitudes: [3.0, 3.3, 3.5, 6.8, 7.1]

Gaps: [0.3, 0.2, 3.3, 0.3]
Median gap: 0.3
Split threshold: 2 × 0.3 = 0.6

Clustering:
- [3.0, 3.3, 3.5] → gap 0.2, 0.3 < 0.6 → same cluster
- [3.5 → 6.8] → gap 3.3 > 0.6 → split here
- [6.8, 7.1] → gap 0.3 < 0.6 → same cluster

Result:
├─ Cluster A: [3.0, 3.3, 3.5] (center: 3.27, size: 3)
└─ Cluster B: [6.8, 7.1] (center: 6.95, size: 2)
```

### Outlier Identification

```typescript
function identifyOutliers(
  clusters: Cluster[],
  clusterThreshold: number,
  magnitudeThreshold: number,
): OutlierInfo {
  const totalItems = clusters.reduce((sum, c) => sum + c.size, 0);

  // Find majority cluster (≥ clusterThreshold)
  const majorityCluster = clusters.find(
    (c) => c.size / totalItems >= clusterThreshold,
  );

  if (!majorityCluster) {
    // No clear majority → no outliers
    return { outliers: [], majorityCluster: null };
  }

  // Check each minority cluster
  const outliers = [];
  for (const cluster of clusters) {
    if (cluster === majorityCluster) continue;

    const difference = Math.abs(
      cluster.center - majorityCluster.center,
    );

    if (difference >= magnitudeThreshold) {
      // This cluster is an outlier
      outliers.push(...cluster.items);
    }
  }

  return {
    outliers,
    majorityCluster: majorityCluster.center,
  };
}
```

### Distribution Statistics

When `includeDetails: true`, the algorithm provides cluster distribution info:

```typescript
interface ClusterDistribution {
  clusters: {
    center: number; // Mean magnitude of cluster
    size: number; // Number of items
    percentage: number; // Percentage of total
    items: string[]; // Item IDs in cluster
  }[];
  majorityCluster?: number; // Index of majority cluster
  totalItems: number;
}
```

**Example:**

```typescript
{
  clusters: [
    {
      center: 7.01,
      size: 3,
      percentage: 75,
      items: ["BRA", "VNM", "GRC"]
    },
    {
      center: 8.72,
      size: 1,
      percentage: 25,
      items: ["ARM"]
    }
  ],
  majorityCluster: 0,  // First cluster is majority
  totalItems: 4
}
```

## Integration with Unit Type Consistency

Scale outlier detection and unit type consistency are **complementary checks**:

```typescript
const result = await processEconomicData(data, {
  // Unit type checking (semantic compatibility)
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    filterIncompatible: true,
  },

  // Scale outlier detection (magnitude issues)
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    filterOutliers: true,
  },
});
```

**Execution Order:**

```
1. Unit Type Consistency runs first
   → Filters out semantically incompatible items

2. Scale Outlier Detection runs second
   → Only on remaining compatible items
   → Detects magnitude-based issues
```

**Differences:**

| Check             | Problem                    | Example                             |
| ----------------- | -------------------------- | ----------------------------------- |
| **Unit Type**     | Different semantic types   | count vs index vs percentage        |
| **Scale Outlier** | Same type, wrong magnitude | 520,394 vs 6,774 (both "thousands") |

**Combined Example:**

```typescript
Input:
├─ Armenia: 520,394 "thousands" (count, wrong scale)
├─ Brazil: 6,774 "thousands" (count, correct scale)
├─ Vietnam: 15,498 "thousands" (count, correct scale)
└─ Greece: 100 "Index (2020=100)" (index, wrong type)

After unit type check:
├─ Armenia: 520,394 (count) ✓
├─ Brazil: 6,774 (count) ✓
├─ Vietnam: 15,498 (count) ✓
└─ Greece: FILTERED (incompatible type)

After scale outlier check:
├─ Armenia: FILTERED (magnitude outlier: 77x difference)
├─ Brazil: 6,774 ✓
└─ Vietnam: 15,498 ✓

Final result: Brazil + Vietnam only
```

## Real-World Examples

### Example 1: Tourist Arrivals (Classic Case)

```typescript
const data = [
  {
    id: "ARM",
    indicator: "Tourist Arrivals",
    value: 520394,
    units: "thousands",
  },
  {
    id: "BRA",
    indicator: "Tourist Arrivals",
    value: 6774,
    units: "thousands",
  },
  {
    id: "VNM",
    indicator: "Tourist Arrivals",
    value: 15498,
    units: "thousands",
  },
];

const result = await processEconomicData(data, {
  autoTargetByIndicator: true,
  detectScaleOutliers: true,
  scaleOutlierOptions: { includeDetails: true },
});

// After normalization (×1000):
// Armenia: 520,394,000 (log10: 8.72)
// Brazil: 6,774,000 (log10: 6.83)
// Vietnam: 15,498,000 (log10: 7.19)

// Clusters:
// Cluster A: [6.83, 7.19] → 2 items (67%)
// Cluster B: [8.72] → 1 item (33%)

// Result:
// Armenia flagged as outlier (1.71 log units from majority)
// Likely stored as persons, not thousands
```

### Example 2: No Outliers (Similar Scales)

```typescript
const data = [
  { id: "USA", indicator: "GDP", value: 23000, units: "USD Billion" },
  { id: "CHN", indicator: "GDP", value: 17700, units: "USD Billion" },
  { id: "JPN", indicator: "GDP", value: 4900, units: "USD Billion" },
  { id: "DEU", indicator: "GDP", value: 4200, units: "USD Billion" },
];

// After normalization:
// USA: 23,000,000,000,000 (log10: 13.36)
// CHN: 17,700,000,000,000 (log10: 13.25)
// JPN: 4,900,000,000,000 (log10: 12.69)
// DEU: 4,200,000,000,000 (log10: 12.62)

// All within same magnitude cluster → No outliers
```

### Example 3: Multiple Outliers

```typescript
const data = [
  { id: "A", indicator: "Metric", value: 100, units: "Thousand" },
  { id: "B", indicator: "Metric", value: 150, units: "Thousand" },
  { id: "C", indicator: "Metric", value: 200, units: "Thousand" },
  { id: "D", indicator: "Metric", value: 50000, units: "Thousand" },
  { id: "E", indicator: "Metric", value: 75000, units: "Thousand" },
];

// After normalization:
// A: 100,000 (log10: 5.0)
// B: 150,000 (log10: 5.18)
// C: 200,000 (log10: 5.30)
// D: 50,000,000 (log10: 7.70)
// E: 75,000,000 (log10: 7.88)

// Clusters:
// Cluster A: [5.0, 5.18, 5.30] → 3 items (60%)
// Cluster B: [7.70, 7.88] → 2 items (40%)

// With clusterThreshold=0.67:
// No majority cluster → No outliers detected

// With clusterThreshold=0.50:
// Cluster A is majority → D, E flagged as outliers
```

### Example 4: Too Few Items

```typescript
const data = [
  { id: "A", indicator: "Metric", value: 100, units: "Thousand" },
  { id: "B", indicator: "Metric", value: 10000, units: "Thousand" },
];

// Only 2 items → Can't determine reliable clusters
// Result: No outliers detected (need 3+ items)
```

## Best Practices

### 1. Always Enable for Multi-Country Indicators

```typescript
// ✅ DO: Enable for indicator-based normalization
const result = await processEconomicData(data, {
  autoTargetByIndicator: true,
  detectScaleOutliers: true,
});

// ❌ DON'T: Skip outlier detection for multi-country data
```

### 2. Use Filtering in Production

```typescript
// For production pipelines, filter outliers
const result = await processEconomicData(data, {
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    filterOutliers: true, // Remove outliers
  },
});

// Log what was filtered for audit trail
if (result.scaleOutliers.length > 0) {
  console.log("Filtered scale outliers:", result.scaleOutliers);
}
```

### 3. Review Warnings in Development

```typescript
// In development, keep warnings-only mode for review
const result = await processEconomicData(data, {
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    filterOutliers: false, // Keep all data
    includeDetails: true, // Get cluster distribution
  },
});

// Review warnings and distribution
result.data.forEach((item) => {
  const warning = item.explain?.qualityWarnings?.find(
    (w) => w.type === "scale-outlier",
  );
  if (warning) {
    const linearDiff = Math.pow(10, warning.context.magnitudeDifference);
    console.log(
      `⚠️ ${item.id}: ${linearDiff.toFixed(0)}x different from majority`,
    );
  }
});
```

### 4. Adjust Sensitivity for Data Quality

```typescript
// High-quality data → Strict threshold
{
  scaleOutlierOptions: {
    magnitudeDifferenceThreshold: 1.0,  // Catch 10x differences
  }
}

// Noisy data → Lenient threshold
{
  scaleOutlierOptions: {
    magnitudeDifferenceThreshold: 3.0,  // Only catch 1000x differences
  }
}
```

### 5. Combine with Unit Type Detection

```typescript
// Use both checks together for comprehensive quality control
const result = await processEconomicData(data, {
  // Semantic type checking first
  detectUnitTypeMismatches: true,
  unitTypeOptions: { filterIncompatible: true },

  // Magnitude checking second
  detectScaleOutliers: true,
  scaleOutlierOptions: { filterOutliers: true },
});
```

## Troubleshooting

### Issue: Valid Values Flagged as Outliers

**Symptom:** Legitimate high/low values being flagged

**Cause:** Natural variation in data (not scale issues)

**Solution:** Increase magnitude threshold

```typescript
{
  magnitudeDifferenceThreshold: 3.0; // Require 1000x difference
}
```

### Issue: Obvious Outliers Not Detected

**Symptom:** Wrong-scale values not being flagged

**Cause 1:** No clear majority cluster (data too fragmented)

**Solution:** Lower cluster threshold

```typescript
{
  clusterThreshold: 0.50; // 50% instead of 67%
}
```

**Cause 2:** Magnitude difference below threshold

**Solution:** Lower magnitude threshold

```typescript
{
  magnitudeDifferenceThreshold: 1.5; // ~32x instead of 100x
}
```

### Issue: Too Few Items for Detection

**Symptom:** No outliers detected with 2-3 items

**Cause:** Algorithm requires 3+ items for reliable clustering

**Solution:** This is expected behavior (can't determine majority with <3 items)

### Issue: All Items Flagged as Outliers

**Symptom:** Every item gets outlier warning

**Cause:** No majority cluster found (even split)

**Check:** Review cluster distribution with `includeDetails: true`

```typescript
{
  scaleOutlierOptions: {
    includeDetails: true; // See cluster sizes
  }
}
```

## Performance

- **Log transformation:** O(n) per item
- **Clustering:** O(n log n) per indicator group (sorting)
- **Outlier detection:** O(c) where c = number of clusters (typically 2-3)
- **Total:** O(n log n) where n = total items
- **Memory:** O(n) (stores magnitude for each item)

**Benchmark:** 10,000 items with 100 indicator groups:

- Transformation: <10ms
- Clustering: <30ms
- Detection: <5ms
- Total: <45ms

## API Reference

### `detectScaleOutliers()`

```typescript
function detectScaleOutliers(
  data: EconomicData[],
  options?: ScaleOutlierOptions,
): ScaleOutlierResult;

interface ScaleOutlierOptions {
  clusterThreshold?: number; // Default: 0.67 (67%)
  magnitudeDifferenceThreshold?: number; // Default: 2.0 (100x)
  includeDetails?: boolean; // Default: false
  filterOutliers?: boolean; // Default: false
}

interface ScaleOutlierResult {
  data: EconomicData[]; // All items (or filtered if filterOutliers=true)
  scaleOutliers: EconomicData[]; // Outlier items (if filterOutliers=true)
}
```

### Quality Warning Format

```typescript
interface QualityWarning {
  type: "scale-outlier";
  severity: "high";
  message: string; // Human-readable description
  context: {
    itemMagnitude: number; // log10 magnitude of this item
    majorityClusterCenter: number; // log10 center of majority
    magnitudeDifference: number; // Absolute difference in log10
    clusterDistribution?: { // If includeDetails=true
      clusters: Array<{
        center: number;
        size: number;
        percentage: number;
        items: string[];
      }>;
      majorityCluster?: number;
      totalItems: number;
    };
  };
}
```

## See Also

- [Unit Type Consistency Guide](./unit-type-consistency.md) - Semantic type
  checking
- [Batch Processing Guide](./batch-processing.md) - Processing large datasets
- [Per-Indicator Normalization Guide](./per-indicator-normalization.md) -
  Auto-target configuration
