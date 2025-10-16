# Troubleshooting Guide

## Memory Issues (Exit Code 137)

### Symptom

```
[ERROR] InferTimeBasis Process exited with code 137
```

### Cause

Exit code 137 = SIGKILL (killed by OS due to out-of-memory). This happens when:

- Too many concurrent workflows spawn simultaneously
- Each workflow imports heavy AI SDK libraries (`@ai-sdk/openai`, `ai`)
- Memory usage: ~200-300MB per workflow × 25 workflows = 5-7GB+

### Solution

Prefer smaller internal batches; API accepts up to 100 indicators per request, but internal step concurrency should respect your machine’s RAM.

Internal emit is parallelized per request; control overall load via how many indicators you submit per request (use scripts that auto-batch) and provider choice (`--provider local|openai|anthropic`).

### What Changed

- ✅ **Batch size**: 25 → 5 workflows
- ✅ **Delay between batches**: 1s → 2s (allows GC)
- ✅ **API max limit**: 25 → 10 indicators per request

### Performance Notes

- Local models use RAM proportional to model size; start with smaller sample sizes (e.g., `-25`) and scale.
- Cloud providers reduce local RAM pressure and can increase throughput.

### Testing

```bash
# Start fresh (clear any stuck processes)
pkill -f motia

# Start server
deno task dev

# Test with small batch
deno task run:dev -10
```

## Broken Pipe Errors

### Symptom

```
[ERROR] BrokenPipe: Broken pipe (os error 32)
```

### Cause

- User interrupted process (Ctrl+C)
- Parent process killed while child processes running
- Network connection dropped

### Solution

This is expected when interrupting. To gracefully stop:

1. Stop sending new batches (Ctrl+C in terminal 2)
2. Wait for current batch to complete
3. Then stop server (Ctrl+C in terminal 1)

## API Connection Errors

### Symptom

```
Failed to connect to http://localhost:3000
```

### Solution

1. Check server is running: `deno task dev`
2. Check port is correct (default: 3000)
3. Check firewall settings

## Database Errors

### Symptom

```
Database not found at ./data/classify-workflow-local-dev.db
```

### Solution

```bash
deno task seed-db
```

## LLM API Errors

### Symptom

```
Error: API key not found
Error: Rate limit exceeded
```

### Solution

**API Key Issues:**

```bash
# Check .env file exists
cat .env | grep API_KEY

# Verify keys are valid (should start with sk-)
```

**Rate Limits:**

- OpenAI Tier 1: 500 requests/minute
- With 5 concurrent workflows × 6 LLM calls = 30 RPM
- Should be well under limit

**Workaround:**

```bash
# Reduce batch size further
# In src/scripts/run-classification.ts:
const batchSize = 3; // Even more conservative

# Or add longer delays
await new Promise((resolve) => setTimeout(resolve, 5000)); // 5s delay
```

## Type Errors During Development

### Symptom

```
error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
```

### Solution

```bash
# Regenerate Motia types after step changes
deno task generate-types

# Type check specific file
deno check path/to/file.ts
```

## Configuration Issues

### Wrong LLM Provider

Check environment variables:

```bash
# .env
LLM_PROVIDER_TIME_INFERENCE=openai  # Should be openai or anthropic
```

### Database Path Issues

Ensure paths are relative to project root:

```bash
# .env
CLASSIFY_DB_LOCAL_DEV=./data/classify-workflow-local-dev.db  # ✅ Correct
CLASSIFY_DB_LOCAL_DEV=data/classify-workflow-local-dev.db    # ❌ May fail
```

## Performance Optimization

### Slow Classification

**Current bottleneck:** LLM API latency (~1-2s per call)

**Optimization options:**

1. **Use faster models:**

```bash
# In llm-clients.ts, change model:
model: openai('gpt-4o-mini')  # ✅ Fast & cheap
model: openai('gpt-4')         # ❌ Slow & expensive
```

2. **Use Anthropic for some stages:**

```bash
# .env - Anthropic is often faster
LLM_PROVIDER_BOOLEAN_REVIEW=anthropic
LLM_PROVIDER_FINAL_REVIEW=anthropic
```

3. **Increase batch size (if you have RAM):**

```typescript
// Only if you have 16GB+ RAM
const batchSize = 10; // Carefully test first
```

### Memory Usage Monitoring

**Monitor system memory:**

```bash
# macOS
top -l 1 | grep PhysMem

# Linux
free -h

# During classification
watch -n 1 'ps aux | grep deno | head -20'
```

**Safe memory levels:**

- 8GB RAM: batchSize = 3
- 16GB RAM: batchSize = 5
- 32GB RAM: batchSize = 10

## Debugging Tips

### Enable Verbose Logging

Motia logs are already extensive. To see more:

1. Check server terminal for real-time logs
2. Look for structured log data (indicator_id, trace_id)
3. Use trace IDs to follow specific workflows

### Inspect State

```typescript
// In a Motia step or script
import { StateManager } from "motia";

// Check what's in state
const allClassifications = await state.getAll("final-classifications");
console.log(`Total classified: ${allClassifications.length}`);

// Check specific indicator
const result = await state.get("normalizations", "INDICATOR_ID");
console.log(result);
```

### Database Inspection

```bash
# Open SQLite database
deno run --allow-read --allow-write -A npm:sqlite3
> .open data/classify-workflow-local-dev.db
> SELECT COUNT(*) FROM source_indicators;
> SELECT name, COUNT(*) FROM source_indicators GROUP BY name LIMIT 10;
```

## Getting Help

### Check Logs

1. Server terminal output
2. Motia state for intermediate results
3. Trace IDs from classification runner

### Collect Information

- Batch size being used
- Number of indicators
- Memory available (RAM)
- Error messages (full stack trace)
- Deno version: `deno --version`

### Common Solutions Summary

| Issue            | Quick Fix                           |
| ---------------- | ----------------------------------- |
| OOM (exit 137)   | Reduce `batchSize` to 3-5           |
| Broken pipe      | Expected on Ctrl+C, restart server  |
| API errors       | Check .env has valid API keys       |
| DB not found     | Run `deno task seed-db`             |
| Slow performance | Use gpt-4o-mini, batch 5 indicators |
| Rate limits      | Add longer delays between batches   |
