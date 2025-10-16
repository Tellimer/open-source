# Classify-Motia PRD: Parallelized Indicator Classification Pipeline

## Overview

A Motia application for classifying economic indicators using a parallelized per-indicator workflow. Each indicator runs through its own pipeline workflow, with up to 25 workflows executing concurrently. Features local LLM inference by default with swappable providers (OpenAI via Vercel AI SDK), token-efficient prompts, and hybrid State+SQLite persistence.

## Project Status

**Location**: `apps/motia/classify-workflow/`

**Status**: Ready for implementation

## Implementation Checklist

- [ ] **Setup & Cleanup**: Remove example petstore code (`steps/petstore/`, `src/services/pet-store/`), create directory structure (`src/services/classify/`, `src/utils/`, `src/scripts/`, `steps/classify-flow/`), add extensive Motia logging throughout ALL steps (logger.info for stage entry/exit, logger.debug for intermediate values/state, logger.warn for validation issues, logger.error for failures with full context including indicator_id)
- [ ] Create .env file with API keys and database paths
- [ ] Copy unit-classifier.ts from econify to src/utils/
- [ ] Create service layer: normalize.ts, llm-clients.ts, types.ts
- [ ] Create all 7 prompt templates in src/services/classify/prompts/
- [ ] Implement Step 1: start-classify.step.ts (API endpoint to batch trigger)
- [ ] Implement Step 2: normalize-indicator.step.ts (Event: regex parsing)
- [ ] Implement Step 3: infer-time-basis.step.ts (Event: LLM time inference with periodicity logic)
- [ ] Implement Step 4: infer-scale.step.ts (Event: LLM scale inference)
- [ ] Implement Step 5: check-currency.step.ts (Event: LLM currency check)
- [ ] Implement Step 6: assign-family.step.ts (Event: LLM family assignment)
- [ ] Implement Step 7: classify-type.step.ts (Event: LLM type classification)
- [ ] Implement Step 8: boolean-review.step.ts (Event: LLM boolean review)
- [ ] Implement Step 9: final-review.step.ts (Event: LLM final review with corrections)
- [ ] Implement Step 10: complete-classify.step.ts (Event: finalize and save to SQLite)
- [ ] Create seed-database.ts script to fetch indicators from PostgreSQL
- [ ] Create SQLite schema and database operations
- [ ] Test end-to-end workflow with 1 indicator
- [ ] Test parallel execution with 25 indicators
- [ ] Verify logging output for all stages
- [ ] Documentation and README

## Architecture

### High-Level Flow

```
PostgreSQL (source) 
  ↓
Seed Script → SQLite (local dev/prod)
  ↓
API Trigger (/classify/batch) → [25 Concurrent Event Workflows] → SQLite Results
  ↓
Motia State (intermediate) + SQLite (persistent audit trail)
```

### Workflow Stages

Each indicator goes through 10 steps:

1. **API Trigger** (`start-classify.step.ts`) - Batch endpoint, emits to normalize
2. **Normalization** (`normalize-indicator.step.ts`) - Regex parsing: scale, units, currency
3. **Time Inference** (`infer-time-basis.step.ts`) - LLM determines reporting frequency + time basis
4. **Scale Inference** (`infer-scale.step.ts`) - LLM confirms measurement scale
5. **Currency Check** (`check-currency.step.ts`) - LLM binary decision on currency denomination
6. **Family Assignment** (`assign-family.step.ts`) - LLM assigns to 1 of 7 families
7. **Type Classification** (`classify-type.step.ts`) - LLM determines specific type (26 options)
8. **Boolean Review** (`boolean-review.step.ts`) - LLM validates: is this correct?
9. **Final Review** (`final-review.step.ts`) - LLM applies corrections if needed
10. **Complete** (`complete-classify.step.ts`) - Finalize and persist to SQLite

## Key Design Decisions

### 1. Motia Event-Driven Architecture

**Pattern**: Each stage is an Event Step

- **Input**: Subscribes to a topic (e.g., `indicator.normalize`)
- **Processing**: Performs stage logic (regex or LLM)
- **State**: Saves intermediate results to Motia State
- **Output**: Emits to next topic (e.g., `indicator.infer-time`)

**Benefits**:
- Automatic concurrency (Motia handles parallelization)
- Independent failure handling per indicator
- Full observability via Motia Workbench (tracing, logging, state inspection)
- Horizontal scalability

**Example Flow**:
```typescript
// API Step triggers 25 workflows
await Promise.all(indicators.map(ind => 
  emit({ topic: 'indicator.normalize', data: ind })
))

// Each Event Step processes independently
handler: async (input, { state, emit, logger }) => {
  logger.info('Stage started', { indicator_id: input.indicator_id })
  const result = await processStage(input)
  await state.set('stage-results', input.indicator_id, result)
  logger.debug('Stage complete', { indicator_id, result })
  await emit({ topic: 'next.stage', data: { ...input, ...result } })
}
```

### 2. LLM Provider Strategy

**Default: Local LLM**
- Fast inference for simple classification tasks
- Zero cost
- Privacy/data control

**Swappable: OpenAI via Vercel AI SDK**
- Per-stage configuration via environment variables
- Type-safe structured outputs via `generateObject`
- Example: Local for time/scale/currency, OpenAI for review stages

**Interface**:
```typescript
interface LLMClient {
  generateObject<T>(params: {
    prompt: string;
    schema: z.Schema<T>;
  }): Promise<T>;
}

// Environment-based configuration
const provider = Deno.env.get('LLM_PROVIDER_TIME_INFERENCE') || 'local'
const client = createLLMClient(provider)
```

### 3. Token-Efficient Prompts

**Principle**: No verbose system prompts, direct guidance only

**Target**: ~100-150 tokens input, ~50 tokens output per stage

**Example - Time Inference**:
```
Indicator: GDP
Units: USD Millions
Periodicity: quarterly
Time series: detected quarterly from data points

Determine reporting frequency:
1. Check units for time indicators
2. If not in units, use periodicity
3. If neither, use time series analysis
4. If conflict, trust time series

Reporting frequency: [daily|monthly|quarterly|annual|point-in-time]
Time basis: [per-period|point-in-time|cumulative]
Confidence: [0-1]
Reason: [1 sentence]
```

### 4. Hybrid Storage Strategy

**Motia State** (temporary workflow data):
- Pass data between stages
- Fast read/write
- Automatic cleanup
- Queryable per workflow

**SQLite** (persistent audit trail):
- Final classifications table
- Complete classification history
- Long-term storage
- Query by name, family, type, etc.

**PostgreSQL** (source):
- 10,000+ indicators
- Time series data
- Seeded to SQLite for local development

### 5. Time Inference Logic (Critical)

The most complex stage - determines **reporting frequency** from multiple sources:

**Priority Order**:
1. **Units field** - Check for time indicators (per day, per year, annual, quarterly, monthly)
2. **Periodicity field** - Use if units doesn't contain time info
3. **Time series analysis** - Analyze sample_values dates if neither field has info
4. **Validation** - If periodicity conflicts with time series, trust time series

**Example**:
```typescript
// Case 1: Time in units
units: "USD Million per year" → annual

// Case 2: Time in periodicity only
units: "USD Million"
periodicity: "quarterly" → quarterly

// Case 3: Time series analysis only
units: "USD Million"
periodicity: null
sample_values: [{date: "2024-01-01"}, {date: "2024-04-01"}] → quarterly

// Case 4: Conflict - trust time series
units: "USD Million"
periodicity: "annual"
sample_values: [{date: "2024-01-01"}, {date: "2024-02-01"}] → monthly (trust data)
```

## Environment Variables

```bash
# LLM API Keys (swappable per stage)
ANTHROPIC_API_KEY=sk-ant-api03-xMLyvOdi...
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# SQLite Databases
CLASSIFY_DB_LOCAL_DEV=./data/classify-workflow-local-dev.db
CLASSIFY_DB_LOCAL_PROD=./data/classify-workflow-local-prod.db

# PostgreSQL (source)
DATABASE_URL=postgresql://username:password@host/database

# Optional: Per-stage LLM provider override
LLM_PROVIDER_TIME_INFERENCE=local
LLM_PROVIDER_BOOLEAN_REVIEW=openai
LLM_PROVIDER_FINAL_REVIEW=openai
```

## Project Structure

```
apps/motia/classify-workflow/
├── .env                         # Environment variables (gitignored)
├── deno.json                    # Motia project config
├── motia-workbench.json         # Workbench visualization config
├── types.d.ts                   # Auto-generated Motia types
├── data/
│   ├── classify-workflow-local-dev.db  # SQLite dev database
│   └── classify-workflow-local-prod.db # SQLite prod database
├── src/
│   ├── services/
│   │   └── classify/
│   │       ├── index.ts         # Service exports
│   │       ├── types.ts         # Classification types
│   │       ├── normalize.ts     # Unit normalization service
│   │       ├── llm-clients.ts   # LLM client factory
│   │       ├── database.ts      # SQLite operations
│   │       └── prompts/
│   │           ├── time.ts           # Time inference prompt
│   │           ├── scale.ts          # Scale inference prompt
│   │           ├── currency.ts       # Currency check prompt
│   │           ├── family.ts         # Family assignment prompt
│   │           ├── type.ts           # Type classification prompt
│   │           ├── boolean-review.ts # Boolean review prompt
│   │           └── final-review.ts   # Final review prompt
│   ├── utils/
│   │   └── unit-classifier.ts   # Copy from econify (667 lines)
│   └── scripts/
│       ├── seed-database.ts     # Seed SQLite from PostgreSQL
│       └── schema.sql            # SQLite schema
├── steps/
│   └── classify-flow/
│       ├── start-classify.step.ts           # API: POST /classify/batch
│       ├── normalize-indicator.step.ts      # Event: Stage 1 - Normalize
│       ├── infer-time-basis.step.ts         # Event: Stage 2 - Time inference
│       ├── infer-scale.step.ts              # Event: Stage 3 - Scale inference
│       ├── check-currency.step.ts           # Event: Stage 4 - Currency check
│       ├── assign-family.step.ts            # Event: Stage 5 - Family assignment
│       ├── classify-type.step.ts            # Event: Stage 6 - Type classification
│       ├── boolean-review.step.ts           # Event: Stage 7 - Boolean review
│       ├── final-review.step.ts             # Event: Stage 8 - Final review
│       └── complete-classify.step.ts        # Event: Stage 9 - Finalize & save
└── README.md
```

## Motia Configuration

**Flow**: `classify-indicator`

**State Groups**:
- `normalizations` - Stage 1 results
- `time-inferences` - Stage 2 results
- `scale-inferences` - Stage 3 results
- `currency-checks` - Stage 4 results
- `family-assignments` - Stage 5 results
- `type-classifications` - Stage 6 results
- `boolean-reviews` - Stage 7 results
- `final-reviews` - Stage 8 results

**Event Topics**:
- `indicator.normalize`
- `indicator.infer-time`
- `indicator.infer-scale`
- `indicator.check-currency`
- `indicator.assign-family`
- `indicator.classify-type`
- `indicator.boolean-review`
- `indicator.final-review`
- `indicator.complete`

## SQLite Schema

```sql
-- Source indicators (seeded from PostgreSQL)
CREATE TABLE source_indicators (
  indicator_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  units TEXT,
  long_name TEXT,
  source_name TEXT,
  periodicity TEXT,
  aggregation_method TEXT,
  scale TEXT,
  topic TEXT,
  category_group TEXT,
  dataset TEXT,
  currency_code TEXT,
  description TEXT,
  sample_values TEXT, -- JSON array of {date, value}
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Final classifications (persistent audit trail)
CREATE TABLE final_classifications (
  indicator_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  units TEXT,
  
  -- Normalized
  parsed_scale TEXT,
  parsed_unit_type TEXT,
  parsed_currency TEXT,
  
  -- LLM Inferences
  reporting_frequency TEXT, -- daily|monthly|quarterly|annual|point-in-time
  time_basis TEXT, -- per-period|point-in-time|cumulative
  scale TEXT,
  is_currency_denominated INTEGER,
  detected_currency TEXT,
  
  -- Classification
  family TEXT NOT NULL,
  indicator_type TEXT NOT NULL,
  temporal_aggregation TEXT NOT NULL,
  
  -- Review
  review_status TEXT, -- passed|corrected|failed
  corrections_applied TEXT, -- JSON
  
  -- Metadata
  overall_confidence REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (indicator_id) REFERENCES source_indicators(indicator_id)
);

CREATE INDEX idx_final_name ON final_classifications(name);
CREATE INDEX idx_final_family ON final_classifications(family);
CREATE INDEX idx_final_type ON final_classifications(indicator_type);
```

## Seed Script

**Purpose**: Fetch 10,000+ indicators from PostgreSQL and populate local SQLite

**Target Indicators** (100+ names, all countries):
- Imports of goods, World (CIF)
- Inflation Rate
- Real Effective Exchange Rate (REER)
- Sales Tax Rate
- Population
- Unemployment Rate
- Consumer Price Index CPI
- Exports
- GDP Annual Growth Rate
- ... (see full list in PRD)

**Usage**:
```bash
deno task seed-db
```

**Script** (`src/scripts/seed-database.ts`):
```typescript
import { Client } from "https://deno.land/x/postgres/mod.ts";
import { Database } from "https://deno.land/x/sqlite/mod.ts";

const TARGET_INDICATORS = [
  'Inflation Rate', 'GDP', 'Unemployment Rate', 
  // ... full list of 100+ indicator names
];

async function seedDatabase() {
  const pgClient = new Client(Deno.env.get('DATABASE_URL')!);
  await pgClient.connect();
  
  const db = new Database(Deno.env.get('CLASSIFY_DB_LOCAL_DEV')!);
  
  // Fetch indicators and time series from PostgreSQL
  const result = await pgClient.queryObject(`
    SELECT i.id, i.name, i.units, i.periodicity, ...
    FROM indicators i
    WHERE i.name = ANY($1)
  `, [TARGET_INDICATORS]);
  
  // Insert into SQLite
  db.transaction(() => {
    for (const ind of result.rows) {
      db.query(`INSERT OR REPLACE INTO source_indicators ...`, [...]);
    }
  });
  
  console.log(`✅ Seeded ${result.rows.length} indicators`);
}
```

## Logging Strategy

**Critical**: Extensive logging at every stage for debugging and observability

**logger.info** - Stage entry/exit:
```typescript
logger.info('Stage started', { indicator_id, stage: 'normalize' })
logger.info('Stage complete', { indicator_id, stage: 'normalize', confidence: 0.95 })
```

**logger.debug** - Intermediate state:
```typescript
logger.debug('Normalization result', { 
  indicator_id, 
  parsed_scale, 
  parsed_unit_type, 
  parsed_currency,
  confidence 
})
```

**logger.warn** - Validation issues:
```typescript
logger.warn('Low confidence', { indicator_id, confidence: 0.6, stage: 'time-inference' })
logger.warn('Periodicity conflict', { indicator_id, periodicity, time_series_frequency })
```

**logger.error** - Failures with full context:
```typescript
logger.error('LLM inference failed', { 
  indicator_id, 
  name, 
  units, 
  stage: 'time-inference',
  error: error.message,
  stack: error.stack 
})
```

## Success Metrics

- **Concurrency**: 25 indicators processed simultaneously
- **Latency**: <2s per indicator with local LLM
- **Tokens**: <500 total tokens per indicator
- **Cost**: <$0.001 per indicator with OpenAI (if used)
- **Accuracy**: >90% pass boolean review on first attempt
- **Observability**: Full trace in Motia Workbench for each indicator

## Future Enhancements

- Real-time stream processing from PostgreSQL replication
- Resume failed workflows from last successful stage
- A/B test different prompt versions
- Auto-tune confidence thresholds based on review feedback
- Export to econify package format
- Web UI for reviewing flagged indicators
- Batch review endpoint for manual corrections

