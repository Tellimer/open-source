# Monetary Domain Pipeline

The monetary domain pipeline handles all currency-related indicators including
GDP, debt, trade balances, and wages. This unified pipeline eliminates the
arbitrary separation between wages and other monetary flows that existed in V1.

## Architecture

```mermaid
graph TD
  IN[Monetary Items] --> TB{hasConfigTargetTime?}
  TB -->|Yes| TGT[Targets Machine]
  TB -->|No| TBI[Time Basis Inference]
  TBI --> TGT
  TGT --> TGT_DECIDE{autoTargetEnabled?}
  TGT_DECIDE -->|Yes| AT[Auto-targeting Logic]
  TGT_DECIDE -->|No| CONFIG[Use Config Values]
  AT --> BATCH[Batch Processing]
  CONFIG --> BATCH
  BATCH --> OUT[Monetary Output]

  subgraph "Router Level"
    OUT --> FANIN[Fan-in with other domains]
    FANIN --> EXPLAIN[Explain Enrichment]
    EXPLAIN --> FINAL[Final Output]
  end
```

## State Machines

### Time Basis Machine (`time_basis.machine.ts`)

Determines the time scale for monetary flow indicators.

**States:**

- `prepare` → `inferTimeBasis` → `done`

**Logic:**

1. Check for explicit time scale in config
2. Infer from unit time tokens (per year, per month, etc.)
3. Apply majority inference across items
4. Fall back to prefer-month tie-breaker

```mermaid
stateDiagram-v2
  [*] --> prepare
  prepare --> inferTimeBasis
  inferTimeBasis --> done: time basis determined
  done --> [*]
```

### Auto Target Machine (`targets.machine.ts`)

Automatically determines target currency and magnitude based on majority rules
with configurable dominance thresholds.

#### 🎯 Purpose

The auto-targeting machine analyzes input data to determine optimal
normalization targets by finding majority patterns in currencies and scales,
enabling automatic standardization of mixed-currency datasets.

#### 🔧 Algorithm: Mode Function

The core logic uses a `mode()` function that:

1. **Counts occurrences** of each value (currency/scale) across all items
2. **Calculates ratio** = most_frequent_count / total_items
3. **Returns** the most frequent value and its dominance ratio

#### ⚖️ Decision Logic

**Auto-targeting Path** (`autoTargetByIndicator: true`):

- **Currency**: Use majority if ratio ≥ threshold (default 0.8), else fallback
  to config
- **Scale**: Use majority if ratio ≥ threshold, else fallback to config or
  "millions"
- **Time**: Always use `prefer` parameter (from time_basis) or config

**Config Path** (`autoTargetByIndicator: false`):

- **Currency**: `config.targetCurrency`
- **Scale**: `config.targetMagnitude ?? "millions"`
- **Time**: `prefer ?? config.targetTimeScale`

#### 📊 Example Scenarios

**Scenario 1: Strong Majority (ratio ≥ 0.8)**

- Input: 10 items, 9 in EUR, 1 in USD
- Currency ratio: 9/10 = 0.9 ≥ 0.8 → **Select EUR**

**Scenario 2: No Clear Majority (ratio < 0.8)**

- Input: 10 items, 5 in EUR, 3 in USD, 2 in GBP
- Currency ratio: 5/10 = 0.5 < 0.8 → **Fallback to config.targetCurrency**

**Scenario 3: Mixed Scales**

- Input: 8 items in millions, 2 in thousands
- Scale ratio: 8/10 = 0.8 ≥ 0.8 → **Select "millions"**

#### State Machine Flow

```mermaid
graph TD
    START[Input: items, config, prefer, threshold] --> DECIDE{autoTargetByIndicator?}

    DECIDE -->|true| AUTO[Auto-targeting Logic]
    DECIDE -->|false| CONFIG[Use Config Values]

    subgraph AUTO_LOGIC [Auto-targeting Process]
        AUTO --> EXTRACT[Extract from items]
        EXTRACT --> CURR[currencies = extractCurrency per item]
        EXTRACT --> SCALE[scales = extractScale per item]

        CURR --> MODE_CURR[mode function on currencies]
        SCALE --> MODE_SCALE[mode function on scales]

        MODE_CURR --> CURR_CHECK{currency ratio >= threshold?}
        MODE_SCALE --> SCALE_CHECK{scale ratio >= threshold?}

        CURR_CHECK -->|yes| USE_MAJORITY_CURR[Use majority currency]
        CURR_CHECK -->|no| USE_CONFIG_CURR[Use config.targetCurrency]

        SCALE_CHECK -->|yes| USE_MAJORITY_SCALE[Use majority scale]
        SCALE_CHECK -->|no| USE_CONFIG_SCALE[Use config.targetMagnitude or 'millions']

        USE_MAJORITY_CURR --> COMBINE
        USE_CONFIG_CURR --> COMBINE
        USE_MAJORITY_SCALE --> COMBINE
        USE_CONFIG_SCALE --> COMBINE[Combine selections]

        COMBINE --> TIME_SELECT[time = prefer ?? config.targetTimeScale]
        TIME_SELECT --> AUTO_DONE[Auto selection complete]
    end

    subgraph CONFIG_LOGIC [Config Values Process]
        CONFIG --> CONFIG_CURR[currency = config.targetCurrency]
        CONFIG --> CONFIG_SCALE[magnitude = config.targetMagnitude ?? 'millions']
        CONFIG --> CONFIG_TIME[time = prefer ?? config.targetTimeScale]

        CONFIG_CURR --> CONFIG_DONE
        CONFIG_SCALE --> CONFIG_DONE
        CONFIG_TIME --> CONFIG_DONE[Config selection complete]
    end

    AUTO_DONE --> DONE[Final state with selected targets]
    CONFIG_DONE --> DONE

    DONE --> OUTPUT[Output: TargetsSelection]
```

#### 💡 Key Design Decisions

1. **Threshold-based**: Uses 80% dominance threshold to ensure clear majority
2. **Graceful Fallback**: Always has config values as backup
3. **Time Preference**: Respects time_basis machine output over config
4. **Stateless Logic**: All computation happens in entry action, then
   immediately transitions to done

### Monetary Machine (`monetary.machine.ts`)

Orchestrates the complete monetary processing pipeline with explicit state
transitions.

**Flow:**

1. Time basis inference (conditional on config)
2. Auto-targeting (if enabled) or config values
3. Batch normalization with FX conversion

**Note**: Explain metadata enrichment happens at the router level after all
domains complete, not within the monetary machine.

```mermaid
graph TD
  START[Monetary Input] --> TB_DECIDE{hasConfigTargetTime?}
  TB_DECIDE -->|yes| TARGETS[targets state]
  TB_DECIDE -->|no| TB_INFER[timeBasis.infer]
  TB_INFER --> TB_DONE[timeBasis.done]
  TB_DONE --> TARGETS

  TARGETS --> TGT_DECIDE{autoTargetEnabled?}
  TGT_DECIDE -->|yes| TGT_AUTO[targets.auto]
  TGT_DECIDE -->|no| TGT_CONFIG[targets.useConfig]
  TGT_AUTO --> TGT_DONE[targets.done]
  TGT_CONFIG --> TGT_DONE

  TGT_DONE --> BATCH[batch state]
  BATCH --> BATCH_INVOKE[invoke batch actor]
  BATCH_INVOKE --> DONE[done state]
  DONE --> OUTPUT[Monetary Output]
```

## Key Features

### Unified Processing

- **Wages**: Treated as monetary flow indicators (no special handling)
- **GDP/Debt**: Processed as monetary stock indicators
- **Trade**: Processed based on flow/stock classification

### Time Scale Handling

- **Flow Indicators**: Apply time basis conversion (wages, trade flows)
- **Stock Indicators**: No time conversion (GDP, debt levels)
- **Automatic Detection**: Infers flow vs stock from indicator semantics

### Auto-Targeting

- **Currency**: Majority currency becomes target (e.g., 80% EUR → target EUR)
- **Magnitude**: Majority magnitude becomes target (e.g., 70% millions → target
  millions)
- **Tie-Breaking**: Configurable preferences for ambiguous cases

### Explain Metadata

- **FX Source**: Tracks whether live or fallback rates were used
- **Conversion Steps**: Detailed breakdown of currency, magnitude, and time
  conversions
- **Provenance**: Records auto-target decisions and majority calculations

## Usage Example

```typescript
import { createActor } from "xstate";
import { monetaryMachine } from "./monetary.machine.ts";

const actor = createActor(monetaryMachine, {
  input: {
    items: [
      { value: 35000, unit: "GBP per year", id: "wage-uk" },
      { value: 25000, unit: "USD billions", id: "gdp-usa" },
    ],
    config: {
      targetCurrency: "USD",
      targetMagnitude: "millions",
      targetTimeScale: "month",
      autoTargetByIndicator: false,
      fxRates: { GBP: 1.25 },
    },
  },
});

actor.start();
```

## Testing

The monetary pipeline is comprehensively tested with:

- Wage normalization scenarios
- Mixed currency datasets
- Auto-targeting behavior
- FX rate application
- Time basis inference
- Explain metadata generation

See `../../workflowsV2_test.ts` for complete test coverage.

## Migration from V1

### Key Changes

1. **Wages Integration**: No separate wages machine - wages processed as
   monetary flows
2. **Unified Explain**: Consistent explain metadata across all monetary
   indicators
3. **Auto-Targeting**: Enhanced auto-targeting with configurable tie-breakers
4. **Performance**: Faster processing through explicit state transitions

### Compatibility

- Input format remains the same
- Output structure enhanced with V2 explain metadata
- All V1 functionality preserved with improved semantics
