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

// ========================================
// Enhanced Explain Metadata Tests (v0.2.4)
// ========================================

Deno.test("buildExplainMetadata - enhanced magnitude scaling with direction and description", () => {
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
  assertEquals(explain.magnitude.direction, "downscale");
  assertEquals(explain.magnitude.description, "billions → millions (×1000)");
});

Deno.test("buildExplainMetadata - enhanced magnitude upscaling", () => {
  const explain = buildExplainMetadata(
    1000,
    "USD Thousands",
    1,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
    },
  );

  assertExists(explain.magnitude);
  assertEquals(explain.magnitude.originalScale, "thousands");
  assertEquals(explain.magnitude.targetScale, "millions");
  assertEquals(explain.magnitude.factor, 0.001);
  assertEquals(explain.magnitude.direction, "upscale");
  assertEquals(explain.magnitude.description, "thousands → millions (×0.001)");
});

Deno.test("buildExplainMetadata - enhanced periodicity with factor and direction", () => {
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
  assertEquals(explain.periodicity.factor, 1 / 12);
  assertEquals(explain.periodicity.direction, "upsample");
  assertEquals(explain.periodicity.description, "year → month (÷12)");
});

Deno.test("buildExplainMetadata - enhanced periodicity downsampling", () => {
  const explain = buildExplainMetadata(
    100,
    "USD Million/Month",
    1200,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      toTimeScale: "year",
    },
  );

  assertExists(explain.periodicity);
  assertEquals(explain.periodicity.original, "month");
  assertEquals(explain.periodicity.target, "year");
  assertEquals(explain.periodicity.adjusted, true);
  assertEquals(explain.periodicity.factor, 12);
  assertEquals(explain.periodicity.direction, "downsample");
  assertEquals(explain.periodicity.description, "month → year (×12)");
});

Deno.test("buildExplainMetadata - enhanced periodicity no conversion", () => {
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
  assertEquals(explain.periodicity.factor, 1);
  assertEquals(explain.periodicity.direction, "none");
  assertEquals(
    explain.periodicity.description,
    "No source time scale available",
  );
});

Deno.test("buildExplainMetadata - enhanced units with full unit strings", () => {
  const explain = buildExplainMetadata(
    500,
    "EUR Billions/Quarter",
    543.48,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      toTimeScale: "month",
      fx: testFX,
    },
  );

  assertExists(explain.units);
  assertEquals(explain.units.originalUnit, "EUR billions");
  assertEquals(explain.units.normalizedUnit, "USD millions per month");
  assertEquals(explain.units.originalFullUnit, "EUR billions per quarter");
  assertEquals(explain.units.normalizedFullUnit, "USD millions per month");
});

Deno.test("buildExplainMetadata - conversion summary with steps", () => {
  const explain = buildExplainMetadata(
    -1447.74,
    "XOF Billions/Quarter",
    -864.59,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      toTimeScale: "month",
      fx: testFX,
    },
  );

  assertExists(explain.conversion);
  assertEquals(
    explain.conversion.summary,
    "XOF billions per quarter → USD millions per month",
  );
  assertEquals(explain.conversion.steps.length, 3);
  assertEquals(
    explain.conversion.steps[0],
    "Scale: billions → millions (×1000)",
  );
  assertEquals(
    explain.conversion.steps[1],
    "Currency: XOF → USD (rate: 558.16)",
  );
  assertEquals(explain.conversion.steps[2], "Time: quarter → month (÷3)");

  // Total factor should be approximately: 1000 * (1/558.16) * (1/3) ≈ 0.597
  assertEquals(
    Math.abs(explain.conversion.totalFactor - 0.5972003248769768) < 0.0001,
    true,
  );
});

Deno.test("buildExplainMetadata - conversion summary with only time conversion", () => {
  const explain = buildExplainMetadata(
    -6798.401,
    "USD Million/Year",
    -566.533,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      toTimeScale: "month",
    },
  );

  assertExists(explain.conversion);
  assertEquals(
    explain.conversion.summary,
    "USD millions per year → USD millions per month",
  );
  assertEquals(explain.conversion.steps.length, 1);
  assertEquals(explain.conversion.steps[0], "Time: year → month (÷12)");
  assertEquals(
    Math.abs(explain.conversion.totalFactor - (1 / 12)) < 0.0001,
    true,
  );
});

Deno.test("buildExplainMetadata - conversion summary with only currency conversion", () => {
  const explain = buildExplainMetadata(
    1000,
    "EUR Millions",
    1086.96,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      fx: testFX,
    },
  );

  assertExists(explain.conversion);
  assertEquals(explain.conversion.summary, "EUR millions → USD millions");
  assertEquals(explain.conversion.steps.length, 1);
  assertEquals(explain.conversion.steps[0], "Currency: EUR → USD (rate: 0.92)");
  assertEquals(
    Math.abs(explain.conversion.totalFactor - (1 / 0.92)) < 0.0001,
    true,
  );
});

Deno.test("buildExplainMetadata - conversion summary with only magnitude conversion", () => {
  const explain = buildExplainMetadata(
    5,
    "USD Billions",
    5000,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
    },
  );

  assertExists(explain.conversion);
  assertEquals(explain.conversion.summary, "USD billions → USD millions");
  assertEquals(explain.conversion.steps.length, 1);
  assertEquals(
    explain.conversion.steps[0],
    "Scale: billions → millions (×1000)",
  );
  assertEquals(explain.conversion.totalFactor, 1000);
});

Deno.test("buildExplainMetadata - no conversion summary when no conversions", () => {
  const explain = buildExplainMetadata(
    100,
    "USD Millions",
    100,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
    },
  );

  // Should not have conversion summary when no conversions are performed
  assertEquals(explain.conversion, undefined);
});

Deno.test("buildExplainMetadata - quarterly to monthly conversion", () => {
  const explain = buildExplainMetadata(
    300,
    "USD Million/Quarter",
    100,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      toTimeScale: "month",
    },
  );

  assertExists(explain.periodicity);
  assertEquals(explain.periodicity.original, "quarter");
  assertEquals(explain.periodicity.target, "month");
  assertEquals(explain.periodicity.factor, 1 / 3);
  assertEquals(explain.periodicity.direction, "upsample");
  assertEquals(explain.periodicity.description, "quarter → month (÷3)");
});

Deno.test("buildExplainMetadata - separate unit components", () => {
  const explain = buildExplainMetadata(
    500,
    "EUR Billions/Quarter",
    543.48,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      toTimeScale: "month",
      fx: testFX,
    },
  );

  assertExists(explain.units);

  // Check original components
  assertExists(explain.units.original);
  assertEquals(explain.units.original.currency, "EUR");
  assertEquals(explain.units.original.scale, "billions");
  assertEquals(explain.units.original.periodicity, "quarter");

  // Check normalized components
  assertEquals(explain.units.normalized.currency, "USD");
  assertEquals(explain.units.normalized.scale, "millions");
  assertEquals(explain.units.normalized.periodicity, "month");
});

Deno.test("buildExplainMetadata - unit components with no original time scale", () => {
  const explain = buildExplainMetadata(
    100,
    "EUR Millions",
    108.7,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      toTimeScale: "month",
      fx: testFX,
    },
  );

  assertExists(explain.units);

  // Check original components
  assertExists(explain.units.original);
  assertEquals(explain.units.original.currency, "EUR");
  assertEquals(explain.units.original.scale, "millions");
  assertEquals(explain.units.original.periodicity, undefined);

  // Check normalized components
  assertEquals(explain.units.normalized.currency, "USD");
  assertEquals(explain.units.normalized.scale, "millions");
  assertEquals(explain.units.normalized.periodicity, "month");
});
