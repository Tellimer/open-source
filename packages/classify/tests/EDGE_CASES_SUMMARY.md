# Edge Cases Summary

## Quick Reference

The test suite includes **9 edge case indicators** that test challenging classification scenarios:

| Indicator | Challenge | Expected Type | Category | Notes |
|-----------|-----------|---------------|----------|-------|
| World Happiness Index | Non-economic composite | `other` | `other` | Subjective well-being, doesn't fit standard categories |
| Capacity Utilization % | Name suggests capacity | `percentage` | `numeric-measurement` | Tests percentage vs capacity distinction |
| Labor Share of Income | Share vs percentage | `share` | `numeric-measurement` | Compositional breakdown, not bounded rate |
| S&P 500 P/E Ratio | Could be price/index | `ratio` | `numeric-measurement` | Relative multiple, not absolute price |
| GDP Growth Rate QoQ | Rate vs percentage | `rate` | `change-movement` | Change metric, not bounded value |
| Corporate Tax Rate | Policy parameter | `threshold` | `temporal` | Threshold/cutoff, not measurement |
| Climate Risk Score | Unconventional | `other` | `other` | Mixes physical science and economics |
| Forex Reserve Adequacy | Unusual units | `ratio` | `numeric-measurement` | "Months of imports" denominator |
| Unknown Type | Fallback testing | `unknown` | `other` | Tests unknown classification |

## Key Testing Objectives

### 1. Ambiguity Handling
- **Test**: Can LLM handle indicators that don't fit neatly into categories?
- **Success**: Appropriate use of "other" and "unknown" types
- **Metric**: 70%+ accuracy (lower than standard indicators)

### 2. Confidence Calibration
- **Test**: Do edge cases produce lower confidence scores?
- **Success**: Average confidence 0.60-0.80 (vs 0.85+ for standard)
- **Metric**: Confidence correlates with classification difficulty

### 3. Boundary Conditions
- **Test**: Correct classification at type boundaries
- **Examples**: 
  - Percentage vs share (both use %)
  - Rate vs percentage (both use %)
  - Capacity vs percentage (utilization)
  - Threshold vs percentage (policy parameters)
  - Ratio vs price (relative vs absolute)

### 4. Fallback Behavior
- **Test**: System uses "other" when appropriate
- **Success**: Non-standard indicators classified as "other"
- **Examples**: Happiness index, climate risk score

### 5. Provider Consistency
- **Test**: Different LLMs handle edge cases similarly
- **Success**: 60%+ agreement across providers (vs 80%+ for standard)
- **Metric**: Cross-provider classification consistency

## Common Ambiguities Tested

### Type Ambiguities

1. **Percentage vs Share**
   - Both use % units
   - Percentage: Bounded 0-100% rate
   - Share: Compositional breakdown
   - Example: Labor share of income (share, not percentage)

2. **Percentage vs Ratio**
   - Percentage: Bounded 0-100%
   - Ratio: Unbounded multiple
   - Example: P/E ratio (ratio, not percentage)

3. **Rate vs Percentage**
   - Rate: Change over time
   - Percentage: Bounded value
   - Example: GDP growth rate (rate, not percentage)

4. **Capacity vs Percentage**
   - Capacity: Absolute maximum
   - Percentage: Relative utilization
   - Example: Capacity utilization % (percentage, not capacity)

5. **Threshold vs Percentage**
   - Threshold: Policy parameter/cutoff
   - Percentage: Measurement
   - Example: Tax rate (threshold, not percentage)

6. **Ratio vs Price**
   - Ratio: Relative multiple
   - Price: Absolute value
   - Example: P/E ratio (ratio, not price)

### Category Ambiguities

1. **Other vs Standard Categories**
   - When to use "other" type?
   - Non-economic indicators
   - Unconventional metrics
   - Examples: Happiness index, climate risk

2. **Temporal vs Numeric**
   - Thresholds (temporal) vs percentages (numeric)
   - Policy parameters vs measurements
   - Example: Tax rate as threshold

## Expected Results

### Accuracy Targets

| Metric | Standard Indicators | Edge Cases |
|--------|-------------------|------------|
| Overall Accuracy | 85%+ | 70%+ |
| Average Confidence | 0.85-0.95 | 0.60-0.80 |
| Schema Validation | 95%+ | 90%+ |
| Provider Agreement | 80%+ | 60%+ |

### Confidence Distribution

**Standard Indicators**:
- Very High (0.95-1.0): 40%
- High (0.85-0.94): 45%
- Moderate (0.70-0.84): 12%
- Low (<0.70): 3%

**Edge Cases**:
- Very High (0.95-1.0): 10%
- High (0.85-0.94): 20%
- Moderate (0.70-0.84): 50%
- Low (<0.70): 20%

## Analysis Guidelines

### When Edge Cases Fail

1. **Check Expected Classification**
   - Is the expected type actually correct?
   - Could multiple types be valid?
   - Should confidence be lower?

2. **Review LLM Reasoning**
   - What was the LLM's logic?
   - Is it a reasonable interpretation?
   - Does prompt need clarification?

3. **Consider Ambiguity**
   - Is the indicator genuinely ambiguous?
   - Should it be classified as "other"?
   - Is lower confidence appropriate?

4. **Compare Across Providers**
   - Do all providers fail similarly?
   - Is one provider more accurate?
   - What's the consensus classification?

### When to Update Expected Classifications

- Multiple providers consistently disagree
- LLM reasoning is more convincing
- Indicator is genuinely ambiguous
- Better type exists in taxonomy

### When to Update Prompts

- Consistent misclassification patterns
- Confusion between similar types
- Not using "other" when appropriate
- Over-confidence on ambiguous cases

## Production Implications

### Low Confidence Indicators
- Flag for human review
- Show LLM reasoning to users
- Allow manual override
- Track for pattern analysis

### Ambiguous Classifications
- Provide multiple possible types
- Show confidence for each
- Explain distinctions
- Let users choose

### Edge Case Monitoring
- Track which indicators consistently fail
- Identify new edge case patterns
- Update test suite with new cases
- Refine prompts based on failures

## Maintenance

### Adding New Edge Cases

1. Identify ambiguous indicator in production
2. Document the ambiguity/challenge
3. Determine expected classification
4. Add to `edge_cases.json` fixture
5. Run tests and analyze results
6. Update documentation

### Reviewing Edge Cases

- Quarterly review of edge case accuracy
- Update expected classifications if needed
- Add new edge cases from production
- Remove edge cases that become clear
- Track accuracy trends over time

## Conclusion

Edge cases are critical for:
- ✅ Testing classification robustness
- ✅ Validating confidence calibration
- ✅ Ensuring fallback behavior
- ✅ Handling real-world complexity
- ✅ Identifying prompt improvements

The 9 edge cases cover major ambiguity types and provide comprehensive testing of boundary conditions and unusual indicators.

