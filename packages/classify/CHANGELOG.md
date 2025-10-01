# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **ID-Based Pairing System**: Automatic unique ID generation for indicators (or use custom IDs)
- **Individual Retry Logic**: Failed indicators automatically retried up to 3 times with exponential backoff
- **Comprehensive Statistics**: Detailed success/failure tracking with retry counts and success rate percentage
- **Enhanced Error Tracking**: `FailedIndicator` type now includes retry count
- **Improved Debug Logging**: Formatted summary table with detailed statistics
- **Response Validation**: LLM responses validated to include matching indicator IDs
- **Order-Independent Pairing**: Responses can be in any order, paired by ID using Map lookup
- **Graceful Degradation**: Batch failures fall back to individual indicator retries
- **Comprehensive Role Priming**: System prompt now includes expert role definition, mission statement, quality standards, and confidence calibration
- **Enhanced Field Descriptions**: Each classification field now has detailed descriptions, examples, and type annotations
- **Structured Response Requirements**: Explicit format requirements with visual examples to prevent parsing errors
- **Confidence Calibration Guidelines**: Clear scoring guidelines (0.95-1.0, 0.85-0.94, 0.70-0.84, <0.70) for accurate confidence reporting
- **Temporal Data Support**: `sample_values` can now be temporal data points with date/value pairs for better pattern detection
- **Comprehensive E2E Tests**: Full test suite with 34 real economic indicators covering all 26 types
- **Test Fixtures**: Real indicator data from Tellimer database with ground truth classifications
- **Edge Case Testing**: 9 edge case indicators testing ambiguous classifications and boundary conditions
- **Schema Validation Tests**: Automated validation of LLM response structure and types
- **Classification Accuracy Tests**: Comparison against ground truth with per-field accuracy tracking
- **Test Utilities**: Helper functions for loading fixtures, comparing classifications, and asserting validity
- **Test Configuration**: Flexible configuration for multiple LLM providers with API key management
- **New Documentation**: Added `PAIRING_AND_RETRY.md`, `PROMPT_ENGINEERING.md`, `tests/README.md`, `tests/EDGE_CASES.md`, `TESTING_GUIDE.md`, and `E2E_TESTING_SUMMARY.md`

### Changed
- **BREAKING**: `ClassifiedMetadata` now requires `indicator_id` field
- **BREAKING**: `ClassificationResult.failed` now uses `FailedIndicator[]` type (includes `retries` field)
- **BREAKING**: `ClassificationResult` now includes `summary` object with detailed statistics
- **BREAKING**: `ClassificationResult` now includes `retries` field for total retry count
- **BREAKING**: `Indicator.sample_values` now supports both `number[]` and `TemporalDataPoint[]` types
- `Indicator` interface now includes optional `id` field
- User prompt now formats temporal sample_values with date/value pairs for better LLM context
- `classifyIndicatorsWithOptions` now uses individual retry logic instead of simple batch retry
- System prompt completely rewritten with comprehensive role priming and structured instructions
- System prompt now includes visual separators, quality standards, and confidence calibration
- User prompt enhanced with dynamic indicator counts and explicit response requirements
- User prompt now includes visual formatting and field checklist
- Debug logging significantly enhanced with formatted output and retry information

### Fixed
- Response pairing issues when LLM returns responses in different order
- Partial batch failures now handled gracefully with individual retries
- Better error messages showing which specific indicator failed and why

### Added

- **Comprehensive Indicator Taxonomy** — Expanded from 8 to 26 indicator types
  - Added 18 new types: balance, capacity, volume, spread, share, price, yield, volatility, gap, correlation, elasticity, multiplier, duration, probability, threshold, sentiment, allocation
  - Organized into 7 categories: Physical/Fundamental, Numeric/Measurement, Price/Value, Change/Movement, Composite/Derived, Temporal, Qualitative
  - Includes decision tree for accurate classification
  - Covers 95%+ of economic indicators with precise categorization

- **Indicator Category Classification** — New `indicator_category` field
  - High-level grouping: physical-fundamental, numeric-measurement, price-value, change-movement, composite-derived, temporal, qualitative, other
  - Automatically validated against indicator_type
  - Helps organize and filter indicators by broad category
  - Exported `INDICATOR_TYPE_TO_CATEGORY` mapping for programmatic access

- **Temporal Aggregation Classification** — New `temporal_aggregation` field
  - Replaces ambiguous `is_cumulative` boolean with precise temporal classification
  - Six options: point-in-time, period-rate, period-cumulative, period-average, period-total, not-applicable
  - Distinguishes between stock (point-in-time), flow (period-rate), and cumulative (period-cumulative)
  - Critical for understanding how indicator values accumulate over time
  - Includes detailed examples and key distinctions in documentation

- **Heat Map Orientation** — New `heat_map_orientation` field in classification results
  - Indicates whether higher or lower values are considered positive
  - Three options: "higher-is-positive", "lower-is-positive", "neutral"
  - Useful for visualization, color coding, and dashboard design
  - LLM automatically determines orientation based on economic and social implications

- **Strict Type Validation** — Enhanced validation system
  - Exported validation constants: `VALID_INDICATOR_TYPES`, `VALID_INDICATOR_CATEGORIES`, `VALID_TEMPORAL_AGGREGATIONS`, `VALID_HEAT_MAP_ORIENTATIONS`
  - Improved error messages showing all valid options
  - Prevents LLM from creating invalid type variations
  - Ensures exact string matching for all classification fields
  - Validates category matches indicator type

### Changed

- **BREAKING**: Removed `is_cumulative` field from `ClassifiedMetadata`
  - Replaced with more precise `temporal_aggregation` field
  - Migration: `is_cumulative: true` → `temporal_aggregation: "period-cumulative"`
  - Migration: `is_cumulative: false` → depends on indicator (see temporal_aggregation options)

- **BREAKING**: Added required fields to `ClassifiedMetadata`
  - `indicator_category`: Required field for high-level grouping
  - `temporal_aggregation`: Required field for temporal classification
  - All existing code must be updated to handle these new fields

## [0.1.0] - 2025-10-01

### Added

- Initial release of @tellimer/classify
- LLM-based economic indicator classification
- Support for multiple LLM providers:
  - OpenAI (GPT-4o, GPT-4o-mini)
  - Anthropic (Claude 3.5 Sonnet)
  - Google Gemini (Gemini 2.0 Flash Thinking)
- Automatic classification of indicator types:
  - stock, flow, count, percentage, index, ratio, rate, other
- Metadata enrichment:
  - is_monetary flag
  - is_cumulative flag
  - confidence scores
  - optional reasoning
- Batch processing with configurable batch sizes
- Robust error handling with retry logic
- Comprehensive TypeScript type definitions
- Full test coverage
- Example usage files for all providers
- Configuration examples and best practices
- Complete API documentation

### Features

- `classifyIndicators()` - Classify multiple indicators
- `classifyIndicator()` - Classify a single indicator
- `classifyIndicatorsWithOptions()` - Advanced classification with batching and error handling
- Provider abstraction layer for easy switching between LLMs
- Automatic retry with exponential backoff
- Timeout handling
- Debug logging support
- Environment-based configuration

[0.1.0]: https://github.com/Tellimer/open-source/releases/tag/classify-v0.1.0

