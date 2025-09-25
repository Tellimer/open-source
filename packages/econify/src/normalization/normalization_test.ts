/**
 * Tests for combined normalization module
 */

import { assertEquals, assertThrows } from "@std/assert";
import {
  normalizeMonetary,
  normalizeMonetaryFlow,
  normalizeValue,
} from "./normalization.ts";
import type { FXTable } from "../types.ts";

const fx: FXTable = { base: "EUR", rates: { USD: 1.1, GBP: 0.85, JPY: 130 } };
const testFX: FXTable = {
  base: "USD",
  rates: { EUR: 0.85, GBP: 0.79, JPY: 149.50 },
};

Deno.test("normalizeMonetary - basic flow normalization", () => {
  const result = normalizeMonetary(100, {
    fromCurrency: "USD",
    toCurrency: "EUR",
    fx,
    unitText: "USD mn per year",
    fromTimeScale: "year",
    toTimeScale: "year",
  });

  // 100 USD -> EUR: 100 / 1.1 ≈ 90.91
  const expected = 100 / 1.1;
  assertEquals(
    Math.round(result * 100) / 100,
    Math.round(expected * 100) / 100,
  );
});

Deno.test("normalizeMonetary - with magnitude scaling", () => {
  const result = normalizeMonetary(1, {
    fromCurrency: "USD",
    toCurrency: "EUR",
    fx,
    unitText: "USD bn per year", // billions
    toMagnitude: "millions", // convert to millions
    fromTimeScale: "year",
    toTimeScale: "year",
  });

  // 1 billion USD -> millions EUR
  // First scale: 1 bn -> 1000 mn
  // Then convert: 1000 USD mn -> EUR mn: 1000 / 1.1 ≈ 909.09
  const expected = (1 * 1000) / 1.1;
  assertEquals(
    Math.round(result * 100) / 100,
    Math.round(expected * 100) / 100,
  );
});

Deno.test("normalizeMonetary - with time scaling", () => {
  const result = normalizeMonetary(400, {
    fromCurrency: "EUR",
    toCurrency: "USD",
    fx,
    unitText: "EUR mn per quarter",
    fromTimeScale: "quarter",
    toTimeScale: "year",
  });

  // 400 EUR mn per quarter -> USD mn per year
  // First time scale: 400 * 4 = 1600 EUR mn per year
  // Then convert: 1600 EUR -> USD: 1600 * 1.1 = 1760
  const expected = (400 * 4) * 1.1;
  assertEquals(result, expected);
});

Deno.test("normalizeMonetary - complex transformation", () => {
  const result = normalizeMonetary(2, {
    fromCurrency: "GBP",
    toCurrency: "JPY",
    fx,
    unitText: "GBP bn per quarter",
    toMagnitude: "millions",
    fromTimeScale: "quarter",
    toTimeScale: "year",
  });

  // 2 GBP bn per quarter -> JPY mn per year
  // 1. Scale: 2 bn -> 2000 mn
  // 2. Time: 2000 * 4 = 8000 mn per year (quarterly to annual)
  // 3. Currency: GBP -> EUR: 8000 / 0.85 ≈ 9411.76
  // 4. Currency: EUR -> JPY: 9411.76 * 130 ≈ 1,223,529
  const magnitudeScaled = 2 * 1000; // bn to mn
  const timeScaled = magnitudeScaled * 4; // quarter to year
  const toEur = timeScaled / 0.85; // GBP to EUR
  const toJpy = toEur * 130; // EUR to JPY

  assertEquals(Math.round(result), Math.round(toJpy));
});

Deno.test("normalizeMonetary - error when cannot infer time basis", () => {
  assertThrows(
    () =>
      normalizeMonetary(100, {
        fromCurrency: "USD",
        toCurrency: "EUR",
        fx,
        unitText: "USD mn", // no time info
        toTimeScale: "year",
      }),
    Error,
    "Cannot infer 'from' time basis",
  );
});

Deno.test("normalizeMonetaryFlow - same as normalizeMonetary", () => {
  const opts = {
    fromCurrency: "USD",
    toCurrency: "EUR",
    fx,
    unitText: "USD mn per year",
    toTimeScale: "year" as const,
  };

  const result1 = normalizeMonetary(100, {
    ...opts,
    fromTimeScale: "year",
  });

  const result2 = normalizeMonetaryFlow(100, opts);

  assertEquals(result1, result2);
});

Deno.test("normalizeMonetaryFlow - infers time scale from unit text", () => {
  const result = normalizeMonetaryFlow(1200, {
    fromCurrency: "EUR",
    toCurrency: "USD",
    fx,
    unitText: "EUR mn per month",
    toTimeScale: "year",
  });

  // 1200 EUR mn per month -> USD mn per year
  // Time: 1200 * 12 = 14400 EUR mn per year
  // Currency: 14400 * 1.1 = 15840 USD mn per year
  assertEquals(Math.round(result * 100) / 100, 15840);
});

Deno.test("normalizeMonetaryFlow - error when cannot infer time basis", () => {
  assertThrows(
    () =>
      normalizeMonetaryFlow(100, {
        fromCurrency: "USD",
        toCurrency: "EUR",
        fx,
        unitText: "USD mn", // no time info
        toTimeScale: "year",
      }),
    Error,
    "Cannot infer 'from' time basis",
  );
});

Deno.test("normalizeValue - time conversion warning when no source time scale", () => {
  // Capture console warnings
  const originalWarn = console.warn;
  let warningMessage = "";
  console.warn = (msg: string) => {
    warningMessage = msg;
  };

  try {
    const result = normalizeValue(
      -6798.401,
      "USD Million", // No time scale in unit string
      {
        toCurrency: "USD",
        toMagnitude: "millions",
        toTimeScale: "month", // Time conversion requested
        fx: testFX,
        // No explicitTimeScale provided
      },
    );

    // Value should remain unchanged
    assertEquals(result, -6798.401);

    // Should have generated a warning
    assertEquals(
      warningMessage.includes(
        "Time conversion to month requested but no source time scale found",
      ),
      true,
    );
  } finally {
    console.warn = originalWarn;
  }
});

Deno.test("normalizeValue - no warning when time scales match", () => {
  // Capture console warnings
  const originalWarn = console.warn;
  let warningMessage = "";
  console.warn = (msg: string) => {
    warningMessage = msg;
  };

  try {
    const result = normalizeValue(
      100,
      "USD Million", // No time scale in unit string
      {
        toCurrency: "USD",
        toMagnitude: "millions",
        toTimeScale: "month",
        fx: testFX,
        explicitTimeScale: "month", // Same as target
      },
    );

    // Value should remain unchanged (no conversion needed)
    assertEquals(result, 100);

    // Should NOT have generated a warning
    assertEquals(warningMessage, "");
  } finally {
    console.warn = originalWarn;
  }
});

Deno.test("normalizeValue - thousands per quarter → millions per month (AZE case)", () => {
  // Example similar to AZE export:
  // 2,445,459.7 USD Thousand per quarter → USD millions per month
  const original = 2445459.7;
  const result = normalizeValue(original, "USD Thousand per quarter", {
    toCurrency: "USD",
    toMagnitude: "millions",
    toTimeScale: "month",
  });
  // thousands → millions: ×0.001, quarter → month: ÷3
  const expected = (original * 0.001) / 3;
  assertEquals(
    Math.round(result * 1e9) / 1e9,
    Math.round(expected * 1e9) / 1e9,
  );
});

Deno.test("normalizeValue - Population (stock-like count) does not divide by 12", () => {
  // Stock-like count should not undergo time conversion; basis changes to month but value stays
  const original = 35.12; // e.g., millions of people, but unit kept generic here
  const result = normalizeValue(original, "units per year", {
    toTimeScale: "month",
    indicatorName: "Population",
  });
  assertEquals(result, original);
});


Deno.test("stock monetary - ignore item.periodicity and do not upsample", async () => {
  const { processBatch } = await import("../batch/batch.ts");
  const items = [{
    name: "Foreign Exchange Reserves",
    value: 120,
    unit: "USD Million",
    periodicity: "Monthly", // reporting frequency present
    currency_code: "USD",
  }];
  const res = await processBatch(items, {
    validate: false,
    toCurrency: "USD",
    toMagnitude: "millions",
    toTimeScale: "month",
    explain: true,
  });
  const out = res.successful[0];
  // No upsampling: keep value as-is and do not append per month in unit
  assertEquals(out.normalized, 120);
  assertEquals(out.normalizedUnit.includes("per"), false);
});

Deno.test("flow monetary - time conversion applies (year -> month)", async () => {
  const { processBatch } = await import("../batch/batch.ts");
  const items = [{
    name: "Trade Balance",
    value: 120,
    unit: "USD Million per year",
    periodicity: "Monthly",
    currency_code: "USD",
  }];
  const res = await processBatch(items, {
    validate: false,
    toCurrency: "USD",
    toMagnitude: "millions",
    toTimeScale: "month",
    explain: true,
  });
  const out = res.successful[0];
  // 120 per year -> 10 per month
  assertEquals(out.normalized, 10);
  assertEquals(out.normalizedUnit.toLowerCase(), "usd millions per month");
});
