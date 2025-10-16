# Database Abstraction Layer Migration

## Overview

We've created a unified database repository pattern that works seamlessly with both SQLite and PostgreSQL. This eliminates the sync/async issues and provides a clean, consistent API.

## New Pattern

### Before (Old Way)
```typescript
import { getDatabase } from "../../src/db/client.ts";
import { logProcessing, saveStageResult } from "../../src/db/persist.ts";

// In handler
const db = getDatabase();
saveStageResult(db, "normalize", indicator_id, {
  original_units: normalized.originalUnits,
  unit: normalized.unit,
});
```

### After (New Way)
```typescript
import { getDatabase } from "../../src/db/client.ts";
import { createRepository } from "../../src/db/repository.ts";

// In handler
const db = getDatabase();
const repo = createRepository(db);

await repo.saveStageResult("normalize", indicator_id, {
  original_units: normalized.originalUnits,
  unit: normalized.unit,
});
```

## Repository API

### Stage Operations

```typescript
// Save a stage result
await repo.saveStageResult(stage, indicator_id, data);

// Get a stage result
const result = await repo.getStageResult(stage, indicator_id);
```

**Supported stages:**
- `normalize` → `normalization_results`
- `time` → `time_inference_results`
- `cumulative-detection` → `cumulative_detection_results`
- `scale` → `scale_inference_results`
- `currency` → `currency_check_results`
- `family` → `family_assignment_results`
- `type` → `type_classification_results`
- `boolean-review` → `boolean_review_results`
- `final-review` → `final_review_results`

### Classification Operations

```typescript
// Save final classification
await repo.saveClassification({
  indicator_id: "EXAMPLE",
  name: "Example Indicator",
  family: "economic-activity",
  indicator_type: "gdp",
  welfare_orientation: "positive",
  // ... other fields
});

// Get one classification
const classification = await repo.getClassification(indicator_id);

// Get all classifications (with optional filters)
const classifications = await repo.getClassifications({
  family: "economic-activity",
  indicator_type: "gdp",
  limit: 100,
});
```

### Logging Operations

```typescript
// Log processing event
await repo.logProcessing({
  indicator_id: "EXAMPLE",
  stage: "normalize",
  status: "completed",
  metadata: { duration_ms: 150 },
});
```

### Batch Stats (Optional)

```typescript
// Start batch tracking
await repo.startBatchStats({
  batch_id: traceId,
  total_indicators: 100,
  model: "gpt-4o-mini",
  provider: "openai",
});

// Complete batch
await repo.completeBatchStats(batch_id);
```

### Raw Queries (When Needed)

```typescript
// Run a query
const results = await repo.query<MyType>(
  "SELECT * FROM table WHERE id = $1",
  [id]
);

// Run a query for single result
const result = await repo.queryOne<MyType>(
  "SELECT * FROM table WHERE id = $1 LIMIT 1",
  [id]
);

// Execute a statement
const { changes } = await repo.run(
  "UPDATE table SET status = $1 WHERE id = $2",
  ["active", id]
);

// Transaction
await repo.transaction(async () => {
  await repo.run("INSERT INTO ...", []);
  await repo.run("UPDATE ...", []);
});
```

## Benefits

1. **Unified API**: Same code works for SQLite and PostgreSQL
2. **Async/Await**: Proper async handling throughout
3. **Type Safety**: TypeScript generics for query results
4. **No Blocking**: Event loop friendly operations
5. **Easy Testing**: Mock the repository for unit tests
6. **Error Handling**: Consistent error handling across databases

## Migration Checklist

For each workflow step file:

- [ ] Replace `import { saveStageResult, logProcessing } from persist.ts` with `import { createRepository } from repository.ts`
- [ ] Add `const repo = createRepository(db)` after `const db = getDatabase()`
- [ ] Replace all `saveStageResult(db, ...)` with `await repo.saveStageResult(...)`
- [ ] Replace all `logProcessing(db, ...)` with `await repo.logProcessing(...)`
- [ ] Replace all `saveFinalClassification(db, ...)` with `await repo.saveClassification(...)`
- [ ] Ensure all database calls use `await`

## Example: Complete Step Migration

```typescript
// OLD
export const handler = async (input: any, { state, emit, logger }: any) => {
  try {
    const db = getDatabase();
    logProcessing(db, {
      indicator_id,
      stage: "normalize",
      status: "started",
    });

    // ... processing logic ...

    saveStageResult(db, "normalize", indicator_id, result);

    logProcessing(db, {
      indicator_id,
      stage: "normalize",
      status: "completed",
    });
  } catch (error) {
    const db = getDatabase();
    logProcessing(db, {
      indicator_id,
      stage: "normalize",
      status: "failed",
      error_message: error.message,
    });
    throw error;
  }
};

// NEW
export const handler = async (input: any, { state, emit, logger }: any) => {
  const db = getDatabase();
  const repo = createRepository(db);

  try {
    await repo.logProcessing({
      indicator_id,
      stage: "normalize",
      status: "started",
    });

    // ... processing logic ...

    await repo.saveStageResult("normalize", indicator_id, result);

    await repo.logProcessing({
      indicator_id,
      stage: "normalize",
      status: "completed",
    });
  } catch (error) {
    await repo.logProcessing({
      indicator_id,
      stage: "normalize",
      status: "failed",
      error_message: error.message,
    });
    throw error;
  }
};
```

## Database-Specific Notes

### PostgreSQL
- Uses prepared statements with `$1, $2, ...` placeholders
- UPSERT uses `ON CONFLICT ... DO UPDATE`
- Timestamps use `CURRENT_TIMESTAMP`
- No busy-wait blocking (proper async)

### SQLite
- Uses `?` placeholders (automatically converted)
- UPSERT uses `ON CONFLICT ... DO UPDATE`
- Timestamps use `datetime('now')`
- Synchronous operations wrapped in promises

## Testing

Both databases can be tested with the same code:

```typescript
// Use SQLite for local dev/testing
// No POSTGRES_URL in environment

// Use PostgreSQL for production
// Set POSTGRES_URL=postgresql://...

// Code remains identical!
```

## Troubleshooting

### "Query timeout" errors
- Check PostgreSQL connection string
- Ensure `init:postgres` was run to create schema
- Verify network connectivity to database

### "Table does not exist" errors
- Run `deno task init:postgres` for PostgreSQL
- Schema auto-initializes for SQLite

### Type errors with `await`
- Ensure handler is declared `async`
- All repo methods return Promises - use `await`
