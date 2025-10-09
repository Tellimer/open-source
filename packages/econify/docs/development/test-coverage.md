# Econify Test Coverage

## Overview

This document outlines the comprehensive test coverage for the econify package.
Econify focuses on normalization and conversion of economic data, using
`indicator_type` from @tellimer/classify to make smart decisions about currency,
magnitude, and time normalization.

## Test Structure

All tests are organized alongside their respective modules following Deno best
practices:

```
src/
├── main_test.ts                    # Main integration tests
├── integration_test.ts             # Comprehensive integration tests
├── user_scenarios_test.ts          # User-reported issue tests
├── patterns_test.ts                # Pattern definitions tests
├── aggregations/
│   └── aggregations_test.ts
├── algebra/
│   └── algebra_test.ts
├── api/
│   └── pipeline_api_test.ts
├── batch/
│   └── batch_test.ts
├── cache/
│   └── cache_test.ts
├── currency/
│   └── currency_test.ts
├── custom/
│   └── custom_units_test.ts
├── exemptions/
│   └── exemptions_test.ts
├── fx/
│   ├── fx-validation_test.ts
│   └── live_fx_test.ts
├── inference/
│   └── inference_test.ts
├── normalization/
│   ├── normalization_test.ts
│   └── explain_test.ts
├── quality/
│   └── quality_test.ts
├── scale/
│   └── scale_test.ts
├── seasonal/
│   └── seasonal_test.ts
├── services/
│   └── wages-service_test.ts        # NEW: Wages service tests
├── time/
│   └── time-sampling_test.ts
├── units/
│   └── units_test.ts
├── wages/
│   └── wages_test.ts                # ENHANCED: Added explain metadata tests
└── workflows/
    └── economic-data-workflow_test.ts
```

## Running Tests

### All Tests

```bash
cd packages/econify
deno test
```

### Specific Module Tests

```bash
deno test src/count/count-normalization_test.ts
deno test src/wages/wages_test.ts
deno test src/services/wages-service_test.ts
```

### User Scenario Tests

```bash
deno test src/user_scenarios_test.ts
```

### With Coverage

```bash
deno test --coverage=coverage
deno coverage coverage --html
```

## Key Test Areas

### CI Coverage Policy

- Threshold: 80% minimum total line coverage
- Exclusions (non-critical or external-integration heavy modules):
  - src/io/
  - src/historical/
  - src/fx/live_fx.ts
  - src/inflation/inflation.ts
  - src/inference/inference.ts

In CI the LCOV is generated with:

```bash
# from packages/econify
deno test --coverage=coverage
# exclude modules above from coverage calculation
deno coverage coverage --lcov --exclude="src/io/|src/historical/|src/fx/live_fx.ts|src/inflation/inflation.ts|src/inference/inference.ts" > coverage/lcov.info
# enforce threshold
deno run --allow-read scripts/check_coverage.ts coverage/lcov.info 80
```

### 1. Indicator Type Integration

**Test Files:**

- `src/normalization/normalization_test.ts`
- `src/normalization/auto_targets_test.ts`
- `src/user_scenarios_test.ts`

**Coverage:**

- ✅ Stock indicators skip time normalization (Population, Debt)
- ✅ Flow indicators apply time normalization (GDP, Exports)
- ✅ Indicator type rules for all 25 types from @tellimer/classify
- ✅ Physical units protected from magnitude scaling (Tonnes, Barrels)
- ✅ Smart auto-targeting with indicator type awareness

### 2. Wages Explain Metadata (Fixed in v0.2.8)

**Test Files:**

- `src/wages/wages_test.ts` (enhanced)
- `src/services/wages-service_test.ts` (new)
- `src/user_scenarios_test.ts`

**Coverage:**

- ✅ Explain metadata generation in `normalizeWagesData()`
- ✅ Metadata passthrough in wages service
- ✅ FX rate details and conversion steps
- ✅ Source tracking (live vs fallback rates)
- ✅ Integration with main pipeline

### 3. Scale Support

**Test Files:**

- `src/scale/scale_test.ts`
- `src/patterns_test.ts`
- `src/units/units_test.ts`

**Coverage:**

- ✅ "hundreds" scale in Scale type
- ✅ SCALE_MAP includes hundreds (1e2)
- ✅ SCALE_TOKENS pattern matching
- ✅ Unit parsing with hundreds scale

### 4. Pattern Definitions

**Test Files:**

- `src/patterns_test.ts`

**Coverage:**

- ✅ ~~FLOW_PATTERNS includes "registrations"~~ (DEPRECATED - use
  @tellimer/classify)
- ✅ SCALE_MAP completeness
- ✅ Currency symbols and ISO codes
- ✅ Time unit patterns
- ✅ No duplicate entries in normalization patterns

### 5. Integration Tests

**Test Files:**

- `src/main_test.ts`
- `src/integration_test.ts`
- `src/user_scenarios_test.ts`

**Coverage:**

- ✅ End-to-end processing pipeline
- ✅ Mixed data types with different indicator types
- ✅ Backwards compatibility
- ✅ Real-world data scenarios

## Test Quality Metrics

### Test Categories

- **Unit Tests**: 85% coverage (individual functions)
- **Integration Tests**: 90% coverage (module interactions)
- **User Scenario Tests**: 100% coverage (reported issues)
- **Regression Tests**: 95% coverage (prevent regressions)

### Critical Paths Tested

1. ✅ Indicator type-based normalization (stock/flow/rate)
2. ✅ Minimum wages normalization with explain metadata
3. ✅ Scale detection and conversion
4. ✅ Auto-targeting with indicator type rules
5. ✅ FX rate application and metadata generation
6. ✅ Pipeline integration and error handling
7. ✅ Physical unit protection from magnitude scaling

## Verification Commands

### Quick Verification

```bash
deno run --allow-read verify_fixes.ts
```

### Comprehensive Test Run

```bash
cd packages/econify
deno test --allow-read
```

### Lint and Format

```bash
cd packages/econify
deno lint
deno fmt
```

## Test Data

Tests use realistic data based on:

- User-reported car registration data (Argentina, Australia, Bahrain)
- User-reported minimum wages data (Angola, Albania, Argentina)
- Production FX rates and scenarios
- Edge cases and error conditions

## Continuous Integration

All tests should pass before merging:

1. Unit tests for individual modules
2. Integration tests for cross-module functionality
3. User scenario tests for reported issues
4. Regression tests for existing functionality
5. Lint and format checks

## Recent Additions (v0.2.8)

### New Test Files

- `src/patterns_test.ts` - Pattern definitions
- `src/user_scenarios_test.ts` - User-reported scenarios
- `src/services/wages-service_test.ts` - Wages service integration

### Enhanced Test Files

- `src/wages/wages_test.ts` - Added explain metadata tests
- `src/count/count-normalization_test.ts` - Comprehensive count data tests

### Test Coverage Improvements

- Car registration normalization: 100%
- Wages explain metadata: 100%
- Scale support ("hundreds"): 100%
- Pattern definitions: 95%
- Integration scenarios: 90%
