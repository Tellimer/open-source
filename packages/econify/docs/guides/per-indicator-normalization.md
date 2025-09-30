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

## Smart Auto-Targeting: Indicator Classification

**NEW in v1.1.10+**: Auto-targeting now intelligently determines which
dimensions to apply based on indicator type.

### Indicator Types

Econify automatically classifies indicators into three types:

#### 1. **Stock Indicators** (Snapshots/Levels)

Stock indicators represent a **snapshot at a point in time**, not a rate over
time.

**Examples:**

- Population, Employed Persons, Labor Force, Workforce
- Debt, Reserves, Money Supply, Assets
- Inventory, Housing Stock

**Behavior:**

- ✅ Time dimension is **automatically skipped** even when included in
  `autoTargetDimensions`
- ✅ Values represent "how many/how much exists at this moment"
- ✅ No time conversion applied (e.g., quarterly → monthly)

**Example:**

```typescript
// Input: Employed Persons
{
  name: "Employed Persons",
  value: 12814.558,
  unit: "Thousand",
  periodicity: "Quarterly"  // Just the reporting frequency
}

// Output (with autoTargetDimensions: ['magnitude', 'time'])
{
  normalized: 12814.558,  // ✅ NOT divided by 3!
  normalizedUnit: "Thousands",  // ✅ NOT "thousands per month"
  explain: {
    targetSelection: {
      selected: { magnitude: "thousands", time: undefined },
      reason: "magnitude=majority(thousands,1.00); time=skipped(stock indicator, no time dimension)"
    }
  }
}
```

#### 2. **Flow Indicators** (Rates/Activity)

Flow indicators represent **activity over a period of time**.

**Examples:**

- GDP, Exports, Imports, Sales, Revenue
- Production, Manufacturing Output
- Wages, Income, Spending

**Behavior:**

- ✅ Time dimension is **included** in auto-targeting
- ✅ Values represent "how much per time period"
- ✅ Time conversion applied when needed (e.g., quarterly → monthly)

**Example:**

```typescript
// Input: GDP
{
  name: "GDP",
  value: 300,
  unit: "USD Million per quarter"
}

// Output (with autoTargetDimensions: ['magnitude', 'time'])
{
  normalized: 100,  // ✅ Divided by 3 (quarterly → monthly)
  normalizedUnit: "USD millions per month",
  explain: {
    targetSelection: {
      selected: { magnitude: "millions", time: "month" },
      reason: "magnitude=majority(millions,0.85); time=tie-break(prefer-month)"
    }
  }
}
```

#### 3. **Rate Indicators** (Ratios/Indices)

Rate indicators are **dimensionless ratios, percentages, or indices**.

**Examples:**

- CPI, Inflation Rate, Unemployment Rate
- Interest Rates, Exchange Rates
- Indices (PMI, Consumer Confidence)

**Behavior:**

- ✅ Time dimension is **automatically skipped**
- ✅ Values are ratios or indices, not quantities
- ✅ No time conversion applied

**Example:**

```typescript
// Input: CPI
{
  name: "Consumer Price Index",
  value: 105.2,
  unit: "Index Points"
}

// Output
{
  normalized: 105.2,  // ✅ Unchanged
  normalizedUnit: "Index Points",
  explain: {
    targetSelection: {
      selected: { time: undefined },
      reason: "time=skipped(rate indicator, no time dimension)"
    }
  }
}
```

### Why This Matters

**Before Smart Auto-Targeting:**

```typescript
// ❌ WRONG: Stock indicators were incorrectly converted
{
  name: "Employed Persons",
  value: 12814.558,
  unit: "Thousand",
  periodicity: "Quarterly"
}
// → normalized: 4271.52 (divided by 3!) ❌
// → normalizedUnit: "thousands per month" ❌
```

**After Smart Auto-Targeting:**

```typescript
// ✅ CORRECT: Stock indicators skip time dimension
{
  name: "Employed Persons",
  value: 12814.558,
  unit: "Thousand",
  periodicity: "Quarterly"
}
// → normalized: 12814.558 (unchanged) ✅
// → normalizedUnit: "Thousands" ✅
```

### Global Configuration with Smart Targeting

You can now set `autoTargetDimensions` globally and let econify intelligently
apply them:

```typescript
{
  // This tells econify to group by indicator name
  indicatorKey: 'name',

  // This enables per-indicator normalization
  autoTargetByIndicator: true,

  // These dimensions are normalized per indicator
  // Stock/Rate indicators will automatically skip 'time'
  autoTargetDimensions: ['magnitude', 'time'],

  // Each indicator's majority is calculated separately
  minMajorityShare: 0.6
}
```

**Result:**

- **Flow indicators** (GDP, Exports) → Both magnitude AND time normalized
- **Stock indicators** (Population, Debt) → Only magnitude normalized, time
  skipped
- **Rate indicators** (CPI, Inflation) → Time skipped, magnitude may be skipped
  too

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
5. **Smart auto-targeting automatically determines which dimensions to apply
   based on indicator type**

This ensures that:

- All Balance of Trade countries are comparable (same units)
- All GDP countries are comparable (same units)
- But Balance of Trade and GDP use appropriate, different units
- Stock indicators (Population, Debt) don't get incorrectly time-converted
- Flow indicators (GDP, Exports) get proper time normalization
- Rate indicators (CPI, Inflation) remain as ratios/indices
