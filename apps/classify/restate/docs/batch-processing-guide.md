# Batch Processing Guide

## Processing 10,903 Indicators Safely

### Overview
Each indicator requires ~3 LLM API calls (time-inference, family-assignment, type-classification), so 10,903 indicators = **~32,709 API requests** total.

### Rate Limit Options

#### 🟢 Conservative (Recommended for Production)
```bash
bun run src/scripts/classify-indicators-throttled.ts --openai --rpm 150
```
- **Rate**: 50 indicators/minute (~150 API requests/min)
- **Total Time**: ~3.6 hours for all 10,903 indicators
- **Safety**: Uses 30% of Tier 1 limits (500 RPM)
- **Headroom**: Plenty of room for retries and error handling
- **Best for**: Overnight runs, production environments

#### 🟡 Moderate (Balanced)
```bash
bun run src/scripts/classify-indicators-throttled.ts --openai --rpm 300
```
- **Rate**: 100 indicators/minute (~300 API requests/min)
- **Total Time**: ~1.8 hours for all 10,903 indicators
- **Safety**: Uses 60% of Tier 1 limits
- **Headroom**: Some room for retries
- **Best for**: Development, testing batches

#### 🔴 Aggressive (Max Speed)
```bash
bun run src/scripts/classify-indicators-throttled.ts --openai --rpm 480
```
- **Rate**: 160 indicators/minute (~480 API requests/min)
- **Total Time**: ~1.1 hours for all 10,903 indicators
- **Safety**: Uses 96% of Tier 1 limits (500 RPM)
- **Headroom**: Minimal - risk of rate limiting
- **Best for**: When you need it done ASAP and can monitor closely

### OpenAI Rate Limits by Tier

| Tier | RPM Limit | Safe Rate | Time for 10k |
|------|-----------|-----------|--------------|
| Free | 3 RPM | 2 RPM | ~272 hours |
| Tier 1 | 500 RPM | 150 RPM | ~3.6 hours |
| Tier 2 | 5,000 RPM | 1,500 RPM | ~22 minutes |
| Tier 3+ | 10,000+ RPM | 3,000+ RPM | ~11 minutes |

Check your tier: https://platform.openai.com/account/limits

### Resume Capability

The script automatically resumes from where it left off:

```sql
-- Check progress
SELECT COUNT(*) FROM classifications;
SELECT COUNT(*) FROM source_indicators;
```

Just run the same command again - it only processes indicators without classifications:

```bash
# Run until complete, restart if interrupted
bun run src/scripts/classify-indicators-throttled.ts --openai --rpm 150
```

### Monitoring Progress

#### Check Restate workflows:
```bash
curl http://localhost:9070/restate/invocations | jq '.invocations | length'
```

#### Check database progress:
```sql
-- Overall progress
SELECT
  (SELECT COUNT(*) FROM classifications) as completed,
  (SELECT COUNT(*) FROM source_indicators) as total,
  ROUND(100.0 * (SELECT COUNT(*) FROM classifications) / (SELECT COUNT(*) FROM source_indicators), 2) as percent_complete;

-- Stage completion rates
SELECT
  'normalization' as stage, COUNT(*) FROM normalization_results
UNION ALL SELECT 'time_inference', COUNT(*) FROM time_inference_results
UNION ALL SELECT 'family_assignment', COUNT(*) FROM family_assignment_results
UNION ALL SELECT 'type_classification', COUNT(*) FROM type_classification_results
UNION ALL SELECT 'classifications', COUNT(*) FROM classifications;
```

#### Monitor Restate UI:
Open http://localhost:9070 in your browser to see workflow states.

### Best Practices

1. **Start with a test batch**:
   ```bash
   bun run src/scripts/classify-indicators-throttled.ts --openai --rpm 150 --limit 100
   ```

2. **Run production batch overnight**:
   ```bash
   # Conservative overnight run
   nohup bun run src/scripts/classify-indicators-throttled.ts --openai --rpm 150 > classify.log 2>&1 &
   ```

3. **Monitor costs**:
   - GPT-5-mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
   - Estimated cost for 10k indicators: ~$20-50 depending on data size

4. **If rate limited**:
   - The AI SDK has automatic retries with exponential backoff
   - Restate workflows are durable - they'll resume automatically
   - Just wait and let it recover, or restart with lower --rpm

### Example: Processing All 10,903 Indicators

```bash
# Step 1: Test with 10 indicators
bun run src/scripts/classify-indicators-throttled.ts --openai --rpm 150 --limit 10

# Step 2: Check results
psql -U classify -d classify -c "SELECT * FROM classifications ORDER BY updated_at DESC LIMIT 3;"

# Step 3: Run full batch (overnight)
nohup bun run src/scripts/classify-indicators-throttled.ts --openai --rpm 150 > classify.log 2>&1 &

# Step 4: Check progress periodically
tail -f classify.log

# Step 5: Resume if interrupted (automatic)
bun run src/scripts/classify-indicators-throttled.ts --openai --rpm 150
```

### Troubleshooting

**Problem**: Rate limited (429 errors)
**Solution**: Reduce --rpm value and restart

**Problem**: Workflows stuck/hanging
**Solution**: Check Restate UI at http://localhost:9070, restart Restate if needed

**Problem**: Database connection errors
**Solution**: Check TimescaleDB is running: `docker ps | grep timescale`

**Problem**: Want to reprocess failed indicators
**Solution**: Delete from classifications table and re-run:
```sql
DELETE FROM classifications WHERE indicator_id IN ('FAILED1', 'FAILED2');
```
