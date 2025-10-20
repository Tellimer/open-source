# OpenAI Prompt Caching Analysis

## Summary

**Cost: $17.50-$20 per 10k indicators with gpt-4.1-mini**
- Previous: $35 with gpt-5-mini
- Cost reduction: 50% (but less than expected ~$2.50)

## Root Cause: Prompt Caching Not Working for Most Stages

OpenAI automatic prompt caching requires **>1024 tokens** in the system prompt.

### System Prompt Sizes by Stage:

| Stage | Prompt File | Size | Tokens | Cacheable? |
|-------|-------------|------|--------|------------|
| Type (Non-Currency) | type-non-currency.ts | 13,884 chars | ~3,471 | ✅ YES |
| Type (Currency) | type-currency.ts | 9,558 chars | ~2,389 | ✅ YES |
| Time Inference | time.ts | 7,189 chars | ~1,797 | ✅ YES |
| Family (Non-Currency) | family-non-currency.ts | 4,871 chars | ~1,217 | ✅ YES |
| Consensus Review | consensus-review.ts | 3,769 chars | ~942 | ❌ NO |
| Quality Review | quality-review.ts | 3,236 chars | ~809 | ❌ NO |
| Family (Currency) | family-currency.ts | 2,777 chars | ~694 | ❌ NO |
| Final Review | final-review.ts | 980 chars | ~245 | ❌ NO |
| Boolean Review | boolean-review.ts | 920 chars | ~230 | ❌ NO |

**Result: Only 4/9 stages (44%) can use prompt caching**

## Cost Breakdown

Each indicator goes through ~7 LLM stages (2 parallel + 5 sequential).

Assuming equal token usage per stage:
- **44% of calls**: Cacheable (gpt-4.1-mini with 75% cache discount)
  - First call: $0.40/M tokens
  - Subsequent calls: $0.10/M cached + $0.40/M uncached = ~$0.13/M effective
- **56% of calls**: Not cacheable (full price)
  - All calls: $0.40/M tokens

**Effective average**: ~$0.25-0.30/M tokens (vs. $0.10/M if all cached)

This matches the observed $17.50-$20 cost (about 60-70% of the $35 gpt-5-mini cost).

## Options to Reduce Costs

### Option 1: Pad Short Prompts (Easiest)
**Target: Get all prompts >1024 tokens**

Prompts to expand:
- consensus-review.ts: Add 82 tokens (942 → 1024)
- quality-review.ts: Add 215 tokens (809 → 1024)
- family-currency.ts: Add 330 tokens (694 → 1024)
- final-review.ts: Add 779 tokens (245 → 1024)
- boolean-review.ts: Add 794 tokens (230 → 1024)

**How to pad**:
- Add more examples (5-10 examples = ~200-400 tokens)
- Add detailed classification guidelines
- Add edge case handling instructions
- Add reasoning templates

**Expected cost reduction**:
- From: $17.50-$20 per run
- To: $3-5 per run (with 90%+ cache hit rate)
- Savings: **~75-85%**

### Option 2: Switch to Anthropic Claude
**Claude supports better prompt caching**

- Claude Haiku: Faster, cheaper ($0.25/M input, $1.25/M output)
- Cache discount: 90% (vs OpenAI's 75%)
- Better handling of shorter prompts
- Supports explicit cache control

**Trade-offs**:
- Need to migrate prompts
- Different JSON schema handling
- May need prompt tuning

### Option 3: Merge Stages to Reduce LLM Calls
**Combine short prompts into single stages**

Example mergers:
- Boolean Review + Final Review → Single validation stage
- Quality Review + Consensus Review → Single review stage

**Benefits**:
- Fewer API calls overall
- Larger combined prompts more likely to cache
- Reduced latency (fewer sequential stages)

**Trade-offs**:
- More complex prompts
- Harder to debug
- Less modular architecture

### Option 4: Accept Current Cost
**$17.50-$20 per 10k indicators = $0.00175 per indicator**

For comparison:
- Human classification: ~$0.10-1.00 per indicator
- Current cost: $0.00175 per indicator
- With full caching: $0.00025 per indicator

**Already 57-570x cheaper than human classification!**

## Recommendation

**Short-term**: Pad the 5 short prompts to >1024 tokens (Option 1)
- Quick win: 2-3 hours of work
- Cost reduction: ~75-85% ($17.50 → ~$3-5)
- No architecture changes

**Long-term**: Consider Claude for critical stages (Option 2)
- Better cost/performance for complex reasoning
- Superior caching behavior
- Evaluate after OpenAI cost optimization

## Testing

Run caching test to verify:
```bash
bun run src/scripts/test-caching.ts
```

Expected output with working cache:
```
Call 1: cached=0 (nothing cached yet)
Call 2: cached>1000 (system prompt cached)
Call 3: cached>1000 (still cached)
```

## Implementation

See: `src/scripts/test-caching.ts` for caching verification
See: `src/llm/clients.ts` for usage logging (console.error output)

## Next Steps

1. ✅ Identify short prompts (<1024 tokens)
2. ⬜ Pad short prompts with examples and guidelines
3. ⬜ Test caching effectiveness
4. ⬜ Measure cost reduction
5. ⬜ Consider Claude for specific stages if needed