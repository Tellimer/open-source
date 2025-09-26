# FX Architecture (V2)

## Overview

The V2 pipeline uses an optimized FX architecture where:

1. FX requirements are detected during classification
2. FX rates are passed from config (no async fetching)
3. All domains process in parallel with FX available where needed

## Key Design Decisions

### FX Detection in Classification

- Each item gets FX metadata during classification:
  - `needsFX`: boolean flag indicating if FX conversion is needed
  - `currencyCode`: detected currency code
  - `pricePattern`: whether it's a price (needs FX) or volume (no FX)

### FX from Config

- FX rates come from `config.fxFallback`
- No async FX fetching in the router
- User provides FX rates upfront
- Consistent, predictable performance

### Parallel Processing

- All domains process simultaneously
- No sequential FX detection/fetch bottleneck
- Domains that need FX receive it directly
- Maximum throughput

## Architecture Flow

```
Input Data 
    ↓
Validation
    ↓
Parsing
    ↓
Quality
    ↓
Classification (adds FX metadata to items)
    ↓
Router (passes FX from config to domains)
    ↓
Parallel Domain Processing
    ↓
Fan-in & Explain Merge
    ↓
Output
```

## Domain FX Requirements

### Always Need FX

- **Monetary Stock**: GDP, debt, reserves
- **Monetary Flow**: Wages, income, cash flows

### Conditionally Need FX (Price-based)

- **Commodities**: Prices (USD per barrel) need FX, volumes (barrels) don't
- **Agriculture**: Prices (USD per bushel) need FX, production (tonnes) don't
- **Metals**: Prices (USD per ounce) need FX, reserves (tonnes) don't
- **Energy**: Prices (USD per MWh) need FX, generation (GWh) doesn't

### Never Need FX

- **Counts**: Population, employment
- **Percentages**: Rates, ratios
- **Indices**: CPI, stock indices
- **Ratios**: Debt-to-GDP, P/E ratios
- **Crypto**: Handled separately

## Implementation

### Classification (`classify.machine.ts`)

```typescript
// During bucketing, add FX detection
const fxDetection = detectFXRequirement(item);
const itemWithFX = {
  ...item,
  needsFX: fxDetection.needsFX,
  currencyCode: fxDetection.currencyCode,
  pricePattern: fxDetection.pricePattern,
};
```

### Router (`normalize_router.machine.ts`)

```typescript
// FX comes from config, passed to domains
context: ({ input }) => ({
  ...input,
  processed: {},
  fxRates: (input.config as any).fxFallback
})

// Domains receive FX if they need it
invoke: {
  src: "monetary",
  input: ({ context }) => ({
    config: context.config,
    items: context.buckets.monetaryStock,
    fx: context.fxRates,
    fxSource: "fallback",
    fxSourceId: "SNP"
  })
}
```

## Performance Benefits

1. **No FX Fetch Latency**: FX rates already available
2. **Maximum Parallelization**: All domains process simultaneously
3. **Smart FX Usage**: Only domains that need FX receive it
4. **Predictable Performance**: No network variability

## Configuration

```typescript
const config = {
  targetCurrency: "USD",
  targetMagnitude: "millions",
  fxFallback: {
    base: "USD",
    rates: {
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110.5,
      // ... other rates
    },
  },
};
```

## Migration from V1

### Old V1 Flow

```
Pipeline → Fetch FX (always) → Classification → Normalization
```

### New V2 Flow

```
Pipeline → Classification (detect FX needs) → Router (use config FX) → Parallel Processing
```

### Key Changes

1. FX detection moved to classification
2. FX fetch removed from router
3. FX comes from config.fxFallback
4. All processing is parallel
