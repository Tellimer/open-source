# End-to-End Tests for @tellimer/classify

This directory contains comprehensive end-to-end tests using real economic
indicator data from the Tellimer database.

## Directory Structure

```
tests/
├── README.md                          # This file
├── config.ts                          # Test configuration and API keys
├── utils.ts                           # Test utilities and helpers
├── fixtures/                          # Real indicator data as JSON fixtures
│   ├── physical_fundamental.json      # Stock, flow, balance, capacity, volume
│   ├── numeric_measurement.json       # Count, percentage, ratio, spread, share
│   ├── price_value.json               # Price, yield
│   ├── change_movement.json           # Rate, volatility, gap
│   ├── composite_derived.json         # Index, correlation, elasticity, multiplier
│   ├── temporal.json                  # Duration, probability, threshold
│   ├── qualitative.json               # Sentiment, allocation
│   └── edge_cases.json                # Ambiguous and boundary condition indicators
└── e2e/                               # End-to-end test suites
    ├── schema_validation_test.ts      # Schema and structure validation
    ├── classification_accuracy_test.ts # Classification accuracy against ground truth
    ├── temporal_aggregation_test.ts   # Temporal pattern detection
    ├── confidence_scores_test.ts      # Confidence calibration validation
    ├── retry_and_pairing_test.ts      # ID-based pairing and retry logic
    └── provider_consistency_test.ts   # Cross-provider consistency
```

## Running Tests

### All Tests

```bash
deno test --allow-env --allow-net tests/e2e/
```

### Specific Test Suite

```bash
deno test --allow-env --allow-net tests/e2e/schema_validation_test.ts
```

### With Specific Provider

```bash
OPENAI_API_KEY=sk-... deno test --allow-env --allow-net tests/e2e/
```

## Environment Variables

Set these environment variables to run tests with different LLM providers:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GEMINI_API_KEY="..."
```

## Test Coverage

The test suite covers:

- **26 Indicator Types** across 7 categories
- **Schema Validation**: All required fields, correct types, valid enums
- **Classification Accuracy**: Comparison against ground truth
- **Temporal Aggregation**: Cumulative vs point-in-time vs period-rate detection
- **Confidence Scores**: Calibration and range validation
- **Retry Logic**: ID-based pairing and error recovery
- **Provider Consistency**: Cross-provider classification agreement

## Fixtures

Fixtures are JSON files containing real economic indicators from the Tellimer
database with:

- Indicator metadata (name, units, currency, periodicity, source, description)
- Time series data (12-24+ data points with dates and values)
- Expected classifications (ground truth for validation)

Example fixture structure:

```json
{
  "indicators": [
    {
      "indicator": {
        "id": "gdp_usa",
        "name": "Gross Domestic Product",
        "units": "USD billions",
        "currency_code": "USD",
        "periodicity": "quarterly",
        "source": "World Bank",
        "description": "Total value of goods and services produced",
        "sample_values": [
          { "date": "2023-Q1", "value": 26500 },
          { "date": "2023-Q2", "value": 27000 },
          { "date": "2023-Q3", "value": 27500 }
        ]
      },
      "expected_classification": {
        "indicator_category": "physical-fundamental",
        "indicator_type": "flow",
        "temporal_aggregation": "period-rate",
        "is_monetary": true,
        "heat_map_orientation": "higher-is-positive"
      }
    }
  ]
}
```

## Success Criteria

- **Schema Validation**: 95%+ pass rate
- **Classification Accuracy**: 85%+ agreement with ground truth
- **Temporal Detection**: 90%+ accuracy for cumulative patterns
- **Confidence Calibration**: Scores align with actual accuracy
- **Provider Consistency**: 80%+ agreement across providers
- **Retry Success**: 95%+ success rate after retries

## Contributing

To add new test cases:

1. Query Tellimer database for indicator data
2. Create fixture file in `tests/fixtures/`
3. Include expected classification (ground truth)
4. Run tests to validate
5. Document any edge cases discovered
