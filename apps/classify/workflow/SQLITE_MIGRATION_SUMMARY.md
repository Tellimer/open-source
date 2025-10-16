# SQLite Migration & Batch Optimization Summary

## What We Fixed

### 1. SQLite Dialect Separation ✅

**Problem:** The repository was using PostgreSQL-style placeholders (`$1`, `$2`) for both SQLite and PostgreSQL, causing SQLite to fail with "Too many parameter values were provided".

**Solution:** Added proper SQL dialect handling throughout the repository:

- **SQLite:** Uses `?` placeholders
- **PostgreSQL:** Uses `$1`, `$2`, etc. placeholders

**Files Updated:**
- [src/db/repository.ts](./src/db/repository.ts) - All query methods now detect database type and use appropriate placeholders
- [src/db/schema.ts](./src/db/schema.ts) - Added `metadata` column to `processing_log` table
- [steps/classify-flow/complete-classify.step.ts](./steps/classify-flow/complete-classify.step.ts) - Fixed old `db.prepare()` calls, converted booleans to integers, JSON-stringified arrays/objects

### 2. Data Type Conversions ✅

**Problem:** SQLite only accepts primitives (numbers, strings, bigints, buffers, null) but we were trying to bind JavaScript booleans and objects.

**Solution:**
- **Booleans → Integers:** All boolean fields (`is_cumulative`, `is_currency_denominated`, `boolean_review_passed`) now convert to 0/1
- **Objects/Arrays → JSON Strings:** Fields like `boolean_review_fields_wrong` and `final_review_corrections` are JSON-stringified before saving

### 3. Missing Schema Column ✅

**Problem:** `processing_log` table was missing the `metadata` column that was added to PostgreSQL.

**Solution:**
```bash
sqlite3 ./data/classify-workflow-local-dev.db "ALTER TABLE processing_log ADD COLUMN metadata TEXT;"
```

### 4. Batch Processing Optimization ✅

**Problem:** Initial configuration of 4 concurrent batches × 5 indicators × ~6 LLM stages = ~120 concurrent API calls was overwhelming OpenAI's rate limits, causing indicators to hang in the `time` stage.

**Solution:** Reduced to **1 concurrent batch** (5 indicators at a time):

**Files Updated:**
- [scripts/run-random.ts](./scripts/run-random.ts) - `concurrentBatches = 1`
- [scripts/run-all.ts](./scripts/run-all.ts) - `concurrentBatches = 1`

### 5. Better Error Handling ✅

**Problem:** When indicators got stuck, the script would wait forever with no feedback.

**Solution:** Added smart progress detection:
- Detects when no progress for 20 seconds
- Shows which indicators are stuck and at which stage
- Shows error messages for failed indicators
- Continues processing remaining batches instead of hanging

## Final Configuration

### Environment Variables (`.env`)
```bash
# SQLite Database
CLASSIFY_DB=sqlite
CLASSIFY_DB_LOCAL_DEV=./data/classify-workflow-local-dev.db

# Batch Processing
INTERNAL_EMIT_BATCH=5           # Process 5 indicators per internal batch
INTERNAL_EMIT_DELAY_MS=500      # 500ms delay between batches
```

### Script Defaults
```typescript
const batchSize = 5;              // 5 indicators per batch
const concurrentBatches = 1;      // 1 batch at a time
// Total concurrency: 5 indicators × ~6 LLM stages = ~30 API calls max
```

## Performance Characteristics

### Before
- **Configuration:** 4 batches × 5 indicators = 20 concurrent
- **LLM Calls:** ~120 concurrent API calls
- **Result:** Rate limiting, stuck indicators, incomplete batches

### After
- **Configuration:** 1 batch × 5 indicators = 5 concurrent
- **LLM Calls:** ~30 concurrent API calls max
- **Result:** Stable processing, all indicators complete, no rate limits

## Processing Flow

```
Client Script (run-random.ts)
    ↓
Send 1 batch of 5 indicators via HTTP
    ↓
API receives batch (unique trace_id)
    ↓
Workflow processes 5 indicators through pipeline:
  1. Normalize (regex-based)
  2. Time Inference (LLM)
  3. Cumulative Detection (rule-based)
  4. Family Assignment (LLM)
  5. Type Classification (LLM)
  6. Boolean Review (LLM)
  7. Final Review (LLM)
  8. Complete (save to DB)
    ↓
Script waits for batch completion
    ↓
All 5 complete or 20s timeout
    ↓
Next batch of 5 starts
```

## Database Compatibility

### SQLite (Local Development)
- ✅ Proper `?` placeholders
- ✅ Boolean values as 0/1 integers
- ✅ JSON fields as TEXT
- ✅ WAL mode enabled for concurrency
- ✅ All schema columns present

### PostgreSQL (Production)
- ✅ Proper `$1, $2` placeholders
- ✅ Boolean values as BOOLEAN type
- ✅ JSON fields as JSONB
- ✅ Connection pooling handled
- ✅ All schema columns present

## Usage

### Run 50 Random Indicators
```bash
deno task run:random -- -50 openai
```

### Expected Output
```
🚀 Processing 50 indicators in 10 batches of 5...
   Provider: openai
   Concurrent batches: 1 (5 indicators per group)

📋 Group 1/10: Starting 1 concurrent batch...
   📦 Batch 1/10: Submitting indicators 1-5...
      ✅ Batch 1 accepted (trace: abc-123)
   ⏳ Waiting for 5 indicators to complete...
   Progress: 5/5 (100%) - 28s elapsed
   ✅ Group 1 completed! (5 indicators done)

📋 Group 2/10: Starting 1 concurrent batch...
   ...
```

### Average Timing
- **Per indicator:** ~25-35 seconds (with OpenAI GPT-4.1-mini)
- **Per batch (5 indicators):** ~30-45 seconds
- **50 indicators total:** ~5-8 minutes

## Monitoring

### Check Completion Status
```bash
sqlite3 ./data/classify-workflow-local-dev.db \
  "SELECT COUNT(*) FROM classifications;"
```

### Check Recent Activity
```bash
sqlite3 ./data/classify-workflow-local-dev.db \
  "SELECT stage, status, COUNT(*) as count
   FROM processing_log
   WHERE created_at > datetime('now', '-10 minutes')
   GROUP BY stage, status;"
```

### Check Failed Indicators
```bash
sqlite3 ./data/classify-workflow-local-dev.db \
  "SELECT indicator_id, stage, error_message
   FROM processing_log
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 10;"
```

## Troubleshooting

### Indicators Still Getting Stuck?

1. **Check for rate limits:** Look for timeout errors in Motia logs
2. **Increase delay:** Set `INTERNAL_EMIT_DELAY_MS=1000` in `.env`
3. **Check OpenAI quota:** Verify your API key has sufficient quota
4. **Switch to local LLM:** Use LM Studio to avoid API limits entirely

### Database Errors?

1. **Check schema version:**
   ```bash
   sqlite3 ./data/classify-workflow-local-dev.db "SELECT * FROM schema_version;"
   ```
2. **Verify columns exist:**
   ```bash
   sqlite3 ./data/classify-workflow-local-dev.db ".schema processing_log"
   ```

### Batch Stats Errors?

These are non-critical and logged as warnings. The pipeline will continue processing even if batch stats fail to save.

## Next Steps

### To Increase Throughput (if no rate limits)
1. Increase `concurrentBatches` to 2
2. Monitor for stuck indicators
3. Adjust based on API performance

### To Switch to PostgreSQL
1. Set `POSTGRES_URL` environment variable
2. Remove or comment out `CLASSIFY_DB=sqlite`
3. Run migrations: `deno task migrate`
4. Restart dev server

### To Use Local LLM (Free)
1. Install LM Studio
2. Load a model (e.g., Mistral 7B)
3. Set environment: `LLM_PROVIDER=local`
4. No rate limits! Process as many batches as your system can handle

## Files Changed

### Database Layer
- ✅ [src/db/repository.ts](./src/db/repository.ts)
- ✅ [src/db/schema.ts](./src/db/schema.ts)
- ✅ [src/db/client.ts](./src/db/client.ts)

### Workflow Steps
- ✅ [steps/classify-flow/complete-classify.step.ts](./steps/classify-flow/complete-classify.step.ts)

### Scripts
- ✅ [scripts/run-random.ts](./scripts/run-random.ts)
- ✅ [scripts/run-all.ts](./scripts/run-all.ts)

### Configuration
- ✅ [.env](./.env)
- ✅ [.env.example](./.env.example)

### Documentation
- ✅ [BATCHING.md](./BATCHING.md)
- ✅ [examples/README.md](./examples/README.md)
- ✅ [examples/parallel-batches.ts](./examples/parallel-batches.ts)
