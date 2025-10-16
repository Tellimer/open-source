# Usage Guide: Classification Pipeline

## Quick Start

### 1. Start the Motia Server (Terminal 1)

```bash
cd apps/motia/classify-workflow
deno task dev
```

Server starts on `http://localhost:3000`

### 2. Run Classification Pipeline (Terminal 2)

```bash
cd apps/motia/classify-workflow

# Classify 100 diverse indicators (default local LLM)
deno task run:dev --100

# Or specify any number and provider
deno task run:dev -50 --provider openai
deno task run:dev -10 --provider anthropic
```

## How It Works

### Sampling Strategy

The runner samples **diverse indicators** across all types:

1. **Gets all unique indicator names** (109 types)
2. **Distributes samples evenly** across types
3. **Randomly selects** from different countries per type
4. **Ensures variety** in the test dataset

**Example distribution:**

```
📊 Sample distribution (top 10):
   2× Balance of Trade
   2× Bank Lending Rate
   2× Banks Balance Sheet
   2× Business Confidence
   1× Capital Flows
   1× Car Registrations
   1× Capacity Utilization
   ...
```

### Batching

- Max **25 indicators per batch** (Motia's concurrent workflow limit)
- Batches sent sequentially with 1s delay between
- Progress tracked per batch
- Trace IDs provided for monitoring

### Output

```
🔬 Classification Pipeline Runner

📂 Database: ./data/classify-workflow-local-dev.db
   Total indicators in DB: 11,224

🎲 Sampling 100 diverse indicators...
   Found 109 unique indicator types
   Sampling ~1 indicator(s) per type for variety
✅ Sampled 100 indicators

📊 Sample distribution (top 10):
   1× GDP
   1× Inflation Rate
   1× Unemployment Rate
   ...

🚀 Starting classification...
   API: http://localhost:3000
   Total indicators: 100
   Batches: 4 (max 25 per batch)

📦 Batch 1/4 (25 indicators)...
   ✅ Batch 1 submitted
   📊 Trace ID: abc-123-def
   Progress: 25/100

📦 Batch 2/4 (25 indicators)...
   ✅ Batch 2 submitted
   📊 Trace ID: ghi-456-jkl
   Progress: 50/100
   ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Classification pipeline complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Total indicators: 100
   Batches sent: 4
   Duration: 12.5s

💡 Next steps:
   1. Check Motia logs for classification progress
   2. View results in Motia state (final-classifications group)
   3. Monitor Workbench UI for workflow visualization

🔍 Trace IDs for tracking:
   Batch 1: abc-123-def
   Batch 2: ghi-456-jkl
   Batch 3: mno-789-pqr
   Batch 4: stu-012-vwx
```

## Monitoring Results

### 1. Server Logs (Terminal 1)

Watch the Motia server logs for real-time classification progress:

```
[INFO] Starting batch classification { count: 25 }
[INFO] Normalizing indicator { indicator_id: "123", name: "GDP" }
[INFO] Normalization complete { parsed_type: "currency-amount" }
[INFO] Inferring time basis { indicator_id: "123" }
[INFO] Time inference complete { time_basis: "per-period" }
...
[INFO] Classification complete { indicator_id: "123", review_status: "passed" }
```

### 2. Motia State

Access classification results in Motia state:

```typescript
// In a Motia step
const classification = await state.get('final-classifications', indicator_id);

// Result structure
{
  indicator_id: "123",
  name: "GDP",
  original_units: "USD Billion",
  parsed_scale: "billions",
  parsed_unit_type: "currency-amount",
  time_basis: "per-period",
  reporting_frequency: "annual",
  scale: "billions",
  is_currency: true,
  detected_currency: "USD",
  family: "numeric-measurement",
  indicator_type: "flow",
  temporal_aggregation: "period-total",
  review_status: "passed",
  overall_confidence: 0.89,
  created_at: "2024-10-14T16:45:23Z"
}
```

### 3. Workbench UI (if enabled)

- Navigate to Motia Workbench
- View flow visualization
- Track workflow progress per indicator
- See state transitions

## Environment Configuration

### Optional: Change API URL

```bash
# In .env
MOTIA_API_URL=http://localhost:8080  # Different port
```

### Optional: Per-stage LLM providers

```bash
# In .env
LLM_PROVIDER_TIME_INFERENCE=anthropic
LLM_PROVIDER_FAMILY_ASSIGNMENT=anthropic
LLM_PROVIDER_BOOLEAN_REVIEW=anthropic
# ... (defaults to openai)
```

## Troubleshooting

### Error: "Database not found"

Run the seed script first:

```bash
deno task seed-db
```

### Error: "Failed to connect to API"

Ensure the Motia server is running:

```bash
deno task dev
```

### Error: "Invalid sample size"

Use positive numbers with -- or - prefix:

```bash
deno task run:dev --100  # ✅ Correct
deno task run:dev -50    # ✅ Correct
deno task run:dev 100    # ❌ Wrong (missing prefix)
```

## Performance Notes

- **Latency**: ~10-15s per indicator with OpenAI (6 LLM calls)
- **Throughput**: ~100 indicators/minute (4 batches of 25)
- **Cost**: ~$0.0015 per indicator with GPT-4o-mini
- **Concurrency**: Max 25 workflows simultaneously

## Advanced Usage

### Sample from SQLite directly

```typescript
import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";

const db = new DB("./data/classify-workflow-local-dev.db");

// Get specific indicators
const query = db.query(`
  SELECT * FROM source_indicators 
  WHERE name = 'GDP' 
  LIMIT 10
`);

// Custom sampling logic
const customSample = db.query(`
  SELECT * FROM source_indicators 
  WHERE category_group = 'Economic Activity'
  ORDER BY RANDOM()
  LIMIT 25
`);
```

### Manual API calls

```bash
curl -X POST http://localhost:3000/classify/batch \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": [
      {
        "indicator_id": "custom-123",
        "name": "Custom Indicator",
        "units": "Percent",
        "periodicity": "Annual"
      }
    ]
  }'
```

## Next Steps

1. ✅ **Run classifications** with `deno task run:dev --100`
2. 📊 **Monitor logs** in the server terminal
3. 🔍 **Review results** in Motia state
4. 🎨 **Visualize workflows** in Workbench UI
5. 🚀 **Scale up** to larger batches as needed
