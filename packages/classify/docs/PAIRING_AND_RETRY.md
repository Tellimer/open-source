# Indicator Pairing & Retry System

This document explains how the classify package ensures proper pairing between
requests and responses, with robust retry logic for failed indicators.

## Problem Statement

When classifying multiple indicators with an LLM, several issues can occur:

1. **Response Mismatch**: LLM might return responses in wrong order or skip
   indicators
2. **Partial Failures**: Some indicators might fail while others succeed
3. **Schema Violations**: LLM might return invalid data for specific indicators
4. **No Error Tracking**: Need to know which indicators failed and why

## Solution: ID-Based Pairing with Retry Logic

### 1. Automatic ID Generation

Every indicator gets a unique ID (auto-generated if not provided):

```typescript
function ensureIndicatorId(indicator: Indicator, index: number): Indicator {
  if (indicator.id) {
    return indicator;
  }
  return {
    ...indicator,
    id: `ind_${index + 1}_${Date.now()}_${
      Math.random().toString(36).substr(2, 9)
    }`,
  };
}
```

**Benefits:**

- Unique identification for each indicator
- Supports user-provided IDs or auto-generation
- Timestamp + random component ensures uniqueness

### 2. ID Inclusion in LLM Request

The system prompt explicitly requires indicator_id in responses:

```
CRITICAL VALIDATION RULES:
- indicator_id MUST be included and match the ID from the request
- This is critical for pairing responses with requests
```

User prompt includes IDs:

```
Indicator 1:
- ID: ind_1_1234567890_abc123
- Name: GDP
- Units: USD billions
...
```

### 3. Response Validation

Every classification response is validated to include indicator_id:

```typescript
// Validate indicator_id
if (
  typeof classification.indicator_id !== "string" ||
  !classification.indicator_id
) {
  throw new Error(
    `Classification ${idx + 1} is missing or has invalid indicator_id`,
  );
}
```

### 4. Map-Based Pairing

Responses are paired with requests using a Map for O(1) lookup:

```typescript
// Create a map for quick lookup
const classificationMap = new Map<string, ClassifiedMetadata>();
for (const classification of classifications) {
  classificationMap.set(classification.indicator_id, classification);
}

// Pair classifications with indicators
return indicatorsWithIds.map((indicator) => {
  const classification = classificationMap.get(indicator.id!);
  if (!classification) {
    throw new Error(
      `No classification found for indicator ID: ${indicator.id}`,
    );
  }
  return {
    ...indicator,
    classification,
  };
});
```

**Benefits:**

- Order-independent pairing
- Handles missing responses
- Fast O(1) lookup
- Clear error messages

### 5. Individual Indicator Retry Logic

Failed indicators are retried up to 3 times (configurable):

```typescript
async function classifySingleIndicatorWithRetry(
  indicator: Indicator,
  config: LLMConfig,
  maxRetries: number = 3,
): Promise<{
  success: boolean;
  classification?: ClassifiedMetadata;
  error?: string;
  retries: number;
}> {
  let lastError: string = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const classifications = await provider.classify([indicator], config);

      // Validate count
      if (classifications.length !== 1) {
        throw new Error(
          `Expected 1 classification, got ${classifications.length}`,
        );
      }

      // Validate ID match
      if (classification.indicator_id !== indicator.id) {
        throw new Error(
          `Indicator ID mismatch: expected "${indicator.id}", got "${classification.indicator_id}"`,
        );
      }

      return { success: true, classification, retries: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      // Exponential backoff
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    }
  }

  return { success: false, error: lastError, retries: maxRetries };
}
```

**Features:**

- Up to 3 retry attempts per indicator
- Exponential backoff (1s, 2s, 3s)
- Validates response count and ID matching
- Returns detailed result with retry count

### 6. Batch Processing with Fallback

The system tries batch processing first, then falls back to individual retries:

```typescript
try {
  // Try batch processing
  const batchEnriched = await classifyIndicators(batch, config);
  enriched.push(...batchEnriched);
  apiCalls++;
} catch (error) {
  // Batch failed - retry each indicator individually
  for (const indicator of batch) {
    const result = await classifySingleIndicatorWithRetry(
      indicator,
      config,
      maxRetries,
    );

    if (result.success && result.classification) {
      enriched.push({
        ...indicator,
        classification: result.classification,
      });
    } else {
      failed.push({
        indicator,
        error: result.error || "Unknown error",
        retries: result.retries,
      });
    }
  }
}
```

**Strategy:**

1. Try batch (efficient)
2. If batch fails, retry each indicator individually
3. Track retries and errors per indicator
4. Continue processing remaining indicators

### 7. Comprehensive Result Tracking

Results include detailed statistics:

```typescript
interface ClassificationResult {
  enriched: EnrichedIndicator[];
  failed: FailedIndicator[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    successRate: number; // Percentage
  };
  processingTime: number;
  apiCalls: number;
  retries: number;
}

interface FailedIndicator {
  indicator: Indicator;
  error: string;
  retries: number; // How many times we tried
}
```

### 8. Debug Logging

With `debug: true`, get detailed progress:

```
Processing batch 1/3 (10 indicators)
✓ Batch completed successfully

Processing batch 2/3 (10 indicators)
✗ Batch failed, retrying indicators individually: Invalid JSON
  ✓ GDP (after 1 retry)
  ✓ Unemployment Rate
  ✗ Invalid Indicator: Schema validation failed (failed after 3 retries)
  ✓ Inflation Rate (after 2 retries)
  ...

============================================================
CLASSIFICATION SUMMARY
============================================================
Total indicators:        25
✓ Successfully classified: 23
✗ Failed:                  2
Success rate:            92.0%
API calls made:          15
Retries performed:       8
Processing time:         12450ms
============================================================
```

## Usage Examples

### Basic Usage (Auto-Generated IDs)

```typescript
const indicators = [
  { name: "GDP", units: "USD billions" },
  { name: "Unemployment Rate", units: "%" },
];

const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: {
    provider: "openai",
    apiKey: "sk-...",
  },
  maxRetries: 3,
  debug: true,
});

console.log(`Success rate: ${result.summary.successRate}%`);
console.log(`Failed indicators: ${result.failed.length}`);

for (const failed of result.failed) {
  console.log(
    `- ${failed.indicator.name}: ${failed.error} (${failed.retries} retries)`,
  );
}
```

### With Custom IDs

```typescript
const indicators = [
  { id: "gdp_2024", name: "GDP", units: "USD billions" },
  { id: "unemp_2024", name: "Unemployment Rate", units: "%" },
];

const enriched = await classifyIndicators(indicators, config);

// Results are paired by ID
console.log(enriched[0].id); // "gdp_2024"
console.log(enriched[0].classification.indicator_id); // "gdp_2024"
```

### Handling Failures

```typescript
const result = await classifyIndicatorsWithOptions(indicators, {
  llmConfig: config,
  maxRetries: 3,
});

// Process successful classifications
for (const indicator of result.enriched) {
  console.log(
    `✓ ${indicator.name}: ${indicator.classification.indicator_type}`,
  );
}

// Handle failures
for (const failed of result.failed) {
  console.error(`✗ ${failed.indicator.name}:`);
  console.error(`  Error: ${failed.error}`);
  console.error(`  Retries: ${failed.retries}`);

  // Optionally retry with different config or log for manual review
}
```

## Benefits

1. **Reliability**: Automatic retries handle transient failures
2. **Traceability**: Every indicator tracked by unique ID
3. **Order Independence**: Responses can be in any order
4. **Partial Success**: Some indicators can succeed while others fail
5. **Detailed Errors**: Know exactly which indicators failed and why
6. **Performance**: Batch processing when possible, individual retries when
   needed
7. **Observability**: Comprehensive statistics and debug logging
8. **Graceful Degradation**: System continues even if some indicators fail

## Error Scenarios Handled

| Scenario                   | Handling                                 |
| -------------------------- | ---------------------------------------- |
| LLM returns wrong order    | ID-based pairing corrects order          |
| LLM skips an indicator     | Detected and retried individually        |
| LLM returns invalid schema | Validation fails, indicator retried      |
| LLM returns wrong ID       | Validation fails, indicator retried      |
| Transient API error        | Exponential backoff retry                |
| Persistent failure         | Logged in failed array after max retries |
| Batch failure              | Fall back to individual processing       |
| Partial batch success      | Not possible - batch is atomic           |

## Configuration

```typescript
interface ClassificationOptions {
  llmConfig: LLMConfig;
  batchSize?: number; // Default: 10
  maxRetries?: number; // Default: 3
  retryDelay?: number; // Not used (exponential backoff)
  includeReasoning?: boolean;
  debug?: boolean; // Enable detailed logging
}
```

## Best Practices

1. **Always check the summary**: Review success rate before using results
2. **Handle failures**: Don't ignore the `failed` array
3. **Use debug mode**: During development to understand behavior
4. **Set appropriate batch size**: Smaller batches = more resilient but slower
5. **Provide custom IDs**: For better traceability in your system
6. **Monitor retry counts**: High retries may indicate LLM issues
7. **Log failed indicators**: For manual review or alternative processing
