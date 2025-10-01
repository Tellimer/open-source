# Testing Guide for @tellimer/classify

This document provides comprehensive guidance on testing the @tellimer/classify package with real economic indicator data.

## Overview

The testing system validates that LLM-powered classification produces accurate, consistent, and well-structured results across all 26 indicator types and 7 categories.

## Test Architecture

```
tests/
├── README.md                          # Testing documentation
├── config.ts                          # Test configuration and API keys
├── utils.ts                           # Test utilities and helpers
├── run_tests.sh                       # Test runner script
├── fixtures/                          # Real indicator data
│   ├── physical_fundamental.json      # 6 indicators
│   ├── numeric_measurement.json       # 5 indicators
│   ├── price_value.json               # 2 indicators
│   ├── change_movement.json           # 3 indicators
│   ├── composite_derived.json         # 4 indicators
│   ├── temporal.json                  # 3 indicators
│   └── qualitative.json               # 2 indicators
└── e2e/                               # End-to-end tests
    ├── schema_validation_test.ts      # Schema validation
    └── classification_accuracy_test.ts # Accuracy validation
```

## Test Fixtures

### Structure

Each fixture file contains real economic indicators with:

1. **Indicator Metadata**
   - `id`: Unique identifier
   - `name`: Indicator name
   - `units`: Units of measurement
   - `currency_code`: Currency (if monetary)
   - `periodicity`: Frequency (monthly, quarterly, annual)
   - `source`: Data source
   - `description`: Detailed description

2. **Time Series Data**
   - `sample_values`: Array of temporal data points
   - Format: `[{date: "YYYY-MM-DD", value: number}, ...]`
   - 12-24+ data points for pattern detection
   - Enables cumulative vs point-in-time detection

3. **Expected Classification (Ground Truth)**
   - `indicator_category`: Expected category
   - `indicator_type`: Expected type
   - `temporal_aggregation`: Expected aggregation
   - `is_monetary`: Expected monetary status
   - `heat_map_orientation`: Expected orientation

### Example Fixture

```json
{
  "category": "Physical/Fundamental",
  "description": "Indicators representing physical and fundamental economic measures",
  "indicators": [
    {
      "indicator": {
        "id": "gdp_usa",
        "name": "Gross Domestic Product",
        "units": "USD billions",
        "currency_code": "USD",
        "periodicity": "quarterly",
        "source": "Bureau of Economic Analysis",
        "description": "Total value of goods and services produced",
        "sample_values": [
          {"date": "2023-Q1", "value": 26500},
          {"date": "2023-Q2", "value": 27000},
          {"date": "2023-Q3", "value": 27200},
          {"date": "2023-Q4", "value": 27500}
        ]
      },
      "expected_classification": {
        "indicator_category": "physical-fundamental",
        "indicator_type": "flow",
        "temporal_aggregation": "period-rate",
        "is_monetary": true,
        "heat_map_orientation": "higher-is-positive"
      },
      "notes": "Flow indicator - throughput over a period"
    }
  ]
}
```

## Test Suites

### 1. Schema Validation Tests

**Purpose**: Verify LLM responses conform to expected schema

**Validates**:
- ✓ All required fields present (`indicator_id`, `indicator_category`, etc.)
- ✓ Correct field types (string, boolean, number)
- ✓ Valid enum values (category, type, aggregation, orientation)
- ✓ `indicator_id` matches request ID
- ✓ Category matches type (using `INDICATOR_TYPE_TO_CATEGORY` mapping)
- ✓ Confidence score in range [0, 1]

**Success Criteria**: 95%+ pass rate

**Run**:
```bash
deno test --allow-env --allow-net tests/e2e/schema_validation_test.ts
```

### 2. Classification Accuracy Tests

**Purpose**: Verify classifications match ground truth

**Validates**:
- ✓ `indicator_category` matches expected
- ✓ `indicator_type` matches expected
- ✓ `temporal_aggregation` matches expected
- ✓ `is_monetary` matches expected
- ✓ `heat_map_orientation` matches expected

**Tracks**:
- Overall accuracy (all fields correct)
- Per-field accuracy
- Mismatches with reasoning

**Success Criteria**: 85%+ overall accuracy

**Run**:
```bash
deno test --allow-env --allow-net tests/e2e/classification_accuracy_test.ts
```

## Running Tests

### Prerequisites

Set API keys for providers you want to test:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GEMINI_API_KEY="..."
```

### Run All Tests

```bash
cd packages/classify
chmod +x tests/run_tests.sh
./tests/run_tests.sh
```

### Run Specific Test Suite

```bash
# Schema validation only
deno test --allow-env --allow-net tests/e2e/schema_validation_test.ts

# Classification accuracy only
deno test --allow-env --allow-net tests/e2e/classification_accuracy_test.ts
```

### Run for Specific Provider

Tests automatically skip providers without API keys. To test only one provider:

```bash
# Test only OpenAI
export OPENAI_API_KEY="sk-..."
unset ANTHROPIC_API_KEY
unset GEMINI_API_KEY
./tests/run_tests.sh
```

## Test Configuration

Configuration is managed in `tests/config.ts`:

```typescript
export const defaultTestConfig: TestConfig = {
  providers: getAvailableProviders(),  // Auto-detect from env
  timeout: 60000,                      // 60 seconds
  maxRetries: 3,                       // Retry failed indicators
  batchSize: 5,                        // Indicators per batch
  includeReasoning: false,             // Include LLM reasoning
  minConfidence: 0.0,
  maxConfidence: 1.0,
};

export const testThresholds = {
  schemaValidation: 0.95,        // 95% pass rate
  classificationAccuracy: 0.85,  // 85% accuracy
  temporalAccuracy: 0.90,        // 90% temporal detection
  confidenceCorrelation: 0.70,   // 70% confidence correlation
  providerConsistency: 0.80,     // 80% cross-provider agreement
  retrySuccess: 0.95,            // 95% retry success
};
```

## Test Utilities

### Loading Fixtures

```typescript
import { loadFixture, loadAllFixtures } from '../utils.ts';

// Load single fixture
const fixture = await loadFixture('physical_fundamental.json');

// Load all fixtures
const fixtures = await loadAllFixtures();
```

### Schema Validation

```typescript
import { assertValidSchema } from '../utils.ts';

// Validate classification schema
assertValidSchema(classification);
```

### Accuracy Comparison

```typescript
import { compareClassification, calculateAccuracy } from '../utils.ts';

// Compare single classification
const comparison = compareClassification(actual, expected);
console.log(comparison.matches);        // true/false
console.log(comparison.differences);    // Array of differences
console.log(comparison.accuracy);       // 0.0 - 1.0

// Calculate overall accuracy
const report = calculateAccuracy(results);
console.log(report.accuracy);           // Overall accuracy
console.log(report.byField);            // Per-field accuracy
```

## Adding New Test Cases

1. **Choose appropriate fixture file** based on indicator category
2. **Add indicator data** with metadata and time series
3. **Specify expected classification** (ground truth)
4. **Ensure sufficient data points** (12-24+ for temporal patterns)
5. **Run tests** to validate

Example:

```json
{
  "indicator": {
    "id": "new_indicator",
    "name": "New Economic Indicator",
    "units": "units",
    "periodicity": "monthly",
    "source": "Data Source",
    "description": "Description of indicator",
    "sample_values": [
      {"date": "2024-01", "value": 100},
      {"date": "2024-02", "value": 102},
      ...
    ]
  },
  "expected_classification": {
    "indicator_category": "physical-fundamental",
    "indicator_type": "stock",
    "temporal_aggregation": "point-in-time",
    "is_monetary": false,
    "heat_map_orientation": "higher-is-positive"
  },
  "notes": "Optional notes about this indicator"
}
```

## Interpreting Test Results

### Schema Validation Output

```
SCHEMA VALIDATION SUMMARY: OPENAI
═══════════════════════════════════════════════════════════════════════════
Total indicators tested: 25
✓ Valid schemas: 24
✗ Invalid schemas: 1
Pass rate: 96.0%
Threshold: 95.0%
═══════════════════════════════════════════════════════════════════════════
```

### Classification Accuracy Output

```
ACCURACY REPORT
═══════════════════════════════════════════════════════════════════════════
Total indicators: 25
Correct classifications: 22
Overall accuracy: 88.0%

Per-field accuracy:
  indicator_category: 24/25 (96.0%)
  indicator_type: 23/25 (92.0%)
  temporal_aggregation: 21/25 (84.0%)
  is_monetary: 25/25 (100.0%)
  heat_map_orientation: 22/25 (88.0%)
═══════════════════════════════════════════════════════════════════════════
```

## Troubleshooting

### Tests Skipped

If you see "Skipping tests: API key not set", ensure environment variables are set:

```bash
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY
echo $GEMINI_API_KEY
```

### Low Accuracy

If accuracy is below threshold:

1. Check fixture ground truth is correct
2. Review LLM reasoning in test output
3. Consider if indicator is ambiguous
4. Update system prompt if needed
5. Adjust test thresholds if appropriate

### Schema Validation Failures

Common causes:
- Missing required fields in LLM response
- Invalid enum values
- Category-type mismatch
- Confidence out of range

Check error messages for specific field issues.

## Best Practices

1. **Use Real Data**: Fixtures should use real economic indicators from Tellimer database
2. **Sufficient History**: Include 12-24+ data points for temporal pattern detection
3. **Clear Ground Truth**: Expected classifications should be unambiguous
4. **Document Edge Cases**: Use `notes` field to explain unusual indicators
5. **Test All Types**: Ensure coverage across all 26 indicator types
6. **Cross-Provider Testing**: Test with multiple LLM providers for consistency
7. **Update Fixtures**: Keep fixtures current with real-world data

## Continuous Integration

To run tests in CI/CD:

```yaml
# .github/workflows/test.yml
- name: Run E2E Tests
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  run: |
    cd packages/classify
    ./tests/run_tests.sh
```

## Further Reading

- `tests/README.md` - Detailed testing documentation
- `PROMPT_ENGINEERING.md` - System prompt design
- `PAIRING_AND_RETRY.md` - ID-based pairing system
- `IMPLEMENTATION_SUMMARY.md` - Implementation overview

