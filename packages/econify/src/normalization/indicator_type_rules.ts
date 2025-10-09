/**
 * Normalization behavior rules for all indicator types from @tellimer/classify
 *
 * This module defines how each indicator type should behave during normalization:
 * - allowTimeDimension: Can the indicator be converted across time periods (monthly → annual)?
 * - allowMagnitude: Can magnitude scaling be applied (thousands → millions)?
 * - allowCurrency: Can currency conversion be applied (USD → EUR)?
 * - skipTimeInUnit: Should time period be omitted from unit strings?
 *
 * @module
 */

export interface IndicatorTypeNormalizationRules {
  /**
   * Whether this indicator type allows time dimension conversion/targeting.
   * - true: Flow-like indicators (GDP, trade) - can convert monthly → annual
   * - false: Stock/snapshot indicators (debt, CPI) - point-in-time values
   */
  allowTimeDimension: boolean;

  /**
   * Whether magnitude scaling can be applied.
   * - true: Absolute values that can be scaled (GDP millions → billions)
   * - false: Dimensionless ratios, percentages, indices (no scaling applicable)
   */
  allowMagnitude: boolean;

  /**
   * Whether currency conversion is meaningful.
   * - true: Currency-denominated values (GDP, debt, prices)
   * - false: Dimensionless values (%, ratios, indices)
   * Note: Final decision also depends on is_currency_denominated flag
   */
  allowCurrency: boolean;

  /**
   * Whether to omit time period from normalized unit strings.
   * - true: "USD millions" not "USD millions per month" (stocks, prices, rates)
   * - false: "USD millions per year" (flows)
   */
  skipTimeInUnit: boolean;

  /**
   * Description of this indicator type for documentation
   */
  description: string;
}

/**
 * Comprehensive normalization rules for all 25 indicator types
 */
export const INDICATOR_TYPE_RULES: Record<string, IndicatorTypeNormalizationRules> = {
  // ============================================================================
  // Physical/Fundamental: Real-world quantities and their dynamics
  // ============================================================================

  "stock": {
    allowTimeDimension: false,
    allowMagnitude: true,
    allowCurrency: true,
    skipTimeInUnit: true,
    description: "Absolute levels at a point in time (debt, reserves, wealth, population)",
  },

  "flow": {
    allowTimeDimension: true,
    allowMagnitude: true,
    allowCurrency: true,
    skipTimeInUnit: false,
    description: "Throughput over time period (GDP, income, spending, production)",
  },

  "balance": {
    allowTimeDimension: false,
    allowMagnitude: true,
    allowCurrency: true,
    skipTimeInUnit: true,
    description: "Net positions that can be negative (trade balance, budget deficit)",
  },

  "capacity": {
    allowTimeDimension: false,
    allowMagnitude: true,
    allowCurrency: true,
    skipTimeInUnit: true,
    description: "Maximum potential levels (potential GDP, production capacity)",
  },

  "volume": {
    allowTimeDimension: true,
    allowMagnitude: true,
    allowCurrency: true,
    skipTimeInUnit: false,
    description: "Transaction quantities over time (contract volumes, trade volumes)",
  },

  // ============================================================================
  // Numeric/Measurement: Pure numbers and their relationships
  // ============================================================================

  "count": {
    allowTimeDimension: true,
    allowMagnitude: true,
    allowCurrency: false,
    skipTimeInUnit: false,
    description: "Discrete units per period (jobs, housing starts, claims, registrations)",
  },

  "percentage": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "0-100% bounded values (unemployment rate, capacity utilization)",
  },

  "ratio": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "Dimensionless relative multiples (debt-to-GDP, P/E ratio)",
  },

  "spread": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false, // Usually basis points or percentage points
    skipTimeInUnit: true,
    description: "Absolute differences (yield spread, bid-ask spread)",
  },

  "share": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "Compositional breakdown (labor share, consumption % of GDP)",
  },

  // ============================================================================
  // Price/Value: Market-determined values
  // ============================================================================

  "price": {
    allowTimeDimension: false,
    allowMagnitude: true,
    allowCurrency: true,
    skipTimeInUnit: true,
    description: "Market-clearing levels (interest rates, FX rates, commodity prices)",
  },

  "yield": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "Returns and efficiency (bond yields, productivity, ROI)",
  },

  // ============================================================================
  // Change/Movement: Dynamics and deviations
  // ============================================================================

  "rate": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "Directional percentage change (inflation rate, growth rate)",
  },

  "volatility": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "Statistical dispersion (VIX, price volatility, standard deviation)",
  },

  "gap": {
    allowTimeDimension: false,
    allowMagnitude: true,
    allowCurrency: true,
    skipTimeInUnit: true,
    description: "Deviation from potential/trend (output gap, unemployment gap)",
  },

  // ============================================================================
  // Composite/Derived: Complex calculated measures
  // ============================================================================

  "index": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "Composite indicators with base period (CPI, PMI, confidence indices)",
  },

  "correlation": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "Relationship strength -1 to 1 (Phillips curve coefficient)",
  },

  "elasticity": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "Responsiveness % change (price elasticity of demand)",
  },

  "multiplier": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "Causal transmission coefficients (fiscal multiplier, money multiplier)",
  },

  // ============================================================================
  // Temporal: Time-based measures
  // ============================================================================

  "duration": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "Time-based measures (unemployment duration, bond duration)",
  },

  "probability": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "Statistical likelihood 0-1 (recession probability, default probability)",
  },

  "threshold": {
    allowTimeDimension: false,
    allowMagnitude: true,
    allowCurrency: true,
    skipTimeInUnit: true,
    description: "Critical levels/targets (inflation target, debt ceiling)",
  },

  // ============================================================================
  // Qualitative: Non-numeric or categorical
  // ============================================================================

  "sentiment": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "Categorical/ordinal measures (consumer confidence, business sentiment)",
  },

  "allocation": {
    allowTimeDimension: false,
    allowMagnitude: false,
    allowCurrency: false,
    skipTimeInUnit: true,
    description: "Portfolio/resource composition (asset allocation, budget allocation)",
  },

  // ============================================================================
  // Fallback: Unknown or uncategorized
  // ============================================================================

  "other": {
    allowTimeDimension: true,
    allowMagnitude: true,
    allowCurrency: true,
    skipTimeInUnit: false,
    description: "Default behavior for uncategorized indicators",
  },
};

/**
 * Get normalization rules for a given indicator type
 * Falls back to "other" if type is unknown, undefined, or null
 */
export function getNormalizationRules(
  indicatorType: string | null | undefined
): IndicatorTypeNormalizationRules {
  if (!indicatorType) {
    return INDICATOR_TYPE_RULES["other"];
  }

  return INDICATOR_TYPE_RULES[indicatorType] ?? INDICATOR_TYPE_RULES["other"];
}

/**
 * Check if indicator type allows time dimension conversion/targeting
 */
export function allowsTimeDimension(indicatorType: string | null | undefined): boolean {
  return getNormalizationRules(indicatorType).allowTimeDimension;
}

/**
 * Check if indicator type should skip time in unit strings
 */
export function shouldSkipTimeInUnit(indicatorType: string | null | undefined): boolean {
  return getNormalizationRules(indicatorType).skipTimeInUnit;
}

/**
 * Check if indicator type allows magnitude scaling
 */
export function allowsMagnitude(indicatorType: string | null | undefined): boolean {
  return getNormalizationRules(indicatorType).allowMagnitude;
}

/**
 * Check if indicator type allows currency conversion
 */
export function allowsCurrency(indicatorType: string | null | undefined): boolean {
  return getNormalizationRules(indicatorType).allowCurrency;
}
