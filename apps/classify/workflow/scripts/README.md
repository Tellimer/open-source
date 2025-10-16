# Classification Workflow Scripts

Utility scripts for managing the classification pipeline database and results.

---

## reset-results.ts

**Purpose:** Clear all classification results and intermediate stage data while preserving source indicators and pipeline statistics.

### What It Does

✅ **Clears:**
- `classifications` - Final classification results
- `normalization_results` - Stage 1 normalization data
- `time_inference_results` - Stage 2 time/frequency inference
- `scale_inference_results` - Stage 3 scale detection
- `currency_check_results` - Stage 4 currency detection
- `family_assignment_results` - Stage 5 family classification
- `type_classification_results` - Stage 6 type classification
- `boolean_review_results` - Stage 7 validation results
- `final_review_results` - Stage 8 final review
- `processing_log` - Audit trail of all processing steps

✅ **Preserves:**
- `source_indicators` - Your original indicator data
- `pipeline_stats` - Historical batch performance metrics
- `schema_version` - Database schema tracking

### When to Use

1. **After Prompt Changes:** You've updated classification prompts and want to re-classify all indicators
2. **Configuration Updates:** Changed LLM models, providers, or parameters
3. **Testing New Logic:** Testing pipeline changes without affecting source data
4. **Clean Slate:** Starting fresh classifications while keeping historical stats

### Usage

```bash
# Interactive mode (with confirmation prompt)
deno task reset-results

# Or run directly
deno run --allow-read --allow-write --allow-env --allow-ffi --env scripts/reset-results.ts
```

### Example Output

```
🗑️  Classification Results Reset Tool
=====================================

📂 Database: ./classify.db

📊 Current record counts:
  - classifications: 22
  - normalization_results: 22
  - time_inference_results: 22
  - scale_inference_results: 22
  - currency_check_results: 22
  - family_assignment_results: 22
  - type_classification_results: 22
  - boolean_review_results: 22
  - final_review_results: 22
  - processing_log: 242

✅ Preserved tables (will NOT be deleted):
  - source_indicators: 200 records
  - pipeline_stats: 3 batches

⚠️  This will DELETE all classification results!
   Source data and pipeline stats will be preserved.

Continue with reset? [y/N] y

🔄 Clearing classification results...

  ✓ Cleared final_review_results
  ✓ Cleared boolean_review_results
  ✓ Cleared type_classification_results
  ✓ Cleared family_assignment_results
  ✓ Cleared currency_check_results
  ✓ Cleared scale_inference_results
  ✓ Cleared time_inference_results
  ✓ Cleared normalization_results
  ✓ Cleared processing_log
  ✓ Cleared classifications

✅ Reset complete!

📊 Verification:
  ✓ classifications: empty
  ✓ normalization_results: empty
  ✓ time_inference_results: empty
  ✓ scale_inference_results: empty
  ✓ currency_check_results: empty
  ✓ family_assignment_results: empty
  ✓ type_classification_results: empty
  ✓ boolean_review_results: empty
  ✓ final_review_results: empty
  ✓ processing_log: empty

✅ Preserved tables (unchanged):
  ✓ source_indicators: 200 records (was 200)
  ✓ pipeline_stats: 3 batches (was 3)

🎉 Reset successful! Ready for fresh classification run.

Next steps:
  1. Update prompts if needed
  2. Run: deno task run:dev
  3. POST to /classify/batch with indicators
```

### Safety Features

1. **Confirmation Prompt:** Interactive confirmation before deletion
2. **Transaction Safety:** All deletes in single atomic transaction
3. **Rollback on Error:** Automatic rollback if any delete fails
4. **Verification:** Post-delete verification of empty tables
5. **Preservation Check:** Confirms source data unchanged

### Error Handling

**Database Not Found:**
```
❌ Database file not found.
   Run classifications first to create the database.
```

**Tables Not Initialized:**
```
❌ Database exists but tables not initialized.
   Run migrations first: deno task migrate
```

**Transaction Failure:**
```
❌ Error during reset: [error message]
   Transaction rolled back. Database unchanged.
```

### Workflow Example

```bash
# 1. Check current results
deno task query

# 2. Update prompts/configuration
# Edit: src/services/classify/prompts/*.ts

# 3. Reset classification results
deno task reset-results
# > Confirm: y

# 4. Re-run classifications
deno task run:dev

# 5. Verify new results
deno task query

# 6. Compare performance
deno task stats
```

### Performance Impact

- **Speed:** Deletes complete in <1 second (even with 10k+ records)
- **Disk:** No disk space freed (SQLite doesn't auto-reclaim)
- **Optimization:** Run `VACUUM` after reset to reclaim space:

```bash
sqlite3 classify.db "VACUUM;"
```

### Technical Details

**Deletion Order:** Tables deleted in reverse dependency order to avoid foreign key violations:
1. final_review_results
2. boolean_review_results
3. type_classification_results
4. family_assignment_results
5. currency_check_results
6. scale_inference_results
7. time_inference_results
8. normalization_results
9. processing_log
10. classifications (parent table)

**Transaction Isolation:** `BEGIN TRANSACTION` ensures all-or-nothing deletion

**Preserved Relationships:** `source_indicators` foreign keys remain intact for future classifications

---

## Comparison with Other Reset Options

### reset-results.ts vs Full Database Reset

| Aspect | reset-results.ts | Full DB Reset |
|--------|-----------------|---------------|
| Source indicators | ✅ Preserved | ❌ Deleted |
| Pipeline stats | ✅ Preserved | ❌ Deleted |
| Classification results | ❌ Deleted | ❌ Deleted |
| Schema | ✅ Preserved | ❌ Recreated |
| Speed | Fast (<1s) | Slower (re-seed) |
| Use case | Re-classify | Complete fresh start |

### When to Use Each

**Use reset-results.ts when:**
- Testing prompt improvements
- Changing LLM configuration
- Re-running with better models
- Debugging classification logic
- Keeping historical stats

**Use full reset when:**
- Changing database schema
- Starting completely fresh project
- Source indicator data needs updating
- Migration to new database

---

## Related Scripts

- `seed-database.ts` - Load source indicators from PostgreSQL
- `migrate-schema.ts` - Initialize or upgrade database schema
- `query-results.ts` - Query classification results
- `view-stats.ts` - View pipeline performance statistics
- `run-classification.ts` - Run classification pipeline

---

## Troubleshooting

### "Database locked" error
- Close any other connections to the database
- Make sure no classification is running
- Try again after a few seconds

### Reset doesn't show in query results
- Make sure to re-run classifications after reset
- Check that batch POST request was successful
- Verify indicators in source_indicators table

### Pipeline stats show old runs
- This is expected! Pipeline stats are intentionally preserved
- Historical stats help track performance improvements over time
- Stats won't affect new classification runs

---

## run-random.ts

**Purpose:** Run classification on random indicators from the source_indicators table for testing, sampling, or full pipeline runs.

### What It Does

1. **Selects random indicators** from `source_indicators` (10,903 total)
2. **Fetches complete metadata** for each indicator
3. **Displays selection summary** with first 10 indicators
4. **Auto-batches large requests** into chunks of 50 indicators
5. **Submits batches sequentially** to `/classify/batch` with 2-second delays
6. **Returns trace_ids** for monitoring progress

### Usage

```bash
# Quick test with 25 random indicators (OpenAI)
deno task run:random -25

# Sample 50 indicators with OpenAI
deno task run:random -50 openai

# Large batch - 250 indicators in 5 batches of 50
deno task run:random -250 openai

# Test 100 indicators with local LLM (free)
deno task run:random -100 local

# Full pipeline - all 10,903 indicators in batches of 50
deno task run:random all openai

# All indicators with Anthropic Claude
deno task run:random all anthropic
```

### Arguments

1. **count** (required): Number of random indicators or "all"
   - Format: `-25`, `-50`, `-100`, `-1000`, etc.
   - Special value: `all` runs all 10,903 indicators
   - Must use dash prefix for numbers

2. **provider** (optional, default: `openai`): LLM provider
   - `openai` - OpenAI GPT-4.1-mini (recommended)
   - `local` - Local Ollama model (free, slower)
   - `anthropic` - Anthropic Claude Sonnet

### Example Output (Small Batch)

```
📂 Opening database: ./data/classify-workflow-local-dev.db
📊 Total indicators in database: 10,903
🎲 Selecting 25 random indicators...
✅ Selected 25 indicators

📊 Selected Indicators:
════════════════════════════════════════════════════════════════
1. GDP Growth Rate
   ID: IND_GDP_GROWTH_ZA
   Description: Year-over-year percentage change in real GDP

2. Bank Lending Rate
   ID: IND_LENDING_RATE_BR
   Description: Average interest rate charged by commercial banks

   ... and 23 more indicators

════════════════════════════════════════════════════════════════

🚀 Processing 25 indicators in 1 batches of 50...
   Provider: openai
   API: http://localhost:3000/classify/batch

📦 Batch 1/1: Processing indicators 1-25...
   ✅ Batch 1 submitted: 25 indicators (trace: abc123)

✅ All batches submitted successfully!
   Total indicators: 25
   Batches: 1
   Trace IDs: abc123

💡 Monitor progress with:
   sqlite3 ./data/classify-workflow-local-dev.db "SELECT COUNT(*) FROM classifications;"
```

### Example Output (Large Batch)

```
📂 Opening database: ./data/classify-workflow-local-dev.db
📊 Total indicators in database: 10,903
🎲 Selecting 250 random indicators...
✅ Selected 250 indicators

📊 Selected Indicators:
════════════════════════════════════════════════════════════════
[First 10 indicators shown]
════════════════════════════════════════════════════════════════

🚀 Processing 250 indicators in 5 batches of 50...
   Provider: openai
   API: http://localhost:3000/classify/batch

📦 Batch 1/5: Processing indicators 1-50...
   ✅ Batch 1 submitted: 50 indicators (trace: abc123)
   ⏳ Waiting 2 seconds before next batch...

📦 Batch 2/5: Processing indicators 51-100...
   ✅ Batch 2 submitted: 50 indicators (trace: def456)
   ⏳ Waiting 2 seconds before next batch...

📦 Batch 3/5: Processing indicators 101-150...
   ✅ Batch 3 submitted: 50 indicators (trace: ghi789)
   ⏳ Waiting 2 seconds before next batch...

📦 Batch 4/5: Processing indicators 151-200...
   ✅ Batch 4 submitted: 50 indicators (trace: jkl012)
   ⏳ Waiting 2 seconds before next batch...

📦 Batch 5/5: Processing indicators 201-250...
   ✅ Batch 5 submitted: 50 indicators (trace: mno345)

✅ All batches submitted successfully!
   Total indicators: 250
   Batches: 5
   Trace IDs: abc123, def456, ghi789, jkl012, mno345

💡 Monitor progress with:
   sqlite3 ./data/classify-workflow-local-dev.db "SELECT COUNT(*) FROM classifications;"
```

### Use Cases

#### 1. Testing Prompt Changes
```bash
# Test updated prompts on 50 random indicators
deno task reset-results
deno task run:random -50
```

#### 2. Quality Sampling
```bash
# Sample 100 indicators to check classification quality
deno task run:random -100 openai
```

#### 3. Production Run
```bash
# Full pipeline with all indicators
deno task run:random all openai
```

#### 4. Cost-Free Testing
```bash
# Test with local LLM (no API costs)
deno task run:random -25 local
```

### Cost Estimation

Based on benchmark (25 indicators = $0.20 with OpenAI GPT-4.1-mini):

| Count  | Estimated Cost | Estimated Time | Use Case          |
|--------|---------------|----------------|-------------------|
| -25    | $0.20         | 2 minutes      | Quick test        |
| -50    | $0.40         | 4 minutes      | Quality sample    |
| -100   | $0.80         | 8 minutes      | Comprehensive test|
| -500   | $4.00         | 40 minutes     | Large sample      |
| -1000  | $8.00         | 1.3 hours      | Validation run    |
| all    | $85.00        | 14.5 hours     | Full production   |

*Prices: $0.150 input / $0.600 output per 1M tokens*

### Monitoring Progress

**Check completed count:**
```bash
sqlite3 ./data/classify-workflow-local-dev.db "
  SELECT COUNT(*) FROM classifications;
"
```

**Recent completions:**
```bash
sqlite3 ./data/classify-workflow-local-dev.db "
  SELECT
    indicator_id,
    name,
    indicator_type,
    temporal_aggregation,
    heat_map_orientation,
    created_at
  FROM classifications
  ORDER BY created_at DESC
  LIMIT 10;
"
```

**Stage breakdown:**
```bash
sqlite3 ./data/classify-workflow-local-dev.db "
  SELECT
    (SELECT COUNT(*) FROM normalization_results) as normalized,
    (SELECT COUNT(*) FROM time_inference_results) as time_done,
    (SELECT COUNT(*) FROM family_assignment_results) as family_done,
    (SELECT COUNT(*) FROM type_classification_results) as type_done,
    (SELECT COUNT(*) FROM classifications) as completed;
"
```

### Prerequisites

1. **Motia dev server running:**
   ```bash
   deno task dev
   ```

2. **Database seeded with source indicators:**
   ```bash
   deno task seed-db
   ```

3. **Environment variables set** (for OpenAI/Anthropic):
   ```bash
   export OPENAI_API_KEY=sk-...
   export ANTHROPIC_API_KEY=sk-ant-...
   ```

### Metadata Included

Each indicator includes full metadata for informed LLM decisions:

- Core: `indicator_id`, `name`, `units`, `description`
- Context: `periodicity`, `source_name`, `long_name`
- Classification hints: `category_group`, `dataset`, `topic`
- Technical: `aggregation_method`, `scale`, `currency_code`

This allows the LLM to handle country-specific reporting variations (e.g., wages as index vs flow).

### Troubleshooting

**"No indicators found in database"**
```bash
# Seed the database first
deno task seed-db
```

**"API request failed: 404"**
```bash
# Start the Motia dev server
deno task dev

# Verify endpoint is accessible
curl http://localhost:3000/classify/batch
```

**"Invalid count format"**
```bash
# ❌ Wrong: 25 (missing dash)
# ✅ Correct: -25

deno task run:random -25
```

**"Database locked"**
```bash
# Stop any running classifications
pkill -f "deno task"

# Wait a moment, then try again
deno task run:random -25
```

### Workflow Example

```bash
# 1. Ensure dev server is running
deno task dev

# 2. Test prompts on small sample
deno task run:random -25

# 3. Check quality of results
deno task query

# 4. If good, scale to larger sample
deno task run:random -100

# 5. Monitor progress
sqlite3 ./data/classify-workflow-local-dev.db "
  SELECT COUNT(*) FROM classifications;
"

# 6. If quality is consistently good, run full pipeline
deno task run:random all
```

### Auto-Batching Features

- **Automatic batching:** Large requests split into 50-indicator batches
- **Sequential processing:** Batches submitted one at a time with 2-second delays
- **Server-friendly:** Prevents overwhelming the API with massive requests
- **Progress tracking:** Each batch gets its own trace_id for monitoring
- **Error isolation:** If one batch fails, others can still succeed

### Random Sampling Benefits

- **True randomness:** `ORDER BY RANDOM()` ensures unbiased sampling
- **Representative:** Samples across all sources, countries, indicators
- **Reproducible:** Can run multiple samples for quality checks
- **Scalable:** Same command works for 25 or 10,000 indicators

---

*For more information, see [docs/ROUTING_VERIFICATION.md](../docs/ROUTING_VERIFICATION.md)*
