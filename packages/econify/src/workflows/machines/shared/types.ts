// Shared types for child machine inputs/outputs

import type { FXTable } from "../../../main.ts";

export interface FXRatesOutput {
  rates: FXTable;
  source: "live" | "fallback";
  sourceId: string;
}

