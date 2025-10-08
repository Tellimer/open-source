# V1 to V2 Migration Guide

This guide helps you migrate from V1 (single-pass) to V2 (multi-stage) pipeline.

## Overview

V2 is **opt-in** and **non-breaking**. V1 remains the default pipeline. Both can
coexist in the same project.

## Quick Comparison

| Feature             | V1                        | V2                                                                        |
| ------------------- | ------------------------- | ------------------------------------------------------------------------- |
| **API**             | `classifyIndicators()`    | `classifyIndicatorsV2()`                                                  |
| **Stages**          | Single pass               | 6 stages (Router → Specialist → Orientation → Flagging → Review → Output) |
| **Database**        | None                      | SQLite (local or remote)                                                  |
| **Prompts**         | Single generic prompt     | 7 family-specific prompts                                                 |
| **Quality Control** | None                      | Automatic flagging + LLM review                                           |
| **Resume**          | No                        | Yes (via persistent state)                                                |
| **Cost**            | ~$0.15 per 100 indicators | ~$0.45 per 100 indicators (3x)                                            |
| **Accuracy**        | Good                      | Better (family-based routing)                                             |
| **Setup**           | None                      | Requires database initialization                                          |

## When to Migrate

### Choose V2 when:

- You need **higher accuracy** (family-based routing)
- You want **quality control** (automatic flagging and review)
- You need **persistent state** (resume on failure)
- You want **detailed metrics** (stage-by-stage telemetry)
- You need **audit trail** (execution history in database)

### Stick with V1 when:

- You need **simplicity** (one function call, no database)
- You want **lower cost** (3x cheaper)
- You're **prototyping** (faster to get started)
- You don't need persistent state

## Migration Steps

### Step 1: Install Dependencies (if not already)

V2 uses AI SDK and Valibot (already in package):

```json
{
  "imports": {
    "ai": "npm:ai@^5.0.59",
    "@ai-sdk/openai": "npm:@ai-sdk/openai@^1.0.9",
    "@ai-sdk/anthropic": "npm:@ai-sdk/anthropic@^1.0.8",
    "@ai-sdk/google": "npm:@ai-sdk/google@^1.0.8",
    "valibot": "npm:valibot@^0.42.1"
  }
}
```

### Step 2: Create Database

V2 requires a SQLite database:

```typescript
import { createLocalDatabase } from "@tellimer/classify";

const db = createLocalDatabase("./data/classify_v2.db");
await db.initialize();
```

### Step 3: Update Classification Code

#### Before (V1)

```typescript
import { classifyIndicators } from "@tellimer/classify";

const indicators = [
  { name: "GDP", units: "USD billions" },
  { name: "Unemployment Rate", units: "%" },
];

const config = {
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o",
};

const enriched = await classifyIndicators(indicators, config);

console.log(enriched[0].classification);
```

#### After (V2)

```typescript
import { classifyIndicatorsV2, createLocalDatabase } from "@tellimer/classify";

const indicators = [
  { name: "GDP", units: "USD billions" },
  { name: "Unemployment Rate", units: "%" },
];

const config = {
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o",
};

// Create and initialize database
const db = createLocalDatabase("./data/classify_v2.db");
await db.initialize();

// Run V2 pipeline
const result = await classifyIndicatorsV2(indicators, config, {
  database: db,
});

// Access results
console.log(result.classifications[0]);
console.log(`Success rate: ${result.summary.successRate}%`);
console.log(`Flagged: ${result.summary.flagged}`);

db.close();
```

### Step 4: Handle New Result Format

#### V1 Result

```typescript
const enriched: EnrichedIndicator[] = await classifyIndicators(...);

for (const indicator of enriched) {
  console.log(indicator.classification.indicator_type);
}
```

#### V2 Result

```typescript
const result: V2PipelineResult = await classifyIndicatorsV2(...);

// Main classifications
for (const classification of result.classifications) {
  console.log(classification.indicator_type);
}

// Summary metrics
console.log(result.summary);
// {
//   total: 2,
//   successful: 2,
//   failed: 0,
//   flagged: 0,
//   reviewed: 0,
//   escalated: 0,
//   successRate: 100
// }

// Stage metrics
console.log(result.stages.router);
// {
//   processingTime: 2345,
//   apiCalls: 1,
//   tokensInput: 1234,
//   tokensOutput: 567,
//   cost: 0.015
// }
```

## Key Differences

### 1. Result Structure

**V1** returns enriched indicators:

```typescript
interface EnrichedIndicator {
  id: string;
  name: string;
  units?: string;
  // ... other input fields
  classification: ClassifiedMetadata;
}
```

**V2** returns comprehensive pipeline result:

```typescript
interface V2PipelineResult {
  classifications: V2Classification[];
  summary: SummaryMetrics;
  stages: StageMetrics;
  executionId: string;
  processingTime: number;
}
```

### 2. Database Requirement

**V1:** No database needed

```typescript
const enriched = await classifyIndicators(indicators, config);
// That's it!
```

**V2:** Requires database initialization

```typescript
const db = createLocalDatabase("./data/classify_v2.db");
await db.initialize();

const result = await classifyIndicatorsV2(indicators, config, { database: db });

db.close(); // Don't forget to close
```

### 3. Configuration Options

**V1:** Simple config

```typescript
const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: { provider: "openai", apiKey: "..." },
  batchSize: 5,
  maxRetries: 3,
  debug: true,
});
```

**V2:** Extensive stage-specific config

```typescript
const result = await classifyIndicatorsV2(indicators, llmConfig, {
  database: db,
  thresholds: {
    confidenceFamilyMin: 0.75,
    confidenceClsMin: 0.75,
    confidenceOrientMin: 0.75,
  },
  batch: {
    routerBatchSize: 40,
    specialistBatchSize: 25,
    orientationBatchSize: 50,
    reviewBatchSize: 20,
  },
  concurrency: {
    router: 4,
    specialist: 3,
    orientation: 4,
    review: 2,
  },
  debug: true,
});
```

### 4. Quality Control

**V1:** No quality control

```typescript
// Manual checks if needed
const enriched = await classifyIndicators(indicators, config);
const lowConfidence = enriched.filter((e) => e.classification.confidence < 0.8);
```

**V2:** Automatic flagging and review

```typescript
const result = await classifyIndicatorsV2(indicators, config, { database: db });

// Flagged indicators
const flagged = result.classifications.filter((c) => c.flags?.length > 0);

// Escalated (need human review)
const escalated = result.classifications.filter((c) =>
  c.review_decision?.action === "escalate"
);

// Fixed by review
const fixed = result.classifications.filter((c) =>
  c.review_decision?.action === "fix"
);
```

## Migration Patterns

### Pattern 1: Gradual Migration

Keep V1 as default, use V2 for specific cases:

```typescript
import {
  classifyIndicators,
  classifyIndicatorsV2,
  createLocalDatabase,
} from "@tellimer/classify";

async function classify(indicators: Indicator[], useV2 = false) {
  if (!useV2) {
    // V1: Simple, fast, cheap
    return await classifyIndicators(indicators, config);
  } else {
    // V2: High accuracy, quality control
    const db = createLocalDatabase("./data/classify_v2.db");
    await db.initialize();
    const result = await classifyIndicatorsV2(indicators, config, {
      database: db,
    });
    db.close();
    return result.classifications;
  }
}
```

### Pattern 2: Hybrid Approach

Use V1 for initial pass, V2 for low-confidence cases:

```typescript
// 1. Quick V1 pass
const v1Results = await classifyIndicators(indicators, config);

// 2. Identify low confidence
const lowConfidence = v1Results.filter((r) =>
  r.classification.confidence < 0.8
);

// 3. Re-run with V2 for better accuracy
if (lowConfidence.length > 0) {
  const db = createLocalDatabase("./data/classify_v2.db");
  await db.initialize();

  const v2Results = await classifyIndicatorsV2(
    lowConfidence.map((r) => ({ id: r.id, name: r.name, units: r.units })),
    config,
    { database: db },
  );

  db.close();

  // 4. Merge results
  const final = v1Results.map((v1) => {
    const v2 = v2Results.classifications.find((c) => c.id === v1.id);
    return v2 || v1;
  });
}
```

### Pattern 3: Shared Database

Reuse database across multiple runs:

```typescript
import { classifyIndicatorsV2, createLocalDatabase } from "@tellimer/classify";

// Initialize once
const db = createLocalDatabase("./data/classify_v2.db");
await db.initialize();

try {
  // Run 1
  const batch1 = await classifyIndicatorsV2(indicators1, config, {
    database: db,
  });

  // Run 2 (reuses same database)
  const batch2 = await classifyIndicatorsV2(indicators2, config, {
    database: db,
  });

  // Run 3
  const batch3 = await classifyIndicatorsV2(indicators3, config, {
    database: db,
  });
} finally {
  db.close(); // Close when done
}
```

## Handling Escalated Indicators

V2 may escalate indicators for human review:

```typescript
const result = await classifyIndicatorsV2(indicators, config, { database: db });

// Get escalated indicators
const escalated = result.classifications.filter((c) =>
  c.review_decision?.action === "escalate"
);

if (escalated.length > 0) {
  console.log(`⚠️  ${escalated.length} indicators need human review:`);

  for (const indicator of escalated) {
    console.log(`  • ${indicator.name}`);
    console.log(`    Reason: ${indicator.review_decision?.reasoning}`);
    console.log(`    Current: ${indicator.indicator_type}`);

    // Prompt for human review
    const humanDecision = await promptHumanReview(indicator);

    // Update in database
    await updateClassification(db, indicator.id, humanDecision);
  }
}
```

## Cost Considerations

V2 costs ~3x more than V1 due to multiple stages:

### V1 Cost (100 indicators)

- 1 API call per batch (~10 batches)
- **Total: ~$0.15**

### V2 Cost (100 indicators)

- Router: 3 batches
- Specialist: 8 batches (grouped by family)
- Orientation: 2 batches
- Review: 1 batch (only flagged ~12%)
- **Total: ~$0.45**

**Cost optimization:**

- Use V1 for initial pass
- Use V2 only for low-confidence cases
- Adjust batch sizes to reduce API calls
- Use cheaper models (Gemini Flash) for routing

## Performance Comparison

| Metric                | V1      | V2        |
| --------------------- | ------- | --------- |
| **100 indicators**    | ~10-15s | ~30-40s   |
| **API calls**         | ~10     | ~14       |
| **Accuracy**          | Good    | Better    |
| **Resume on failure** | No      | Yes       |
| **Quality control**   | Manual  | Automatic |

## Testing Migration

Test both pipelines side-by-side:

```typescript
import {
  classifyIndicators,
  classifyIndicatorsV2,
  createLocalDatabase,
} from "@tellimer/classify";

const testIndicators = [
  { name: "GDP", units: "USD billions" },
  { name: "CPI", units: "Index (2015=100)" },
  // ... more test cases
];

// V1 results
const v1Results = await classifyIndicators(testIndicators, config);

// V2 results
const db = createLocalDatabase("./test_v2.db");
await db.initialize();
const v2Result = await classifyIndicatorsV2(testIndicators, config, {
  database: db,
});
db.close();

// Compare
for (let i = 0; i < testIndicators.length; i++) {
  const v1 = v1Results[i].classification;
  const v2 = v2Result.classifications[i];

  console.log(`${testIndicators[i].name}:`);
  console.log(`  V1: ${v1.indicator_type} (${v1.indicator_category})`);
  console.log(`  V2: ${v2.indicator_type} (${v2.family})`);

  if (v1.indicator_type !== v2.indicator_type) {
    console.log(`  ⚠️  Difference detected!`);
  }
}
```

## Rollback Plan

If V2 doesn't work as expected:

1. **Keep V1 function** - V1 is not removed
2. **Switch back** - Simply use `classifyIndicators()` instead of
   `classifyIndicatorsV2()`
3. **No data loss** - V2 database is separate, doesn't affect V1

```typescript
// Easy rollback - just change function
// const result = await classifyIndicatorsV2(indicators, config, { database: db });
const enriched = await classifyIndicators(indicators, config);
```

## Common Issues

### Issue 1: Database Locked

**Problem:** Multiple processes accessing same database

**Solution:** Use separate databases or close connections properly

```typescript
// Bad
const db = createLocalDatabase('./data/classify_v2.db');
await db.initialize();
await classifyIndicatorsV2(..., { database: db });
// db not closed - next run will fail

// Good
const db = createLocalDatabase('./data/classify_v2.db');
await db.initialize();
try {
  await classifyIndicatorsV2(..., { database: db });
} finally {
  db.close(); // Always close
}
```

### Issue 2: High Escalation Rate

**Problem:** Too many indicators escalated for human review

**Solution:** Adjust confidence thresholds

```typescript
// Lower thresholds (fewer escalations)
const result = await classifyIndicatorsV2(indicators, config, {
  database: db,
  thresholds: {
    confidenceFamilyMin: 0.65, // Lower from 0.75
    confidenceClsMin: 0.65,
    confidenceOrientMin: 0.65,
  },
});
```

### Issue 3: Slow Performance

**Problem:** V2 takes too long

**Solution:** Increase concurrency and batch sizes

```typescript
const result = await classifyIndicatorsV2(indicators, config, {
  database: db,
  batch: {
    routerBatchSize: 50, // Increase from 40
    specialistBatchSize: 30, // Increase from 25
    orientationBatchSize: 60, // Increase from 50
  },
  concurrency: {
    router: 8, // Increase from 4
    specialist: 6, // Increase from 3
    orientation: 8, // Increase from 4
  },
});
```

## Next Steps

- [V2 Overview](./v2/README.md) - Learn about V2 pipeline
- [V2 Architecture](./v2/ARCHITECTURE.md) - Understand the 6 stages
- [Database Guide](./v2/DATABASE.md) - Set up SQLite
- [AI SDK Guide](./v2/AI_SDK.md) - Type-safe structured output
- [V1 Documentation](./v1/README.md) - V1 pipeline reference
