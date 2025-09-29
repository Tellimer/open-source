# Special Handling Configuration

## Overview

The `specialHandling` configuration allows you to override units and scales for specific indicators that have data quality issues in your source database.

## Problem

Sometimes databases store misleading unit labels that don't match the actual scale of the values:

**Example: Car Registrations**
```json
{
  "value": 51766,
  "units": "Thousand",
  "scale": "Thousands"
}
```

This is ambiguous! It could mean:
1. **51,766 thousands** (51.7 million cars) - What econify assumes
2. **51,766 cars** (the "Thousand" is just a label) - What it actually is

Without special handling, econify will multiply: `51,766 × 1,000 = 51,766,000` ❌

## Solution: Unit Overrides

Use `specialHandling.unitOverrides` to correct misleading labels:

```typescript
import { processEconomicDataByIndicator } from '@tellimer/econify';

const result = await processEconomicDataByIndicator(data, {
  targetCurrency: 'USD',
  autoTargetByIndicator: true,
  autoTargetDimensions: ['magnitude', 'time'],
  
  // ✅ Override misleading units
  specialHandling: {
    unitOverrides: [
      {
        // Match by indicator name (case-insensitive)
        indicatorNames: ['Car Registrations'],
        
        // Override the unit field
        overrideUnit: 'Units',
        
        // Override the scale field (null = no scaling)
        overrideScale: null,
        
        // Optional: reason for documentation
        reason: 'Database stores "Thousand" as label, not scale factor'
      }
    ]
  },
  
  explain: true,
});
```

## Configuration Options

### Match by Indicator Name

```typescript
specialHandling: {
  unitOverrides: [
    {
      indicatorNames: ['Car Registrations', 'Population'],
      overrideUnit: 'Units',
      overrideScale: null,
    }
  ]
}
```

- **Case-insensitive**: Matches "Car Registrations", "car registrations", "CAR REGISTRATIONS"
- **Exact match**: Must match the full indicator name

### Match by Indicator ID

```typescript
specialHandling: {
  unitOverrides: [
    {
      indicatorIds: ['ARGENTINACARREG', 'BRAZILCARREG', 'TAIWANCARREG'],
      overrideUnit: 'Units',
      overrideScale: null,
    }
  ]
}
```

- **Exact match**: Must match the indicator ID exactly
- **Useful for**: Targeting specific country indicators

### Multiple Overrides

You can define multiple overrides for different indicators:

```typescript
specialHandling: {
  unitOverrides: [
    {
      indicatorNames: ['Car Registrations'],
      overrideUnit: 'Units',
      overrideScale: null,
      reason: 'Database stores "Thousand" as label'
    },
    {
      indicatorNames: ['Population'],
      overrideUnit: 'People',
      overrideScale: null,
      reason: 'Database stores "Hundreds" as label'
    },
    {
      indicatorIds: ['SPECIAL_INDICATOR_123'],
      overrideUnit: 'Custom Unit',
      overrideScale: 'Millions',
      reason: 'Special case for legacy data'
    }
  ]
}
```

## How It Works

1. **Before parsing**: Econify checks if each data point matches any override rules
2. **If match found**: Replaces `unit` and `scale` fields with override values
3. **Then continues**: Normal parsing and normalization with corrected values

### Example Flow

**Without override:**
```
Input:  value=51766, unit="Thousand", scale="Thousands"
Parse:  Detects "Thousand" scale
Scale:  51766 × 1000 = 51,766,000 ❌ WRONG
```

**With override:**
```
Input:     value=51766, unit="Thousand", scale="Thousands"
Override:  unit="Units", scale=null
Parse:     No scale detected
Result:    51766 (unchanged) ✅ CORRECT
```

## When to Use

Use `specialHandling.unitOverrides` when:

✅ Database stores unit labels that don't match actual scale  
✅ Values are already in the labeled unit (no conversion needed)  
✅ You can't fix the source data  
✅ You need a quick workaround for data quality issues  

**Don't use when:**

❌ You can fix the source database  
❌ The units are correct and need conversion  
❌ You want to skip all normalization (use `exemptions` instead)  

## Comparison with Exemptions

| Feature | `specialHandling.unitOverrides` | `exemptions` |
|---------|--------------------------------|--------------|
| **Purpose** | Fix misleading units | Skip normalization entirely |
| **Magnitude conversion** | ✅ Applied (after override) | ❌ Skipped |
| **Time conversion** | ✅ Applied | ❌ Skipped |
| **Currency conversion** | ✅ Applied | ❌ Skipped |
| **Use case** | Data quality issues | Indicators that shouldn't be normalized |

## Real-World Example

### Problem: Car Registrations Data

Your database has:
```json
{
  "ARG": { "value": 51766, "units": "Thousand" },
  "BRA": { "value": 225400, "units": "Thousand" },
  "AUS": { "value": 16245, "units": "Units" }
}
```

The "Thousand" label is misleading - values are already actual car counts.

### Solution

```typescript
const result = await processEconomicDataByIndicator(econifyData, {
  targetCurrency: 'USD',
  autoTargetByIndicator: true,
  autoTargetDimensions: ['magnitude', 'time'],
  
  specialHandling: {
    unitOverrides: [
      {
        indicatorNames: ['Car Registrations'],
        overrideUnit: 'Units',
        overrideScale: null,
        reason: 'Database stores "Thousand" as label, not scale factor'
      }
    ]
  },
  
  explain: true,
});
```

### Result

```json
{
  "ARG": {
    "value": 51766,           // ✅ Unchanged (correct)
    "normalized_unit": "units"
  },
  "BRA": {
    "value": 225400,          // ✅ Unchanged (correct)
    "normalized_unit": "units"
  },
  "AUS": {
    "value": 16245,           // ✅ Unchanged (correct)
    "normalized_unit": "units"
  }
}
```

All values are now comparable!

## Logging

When an override is applied, econify logs:

```
🔧 Unit override applied to ARGENTINACARREG: Database stores 'Thousand' as label, not scale factor
```

This helps you track which indicators are being corrected.

## TypeScript Types

```typescript
interface UnitOverride {
  /** Indicator IDs to apply override to */
  indicatorIds?: string[];
  
  /** Indicator names to apply override to (case-insensitive) */
  indicatorNames?: string[];
  
  /** Override the unit field (e.g., "Units" instead of "Thousand") */
  overrideUnit?: string;
  
  /** Override the scale field (e.g., null to prevent scaling) */
  overrideScale?: string | null;
  
  /** Reason for the override (for documentation/logging) */
  reason?: string;
}

interface SpecialHandling {
  /** Unit/scale overrides for specific indicators */
  unitOverrides?: UnitOverride[];
}

interface PipelineOptions {
  // ... other options
  specialHandling?: SpecialHandling;
}
```

## Best Practices

1. **Document the reason**: Always include a `reason` field explaining why the override is needed
2. **Fix at source if possible**: Overrides are a workaround - fix the database if you can
3. **Test thoroughly**: Verify that overridden indicators produce correct results
4. **Use specific matches**: Prefer `indicatorIds` over `indicatorNames` for precision
5. **Monitor logs**: Check for override messages to ensure they're being applied

## See Also

- [Exemptions Documentation](./EXEMPTIONS.md) - Skip normalization entirely
- [Auto-Targeting Documentation](./AUTO_TARGETING.md) - Automatic target selection
- [Count Indicators](./COUNT_INDICATORS.md) - Handling count data

