# Workflows V2 Guard and Action Naming Conventions

This document establishes consistent naming patterns for XState guards and
actions across the Workflows V2 architecture.

## Guard Naming Conventions

### Pattern: `{verb}{Subject}` or `{predicate}{Subject}`

Guards should be named as boolean predicates that clearly indicate what
condition they're checking.

### Core Guards

#### Data Presence Guards

- `hasItems` - Check if a bucket/collection has items to process
- `noItems` - Inverse of hasItems (use sparingly, prefer `!hasItems`)
- `hasConfigTargetTime` - Check if config specifies a target time scale
- `hasConfigTargetCurrency` - Check if config specifies a target currency
- `hasConfigTargetScale` - Check if config specifies a target magnitude scale

#### Feature Toggle Guards

- `autoTargetEnabled` - Check if auto-targeting is enabled in config
- `explainEnabled` - Check if explain metadata generation is enabled
- `useLiveFX` - Check if live FX rates should be used (vs fallback)

#### Domain Classification Guards

- `isMonetaryStock` - Item classified as monetary stock indicator
- `isMonetaryFlow` - Item classified as monetary flow indicator
- `isCounts` - Item classified as counts/quantities
- `isPercentages` - Item classified as percentage/ratio
- `isIndices` - Item classified as index/score
- `isRatios` - Item classified as ratio/rate
- `isEnergy` - Item classified as energy domain
- `isCommodities` - Item classified as commodities domain
- `isAgriculture` - Item classified as agriculture domain
- `isMetals` - Item classified as metals domain
- `isCrypto` - Item classified as crypto domain

#### Processing State Guards

- `hasErrors` - Check if processing errors exist
- `needsConversion` - Check if currency/time/scale conversion is needed
- `hasMajorityTime` - Check if time scale majority was detected
- `hasMajorityCurrency` - Check if currency majority was detected
- `hasMajorityScale` - Check if magnitude scale majority was detected

#### Threshold Guards

- `exceedsThreshold` - Check if dominance threshold is exceeded (e.g., 80%)
- `meetsMinimumItems` - Check if minimum item count is met for processing

### Guard Implementation Guidelines

1. **Pure Functions**: Guards must be pure functions with no side effects
2. **Context Access**: Access context via `({ context }) => boolean`
3. **Event Access**: Access events via `({ event }) => boolean` when needed
4. **Descriptive Names**: Names should be self-documenting
5. **Boolean Return**: Always return explicit boolean values

## Action Naming Conventions

### Pattern: `{verb}{Object}` or `{verb}{Object}{Qualifier}`

Actions should be named as imperative verbs that clearly indicate what operation
they perform.

### Core Actions

#### Data Transformation Actions

- `assignItems` - Assign items to context
- `assignBuckets` - Assign classification buckets to context
- `assignTargets` - Assign normalization targets to context
- `assignResults` - Assign processing results to context
- `assignExplain` - Assign explain metadata to context
- `assignErrors` - Assign error information to context

#### Processing Actions

- `computeFacts` - Compute classification facts for items
- `splitExemptions` - Separate exempted items from processing
- `bucketByTaxonomy` - Group items by domain classification
- `inferTimeBasis` - Infer time scale from item units
- `selectTargets` - Select normalization targets (currency/scale/time)
- `processItems` - Process items through domain-specific logic
- `mergeResults` - Merge results from multiple processing branches
- `enhanceExplain` - Enhance explain metadata with additional fields

#### State Management Actions

- `clearErrors` - Clear error state
- `resetContext` - Reset context to initial state
- `logProgress` - Log processing progress (for debugging)
- `validateInput` - Validate input data structure

#### FX and External Actions

- `fetchFXRates` - Fetch foreign exchange rates
- `assignFXRates` - Assign FX rates to context
- `assignFXSource` - Assign FX source information to context

### Action Implementation Guidelines

1. **Immutable Updates**: Use immer or spread operators for context updates
2. **Single Responsibility**: Each action should have one clear purpose
3. **Error Handling**: Actions should handle errors gracefully
4. **Context Mutation**: Use `assign()` for context updates
5. **Side Effects**: Minimize side effects; prefer pure transformations

## Naming Examples

### Good Guard Names

```typescript
// Clear, boolean predicates
hasItems: (({ context }) => context.items.length > 0);
autoTargetEnabled: (({ context }) => context.config.autoTarget === true);
isMonetaryFlow: (({ context, event }) =>
  event.classification === "monetaryFlow");
exceedsThreshold: (({ context }) => context.dominanceRatio > 0.8);
```

### Good Action Names

```typescript
// Clear, imperative verbs
assignItems: assign({ items: ({ event }) => event.items });
computeFacts: assign({
  facts: ({ context }) => computeClassificationFacts(context.items),
});
inferTimeBasis: assign({
  timeBasis: ({ context }) => inferTimeScale(context.items),
});
enhanceExplain: assign({
  explain: ({ context }) => enhanceWithFXSource(context.explain),
});
```

### Avoid These Patterns

#### Poor Guard Names

```typescript
// Too vague
check: (({ context }) => context.items.length > 0);
validate: (({ context }) => context.config.autoTarget);
process: (({ context }) => context.classification === "monetary");

// Not boolean predicates
getItems: (({ context }) => context.items);
itemCount: (({ context }) => context.items.length);
```

#### Poor Action Names

```typescript
// Too vague
update: assign({ items: ({ event }) => event.items })
handle: assign({ results: ({ context }) => processItems(context.items) })
do: assign({ explain: ({ context }) => enhanceExplain(context.explain) })

// Not imperative
items: assign({ items: ({ event }) => event.items })
results: assign({ results: ({ context }) => processItems(context.items) })
```

## File Organization

### Guard Files

- `src/workflowsV2/shared/guards.ts` - Core reusable guards
- `src/workflowsV2/domains/*/guards.ts` - Domain-specific guards
- `src/workflowsV2/classify/guards.ts` - Classification guards

### Action Files

- `src/workflowsV2/shared/actions.ts` - Core reusable actions
- `src/workflowsV2/domains/*/actions.ts` - Domain-specific actions
- `src/workflowsV2/normalize/actions.ts` - Normalization actions

## Testing Conventions

### Guard Tests

```typescript
describe("hasItems guard", () => {
  it("returns true when items exist", () => {
    const context = { items: [{ id: "test" }] };
    expect(hasItems({ context })).toBe(true);
  });

  it("returns false when no items", () => {
    const context = { items: [] };
    expect(hasItems({ context })).toBe(false);
  });
});
```

### Action Tests

```typescript
describe("assignItems action", () => {
  it("assigns items to context", () => {
    const event = { items: [{ id: "test" }] };
    const result = assignItems({ event });
    expect(result.items).toEqual([{ id: "test" }]);
  });
});
```

## Migration Guidelines

When converting existing conditional logic to guards/actions:

1. **Identify Conditions**: Extract boolean conditions into guards
2. **Extract Side Effects**: Move state changes into actions
3. **Name Consistently**: Apply naming conventions
4. **Test Thoroughly**: Ensure behavior is preserved
5. **Document Changes**: Update machine diagrams and docs

This ensures the V2 architecture maintains consistency and readability across
all state machines.
