/**
 * Simple test for explain metadata
 */

import { buildExplainMetadata } from "./src/normalization/explain.ts";
import type { FXTable } from "./src/types.ts";

const fx: FXTable = {
  base: "USD",
  rates: {
    XOF: 558.16,
  },
};

console.log("🧪 Testing buildExplainMetadata...");

const explain = buildExplainMetadata(
  -482.58,
  "XOF Billions",
  -0.86,
  {
    toCurrency: "USD",
    toMagnitude: "millions",
    fx,
  }
);

console.log("📋 Explain metadata:");
console.log(JSON.stringify(explain, null, 2));
