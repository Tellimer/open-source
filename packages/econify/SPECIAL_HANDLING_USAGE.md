# Special Handling: Quick Start Guide

## For Your Consuming App

### Problem You're Facing

Your Car Registrations data has misleading unit labels:

```json
{
  "ARG": {
    "value": 51766,
    "units": "Thousand",  // ⚠️ Misleading! Value is already the count
    "periodicity": "Monthly"
  }
}
```

Econify sees "Thousand" and multiplies: `51,766 × 1,000 = 51,766,000` ❌

But the value is already `51,766 cars`, not `51,766 thousands`!

---

## Solution: Add `specialHandling` to Your Options

```typescript
const options: PipelineOptions = {
  targetCurrency: 'USD',
  autoTargetByIndicator: true,
  autoTargetDimensions: ['magnitude', 'time'],
  indicatorKey: 'name',
  minMajorityShare: 0.6,
  tieBreakers: {
    currency: "prefer-targetCurrency",
    magnitude: "prefer-millions",
    time: "prefer-month",
  },
  
  // ✅ ADD THIS: Fix misleading "Thousand" labels
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
  
  minQualityScore: 30,
  inferUnits: true,
  useLiveFX: false,
  fxFallback: { base: 'USD', rates: fxRates, dates: opts.fxDates || {} },
  explain: true,
};

const result = await processEconomicDataByIndicator(econifyData, options);
```

---

## What This Does

### Before (Without Override)
```json
{
  "ARG": {
    "value": 51766,
    "units": "Thousand",
    "normalized_value": 51766000  // ❌ WRONG: 51.7 million cars
  }
}
```

### After (With Override)
```json
{
  "ARG": {
    "value": 51766,
    "units": "Units",              // ✅ Corrected
    "normalized_value": 51766      // ✅ CORRECT: 51,766 cars
  }
}
```

---

## Alternative: Match by Indicator IDs

If you want more precision, match by specific indicator IDs:

```typescript
specialHandling: {
  unitOverrides: [
    {
      indicatorIds: [
        'ARGENTINACARREG',
        'BRAZILCARREG',
        'TAIWANCARREG',
        // ... add more as needed
      ],
      overrideUnit: 'Units',
      overrideScale: null,
      reason: 'Database stores "Thousand" as label, not scale factor'
    }
  ]
}
```

---

## When You'll See This Applied

Econify will log when overrides are applied:

```
🔧 Unit override applied to ARGENTINACARREG: Database stores 'Thousand' as label, not scale factor
🔧 Unit override applied to BRAZILCARREG: Database stores 'Thousand' as label, not scale factor
```

---

## Multiple Indicators

You can add multiple overrides for different indicators:

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
    }
  ]
}
```

---

## Summary

**What you need to do:**

1. ✅ Add `specialHandling.unitOverrides` to your econify options
2. ✅ Specify indicator names or IDs to match
3. ✅ Set `overrideUnit: 'Units'` and `overrideScale: null`
4. ✅ Test with your Car Registrations data

**Result:**
- ✅ No more double-scaling bug
- ✅ Values stay as actual car counts
- ✅ All countries comparable

---

## Full Example

```typescript
import { processEconomicDataByIndicator } from '@tellimer/econify';

// Your existing code...
const econifyData = Object.entries(data.countries).map(([iso, country]) => ({
  value: country.value,
  unit: country.tooltip.units,
  periodicity: country.tooltip.periodicity,
  scale: country.tooltip.scale,
  currency_code: country.tooltip.currency,
  name: data.indicator_name,
  id: country.tooltip.indicator_id,
}));

// Your existing options with special handling added
const options = {
  targetCurrency: 'USD',
  autoTargetByIndicator: true,
  autoTargetDimensions: ['magnitude', 'time'],
  indicatorKey: 'name',
  minMajorityShare: 0.6,
  tieBreakers: {
    currency: "prefer-targetCurrency",
    magnitude: "prefer-millions",
    time: "prefer-month",
  },
  
  // ✅ NEW: Fix misleading units
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
  
  minQualityScore: 30,
  inferUnits: true,
  useLiveFX: false,
  fxFallback: { base: 'USD', rates: fxRates, dates: opts.fxDates || {} },
  explain: true,
};

const result = await processEconomicDataByIndicator(econifyData, options);

// Now result.data will have correct values!
```

---

## Need More Help?

See full documentation: `packages/econify/docs/SPECIAL_HANDLING.md`

