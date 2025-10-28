# Batching Architecture

## Two-Level Batching Explained

The classification pipeline uses **two-level batching** for different purposes:

1. **API-level batching** (Feeder script) - Works around API request size limits
2. **Processing-level batching** (Pipeline) - Manages memory and parallelization

This is **intentional and necessary** because of the API's 25-indicator limit.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      run-classification.ts                          │
│                  (Level 1: API Request Batching)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Sample 10,000 indicators from database                            │
│                                                                     │
│  API_BATCH_SIZE = 25 (hard limit from API)                         │
│  Total API batches: 10,000 / 25 = 400 requests                     │
│                                                                     │
│  ┌───────────────────────────────────────┐                         │
│  │ API Batch 1: POST /classify/batch     │                         │
│  │   { indicators: [25 indicators] }     │ → Trace ID: abc-001     │
│  │   wait 500ms                          │                         │
│  └───────────────────────────────────────┘                         │
│  ┌───────────────────────────────────────┐                         │
│  │ API Batch 2: POST /classify/batch     │                         │
│  │   { indicators: [25 indicators] }     │ → Trace ID: abc-002     │
│  │   wait 500ms                          │                         │
│  └───────────────────────────────────────┘                         │
│  ┌───────────────────────────────────────┐                         │
│  │ ...400 total API calls...             │                         │
│  └───────────────────────────────────────┘                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                    400 separate API requests
                    (limited by API constraint)
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    start-classify.step.ts                           │
│            (Level 2: Internal Processing Batching)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Each API request receives: 25 indicators                          │
│  PROCESSING_BATCH_SIZE = 25 (configurable for memory)              │
│                                                                     │
│  For each API batch (25 indicators):                               │
│                                                                     │
│  ┌───────────────────────────────────────┐                         │
│  │ Processing Batch 1: [25 indicators]   │                         │
│  │   → emit() 25 events in PARALLEL      │                         │
│  │   → Each flows through pipeline       │                         │
│  └───────────────────────────────────────┘                         │
│                                                                     │
│  If API sent more than 25:                                         │
│  (only happens if API limit increased)                             │
│                                                                     │
│  ┌───────────────────────────────────────┐                         │
│  │ Processing Batch 2: [25 indicators]   │                         │
│  │   wait 1s                             │                         │
│  │   → emit() 25 events in PARALLEL      │                         │
│  └───────────────────────────────────────┘                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Why Two Levels?

### Level 1: API Request Batching (REQUIRED)

**Purpose:** Work around API size limit
**Constraint:** API accepts max 25 indicators per request
**Location:** `src/scripts/run-classification.ts:152`
**Controlled by:** `API_BATCH_SIZE = 25` (matches API limit)

**Why it exists:**

```typescript
// API schema enforces this limit
bodySchema: z.object({
  indicators: z.array(indicatorInputSchema).min(1).max(25), // ← Hard limit
});
```

**Example:**

```
10,000 indicators ÷ 25 per request = 400 API calls
Each call gets its own trace_id
```

---

### Level 2: Processing Batching (OPTIONAL)

**Purpose:** Manage memory and parallelization
**Constraint:** System RAM and LLM capacity
**Location:** `steps/classify-flow/start-classify.step.ts:88`
**Controlled by:** `batchSize = 25` (configurable)

**Why it exists:**

- Prevents OOM errors (processing 25 indicators in parallel uses less RAM than 100)
- Allows cleanup between batches
- Controls LLM request concurrency

**Example:**

```
If API limit increased to 100:
  API sends: 100 indicators
  Pipeline processes: 4 batches of 25 (100 ÷ 25 = 4)
```

---

## Current State (API Limit = 25)

Since both batch sizes are currently **25**, the two levels appear redundant:

```
Feeder: Split 100 indicators → 4 API calls of 25 each
Pipeline: Each API call processes 25 → 1 processing batch of 25

Result: 4 API calls, 4 trace IDs, 4 processing batches
```

**This is fine!** Both levels serve different purposes and will diverge when we increase the API limit.

---

## Future State (API Limit = 100)

When we increase the API limit to 100 (recommended for cloud LLMs):

```typescript
// start-classify.step.ts:45
indicators: z.array(indicatorInputSchema).min(1).max(100), // Increased
```

Then the batching becomes more clearly separated:

```
Feeder: Split 10,000 indicators → 100 API calls of 100 each
Pipeline: Each API call processes 100 → 4 processing batches of 25

Result: 100 API calls, 100 trace IDs, 400 processing batches
```

---

## Configuration

### Level 1: API Batch Size (Fixed)

**Must match API limit:**

```typescript
// run-classification.ts:152
const API_BATCH_SIZE = 25; // Must match API schema max
```

**To change:**

1. Update API schema in `start-classify.step.ts:45`
2. Update feeder script `API_BATCH_SIZE` to match

---

### Level 2: Processing Batch Size (Flexible)

**Adjust based on system resources:**

```typescript
// start-classify.step.ts:88
const batchSize = 25; // Configurable
```

| System RAM | LLM Provider | Recommended |
| ---------- | ------------ | ----------- |
| 16GB       | Local        | 10-15       |
| 32GB       | Local        | 25-50       |
| Any        | Cloud        | 50-100      |

---

## Performance Analysis

### Current Configuration (25/25)

**Processing 10,000 indicators:**

```
API-level batching:
  10,000 ÷ 25 = 400 API requests
  Each request takes ~500ms network time
  Total API time: 400 × 0.5s = 200s = 3.3 minutes

Processing-level batching:
  Each API batch (25 indicators) = 1 processing batch
  Processing time: ~5s per indicator (local LLM)
  Total processing: 25 indicators × 5s = 125s per API batch

Combined total: ~14.5 hours
  (400 batches × 125s per batch ÷ 3600s/h)
```

---

### Optimized Configuration (100/25 with cloud LLMs)

**After increasing API limit:**

```
API-level batching:
  10,000 ÷ 100 = 100 API requests
  Each request takes ~500ms network time
  Total API time: 100 × 0.5s = 50s = <1 minute

Processing-level batching:
  Each API batch (100 indicators) = 4 processing batches (100 ÷ 25)
  Processing time: ~2s per indicator (cloud LLM)
  Total processing: 100 indicators × 2s = 200s per API batch

Combined total: ~2.8 hours
  (100 batches × 200s per batch ÷ 3600s/h)
```

**5x faster!**

---

## Common Misconceptions

### ❌ "The double batching is redundant"

**No!** They serve different purposes:

- API batching = work around request size limit (network constraint)
- Processing batching = manage memory and parallelization (system constraint)

### ❌ "We should remove one level"

**No!** Both are needed:

- Without API batching: Can't send more than 25 indicators
- Without processing batching: Risk OOM with large API batches

### ❌ "Both batch sizes should always be the same"

**No!** They can be different:

- API batch size = limited by API schema
- Processing batch size = limited by system RAM

---

## Migration Path

### Step 1: Increase API Limit (Current → Optimized)

```typescript
// start-classify.step.ts:45
bodySchema: z.object({
  indicators: z.array(indicatorInputSchema).min(1).max(100), // 25 → 100
}),
```

### Step 2: Update Feeder Script

```typescript
// run-classification.ts:152
const API_BATCH_SIZE = 100; // 25 → 100 (must match API)
```

### Step 3: Test with Small Batch

```bash
deno task run:dev -100
# Should now send 1 API call (100 indicators)
# Pipeline processes as 4 batches of 25
```

### Step 4: Monitor Memory

```bash
# Watch memory usage during processing
top -pid $(pgrep -f "deno.*motia")
```

### Step 5: Adjust Processing Batch Size (Optional)

```typescript
// start-classify.step.ts:88
const batchSize = 50; // 25 → 50 (if memory allows)
```

---

## Real-World Example

**Scenario:** Process 1,000 indicators with cloud LLMs

### Current (25/25):

```
API requests: 1,000 ÷ 25 = 40 calls
Processing batches: 40 × 1 = 40 batches
Time: 40 × 50s = 33 minutes
```

### Optimized (100/25):

```
API requests: 1,000 ÷ 100 = 10 calls
Processing batches: 10 × 4 = 40 batches
Time: 10 × 200s = 33 minutes

(Same processing time, but 75% fewer API calls!)
```

### Optimized (100/50):

```
API requests: 1,000 ÷ 100 = 10 calls
Processing batches: 10 × 2 = 20 batches
Time: 10 × 200s = 33 minutes

(Same time, but higher memory usage)
```

---

## Troubleshooting

### "Request Entity Too Large"

**Cause:** Trying to send more than 25 indicators per API call

**Solution:**

```typescript
// Check API_BATCH_SIZE matches API limit
const API_BATCH_SIZE = 25; // Must match schema max
```

### Out of Memory (OOM)

**Cause:** Processing batch size too large for available RAM

**Solution:**

```typescript
// Reduce processing batch size
const batchSize = 10; // Decreased from 25
```

### Too Many Trace IDs

**Cause:** API batch size is small (25), creating many API calls

**Solution:** Increase API limit (requires testing):

```typescript
// start-classify.step.ts:45
indicators: z.array(...).max(100), // Increased
```

---

## Summary

**Two levels of batching are both necessary:**

1. **API batching** (Feeder) - Splits large jobs into API-compliant requests
2. **Processing batching** (Pipeline) - Controls memory and parallelization

**Current state:** Both are 25, which looks redundant but isn't
**Future state:** API=100, Processing=25-50 (more clearly separated)
**Recommendation:** Increase API limit to 100 for cloud LLM deployments

---

_Last updated: 2025-01-XX_
_API limit: 25 indicators per request_
_Processing batch: 25 indicators in parallel_
