/**
 * Tests for inference module
 */

import { assert } from "jsr:@std/assert";
import { inferUnit, validateInferredUnit } from "./inference.ts";

Deno.test("inferUnit - basic functionality", () => {
  const result = inferUnit(21000, {
    context: "GDP",
    country: "USA",
  });

  assert(result.confidence >= 0, "Should return confidence score");
  assert(typeof result.unit === "string", "Should return unit string");
  assert(result.reasoning.length > 0, "Should provide reasoning");
});

Deno.test("inferUnit - inflation rate", () => {
  const result = inferUnit(2.1, {
    context: "inflation rate",
    country: "USA",
  });

  assert(result.confidence >= 0, "Should return confidence score");
  assert(typeof result.unit === "string", "Should return unit string");
});

Deno.test("inferUnit - population data", () => {
  const result = inferUnit(331, {
    context: "population",
    country: "USA",
  });

  assert(result.confidence >= 0, "Should return confidence score");
  assert(typeof result.unit === "string", "Should return unit string");
});

Deno.test("inferUnit - stock index", () => {
  const result = inferUnit(4500, {
    context: "S&P 500",
    country: "USA",
  });

  assert(result.confidence >= 0, "Should return confidence score");
  assert(typeof result.unit === "string", "Should return unit string");
});

Deno.test("inferUnit - currency exchange rate", () => {
  const result = inferUnit(1.08, {
    context: "EUR/USD",
    country: "EUR",
  });

  assert(result.confidence >= 0, "Should return confidence score");
  assert(typeof result.unit === "string", "Should return unit string");
});

Deno.test("inferUnit - wage data", () => {
  const result = inferUnit(25.5, {
    context: "hourly wage",
    country: "USA",
  });

  assert(result.confidence >= 0, "Should return confidence score");
  assert(typeof result.unit === "string", "Should return unit string");
});

Deno.test("inferUnit - edge cases", () => {
  // Test with minimal context
  const result1 = inferUnit(100, {
    context: "unknown",
    country: "XXX",
  });

  assert(result1.confidence >= 0, "Should handle minimal context");
  assert(typeof result1.unit === "string", "Should return some unit");

  // Test with very large number
  const result2 = inferUnit(1000000000, {
    context: "large number",
    country: "USA",
  });

  assert(result2.confidence >= 0, "Should handle large numbers");
  assert(
    typeof result2.unit === "string",
    "Should return unit for large numbers",
  );
});

Deno.test("validateInferredUnit - basic validation", () => {
  const result1 = validateInferredUnit(100, "USD");
  assert(typeof result1.valid === "boolean", "Should return validation result");
  assert(Array.isArray(result1.warnings), "Should return warnings array");

  const result2 = validateInferredUnit(2.5, "%");
  assert(typeof result2.valid === "boolean", "Should validate percentage");

  const result3 = validateInferredUnit(1000000, "USD Million");
  assert(
    typeof result3.valid === "boolean",
    "Should validate large currency amounts",
  );
});

Deno.test("validateInferredUnit - unreasonable combinations", () => {
  // Test unreasonable value-unit combinations
  const result1 = validateInferredUnit(150, "%"); // 150% might be unreasonable for some contexts
  assert(typeof result1.valid === "boolean", "Should validate high percentage");

  const result2 = validateInferredUnit(-5, "population");
  assert(
    typeof result2.valid === "boolean",
    "Should validate negative population",
  );

  const result3 = validateInferredUnit(0.001, "USD Trillion");
  assert(
    typeof result3.valid === "boolean",
    "Should validate very small trillion amounts",
  );
});

Deno.test("inferUnit - context sensitivity", () => {
  // Same value, different contexts should potentially give different units
  const gdpResult = inferUnit(21, {
    context: "GDP",
    country: "USA",
  });

  const ageResult = inferUnit(21, {
    context: "median age",
    country: "USA",
  });

  const rateResult = inferUnit(21, {
    context: "interest rate",
    country: "USA",
  });

  // All should return valid results
  assert(gdpResult.confidence >= 0, "GDP context should work");
  assert(ageResult.confidence >= 0, "Age context should work");
  assert(rateResult.confidence >= 0, "Rate context should work");

  // Units might be different based on context
  assert(typeof gdpResult.unit === "string", "GDP should have unit");
  assert(typeof ageResult.unit === "string", "Age should have unit");
  assert(typeof rateResult.unit === "string", "Rate should have unit");
});
