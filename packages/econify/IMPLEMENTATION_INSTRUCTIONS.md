# Implementation Instructions for Econify Batch Processing

## Overview

The econify package now provides batch processing APIs (`EconifyBatchSession`
and `processEconomicDataByIndicator`) that ensure proper normalization across
all items of an indicator. This is critical for indicators like "Balance of
Trade" where multiple countries report in different units, magnitudes, and time
scales.

## Problem Being Solved

The current implementation processes each country individually, which prevents
proper auto-target normalization. When processing Balance of Trade data:

- USA reports in USD millions per month
- Germany reports in EUR millions per quarter
- UK reports in GBP thousands per month
- China reports in USD billions per month

Processing them individually means each country can't see the distribution
across all countries, leading to inconsistent normalization.

## Required Changes

### 1. Update the Import Statement

```typescript
// Add EconifyBatchSession to your imports
import {
  EconifyBatchSession, // NEW: Add this
  type ParsedData,
  type PipelineOptions,
  processEconomicData,
} from "econify";
```

### 2. Refactor the `normalizeGroupedIndicatorWithEconify` Function

Replace the current implementation that processes countries individually with
batch processing:

```typescript
export async function normalizeGroupedIndicatorWithEconify(
  indicator: TempIndicatorData,
  opts: {
    enabled: boolean;
    countryRegionMap: Map<string, any>;
    fxRates: { [currency: string]: number };
    fxDates?: { [currency: string]: string };
  },
): Promise<{ [countryISO: string]: IndicatorValue }> {
  const { enabled, countryRegionMap, fxRates } = opts;
  const processed: { [countryISO: string]: IndicatorValue } = {};

  if (!enabled) {
    // Handle disabled case - just pass through data
    for (
      const [countryISO, dataPoints] of Object.entries(indicator.countries)
    ) {
      if ((dataPoints as any[]).length === 0) continue;
      const latestPoint: any = (dataPoints as any[])[0];
      const regionData = countryRegionMap.get(countryISO);
      processed[countryISO] = {
        ...latestPoint,
        region: regionData?.majorRegionSlug
          ? getParentRegionName(regionData.majorRegionSlug)
          : null,
        region_slug: regionData?.majorRegionSlug || null,
      } as IndicatorValue;
    }
    return processed;
  }

  // CREATE BATCH SESSION with your configuration
  const session = new EconifyBatchSession({
    // Force currency to USD for all rows
    targetCurrency: "USD",

    // Enable auto-targeting by indicator
    autoTargetByIndicator: true,

    // Auto-normalize magnitude and time (currency is fixed to USD)
    autoTargetDimensions: ["magnitude", "time"],

    // Grouping configuration
    indicatorKey: "name",
    minMajorityShare: 0.6, // 60% threshold for majority

    // Fallback preferences when no majority
    tieBreakers: {
      currency: "prefer-targetCurrency",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },

    // Quality and FX settings
    minQualityScore: 30,
    inferUnits: true,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: fxRates,
      dates: opts.fxDates || {},
    },
    explain: true, // Include detailed normalization explanation
  });

  // COLLECT ALL COUNTRIES into the batch (don't process yet!)
  const countryDataMap = new Map<
    string,
    { countryISO: string; originalData: any }
  >();

  for (const [countryISO, dataPoints] of Object.entries(indicator.countries)) {
    if ((dataPoints as any[]).length === 0) continue;

    const latestPoint: any = (dataPoints as any[])[0];
    const metaRow = indicator.rowData.get(countryISO);

    // Extract unit components
    const unitsRaw = (metaRow?.units || "").trim();
    const scale = (metaRow?.scale || "").trim();
    const periodicity = (metaRow?.periodicity || "").trim();
    const extractedCurrency = unitsRaw.split("/")[0].split(" ")[0];
    const currency = (metaRow?.currency_code || extractedCurrency || "").trim();

    // Build comprehensive unit string
    let unitString = unitsRaw;
    const ciIncludes = (hay: string, needle: string) =>
      hay.toLowerCase().includes(needle.toLowerCase());

    if (
      currency && !unitString.toUpperCase().startsWith(currency.toUpperCase())
    ) {
      unitString = unitString ? `${currency} ${unitString}` : currency;
    }
    if (scale && !ciIncludes(unitString, scale)) {
      unitString = unitString ? `${unitString} ${scale}` : scale;
    }
    if (periodicity && !ciIncludes(unitString, periodicity)) {
      unitString = unitString ? `${unitString} ${periodicity}` : periodicity;
    }
    if (!unitString) unitString = "USD";

    // Create unique ID for tracking
    const uniqueId = `${indicator.indicator_id}_${countryISO}`;

    // ADD TO BATCH (not processed yet)
    session.addDataPoint({
      value: latestPoint.value,
      unit: unitString,
      periodicity: periodicity || undefined,
      scale: scale || undefined,
      currency_code: currency || undefined,
      name: indicator.indicator_name,
      id: uniqueId,
      date: latestPoint.date,
      metadata: {
        countryISO,
        originalPoint: latestPoint,
      },
    });

    // Store mapping for later
    countryDataMap.set(uniqueId, {
      countryISO,
      originalData: latestPoint,
    });
  }

  try {
    // PROCESS ALL COUNTRIES TOGETHER IN ONE BATCH
    // This is the key change - all countries processed together!
    const result = await session.process();

    // Map normalized results back to countries
    for (const normalizedItem of result.data) {
      const mapping = countryDataMap.get(normalizedItem.id!);
      if (!mapping) continue;

      const { countryISO, originalData } = mapping;
      const regionData = countryRegionMap.get(countryISO);
      const explain = (normalizedItem as any).explain;

      if (normalizedItem.normalized !== undefined) {
        processed[countryISO] = {
          date: originalData.date,
          value: normalizedItem.normalized!,
          is_forecasted: originalData.is_forecasted,
          color: "",
          region: regionData?.majorRegionSlug
            ? getParentRegionName(regionData.majorRegionSlug)
            : null,
          region_slug: regionData?.majorRegionSlug || null,
          tooltip: {
            original_value: originalData.value,
            normalized_value: normalizedItem.normalized!,
            normalization_metadata: {
              method: explain?.fx?.source === "live"
                ? "econify_live"
                : "econify",
              quality: {
                score: result.metrics.qualityScore || 0,
                confidence: getConfidenceLevel(
                  result.metrics.qualityScore || 0,
                ),
                status: (result.metrics.qualityScore || 0) > 70
                  ? "passed"
                  : "passed_with_warnings",
                notes: result.warnings,
              },
              explain: toSnakeDeep(explain),
            },
          },
        } as IndicatorValue;
      }
    }
  } catch (error) {
    console.error("Econify batch processing failed:", error);
    // Fallback to original data if batch processing fails
    for (
      const [countryISO, dataPoints] of Object.entries(indicator.countries)
    ) {
      if ((dataPoints as any[]).length === 0) continue;
      const latestPoint: any = (dataPoints as any[])[0];
      const regionData = countryRegionMap.get(countryISO);
      processed[countryISO] = {
        ...latestPoint,
        region: regionData?.majorRegionSlug
          ? getParentRegionName(regionData.majorRegionSlug)
          : null,
        region_slug: regionData?.majorRegionSlug || null,
      } as IndicatorValue;
    }
  }

  return processed;
}
```

## Key Changes Explained

### 1. **Batch Collection Phase**

- Create a single `EconifyBatchSession` at the start
- Loop through all countries and ADD them to the session (don't process yet)
- Store a mapping of ID → country data for later retrieval

### 2. **Single Processing Call**

- Call `session.process()` ONCE after all countries are added
- This ensures all countries are normalized together with consistent targets

### 3. **Result Mapping**

- Map the normalized results back to each country using the stored mapping
- Preserve all metadata and regional information

## What This Fixes

**IMPORTANT**: The normalization happens PER INDICATOR. Each indicator (e.g.,
"Balance of Trade", "GDP", "Inflation Rate") is normalized separately based on
its own data distribution.

### Per-Indicator Normalization

When you process "Balance of Trade" data:

- All Balance of Trade countries are normalized together
- They all get the same magnitude (e.g., millions)
- They all get the same time scale (e.g., monthly)
- They all get the same currency (e.g., USD)

When you process "GDP" data (separately):

- All GDP countries are normalized together
- GDP might use billions (not millions like Balance of Trade)
- GDP might use yearly (not monthly like Balance of Trade)
- GDP also converts to USD

Each indicator gets appropriate units based on ITS OWN data:

- Balance of Trade → USD millions/month
- GDP → USD billions/year
- Interest Rate → percent
- Population → millions (no currency)

### Before (Individual Processing)

```
USA: 100 USD millions/month → 100 USD millions/month
Germany: 200 EUR millions/quarter → 200 EUR millions/quarter  ❌ Not normalized to month
UK: 50000 GBP thousands/month → 50000 GBP thousands/month  ❌ Not normalized to millions
China: 0.5 USD billions/month → 0.5 USD billions/month  ❌ Not normalized to millions
```

### After (Batch Processing)

```
USA: 100 USD millions/month → 100 USD millions/month  ✅
Germany: 200 EUR millions/quarter → 72.5 USD millions/month  ✅ Normalized to month & USD
UK: 50000 GBP thousands/month → 63.3 USD millions/month  ✅ Normalized to millions & USD  
China: 0.5 USD billions/month → 500 USD millions/month  ✅ Normalized to millions
```

## Testing the Implementation

1. Test with Balance of Trade data that has mixed units:
   - Different currencies (USD, EUR, GBP, JPY)
   - Different magnitudes (thousands, millions, billions)
   - Different time scales (month, quarter, year)

2. Verify all countries get normalized to:
   - Same currency (USD)
   - Same magnitude (based on majority)
   - Same time scale (based on majority)

3. Check the `explain` field in the response to see the normalization decisions:
   ```typescript
   explain.targetSelection.selected = {
     currency: "USD",
     magnitude: "millions", // Majority selection
     time: "month", // Majority selection
   };
   ```

## Configuration Options

Adjust these based on your needs:

```typescript
{
  // Dimensions to auto-normalize
  autoTargetDimensions: ['magnitude', 'time'],  // Add 'currency' if needed
  
  // Majority threshold (0.6 = 60%)
  minMajorityShare: 0.6,
  
  // Tie-breaker preferences
  tieBreakers: {
    magnitude: "prefer-millions",  // or "prefer-billions" for large values
    time: "prefer-month",          // or "prefer-quarter", "prefer-year"
  }
}
```

## Error Handling

The implementation includes a try-catch block that:

1. Attempts batch processing with the new API
2. Falls back to original data if batch processing fails
3. Logs errors for debugging

## Migration Checklist

- [ ] Update econify package to latest version
- [ ] Import `EconifyBatchSession` from econify
- [ ] Replace the for-loop that processes countries individually
- [ ] Implement batch collection phase (add all countries first)
- [ ] Call `session.process()` once for all countries
- [ ] Map results back to country structure
- [ ] Test with real Balance of Trade data
- [ ] Verify consistent normalization across countries
- [ ] Check the `explain` field to understand normalization decisions

## Support

If you encounter issues:

1. Check `result.warnings` for any processing warnings
2. Enable `explain: true` to see detailed normalization decisions
3. Use `session.previewAutoTargets()` before processing to see what targets will
   be selected
4. Verify all countries have valid data (not NaN or Infinity)
