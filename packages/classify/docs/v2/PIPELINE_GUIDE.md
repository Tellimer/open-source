# V2 Pipeline Complete Guide

Comprehensive guide to the V2 classification pipeline architecture, data flow, and review stages.

## Table of Contents

- [Pipeline Overview](#pipeline-overview)
- [Stage-by-Stage Breakdown](#stage-by-stage-breakdown)
- [Review & Quality Control](#review--quality-control)
- [Data Context & Flow](#data-context--flow)
- [Running the Pipeline](#running-the-pipeline)
- [Troubleshooting](#troubleshooting)

---

## Pipeline Overview

The V2 pipeline is a **7-stage classification system** with built-in quality control:

```
┌──────────────────────────────────────────────────────────────┐
│                    INPUT: 668 Indicators                      │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  Stage 1: ROUTER (Family Classification)                     │
│  ─────────────────────────────────────────────────────────   │
│  Model: GPT-5 or Claude Sonnet 4                             │
│  Batch: 5 indicators                                          │
│  Output: 7 families (price-value, change-movement, etc.)     │
│  Storage: router_results                                      │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  Stage 2: SPECIALIST (Type Classification)                   │
│  ─────────────────────────────────────────────────────────   │
│  Model: GPT-5 or Claude Sonnet 4                             │
│  Batch: 5 per family                                          │
│  Output: indicator_type, temporal_aggregation, etc.          │
│  Storage: specialist_results                                  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  Stage 3: VALIDATION (Time Series Analysis)                  │
│  ─────────────────────────────────────────────────────────   │
│  Type: Rule-based (no LLM)                                    │
│  Analyzes: Cumulative patterns, seasonal resets              │
│  Output: Temporal aggregation suggestions                    │
│  Storage: validation_results                                  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  Stage 4: ORIENTATION (Welfare Direction)                    │
│  ─────────────────────────────────────────────────────────   │
│  Model: GPT-5 or Claude Sonnet 4                             │
│  Batch: 5 indicators                                          │
│  Output: higher-is-positive, lower-is-positive, neutral      │
│  Storage: orientation_results                                 │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  Stage 5: FLAGGING (Quality Check)                           │
│  ─────────────────────────────────────────────────────────   │
│  Type: Rule-based (no LLM)                                    │
│  Checks: Low confidence, rule violations, mismatches         │
│  Output: ~200-300 flagged indicators                         │
│  Storage: flagging_results                                    │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  Stage 6: REVIEW (First-Pass Triage)                         │
│  ─────────────────────────────────────────────────────────   │
│  Model: GPT-5                                                 │
│  Batch: 5 flagged indicators                                 │
│  Actions: confirm, suggest-fix, escalate                     │
│  Output: ~200 suggested fixes                                │
│  Storage: review_decisions                                    │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  Stage 7: DEEP REVIEW (Second Opinion)                       │
│  ─────────────────────────────────────────────────────────   │
│  Model: Claude Sonnet 4 (independent review)                 │
│  Batch: 5 suggested fixes                                     │
│  Actions: accept-fix, reject-fix, escalate                   │
│  Output: Applied fixes + escalations                         │
│  Storage: deep_review_decisions                               │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│             OUTPUT: Final Classifications (668)               │
│  → classifications table (consolidated)                       │
│  → Exports to CSV, JSON, PostgreSQL                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Stage-by-Stage Breakdown

### Stage 1: Router (Family Classification)

**Purpose**: Classify indicators into 7 broad families

**Families**:
- `price-value` - Prices, indices, costs
- `change-movement` - Growth rates, changes
- `composite-derived` - Ratios, percentages
- `physical-fundamental` - Physical quantities
- `numeric-measurement` - Counts, levels
- `qualitative` - Surveys, sentiment
- `temporal` - Time-based series

**Input**: Indicator metadata (name, units, description)

**Output**:
```typescript
{
  indicator_id: "USCPI",
  family: "price-value",
  confidence_family: 0.95,
  reasoning: "CPI is a price index measuring consumer prices"
}
```

**Database**: `router_results` table

---

### Stage 2: Specialist (Type Classification)

**Purpose**: Detailed classification using family-specific prompts

**Output Fields**:
- `indicator_type`: balance | count | index | ratio
- `temporal_aggregation`: period-rate | period-total | period-average | point-in-time
- `is_currency_denominated`: boolean
- `confidence_cls`: 0-1

**Example**:
```typescript
{
  indicator_id: "USCPI",
  family: "price-value",
  indicator_type: "index",
  temporal_aggregation: "period-average",
  is_currency_denominated: false,
  confidence_cls: 0.98
}
```

**Database**: `specialist_results` table

---

### Stage 3: Validation (Time Series Analysis)

**Purpose**: Analyze time series data to detect patterns

**Checks**:
- Cumulative behavior (resets at year boundaries?)
- Seasonal patterns
- Monotonic increases within year
- Dec-Jan ratio analysis

**Output**:
```typescript
{
  indicator_id: "USGOVTDEBT",
  is_cumulative: true,
  cumulative_confidence: 0.95,
  suggested_temporal: "period-total", // might conflict with Stage 2
  validation_reasoning: "Debt level resets annually"
}
```

**Database**: `validation_results` table

**Note**: This stage can **flag conflicts** with Stage 2 classifications.

---

### Stage 4: Orientation (Welfare Direction)

**Purpose**: Determine heat map orientation (welfare interpretation)

**Orientations**:
- `higher-is-positive` - Higher = better (GDP growth, employment)
- `lower-is-positive` - Lower = better (unemployment, inflation)
- `neutral` - Context-dependent (exchange rates, balances)

**Input**: Indicator name, units, description, classification results

**Output**:
```typescript
{
  indicator_id: "USUNRATE",
  heat_map_orientation: "lower-is-positive",
  confidence_orient: 0.99,
  reasoning: "Lower unemployment rate indicates better labor market"
}
```

**Database**: `orientation_results` table

---

### Stage 5: Flagging (Quality Control)

**Purpose**: Identify potential classification issues

**Rules** (6 total):
1. **Low Confidence - Family**: `confidence_family < 0.75`
2. **Low Confidence - Classification**: `confidence_cls < 0.75`
3. **Low Confidence - Orientation**: `confidence_orient < 0.85`
4. **Temporal Mismatch**: Validation suggests different temporal aggregation
5. **Type Mismatch**: Validation suggests cumulative but type != index/count
6. **Orientation Mismatch**: Domain rules suggest different orientation

**Output**:
```typescript
{
  indicator_id: "UKGDP",
  flag_type: "low-confidence-orientation",
  flag_reason: "Orientation confidence 0.72 below threshold 0.85",
  confidence: 0.72
}
```

**Database**: `flagging_results` table

**Typical Results**: 200-300 indicators flagged (30-45% of total)

---

## Review & Quality Control

The review stages provide **two-model verification** for flagged indicators.

### Stage 6: Review (First-Pass Triage)

**Model**: GPT-5

**Purpose**: Initial review of flagged indicators

**Actions**:
- ✅ **confirm** - Original classification is correct despite flag
- 🔧 **suggest-fix** - Propose specific changes to classification
- ⚠️ **escalate** - Too ambiguous, needs human review

**Input Context**:
```typescript
{
  indicator: {
    id: "UKGDP",
    name: "UK GDP",
    units: "GBP Millions",
    description: "Quarterly GDP at current prices"
  },
  current_classification: {
    family: "composite-derived",        // From Stage 1
    indicator_type: "ratio",            // From Stage 2
    temporal_aggregation: "period-rate", // From Stage 2
    is_currency_denominated: false,     // From Stage 2
    heat_map_orientation: "higher-is-positive" // From Stage 4
  },
  flags: [
    {
      type: "low-confidence-orientation",
      reason: "Confidence 0.72 below 0.85",
      confidence: 0.72
    }
  ]
}
```

**Output**:
```typescript
{
  indicator_id: "UKGDP",
  action: "suggest-fix",
  reason: "GDP should be currency-denominated and period-total, not ratio",
  confidence: 0.92,
  diff_json: {
    indicator_type: "count",
    temporal_aggregation: "period-total",
    is_currency_denominated: true
  }
}
```

**Database**: `review_decisions` table

**Typical Results**: ~220 suggested fixes, ~30 escalations, ~50 confirmations

---

### Stage 7: Deep Review (Second Opinion)

**Model**: Claude Sonnet 4 (independent from Stage 6)

**Purpose**: Verify suggested fixes with a **different model** to reduce bias

**Actions**:
- ✅ **accept-fix** - Suggested fix is correct, apply it
- ❌ **reject-fix** - Suggested fix is wrong, keep original
- ⚠️ **escalate** - Still ambiguous, needs human review

**Full Context Provided**:

```typescript
{
  indicator_id: "UKGDP",
  indicator_name: "UK GDP",
  indicator_context: {
    units: "GBP Millions",
    description: "Quarterly GDP at current prices",
    source_name: "ONS",
    long_name: "United Kingdom Gross Domestic Product",
    sample_values: [
      { date: "2024-Q1", value: 540000 },
      { date: "2024-Q2", value: 548000 },
      { date: "2024-Q3", value: 552000 },
      { date: "2024-Q4", value: 560000 }
    ]
  },
  original_classification: {
    family: "composite-derived",
    indicator_type: "ratio",
    temporal_aggregation: "period-rate",
    is_currency_denominated: false,
    heat_map_orientation: "higher-is-positive"
  },
  suggested_diff: {
    indicator_type: "count",
    temporal_aggregation: "period-total",
    is_currency_denominated: true
  },
  review_reason: "GDP should be currency-denominated and period-total",
  review_confidence: 0.92
}
```

**Claude Independently Analyzes**:
1. ✅ Original classification quality
2. 🔧 Suggested fix quality
3. 📊 Time series data patterns
4. 📖 Indicator description/units
5. 🎯 Taxonomy rules

**Output**:
```typescript
{
  indicator_id: "UKGDP",
  action: "accept-fix",
  reason: "Suggested fix is correct. GDP is a currency-denominated flow measured over the quarter (period-total), not a ratio or rate.",
  confidence: 0.95,
  final_diff: {
    indicator_type: "count",
    temporal_aggregation: "period-total",
    is_currency_denominated: true
  }
}
```

**Database**: `deep_review_decisions` table

**Automatic Application**: Accepted fixes are **immediately applied** to the `classifications` table

**Typical Results**: ~150 accepted, ~40 rejected, ~30 escalated

---

## Data Context & Flow

### What Context is Available at Each Stage?

| Stage | Available Data |
|-------|---------------|
| **Router** | name, units, description, metadata |
| **Specialist** | name, units, description, metadata, **family** |
| **Validation** | **time series data** (historical values) |
| **Orientation** | name, units, description, **family, type, temporal** |
| **Flagging** | **all classifications + validation results** |
| **Review** | **indicator context + all classifications + flags** |
| **Deep Review** | **EVERYTHING** (context + original + suggested fix + time series samples) |

### Database Schema

```sql
-- Main classifications table (consolidated output)
CREATE TABLE classifications (
  indicator_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  units TEXT,
  description TEXT,

  -- Router
  family TEXT,
  confidence_family REAL,
  reasoning_router TEXT,

  -- Specialist
  indicator_type TEXT,
  temporal_aggregation TEXT,
  is_currency_denominated INTEGER,
  confidence_cls REAL,
  reasoning_specialist TEXT,

  -- Validation
  validated INTEGER DEFAULT 0,
  validation_confidence REAL,

  -- Orientation
  heat_map_orientation TEXT,
  confidence_orient REAL,
  reasoning_orientation TEXT,

  -- Review status
  review_status TEXT, -- pending|confirmed|corrected|escalated
  review_reason TEXT,

  -- Metadata
  provider TEXT,
  model TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- Stage-specific result tables
router_results (indicator_id, family, confidence_family, reasoning)
specialist_results (indicator_id, indicator_type, temporal_aggregation, ...)
validation_results (indicator_id, is_cumulative, suggested_temporal, ...)
orientation_results (indicator_id, heat_map_orientation, confidence_orient, ...)
flagging_results (indicator_id, flag_type, flag_reason, confidence)
review_decisions (indicator_id, action, diff_json, reason, confidence)
deep_review_decisions (indicator_id, action, final_diff, reason, confidence)
```

---

## Running the Pipeline

### Full Pipeline (All 7 Stages)

```bash
cd packages/classify
export OPENAI_API_KEY=your_key
export ANTHROPIC_API_KEY=your_key
deno task prod:run
```

### Resume from Orientation (Stages 4-7)

If the pipeline failed after specialist stage:

```bash
deno task prod:resume-orientation
```

This will:
- Run orientation on indicators missing orientation results
- Run flagging, review, and deep review
- Apply accepted fixes

### Run Individual Stages

```bash
# Review only (requires flagging results)
deno task prod:review

# Deep review only (requires review suggested fixes)
deno task prod:deep-review
```

---

## Troubleshooting

### Issue: FOREIGN KEY constraint failed

**Cause**: SQLite foreign keys were disabled by default

**Fix**: Applied in `src/v2/db/client.ts:43`
```typescript
// Enable foreign keys (disabled by default in SQLite)
this.db!.exec("PRAGMA foreign_keys = ON;");
```

**Prevention**: Always run with the latest code

---

### Issue: Model not found (claude-sonnet-4.5)

**Cause**: Incorrect model name

**Fix**: Use correct model ID `claude-sonnet-4-20250514`

**Where**:
- `scripts/production/resume_from_orientation.ts`
- `scripts/production/run_deep_review.ts`

---

### Issue: Malformed LLM Response

**Example**: `"+indicator_id"` instead of `"indicator_id"`

**Handling**: Automatic retry (3 attempts with exponential backoff)

**Logs**: Check for `[Orientation] Attempt X/4 failed:` messages

**Resolution**: Usually succeeds on retry 2-3

---

### Issue: Pipeline stuck at orientation

**Diagnosis**:
```bash
cd packages/classify
sqlite3 ./data/classify_production_v2.db "
SELECT
  'Indicators' as stage, COUNT(*) FROM classifications
UNION ALL
SELECT 'Oriented', COUNT(*) FROM orientation_results;
"
```

**Fix**: Use resume script
```bash
deno task prod:resume-orientation
```

---

## Configuration

### Batch Sizes

```typescript
{
  batch: {
    routerBatchSize: 5,       // Router: 5 indicators per batch
    specialistBatchSize: 5,   // Specialist: 5 per family
    orientationBatchSize: 5,  // Orientation: 5 indicators
    reviewBatchSize: 5,       // Review: 5 flagged indicators
  }
}
```

### Thresholds

```typescript
{
  thresholds: {
    confidenceFamilyMin: 0.75,   // Flag if family confidence < 75%
    confidenceClsMin: 0.75,      // Flag if type confidence < 75%
    confidenceOrientMin: 0.85,   // Flag if orientation confidence < 85%
  }
}
```

### Concurrency

```typescript
{
  concurrency: {
    router: 1,      // Process 1 batch at a time
    specialist: 1,  // Process 1 family at a time
    orientation: 1, // Process 1 batch at a time
    review: 1,      // Process 1 batch at a time
  }
}
```

---

## Cost & Performance

### Typical Run (668 indicators)

| Stage | API Calls | Time | Model |
|-------|-----------|------|-------|
| Router | 134 | ~10 min | GPT-5 |
| Specialist | 140 | ~12 min | GPT-5 |
| Validation | 0 | ~2 min | Rule-based |
| Orientation | 134 | ~40 min | GPT-5 |
| Flagging | 0 | ~1 min | Rule-based |
| Review | 44 | ~15 min | GPT-5 |
| Deep Review | 44 | ~20 min | Claude Sonnet 4 |
| **TOTAL** | **~496** | **~100 min** | Mixed |

**Cost Estimate**: ~$50-80 per full run (depends on token usage)

---

## Best Practices

### 1. Enable Foreign Keys
Always ensure `PRAGMA foreign_keys = ON;` in database initialization

### 2. Use Resume Scripts
If pipeline fails, resume from the last successful stage instead of re-running

### 3. Monitor Flagging Rate
Typical: 30-45% flagged. If >60%, review thresholds

### 4. Review Escalations
Human review needed for ~5-10% of indicators (escalated by both review stages)

### 5. Validate Time Series
Ensure `sample_values` are populated for better validation and deep review

### 6. Use Different Models
Stage 6 (Review) and Stage 7 (Deep Review) should use different models to reduce bias

---

## Further Reading

- [V2 Architecture](./ARCHITECTURE.md) - High-level design
- [Database Schema](./DATABASE.md) - Table structures
- [Review Features](./REVIEW_FEATURES.md) - Detailed review stage docs
- [AI SDK Integration](./AI_SDK.md) - Provider configuration

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/Tellimer/open-source/issues
- Documentation: `packages/classify/docs/`
