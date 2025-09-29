# Per-Indicator Normalization with Econify Batch Processing

## Critical Concept: PER-INDICATOR Normalization

The batch processing normalizes data **PER INDICATOR**, not across all
indicators. Each indicator gets its own appropriate normalization based on its
data distribution.

## How It Works

### Example Scenario

You have data for multiple indicators, each with multiple countries:

**Balance of Trade:**

- USA: 100 USD millions/month
- UK: 50,000 GBP thousands/month
- Germany: 200 EUR millions/quarter
- China: 0.5 USD billions/month

**GDP:**

- USA: 25 USD trillions/year
- UK: 3.1 GBP trillions/year
- Germany: 4.2 EUR trillions/year
- Japan: 5 JPY quadrillions/year

**Inflation Rate:**

- USA: 3.5 percent
- UK: 4.2 percent
- Germany: 2.8 percent

### Processing Results

Each indicator is normalized SEPARATELY based on its own data:

**Balance of Trade** (all countries normalized together):

- Target: USD millions/month (based on majority within BoT data)
- USA: 100 → 100 USD millions/month ✓
- UK: 50,000 thousands → 63.3 USD millions/month ✓
- Germany: 200/quarter → 72.5 USD millions/month ✓
- China: 0.5 billions → 500 USD millions/month ✓

**GDP** (all countries normalized together, but separately from BoT):

- Target: USD trillions/year (based on majority within GDP data)
- USA: 25 → 25 USD trillions/year ✓
- UK: 3.1 → 3.9 USD trillions/year ✓
- Germany: 4.2 → 4.6 USD trillions/year ✓
- Japan: 5 quadrillions JPY → 33.3 USD trillions/year ✓

**Inflation Rate** (no normalization needed):

- All remain as percentages

## Implementation Pattern

```typescript
// Process Balance of Trade
const botSession = new EconifyBatchSession(options);
for (const [country, data] of balanceOfTradeData) {
  botSession.addDataPoint({ name: "Balance of Trade", ...data });
}
const botResult = await botSession.process();
// All BoT countries now in USD millions/month

// Process GDP separately
const gdpSession = new EconifyBatchSession(options);
for (const [country, data] of gdpData) {
  gdpSession.addDataPoint({ name: "GDP", ...data });
}
const gdpResult = await gdpSession.process();
// All GDP countries now in USD trillions/year

// Or use processEconomicDataByIndicator for automatic grouping
const allData = [
  ...balanceOfTradeItems, // These will be grouped together
  ...gdpItems, // These will be grouped together
  ...inflationItems, // These will be grouped together
];
const result = await processEconomicDataByIndicator(allData, options);
// Each indicator normalized appropriately
```

## Why This Matters

### Wrong Approach (Global Normalization)

If you normalized EVERYTHING to the same units:

- Balance of Trade: 100 USD millions/month
- GDP: 25,000,000 USD millions/month ❌ (Confusing! GDP shouldn't be in
  millions)

### Right Approach (Per-Indicator Normalization)

Each indicator keeps appropriate units:

- Balance of Trade: 100 USD millions/month ✓
- GDP: 25 USD trillions/year ✓
- Interest Rate: 3.5 percent ✓

## Key Configuration

```typescript
{
  // This tells econify to group by indicator name
  indicatorKey: 'name',  
  
  // This enables per-indicator normalization
  autoTargetByIndicator: true,
  
  // These dimensions are normalized per indicator
  autoTargetDimensions: ['magnitude', 'time'],
  
  // Each indicator's majority is calculated separately
  minMajorityShare: 0.6
}
```

## Summary

1. **Each indicator is processed as its own group**
2. **Majority calculations happen within each indicator**
3. **Different indicators can have different target units**
4. **Balance of Trade might use millions/month while GDP uses trillions/year**

This ensures that:

- All Balance of Trade countries are comparable (same units)
- All GDP countries are comparable (same units)
- But Balance of Trade and GDP use appropriate, different units
