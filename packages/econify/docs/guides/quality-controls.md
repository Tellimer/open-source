# Quality Controls

## Overview

Econify provides two complementary quality control systems to detect and handle
data quality issues in economic indicators:

1. **Unit Type Consistency Detection** - Identifies semantic incompatibilities
   (count vs index)
2. **Scale Outlier Detection** - Identifies magnitude mismatches (100x scale
   differences)

These checks can be used independently or together for comprehensive data
quality assurance.

## Quick Start

### Enable Both Checks

```typescript
import { processEconomicData } from "@tellimer/econify";

const result = await processEconomicData(data, {
  autoTargetByIndicator: true,

  // Semantic type checking
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    filterIncompatible: true,
  },

  // Magnitude checking
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    filterOutliers: true,
  },
});

// Clean data (passed both checks)
console.log("Clean items:", result.data.length);

// Filtered items
console.log("Incompatible types:", result.incompatibleUnits.length);
console.log("Scale outliers:", result.scaleOutliers.length);
```

## When to Use Each Check

### Unit Type Consistency Detection

**Use when:** You need to ensure all items in an indicator group have compatible
semantic types

**Detects:**

- Mixed unit types (count + index + percentage)
- Incompatible measurement semantics
- Database metadata errors

**Example problems:**

```
❌ Tourist Arrivals: 3 counts + 1 index
❌ GDP Growth: 3 percentages + 1 count
❌ Population: 3 counts + 1 ratio
```

**Learn more:** [Unit Type Consistency Guide](./unit-type-consistency.md)

### Scale Outlier Detection

**Use when:** You need to identify values on fundamentally different magnitude
scales

**Detects:**

- Inconsistent scale labeling (raw vs pre-scaled)
- 100x+ magnitude differences
- Data entry scale errors

**Example problems:**

```
❌ Tourist Arrivals (all "thousands"):
   - Armenia: 520,394 (actually persons)
   - Brazil: 6,774 (actually thousands)
   → 77x difference after normalization

❌ GDP (all "USD Billion"):
   - USA: 23000 (actually billions)
   - Country X: 23 (actually trillions)
   → 1000x difference
```

**Learn more:** [Scale Outlier Detection Guide](./scale-outlier-detection.md)

## Comparison Matrix

| Feature              | Unit Type Consistency                  | Scale Outlier Detection                  |
| -------------------- | -------------------------------------- | ---------------------------------------- |
| **What it detects**  | Semantic incompatibility               | Magnitude discrepancies                  |
| **Example issue**    | count vs index                         | 520,394 vs 6,774 (both counts)           |
| **Root cause**       | Wrong unit type in database            | Wrong scale labeling                     |
| **Detection method** | Pattern matching → compatibility rules | Log-scale clustering → outlier detection |
| **Threshold**        | Dominant type (67% majority)           | Magnitude difference (100x)              |
| **Execution order**  | First (filters by type)                | Second (checks magnitudes)               |
| **Performance**      | O(n) linear                            | O(n log n) sorting                       |
| **Best for**         | Multi-type data quality                | Scale mislabeling issues                 |

## How They Work Together

### Execution Pipeline

```
Input Data
    ↓
┌─────────────────────────────────────────┐
│ 1. Unit Type Consistency Detection     │
│    - Classify unit types                │
│    - Find dominant type                 │
│    - Flag incompatible types            │
└─────────────────────────────────────────┘
    ↓
Filtered Items (compatible types only)
    ↓
┌─────────────────────────────────────────┐
│ 2. Scale Outlier Detection              │
│    - Transform to log scale             │
│    - Cluster by magnitude               │
│    - Flag magnitude outliers            │
└─────────────────────────────────────────┘
    ↓
Clean Data (passed both checks)
```

### Combined Example

```typescript
Input: Tourist Arrivals
├─ Armenia: 520,394 "persons"
├─ Brazil: 6,774 "thousands"
├─ Vietnam: 15,498 "thousands"
└─ Greece: 100 "Index (2020=100)"

Step 1: Unit Type Check
├─ Armenia: count ✓
├─ Brazil: count ✓
├─ Vietnam: count ✓
└─ Greece: index ❌ FILTERED (incompatible with count majority)

Remaining after Step 1:
├─ Armenia: 520,394
├─ Brazil: 6,774
└─ Vietnam: 15,498

Step 2: Scale Outlier Check (after normalization ×1000)
├─ Armenia: 520,394,000 (log10: 8.72) ❌ FILTERED (77x outlier)
├─ Brazil: 6,774,000 (log10: 6.83) ✓
└─ Vietnam: 15,498,000 (log10: 7.19) ✓

Final Result:
├─ Brazil: 6,774,000 ✓
└─ Vietnam: 15,498,000 ✓

Filtered Items:
├─ incompatibleUnits: [Greece] (wrong type)
└─ scaleOutliers: [Armenia] (wrong scale)
```

## Usage Patterns

### 1. Development Mode (Warnings Only)

Keep all data but add warnings for manual review:

```typescript
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    filterIncompatible: false, // Keep all data
    includeDetails: true, // Get statistics
  },

  detectScaleOutliers: true,
  scaleOutlierOptions: {
    filterOutliers: false, // Keep all data
    includeDetails: true, // Get cluster info
  },
});

// Review warnings
result.data.forEach((item) => {
  if (item.explain?.qualityWarnings) {
    item.explain.qualityWarnings.forEach((warning) => {
      console.log(`⚠️ ${item.id}: ${warning.type} - ${warning.message}`);
    });
  }
});
```

### 2. Production Mode (Automatic Filtering)

Remove problematic data automatically:

```typescript
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    filterIncompatible: true, // Auto-remove
  },

  detectScaleOutliers: true,
  scaleOutlierOptions: {
    filterOutliers: true, // Auto-remove
  },
});

// Log filtered items for audit trail
console.log("Filtered incompatible:", result.incompatibleUnits);
console.log("Filtered outliers:", result.scaleOutliers);

// Use clean data
return result.data;
```

### 3. Selective Filtering

Filter only one type of issue:

```typescript
// Filter semantic issues, keep magnitude warnings
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    filterIncompatible: true, // Remove
  },

  detectScaleOutliers: true,
  scaleOutlierOptions: {
    filterOutliers: false, // Keep with warnings
  },
});
```

### 4. Strict Quality Control

Use stricter thresholds:

```typescript
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    dominantTypeThreshold: 0.80, // 80% majority required
    filterIncompatible: true,
  },

  detectScaleOutliers: true,
  scaleOutlierOptions: {
    magnitudeDifferenceThreshold: 1.0, // 10x instead of 100x
    clusterThreshold: 0.80,
    filterOutliers: true,
  },
});
```

### 5. Lenient Quality Control

Use lenient thresholds for noisy data:

```typescript
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    dominantTypeThreshold: 0.50, // 50% majority
    filterIncompatible: false, // Warnings only
  },

  detectScaleOutliers: true,
  scaleOutlierOptions: {
    magnitudeDifferenceThreshold: 3.0, // 1000x difference
    clusterThreshold: 0.50,
    filterOutliers: false, // Warnings only
  },
});
```

## Configuration Reference

### Unit Type Options

```typescript
interface UnitTypeConsistencyOptions {
  // Threshold for dominant type
  // - 0.67 (default) = 67% majority required
  // - Higher = stricter (requires stronger consensus)
  // - Lower = more lenient (accepts weaker majority)
  dominantTypeThreshold?: number;

  // Include detailed type distribution statistics
  includeDetails?: boolean;

  // Remove incompatible items from results
  filterIncompatible?: boolean;
}
```

### Scale Outlier Options

```typescript
interface ScaleOutlierOptions {
  // Minimum cluster size for majority
  // - 0.67 (default) = 67% of items in cluster
  // - Higher = stricter (requires larger majority cluster)
  // - Lower = more lenient (accepts smaller clusters)
  clusterThreshold?: number;

  // Magnitude difference threshold (log10 units)
  // - 1.0 = 10x difference
  // - 2.0 (default) = 100x difference
  // - 3.0 = 1000x difference
  magnitudeDifferenceThreshold?: number;

  // Include detailed cluster distribution
  includeDetails?: boolean;

  // Remove outlier items from results
  filterOutliers?: boolean;
}
```

## Real-World Scenarios

### Scenario 1: Tourism Data

**Problem:** Mixed unit types and scale issues

```typescript
Input:
├─ Armenia: 520,394 "persons" (count, wrong scale)
├─ Brazil: 6,774 "thousands" (count, correct)
├─ Vietnam: 15,498 "thousands" (count, correct)
└─ Greece: 100 "Index (2020=100)" (index, wrong type)

Solution:
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: { filterIncompatible: true },
  detectScaleOutliers: true,
  scaleOutlierOptions: { filterOutliers: true },
});

Result:
✓ Brazil, Vietnam retained (compatible type + correct scale)
✗ Greece filtered (incompatible type)
✗ Armenia filtered (magnitude outlier)
```

### Scenario 2: GDP Growth Rates

**Problem:** Single count value in percentage data

```typescript
Input:
├─ USA: 2.5 "%" (percentage)
├─ China: 6.0 "percent" (percentage)
├─ India: 7.2 "Percent" (percentage)
└─ Brazil: 250000 "Thousand" (count - likely data error)

Solution:
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: { filterIncompatible: true },
});

Result:
✓ USA, China, India retained (percentage majority)
✗ Brazil filtered (count incompatible with percentage)
```

### Scenario 3: Population Data

**Problem:** All same type but different scales

```typescript
Input:
├─ Armenia: 2,963 "Thousand"
├─ USA: 331 "Million"
├─ China: 1,412 "Million"
└─ India: 1.38 "Billion"

Solution:
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,  // All count → pass
  detectScaleOutliers: true,  // Similar magnitudes → pass
});

Result:
✓ All retained (compatible types + reasonable scales)
```

### Scenario 4: Mixed Financial Data

**Problem:** Multiple issues in fragmented data

```typescript
Input:
├─ Country A: 100 "USD Million" (currency)
├─ Country B: 150 "EUR Million" (currency)
├─ Country C: 200 "%" (percentage)
└─ Country D: 50 "Index" (index)

Solution:
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    dominantTypeThreshold: 0.50,  // Lower threshold
    filterIncompatible: true,
  },
});

Result:
✓ Country A, B retained (currency majority with 50% threshold)
✗ Country C, D filtered (incompatible with currency)
```

## Best Practices

### 1. Always Enable Both Checks for Multi-Country Data

```typescript
// ✅ DO: Comprehensive quality control
const result = await processEconomicData(data, {
  autoTargetByIndicator: true,
  detectUnitTypeMismatches: true,
  detectScaleOutliers: true,
});

// ❌ DON'T: Skip quality checks
const result = await processEconomicData(data, {
  autoTargetByIndicator: true,
});
```

### 2. Use Filtering in Production, Warnings in Development

```typescript
// Development: Review warnings
const devResult = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    filterIncompatible: false,
    includeDetails: true,
  },
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    filterOutliers: false,
    includeDetails: true,
  },
});

// Production: Auto-filter
const prodResult = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: { filterIncompatible: true },
  detectScaleOutliers: true,
  scaleOutlierOptions: { filterOutliers: true },
});
```

### 3. Log Filtered Items for Audit Trail

```typescript
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: { filterIncompatible: true },
  detectScaleOutliers: true,
  scaleOutlierOptions: { filterOutliers: true },
});

// Create audit log
const auditLog = {
  timestamp: new Date(),
  totalInput: data.length,
  cleanOutput: result.data.length,
  incompatibleTypes: result.incompatibleUnits.map((item) => ({
    id: item.id,
    indicator: item.indicator,
    units: item.units,
  })),
  scaleOutliers: result.scaleOutliers.map((item) => ({
    id: item.id,
    indicator: item.indicator,
    value: item.value,
    units: item.units,
  })),
};

console.log("Quality control audit:", JSON.stringify(auditLog, null, 2));
```

### 4. Adjust Thresholds Based on Data Quality

```typescript
// High-quality curated data → Strict
const result = await processEconomicData(curatedData, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    dominantTypeThreshold: 0.80,
    filterIncompatible: true,
  },
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    magnitudeDifferenceThreshold: 1.0, // 10x
    clusterThreshold: 0.80,
    filterOutliers: true,
  },
});

// Raw crowdsourced data → Lenient
const result = await processEconomicData(rawData, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    dominantTypeThreshold: 0.50,
    filterIncompatible: false, // Warnings only
  },
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    magnitudeDifferenceThreshold: 3.0, // 1000x
    clusterThreshold: 0.50,
    filterOutliers: false, // Warnings only
  },
});
```

### 5. Monitor Quality Metrics

```typescript
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: { filterIncompatible: true },
  detectScaleOutliers: true,
  scaleOutlierOptions: { filterOutliers: true },
});

// Calculate quality metrics
const metrics = {
  inputCount: data.length,
  outputCount: result.data.length,
  incompatibleRate: result.incompatibleUnits.length / data.length,
  outlierRate: result.scaleOutliers.length / data.length,
  passRate: result.data.length / data.length,
};

// Alert if quality drops
if (metrics.passRate < 0.80) {
  console.warn(
    "⚠️ Low data quality: only",
    (metrics.passRate * 100).toFixed(1),
    "% passed checks",
  );
}
```

## Troubleshooting

### Problem: Too Many Items Filtered

**Symptoms:**

- High filter rate (>20%)
- Many valid-looking items removed

**Diagnosis:**

```typescript
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: {
    filterIncompatible: false, // Keep for inspection
    includeDetails: true,
  },
  detectScaleOutliers: true,
  scaleOutlierOptions: {
    filterOutliers: false, // Keep for inspection
    includeDetails: true,
  },
});

// Inspect warnings
result.data.forEach((item) => {
  item.explain?.qualityWarnings?.forEach((w) => {
    console.log(item.id, w.type, w.context);
  });
});
```

**Solutions:**

1. Lower thresholds (more lenient)
2. Check if data is genuinely fragmented
3. Review unit type classifications

### Problem: Obvious Issues Not Detected

**Symptoms:**

- Bad data passing checks
- Known outliers not flagged

**Diagnosis:**

```typescript
// Enable detailed output
const result = await processEconomicData(data, {
  detectUnitTypeMismatches: true,
  unitTypeOptions: { includeDetails: true },
  detectScaleOutliers: true,
  scaleOutlierOptions: { includeDetails: true },
});

// Check cluster distribution
console.log("Type distribution:", result.data[0].explain?.qualityWarnings);
```

**Solutions:**

1. Increase threshold strictness
2. Check if majority cluster is wrong
3. Verify unit classification logic

### Problem: Performance Issues

**Symptoms:**

- Slow processing with large datasets

**Solutions:**

```typescript
// 1. Disable details if not needed
{
  unitTypeOptions: { includeDetails: false },
  scaleOutlierOptions: { includeDetails: false },
}

// 2. Process in batches
const batchSize = 1000;
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  const result = await processEconomicData(batch, options);
  // Process result
}
```

## Performance Considerations

### Complexity

| Operation                  | Time Complexity | Notes                      |
| -------------------------- | --------------- | -------------------------- |
| Unit type classification   | O(n)            | Pattern matching per item  |
| Type consistency detection | O(n)            | Group by indicator + count |
| Scale transformation       | O(n)            | Log10 per item             |
| Magnitude clustering       | O(n log n)      | Sorting per group          |
| Outlier detection          | O(c)            | c = clusters (~2-3)        |
| **Total**                  | **O(n log n)**  | Dominated by sorting       |

### Benchmarks

**10,000 items, 100 indicator groups:**

- Unit type checking: ~25ms
- Scale outlier detection: ~45ms
- **Combined: ~70ms**

**100,000 items, 1,000 indicator groups:**

- Unit type checking: ~250ms
- Scale outlier detection: ~450ms
- **Combined: ~700ms**

### Memory Usage

- Unit type: O(n) - stores type for each item
- Scale outlier: O(n) - stores magnitude for each item
- **Combined: O(n)** - linear memory

## See Also

- **[Unit Type Consistency Detection](./unit-type-consistency.md)** - Detailed
  guide on semantic type checking
- **[Scale Outlier Detection](./scale-outlier-detection.md)** - Detailed guide
  on magnitude outlier detection
- **[Batch Processing](./batch-processing.md)** - Processing large datasets
  efficiently
- **[Per-Indicator Normalization](./per-indicator-normalization.md)** -
  Auto-target configuration
