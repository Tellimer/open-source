# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Deno 2.0+ monorepo containing Tellimer's open-source packages for economic data processing. The main package is **econify**, a comprehensive toolkit for normalizing and processing economic indicators.

## Commands

### Testing
```bash
# Run all tests for a specific package
deno task test:econify        # Run econify tests (~239 tests)
deno task test:countrify      # Run countrify tests

# From within a package directory
deno task test                # Run all tests
deno task test:cov           # Run with coverage
deno task cov:lcov           # Generate LCOV coverage report
deno task cov:check          # Check coverage meets threshold (80%)

# Run a single test file
deno test path/to/test_file.ts

# Run tests matching a pattern
deno test --filter "specific test name"
```

### Development
```bash
# Watch mode for development
deno task dev:econify        # Watch econify (runs sample_usage.ts)
deno task dev:countrify      # Watch countrify

# Code quality
deno fmt                     # Format all code
deno lint                    # Lint all code

# Update currency codes
deno task update-code3       # Update ISO 4217 currency codes
```

### Debugging Econify
```bash
# Temporary debug scripts are available
deno run tmp_v2_debug.ts     # Debug V2 workflow
deno run tmp_monetary_debug.ts # Debug monetary pipeline
```

## Architecture

### Econify Package Architecture

Econify uses **XState v5** state machines for orchestrating complex data transformations. The architecture consists of:

1. **Main Pipeline** (`src/workflows/economic-data-workflow.ts`):
   - Validates and parses input data
   - Routes to domain-specific processors
   - Uses fan-out/fan-in pattern for parallel processing
   - Supports FX rates (live or fallback), auto-targeting, and exemptions

2. **Domain Router Flow** (V1):
   - **Monetary Pipeline**: autoTargetMachine → timeBasisMachine → monetaryNormalizationMachine
   - **Wages**: Special handling for wage/salary data (normalized to currency per month)
   - **Counts**: Processing for count-based indicators with magnitude scaling
   - **Percentages**: Pass-through with explain annotations
   - **Physical Domains**: emissions, energy, commodities, agriculture, metals (no currency/time targets)
   - **Indices/Ratios/Crypto**: Pass-through lanes with metadata enrichment

3. **V2 Workflow Migration** (Currently in progress on `feat/v2-workflows` branch):
   - New structure in `src/workflowsV2/` with explicit state transitions and guards
   - Unified monetary pipeline for all currency-related processing (wages included as Monetary-Flow)
   - Flat explain metadata structure with normalized keys (USD, millions, month)
   - Configurable engine toggle: `PipelineConfig.engine = "v1" | "v2"`

### Key Patterns

1. **State Machine Pattern**: All complex workflows use XState machines with explicit states, guards, and actions
2. **Fan-out/Fan-in**: Parallel processing of multiple data points with aggregation
3. **Domain Separation**: Clear boundaries between monetary, physical, and abstract indicators
4. **Type Safety**: Extensive use of TypeScript discriminated unions and branded types
5. **Auto-targeting**: Automatic selection of majority units (currency/magnitude/time) per indicator
6. **Time Basis Precedence**: Unit time token → item.periodicity → auto-target tie-breaker (prefer-month)

## Working with Econify

### Adding New Features
1. Check if feature belongs in V1 (`src/workflows/`) or V2 (`src/workflowsV2/`)
2. For state machine changes, update both the machine definition and corresponding tests
3. Use existing patterns from similar domains (e.g., monetary for currency-related features)

### Testing Strategy
- Unit tests for individual functions in `*_test.ts` files
- Integration tests for complete workflows
- Use the extensive test fixtures in test files for realistic data

### Common Data Types
- `EconifyInput`: Main input type with data points and metadata
- `EconifyOutput`: Normalized output with quality scores
- `ParsedData`: Internal representation with parsed units and metadata
- `PipelineConfig`: Configuration for normalization targets, auto-targeting, exemptions
- `IndicatorType`: Classification (stock, flow, rate, currency)
- `ExplainMetadata`: Detailed transformation explanations with shares and reasons
- `FXTable`: Currency exchange rates mapping
- `Scale`: Magnitude levels (thousands, millions, billions)
- `TimeScale`: Time periods (day, month, quarter, year)

## Current Development Focus

The team is working on V2 workflows (`feat/v2-workflows` branch) which includes:
- Migrating from conditional logic to explicit state transitions with guards
- Unified monetary pipeline for all currency-related processing (wages as Monetary-Flow)
- Improved explain metadata with normalized keys and FX source tracking
- Configurable engine toggle between V1 and V2
- Explicit classification taxonomy: Monetary-Stock, Monetary-Flow, Counts, Percentages, Indices, Ratios, Energy, Commodities, Agriculture, Metals, Crypto

When working on V2 features, focus on the `src/workflowsV2/` directory structure.

### V2 File Structure
- `pipeline/`: Main pipeline orchestration (validate → parse → quality → classify → normalize → done)
- `classify/`: Classification with FX detection, exemptions, and domain bucketing
- `normalize/`: Router with fan-out/fan-in pattern, explain merge
- `domains/`: Domain-specific machines:
  - `monetary.machine.ts`: Unified monetary processing (stocks & flows including wages)
  - `counts.machine.ts`: Count-based indicators with magnitude scaling
  - `percentages.machine.ts`: Percentage pass-through with metadata
  - `indices.machine.ts`, `ratios.machine.ts`: Abstract indicators
  - `energy.machine.ts`, `commodities_enhanced.machine.ts`: Physical domains with conditional FX
  - `agriculture.machine.ts`, `metals.machine.ts`: Commodity-specific processing
  - `crypto.machine.ts`: Cryptocurrency pass-through
- `fx/`: FX rates machine (reused from V1 with fallback support)
- `shared/`: Common types, guards, actions, utilities

### V2 State Machine Architecture

The V2 engine uses XState v5 machines with explicit states and transitions:

```typescript
// Pipeline stages execute sequentially
validate → parse → quality → classify → normalize → done

// Classification performs:
1. Exemption filtering (config-based rules)
2. Domain bucketing with FX detection
3. Metadata enrichment (domain, needsFX, currencyCode)

// Normalization uses parallel processing:
- Monetary domains: Always with FX (monetaryStock, monetaryFlow)
- Physical domains: Conditional FX (energy, commodities, agriculture, metals, crypto)
- Simple domains: No FX (counts, percentages, indices, ratios)

// Post-processing:
- Fan-in: Preserves order while merging parallel results
- Explain merge: Creates flat metadata with normalized keys
```

### V2 Key Benefits

1. **Performance**: All domains process in parallel (up to 10x faster for multi-domain datasets)
2. **Predictability**: Explicit state machines with guards ensure deterministic behavior
3. **Testability**: Each state and transition can be unit tested independently
4. **FX Optimization**: FX detection during classification eliminates sequential bottlenecks
5. **Error Recovery**: Comprehensive error states at each pipeline stage
6. **Developer Experience**: Clear state visualizations and debugging capabilities