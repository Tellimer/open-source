# V2 Pipeline Architecture

V2 uses a 6-stage pipeline for higher accuracy and quality control.

## Pipeline Overview

```
Input: Indicators[]
  ↓
┌─────────────────────────────────────┐
│  Stage 1: Router                    │
│  ─────────────────────────────────  │
│  • Classify into 7 families         │
│  • Batch: 40 indicators             │
│  • Concurrency: 4 parallel batches  │
│  • Store: router_results            │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  Stage 2: Specialist                │
│  ─────────────────────────────────  │
│  • Group by family                  │
│  • Family-specific prompts          │
│  • Batch: 25 per family             │
│  • Concurrency: 3 parallel families │
│  • Store: specialist_results        │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  Stage 3: Orientation               │
│  ─────────────────────────────────  │
│  • Welfare-focused orientation      │
│  • 10 guardrail examples            │
│  • Batch: 50 indicators             │
│  • Concurrency: 4 parallel batches  │
│  • Store: orientation_results       │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  Stage 4: Flagging                  │
│  ─────────────────────────────────  │
│  • Apply 6 quality rules            │
│  • Detect low confidence            │
│  • Check rule violations            │
│  • Store: flagging_results          │
│  • No LLM calls (rule-based)        │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  Stage 5: Review                    │
│  ─────────────────────────────────  │
│  • LLM reviews flagged indicators   │
│  • Actions: confirm/fix/escalate    │
│  • Batch: 20 per batch              │
│  • Concurrency: 2 parallel batches  │
│  • Store: review_decisions          │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  Stage 6: Output                    │
│  ─────────────────────────────────  │
│  • Assemble final classifications   │
│  • Apply review fixes               │
│  • Collect metrics                  │
│  • Return: V2PipelineResult         │
└─────────────────────────────────────┘
  ↓
Output: V2PipelineResult
```

## Stage 1: Router

**Purpose:** Classify indicators into 7 families for specialized processing.

### Families

1. **physical-fundamental** - Stock, flow, balance, capacity, volume
2. **numeric-measurement** - Count, percentage, ratio, spread, share
3. **price-value** - Price, yield
4. **change-movement** - Rate, volatility, gap
5. **composite-derived** - Index, correlation, elasticity, multiplier
6. **temporal** - Duration, probability, threshold
7. **qualitative** - Sentiment, allocation

### Prompt Strategy

- Concise family descriptions
- Decision rules for edge cases:
  - CPI → composite-derived (index)
  - Debt-to-GDP → numeric-measurement (ratio)
  - Growth rates → change-movement (rate)
- Few-shot examples for ambiguous cases

### Output

```typescript
interface RouterResult {
  indicator_id: string;
  family: IndicatorFamily;
  confidence: number; // 0-1
  reasoning?: string;
}
```

### Configuration

- **Batch size:** 40 indicators per LLM call
- **Concurrency:** 4 parallel batches
- **Retry:** 3 attempts with exponential backoff
- **Storage:** `router_results` table

## Stage 2: Specialist

**Purpose:** Use family-specific prompts for accurate type classification.

### Context Enrichment

The Specialist stage receives **full router context** including:
- Router family assignment
- Router confidence score
- **Router reasoning** - Why the family was chosen

This allows the Specialist LLM to:
- Build on prior analysis rather than starting fresh
- Make decisions aware of router's reasoning
- Provide better classification within family context

```typescript
// Indicators are enriched with router context
const enrichedIndicator = {
  ...indicator,
  router_family: 'physical-fundamental',
  router_confidence: 0.95,
  router_reasoning: 'GDP is measured over a period with real substance (economic output)'
};
```

### Family-Specific Prompts

Each family has a tailored prompt:

#### Physical-Fundamental Prompt
```
Types: stock, flow, balance, capacity, volume
- stock: Absolute levels at a point (debt, reserves, population)
- flow: Throughput over period (GDP, income, exports)
- balance: Can be negative (trade balance, budget deficit)
- capacity: Maximum potential (potential GDP, labor force)
- volume: Transaction quantities (trade volume, contract volume)
```

#### Numeric-Measurement Prompt
```
Types: count, percentage, ratio, spread, share
- count: Discrete units (jobs, housing starts, claims)
- percentage: 0-100% bounded (unemployment rate, tax rate)
- ratio: Relative multiples (debt-to-GDP, P/E ratio)
- spread: Absolute differences (yield spread, rate differential)
- share: Compositional (labor share, market share)
```

*... 5 more family-specific prompts*

### Grouping Logic

```typescript
// Group indicators by router-assigned family
const grouped = new Map<IndicatorFamily, Indicator[]>();

for (const indicator of indicators) {
  const routerResult = getRouterResult(indicator.id);
  const family = routerResult.family;

  if (!grouped.has(family)) {
    grouped.set(family, []);
  }
  grouped.get(family)!.push(indicator);
}

// Process each family with its specialized prompt
for (const [family, familyIndicators] of grouped) {
  const prompt = FAMILY_PROMPTS[family];
  await classifyWithPrompt(familyIndicators, prompt);
}
```

### Output

```typescript
interface SpecialistResult {
  indicator_id: string;
  indicator_type: string; // One of 26 types
  temporal_aggregation: TemporalAggregation;
  is_monetary: boolean;
  confidence: number;
  reasoning?: string;
}
```

### Configuration

- **Batch size:** 25 indicators per family
- **Concurrency:** 3 parallel families
- **Retry:** 3 attempts per batch
- **Storage:** `specialist_results` table

## Stage 3: Orientation

**Purpose:** Determine heat map orientation (higher/lower/neutral is positive).

### Context Enrichment

The Orientation stage receives **full context from both prior stages**:

**Router Context:**
- Family assignment
- Router confidence
- Router reasoning

**Specialist Context:**
- Indicator type
- Temporal aggregation
- Monetary flag
- Specialist reasoning

This rich context enables the Orientation LLM to make better-informed decisions about heat map direction by understanding:
- The indicator's family and classification journey
- The reasoning behind family and type assignments
- Both stages' confidence levels and thought processes

```typescript
// Fully enriched indicator with all prior context
const enrichedIndicator = {
  ...indicator,
  // Router context
  router_family: 'change-movement',
  router_confidence: 0.93,
  router_reasoning: 'CPI YoY measures price change rate',
  // Specialist context
  indicator_type: 'rate',
  temporal_aggregation: 'period-rate',
  is_monetary: false,
  specialist_reasoning: 'Inflation rate measures price growth over period'
};
```

### Welfare-Focused Approach

Orientation is based on welfare impact:

- **higher-is-positive:** Growth, employment, income, productivity
- **lower-is-positive:** Unemployment, inflation, poverty, debt
- **neutral:** Exchange rates, population, some interest rates

### Guardrail Examples

```
1. Inflation Rate → lower-is-positive
   (Lower inflation improves purchasing power)

2. GDP Growth → higher-is-positive
   (Higher growth improves living standards)

3. Unemployment Rate → lower-is-positive
   (Lower unemployment improves welfare)

4. Interest Rates → neutral
   (Context-dependent: stimulative vs restrictive)

5. Exchange Rate → neutral
   (Depends on trade position and context)

... 5 more examples
```

### Output

```typescript
interface OrientationResult {
  indicator_id: string;
  heat_map_orientation: 'higher-is-positive' | 'lower-is-positive' | 'neutral';
  confidence: number;
  reasoning?: string;
}
```

### Configuration

- **Batch size:** 50 indicators
- **Concurrency:** 4 parallel batches
- **Retry:** 3 attempts per batch
- **Storage:** `orientation_results` table

## Stage 4: Flagging

**Purpose:** Apply rule-based quality checks to detect issues.

### 6 Flagging Rules

1. **low_confidence_family**
   - Trigger: Router confidence < threshold (default: 0.75)
   - Reason: "Router assigned family '{family}' with low confidence {confidence}"

2. **low_confidence_cls**
   - Trigger: Specialist confidence < threshold (default: 0.75)
   - Reason: "Specialist classified as '{type}' with low confidence {confidence}"

3. **low_confidence_orient**
   - Trigger: Orientation confidence < threshold (default: 0.75)
   - Reason: "Orientation '{orientation}' has low confidence {confidence}"

4. **temporal_mismatch**
   - Trigger: Temporal aggregation violates type rules
   - Example: Stock type must be "point-in-time", not "period-rate"
   - Reason: "Type '{type}' should have temporal '{expected}', got '{actual}'"

5. **type_mismatch**
   - Trigger: Type doesn't belong to assigned family
   - Example: "percentage" type in "physical-fundamental" family
   - Reason: "Type '{type}' doesn't belong to family '{family}'"

6. **orientation_mismatch**
   - Trigger: Orientation violates semantic rules
   - Example: Inflation with "higher-is-positive"
   - Reason: "Indicator '{name}' should be '{expected}', got '{actual}'"

### Flagging Process

```typescript
interface Flag {
  type: FlagType;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  current_value?: string;
  expected_value?: string;
}

function applyFlaggingRules(classification: Classification): Flag[] {
  const flags: Flag[] = [];

  // Rule 1: Low confidence family
  if (classification.confidence_family < 0.75) {
    flags.push({
      type: 'low_confidence_family',
      reason: `Router confidence ${classification.confidence_family} below threshold`,
      severity: 'medium',
    });
  }

  // ... 5 more rules

  return flags;
}
```

### Output

```typescript
interface FlaggingResult {
  indicator_id: string;
  flags: Flag[];
  created_at: string;
}
```

### Configuration

- **No LLM calls** - Pure rule-based logic
- **Processing time:** <1s for 100 indicators
- **Storage:** `flagging_results` table

## Stage 5: Review

**Purpose:** LLM reviews flagged indicators for corrections.

### Review Actions

1. **confirm** - Classification is correct despite flag
   ```typescript
   {
     action: 'confirm',
     reasoning: 'Low confidence due to ambiguous indicator name, but classification is correct'
   }
   ```

2. **fix** - Apply minimal corrections via diff
   ```typescript
   {
     action: 'fix',
     diff: 'indicator_type: percentage → ratio',
     reasoning: 'This is a ratio (debt-to-GDP), not a percentage'
   }
   ```

3. **escalate** - Requires human review
   ```typescript
   {
     action: 'escalate',
     reasoning: 'Indicator is ambiguous and requires domain expert review'
   }
   ```

### Review Prompt

```
You are reviewing flagged economic indicator classifications.

For each flagged indicator:
1. Review the classification and flags
2. Decide: confirm, fix, or escalate

**confirm** - Classification is correct, flags are false positives
**fix** - Minor corrections needed (provide minimal diff)
**escalate** - Complex issue requiring human review

Diff format: "field: old_value → new_value"
```

### Output

```typescript
interface ReviewDecision {
  indicator_id: string;
  action: 'confirm' | 'fix' | 'escalate';
  diff?: string; // Only if action=fix
  reasoning: string;
}
```

### Configuration

- **Batch size:** 20 flagged indicators
- **Concurrency:** 2 parallel batches
- **Only reviews flagged items** - Skips clean indicators
- **Storage:** `review_decisions` table

## Stage 6: Output

**Purpose:** Assemble final classifications with metrics.

### Assembly Process

```typescript
async function assembleOutput(db: Database): Promise<V2PipelineResult> {
  // 1. Fetch all classifications
  const classifications = await readClassifications(db);

  // 2. Apply review fixes
  for (const classification of classifications) {
    const review = await getReviewDecision(db, classification.id);
    if (review?.action === 'fix' && review.diff) {
      applyDiff(classification, review.diff);
    }
  }

  // 3. Collect metrics
  const summary = {
    total: classifications.length,
    successful: classifications.filter(c => c.indicator_type).length,
    failed: classifications.filter(c => !c.indicator_type).length,
    flagged: classifications.filter(c => c.flags?.length > 0).length,
    reviewed: classifications.filter(c => c.review_decision).length,
    escalated: classifications.filter(c => c.review_decision?.action === 'escalate').length,
    successRate: (successful / total) * 100,
  };

  // 4. Collect stage metrics
  const stages = {
    router: await getStageMetrics(db, 'router'),
    specialist: await getStageMetrics(db, 'specialist'),
    orientation: await getStageMetrics(db, 'orientation'),
    review: await getStageMetrics(db, 'review'),
  };

  return {
    classifications,
    summary,
    stages,
    executionId,
    processingTime: totalTime,
  };
}
```

### Output Format

```typescript
interface V2PipelineResult {
  classifications: V2Classification[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    flagged: number;
    reviewed: number;
    escalated: number;
    successRate: number;
  };
  stages: {
    router: StageMetrics;
    specialist: StageMetrics;
    orientation: StageMetrics;
    review: StageMetrics;
  };
  executionId: string;
  processingTime: number;
}

interface StageMetrics {
  processingTime: number;
  apiCalls: number;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  indicatorsProcessed: number;
  familyDistribution?: Record<IndicatorFamily, number>; // Specialist only
}
```

## Performance Characteristics

### Typical Timing (100 indicators)

| Stage | Processing Time | API Calls | Notes |
|-------|----------------|-----------|-------|
| Router | 8-10s | 3 batches | 40 per batch, 4 concurrent |
| Specialist | 12-15s | 7-10 batches | 25 per family, 3 concurrent families |
| Orientation | 6-8s | 2 batches | 50 per batch, 4 concurrent |
| Flagging | <1s | 0 | Rule-based, no LLM |
| Review | 4-6s | 1-2 batches | 20 per batch, only flagged (~12%) |
| Output | <1s | 0 | Database assembly |
| **Total** | **30-40s** | **13-17** | End-to-end |

### Scalability

- **1,000 indicators:** ~5-6 minutes
- **10,000 indicators:** ~50-60 minutes
- **Parallelization:** Adjust concurrency for faster processing
- **Resume:** Interrupted pipelines resume from last completed stage

## Error Handling

### Stage Failures

Each stage records success/failure:

```typescript
try {
  const routerResults = await routeIndicators(indicators, llmConfig);
  await writeRouterResults(db, routerResults);
} catch (error) {
  await updateExecutionStatus(db, executionId, 'failed', error.message);
  throw error; // State is saved, can resume later
}
```

### Resume on Failure

```typescript
// Check which stages are complete
const hasRouterResults = await checkRouterComplete(db, indicators);
const hasSpecialistResults = await checkSpecialistComplete(db, indicators);

// Skip completed stages
if (!hasRouterResults) {
  await runRouterStage(indicators);
}

if (!hasSpecialistResults) {
  await runSpecialistStage(indicators);
}

// Continue from where it failed...
```

## Database Persistence

### Database-First Architecture

The V2 pipeline uses **SQLite for state persistence** at every stage. Each stage:
1. **Reads** the latest state from database tables
2. **Processes** indicators with LLM or rules
3. **Writes** results back to database tables

This enables:
- **Resume capability** - Restart from any failed stage
- **Debugging** - Inspect intermediate results
- **Incremental updates** - Re-run specific stages only
- **Audit trail** - Complete history of classification process

### Data Flow Pattern

```
Stage 1 (Router)      → writes to → router_results
                      → writes to → classifications (family fields)

Stage 2 (Specialist)  → reads from → router_results (for grouping)
                      → writes to → specialist_results

Stage 3 (Orientation) → writes to → orientation_results

Stage 4 (Flagging)    → reads from → router_results, specialist_results, orientation_results
                      → writes to → classifications (ALL fields combined)
                      → writes to → flagging_results

Stage 5 (Review)      → reads from → flagging_results
                      → updates → classifications (review fields)
                      → writes to → review_decisions

Stage 6 (Output)      → reads from → classifications (final state)
```

### Tables

**Stage Tables** - Store raw output from each stage:
```sql
-- Stage 1: Router
CREATE TABLE router_results (
  indicator_id TEXT PRIMARY KEY,
  family TEXT NOT NULL,
  confidence_family REAL,
  reasoning TEXT,
  created_at TEXT
);

-- Stage 2: Specialist
CREATE TABLE specialist_results (
  indicator_id TEXT PRIMARY KEY,
  indicator_type TEXT NOT NULL,
  temporal_aggregation TEXT,
  is_monetary INTEGER,
  confidence_cls REAL,
  created_at TEXT
);

-- Stage 3: Orientation
CREATE TABLE orientation_results (
  indicator_id TEXT PRIMARY KEY,
  heat_map_orientation TEXT NOT NULL,
  confidence_orient REAL,
  created_at TEXT
);

-- Stage 4: Flagging
CREATE TABLE flagging_results (
  indicator_id TEXT,
  flag_type TEXT,
  flag_reason TEXT,
  flagged_at TEXT
);

-- Stage 5: Review
CREATE TABLE review_decisions (
  indicator_id TEXT PRIMARY KEY,
  action TEXT,
  diff_json TEXT,
  reason TEXT,
  reviewed_at TEXT
);
```

**Master Table** - Consolidated final state:
```sql
CREATE TABLE classifications (
  indicator_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,

  -- Stage 1: Router
  family TEXT,
  confidence_family REAL,

  -- Stage 2: Specialist
  indicator_type TEXT,
  indicator_category TEXT,
  temporal_aggregation TEXT,
  is_monetary INTEGER,
  confidence_cls REAL,

  -- Stage 3: Orientation
  heat_map_orientation TEXT,
  confidence_orient REAL,

  -- Stage 5: Review
  review_status TEXT,
  review_reason TEXT,

  -- Metadata
  provider TEXT,
  model TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

**Why Both?**
- **Stage tables** = Historical record of each stage's raw output (for debugging)
- **Classifications table** = Current consolidated state (for queries)

This allows you to:
- Query final state: `SELECT * FROM classifications WHERE family = 'composite-derived'`
- Debug stage issues: `SELECT * FROM specialist_results WHERE confidence_cls < 0.5`
- Track changes: Compare classifications table before/after review stage

## Design Principles

1. **Database-First Architecture** - Each stage persists results; next stage reads from database
2. **Separation of Concerns** - Each stage has a single responsibility
3. **Family-Based Routing** - Specialized prompts for each family
4. **Quality First** - Automatic flagging and review for problematic cases
5. **Persistent State** - Resume capability via SQLite storage, complete audit trail
6. **Observable** - Comprehensive metrics per stage, queryable intermediate results
7. **Type-Safe** - AI SDK + Valibot for runtime validation
8. **Scalable** - Configurable batching and concurrency

## Next Steps

- [V2 Overview](./README.md) - Main V2 documentation
- [Database Guide](./DATABASE.md) - SQLite setup
- [AI SDK Guide](./AI_SDK.md) - Type-safe structured output
- [Migration Guide](../MIGRATION.md) - Upgrade from V1
