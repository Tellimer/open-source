# Prompt Improvements Based on 109 Human-Verified Classifications

## Summary

Updated classification prompts with patterns from 109 human-verified classifications to improve accuracy and consistency. The prompts now balance pattern-based guidance with flexibility for country-specific reporting variations.

## Key Principle: Pattern-Based with Data-Driven Overrides

**Default**: Use indicator NAME patterns for consistency (e.g., "GDP" → flow, "Bank Lending Rate" → rate)
**Override**: Let actual data characteristics (units, description, values) override the pattern when country-specific variations exist

## Files Updated

1. `src/services/classify/prompts/type-non-currency.ts` - Non-currency type classification
2. `src/services/classify/prompts/type-currency.ts` - Currency-denominated type classification
3. `src/services/classify/prompts/family.ts` - Family assignment

## Key Improvements

### 1. Common Misclassifications Section (CORRECTED)

Added explicit warnings about the most common mistakes with concrete examples:

#### Interest/Lending Rates

- ❌ WRONG: `indicator_type: ratio` or `percentage`
- ✅ CORRECT: `indicator_type: rate`, `temporal_aggregation: period-average`, `heat_map_orientation: neutral`
- Examples: Bank Lending Rate, Interbank Rate, Interest Rate, Deposit Interest Rate
- Reasoning: Interest rates are PRICE-VALUE rates (cost of capital)

#### Growth Rates (%, YoY, MoM)

- ❌ WRONG: `indicator_type: ratio` or `percentage`
- ✅ CORRECT: `indicator_type: rate`
- Examples: GDP Growth Rate, Industrial Production %, Manufacturing Production %, Mining Production %
- Reasoning: Growth rates are CHANGE-MOVEMENT rates (% change over time)

#### Tax Rates & Social Security Rates

- ❌ WRONG: `indicator_type: percentage`, `temporal_aggregation: not-applicable`
- ✅ CORRECT: `indicator_type: ratio`, `temporal_aggregation: point-in-time`, `heat_map_orientation: neutral`
- Examples: Corporate Tax Rate, Personal Income Tax Rate, Sales Tax Rate, Social Security Rate
- Reasoning: Policy rates are NUMERIC-MEASUREMENT ratios (0-100% bounded)

#### Labor Market Ratios

- ❌ WRONG: `indicator_type: percentage` or `rate`, `temporal_aggregation: not-applicable` or `period-average`
- ✅ CORRECT: `indicator_type: ratio`, `temporal_aggregation: point-in-time`
- Examples: Unemployment Rate, Employment Rate, Labor Force Participation Rate
- Reasoning: NUMERIC-MEASUREMENT ratios expressed as %, snapshot at a point in time

#### Price Indices (CPI, PPI, etc.)

- ❌ WRONG: `indicator_type: index`, `temporal_aggregation: point-in-time`
- ✅ CORRECT: `indicator_type: index`, `temporal_aggregation: period-average`
- Examples: Consumer Price Index, Core Consumer Prices, Producer Prices, Import Prices, Export Prices

#### Population & Employment Counts

- ❌ WRONG: `indicator_type: stock`
- ✅ CORRECT: `indicator_type: count`
- Examples: Population, Employed Persons, Unemployed Persons

### 2. Currency-Denominated Patterns

#### GDP and Economic Output

- ❌ WRONG: `indicator_type: capacity`
- ✅ CORRECT: `indicator_type: flow`
- Examples: GDP, GNI, GDP by sector (Agriculture, Construction, Manufacturing, Services)

#### Flows vs Balances

- ❌ WRONG: Consumer Spending = balance, FDI = balance, Exports = balance, Imports = balance
- ✅ CORRECT: These are all flows (period-total)
- Exception: Trade Balance, Current Account Balance are truly balances

#### Reserves and Financial Stocks

- ❌ WRONG: `indicator_type: stock`
- ✅ CORRECT: `indicator_type: balance`
- Examples: Foreign Exchange Reserves, Official Reserves
- Reasoning: "Stock positions that can theoretically be positive or negative use 'balance' in taxonomy"

#### Money Supply

- ✅ CORRECT: `indicator_type: stock`
- Examples: Money Supply M0, M1, M2, M3

### 3. Enhanced Examples with Verification Markers

All examples now include ✅ markers indicating which patterns were verified from the 109 reference classifications:

```
✅ Bank Lending Rate (5.5%) → ratio + period-average + neutral
  Family: price-value, Type: ratio (NOT rate!)
  Why: Interest rates are ratios expressed as percentages, averaged over the period.
```

### 4. Heat Map Orientation Improvements (CORRECTED)

Enhanced with more context-dependent examples:

**Higher-is-positive:**

- GDP Growth Rate, Employment Rate, Consumer Confidence Index, Capacity Utilization, Export Volumes, Tourist Arrivals

**Lower-is-positive:**

- Unemployment Rate, External Debt, Government Debt to GDP

**Neutral:**

- Interest Rates (affects savers vs borrowers differently)
- ✅ **Inflation Rate** - CORRECTED to neutral (depends on economic conditions and target rates)
- Inflation level indices (reference point, not change)
- Producer Prices level (reference point, higher/lower depends on conditions)
- Tax Rates (revenue vs economic activity tradeoffs)
- Government Spending levels (welfare vs fiscal balance)

### 5. Temporal Aggregation Quick Guide

Updated with verified patterns:

```
✅ Interest/Lending Rates → period-average (averaged over period, NOT point-in-time!)
✅ Growth/Inflation Rates → period-rate (change during period)
✅ Labor Market Ratios → point-in-time (snapshot ratio)
✅ Tax/Policy Rates → point-in-time (policy parameter)
✅ Price Indices (CPI, PPI) → period-average (average price level, NOT point-in-time!)
✅ Population/Employment Counts → point-in-time (snapshot count)
```

### 6. Pattern-Based Classification with Flexibility for Country Variations

Added guidance that balances consistency with flexibility:

**Pattern-Based Default:**

- Same indicator name USUALLY has consistent classification
- Example: "GDP" is typically flow + period-total
- Example: "Bank Lending Rate" is typically rate + period-average

**Country-Specific Overrides:**
⚠️ ALWAYS examine actual indicator metadata and let DATA override the pattern when necessary!

**Examples of Legitimate Variations:**

1. **Wages**:
   - Most countries: flow + period-total (wages paid during period)
   - Some countries: index + period-average (wage index level)
   - Override trigger: Units say "index" or "2015=100"

2. **Interest Rates**:
   - Most countries: rate + period-average
   - Some countries: rate + point-in-time (end-of-period policy rate)
   - Override trigger: Description says "end-of-period policy rate"

3. **Employment**:
   - Most countries: count or ratio
   - Some countries: index (employment index)
   - Override trigger: Units say "index" or "2015=100"

**Decision Process:**

1. Start with indicator NAME pattern as hypothesis
2. Check units, description, and sample values for contradictory evidence
3. If data clearly indicates different characteristics, OVERRIDE the pattern
4. Document reasoning: "Typically X, but this country reports as Y because..."

**Goal:** Accuracy for the specific country's reporting method, not rigid pattern adherence

## Expected Impact

1. **Improved Accuracy**: Explicitly calling out common mistakes should reduce misclassifications
2. **Cross-Country Consistency**: Same indicator names will get same core classifications across countries
3. **Reduced LLM Confusion**: Clear "WRONG vs CORRECT" examples guide the model
4. **Better Temporal Aggregation**: Fixed most common temporal_aggregation errors (interest rates, price indices)
5. **Proper Type Classification**: Corrected ratio vs rate vs percentage distinctions

## Next Steps

1. Test updated prompts on a new batch of indicators
2. Compare classification accuracy before/after prompt updates
3. Measure reduction in common misclassification patterns
4. Iterate based on any remaining quality issues

## Reference Data Source

Analysis based on: `indicators_metadata-2025-10-10_110140.csv`

- 109 human-verified classifications
- Detailed reasoning for each classification
- Comprehensive analysis document: `analysis_patterns.md`
