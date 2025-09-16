/**
 * Tests for explain metadata functionality
 */

import { assertEquals, assertExists } from "@std/assert";
import { buildExplainMetadata, enhanceExplainWithFXSource } from "./explain.ts";
import type { FXTable } from "../types.ts";

const testFX: FXTable = {
  base: "USD",
  rates: {
    XOF: 558.16,
    EUR: 0.92,
    JPY: 150,
    GBP: 0.79,
  },
};

Deno.test("buildExplainMetadata - FX conversion", () => {
  const explain = buildExplainMetadata(
    -482.58,
    "XOF Billions",
    -0.86,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      fx: testFX,
    },
  );

  assertExists(explain.fx);
  assertEquals(explain.fx.currency, "XOF");
  assertEquals(explain.fx.base, "USD");
  assertEquals(explain.fx.rate, 558.16);
  assertEquals(explain.fx.source, "fallback");
  assertEquals(explain.fx.sourceId, "SNP");
});

Deno.test("buildExplainMetadata - magnitude scaling", () => {
  const explain = buildExplainMetadata(
    1000,
    "USD Billions",
    1000000,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
    },
  );

  assertExists(explain.magnitude);
  assertEquals(explain.magnitude.originalScale, "billions");
  assertEquals(explain.magnitude.targetScale, "millions");
  assertEquals(explain.magnitude.factor, 1000);
});

Deno.test("buildExplainMetadata - no magnitude scaling needed", () => {
  const explain = buildExplainMetadata(
    100,
    "USD Millions",
    100,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
    },
  );

  // Should not have magnitude info when no scaling is needed
  assertEquals(explain.magnitude, undefined);
});

Deno.test("buildExplainMetadata - units information", () => {
  const explain = buildExplainMetadata(
    500,
    "EUR Billions",
    543.48,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      fx: testFX,
    },
  );

  assertExists(explain.units);
  assertEquals(explain.units.originalUnit, "EUR billions");
  assertEquals(explain.units.normalizedUnit, "USD millions");
});

Deno.test("buildExplainMetadata - periodicity adjustment", () => {
  const explain = buildExplainMetadata(
    1200,
    "USD Million/Year",
    100,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      toTimeScale: "month",
    },
  );

  assertExists(explain.periodicity);
  assertEquals(explain.periodicity.original, "year");
  assertEquals(explain.periodicity.target, "month");
  assertEquals(explain.periodicity.adjusted, true);
});

Deno.test("buildExplainMetadata - no periodicity adjustment", () => {
  const explain = buildExplainMetadata(
    100,
    "USD Million",
    100,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      toTimeScale: "month",
    },
  );

  assertExists(explain.periodicity);
  assertEquals(explain.periodicity.original, undefined);
  assertEquals(explain.periodicity.target, "month");
  assertEquals(explain.periodicity.adjusted, false);
});

Deno.test("buildExplainMetadata - complex conversion", () => {
  // XOF Billions per Quarter → USD Millions per Month
  const explain = buildExplainMetadata(
    -1447.74, // XOF Billions per Quarter
    "XOF Billions/Quarter",
    -0.86, // USD Millions per Month
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      toTimeScale: "month",
      fx: testFX,
    },
  );

  // Should have all metadata types
  assertExists(explain.fx);
  assertExists(explain.magnitude);
  assertExists(explain.periodicity);
  assertExists(explain.units);

  // FX
  assertEquals(explain.fx.currency, "XOF");
  assertEquals(explain.fx.rate, 558.16);

  // Magnitude
  assertEquals(explain.magnitude.originalScale, "billions");
  assertEquals(explain.magnitude.targetScale, "millions");
  assertEquals(explain.magnitude.factor, 1000);

  // Periodicity
  assertEquals(explain.periodicity.original, "quarter");
  assertEquals(explain.periodicity.target, "month");
  assertEquals(explain.periodicity.adjusted, true);

  // Units
  assertEquals(explain.units.originalUnit, "XOF billions");
  assertEquals(explain.units.normalizedUnit, "USD millions per month");
});

Deno.test("enhanceExplainWithFXSource - live source", () => {
  const baseExplain = buildExplainMetadata(
    100,
    "EUR Millions",
    108.7,
    {
      toCurrency: "USD",
      fx: testFX,
    },
  );

  const enhanced = enhanceExplainWithFXSource(
    baseExplain,
    "live",
    "ECB",
    "2025-01-15T10:30:00Z",
  );

  assertExists(enhanced.fx);
  assertEquals(enhanced.fx.source, "live");
  assertEquals(enhanced.fx.sourceId, "ECB");
  assertEquals(enhanced.fx.asOf, "2025-01-15T10:30:00Z");
});

Deno.test("enhanceExplainWithFXSource - fallback source", () => {
  const baseExplain = buildExplainMetadata(
    1000,
    "JPY Millions",
    6.67,
    {
      toCurrency: "USD",
      fx: testFX,
    },
  );

  const enhanced = enhanceExplainWithFXSource(
    baseExplain,
    "fallback",
    "SNP",
  );

  assertExists(enhanced.fx);
  assertEquals(enhanced.fx.source, "fallback");
  assertEquals(enhanced.fx.sourceId, "SNP");
  assertEquals(enhanced.fx.asOf, undefined);
});

Deno.test("enhanceExplainWithFXSource - no FX metadata", () => {
  const baseExplain = buildExplainMetadata(
    100,
    "USD Millions",
    100,
    {
      toCurrency: "USD",
    },
  );

  const enhanced = enhanceExplainWithFXSource(
    baseExplain,
    "live",
    "ECB",
  );

  // Should return unchanged since there's no FX metadata
  assertEquals(enhanced, baseExplain);
});
