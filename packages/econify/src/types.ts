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
