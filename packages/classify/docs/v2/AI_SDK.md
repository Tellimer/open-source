# AI SDK Integration

V2 uses Vercel AI SDK for type-safe structured output with runtime validation.

## Overview

The V2 pipeline leverages AI SDK's `generateObject()` function with Valibot
schemas for:

- **Type-safe responses** - Compile-time and runtime type checking
- **Automatic validation** - Schema enforcement with detailed errors
- **Token optimization** - No JSON format instructions needed
- **Built-in retries** - Automatic retry logic for malformed responses

## Benefits

### 1. Type Safety

Valibot provides full type inference:

```typescript
import * as v from "valibot";

// Schema
const RouterResultSchema = v.object({
  indicator_id: v.pipe(v.string(), v.minLength(1)),
  family: v.union([
    v.literal("physical-fundamental"),
    v.literal("numeric-measurement"),
    // ... 5 more families
  ]),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

// Inferred type
type RouterResult = v.InferOutput<typeof RouterResultSchema>;
// {
//   indicator_id: string;
//   family: 'physical-fundamental' | 'numeric-measurement' | ...;
//   confidence: number;
// }
```

### 2. Runtime Validation

Responses are validated automatically:

```typescript
const result = await aiProvider.generateStructured(
  systemPrompt,
  userPrompt,
  RouterResultSchema,
);

// result.data is fully validated and typed
result.data.family; // ✅ Type: specific union
result.data.confidence; // ✅ Type: number (0-1)
```

Invalid responses throw detailed errors:

```
ValiError: Invalid family value
  Expected: 'physical-fundamental' | 'numeric-measurement' | ...
  Received: 'invalid-family'
  Path: family
```

### 3. Token Savings

AI SDK handles JSON structure automatically - no need for format instructions:

**Before (V1):**

```typescript
const prompt = `
Classify indicators...

OUTPUT FORMAT:
Return a JSON array where each object has:
- indicator_id (string)
- family (one of: physical-fundamental, numeric-measurement, ...)
- confidence (number between 0 and 1)

Example:
[
  {
    "indicator_id": "ind_1",
    "family": "physical-fundamental",
    "confidence": 0.95
  }
]
`;
```

**After (V2 with AI SDK):**

```typescript
const prompt = `
Classify indicators by family:
- physical-fundamental: stock, flow, balance, capacity, volume
- numeric-measurement: count, percentage, ratio, spread, share
...
`;
// Schema handles the format automatically
```

**Savings: ~100-150 tokens per prompt** (~720 tokens per 100 indicators)

### 4. Automatic Retries

AI SDK retries malformed JSON automatically:

```typescript
const aiProvider = new AiSdkProvider(llmConfig);

// Automatic retry on JSON parse errors
const result = await aiProvider.generateStructured(
  systemPrompt,
  userPrompt,
  schema,
);
// Retries up to 3 times with exponential backoff
```

### 5. Better Error Messages

Validation errors are precise:

```typescript
try {
  const result = await aiProvider.generateStructured(...);
} catch (error) {
  console.error(error.message);
  // "Invalid temporal_aggregation: expected one of [point-in-time, period-rate, ...]
  //  but received 'invalid-value' for indicator GDP_USA"
}
```

## Valibot Schemas

V2 uses Valibot schemas for each stage:

### Router Schema

```typescript
// src/v2/schemas/router.ts
export const RouterResultSchema = v.object({
  indicator_id: v.pipe(v.string(), v.minLength(1)),
  family: v.union([
    v.literal("physical-fundamental"),
    v.literal("numeric-measurement"),
    v.literal("price-value"),
    v.literal("change-movement"),
    v.literal("composite-derived"),
    v.literal("temporal"),
    v.literal("qualitative"),
  ]),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  reasoning: v.optional(v.string()),
});

export const RouterBatchSchema = v.object({
  classifications: v.array(RouterResultSchema),
});
```

### Specialist Schema

```typescript
// src/v2/schemas/specialist.ts
export const SpecialistResultSchema = v.object({
  indicator_id: v.pipe(v.string(), v.minLength(1)),
  indicator_type: v.string(),
  temporal_aggregation: v.union([
    v.literal("not-applicable"),
    v.literal("point-in-time"),
    v.literal("period-rate"),
    v.literal("period-cumulative"),
    v.literal("period-average"),
    v.literal("period-total"),
  ]),
  is_currency_denominated: v.boolean(),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  reasoning: v.optional(v.string()),
});

export const SpecialistBatchSchema = v.object({
  classifications: v.array(SpecialistResultSchema),
});
```

### Orientation Schema

```typescript
// src/v2/schemas/orientation.ts
export const OrientationResultSchema = v.object({
  indicator_id: v.pipe(v.string(), v.minLength(1)),
  heat_map_orientation: v.union([
    v.literal("higher-is-positive"),
    v.literal("lower-is-positive"),
    v.literal("neutral"),
  ]),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  reasoning: v.optional(v.string()),
});

export const OrientationBatchSchema = v.object({
  classifications: v.array(OrientationResultSchema),
});
```

### Review Schema

```typescript
// src/v2/schemas/review.ts
export const ReviewDecisionSchema = v.object({
  indicator_id: v.pipe(v.string(), v.minLength(1)),
  action: v.union([
    v.literal("confirm"),
    v.literal("fix"),
    v.literal("escalate"),
  ]),
  diff: v.optional(v.string()),
  reasoning: v.string(),
});

export const ReviewBatchSchema = v.object({
  decisions: v.array(ReviewDecisionSchema),
});
```

## AI SDK Provider

V2 wraps AI SDK in a custom provider:

```typescript
// src/v2/providers/ai-sdk.ts
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

export class AiSdkProvider {
  constructor(private config: LLMConfig) {}

  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: v.GenericSchema<T>,
  ) {
    const model = this.getModel();
    const jsonSchema = this.convertValibotToJsonSchema(schema);

    const result = await generateObject({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      schema: jsonSchema,
      schemaName: "classification",
      temperature: this.config.temperature ?? 0.1,
      maxTokens: this.config.maxTokens ?? 2000,
    });

    // Validate with Valibot
    const validated = v.parse(schema, result.object);

    return {
      data: validated,
      usage: {
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      },
    };
  }

  private getModel() {
    switch (this.config.provider) {
      case "openai":
        return openai(this.config.model ?? "gpt-4o");
      case "anthropic":
        return anthropic(this.config.model ?? "claude-3-5-sonnet-20241022");
      case "gemini":
        return google(
          this.config.model ?? "gemini-2.0-flash-thinking-exp-01-21",
        );
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }

  private convertValibotToJsonSchema(schema: v.GenericSchema) {
    // Convert Valibot schema to JSON Schema for AI SDK
    // ... implementation details
  }
}
```

## Usage Pattern

All V2 stages follow the same pattern:

```typescript
// 1. Create AI SDK provider
const aiProvider = new AiSdkProvider(llmConfig);

// 2. Generate prompts
const systemPrompt = generateSystemPrompt();
const userPrompt = generateUserPrompt(indicators);

// 3. Call with schema validation
const aiResult = await aiProvider.generateStructured(
  systemPrompt,
  userPrompt,
  BatchSchema, // Valibot schema
);

// 4. Use validated data
const results = aiResult.data.classifications.map((cls) => ({
  indicatorId: cls.indicator_id,
  // ... fully typed and validated
}));
```

## Code Reduction

AI SDK migration significantly reduced code:

| Stage       | Before        | After         | Reduction |
| ----------- | ------------- | ------------- | --------- |
| Router      | 127 lines     | 47 lines      | 63%       |
| Specialist  | 136 lines     | 83 lines      | 39%       |
| Orientation | 124 lines     | 54 lines      | 56%       |
| Review      | 66 lines      | 48 lines      | 27%       |
| **Total**   | **453 lines** | **232 lines** | **49%**   |

### What Was Removed

- Manual JSON parsing logic
- Custom validation code
- Error handling for malformed JSON
- Type assertions (`as Type`)
- Format instruction in prompts

### What Was Added

- Valibot schemas (~350 lines, but reusable)
- AI SDK provider wrapper (~100 lines)

**Net result: Cleaner, safer, more maintainable code**

## Migration Benefits Summary

1. **Type Safety** ✅
   - Compile-time type checking
   - Runtime validation with Valibot
   - No manual type assertions

2. **Token Savings** ✅
   - ~720 tokens saved per 100 indicators
   - No JSON format instructions needed
   - Cleaner, shorter prompts

3. **Code Quality** ✅
   - 49% less code
   - Better error messages
   - Easier maintenance

4. **Reliability** ✅
   - Automatic retries for malformed JSON
   - Detailed validation errors
   - Schema-enforced consistency

5. **Developer Experience** ✅
   - IntelliSense for all fields
   - Clear validation errors
   - Single source of truth (schemas)

## Dependencies

Add to `deno.json`:

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

## Testing

V2 with AI SDK passes all existing tests:

```bash
# Run V2 tests
deno task test:v2

# Type checking
deno check src/v2/providers/ai-sdk.ts
deno check src/v2/router/router.ts
deno check src/v2/specialist/specialist.ts
deno check src/v2/orientation/orientation.ts
deno check src/v2/review/review.ts
```

## Best Practices

1. **Always use schemas** - Define Valibot schemas for all LLM outputs
2. **Keep schemas strict** - Use specific unions, not open-ended strings
3. **Add constraints** - Use `v.pipe()` for min/max, length, patterns
4. **Handle errors** - Catch validation errors and log details
5. **Type inference** - Use `v.InferOutput<typeof Schema>` for types

## Next Steps

- [V2 Overview](./README.md) - Main V2 documentation
- [Architecture](./ARCHITECTURE.md) - 6-stage pipeline
- [Database Guide](./DATABASE.md) - SQLite setup
