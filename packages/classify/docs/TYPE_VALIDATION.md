# Type Validation System

This document explains how the classify package ensures exact, valid type responses from LLMs.

## Problem Statement

When using LLMs for classification, there's a risk that the model might:
- Create variations of type names (e.g., "Stock" instead of "stock")
- Invent new types not in the taxonomy
- Use abbreviations or alternative spellings
- Return malformed or inconsistent responses

## Solution: Multi-Layer Validation

The classify package implements a comprehensive validation system with multiple layers:

### 1. Type System Layer

**Strict TypeScript Types**
```typescript
export type IndicatorType =
  | 'stock' | 'flow' | 'balance' | 'capacity' | 'volume'
  | 'count' | 'percentage' | 'ratio' | 'spread' | 'share'
  | 'price' | 'yield'
  | 'rate' | 'volatility' | 'gap'
  | 'index' | 'correlation' | 'elasticity' | 'multiplier'
  | 'duration' | 'probability' | 'threshold'
  | 'sentiment' | 'allocation'
  | 'other';

export type HeatMapOrientation =
  | 'higher-is-positive'
  | 'lower-is-positive'
  | 'neutral';
```

**Validation Constants**
```typescript
export const VALID_INDICATOR_TYPES: readonly IndicatorType[] = [
  'stock', 'flow', 'balance', 'capacity', 'volume',
  'count', 'percentage', 'ratio', 'spread', 'share',
  'price', 'yield',
  'rate', 'volatility', 'gap',
  'index', 'correlation', 'elasticity', 'multiplier',
  'duration', 'probability', 'threshold',
  'sentiment', 'allocation',
  'other',
] as const;

export const VALID_HEAT_MAP_ORIENTATIONS: readonly HeatMapOrientation[] = [
  'higher-is-positive',
  'lower-is-positive',
  'neutral',
] as const;
```

These constants are:
- **Exported** for use by consumers
- **Readonly** to prevent modification
- **Type-safe** with `as const` assertion
- **Single source of truth** for validation

### 2. LLM Prompt Layer

**Comprehensive Taxonomy**

The system prompt includes:
- Complete list of all 26 indicator types
- Detailed descriptions and examples for each type
- Organized into 7 logical categories
- Decision tree for classification logic

**Explicit Instructions**

```
CRITICAL VALIDATION RULES:
- indicator_type MUST be EXACTLY one of the strings listed above
- heat_map_orientation MUST be EXACTLY "higher-is-positive", "lower-is-positive", or "neutral"
- Do NOT create variations, abbreviations, or new types
- Do NOT use capital letters, spaces, or underscores differently than specified
- If uncertain, use "other" for indicator_type or "neutral" for heat_map_orientation
```

**Example Response Format**

The prompt includes a concrete example showing the exact format expected:
```json
[
  {
    "indicator_type": "flow",
    "is_currency_denominated": true,
    "is_cumulative": false,
    "heat_map_orientation": "higher-is-positive",
    "confidence": 0.95
  }
]
```

### 3. Runtime Validation Layer

**Strict Response Parsing**

```typescript
export function parseClassificationResponse(
  response: string,
  expectedCount: number
): ClassifiedMetadata[] {
  // Parse JSON
  const parsed = JSON.parse(response);
  
  // Validate array length
  if (parsed.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} classifications, got ${parsed.length}`);
  }
  
  // Validate each classification
  return parsed.map((item, idx) => {
    // Validate indicator_type
    if (
      typeof classification.indicator_type !== 'string' ||
      !VALID_INDICATOR_TYPES.includes(classification.indicator_type as never)
    ) {
      throw new Error(
        `Classification ${idx + 1} has invalid indicator_type: "${
          classification.indicator_type
        }". Must be one of: ${VALID_INDICATOR_TYPES.join(', ')}`
      );
    }
    
    // Validate heat_map_orientation
    if (
      typeof classification.heat_map_orientation !== 'string' ||
      !VALID_HEAT_MAP_ORIENTATIONS.includes(classification.heat_map_orientation as never)
    ) {
      throw new Error(
        `Classification ${idx + 1} has invalid heat_map_orientation: "${
          classification.heat_map_orientation
        }". Must be one of: ${VALID_HEAT_MAP_ORIENTATIONS.join(', ')}`
      );
    }
    
    // Validate booleans
    if (typeof classification.is_currency_denominated !== 'boolean') {
      throw new Error(`Classification ${idx + 1} has invalid is_currency_denominated`);
    }
    
    if (typeof classification.is_cumulative !== 'boolean') {
      throw new Error(`Classification ${idx + 1} has invalid is_cumulative`);
    }
    
    // Validate optional confidence
    if (
      classification.confidence !== undefined &&
      (typeof classification.confidence !== 'number' ||
        classification.confidence < 0 ||
        classification.confidence > 1)
    ) {
      throw new Error(`Classification ${idx + 1} has invalid confidence`);
    }
    
    return classification as ClassifiedMetadata;
  });
}
```

**Error Messages**

When validation fails, the error message includes:
- Which classification failed (by index)
- What field is invalid
- The actual value received
- **All valid options** for that field

Example error:
```
Classification 1 has invalid indicator_type: "Stock". 
Must be one of: stock, flow, balance, capacity, volume, count, percentage, 
ratio, spread, share, price, yield, rate, volatility, gap, index, correlation, 
elasticity, multiplier, duration, probability, threshold, sentiment, allocation, other
```

### 4. Test Coverage Layer

**Validation Tests**

```typescript
Deno.test('parseClassificationResponse - validates indicator_type', () => {
  const response = JSON.stringify([
    {
      indicator_type: 'invalid-type', // Should fail
      is_currency_denominated: true,
      is_cumulative: false,
      heat_map_orientation: 'higher-is-positive',
    },
  ]);

  assertThrows(
    () => parseClassificationResponse(response, 1),
    Error,
    'invalid indicator_type'
  );
});

Deno.test('parseClassificationResponse - validates heat_map_orientation', () => {
  const response = JSON.stringify([
    {
      indicator_type: 'flow',
      is_currency_denominated: true,
      is_cumulative: false,
      heat_map_orientation: 'invalid-orientation', // Should fail
    },
  ]);

  assertThrows(
    () => parseClassificationResponse(response, 1),
    Error,
    'invalid heat_map_orientation'
  );
});
```

## Benefits

This multi-layer approach provides:

1. **Type Safety**: TypeScript catches errors at compile time
2. **Runtime Safety**: Validation catches LLM errors at runtime
3. **Clear Errors**: Detailed error messages help debugging
4. **Single Source of Truth**: Constants ensure consistency
5. **Extensibility**: Easy to add new types by updating constants
6. **Documentation**: Types serve as documentation
7. **Testing**: Comprehensive test coverage ensures reliability

## Usage

Consumers can use the validation constants:

```typescript
import { 
  VALID_INDICATOR_TYPES, 
  VALID_HEAT_MAP_ORIENTATIONS,
  type IndicatorType,
  type HeatMapOrientation
} from "@tellimer/classify";

// Check if a type is valid
if (VALID_INDICATOR_TYPES.includes(someType as never)) {
  // Valid type
}

// Get all valid types for UI dropdown
const typeOptions = VALID_INDICATOR_TYPES.map(type => ({
  value: type,
  label: type.charAt(0).toUpperCase() + type.slice(1)
}));

// Type-safe function parameters
function processIndicator(type: IndicatorType) {
  // TypeScript ensures type is valid
}
```

## Maintenance

When adding new indicator types:

1. Update the `IndicatorType` union type in `src/types.ts`
2. Add the new type to `VALID_INDICATOR_TYPES` constant
3. Update the system prompt in `src/providers/base.ts`
4. Add examples and descriptions
5. Update documentation in `README.md`
6. Add test cases for the new type
7. Update `CHANGELOG.md`

The validation system will automatically enforce the new types.

