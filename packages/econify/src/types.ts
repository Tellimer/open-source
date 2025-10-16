/**
 * Type definitions for economic indicator normalization and conversion
 *
 * Note: For indicator classification, see @tellimer/classify package.
 * Econify focuses on normalization and conversion, accepting classification
 * results from the classify package via the `indicator_type` field.
 */

/**
 * Economic indicator types - matches @tellimer/classify package taxonomy
 *
 * These types should be provided by the @tellimer/classify package.
 * Econify accepts these via the `indicator_type` field and uses them to
 * make smart normalization decisions (e.g., skip time conversion for stocks).
 *
 * Legacy classification functions exist in econify for backward compatibility
 * but are deprecated in favor of the classify package.
 */
export type IndicatorType =
  // Physical/Fundamental
  | "stock"
  | "flow"
  | "balance"
  | "capacity"
  | "volume"
  // Numeric/Measurement
  | "count"
  | "percentage"
  | "ratio"
  | "spread"
  | "share"
  // Price/Value
  | "price"
  | "yield"
  // Change/Movement
  | "rate"
  | "volatility"
  | "gap"
  // Composite/Derived
  | "index"
  | "correlation"
  | "elasticity"
  | "multiplier"
  // Temporal
  | "duration"
  | "probability"
  | "threshold"
  // Qualitative
  | "sentiment"
  | "allocation"
  // Legacy (used by old econify classification, not by classify package)
  | "currency"
  | "unknown"
  // Fallback
  | "other";

export type IndicatorInput =
  | string
  | { name?: string; description?: string; unit?: string; notes?: string };

// Classification interface removed - use @tellimer/classify package instead

export interface FXTable {
  base: string;
  rates: Record<string, number>;
  /** Optional dates for each rate - when each rate was last updated */
  dates?: Record<string, string>;
}

export type Scale =
  | "ones"
  | "hundreds"
  | "thousands"
  | "millions"
  | "hundred-millions" // 100 million (Chinese 亿, yi)
  | "billions"
  | "trillions";

export type TimeScale = "year" | "quarter" | "month" | "week" | "day" | "hour";

/**
 * Configuration for exempting specific indicators from normalization
 */
export interface NormalizationExemptions {
  /** Specific indicator IDs to exempt (e.g., ['TEL_CCR', 'CUSTOM_INDEX']) */
  indicatorIds?: string[];
  /** Category groups to exempt (e.g., ['IMF WEO', 'Tellimer']) */
  categoryGroups?: string[];
  /** Indicator names or name patterns to exempt (e.g., ['Credit Rating', 'Index']) */
  indicatorNames?: string[];
}

/**
 * Detailed explanation of normalization decisions for transparency
 */
export interface Explain {
  /** Foreign exchange rate information */
  fx?: {
    /** Currency code (e.g., "XOF", "EUR") */
    currency: string;
    /** Base currency (always "USD") */
    base: "USD";
    /** Exchange rate (foreign currency per USD, e.g., 558.16 XOF per USD) */
    rate: number;
    /** Rate timestamp if available */
    asOf?: string;
    /** Source of the rate */
    source: "live" | "fallback";
    /** Source identifier (e.g., "SNP", "ECB") */
    sourceId?: string;
  };
  /** Magnitude scaling information */
  magnitude?: {
    /** Original scale detected or provided */
    originalScale?: Scale;
    /** Target scale used for normalization */
    targetScale: Scale;
    /** Conversion factor applied (e.g., 1000 for billions→millions) */
    factor: number;
    /** Direction of scaling */
    direction: "upscale" | "downscale" | "none";
    /** Human-readable conversion description */
    description: string;
  };
  /** Time period adjustment information */
  periodicity?: {
    /** Original time period detected */
    original?: TimeScale;
    /** Target time period used for normalization */
    target: TimeScale;
    /** Whether temporal adjustment was applied */
    adjusted: boolean;
    /** Conversion factor applied (e.g., 12 for year→month) */
    factor?: number;
    /** Direction of time conversion */
    direction?: "upsample" | "downsample" | "none";
    /** Human-readable conversion description */
    description?: string;
  };
  /** Unit string information */
  units?: {
    /** Original unit string (e.g., "XOF Billions") */
    originalUnit?: string;
    /** Normalized unit string (e.g., "USD Millions per month") */
    normalizedUnit: string;
    /** Complete original unit with time period */
    originalFullUnit?: string;
    /** Complete normalized unit with time period */
    normalizedFullUnit?: string;
  };
  /** Currency information for easy frontend access */
  currency?: {
    /** Original currency code (e.g., "XOF", "EUR") */
    original?: string;
    /** Normalized currency code (e.g., "USD") */
    normalized: string;
  };
  /** Scale information for easy frontend access */
  scale?: {
    /** Original scale (e.g., "billions", "millions") */
    original?: Scale;
    /** Normalized scale (e.g., "millions") */
    normalized: Scale;
  };
  /** Time scale information for easy frontend access */
  timeScale?: {
    /** Original time period (e.g., "year", "quarter") */
    original?: TimeScale;
    /** Normalized time period (e.g., "month") */
    normalized?: TimeScale;
  };
  /** Dataset reporting frequency (separate from unit time basis used for conversion) */
  reportingFrequency?: TimeScale;
  /** Base unit information (for non-currency measures like counts, population, physical) */
  baseUnit?: {
    /** Original/base unit label if available */
    original?: string;
    /** Normalized/base unit label (e.g., "tonnes", "people", "units") */
    normalized?: string;
    /** Detected unit category */
    category?:
      | "currency"
      | "percentage"
      | "index"
      | "physical"
      | "energy"
      | "temperature"
      | "population"
      | "count"
      | "rate"
      | "time"
      | "composite"
      | "unknown";
  };

  /** Detected domain/category for FE formatting (e.g., commodity, emissions, agriculture, metals, energy) */
  domain?: string;

  /** Complete conversion summary */
  conversion?: {
    /** Step-by-step conversion chain */
    steps: string[];
    /** Overall conversion description */
    summary: string;
    /** Total conversion factor applied */
    totalFactor: number;
  };

  /** Auto target selection (when autoTargetByIndicator is enabled) */
  targetSelection?: {
    mode: "auto-by-indicator";
    indicatorKey: string;
    selected: { currency?: string; magnitude?: Scale; time?: TimeScale };
    shares?: {
      currency?: Record<string, number>;
      magnitude?: Record<string, number>;
      time?: Record<string, number>;
    };
    reason?: string;
  };

  /** Quality warnings (e.g., scale outliers, data quality issues) */
  qualityWarnings?: Array<{
    type: "scale-outlier" | "data-quality" | "normalization-issue";
    severity: "warning" | "error" | "info";
    message: string;
    details?: Record<string, unknown>;
  }>;
}
