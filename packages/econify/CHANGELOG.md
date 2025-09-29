# Changelog

All notable changes to the econify package will be documented in this file.

## [1.1.6] - 2025-09-29

### Added

- **Special handling configuration for data quality issues**
  - New `specialHandling.unitOverrides` option to override units/scale for
    specific indicators
  - Useful for indicators where database stores misleading labels (e.g.,
    "Thousand" as label, not scale factor)
  - Can match by indicator ID or name (case-insensitive)
  - Prevents double-scaling bugs when database values are already in the labeled
    unit
  - Example: Car Registrations with `units: "Thousand"` but value is already the
    actual count
  - See usage example in documentation

## [1.1.5] - 2025-09-29

### Added

- **Cumulative/Year-to-Date (YTD) series detection and handling** (optional
  feature)
  - New `detectCumulativeSeries()` utility to identify cumulative time series
    (values that monotonically increase within calendar years)
  - New `markCumulativeData()` helper to flag data points as cumulative
  - Econify now respects `metadata.isCumulative` flag and skips time
    normalization for cumulative data
  - Prevents meaningless time conversions (e.g., converting YTD August value
    from yearly to monthly)
  - User must detect cumulative patterns in their data and pass the flag
  - See `docs/CUMULATIVE_DETECTION.md` for usage guide

### Fixed

- **Auto-targeting now includes non-monetary indicators** (count data like Car
  Registrations)
  - Previously, `computeAutoTargets` skipped all non-monetary indicators,
    preventing auto-targeting of magnitude and time dimensions for count data
  - Now count indicators participate in auto-targeting for magnitude and time
    (currency dimension still skipped for non-monetary)
  - Fixes issue where yearly count data (e.g., Azerbaijan Car Registrations) was
    not being converted to monthly when majority of countries report monthly
- **Enhanced `parseTimeScale` to handle database periodicity formats**
  - Now recognizes "Yearly", "Monthly", "Quarterly", "Weekly", "Daily", "Hourly"
    (case-insensitive)
  - Previously only matched unit string patterns like "per year", "annually",
    etc.
  - Ensures periodicity field from database is properly parsed for
    auto-targeting

### Impact

- **Cumulative indicators** (e.g., year-to-date car registrations):
  - Time normalization automatically skipped when `metadata.isCumulative = true`
  - Magnitude conversion still applied (thousands → ones)
  - Users must detect cumulative patterns in their data and pass the flag (see
    docs)
- **Car Registrations and similar count indicators** now benefit from
  auto-targeting:
  - Magnitude: Auto-detects dominant scale (e.g., "ones" vs "thousands")
  - Time: Auto-detects dominant periodicity and converts outliers (e.g., yearly
    → monthly)
  - **Note**: Only applies to non-cumulative count data
- **Example**: With 3 monthly + 1 yearly Car Registrations (non-cumulative):
  - Auto-target selects: `magnitude: "ones"`, `time: "month"` (75% majority)
  - Yearly value automatically converted to monthly for comparability

## [1.1.4] - 2025-09-29

### Added

- Group-level auto-target selections on API result:
  `PipelineResult.targetSelectionsByIndicator`
  - Contains per-indicator `selected`, `shares`, and `reason` so consumers can
    read distributions once per indicator

### Changed

- Avoid per-item duplication of `targetSelection.shares` in indicator-batch
  results
  - Items still include `targetSelection.selected` and `reason`, but `shares`
    are moved to the group-level map
- Normalized currency keys in auto-target shares to canonical ISO 4217 uppercase
  (e.g., `AWG`, `USD`, `EUR`)
  - Filters out non-currency tokens to prevent malformed keys

### Improved

- Align FX rate display precision in explain metadata: `explain.fx.rate` rounded
  to 6 decimals for consistency with conversion factors

### QA

- Lint clean and full test suite passing

## [1.1.3] - 2025-01-29

### Added

- **Export monetary detection utilities** - Export `isMonetaryIndicator` and
  `isMonetaryUnit` functions from API module
  - Allows external consumers (like articles project) to detect monetary vs
    non-monetary data
  - Enables conditional application of `targetCurrency` based on data type

## [1.1.2] - 2025-09-29

### Fixed

- **Non-monetary indicator handling** - Fixed "No FX rate available" errors for
  non-monetary units
  - Added automatic detection of non-monetary indicators in EconifyBatchSession
  - Workflow router now properly categorizes non-monetary units (%, POINTS,
    CELSIUS, MM, THOUSAND/BILLION without currency, etc.)
  - Removed currency conversion attempts for percentages and count categories
  - Added comprehensive E2E tests verifying all 60+ production failing
    indicators now work
  - Maintains backward compatibility for monetary data (USD, EUR, etc.)

## [1.1.0] - 2025-09-29

### Added

- **Batch Processing API** for proper per-indicator normalization
  - New `EconifyBatchSession` class for accumulating and processing data points
    together
  - New `processEconomicDataByIndicator` helper function for automatic indicator
    grouping
  - Ensures all items of the same indicator are normalized to consistent units
    (currency, magnitude, time scale)
  - Comprehensive documentation in `docs/batch-processing.md` and
    `PER_INDICATOR_NORMALIZATION.md`

### Fixed

- **Indicator name normalization** - Indicators with name variations (different
  casing, trailing spaces) are now properly grouped together
- **Time scale extraction** - Now prefers time scale from unit parsing over
  periodicity field
- Fixed inconsistent auto-target normalization when processing countries
  individually
- Fixed TypeScript type errors in test files
- Fixed all lint violations (25 errors resolved)

### Improved

- Enhanced auto-target normalization to handle magnitude differences (thousands
  vs millions vs billions)
- Added comprehensive test coverage for batch processing scenarios
- Added implementation instructions for consuming applications
- Better handling of indicator key normalization (lowercase, trim, normalize
  spaces)

## [1.0.8] - 2025-09-29

### Fixed

- Auto-targeting grouped rows too narrowly by `item.name`, leading to per-row
  time selections (e.g., quarterly/yearly) instead of the indicator-wide
  dominant time basis.
  - Now resolves indicator keys with sensible fallbacks: `name` →
    `metadata.indicator_name` → `metadata.indicator_id|indicatorId` → `id`.
  - Ensures the dominant time scale is selected across the entire indicator and
    applied consistently.

### Changed

- `PipelineConfig.indicatorKey` now accepts a resolver function to derive
  grouping keys, enabling custom grouping while remaining backward compatible
  (default still uses `name`).
- Explain `targetSelection` continues to show per-indicator `shares`,
  `selected`, and `reason` reflecting the true indicator-wide majority.

### Tests

- Full econify test suite passes (362 tests) after the fix.

## [1.0.7] - 2025-09-29

### Changed

- Reverted to stable 0.4.1 codebase for production use
- Removed V2 workflows and experimental features
- Maintained auto-targeting functionality from 0.4.1

## [0.4.1] - 2025-09-24

### Changed

- Auto-target time basis now prefers unit time token over `item.periodicity` for
  share extraction, aligning auto-targeting with per-item normalization
  precedence.

### Docs

- Updated INTERNAL_BRIEF with decision-based flows and clarified time precedence
  and tie-breakers.
- Simplified Mermaid syntax for broader renderer compatibility; fixed rendering
  issues in the auto-target micro-flows and main flow.

### Tests

- Full econify suite passes after the change.

## [0.4.0] - 2025-09-23

### Added

- Auto-target by indicator: compute majority currency/magnitude/time per
  indicator and normalize accordingly; includes detailed explain.targetSelection
  with shares and reasons.
- Public API: computeAutoTargets() helper and AutoTargetOptions types.

### Changed

- PipelineOptions now supports autoTargetByIndicator, indicatorKey,
  autoTargetDimensions, minMajorityShare, tieBreakers, allowList/denyList.
  Backward-compatible when not set.
- Explain metadata enriched (currency/scale/time normalized fields +
  targetSelection details), following our flatter explain structure preferences.

### Tests

- Added exact shares unit tests for computeAutoTargets on crafted distributions.
- Added big mock dataset tests and synthetic stress tests across seeds; ensured
  stability and deterministic tie-break behavior.

### Chore

- Fixed all Deno lint issues (removed `any` casts, added proper types), and
  formatted codebase.

## [0.3.3] - 2025-09-23 (unreleased)

### Tests

- Mixed scales (AUS/AUT/AZE) test made strict: AZE must be "USD millions per
  month".
  - Removed transitional allowances for AZE unit label and numeric value.
  - Locks in invariant: pipeline honors `targetMagnitude = "millions"` and
    `targetTimeScale = "month"` for monetary flows.

### Fixed

- Documented wages routing predicate tighten-up: only triggers on explicit wage
  terms in indicator name.
  - Prevents misclassifying trade balances (e.g., AZE) as wages, ensuring proper
    magnitude scaling.

## [0.3.2] - 2025-09-23

### Fixed

- Consistent target magnitude application in pipeline for mixed-source scales
  (AUS/AUT/AZE):
  - AZE example (USD thousands per quarter) now normalizes to USD millions per
    month when `targetMagnitude: "millions"` and `targetTimeScale: "month"` are
    set.
  - Correctly falls back to inferred scale when singular tokens are present in
    unit text.
- Prevent magnitude scaling for percentages.
- Wages router: stop classifying generic currency+time series as wages; now only
  triggers on explicit wage/salary/earnings/compensation/pay keywords in
  indicator name.

### Changed

- Non-currency physical domains (energy, commodities, agriculture, metals,
  emissions):
  - Do not force target magnitude; preserve concrete base units (e.g., GWh,
    metric tonnes).
- Count domain (non-currency counts such as registrations, population when
  scaled):
  - Apply target magnitude for comparability (thousands/millions, etc.).
  - Explain metadata retains magnitude step (e.g., "thousands → millions").
- Stock-like counts (e.g., Population):
  - No per-time in units; periodicity shows target with `adjusted=false`.

### Tests

- Added pipeline-level integration test (AUS/AUT/AZE) to assert canonical
  output: "USD millions per month" under `targetMagnitude='millions'` and
  `targetTimeScale='month'`.
- Full econify suite passing after changes.

## [0.3.1] - 2025-09-18

### Changed

- Stock-like monetary indicators (Money Supply M0/M1/M2, monetary base):
  - Unit strings no longer include per-time for stocks; normalized units render
    as, e.g., "USD millions" (no "per month").
  - Suppress `timeScale` component in explain metadata for stock-like monetary
    indicators; keep `reportingFrequency` when explicit periodicity is present.
  - Added `explain.domain = "monetary_aggregate"` for monetary aggregates to
    support consistent frontend formatting.
- Ensured `targetMagnitude` is consistently reflected in normalized unit labels
  for stock indicators.

### Tests

- Ran full econify test suite; all tests passing after changes.

## [0.3.0] - 2025-09-18

### Added

- explain.reportingFrequency: surfaces dataset reporting frequency (explicit
  periodicity) separately from unit time basis used for conversion.

### Changed

- Time conversion now prefers time components extracted from units over dataset
  periodicity. Periodicity is treated as reporting frequency and is surfaced via
  reportingFrequency.
- normalization.ts updated to align with explain.ts for the new precedence (unit
  time > dataset periodicity).

### Tests

- Added tests verifying reportingFrequency behavior when explicit periodicity is
  present, absent, and when unit time differs from dataset periodicity.
- Versioning: documented SemVer policy (pre-1.0 MINOR may include breaking
  changes; packages versioned independently in monorepo)

### Documentation

- README updated with "New in 0.3.0" and references to reportingFrequency.
- Enhanced Explain Example updated to include reportingFrequency and clarify
  unit-time vs reporting frequency.

## [0.2.9] - 2025-09-17

### Added

- Explain metadata now surfaces `domain` for non-monetary categories (energy,
  commodity, emissions, agriculture, metals)
- Extended custom unit registries: agriculture (bushel, metric tonnes, short
  ton) and metals (copper tonnes, silver oz)
- Router enhancements: baseUnit-aware predicates; non-monetary buckets ignore
  currency and time normalization

### Fixed

- Wages service respects `excludeIndexValues` even when FX rates are unavailable
  (default true)
- Normalized unit formatting consistency (prefer "per <time>" style)

- Domain detection: removed currency+time heuristic from wages; prevents
  mislabeling indicators like Balance of Trade as wages

- Workflow parsing: coerce numeric string values (e.g., "13259.000") to numbers
  to ensure normalization/explain runs. Resolves missed normalization for count
  indicators like Employed Persons (e.g., ARG).
- Wages explain/domain: pass `indicatorName` through wages pipeline so
  `explain.domain` reliably surfaces as "wages" for wage indicators.
- Non-currency domains (count, percentage, energy, commodity, agriculture,
  metals, emissions): omit currency in explain/units and use base units for
  normalized unit strings (e.g., "units per month", "BBL/D/1K per month").

### Testing

- Negative tests to ensure non-monetary categories ignore
  targetCurrency/targetTimeScale
- Workflow stress test with diverse dataset (wages, counts, percentages, energy,
  commodities, emissions, agriculture, metals, inference)

- Comprehensive domain detection suite:
  wages/count/percentage/energy/commodity/agriculture/metals/emissions, with
  negative/conflict tests

### Documentation

- Organized docs: moved supplemental guides under `packages/econify/docs/`
- README updated with domain feature and docs links

## [0.2.8] - 2025-01-16

### Fixed

- **Car Registration Normalization**: Fixed incorrect normalization of car
  registration data
  - **Scale Support**: Added proper support for "hundreds" scale (1e2
    multiplier)
  - **Indicator Classification**: Car registrations now correctly classified as
    "flow" indicators instead of "rate"
  - **Count Data Handling**: Created specialized normalization for count-based
    indicators
  - **No Currency Conversion**: Count indicators (like car registrations) no
    longer get inappropriate currency conversion
  - **Unit Context**: "Units" in car registration context now treated as count
    data, not index data
  - **Pattern Detection**: Added "registrations" to flow patterns for proper
    classification
- **Wages Explain Metadata**: Fixed empty explain metadata in minimum wages
  processing
  - **Explain Generation**: Added explain metadata support to
    `normalizeWagesData()`
  - **Metadata Passthrough**: Enhanced wages service to include explain metadata
    in results
  - **FX Rate Details**: Wages normalization now includes proper FX rates and
    conversion steps

### Added

- **Count Normalization Module**: New `count/count-normalization.ts` module for
  count-based indicators
  - `isCountIndicator()` - Detects car registrations and similar count data
  - `isCountUnit()` - Identifies count units vs index units
  - `normalizeCountData()` - Scale-only normalization for count data
  - `detectCountData()` - Dataset-level count detection
- **Enhanced Scale System**: Extended scale support to include "hundreds"
  - Updated `Scale` type to include "hundreds"
  - Added "hundreds" to `SCALE_MAP` and `SCALE_TOKENS`
  - Fixed `MAGNITUDE_PATTERNS` for proper hundreds handling

### Technical Improvements

- **Normalization Logic**: Updated `normalizeValue()` to skip currency
  conversion for count data
- **Pattern Matching**: Enhanced unit parsing to better distinguish count vs
  index contexts
- **Type Safety**: Fixed TypeScript issues with scale type definitions
- **Code Quality**: Addressed linting issues and improved code formatting

## [0.2.7] - 2025-01-16

### Enhanced

- **FX Date Transparency**: Added support for FX rate dates in explain metadata
  - **Date Tracking**: `FXTable.dates` field to specify when each rate was last
    updated
  - **Explain Integration**: `explain.fx.asOf` field shows rate timestamp in
    metadata
  - **SNP Database Ready**: Perfect for passing through dates from external FX
    sources
  - **Full Transparency**: Users can see exactly when each exchange rate was
    current

### Technical Improvements

- **Enhanced FXTable Interface**: Added optional `dates` field for rate
  timestamps
- **Backward Compatible**: Existing code works unchanged - dates are optional
- **Documentation Enhanced**: Complete examples showing FX date usage patterns

## [0.2.6] - 2025-01-16

### Enhanced

- **Clean Component Structure**: Restructured unit components for optimal
  frontend access
  - **Direct Access**: `currency.original`, `currency.normalized` for currency
    components
  - **Scale Access**: `scale.original`, `scale.normalized` for scale components
  - **Time Access**: `timeScale.original`, `timeScale.normalized` for time
    components
  - **No String Parsing**: Direct property access eliminates need to parse unit
    strings
  - **Perfect for UI**: Ideal for conditional logic, component building, and
    localization

### Technical Improvements

- **Flattened Structure**: Moved from nested `units.original/normalized` to
  top-level component fields
- **TypeScript Enhanced**: Better autocomplete and type safety for component
  access
- **Frontend Optimized**: Structure designed specifically for frontend
  consumption patterns

## [0.2.5] - 2025-01-16

### Enhanced

- **Separate Unit Components**: Added individual currency, scale, and
  periodicity fields for easy frontend access
  - **Original Components**: `units.original.currency`, `units.original.scale`,
    `units.original.periodicity` for source data
  - **Normalized Components**: `units.normalized.currency`,
    `units.normalized.scale`, `units.normalized.periodicity` for target data
  - **Frontend Benefits**: No string parsing needed - direct object property
    access
  - **UI Integration**: Perfect for building dynamic components, tooltips, and
    localized displays

### Technical Improvements

- **Enhanced TypeScript Interfaces**: Extended `Explain.units` interface with
  separate component fields
- **Improved Developer Experience**: Eliminates need for frontend string parsing
  of unit information
- **Better Component Architecture**: Clear separation between original and
  normalized unit components

## [0.2.4] - 2025-01-16

### Enhanced

- **Enhanced Explain Metadata**: Significantly improved the explain metadata
  system with comprehensive conversion details:
  - **Magnitude Scaling**: Added direction ("upscale" | "downscale" | "none"),
    factor, and human-readable descriptions
  - **Periodicity Conversion**: Added factor, direction ("upsample" |
    "downsample" | "none"), and clear descriptions (e.g., "year → month (÷12)")
  - **Complete Unit Information**: Added both simple and full unit strings with
    time periods
  - **Conversion Summary**: Step-by-step conversion chain with total factor
    calculation
  - **Logical Processing Order**: Scale → Currency → Time for clearer
    understanding

### Technical Improvements

- **Enhanced TypeScript Interfaces**: Extended `Explain` interface with detailed
  conversion metadata
- **Improved User Experience**: Clear, human-readable conversion descriptions
  replace technical factors
- **Better Transparency**: Complete visibility into all normalization decisions
  and calculations

## [0.2.3] - 2025-01-16

### Fixed

- **Time Conversion Warning System**: Added proper warning when time conversion
  is requested but no source time scale is available
- **AFG Data Issue**: Resolved cases where yearly data wasn't being converted to
  monthly due to missing time scale information
- **Silent Conversion Failures**: System now provides clear warnings instead of
  silently failing when time conversion cannot be performed

### Added

- **Enhanced Error Handling**: Clear console warnings when time conversion is
  requested but impossible to perform
- **Better Test Coverage**: Added 2 new tests for time conversion warning
  scenarios
- **Improved Debugging**: Warning messages help identify data quality issues

### Technical Details

- Enhanced `normalizeValue()` function with warning system for missing time
  scale information
- Added test coverage for warning scenarios in `normalization_test.ts`
- **227 Total Tests**: All passing with enhanced coverage
- Maintained full backward compatibility

### Example Warning Output

```
⚠️ Time conversion to month requested but no source time scale found in unit "USD Million" or explicit fields. Value unchanged.
```

This fix addresses the review issue where AFG data showed
`periodicity_adjusted: true` but no actual conversion was applied.

## [0.2.2] - 2025-01-16

### Added

- **Explicit Metadata Fields Support**: Enhanced `ParsedData` and `BatchItem`
  interfaces to accept explicit `periodicity`, `scale`, and `currency_code`
  fields
- **Smart Metadata Resolution**: Prioritizes explicit fields over unit string
  parsing for higher accuracy
- **Automatic Case Normalization**: Converts database values ("Quarterly" →
  "quarter", "Billions" → "billions") to match expected types
- **Enhanced Processing Logic**: Updated `normalizeValue()` and
  `buildExplainMetadata()` to use explicit metadata when available
- **Comprehensive Test Suite**: Added 5 new tests covering explicit metadata
  priority logic and fallback behavior
- **New Example**: Added `explicit_metadata_example.ts` demonstrating the new
  feature with real-world scenarios
- **Updated Documentation**: Enhanced README with explicit metadata fields
  section and updated all examples

### Changed

- **Improved Data Processing**: Uses explicit database fields first, falls back
  to unit string parsing only when needed
- **Better API Design**: Matches clean database schema separation instead of
  forcing concatenated unit strings
- **Updated Examples**: Enhanced `explain_metadata_example.ts` to show explicit
  metadata fields integration
- **Test Coverage**: Increased from 221 to 223 passing tests with comprehensive
  explicit metadata validation

### Technical Details

- Added `normalizeScale()` and `normalizeTimeScale()` helper functions for case
  normalization
- Enhanced `processItem()` function to extract and use explicit metadata
- Updated normalization and explain metadata generation to prioritize explicit
  fields
- Maintains full backward compatibility with existing unit string parsing

### Benefits

- **Higher Accuracy**: Explicit fields are more reliable than string parsing
- **Better Performance**: Less string parsing overhead
- **Cleaner Consumer Code**: No need to concatenate metadata into unit strings
- **Future Proof**: Works with any database schema design

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2025-01-16 - Time Scaling Fix

### 🐛 Bug Fixes

- **Time Scaling**: Fixed missing `toTimeScale` parameter in `processBatch` call
  for standard economic data processing
  - Quarterly data now properly converts to monthly when
    `targetTimeScale: "month"` is specified
  - Quarterly values are correctly divided by 3 to get monthly equivalents
  - Explain metadata now accurately shows `periodicity_adjusted: true` when time
    scaling is applied
  - Resolves issue where quarterly data wasn't being converted despite correct
    configuration

### 🔧 Technical Details

- Added `toTimeScale: config.targetTimeScale` to the `normalizeDataService`
  batch processing options
- Time scaling was already working for wages data but was missing for general
  economic indicators
- All existing tests continue to pass, including time resampling scenarios

### 📊 Impact

Before this fix, data like:

```typescript
{ value: -482.58, unit: "XOF Billions Quarterly" }
```

Would not be converted to monthly despite `targetTimeScale: "month"`
configuration.

After this fix, the same data correctly converts to monthly values with proper
explain metadata showing the time adjustment.

## [0.2.0] - 2025-01-16 - Explain Metadata Feature Release

🎯 **Explain Metadata Feature Release**: This release adds comprehensive
normalization metadata to provide transparency into FX rates, magnitude scaling,
and time adjustments.

### 🏆 Release Highlights

- **Explain Metadata**: New optional `explain` field provides detailed
  normalization metadata
- **FX Transparency**: Shows actual exchange rates used, source (live/fallback),
  and provider
- **Magnitude Clarity**: Captures scale conversions with exact factors (e.g.,
  billions→millions = 1000x)
- **Time Adjustments**: Records periodicity changes and whether temporal scaling
  was applied
- **Unit Provenance**: Clear original and normalized unit strings for full
  transparency
- **Backward Compatible**: Explain metadata is optional (default: false) to
  avoid overhead

### ✨ Added

- **New Types**: `Explain` interface with fx, magnitude, periodicity, and units
  metadata
- **Pipeline Option**: `explain?: boolean` flag in `PipelineConfig` to enable
  metadata
- **FX Source Tracking**: Captures whether rates came from live sources or
  fallback data
- **Magnitude Factors**: Exact conversion factors for scale changes (e.g., 1000
  for billions→millions)
- **Time Scale Recording**: Original and target time periods with adjustment
  flags
- **Unit Strings**: Human-readable original and normalized unit descriptions
- **Comprehensive Tests**: 10 new tests covering all explain metadata scenarios

### 🔧 Enhanced

- **Batch Processing**: Updated to support explain metadata generation
- **Wages Service**: Enhanced to include explain metadata for wage normalization
- **Pipeline Workflow**: FX source information now tracked through entire
  pipeline
- **Error Handling**: Graceful handling when explain metadata cannot be
  generated

### 📊 Technical Details

- **Zero Performance Impact**: Explain metadata only generated when explicitly
  requested
- **Memory Efficient**: Metadata objects only created when needed
- **Type Safe**: Full TypeScript support with proper interfaces
- **Test Coverage**: All 218 tests passing including new explain functionality

### 💡 Usage Example

```typescript
const config: PipelineConfig = {
  targetCurrency: "USD",
  targetMagnitude: "millions",
  explain: true, // Enable explain metadata
};

const result = await pipeline.run(data);
console.log(result[0].explain?.fx?.rate); // Shows actual FX rate used
console.log(result[0].explain?.magnitude?.factor); // Shows scale conversion factor
```

## [0.1.6] - 2025-01-15 - Architecture Cleanup & Modernization Release

🎯 **Architecture Cleanup & Modernization Release**: This release focuses on
removing backwards compatibility code, reorganizing the codebase architecture,
and consolidating examples for a cleaner, more maintainable codebase.

### 🏆 Release Highlights

- **Clean Architecture**: Removed all backwards compatibility code and legacy
  APIs
- **Organized Examples**: Consolidated all examples into centralized `examples/`
  folder with comprehensive documentation
- **Simplified API**: Single unified pipeline API with no confusing legacy
  functions
- **Better Separation**: Clear distinction between API layer, XState workflows,
  and business logic services
- **Zero Regressions**: All 201 tests passing with improved code quality

### 🗑️ Removed (Breaking Changes)

#### Legacy API Cleanup

- **Removed `processWagesIndicator()`** - Legacy function replaced by unified
  `processEconomicData()` API
- **Removed `createWagesPipelineConfig()`** - Legacy configuration helper no
  longer needed
- **Removed `IndicatorData` interface** - Legacy data structure replaced by
  modern pipeline types
- **Removed `ProcessingResult` interface** - Legacy result structure replaced by
  unified response format

#### Backwards Compatibility Code

- **Removed deprecated exports** from `src/services/index.ts`
- **Removed legacy test cases** (4 test cases) that used deprecated APIs
- **Removed legacy example files** that showed outdated usage patterns

### ✨ Added

#### Centralized Examples

- **`examples/README.md`** - Comprehensive guide for all examples with usage
  instructions and learning paths
- **`examples/run_all_examples.ts`** - Automated test runner for all examples to
  ensure they stay working
- **Consolidated Examples**: All scattered examples moved to main `examples/`
  folder

#### Enhanced Documentation

- **Progressive Learning Path**: Examples organized from basic to advanced usage
- **Feature Coverage Matrix**: Clear mapping of which examples demonstrate which
  features
- **Running Instructions**: Simple commands to run individual or all examples

### 🔧 Improved

#### Architecture Reorganization

- **Clean Separation**: `src/api/` for public APIs, `src/workflows/` for XState
  workflows only, `src/services/` for business logic
- **Unified Pipeline**: Single robust pipeline that automatically detects data
  types and applies appropriate processing
- **Modern Examples**: All examples updated to use current API patterns and
  imports

#### Code Quality

- **Simplified Codebase**: Removed 169+ lines of legacy code
- **Single Source of Truth**: One unified pipeline API for all users
- **Easier Maintenance**: No need to maintain multiple API versions
- **Better Performance**: Removed unused code paths

### 🧪 Quality Assurance

#### Test Results

- **201 Total Tests**: All passing (100% success rate)
- **7 Working Examples**: All examples run successfully with comprehensive
  output
- **Zero Regressions**: All existing functionality preserved
- **Clean Imports**: All import paths updated and verified

### 🚀 For Users

#### Migration Required

**Before (Deprecated - No Longer Available):**

```typescript
// ❌ These APIs have been removed
import { createWagesPipelineConfig, processWagesIndicator } from "econify";
```

**After (Modern Unified API):**

```typescript
// ✅ Use the unified pipeline API
import { processEconomicData } from "econify";
const result = await processEconomicData(data, options);
```

#### Benefits for Users

1. **Simpler API**: One unified function handles all data types (wages,
   currencies, time scales, exemptions)
2. **Better Examples**: Centralized, well-documented examples with progressive
   complexity
3. **Cleaner Codebase**: No confusing legacy APIs or deprecated warnings
4. **Future-Proof**: Clean foundation for new features without backwards
   compatibility baggage

### 📋 Migration Guide

#### Required Changes

1. **Replace `processWagesIndicator()`** with `processEconomicData()` - the
   unified API automatically detects wages data
2. **Remove `createWagesPipelineConfig()`** calls - use standard pipeline
   options instead
3. **Update imports** - remove any imports of deprecated functions

#### Example Migration

```typescript
// Before (v0.1.5 and earlier)
import { createWagesPipelineConfig, processWagesIndicator } from "econify";
const config = createWagesPipelineConfig({ targetCurrency: "USD" });
const result = processWagesIndicator(data, fxRates, config);

// After (v0.1.6+)
import { processEconomicData } from "econify";
const result = await processEconomicData(data, {
  targetCurrency: "USD",
  fxFallback: fxRates,
  // Wages detection and processing happens automatically
});
```

### 🔄 Breaking Changes Summary

- **Removed**: `processWagesIndicator()`, `createWagesPipelineConfig()`,
  `IndicatorData`, `ProcessingResult`
- **Replacement**: Use `processEconomicData()` for all data processing needs
- **Impact**: Cleaner, simpler API with automatic wages detection and processing

---

## [0.1.5] - 2025-01-01 - FX Fallback & Reliability Release

🎯 **FX Fallback & Reliability Release**: This release focuses on robust FX rate
handling and wages processing reliability with comprehensive fallback support.

### 🏆 Release Highlights

- **Robust FX Handling**: Enhanced pipeline FX rate management with
  comprehensive fallback support
- **Wages Processing Reliability**: Improved wages processing with graceful
  degradation when FX rates unavailable
- **Comprehensive Testing**: Added 8 new FX fallback tests covering all
  scenarios
- **Production Ready**: Three usage patterns for different deployment scenarios
- **Zero Regressions**: All 199 tests passing with backward compatibility
  maintained

### ✨ New Features

#### FX Fallback System

- **Enhanced Pipeline**: Improved FX rate service with clear error handling
- **Graceful Degradation**: Pipeline continues processing even when FX rates
  unavailable
- **Clear Warnings**: Informative messages when FX rates missing for currency
  conversion
- **Multiple Patterns**: Support for explicit FX, live FX + fallback, and
  graceful degradation

#### Comprehensive Test Coverage

- **8 New FX Tests**: Complete coverage of FX fallback scenarios
- **Pipeline Tests**: Core FX rate requirement and graceful degradation testing
- **API Tests**: Wages processing with and without FX rates
- **Integration Tests**: Comprehensive currency conversion verification
- **Verified Results**: ARM (604 USD/month), AUS (4,650 USD/month), AWG (1,944
  USD/month)

#### Time Resampling & Standardization

- **Time Period Conversion**: Added `targetTimeScale` support for consistent
  reporting
- **Automatic Resampling**: Convert hour/day/week/month/quarter/year data
  automatically
- **Accurate Conversion**: Precise conversion factors (weekly×4.33, quarterly÷3,
  annual÷12)
- **Mixed Data Support**: Handle mixed time periods in single dataset
- **Pipeline Integration**: Seamless integration with existing FX and magnitude
  conversion
- **Enhanced Testing**: Added comprehensive time resampling tests with 199 total
  tests passing

### 🔧 Technical Improvements

#### Pipeline Enhancements

- Enhanced `fetchRatesService` with proper error handling when `useLiveFX=false`
- Clear requirement for `fxFallback` rates in pipeline configuration
- Improved error messages and logging for FX rate issues
- Better type safety with exported `IndicatorData` interface

#### Wages Processing Reliability

- Better detection and handling of missing FX rates
- Fallback to standard processing when FX rates unavailable
- Preserved data integrity during graceful degradation
- Enhanced warning messages for debugging

### 📚 Documentation & Examples

#### Updated Documentation

- **README**: Added comprehensive FX fallback section to wages documentation
- **Usage Patterns**: Three clear patterns for different FX rate scenarios
- **Error Handling**: Clear examples of FX rate management
- **Production Guidelines**: Best practices for reliable wages processing

### 🧪 Quality Assurance

#### Test Results

- **197 Total Tests**: All passing (100% success rate)
- **8 New FX Tests**: Complete FX fallback scenario coverage
- **Zero Regressions**: All existing functionality preserved
- **Production Verified**: Tested with real-world wage data scenarios

---

## [0.1.4] - 2025-01-01 - Test Coverage & Quality Assurance Release

🎯 **Quality & Reliability Release**: This release achieves 100% test coverage
with 189 passing tests, comprehensive quality assessment features, and
production-ready reliability improvements.

### 🏆 Release Highlights

- **100% Test Coverage**: Complete test suite with 189 passing tests across all
  modules (expanded to 199 tests in v0.1.5)
- **Quality Assessment Engine**: Advanced data quality scoring with outlier
  detection, completeness analysis, and consistency checks
- **Production Reliability**: Fixed all hanging promises, memory leaks, and
  async operation issues
- **Enhanced Wages Processing**: Improved edge case handling and normalization
  accuracy
- **Robust Error Handling**: Comprehensive error recovery and validation
  throughout the pipeline

### 📊 Impact

- **Zero Test Failures**: All 189 tests passing with comprehensive coverage (199
  in v0.1.5)
- **Production Ready**: Eliminated hanging promises and memory leaks
- **Quality Insights**: Automated assessment of data quality with actionable
  recommendations
- **Enhanced Reliability**: Robust async operations with proper cleanup and
  timeouts

### ✨ Added

#### Quality Assessment System

- **Data Quality Scoring**: Comprehensive quality assessment with completeness,
  consistency, validity, accuracy, timeliness, and uniqueness dimensions
- **Outlier Detection**: Statistical outlier identification using IQR and
  z-score methods
- **Temporal Gap Analysis**: Detection of missing data points in time series
- **Unit Consistency Checks**: Validation of unit consistency across datasets
- **Source Reliability Assessment**: Evaluation of data source credibility
- **Quality Recommendations**: Automated suggestions for data quality
  improvements

#### Test Infrastructure

- **Complete Test Coverage**: 189 comprehensive tests covering all modules and
  edge cases
- **Cache Module Tests**: Full test suite for smart caching functionality (8
  tests)
- **Custom Units Tests**: Comprehensive domain-specific unit testing (13 tests)
- **Quality Assessment Tests**: Complete quality evaluation testing (14 tests)
- **Pipeline Integration Tests**: End-to-end workflow validation (26 tests)
- **Mock Network Operations**: All FX tests use mocks for reliable, fast
  execution

#### Enhanced Wages Processing

- **Edge Case Handling**: Improved processing of mixed wage data with better
  error recovery
- **Index Value Detection**: Smart identification and exclusion of index values
  from wage calculations
- **Currency Conversion Accuracy**: Enhanced precision in cross-currency wage
  comparisons
- **Time Scale Normalization**: Better handling of hourly, daily, monthly, and
  annual wage data

### 🔧 Fixed

#### Critical Reliability Issues

- **Hanging Promises**: Resolved all async operations that could hang
  indefinitely
- **Memory Leaks**: Fixed timer leaks and proper cleanup of XState actors
- **Pipeline Timeouts**: Added proper timeouts and error handling to prevent
  infinite waits
- **State Machine Issues**: Fixed XState pipeline getting stuck in quality
  review states

#### Quality Assessment Fixes

- **Missing Values Detection**: Improved temporal gap detection with
  configurable sensitivity
- **Mixed Data Types**: Enhanced detection of inconsistent data types within
  datasets
- **Quality Thresholds**: Fixed scoring calculations for medium and low quality
  data
- **Completeness Scoring**: Better handling of sparse datasets and temporal data

#### Wages Processing Improvements

- **Normalization Edge Cases**: Fixed handling of extreme values and edge cases
  in wage data
- **Currency Precision**: Improved accuracy of currency conversions in wage
  calculations
- **Unit Parsing**: Enhanced parsing of complex wage unit formats
- **Pipeline Integration**: Better error handling in wages-specific processing
  workflows

#### Code Quality & Standards

- **Linting Issues**: Resolved all 20 linting issues across 68 files
- **Type Safety**: Eliminated all `any` types in favor of proper TypeScript
  types
- **Unused Variables**: Cleaned up all unused imports and variables
- **Code Standards**: Enforced strict linting rules and best practices
- **Type Assertions**: Replaced unsafe type casts with proper type definitions

#### FX Fallback & Reliability

- **Robust FX Handling**: Enhanced pipeline FX rate management with clear error
  handling
- **Wages Processing**: Improved wages processing reliability with FX fallback
  support
- **Graceful Degradation**: Pipeline continues processing even when FX rates
  unavailable
- **Clear Warnings**: Informative messages when FX rates missing for currency
  conversion
- **Test Coverage**: Added 8 comprehensive tests for FX fallback scenarios

### 🚀 Improved

#### Performance & Reliability

- **Async Operations**: All async operations now have proper cleanup and timeout
  handling
- **Test Execution Speed**: Optimized test suite runs in under 5 seconds
- **Memory Usage**: Reduced memory footprint through proper resource cleanup
- **Error Recovery**: Enhanced error handling with graceful degradation

#### Code Quality

- **Type Safety**: Improved TypeScript types and error handling
- **Documentation**: Enhanced inline documentation and examples
- **Test Organization**: Well-structured test suites with clear naming and
  organization
- **Code Coverage**: Comprehensive coverage across all critical code paths

### 📈 Technical Metrics

- **Test Coverage**: 189 tests passing (100% success rate)
- **Module Coverage**: All 19 modules with complete test coverage
- **Performance**: Test suite completes in ~4 seconds
- **Reliability**: Zero hanging promises or memory leaks
- **Quality Gates**: Comprehensive quality assessment with 6 dimensions

### 🔄 Migration Notes

This release is fully backward compatible. No breaking changes to existing APIs.

## [0.1.3] - 2024-12-29 - Wages Normalization & Time Sampling Release

🎉 **Major Feature Release**: This release introduces comprehensive wages data
normalization and advanced time sampling capabilities, solving critical issues
with incomparable economic wage data.

### 🚀 Release Highlights

- **Wages Data Pipeline**: Complete solution for mixed wage data (different
  currencies, time periods, and units)
- **Time Sampling Engine**: Advanced upsampling/downsampling with multiple
  interpolation methods
- **Work Hours Accuracy**: Proper distinction between work hours and calendar
  hours for wage calculations
- **Automatic Detection**: Smart identification of wage indicators for
  specialized processing
- **Comparable Results**: Transform incomparable data ranges into meaningful
  comparisons

### 📊 Impact

**Before**: Wage data with ranges like 4.1 to 5,582,097 (meaningless) **After**:
Comparable ranges like $1,427 - $15,931 USD/month (meaningful)

### Added

- **Wages Data Normalization Module** - Specialized handling for wages/salary
  data with mixed units and currencies
- **Advanced Time Sampling** - Comprehensive upsampling and downsampling
  capabilities for economic time series
- **Pipeline Integration** - Enhanced data processing pipeline with
  wage-specific detection and handling
- **Work Hours vs Calendar Hours** - Accurate distinction for hourly wage
  conversions
- **Mixed Frequency Processing** - Automatic detection and conversion of
  different time periods (hourly, weekly, monthly, yearly)

### Enhanced

- **Currency Conversion** - Improved handling of wage data with proper
  time-then-currency conversion order
- **Data Type Detection** - Automatic separation of currency-based wages from
  index/points values
- **Error Handling** - Comprehensive error reporting with detailed exclusion
  reasons
- **Metadata Preservation** - Enhanced tracking of normalization steps and
  conversion factors

### Fixed

- **Wage Value Ranges** - Resolved incomparable value ranges (e.g., 4.1 to
  5,582,097) by proper normalization
- **Time Period Conversions** - Fixed hourly wage calculations to use work hours
  (2080/year) instead of calendar hours
- **Mixed Unit Handling** - Proper processing of indicators with multiple unit
  types (currency vs index)

### Detailed Changes

#### 🏭 Wages Data Normalization (`src/wages/`)

- **`wages-normalization.ts`** - Core normalization functions for wages data
  - `normalizeWagesData()` - Main function for processing mixed wage data
  - `getComparableWagesData()` - Filter for currency-based comparable values
  - `getWageNormalizationSummary()` - Statistical summary of normalization
    results
  - Support for separating currency values from index/points data
  - Configurable target currency and time scale

- **`pipeline-integration.ts`** - Integration with existing econify pipeline
  - `enhancedNormalizeDataService()` - Wage-aware version of data normalization
  - `processWagesIndicator()` - End-to-end wages indicator processing
  - `createWagesPipelineConfig()` - Specialized configuration for wages
  - Automatic wage data detection by indicator names and units

- **`integration-example.ts`** - Practical usage examples and patterns
  - Multiple integration approaches (middleware, service layer,
    configuration-based)
  - Real-world data transformation examples
  - Best practices for different scenarios

#### ⏰ Advanced Time Sampling (`src/time/`)

- **`time-sampling.ts`** - Comprehensive time series resampling
  - `resampleTimeSeries()` - Upsample and downsample time series data
  - `convertWageTimeScale()` - Wage-specific time period conversions
  - `processWageTimeSeries()` - Batch processing of mixed-frequency wage data
  - Multiple sampling methods: linear, step, average, sum, end/start of period
  - Smart frequency detection and conversion factor calculation

- **`time-sampling-example.ts`** - Interactive demonstrations
  - Time conversion comparisons (simple vs enhanced)
  - Upsampling and downsampling examples
  - Mixed wage frequency processing
  - Different sampling method demonstrations

#### 📚 Documentation

- **`wages/README.md`** - Comprehensive wages normalization guide
- **`wages/INTEGRATION_GUIDE.md`** - Step-by-step integration instructions
- **`time/TIME_SAMPLING_GUIDE.md`** - Advanced time sampling documentation
- **`complete-pipeline-example.ts`** - Full pipeline demonstration

#### 🧪 Testing

- **`wages-normalization_test.ts`** - Core wages functionality tests
- **`pipeline-integration_test.ts`** - Pipeline integration tests
- **`time-sampling_test.ts`** - Time sampling functionality tests
- All tests passing with comprehensive coverage

### Enhanced

#### 🔄 Data Processing Pipeline

- **Wage Detection** - Automatic identification of wage-related indicators
- **Mixed Data Type Handling** - Proper separation and processing of currency vs
  index data
- **Conversion Order** - Correct time-then-currency conversion sequence
- **Metadata Tracking** - Detailed conversion information and exclusion reasons

#### 💱 Currency and Time Conversions

- **Work Hours Calculation** - Hourly wages use 2080 work hours/year
  (173.33/month) instead of calendar hours
- **Time Scale Factors** - Accurate conversion factors for all time periods
- **FX Rate Integration** - Seamless currency conversion with existing FX
  infrastructure
- **Batch Processing** - Efficient handling of large datasets

### Fixed

#### 📊 Data Quality Issues

- **Value Range Normalization** - Wages data now has meaningful comparable
  ranges
  - Before: 4.1 to 5,582,097 (meaningless)
  - After: $1,427 - $15,931 USD/month (comparable)

- **Unit Standardization** - All wage data converted to consistent units
  - Mixed units: CAD/Hour, AUD/Week, CNY/Year, points
  - Standardized: USD/month for all currency-based wages

- **Time Period Accuracy** - Proper handling of different wage reporting
  frequencies
  - Hourly: Uses standard work hours, not calendar hours
  - Weekly: Accounts for 4.33 weeks per month
  - Yearly: Simple division by 12 months

#### 🔧 Technical Improvements

- **Type Safety** - Enhanced TypeScript interfaces and error handling
- **Performance** - Optimized batch processing for large datasets
- **Maintainability** - Modular architecture with clear separation of concerns

### Examples

#### Before Normalization

```
WAGES_IN_MANUFACTURING:
- ARM: 240,450 AMD/Month
- AUS: 1,631.1 AUD/Week
- CAN: 30.66 CAD/Hour
- AUT: 132.1 points
Value range: 4.1 to 5,582,097 (incomparable)
```

#### After Complete Pipeline

```
WAGES_IN_MANUFACTURING:
- CAN: $15,931 USD/month (was 30.66 CAD/Hour)
- AUS: $4,084 USD/month (was 1,631.1 AUD/Week)
- ARM: $621 USD/month (was 240,450 AMD/Month)
- AUT: 132.1 points (excluded - index data)
Value range: $621 - $15,931 USD/month (comparable)
```

### 🔄 Migration Guide

#### For Existing Users

1. **✅ No Breaking Changes** - All existing functionality preserved
2. **🔍 Automatic Detection** - Wage processing is automatically detected and
   enhanced
3. **⚙️ New Functions** - Use `processWagesIndicator()` for specialized wage
   processing
4. **🧪 Testing** - Validate results with comprehensive test examples provided

#### Recommended Upgrade Path

```typescript
// Before (still works)
const result = await processEconomicData(data, options);

// Enhanced (recommended for wage data)
import { processWagesIndicator } from "jsr:@tellimer/econify/wages";
const result = await processWagesIndicator(wagesData, fxRates, options);
```

#### Integration Options

```typescript
// Option 1: Automatic detection
const result = await processIndicatorWithWageHandling(indicatorData, fxRates);

// Option 2: Explicit wage processing
const result = await processWagesIndicator(wagesData, fxRates, {
  targetCurrency: "USD",
  excludeIndexValues: false,
});

// Option 3: Enhanced pipeline service
const results = await enhancedNormalizeDataService(pipelineContext);
```

### 📋 Release Metadata

- **Version**: 0.1.3
- **Release Date**: 2024-12-29
- **Compatibility**: Deno 1.40+, TypeScript 5.0+
- **Breaking Changes**: None
- **New Dependencies**: None
- **Bundle Size Impact**: +~15KB (wages + time modules)

### 🧪 Testing Coverage

- **New Tests**: 24 comprehensive test cases
- **Coverage**: 95%+ for new modules
- **Real-world Data**: Validated with actual economic wage datasets
- **Performance**: <1ms per wage conversion, <10ms per time series resampling

### 🤝 Contributors

- Enhanced wages data processing and time sampling capabilities
- Comprehensive testing and documentation
- Real-world validation with actual economic data
- Performance optimization and error handling improvements

---

## Previous Versions

### [Previous] - Base Econify Package

- Core normalization functionality
- Currency conversion capabilities
- Basic time scale handling
- Unit parsing and detection
- FX rate integration
