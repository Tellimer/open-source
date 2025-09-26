# V2 Machine Architecture Documentation

This directory contains the XState v5 state machines that power the V2 workflow
pipeline.

## Machine Organization

```
machines/
├── stages/           # Core pipeline stages
│   ├── validation.machine.ts
│   ├── parsing.machine.ts
│   ├── auto_target.machine.ts     # NEW: Global auto-targeting
│   ├── quality.machine.ts
│   └── README.md                  # Stage machines documentation
├── classify/         # Classification and taxonomy
│   ├── classify.machine.ts
│   ├── taxonomy.ts
│   └── exemptions.ts
├── normalize/        # Router and aggregation
│   ├── normalize_router.machine.ts
│   ├── fanin.machine.ts
│   └── explain_merge.machine.ts
├── domains/          # Domain-specific processors
│   ├── monetary/
│   │   ├── monetary.machine.ts
│   │   ├── time_basis.machine.ts
│   │   ├── targets.machine.ts
│   │   └── batch.ts
│   ├── counts.machine.ts
│   ├── percentages.machine.ts
│   ├── indices.machine.ts
│   ├── ratios.machine.ts
│   ├── energy.machine.ts
│   ├── commodities.machine.ts
│   ├── agriculture.machine.ts
│   ├── metals.machine.ts
│   └── crypto.machine.ts
└── fx/               # Foreign exchange
    └── fx.machine.ts
```

## Main Pipeline Machine

### Location: `pipeline/pipeline.machine.ts`

The main pipeline orchestrates the V2 workflow through these states:

See: [Pipeline States Diagram](../diagrams/pipeline-states.mmd)

### Key Implementation Details

- **Data Passing**: Uses side effect pattern with `self._v2AutoTargets`, `self._v2Classify` and
  `self._v2Normalized`
- **Error Handling**: Each stage can transition to error state
- **FX Execution**: Happens within normalizeRouter, not as separate pipeline
  stage
- **Auto-Targeting**: NEW - Global auto-target computation before domain processing

## Auto-Target Machine

### Location: `stages/auto_target.machine.ts`

The Auto-Target Machine computes optimal normalization targets (currency, magnitude, time) across all indicators before any domain-specific processing begins.

#### Pipeline Position
**Stage 3**: After parsing, before quality assessment
```
validate → parse → autoTarget → quality → classify → normalize
```

#### How It Works

1. **Global Computation**: Analyzes ALL items at once to find majority patterns per indicator
2. **Indicator Grouping**: Groups items by `indicatorKey` (default: "name")
3. **Majority Detection**: Finds dominant currency/magnitude/time for each indicator group
4. **Threshold Check**: Requires 80% dominance (vs V1's 50%) before auto-targeting
5. **Pipeline Storage**: Stores results in `(self as any)._v2AutoTargets` for downstream access

#### Data Flow Pattern
```typescript
// Step 1: Compute targets globally
const autoTargets = Map {
  "Consumer Spending" => {
    currency: "USD",      // 75% of items are USD
    magnitude: "millions", // 100% are millions  
    time: "month"         // tie-breaker default
  }
}

// Step 2: Store in pipeline context
(self as any)._v2AutoTargets = autoTargets;

// Step 3: Domain machines access and apply
const targets = autoTargets.get(item.name);
batchProcess(items, {
  toCurrency: targets.currency,    // "USD"
  toMagnitude: targets.magnitude,  // "millions"
  toTimeScale: targets.time        // "month"
});
```

#### Key Benefits
- **Consistency**: All items for same indicator get same targets
- **Efficiency**: One computation vs per-item calculations
- **Transparency**: Auto-targeting decisions visible in explain metadata
- **Performance**: Enables optimized batch processing

#### Configuration
```typescript
{
  autoTargetByIndicator: true,           // Enable auto-targeting
  autoTargetDimensions: ['currency'],    // Must be non-empty
  indicatorKey: 'name',                  // Grouping field
  minMajorityShare: 0.8,                 // 80% threshold (V2 default)
}
```

See: [Detailed Auto-Target Documentation](./stages/README.md)

## Classification Machine

### Location: `classify/classify.machine.ts`

Simplified 3-state machine (not 5 as originally documented):

See: [Classification States Diagram](../diagrams/classify-states.mmd)

### Key Features

- Applies exemption rules first
- Uses taxonomy.ts for domain classification
- Outputs 11 domain buckets + exempted items

## Normalize Router Machine

### Location: `normalize/normalize_router.machine.ts`

Handles parallel processing of all domains:

See: [Normalize Router States Diagram](../diagrams/normalize-router-states.mmd)

### Important Notes

- All domains process in parallel, not sequentially
- FX machine executes conditionally for monetary items only
- Fan-in preserves original order despite parallel processing

## Monetary Domain Machines

### Location: `domains/monetary/`

The monetary pipeline consists of three sub-machines:

See: [Monetary Pipeline Diagram](../diagrams/monetary-pipeline.mmd)

### 1. Time Basis Machine (`time_basis.machine.ts`)

**States**: `compute` → `done`

Infers time scale with precedence:

1. Unit time token
2. Item periodicity
3. Auto-target tie-breaker (defaults to "month")

### 2. Targets Machine (`targets.machine.ts`)

**States**: `decide` → (`useGlobalTargets` | `auto` | `useConfig`) → `done`

**NEW Global Auto-Targeting Integration**:
- **useGlobalTargets**: NEW STATE - Uses auto-targets from pipeline auto-target machine
- **Priority**: Global auto-targets > Local auto-targeting > Config fallback
- **Efficiency**: Skips local computation when global targets available

**Critical Configuration**:
- **V2 Threshold**: 0.8 (80%) for majority dominance  
- **V1 Threshold**: 0.5 (50%) - more permissive
- Falls back to config when no clear majority

**Auto-Target Integration Logic**:
```typescript
states: {
  targets: {
    always: [
      {
        guard: "useGlobalTargets",  // NEW: Check for pipeline auto-targets
        target: "useGlobalTargets"   // NEW: Skip local computation
      },
      {
        guard: "autoTargetEnabled", // Fallback to local auto-targeting
        target: "autoTarget"
      },
      { target: "configTargets" }   // Final fallback to config
    ],
  },
}
```

See: [Auto-Targeting Flow Diagram](../diagrams/auto-targeting-flow.mmd)

### 3. Batch Processing (`batch.ts`)

Simple wrapper around V1's `processBatch` function with FX metadata enhancement.

## Non-Monetary Domain Machines

### Counts Machine (`counts.machine.ts`)

- **Implementation**: Basic regex-based magnitude scaling
- **Limitations**: No batch processing, no error handling, no explain metadata
- **Simpler than V1**

### Percentages Machine (`percentages.machine.ts`)

- **Implementation**: Pure pass-through
- **Missing Features**: No validation, no explain annotations
- **Documentation Mismatch**: Claims validation but doesn't implement it

### Indices Machine (`indices.machine.ts`)

- **Implementation**: Minimal normalization with fallback values
- **Not a true no-op**: Sets `normalized` and `normalizedUnit` if missing

### Ratios Machine (`ratios.machine.ts`)

- **Implementation**: Complete no-op pass-through
- **True to documentation**: No processing whatsoever

### Physical Domains (energy, commodities, agriculture, metals)

- **Implementation**: Pass-through with fallback assignment
- **Common Pattern**: All use identical structure
- **No domain-specific logic**

### Crypto Machine (`crypto.machine.ts`)

- **Implementation**: Pass-through like physical domains
- **Unique**: Doesn't include FX parameters in interface
- **No monetary processing despite documentation**

## FX Machine

### Location: `fx/fx.machine.ts`

Handles currency exchange rates with fallback support:

See: [FX Machine Diagram](../diagrams/fx-machine.mmd)

### Features

- Attempts live rates first (ECB source)
- Falls back to static rates (SNP source)
- Tracks source and sourceId for explain metadata
- Called conditionally only for monetary items

## Common Patterns

### Guards

- `hasItems`: Check if items array is non-empty
- `autoTargetEnabled`: Check if config.autoTargetByIndicator is true
- `hasConfigTargetTime`: Check if config.targetTimeScale is set

### Actions

- Assign actions for context updates
- Side effect actions for data passing
- Error collection and propagation

### Error Handling

All machines follow consistent error patterns:

- Capture errors in context
- Transition to error state
- Propagate errors to parent machine

## Migration Notes

### V1 → V2 Differences

1. **Threshold Change**: Auto-targeting requires 80% majority (was 50%)
2. **Simplified Domains**: Less sophisticated than V1 implementations
3. **Missing Features**: Many domains lack explain support
4. **State Simplification**: Actual states often simpler than original design
5. **Side Effect Pattern**: Data passed via self reference, not events

### Performance Characteristics

- Parallel domain processing improves throughput
- Conditional FX execution reduces unnecessary API calls
- Simpler domain implementations trade features for speed
- ~64% faster than V1 (10ms vs 23ms average)
