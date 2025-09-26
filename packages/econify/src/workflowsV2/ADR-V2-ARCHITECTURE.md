# Architecture Decision Record: Econify V2 Pipeline Redesign

**Status**: Accepted\
**Date**: 2024-12-19\
**Deciders**: Econify Development Team

## Context

Econify V1 pipeline had several architectural limitations that hindered
maintainability, performance, and semantic accuracy:

1. **Imperative Conditionals**: Complex if/else logic scattered throughout the
   codebase
2. **Arbitrary Wages Separation**: Wages processed separately from other
   monetary indicators
3. **Universal Normalization**: All domains forced through monetary
   normalization
4. **Nested Explain Structure**: Complex explain metadata requiring string
   parsing
5. **Inflation/Seasonality Coupling**: Economic adjustments tightly coupled with
   normalization

## Decision

We will implement a complete V2 architecture redesign with the following key
decisions:

### 1. Explicit State Machine Architecture

**Decision**: Replace imperative conditionals with explicit XState v5 state
machines.

**Rationale**:

- **Transparency**: State transitions make behavior explicit and predictable
- **Testability**: Each state and transition can be tested independently
- **Maintainability**: Clear separation of concerns and self-documenting flow
- **Debuggability**: XState dev tools provide visual debugging capabilities

**Implementation**:

```typescript
// V1: Imperative
if (hasWages && !exempted) {
  return processWages(items);
} else if (isMonetary) {
  return processMonetary(items);
}

// V2: Explicit state machine
const machine = setup({
  guards: {
    hasWages: ({ context }) => context.buckets.wages?.length > 0,
    isMonetary: ({ context }) => context.buckets.monetary?.length > 0,
  },
}).createMachine({
  initial: "classify",
  states: {
    classify: {
      on: {
        PROCESS: [
          { target: "processWages", guard: "hasWages" },
          { target: "processMonetary", guard: "isMonetary" },
        ],
      },
    },
  },
});
```

### 2. Unified Monetary Pipeline

**Decision**: Eliminate separate wages processing and treat wages as monetary
flow indicators.

**Rationale**:

- **Semantic Consistency**: Wages are monetary flows, not a separate category
- **Simplified Architecture**: Reduces code duplication and complexity
- **Unified Explain**: Consistent explain metadata across all monetary
  indicators
- **Better Normalization**: Wages benefit from full monetary normalization
  pipeline

**Migration Impact**:

- V1: `wagesMachine` → V2: `monetaryFlow` classification
- V1: Special wage metadata → V2: Standard monetary explain metadata
- V1: `"USD per month"` → V2: `"USD millions per month"` (respects target
  magnitude)

### 3. Domain-Aware Processing

**Decision**: Implement domain-specific normalization preserving semantic
meaning.

**Rationale**:

- **Semantic Preservation**: Count indicators remain counts, not meaningless
  currency values
- **Data Integrity**: Prevents loss of semantic meaning through inappropriate
  conversions
- **User Experience**: Results maintain intuitive meaning for domain experts
- **Performance**: Avoids unnecessary computation for non-monetary domains

**Domain Processing Rules**:

```typescript
// Monetary domains: Full normalization
monetaryStock: currency + magnitude (no time conversion)
monetaryFlow: currency + magnitude + time conversion

// Non-monetary domains: Semantic preservation
counts: magnitude scaling only, preserve count units
percentages: pass-through, preserve percentage values
indices: pass-through, preserve index points
ratios: pass-through, preserve ratio values
physical: pass-through, preserve physical units
```

### 4. Flat Explain Metadata Structure

**Decision**: Replace nested explain structure with flat, directly accessible
metadata.

**Rationale**:

- **Developer Experience**: Direct access without string parsing
- **Type Safety**: Better TypeScript support with explicit interfaces
- **Consistency**: Uniform structure across all domains
- **Extensibility**: Easier to add new explain fields

**Structure Comparison**:

```typescript
// V1: Nested structure
{
  explain: {
    units: { normalizedUnit: "USD millions per month" },
    magnitude: { description: "billions → millions (×1000)" }
  }
}

// V2: Flat structure
{
  explain: {
    explainVersion: "v2",
    currency: { original: "EUR", normalized: "USD" },
    scale: { original: "billions", normalized: "millions" },
    periodicity: { original: "year", normalized: "month" }
  }
}
```

### 5. Separation of Normalization and Economic Adjustments

**Decision**: Exclude inflation and seasonality adjustments from V2 pipeline.

**Rationale**:

- **Single Responsibility**: Normalization focuses on unit conversion only
- **Modularity**: Economic adjustments can be applied separately as needed
- **Clarity**: Clear distinction between technical normalization and economic
  analysis
- **Performance**: Faster processing without optional adjustment steps

**Scope Definition**:

- **V2 Includes**: Validation, parsing, classification, unit normalization
- **V2 Excludes**: Inflation adjustment, seasonal adjustment, economic modeling
- **Future**: Economic adjustments available as separate, composable modules

### 6. Unified Classification Taxonomy

**Decision**: Implement single classification system with 11 explicit domains.

**Domains**:

1. **Monetary Stock**: GDP, debt, reserves (currency + stock semantics)
2. **Monetary Flow**: Wages, trade flows (currency + flow semantics)
3. **Counts**: Population, vehicles (count-based units)
4. **Percentages**: Rates, ratios expressed as percentages
5. **Indices**: CPI, PMI, stock indices (index points)
6. **Ratios**: Debt-to-GDP, P/E ratios (dimensionless ratios)
7. **Energy**: Electricity, gas, oil (energy-specific units)
8. **Commodities**: Commodity prices (USD per unit)
9. **Agriculture**: Agricultural production and prices
10. **Metals**: Metal production and prices
11. **Crypto**: Cryptocurrency prices and market data

**Benefits**:

- **Comprehensive**: Covers all economic indicator types
- **Mutually Exclusive**: Clear boundaries between domains
- **Extensible**: Easy to add new domains as needed
- **Semantic**: Preserves domain-specific meaning

### 7. Engine Toggle for Backward Compatibility

**Decision**: Implement configurable engine selection with
`PipelineConfig.engine: "v1" | "v2"`.

**Rationale**:

- **Gradual Migration**: Allows incremental adoption of V2
- **Risk Mitigation**: Fallback to V1 if issues arise
- **Testing**: Side-by-side comparison for validation
- **Flexibility**: Different use cases can choose appropriate engine

## Consequences

### Positive

1. **Performance**: 64% faster processing through optimized state machines
2. **Maintainability**: Self-documenting architecture with explicit state
   transitions
3. **Semantic Accuracy**: Domain-aware processing preserves indicator meaning
4. **Developer Experience**: Flat explain structure with direct property access
5. **Testability**: Each state machine component can be tested independently
6. **Extensibility**: Easy to add new domains or modify existing behavior

### Negative

1. **Migration Effort**: Existing integrations need to handle new explain
   structure
2. **Learning Curve**: Developers need to understand XState concepts
3. **Bundle Size**: XState dependency adds to package size
4. **Breaking Changes**: Some V1 explain fields not present in V2

### Mitigation Strategies

1. **Comprehensive Documentation**: Detailed migration guides and examples
2. **Backward Compatibility**: Engine toggle allows gradual migration
3. **Extensive Testing**: 264+ tests ensure reliability
4. **Parity Analysis**: Documented differences between V1 and V2

## Alternatives Considered

### Alternative 1: Incremental V1 Improvements

**Rejected**: Would not address fundamental architectural issues

### Alternative 2: Complete Rewrite Without State Machines

**Rejected**: Would miss opportunity for self-documenting architecture

### Alternative 3: Maintain Separate Wages Processing

**Rejected**: Perpetuates arbitrary separation and complexity

## Implementation Status

- ✅ **Complete**: V2 architecture implementation
- ✅ **Complete**: Comprehensive test suite (25 V2-specific tests)
- ✅ **Complete**: Parity analysis and validation
- ✅ **Complete**: Documentation and migration guides
- 🔄 **In Progress**: CI integration and coverage enforcement
- 📋 **Planned**: Production rollout with feature flags

## References

- [V2 Implementation](./README.md)
- [Parity Analysis Report](./parity/PARITY_REPORT.md)
- [XState v5 Documentation](https://stately.ai/docs/xstate)
- [Domain Classification Guide](./classify/README.md)
- [Monetary Pipeline Documentation](./domains/monetary/README.md)
