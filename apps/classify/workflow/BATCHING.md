# Batch Processing Configuration

## Overview

The workflow processes indicators in batches to maximize throughput while maintaining stability. The current configuration processes **20 indicators concurrently** using **4 batches of 5 indicators each**.

## Configuration

### Environment Variables

Set these in your `.env` file:

```bash
# Internal batch size - how many indicators to emit per batch
# Default: 10, Current: 5
INTERNAL_EMIT_BATCH=5

# Delay between internal emit batches (milliseconds)
# Default: 100
INTERNAL_EMIT_DELAY_MS=100
```

### Script Defaults

All scripts use these defaults:

- **Batch size:** 5 indicators per batch
- **Concurrent batches:** 4 batches running in parallel
- **Total concurrency:** 20 indicators processing simultaneously

This is configured in:

- [scripts/run-random.ts](./scripts/run-random.ts) (lines 418-419)
- [scripts/run-all.ts](./scripts/run-all.ts) (lines 417-418)

## Processing Flow

```
┌─────────────────────────────────────────────────┐
│  Client sends 4 API requests concurrently       │
│  Each request contains 5 indicators             │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  API receives 4 batches                         │
│  Each batch gets a unique trace_id              │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Each batch emits its 5 indicators              │
│  All 20 indicators process in parallel          │
│  (INTERNAL_EMIT_BATCH controls chunk size)      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Workflow processes all 20 simultaneously       │
│  Each goes through: normalize → time → family   │
│  → type → boolean-review → final-review         │
│  → complete                                     │
└─────────────────────────────────────────────────┘
```

## Usage Examples

### Run Random Indicators

```bash
# Process 20 random indicators (4 batches × 5)
deno task run:random -- -20 openai

# Process 100 random indicators (20 batches × 5, grouped in sets of 4)
deno task run:random -- -100 openai
```

### Run All Indicators

```bash
# Process all indicators (in groups of 20)
deno task run:all openai

# Process first 40 indicators
deno task run:all 40 openai
```

## Performance Tuning

### Increase Concurrency

To process **40 indicators concurrently** (8 batches of 5):

1. Update scripts:
   ```typescript
   const batchSize = 5;
   const concurrentBatches = 8; // Changed from 4
   ```

2. Ensure your system can handle it:
   - More memory needed for LLM inference
   - More API quota consumed
   - Database connection pool may need adjustment

### Reduce Concurrency

To process **10 indicators concurrently** (2 batches of 5):

1. Update scripts:
   ```typescript
   const batchSize = 5;
   const concurrentBatches = 2; // Changed from 4
   ```

### Change Batch Size

To use larger batches (e.g., 10 indicators per batch):

1. Update `.env`:
   ```bash
   INTERNAL_EMIT_BATCH=10
   ```

2. Update scripts:
   ```typescript
   const batchSize = 10; // Changed from 5
   const concurrentBatches = 2; // Adjust to maintain total concurrency
   ```

## Monitoring

### Check Batch Progress

```bash
# View all batches
sqlite3 ./data/classify-workflow-local-dev.db \
  "SELECT * FROM pipeline_stats ORDER BY batch_start_time DESC LIMIT 10;"

# View specific batch
sqlite3 ./data/classify-workflow-local-dev.db \
  "SELECT * FROM pipeline_stats WHERE batch_id = 'your-trace-id';"

# Check completion count
sqlite3 ./data/classify-workflow-local-dev.db \
  "SELECT COUNT(*) FROM classifications;"
```

### View Logs

The scripts print progress for each group of concurrent batches:

```
📋 Group 1/5: Starting 4 concurrent batches...
   📦 Batch 1/20: Submitting indicators 1-5...
   📦 Batch 2/20: Submitting indicators 6-10...
   📦 Batch 3/20: Submitting indicators 11-15...
   📦 Batch 4/20: Submitting indicators 16-20...
      ✅ Batch 1 accepted (trace: abc-123)
      ✅ Batch 2 accepted (trace: def-456)
      ✅ Batch 3 accepted (trace: ghi-789)
      ✅ Batch 4 accepted (trace: jkl-012)
   ✅ Group 1 batches submitted! (20 indicators queued)
   ⏳ Waiting for 20 indicators to complete...
   Progress: 10/20 (50%) - 15s elapsed
   Progress: 20/20 (100%) - 28s elapsed
   ✅ Group 1 completed! (20 indicators done)
```

## Database Schema

The workflow tracks batches in the `pipeline_stats` table:

```sql
CREATE TABLE pipeline_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL UNIQUE,        -- trace_id from API
  model TEXT NOT NULL,                  -- LLM model used
  provider TEXT NOT NULL,               -- openai|anthropic|local
  total_indicators INTEGER NOT NULL,    -- Indicators in this batch
  successful_indicators INTEGER,        -- Completed count
  failed_indicators INTEGER,            -- Failed count
  batch_start_time TEXT NOT NULL,
  batch_end_time TEXT,
  total_duration_ms INTEGER,
  avg_time_per_indicator_ms INTEGER,
  avg_confidence REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## Best Practices

1. **Start small:** Test with 20 indicators before scaling up
2. **Monitor costs:** Track LLM API usage when using cloud providers
3. **Check completion:** Wait for batches to complete before querying results
4. **Use local LLM:** For development, use LM Studio to avoid API costs
5. **Adjust for rate limits:** If you hit rate limits, increase `INTERNAL_EMIT_DELAY_MS`

## Troubleshooting

### "Too many concurrent requests"

- Reduce `concurrentBatches` in scripts
- Increase `INTERNAL_EMIT_DELAY_MS` in `.env`

### "Out of memory"

- Reduce `concurrentBatches` (fewer indicators processing simultaneously)
- Use smaller LLM model in LM Studio

### "Database locked"

- SQLite handles concurrency well with WAL mode (enabled by default)
- If issues persist, consider switching to PostgreSQL for production

### Batches not completing

- Check logs for errors in individual steps
- Query `processing_log` table for failed stages
- Increase timeout in `waitForBatchCompletion()` if needed
