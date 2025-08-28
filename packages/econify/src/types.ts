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
