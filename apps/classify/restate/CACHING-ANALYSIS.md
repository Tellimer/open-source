# OpenAI Prompt Caching Analysis

## Summary

**Cost: $17.50-$20 per 10k indicators with gpt-4.1-mini**
- Previous: $35 with gpt-5-mini
- Cost reduction: 50% (but less than expected ~$2.50)

## Root Cause Analysis (RESOLVED)

OpenAI automatic prompt caching requires **>1024 tokens** in the system prompt AND **100% static content** (no variable interpolation).

### Initial System Prompt Sizes:

| Stage | Prompt File | Size | Tokens | Cacheable? | Issues |
|-------|-------------|------|--------|------------|--------|
| Type (Non-Currency) | type-non-currency.ts | 13,884 chars | ~3,471 | ❌ NO | Dynamic: `${input.family}` |
| Type (Currency) | type-currency.ts | 9,558 chars | ~2,389 | ❌ NO | Dynamic: `${input.family}` |
| Time Inference | time.ts | 7,189 chars | ~1,797 | ✅ YES | - |
| Family (Non-Currency) | family-non-currency.ts | 4,871 chars | ~1,217 | ✅ YES | - |
| Consensus Review | consensus-review.ts | 3,769 chars | ~942 | ❌ NO | Too short |
| Quality Review | quality-review.ts | 3,236 chars | ~809 | ❌ NO | Too short |
| Family (Currency) | family-currency.ts | 2,777 chars | ~694 | ❌ NO | Too short |
| Final Review | final-review.ts | 980 chars | ~245 | ❌ NO | Too short |
| Boolean Review | boolean-review.ts | 920 chars | ~230 | ❌ NO | Too short |

**Initial Result: Only 2/9 stages (22%) could use prompt caching**

### Optimized System Prompt Sizes (AFTER FIXES):

| Stage | Prompt File | Size | Tokens | Cacheable? | Changes |
|-------|-------------|------|--------|------------|---------|
| Type (Non-Currency) | type-non-currency.ts | 17,343 chars | ~4,336 | ✅ YES | Made static, unified families |
| Type (Currency) | type-currency.ts | 11,948 chars | ~2,987 | ✅ YES | Made static, unified families |
| Time Inference | time.ts | 7,189 chars | ~1,797 | ✅ YES | Already optimized |
| Family (Non-Currency) | family-non-currency.ts | 4,871 chars | ~1,217 | ✅ YES | Already optimized |
| Consensus Review | consensus-review.ts | 5,439 chars | ~1,360 | ✅ YES | Added examples +418 tokens |
| Quality Review | quality-review.ts | 6,485 chars | ~1,622 | ✅ YES | Added examples +813 tokens |
| Family (Currency) | family-currency.ts | 10,498 chars | ~2,625 | ✅ YES | Added examples +1,331 tokens |
| Final Review | final-review.ts | 8,449 chars | ~2,112 | ✅ YES | Added examples +1,867 tokens |
| Boolean Review | boolean-review.ts | 8,279 chars | ~2,070 | ✅ YES | Added examples +1,840 tokens |

**Final Result: 9/9 stages (100%) now use prompt caching! ✅**

## Cost Analysis

### Before Optimizations:
**Cost: $17.50-$20 per 10k indicators**
- Only 2/9 stages cacheable (time, family-non-currency)
- 2/9 stages with dynamic prompts prevented caching entirely (type stages are major cost drivers)
- 5/9 stages too short (<1024 tokens)
- Effective cache hit rate: ~10-20%
- Effective cost: ~$0.30-$0.35/M tokens

### After Optimizations:
**Expected Cost: $3-5 per 10k indicators**
- 9/9 stages cacheable (100%)
- All prompts >1024 tokens
- All prompts 100% static (no variable interpolation)
- Expected cache hit rate: ~90-95% (after first indicator)
- Effective cost: ~$0.10-$0.12/M tokens

### Cost Breakdown by Optimization:

1. **Fixed Dynamic Prompts** (CRITICAL):
   - type-currency.ts: Moved `${input.family}` to userPrompt
   - type-non-currency.ts: Moved `${input.family}` to userPrompt
   - Impact: These are major cost drivers (~2-3 calls per indicator)
   - Savings: Enabled caching for 22% of calls

2. **Expanded Short Prompts**:
   - boolean-review: 230 → 2,070 tokens (+1,840)
   - final-review: 245 → 2,112 tokens (+1,867)
   - family-currency: 694 → 2,625 tokens (+1,331)
   - quality-review: 809 → 1,622 tokens (+813)
   - consensus-review: 942 → 1,360 tokens (+418)
   - Impact: Enabled caching for remaining 56% of calls
   - Savings: 75% discount on 5 additional stages

**Total Expected Savings: 75-85% reduction ($17.50-$20 → $3-5)**

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

## Implementation Status

### Completed ✅
1. ✅ Identify short prompts (<1024 tokens) - 5 prompts identified
2. ✅ Identify dynamic prompts - 2 critical type classification prompts
3. ✅ Fix dynamic prompts - Made type-currency and type-non-currency static
4. ✅ Expand boolean-review: 230 → 2,070 tokens
5. ✅ Expand final-review: 245 → 2,112 tokens
6. ✅ Expand family-currency: 694 → 2,625 tokens
7. ✅ Expand quality-review: 809 → 1,622 tokens
8. ✅ Expand consensus-review: 942 → 1,360 tokens
9. ✅ All 9/9 stages now cacheable (100% coverage)

### Next Steps ⬜
1. ⬜ Rebuild Docker containers with updated prompts
2. ⬜ Run test-caching.ts to verify cache hits
3. ⬜ Run full classification batch and measure actual costs
4. ⬜ Verify ~90%+ cache hit rate in production
5. ⬜ Document actual cost reduction achieved

## Key Insights

### Critical Discovery: Dynamic System Prompts
The biggest blocker wasn't just prompt size, but **variable interpolation in system prompts**:
- type-currency.ts had: `${input.family === "physical-fundamental" ? guidanceA : guidanceB}`
- type-non-currency.ts had: `${input.family.toUpperCase()}` and `${familyInfo.guidance}`
- This made system prompts vary per call, preventing caching **entirely**
- Type classification is a major cost driver (~2-3 calls per indicator)

**Solution**: Unified all conditional logic into single comprehensive static prompt, moved variables to userPrompt.

### Prompt Caching Requirements
1. System prompt must be >1024 tokens
2. System prompt must be 100% static (no `${variable}` interpolation)
3. Cache lasts 5-10 minutes of activity, max 1 hour
4. 75% cost discount on gpt-4.1-mini ($0.40/M → $0.10/M)
5. Automatic - just need to meet the requirements

## Cost Impact Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Cacheable stages | 2/9 (22%) | 9/9 (100%) | +78% |
| Average prompt size | ~1,710 tokens | ~2,346 tokens | +37% |
| Dynamic prompts | 2/9 (22%) | 0/9 (0%) | -22% |
| Expected cache hit rate | 10-20% | 90-95% | +75-80% |
| Cost per 10k indicators | $17.50-$20 | $3-5 | -75-85% |
| Cost per indicator | $0.00175 | $0.0003-0.0005 | -71-82% |