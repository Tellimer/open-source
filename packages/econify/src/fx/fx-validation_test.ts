/**
 * Tests for FX rate validation utilities
 */

import { assertEquals, assert } from "@std/assert";
import { validateFXRates, validateAndCorrectFXRates, suggestFXRateCorrection } from "./fx-validation.ts";
import type { FXTable } from "../types.ts";

Deno.test("validateFXRates - valid rates", () => {
  const validFX: FXTable = {
    base: "USD",
    rates: {
      EUR: 0.92,
      GBP: 0.73,
      XOF: 555,
      JPY: 150,
    },
  };

  const result = validateFXRates(validFX);
  assertEquals(result.isValid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validateFXRates - detects obviously wrong rates", () => {
  const invalidFX: FXTable = {
    base: "USD",
    rates: {
      EUR: 0.92, // Valid
      XOF: 0.55893, // Way too low (should be ~555)
      JPY: 0.001, // Way too low (should be ~150)
      GBP: -0.5, // Negative
    },
  };

  const result = validateFXRates(invalidFX);
  assertEquals(result.isValid, false);
  assert(result.errors.length > 0);
  
  // Should detect XOF as too low
  const xofError = result.errors.find(e => e.includes("XOF"));
  assert(xofError !== undefined);
  assert(xofError.includes("too low"));
  
  // Should detect negative GBP
  const gbpError = result.errors.find(e => e.includes("GBP"));
  assert(gbpError !== undefined);
  assert(gbpError.includes("negative"));
});

Deno.test("suggestFXRateCorrection - XOF correction", () => {
  // Test the specific case from user's data
  const wrongRate = 0.55893;
  const suggestion = suggestFXRateCorrection("XOF", wrongRate);
  
  assert(suggestion !== null);
  assert(suggestion >= 400 && suggestion <= 700); // Should be in reasonable range
  assertEquals(suggestion, wrongRate * 1000); // Should multiply by 1000
});

Deno.test("suggestFXRateCorrection - no correction needed", () => {
  const goodRate = 555;
  const suggestion = suggestFXRateCorrection("XOF", goodRate);

  // Should return midpoint since rate is outside range but not correctable
  assert(suggestion !== null);
  assert(suggestion >= 400 && suggestion <= 700);
});

Deno.test("validateAndCorrectFXRates - auto correction", () => {
  const problematicFX: FXTable = {
    base: "USD",
    rates: {
      EUR: 0.92, // Good
      XOF: 0.55893, // Bad - too low by 1000x
    },
  };

  const result = validateAndCorrectFXRates(problematicFX, true);
  
  // Should have made corrections
  assert(result.corrections.length > 0);
  
  // Should have corrected XOF
  const xofCorrection = result.corrections.find(c => c.currency === "XOF");
  assert(xofCorrection !== undefined);
  assertEquals(xofCorrection.original, 0.55893);
  assertEquals(Math.round(xofCorrection.corrected * 100) / 100, 558.93);
  
  // Corrected table should be valid
  assertEquals(result.validation.isValid, true);
});

Deno.test("validateAndCorrectFXRates - no auto correction", () => {
  const problematicFX: FXTable = {
    base: "USD",
    rates: {
      XOF: 0.55893, // Bad rate
    },
  };

  const result = validateAndCorrectFXRates(problematicFX, false);
  
  // Should not have made corrections
  assertEquals(result.corrections.length, 0);
  assertEquals(result.correctedTable, problematicFX);
  assertEquals(result.validation.isValid, false);
});

Deno.test("validateFXRates - unknown currency handling", () => {
  const unknownCurrencyFX: FXTable = {
    base: "USD",
    rates: {
      UNKNOWN: 5.5, // Unknown currency with reasonable rate
      BADUNK: 0.00001, // Unknown currency with very low rate
    },
  };

  const result = validateFXRates(unknownCurrencyFX);
  
  // Should warn about very low rate but not error on unknown currency
  assert(result.warnings.some(w => w.includes("BADUNK")));
  assert(result.warnings.some(w => w.includes("very low")));
});
