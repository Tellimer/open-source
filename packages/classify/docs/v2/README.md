# V2 Pipeline Documentation

The V2 pipeline is an advanced multi-stage classification system with persistent
state, family-based routing, and quality control.

## Overview

V2 introduces a 6-stage pipeline for higher accuracy and better quality control:

1. **Router** - Classify indicators into 7 families
2. **Specialist** - Use family-specific prompts for type classification
3. **Orientation** - Determine heat map orientation (welfare-focused)
4. **Flagging** - Apply quality rules to detect issues
5. **Review** - LLM reviews flagged indicators
6. **Output** - Assemble final classifications

## Key Features

- **Multi-stage pipeline** - 6 specialized stages for accuracy
- **Family-based routing** - 7 indicator families with specialized prompts
- **Context passing with reasoning** - Each stage receives full context and
  reasoning from prior stages
- **Persistent SQLite database** - Local or remote (Railway) storage
- **Quality control** - Automatic flagging and LLM review
- **Resume capability** - Restart from any stage using DB state
- **Vercel AI SDK** - Type-safe structured output with Valibot
- **Comprehensive telemetry** - Track timing, tokens, and costs per stage

## Quick Start

```typescript
import { classifyIndicatorsV2, createLocalDatabase } from "@tellimer/classify";

// 1. Create database
const db = createLocalDatabase("./data/classify_v2.db");
await db.initialize();

// 2. Run V2 pipeline
const result = await classifyIndicatorsV2(indicators, {
  provider: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-sonnet-4-5-20250929", // Recommended: latest and most capable
}, {
  database: db,
  thresholds: {
    confidenceFamilyMin: 0.75,
    confidenceClsMin: 0.75,
    confidenceOrientMin: 0.75,
  },
});

// 3. Access results
console.log(`Classified: ${result.summary.successful}/${result.summary.total}`);
console.log(`Flagged: ${result.summary.flagged}`);
console.log(`Escalated: ${result.summary.escalated}`);

// Stage metrics
console.log(`Router: ${result.stages.router.processingTime}ms`);
console.log(`Specialist: ${result.stages.specialist.processingTime}ms`);

db.close();
```

## Architecture

V2 uses a multi-stage pipeline for better accuracy:

```
Input: Indicators[]
  ↓
┌─────────────────────┐
│  1. Router Stage    │ → Assign to 7 families
│  (Family routing)   │ → Store in DB
└─────────────────────┘
  ↓
┌─────────────────────┐
│  2. Specialist      │ → Family-specific prompts
│  (Type/temporal)    │ → Higher accuracy
└─────────────────────┘
  ↓
┌─────────────────────┐
│  3. Orientation     │ → Welfare-focused orientation
│  (Heat map)         │ → 10 guardrail examples
└─────────────────────┘
  ↓
┌─────────────────────┐
│  4. Flagging        │ → Apply 6 quality rules
│  (Quality checks)   │ → Detect issues
└─────────────────────┘
  ↓
┌─────────────────────┐
│  5. Review          │ → LLM reviews flagged items
│  (Corrections)      │ → confirm/fix/escalate
└─────────────────────┘
  ↓
┌─────────────────────┐
│  6. Output          │ → Final classifications
│  (Assembly)         │ → With metrics
└─────────────────────┘
  ↓
Output: V2PipelineResult
```

See [Architecture](./ARCHITECTURE.md) for detailed stage documentation.

## Context Passing & Reasoning Chain

One of V2's key innovations is **context enrichment** - each stage receives full
context and reasoning from all prior stages. This creates a reasoning chain
where LLMs build on previous analysis rather than starting fresh.

### How It Works

**Stage 1: Router**

```typescript
{
  family: 'change-movement',
  confidence: 0.93,
  reasoning: 'CPI YoY measures price change rate over time'
}
```

**Stage 2: Specialist** (receives router context)

```typescript
// Specialist prompt includes:
// - Router Family: change-movement
// - Router Confidence: 0.93
// - Router Reasoning: "CPI YoY measures price change rate over time"

{
  indicator_type: 'rate',
  temporal_aggregation: 'period-rate',
  is_currency_denominated: false,
  confidence: 0.95,
  reasoning: 'Inflation measures price growth percentage over period'
}
```

**Stage 3: Orientation** (receives router + specialist context)

```typescript
// Orientation prompt includes ALL prior context:
// Router: family, confidence, reasoning
// Specialist: type, temporal, monetary, reasoning

{
  heat_map_orientation: 'lower-is-positive',
  confidence: 0.98,
  reasoning: 'Lower inflation improves purchasing power and welfare'
}
```

### Benefits

1. **Better Decisions** - LLMs make informed choices based on prior analysis
2. **Consistent Reasoning** - Each stage builds on previous stages' logic
3. **Debugging** - Full reasoning chain stored in database
4. **Transparency** - See exactly why each decision was made

### Database Storage

All reasoning is persisted:

```sql
-- Router reasoning
SELECT family, confidence_family, reasoning_router
FROM classifications WHERE indicator_id = 'CPI_YOY';

-- Specialist reasoning
SELECT indicator_type, confidence_cls, reasoning_specialist
FROM classifications WHERE indicator_id = 'CPI_YOY';

-- Full context chain
SELECT
  family, reasoning_router,
  indicator_type, reasoning_specialist,
  heat_map_orientation
FROM classifications WHERE indicator_id = 'CPI_YOY';
```

This creates a complete audit trail of the classification reasoning chain.

## Database Setup

V2 requires a SQLite database for persistent state.

### Local Database

```typescript
import { createLocalDatabase } from "@tellimer/classify";

const db = createLocalDatabase("./data/classify_v2.db");
await db.initialize();
```

### Remote Database (Railway)

```typescript
import { createRemoteDatabase } from "@tellimer/classify";

const db = createRemoteDatabase(
  "https://your-railway-db.railway.app",
  { token: process.env.RAILWAY_TOKEN },
);
await db.initialize();
```

See [Database Guide](./DATABASE.md) for setup and seeding instructions.

## Configuration

V2 accepts extensive configuration:

```typescript
const result = await classifyIndicatorsV2(indicators, llmConfig, {
  database: db,

  // Confidence thresholds for flagging
  thresholds: {
    confidenceFamilyMin: 0.75, // Router confidence
    confidenceClsMin: 0.75, // Specialist confidence
    confidenceOrientMin: 0.75, // Orientation confidence
  },

  // Batch sizes per stage
  batch: {
    routerBatchSize: 40,
    specialistBatchSize: 25,
    orientationBatchSize: 50,
    reviewBatchSize: 20,
  },

  // Concurrency per stage
  concurrency: {
    router: 4,
    specialist: 3,
    orientation: 4,
    review: 2,
  },

  // Debug mode
  debug: true,
  quiet: false,

  // Per-stage model overrides (optional)
  models: {
    router: "claude-haiku-4-20250514", // Cost optimization: cheaper model
    specialist: "claude-haiku-4-20250514", // Cost optimization: cheaper model
    orientation: "claude-haiku-4-20250514", // Cost optimization: cheaper model
    review: "claude-sonnet-4-5-20250929", // Keep powerful model for review
  },
});
```

### Multi-Model Configuration

You can use different models for different stages. This is useful when mixing
model providers (e.g., Claude for classification, GPT-5 for review):

```typescript
const result = await classifyIndicatorsV2(indicators, {
  provider: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-sonnet-4-5-20250929", // Default for all stages (recommended)
}, {
  database: db,
  models: {
    // Use GPT-5 for review stage (cross-provider validation)
    review: "gpt-5",
  },
});
```

**Note**: The `models` override uses the model name directly. For cross-provider
usage, the AI SDK will automatically use the appropriate provider based on the
model name (e.g., `gpt-5` → OpenAI, `claude-*` → Anthropic).

**Common configurations**:

- **Cross-provider validation**: Claude for classification, GPT-5 for review
- **Cost optimization**: Haiku/Flash for high-volume stages, Sonnet for review
- **Best quality**: Claude Sonnet 4.5 for all stages (same price as Sonnet 4)

## Indicator Families

V2 routes indicators into 7 families for specialized processing:

1. **physical-fundamental** - Stock, flow, balance, capacity, volume
2. **numeric-measurement** - Count, percentage, ratio, spread, share
3. **price-value** - Price, yield
4. **change-movement** - Rate, volatility, gap
5. **composite-derived** - Index, correlation, elasticity, multiplier
6. **temporal** - Duration, probability, threshold
7. **qualitative** - Sentiment, allocation

Each family has a specialized prompt for higher accuracy.

## Quality Control

### Flagging Rules

V2 automatically flags indicators with issues:

1. **low_confidence_family** - Router confidence < threshold
2. **low_confidence_cls** - Specialist confidence < threshold
3. **low_confidence_orient** - Orientation confidence < threshold
4. **temporal_mismatch** - Temporal aggregation violates type rules
5. **type_mismatch** - Type doesn't belong to family
6. **orientation_mismatch** - Orientation violates semantic rules

### Review Process

Flagged indicators are automatically reviewed by LLM:

- **confirm** - Classification is correct despite flag
- **fix** - Apply minimal corrections via diff
- **escalate** - Requires human review

```typescript
// Get escalated indicators requiring human review
const escalated = result.classifications.filter((c) =>
  c.review_decision?.action === "escalate"
);

for (const indicator of escalated) {
  console.log(`Review needed: ${indicator.name}`);
  console.log(`Reason: ${indicator.review_decision?.reasoning}`);
}
```

## AI SDK Integration

V2 uses Vercel AI SDK for type-safe structured output:

- **Valibot schemas** - Runtime validation with type inference
- **Automatic retries** - Built-in error handling
- **Token optimization** - No JSON format instructions needed
- **Better error messages** - Detailed validation errors

See [AI SDK Guide](./AI_SDK.md) for benefits and migration details.

## Telemetry & Metrics

V2 provides comprehensive metrics per stage:

```typescript
const result = await classifyIndicatorsV2(indicators, llmConfig, {
  database: db,
});

// Overall summary
console.log(result.summary);
// {
//   total: 100,
//   successful: 98,
//   failed: 2,
//   flagged: 12,
//   reviewed: 12,
//   escalated: 1,
//   successRate: 98.0
// }

// Per-stage metrics
console.log(result.stages.router);
// {
//   processingTime: 8234,
//   apiCalls: 3,
//   tokensInput: 15234,
//   tokensOutput: 2345,
//   cost: 0.0234,
//   indicatorsProcessed: 100
// }

console.log(result.stages.specialist);
// {
//   processingTime: 12456,
//   apiCalls: 8,
//   tokensInput: 28456,
//   tokensOutput: 4567,
//   cost: 0.0456,
//   indicatorsProcessed: 100,
//   familyDistribution: {
//     'physical-fundamental': 35,
//     'numeric-measurement': 28,
//     // ... other families
//   }
// }
```

## Resume Capability

V2 can resume from any stage using database state:

```typescript
// First run - completes router and specialist
const db = createLocalDatabase("./data/classify_v2.db");
await db.initialize();

try {
  await classifyIndicatorsV2(indicators, llmConfig, { database: db });
} catch (error) {
  console.error("Pipeline failed, but state is saved");
}

// Second run - resumes from where it left off
const result = await classifyIndicatorsV2(indicators, llmConfig, {
  database: db, // Automatically detects and skips completed stages
});
```

The database stores:

- Router results → Skip if already routed
- Specialist results → Skip if already classified
- Orientation results → Skip if already oriented
- Flagging results → Skip if already flagged
- Review decisions → Skip if already reviewed

## Performance

V2 pipeline is optimized for large-scale classification:

- **Parallel processing** - Configurable concurrency per stage
- **Smart batching** - Optimal batch sizes per stage
- **Family grouping** - Process indicators by family for efficiency
- **Persistent state** - No reprocessing on failure

Typical performance for 100 indicators:

- Router: ~8-10s (40 per batch, 4 concurrent)
- Specialist: ~12-15s (25 per family batch, 3 concurrent)
- Orientation: ~6-8s (50 per batch, 4 concurrent)
- Flagging: <1s (rule-based, no API calls)
- Review: ~4-6s (20 per batch, 2 concurrent, only flagged items)

**Total: ~30-40s for 100 indicators**

## Cost Comparison

V2 uses more API calls but provides higher quality:

### V1 (Single Pass)

- 100 indicators: ~$0.15
- Single classification per indicator
- No quality control

### V2 (Multi-Stage)

- 100 indicators: ~$0.45
- 3x more API calls (router + specialist + orientation + review)
- Higher accuracy through family-based routing
- Quality control with flagging and review
- **3x cost for significantly better results**

See [Cost Tracking](../COST_TRACKING.md) for pricing details.

## Testing

V2 includes comprehensive tests:

```bash
# Run V2 tests
deno task test:v2

# Run all tests
deno task test
```

Test coverage includes:

- Full pipeline integration tests
- Individual stage tests
- Database persistence tests
- Flagging and review tests
- Error handling tests
- Performance tests

## Migration from V1

Upgrading from V1 to V2 is opt-in and non-breaking:

```typescript
// V1 (default)
import { classifyIndicators } from "@tellimer/classify";
const enriched = await classifyIndicators(indicators, config);

// V2 (opt-in)
import { classifyIndicatorsV2, createLocalDatabase } from "@tellimer/classify";
const db = createLocalDatabase("./data/classify_v2.db");
await db.initialize();
const result = await classifyIndicatorsV2(indicators, config, { database: db });
```

See [Migration Guide](../MIGRATION.md) for complete migration instructions.

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - Detailed 6-stage pipeline
- [Database Guide](./DATABASE.md) - Setup and seeding
- [AI SDK Guide](./AI_SDK.md) - AI SDK integration
- [Migration Guide](../MIGRATION.md) - Upgrade from V1
- [Type Validation](../TYPE_VALIDATION.md) - Indicator types
- [Cost Tracking](../COST_TRACKING.md) - Cost estimation

## When to Use V2

Choose V2 when you need:

- **Higher accuracy** - Family-based routing improves classification
- **Quality control** - Automatic flagging and review
- **Persistent state** - Resume capability for large batches
- **Detailed metrics** - Stage-by-stage telemetry
- **Audit trail** - Complete execution history in database

Stick with V1 when you need:

- **Simplicity** - One function call, no database
- **Lower cost** - 3x cheaper
- **Quick prototyping** - Faster to get started
