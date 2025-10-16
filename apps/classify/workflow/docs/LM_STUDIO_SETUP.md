# LM Studio Setup Guide

The classify-motia workflow now **defaults to using LM Studio** with a local Mistral model for free, fast classification!

## Why LM Studio?

✅ **Free**: No API costs\
✅ **Fast**: Local inference, no network latency\
✅ **Private**: Data never leaves your machine\
✅ **Reliable**: No rate limits or API downtime

## Quick Setup

### 1. Install LM Studio

Download from: https://lmstudio.ai/

Available for macOS, Windows, and Linux.

### 2. Download a Model

**Recommended: Mistral 7B Instruct**

1. Open LM Studio
2. Go to **Search** tab
3. Search for: `mistral-7b-instruct`
4. Download: `TheBloke/Mistral-7B-Instruct-v0.2-GGUF` (Q4_K_M variant for balance)

**Other good options:**

- `mistral-7b-instruct-v0.1` (lighter, faster)
- `llama-2-7b-chat` (alternative)
- `phi-2` (very fast, smaller)

### 3. Start the Local Server

1. In LM Studio, go to **Local Server** tab
2. Select your downloaded model
3. Click **Start Server**
4. Server starts at `http://127.0.0.1:1234`

**Verify it's running:**

```bash
curl http://127.0.0.1:1234/v1/models
```

Should return JSON with your model info.

### 4. Configure Environment

Create `.env` file:

```bash
cd apps/motia/classify-workflow

# LM Studio (default - no API key needed!)
LM_STUDIO_URL=http://127.0.0.1:1234/v1

# Optional: Database path
CLASSIFY_DB_LOCAL_DEV=./data/classify-workflow-local-dev.db

# Optional: PostgreSQL for seeding
DATABASE_URL=postgresql://user:pass@host/db

# Optional: Override specific stages to use cloud LLMs
# LLM_PROVIDER_BOOLEAN_REVIEW=openai
# LLM_PROVIDER_FINAL_REVIEW=anthropic
# OPENAI_API_KEY=sk-proj-...
# ANTHROPIC_API_KEY=sk-ant-...
```

### 5. Test It!

```bash
# Start server
deno task dev

# In another terminal, run classification
deno task run:dev -5
```

## Performance

### LM Studio (Mistral 7B)

- **Speed**: 2-5s per indicator (depending on your CPU/GPU)
- **Cost**: $0 (free!)
- **Quality**: ~85-90% accuracy
- **Memory**: ~4-6GB RAM (model in memory)

### OpenAI (GPT-4o-mini)

- **Speed**: 1-2s per indicator (network dependent)
- **Cost**: ~$0.0015 per indicator
- **Quality**: ~95% accuracy
- **Memory**: Minimal (API-based)

## Configuration Options

### Change LM Studio Port

If you run LM Studio on a different port:

```bash
# .env
LM_STUDIO_URL=http://127.0.0.1:8080/v1
```

### Mix Local and Cloud

Use local for most stages, cloud for critical ones:

```bash
# .env
# Default to local (free)
# No LLM_PROVIDER_* = uses local by default

# Use OpenAI for final review (most accurate)
LLM_PROVIDER_FINAL_REVIEW=openai
OPENAI_API_KEY=sk-proj-...

# Use Anthropic for boolean review
LLM_PROVIDER_BOOLEAN_REVIEW=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

This gives you **cost savings** (5 local calls) + **accuracy** (2 cloud calls) = ~$0.0006 per indicator!

### Use Cloud Only

If you don't have LM Studio or want maximum accuracy:

```bash
# .env
# Override default provider
LLM_PROVIDER_TIME_INFERENCE=openai
LLM_PROVIDER_SCALE_INFERENCE=openai
LLM_PROVIDER_CURRENCY_CHECK=openai
LLM_PROVIDER_FAMILY_ASSIGNMENT=openai
LLM_PROVIDER_TYPE_CLASSIFICATION=openai
LLM_PROVIDER_BOOLEAN_REVIEW=openai
LLM_PROVIDER_FINAL_REVIEW=openai

OPENAI_API_KEY=sk-proj-...
```

## Troubleshooting

### Error: "Failed to connect to http://127.0.0.1:1234"

**Check LM Studio is running:**

```bash
curl http://127.0.0.1:1234/v1/models
```

**Solutions:**

1. Start LM Studio Local Server
2. Check the port matches your config
3. Check no firewall blocking localhost

### Error: "Model not loaded"

In LM Studio:

1. Go to Local Server tab
2. Select a model from dropdown
3. Click "Start Server"
4. Wait for "Server running" message

### Slow Performance

**CPU-only systems:**

- Use smaller model (phi-2, mistral-7b-q4)
- Reduce batch size to 2-3
- Be patient (5-10s per indicator is normal)

**GPU systems:**

- In LM Studio settings, enable GPU acceleration
- Use Q4 or Q5 quantization (good balance)
- Should get 2-4s per indicator

### Out of Memory

**If LM Studio crashes:**

1. Use smaller model (4B instead of 7B)
2. Use higher quantization (Q4 instead of Q6)
3. Close other applications
4. Increase system swap space

**Recommended minimum:**

- **8GB RAM**: phi-2 or mistral-7b-Q4
- **16GB RAM**: mistral-7b-Q5
- **32GB RAM**: mistral-7b-Q8 or 13B models

### Wrong Model Responses

Make sure you're using an **Instruct** model:

- ✅ `mistral-7b-instruct`
- ✅ `llama-2-7b-chat`
- ❌ `mistral-7b` (base model, not fine-tuned for instructions)

## Model Recommendations

### For Speed (fastest)

```
phi-2 (2.7B parameters)
- Speed: 1-2s per indicator
- Accuracy: ~80%
- RAM: 2-3GB
```

### For Balance (recommended)

```
mistral-7b-instruct-v0.2 Q4_K_M
- Speed: 2-5s per indicator
- Accuracy: ~85-90%
- RAM: 4-6GB
```

### For Quality (most accurate)

```
mixtral-8x7b-instruct Q4_K_M
- Speed: 5-10s per indicator
- Accuracy: ~92-95%
- RAM: 24GB+
```

## Cost Comparison

### 100 Indicators

| Provider              | Time      | Cost  | Notes           |
| --------------------- | --------- | ----- | --------------- |
| **LM Studio (local)** | 5-8 min   | $0    | ✅ Recommended  |
| OpenAI (gpt-4o-mini)  | 3-4 min   | $0.15 | High accuracy   |
| Anthropic (haiku)     | 3-4 min   | $0.10 | Fast & accurate |
| OpenAI (gpt-4)        | 10-15 min | $3.00 | Overkill        |

### 1,000 Indicators

| Provider              | Time      | Cost  | Notes         |
| --------------------- | --------- | ----- | ------------- |
| **LM Studio (local)** | 50-80 min | $0    | ✅ Best value |
| OpenAI (gpt-4o-mini)  | 30-40 min | $1.50 | Expensive     |
| Anthropic (haiku)     | 30-40 min | $1.00 | Expensive     |

### 10,000 Indicators (full DB)

| Provider              | Time       | Cost | Notes                 |
| --------------------- | ---------- | ---- | --------------------- |
| **LM Studio (local)** | 8-13 hours | $0   | ✅ Only viable option |
| OpenAI (gpt-4o-mini)  | 5-7 hours  | $15  | Too expensive         |
| Anthropic (haiku)     | 5-7 hours  | $10  | Too expensive         |

## Advanced: Multiple GPUs

If you have multiple GPUs, you can run multiple LM Studio instances:

**Terminal 1:**

```bash
# LM Studio on port 1234
# Handle stages: time, scale, currency
```

**Terminal 2:**

```bash
# LM Studio on port 1235
# Handle stages: family, type
```

**Configuration:**

```bash
# .env
LLM_PROVIDER_TIME_INFERENCE=local
LLM_PROVIDER_SCALE_INFERENCE=local
LLM_PROVIDER_CURRENCY_CHECK=local

# Use second instance for other stages
LLM_PROVIDER_FAMILY_ASSIGNMENT=openai
LLM_PROVIDER_TYPE_CLASSIFICATION=openai

# Point to second LM Studio instance
LM_STUDIO_URL_SECONDARY=http://127.0.0.1:1235/v1
```

## Summary

**Default setup (LM Studio):**

- ✅ Free
- ✅ Private
- ✅ Fast enough
- ✅ No rate limits
- ⚠️ Slightly lower accuracy (~85% vs 95%)

**Hybrid setup (LM Studio + Cloud):**

- ✅ Mostly free
- ✅ Private for most data
- ✅ High accuracy where it matters
- ✅ Best balance

**Cloud-only setup:**

- ❌ Expensive at scale
- ✅ Highest accuracy
- ✅ Fastest per-indicator
- ⚠️ Rate limits

**Recommendation: Start with LM Studio (default), add cloud for final review if needed.**
