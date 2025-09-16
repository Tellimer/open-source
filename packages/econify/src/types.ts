/**
 * Type definitions for economic indicator classification and normalization
 */

export type IndicatorType = "stock" | "flow" | "rate" | "currency" | "unknown";

export type IndicatorInput =
  | string
  | { name?: string; description?: string; unit?: string; notes?: string };

export interface Classification {
  type: IndicatorType;
  confidence: number;
  signals: string[];
  detectedCurrency?: string | null;
}

export interface FXTable {
  base: string;
  rates: Record<string, number>;
}

export type Scale =
  | "ones"
  | "thousands"
  | "millions"
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
  };
  /** Time period adjustment information */
  periodicity?: {
    /** Original time period detected */
    original?: TimeScale;
    /** Target time period used for normalization */
    target: TimeScale;
    /** Whether temporal adjustment was applied */
    adjusted: boolean;
  };
  /** Unit string information */
  units?: {
    /** Original unit string (e.g., "XOF Billions") */
    originalUnit?: string;
    /** Normalized unit string (e.g., "USD Millions") */
    normalizedUnit: string;
  };
}
