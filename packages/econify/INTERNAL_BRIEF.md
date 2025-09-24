# Econify Internal Brief

Audience: product/engineering management. What Econify does, how it decides
targets, and how to interpret outputs.

## TL;DR

- We ingest economic series, classify them (monetary/percent/count/physical),
  normalize currency (FX), magnitude (k/M/B), and time basis (per
  month/quarter/year) for comparability.
- Auto‑targeting by indicator chooses majority units per indicator (currency,
  magnitude, time) or applies tie‑breakers when silent.
- Time basis when unit is silent (actual code): unit time token →
  item.periodicity; auto‑target tie‑breaker still prefer‑month when no majority.
  No indicator.periodicity fallback today.
- Explain metadata shows what was selected, why, and the exact conversions
  applied. Share keys are canonicalized (USD, millions, month).

---

## Flow diagram

```mermaid
flowchart TD
  A([Start: Economic items]) --> B[Validate schema]
  B --> C[Parse units and metadata]
  C --> D{Exempted by rules?}
  D -- Yes --> Z1[Bypass and attach explain] --> Z[Output normalized items]
  D -- No --> E{Is wages?}
  E -- Yes --> W[Wages specialization] --> F
  E -- No --> F[Classify: monetary, percent, count, physical]
  F --> G[Currency classification]
  G --> H{Monetary?}
  H -- Yes --> I[FX normalize to targetCurrency] --> K
  H -- No --> K
  subgraph Time_basis_selection
    direction LR
    K{Determine source time basis}
    K --> T1{Unit has time token?}
    T1 -- Yes --> B1[Use unit time]
    T1 -- No --> T2{item.periodicity present?}
    T2 -- Yes --> B2[Use item.periodicity]
    T2 -- No --> B3[No time source available]
  end
  B1 --> L
  B2 --> L
  B3 --> L
  subgraph Auto_target_by_indicator
    direction TB
    L --> AT{autoTargetByIndicator?}
    AT -- No --> AT0[Use explicit targets]
    AT -- Yes --> AT1[Group by indicatorKey]
    AT1 --> AT2[Compute shares: currency, magnitude, time]
    AT2 --> AT3{Majority >= threshold?}
    AT3 -- Yes --> AT4[Selected equals majority]
    AT3 -- No --> AT5[Use tie breakers]
    AT4 --> AT6[Selected targets per indicator]
    AT5 --> AT6
  end
  AT0 --> N
  AT6 --> N
  subgraph Normalize_values
    direction TB
    N --> NM1[Magnitude scaling]
    NM1 --> NM2[Time conversion]
    NM2 --> NM3[Rebuild normalized unit]
  end
  NM3 --> X[Explain metadata]
  X --> X1[Original vs normalized; conversions]
  X1 --> X2[Target selection: selected, shares, reason]
  X2 --> X3[releaseCadence from indicator.periodicity]
  X3 --> Z
```

---

## Classification: stock, flow, counts

- Monetary: values with a currency (e.g., USD Million). Subject to FX and
  magnitude/time normalization.
- Percent: dimensionless (%, pp). FX skipped; magnitude/time usually N/A.
- Counts: units like Units, Thousand Units, people. No FX; magnitude scaling may
  apply.
- Physical: barrels, tons, kWh, etc. No FX unless combined with currency in
  compound rates.
- Wages: specialized path (normalized to currency per month; your defaults
  prefer monthly display).

## Currency handling

- Detection: from unit tokens, explicit currency_code, or metadata.
- Conversion: FX to targetCurrency (e.g., USD) using live or fallback rates.
- Output: normalized currency + magnitude + time forms a canonical unit string.

## Time basis selection (when unit is silent) — actual code today

Priority order:

1. Use explicit unit time token if present (per month/quarter/year).
2. Else, use item.periodicity if populated (Monthly/Quarterly/Yearly).
3. Else, auto-target tie-breaker selects "month" (hardcoded prefer-month).

Notes:

- There is no indicator.periodicity fallback implemented today.
- Tie-breaker does not use pipeline targetTimeScale.
- When normalizing a single item and targetTimeScale is set but no source time
  is available (no unit token and no item.periodicity), the value is NOT
  time-converted; we only set the normalized unit to include per targetTimeScale
  and emit a warning. Explain metadata sets periodicity.adjusted=false with
  description "No source time scale available".

### Micro-flow: Auto-target time basis

```mermaid
flowchart TD
  A([Start - items in indicator group]) --> P[Collect time tokens per item]
  P --> T1{Unit has time token?}
  T1 -- Yes --> U1[Use unit time]
  T1 -- No --> T2{item.periodicity present?}
  T2 -- Yes --> U2[Use item.periodicity]
  T2 -- No --> U3[No time source available; skip for shares]
  U1 --> Q[Compute time shares from available tokens only]
  U2 --> Q
  U3 --> Q
  Q --> R{Majority share >= minMajorityShare?}
  R -- Yes --> S[Select majority time]
  R -- No --> T[Apply time tie breaker; prefer month]
  S --> U[Selected time for indicator]
  T --> U
  U --> N1[Note: targetTimeScale config is not used in time tie breaker]
```

Note: This precedence reflects current code in computeAutoTargets
(auto-targeting). Per-item normalization prefers unit time token over
item.periodicity.

### Micro-flow: Per-item time normalization

```mermaid
flowchart TD
  %% Per-item time normalization micro-flow
  classDef step fill:#f7f7f7,stroke:#bbb,rx:6,ry:6,color:#111;
  classDef decision fill:#fff3cd,stroke:#f0ad4e,rx:6,ry:6,color:#5a4b00;
  classDef note fill:#eef7ff,stroke:#5b9bd5,rx:6,ry:6,color:#0b3d91;

  A([Start - item value, unit, optional periodicity]):::step --> B[Parse unit time token]:::step
  B --> C[explicitTimeScale = item.periodicity normalized]:::step
  C --> D[effectiveTime = unit time or explicitTimeScale]:::step
  D --> E{targetTimeScale provided?}:::decision
  E -- No --> Z0[No time conversion - keep original]:::step
  E -- Yes --> F{effectiveTime exists?}:::decision
  F -- Yes --> G{effectiveTime equals target?}:::decision
  G -- Yes --> Z1[No conversion needed]:::step
  G -- No --> Z2[Rescale time value to targetTimeScale]:::step
  F -- No --> Z3[No source time available - do not convert - warn]:::step
  Z0 --> H[Build normalized unit using targetTimeScale if provided]:::step
  Z1 --> H
  Z2 --> H
  Z3 --> H
  H --> N1[Explain metadata - periodicity.original from effectiveTime if present]:::note
  N1 --> N2[If original missing - adjusted false - description: No source time scale available]:::note
```

## Auto‑target by indicator

- Purpose: make rows within the same indicator comparable by selecting a common
  target per indicator.
- Dimensions: currency, magnitude, time (each can be included/excluded). Common
  config is force currency globally and auto‑target magnitude+time.
- Shares: we compute shares per dimension across the indicator’s items.
- Selection:
  - If a majority ≥ minMajorityShare exists, choose it.
  - Otherwise use tie‑breakers (e.g., magnitude prefer‑millions, time
    prefer‑month).
- Gating: allowList/denyList to control which indicators are auto‑targeted.
- Explain: includes selected, shares (keys normalized to USD, millions, month,
  …), and reason.

### Micro-flow: Auto-target selection (currency, magnitude, time)

```mermaid
flowchart TD
  A([Start - dataset]) --> B[Filter monetary items]
  B --> C[Apply allowList/denyList]
  C --> D[Group by indicator key]
  D --> E[Count tokens per dimension]
  E --> F[Compute shares per dimension]
  F --> C1{Currency majority >= minShare?}
  C1 -- Yes --> C2[Select majority currency]
  C1 -- No --> C3[Currency tie breaker: targetCurrency -> USD -> none]
  C2 --> M1{Magnitude majority >= minShare?}
  C3 --> M1
  M1 -- Yes --> M2[Select majority magnitude]
  M1 -- No --> M3[Magnitude tie breaker: prefer millions]
  M2 --> T1{Time majority >= minShare?}
  M3 --> T1
  T1 -- Yes --> T2[Select majority time]
  T1 -- No --> T3[Time tie breaker: prefer month]
  T2 --> O[Auto-targets + shares + reason]
  T3 --> O
```

## Normalization steps

1. Magnitude scaling (thousands ↔ millions ↔ billions).
2. Time conversion (year ↔ quarter ↔ month) using consistent factors.
3. Unit reconstruction and metadata emission.

## Explain metadata highlights

- original vs normalized units
- conversion steps and factors (e.g., year → month ÷12)
- targetSelection: selected values, shares, reason, indicatorKey
- releaseCadence: DB‑level periodicity for clarity
- share keys canonicalized: USD/EUR/JPY; thousands/millions/billions;
  month/quarter/year

## Examples from staging (indicator → units, periodicity)

| Indicator         | Units                  | Periodicity                                         |
| ----------------- | ---------------------- | --------------------------------------------------- |
| GDP               | USD Billion            | Yearly                                              |
| Balance of Trade  | USD Million            | Monthly/Quarterly/Yearly (varies by country/source) |
| API Crude Imports | BBL/1Million           | Weekly                                              |
| Auto Exports      | Thousand Units / Units | Monthly                                             |

## Typical configuration (force USD, auto‑target magnitude+time)

```ts
const options: PipelineOptions = {
  targetCurrency: "USD",
  autoTargetByIndicator: true,
  autoTargetDimensions: ["magnitude", "time"],
  indicatorKey: "name",
  minMajorityShare: 0.6,
  tieBreakers: { magnitude: "prefer-millions", time: "prefer-month" },
  explain: true,
};
```

## Fallback recommendation

Enable or adopt the fallback to indicator.periodicity when:

- Unit lacks a time token and item.periodicity is missing.
- This avoids arbitrary tie‑breaks and aligns GDP‑like series to “year”.

## Contact

For adjustments (e.g., prefer‑year tie‑breaker, business‑specific defaults),
contact the Econify maintainers.
