# OpenAI Classification Cost Estimates

## API Limits

- **Max indicators per request**: 100
- **Max requests per batch**: 50,000 (OpenAI Batch API)
- **Batch API discount**: 50% off standard pricing

## Workflow LLM Stages

Based on the current simplified workflow, when using `--provider openai`:

### Rule-Based Stages (No LLM cost)
1. **Normalize** - Rule-based unit/scale/currency parsing (free)

### Optional LLM Stages (Only if `llm_provider !== "local"`)
2. **Time Inference** - Infer time basis and reporting frequency (optional LLM)

### Always LLM Stages
3. **Family Assignment** - Assign indicator to family (currency or non-currency branch)
4. **Type Classification** - Classify indicator type
5. **Boolean Review** - Review classification quality
6. **Final Review** - Final validation (only if needed)

**Total LLM calls per indicator**:
- **Minimum**: 3 calls (family + type + boolean review)
- **Maximum**: 5 calls (+ time inference + final review)
- **Typical**: 4 calls (time + family + type + boolean)

## GPT-4o Pricing (2024-08-06)

### Standard API Rates
- **Input**: $2.50 per 1M tokens
- **Output**: $10.00 per 1M tokens

### Batch API Rates (50% discount)
- **Input**: $1.25 per 1M tokens
- **Output**: $5.00 per 1M tokens

## Token Estimates per LLM Call

Based on typical indicator classification prompts:

| Stage | Input Tokens | Output Tokens | Total Tokens |
|-------|-------------|---------------|--------------|
| Time Inference | ~300 | ~50 | ~350 |
| Family Assignment | ~400 | ~100 | ~500 |
| Type Classification | ~350 | ~75 | ~425 |
| Boolean Review | ~500 | ~150 | ~650 |
| Final Review | ~600 | ~200 | ~800 |

**Average per indicator**: ~4 calls × ~500 tokens = **~2,000 tokens**

## Cost Calculations

### Per Indicator Costs (Standard API)

```
Input:  (300 + 400 + 350 + 500) × $2.50 / 1M = ~$0.00388
Output: (50 + 100 + 75 + 150) × $10.00 / 1M = ~$0.00375
Total per indicator: ~$0.00763
```

### Per Indicator Costs (Batch API - 50% off)

```
Total per indicator: ~$0.00382
```

### Volume Estimates

| Indicators | Standard API | Batch API (50% off) | Time to Process* |
|-----------|--------------|---------------------|------------------|
| 100 | $0.76 | $0.38 | ~2 minutes |
| 1,000 | $7.63 | $3.82 | ~20 minutes |
| 10,000 | $76.30 | $38.15 | ~3.3 hours |
| 50,000 | $381.50 | $190.75 | ~16.7 hours |
| 100,000 | $763.00 | $381.50 | ~33.3 hours |

*Time estimates assume parallel processing with OpenAI's standard rate limits

## Current Setup Performance

### Real-time API (Current Implementation)
- **Batch size**: 100 indicators per request
- **Processing**: Parallel, results immediate
- **Cost**: Standard API pricing (~$0.76 per 100 indicators)
- **Best for**: Interactive workflows, smaller batches (<10k indicators)

### Batch API (Not Yet Implemented)
- **Batch size**: Up to 50,000 indicators
- **Processing**: Async, 24hr completion window
- **Cost**: 50% discount (~$0.38 per 100 indicators)
- **Best for**: Large-scale processing (10k+ indicators)

## Recommendations

### For Development/Testing (Current)
- Use `--provider local` (free, uses LM Studio)
- Limit sample sizes to 100-1000 indicators
- Cost: $0

### For Production (Small batches: <5,000)
- Use `--provider openai` with standard API
- Batch size: 100 indicators per request
- Cost: ~$0.76 per 100 indicators
- Total: <$40 for 5,000 indicators

### For Production (Large batches: 5,000-50,000)
- **Option 1**: Standard API with current setup
  - Cost: $38.15 - $381.50
  - Time: 3-17 hours
  - Immediate results

- **Option 2**: Implement Batch API support
  - Cost: $19.08 - $190.75 (50% savings)
  - Time: Up to 24 hours
  - Requires new implementation
  - **Savings**: $19-$191 per large batch

### For Production (>50,000)
- Implement Batch API support (required for >50k per batch)
- Cost: ~$3.82 per 1,000 indicators
- Submit multiple batches if needed
- Monitor OpenAI quota limits (200M tokens/month for standard tier)

## Example: Classifying Your Full Dataset

Assuming you have ~26,000 indicators in the database:

### Standard API
```
26,000 indicators × $0.00763 = $198.38
Time: ~8.7 hours (parallel processing)
Batches: 260 API calls (100 per batch)
```

### Batch API (if implemented)
```
26,000 indicators × $0.00382 = $99.32
Time: Up to 24 hours
Batches: 1 batch file submission
Savings: $99.06 (50%)
```

## Token Quota Management

### Default Tier Limits (Most common)
- **Enqueued tokens**: 200M per month
- **Max indicators at $0.00763**: ~26,200 indicators/month
- **Rate limits**: 10,000 requests/min (more than enough)

### Monitor Usage
```bash
# Check batch stats after run
deno task stats

# Query specific results
deno task query
```

## Cost Optimization Tips

1. **Use local LLM for development** - Free, unlimited
2. **Start with small batches** - Test with 100-1000 first
3. **Cache results** - Database stores all classifications
4. **Use time inference rules** - Set `llm_provider=local` to skip LLM for time stage
5. **Batch processing** - Always use max batch size (100) to minimize overhead
6. **Monitor failures** - Review stats to avoid re-processing failed indicators

## Future: Batch API Implementation

If implementing Batch API support:

1. **Create batch file** with JSONL format (one request per line)
2. **Submit batch** via OpenAI Batch API
3. **Poll for completion** (every 1-5 minutes)
4. **Download results** when ready
5. **Process into database** same as real-time flow

**Development effort**: ~4-8 hours
**Savings**: 50% on all large batches (>5k indicators)
**Break-even**: After ~2 large batches

---

*Estimates based on GPT-4o-2024-08-06 pricing as of January 2025. Actual costs may vary based on prompt complexity and output length.*


