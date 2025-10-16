# Cumulative Pattern Detection System

## Overview

The cumulative pattern detection system analyzes time series data to identify YTD (Year-to-Date) and running total patterns. This provides data-driven evidence for temporal aggregation classification instead of relying solely on generic rules.

## How It Works

### Detection Algorithm

The algorithm analyzes consecutive data points in a time series to identify:

1. Year Boundary Resets: When values cross from one year to another and drop significantly (>20%)
2. Within-Year Increases: When values increase as the year progresses
3. Within-Year Decreases: When values decrease (indicates non-cumulative)

### Pattern Types

- YTD (Year-to-Date): Values accumulate within a year and reset at year boundaries
- Running Total: Values continuously accumulate without reset
- Periodic: Values represent discrete period amounts (not cumulative)

### Confidence Scoring

- YTD Confidence: Based on consistency of pattern (resets + increases / total transitions)
- Running Total Confidence: Based on proportion of consecutive increases
- Periodic Confidence: Fixed baseline when no cumulative pattern detected

## Implementation

### Files

- `src/utils/cumulative-detector.ts` — Core detection algorithm, exports `detectCumulativePattern()`
- `steps/classify-flow/detect-cumulative-pattern.step.ts` — Stage 2.5 runs in parallel with time inference, emits `indicator.cumulative-detected`
- `steps/classify-flow/merge-time-cumulative.step.ts` — Stage 2.9 synchronizes time inference and cumulative detection, emits `indicator.time-cumulative-complete`
- `src/db/schema.ts` — Schema v5 adds `cumulative_detection_results` and cumulative fields on `classifications`
- `src/db/persist.ts` — Includes cumulative stage mapping and saves cumulative fields on final classification

### Database

```sql
CREATE TABLE cumulative_detection_results (
  indicator_id TEXT PRIMARY KEY,
  is_cumulative INTEGER NOT NULL,
  pattern_type TEXT NOT NULL,      -- ytd|running_total|periodic|unknown
  confidence REAL NOT NULL,
  evidence TEXT,
  reasoning TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Final `classifications` table includes:
- `is_cumulative` (0/1)
- `cumulative_pattern_type` (ytd|running_total|periodic|unknown)
- `cumulative_confidence` (0-1)
- `cumulative_reasoning` (TEXT)

## Workflow

```
normalize-indicator (Stage 1)
   ├─ infer-time-basis (Stage 2) ┐
   └─ detect-cumulative-pattern (Stage 2.5) ┐
          │                                  │
          └──────── merge-time-cumulative (Stage 2.9) → indicator.time-cumulative-complete
                                 │
                                 └─ currency-router (Stage 3)
                                        ├─ assign-family-non-currency → classify-type-non-currency
                                        └─ assign-family-currency → classify-type-currency
                                                 └─ boolean-review → final-review → complete-classify
```

## Prompt Integration

Type classification prompts receive cumulative fields (via router):

```ts
{
  is_cumulative: boolean,
  cumulative_pattern_type: 'ytd' | 'running_total' | 'periodic' | 'unknown',
  cumulative_confidence: number,
}
```

Guidance used by prompts:
- High-confidence YTD (≥ 0.8): use `temporal_aggregation: "period-cumulative"` for applicable indicator types
- Periodic: prefer `temporal_aggregation: "period-total"`

## Usage

- Standalone test: `deno run --allow-read --allow-env --allow-ffi test-cumulative-detection.ts`
- Query results in SQLite (examples in original doc retained in scripts)

## Integration Status

- Algorithm, DB tables, and workflow steps are implemented and wired.
- If you see topic schema mismatches during dev:
  - Regenerate types: `deno task generate-types`
  - Ensure the `infer-time-basis` and `detect-cumulative-pattern` step schemas agree on the `indicator.infer-time` topic payload.

## Benefits

- Data-driven classification using actual time series
- Parallel execution with time inference
- Transparent evidence and reasoning surfaced to prompts
- Persisted in both stage table and final results

---

See also: `docs/USAGE_GUIDE.md`, `docs/DATABASE_PERSISTENCE.md`.


