# Classification Workflow Examples

## Basic Usage

Simple example that sends a single batch of indicators:

```bash
deno run -A examples/basic-usage.ts
```

## Parallel Batches (Recommended for High Throughput)

Sends 4 concurrent batches of 5 indicators each (20 total) to maximize parallel processing:

```bash
# Set required environment variables
export CLASSIFY_DB_URL="postgresql://user:pass@host/db"
export LLM_PROVIDER="openai"  # or "anthropic" or "local"
export API_URL="http://localhost:3000"  # optional, defaults to localhost:3000
export API_KEY="your-api-key"  # optional, if API key protection is enabled

# Run the parallel batches example
deno run -A examples/parallel-batches.ts
```

### How it works

1. Fetches 20 random indicators from the source database
2. Splits them into 4 batches of 5 indicators each
3. Sends all 4 batches to the API concurrently using `Promise.all()`
4. Each batch is processed independently by the workflow
5. With `INTERNAL_EMIT_BATCH=5`, each batch processes all 5 indicators in parallel

**Total concurrency:** 20 indicators processing simultaneously across 4 separate batch traces.

### Configuration

The internal batch size is controlled by the `INTERNAL_EMIT_BATCH` environment variable in your `.env` file:

```bash
# Process indicators in batches of 5
INTERNAL_EMIT_BATCH=5
```

Lower values = higher concurrency (more parallel processing)
Higher values = lower overhead (fewer event emissions)

### Performance Tips

- **For maximum throughput:** Use `INTERNAL_EMIT_BATCH=5` and send multiple concurrent API requests
- **For rate limiting:** Increase `INTERNAL_EMIT_DELAY_MS` to add delay between internal batches
- **For cold starts:** Set `STARTUP_WARM_MS` to allow connection pools to initialize
- **For cost optimization:** Use `local` LLM provider (LM Studio) for free inference

### Monitoring

Each batch gets a unique `trace_id` that you can use to track its progress:

- Check Motia logs: Filter by trace ID
- Query database: `SELECT * FROM pipeline_stats WHERE batch_id = 'trace-id'`
- Check state: Look for completed classifications in the `classifications` table

### Example Output

```
🚀 Parallel Batch Classification

Total indicators: 20
Batch size: 5
Number of batches: 4
LLM provider: openai

📊 Fetching random indicators from database...
✅ Fetched 20 indicators

🔄 Sending batches in parallel...

[Batch 1] Sending 5 indicators...
[Batch 2] Sending 5 indicators...
[Batch 3] Sending 5 indicators...
[Batch 4] Sending 5 indicators...
[Batch 1] ✅ Started (245ms) - Trace: abc-123
[Batch 2] ✅ Started (258ms) - Trace: def-456
[Batch 3] ✅ Started (251ms) - Trace: ghi-789
[Batch 4] ✅ Started (263ms) - Trace: jkl-012

✅ All batches sent successfully in 268ms!

Trace IDs:
  Batch 1: abc-123
  Batch 2: def-456
  Batch 3: ghi-789
  Batch 4: jkl-012

💡 Check Motia logs and database for classification results.
```
