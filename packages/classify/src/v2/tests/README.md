# V2 Pipeline Tests

This directory contains comprehensive tests for the V2 pipeline implementation.

## Test Files

- **`pipeline.test.ts`** - Full pipeline integration tests
  - Tests complete V2 pipeline flow (Router → Specialist → Orientation →
    Flagging → Review)
  - Database persistence and upsert behavior
  - Multi-family handling
  - Error handling and execution tracking
  - Performance and metrics validation

- **`stages.test.ts`** - Individual stage tests
  - Router stage (family assignment, batching)
  - Specialist stage (family-specific prompts)
  - Orientation stage (welfare-focused orientation)
  - Flagging stage (all 6 flag types)
  - Review stage (confirm/fix/escalate actions)

## Shared Fixtures

V2 tests reuse existing test fixtures from `../../../tests/fixtures/`:

- `physical_fundamental.json`
- `numeric_measurement.json`
- `price_value.json`
- `change_movement.json`
- `composite_derived.json`
- `temporal.json`
- `qualitative.json`
- `edge_cases.json`

## Running Tests

```bash
# Run V2 tests only
deno task test:v2

# Run all tests (including V2)
deno task test

# Run with watch mode
deno task test:watch
```

## Test Coverage

V2 tests cover:

- ✅ All 6 pipeline stages
- ✅ Database persistence (local SQLite)
- ✅ Batch processing and concurrency
- ✅ Flagging rules (6 types)
- ✅ Review decisions (confirm/fix/escalate)
- ✅ Error handling and recovery
- ✅ Telemetry and metrics
- ✅ Multi-family classification
- ✅ Upsert behavior for resume support

## Test Database

Tests create temporary SQLite databases:

- `test_v2_pipeline.db` - Pipeline integration tests
- `test_v2_stages.db` - Individual stage tests

These are automatically cleaned up after each test run.
