# Edge Cases Documentation

This document explains the edge cases included in the test suite and why they're
important for validating LLM classification robustness.

## Overview

Edge cases test boundary conditions, ambiguous classifications, and unusual
indicators that don't fit neatly into standard categories. These cases help
ensure the classification system handles real-world complexity.

## Edge Case Categories

### 1. Indicators That Don't Fit Standard Categories

#### World Happiness Index

- **Challenge**: Composite subjective well-being measure
- **Expected**: `other` type (doesn't fit economic indicator categories)
- **Why It's Hard**: Combines survey data, not a traditional economic metric
- **Tests**: Fallback to "other" category when no standard type applies

#### Physical Climate Risk Score

- **Challenge**: Mixes physical science with economic risk
- **Expected**: `other` type
- **Why It's Hard**: Unconventional indicator bridging climate and economics
- **Tests**: Recognition of non-standard indicators

### 2. Ambiguous Type Classifications

#### Manufacturing Capacity Utilization Rate

- **Challenge**: Percentage (0-100%) but conceptually related to "capacity"
- **Expected**: `percentage` type (not `capacity`)
- **Why It's Hard**: Name suggests "capacity" but it's a utilization rate
- **Tests**: Distinction between capacity (absolute) and percentage (relative)

#### Labor Share of Income

- **Challenge**: Share vs percentage distinction
- **Expected**: `share` type (compositional breakdown)
- **Why It's Hard**: Both use % units, but share is compositional
- **Tests**: Share (part of whole) vs percentage (bounded rate)

#### S&P 500 Price-to-Earnings Ratio

- **Challenge**: Could be confused with price or index
- **Expected**: `ratio` type
- **Why It's Hard**: Related to stock prices but is a relative multiple
- **Tests**: Ratio vs price vs index distinction

### 3. Rate vs Percentage Ambiguity

#### GDP Growth Rate (Quarter-over-Quarter)

- **Challenge**: Percentage change vs rate classification
- **Expected**: `rate` type (change-movement category)
- **Why It's Hard**: Uses % units but represents rate of change
- **Tests**: Rate (change) vs percentage (bounded value)

### 4. Threshold vs Percentage

#### Statutory Corporate Tax Rate

- **Challenge**: Percentage that acts as a policy threshold
- **Expected**: `threshold` type (temporal category)
- **Why It's Hard**: Uses % units but is a policy parameter/cutoff
- **Tests**: Threshold (policy parameter) vs percentage (measurement)

### 5. Unusual Units

#### Foreign Exchange Reserve Adequacy Ratio

- **Challenge**: Ratio with unusual units ("months of imports")
- **Expected**: `ratio` type
- **Why It's Hard**: Non-standard denominator (time-based)
- **Tests**: Ratio classification with unconventional units

## Why Edge Cases Matter

### 1. Real-World Complexity

Economic indicators don't always fit neatly into categories. Edge cases reflect
the messy reality of economic data.

### 2. LLM Robustness

Testing edge cases ensures the LLM can handle ambiguity and make reasonable
classifications when indicators are unclear.

### 3. Confidence Calibration

Edge cases should produce lower confidence scores, helping validate the LLM's
uncertainty estimation.

### 4. Fallback Behavior

Tests that the system properly uses "other" and "unknown" types when
appropriate.

### 5. Boundary Conditions

Validates classification logic at the boundaries between similar types
(percentage vs share, ratio vs price, etc.).

## Expected Behavior

### High Confidence (0.85-1.0)

- Clear, unambiguous indicators
- Standard economic metrics
- Well-defined categories

### Moderate Confidence (0.70-0.84)

- Some ambiguity in classification
- Multiple valid interpretations
- Edge cases with reasonable defaults

### Low Confidence (<0.70)

- Highly ambiguous indicators
- Unconventional metrics
- Should consider "other" or "unknown" types

## Common Ambiguities

### Percentage vs Share

- **Percentage**: Bounded 0-100% rate or proportion
- **Share**: Compositional breakdown (part of whole)
- **Example**: Unemployment rate (percentage) vs labor share of income (share)

### Percentage vs Ratio

- **Percentage**: Bounded 0-100%
- **Ratio**: Unbounded relative multiple
- **Example**: Capacity utilization % vs debt-to-GDP ratio

### Rate vs Percentage

- **Rate**: Change over time (can be negative)
- **Percentage**: Bounded value or proportion
- **Example**: Inflation rate vs unemployment rate

### Capacity vs Percentage

- **Capacity**: Absolute maximum potential
- **Percentage**: Relative utilization of capacity
- **Example**: Labor force (capacity) vs capacity utilization % (percentage)

### Threshold vs Percentage

- **Threshold**: Policy parameter or cutoff level
- **Percentage**: Measurement or rate
- **Example**: Tax rate (threshold) vs inflation rate (rate)

### Price vs Ratio

- **Price**: Absolute value in currency units
- **Ratio**: Relative multiple (price/earnings, price/book)
- **Example**: Stock price vs P/E ratio

### Index vs Price

- **Index**: Composite measure (often normalized to base year)
- **Price**: Absolute value
- **Example**: CPI (index) vs stock price

## Testing Strategy

### 1. Include Diverse Edge Cases

Cover all major ambiguity types to ensure comprehensive testing.

### 2. Document Expected Behavior

Clearly specify expected classification and reasoning for each edge case.

### 3. Track Confidence Scores

Monitor whether edge cases produce appropriately lower confidence scores.

### 4. Compare Across Providers

Check if different LLM providers handle edge cases consistently.

### 5. Update Based on Failures

When edge cases fail, analyze whether:

- Expected classification is wrong
- LLM needs better prompting
- Indicator is genuinely ambiguous

## Edge Case Results Analysis

### Success Metrics

- **Classification Accuracy**: 70%+ (lower than standard indicators)
- **Confidence Calibration**: Average confidence 0.60-0.80 (lower than standard)
- **Fallback Usage**: Appropriate use of "other" and "unknown" types

### Common Failure Patterns

1. **Over-confidence**: High confidence on ambiguous indicators
2. **Wrong Category**: Misclassifying due to name/units confusion
3. **Missing Fallback**: Not using "other" when appropriate
4. **Inconsistency**: Different providers giving very different classifications

## Recommendations

### For Test Maintenance

1. Add new edge cases as they're discovered in production
2. Document reasoning for expected classifications
3. Review edge cases when prompt engineering changes
4. Track edge case accuracy trends over time

### For Prompt Engineering

1. Include edge case examples in system prompt
2. Emphasize fallback to "other" when uncertain
3. Provide clear distinctions between similar types
4. Encourage lower confidence for ambiguous cases

### For Production Use

1. Flag low-confidence classifications for human review
2. Provide reasoning to help users understand classifications
3. Allow manual override of edge case classifications
4. Track which indicators consistently produce low confidence

## Conclusion

Edge cases are essential for validating classification robustness. They test the
system's ability to handle:

- Ambiguous indicators
- Boundary conditions
- Unconventional metrics
- Real-world complexity

By including comprehensive edge cases in the test suite, we ensure the
classification system is production-ready and can handle the full spectrum of
economic indicators.
