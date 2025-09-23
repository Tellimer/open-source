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

Deno.test("buildExplainMetadata - separate component fields", () => {
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

  // Check currency components
  assertExists(explain.currency);
  assertEquals(explain.currency.original, "EUR");
  assertEquals(explain.currency.normalized, "USD");

  // Check scale components
  assertExists(explain.scale);
  assertEquals(explain.scale.original, "billions");
  assertEquals(explain.scale.normalized, "millions");

  // Check time scale components
  assertExists(explain.timeScale);
  assertEquals(explain.timeScale.original, "quarter");
  assertEquals(explain.timeScale.normalized, "month");
});

Deno.test("buildExplainMetadata - component fields with no original time scale", () => {
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

  // Check currency components
  assertExists(explain.currency);
  assertEquals(explain.currency.original, "EUR");
  assertEquals(explain.currency.normalized, "USD");

  // Check scale components
  assertExists(explain.scale);
  assertEquals(explain.scale.original, "millions");
  assertEquals(explain.scale.normalized, "millions");

  // Check time scale components
  assertExists(explain.timeScale);
  assertEquals(explain.timeScale.original, undefined);
  assertEquals(explain.timeScale.normalized, "month");
});

Deno.test("buildExplainMetadata - FX with date information", () => {
  const fx: FXTable = {
    base: "USD",
    rates: { XOF: 558.16, EUR: 0.85 },
    dates: {
      XOF: "2024-01-15T10:30:00Z",
      EUR: "2024-01-15T10:30:00Z",
    },
  };

  const explain = buildExplainMetadata(1000, "XOF billions", 1791.4, {
    toCurrency: "USD",
    toMagnitude: "millions",
    fx,
  });

  // Should include FX date information
  assertEquals(explain.fx?.currency, "XOF");
  assertEquals(explain.fx?.rate, 558.16);
  assertEquals(explain.fx?.asOf, "2024-01-15T10:30:00Z");
  assertEquals(explain.fx?.source, "fallback");
  assertEquals(explain.fx?.sourceId, "SNP");
});

Deno.test("buildExplainMetadata - FX without date information", () => {
  const fx: FXTable = {
    base: "USD",
    rates: { EUR: 0.85 },
    // No dates field
  };

  const explain = buildExplainMetadata(100, "EUR millions", 85, {
    toCurrency: "USD",
    fx,
  });

  // Should not include asOf field when no date available
  assertEquals(explain.fx?.currency, "EUR");
  assertEquals(explain.fx?.rate, 0.85);
  assertEquals(explain.fx?.asOf, undefined);
});

Deno.test("buildExplainMetadata - normalizedFullUnit never uses slash style", () => {
  const explain = buildExplainMetadata(
    1200,
    "USD Million/Year",
    100,
    { toCurrency: "USD", toMagnitude: "millions", toTimeScale: "month" },
  );
  // Normalized unit strings should use "per <time>", not slash style
  if (explain.units?.normalizedFullUnit) {
    const nf = explain.units.normalizedFullUnit;
    // Should contain "per month" and not contain "/"
    if (nf.includes("/")) {
      throw new Error(`normalizedFullUnit contains slash: ${nf}`);
    }
  }
});

// ========================================
// Domain detection tests (comprehensive)
// ========================================

Deno.test("domain detection - wages by name only", () => {
  const ex = buildExplainMetadata(100, "USD Millions/Month", 100, {
    toCurrency: "USD",
    toTimeScale: "month",
    indicatorName: "Minimum Wage",
  });
  assertEquals(ex.domain, "wages");
});

Deno.test("domain detection - trade balance is NOT wages (currency+time alone)", () => {
  const ex = buildExplainMetadata(1000, "USD Millions/Quarter", 333.33, {
    toCurrency: "USD",
    toTimeScale: "month",
    indicatorName: "Balance of Trade",
  });
  // Should not be misclassified as wages
  assertEquals(ex.domain, undefined);
});

Deno.test("domain detection - percentage", () => {
  const ex = buildExplainMetadata(5.2, "%", 5.2, {
    indicatorName: "Unemployment rate",
  });
  assertEquals(ex.domain, "percentage");
});

Deno.test("domain detection - count by name and unit", () => {
  const ex = buildExplainMetadata(502, "Units Thousands", 502000, {
    indicatorName: "Car registrations",
  });
  assertEquals(ex.domain, "count");
});

Deno.test("domain detection - energy (GWh)", () => {
  const ex = buildExplainMetadata(150, "GWh", 150, {
    indicatorName: "Electricity production",
  });
  assertEquals(ex.domain, "energy");
});

Deno.test("domain detection - commodity (barrels)", () => {
  const ex = buildExplainMetadata(200, "barrels", 200, {
    indicatorName: "Crude oil production",
  });
  assertEquals(ex.domain, "commodity");
});

Deno.test("domain detection - agriculture (bushels)", () => {
  const ex = buildExplainMetadata(1000, "bushels", 1000, {
    indicatorName: "Wheat production",
  });
  assertEquals(ex.domain, "agriculture");
});

Deno.test("domain detection - metals (copper tonnes)", () => {
  const ex = buildExplainMetadata(50, "metric tonnes", 50, {
    indicatorName: "Copper production",
  });
  assertEquals(ex.domain, "metals");
});

Deno.test("domain detection - emissions (CO2 tonnes)", () => {
  const ex = buildExplainMetadata(123, "CO2 tonnes", 123, {
    indicatorName: "CO2 emissions",
  });
  assertEquals(ex.domain, "emissions");
});

Deno.test("domain detection - prefer metals over agriculture when both present", () => {
  const ex = buildExplainMetadata(75, "metric tonnes", 75, {
    indicatorName: "Copper harvest",
  });
  assertEquals(ex.domain, "metals");
});

// ========================================
// New tests for per-capita and stock-like indicators
// ========================================

Deno.test("per-capita (GDP per Capita) - no millions label; monthly timing only", () => {
  const ex = buildExplainMetadata(2364.85, "USD", 197.070833333333, {
    toCurrency: "USD",
    toTimeScale: "month",
    indicatorName: "GDP per Capita",
  });
  // Units should be USD per month (no 'millions')
  if (!ex.units) throw new Error("units missing");
  if (!ex.scale) throw new Error("scale missing");
  assertEquals(ex.units.normalizedUnit, "USD per month");
  assertEquals(ex.units.normalizedFullUnit, "USD per month");
  // No magnitude step for per-capita
  assertEquals(ex.magnitude, undefined);
  // Scale normalized should be ones
  assertEquals(ex.scale.normalized, "ones");
});

Deno.test("non-currency stock-like (Gold Reserves) - metals domain; no per-time; no magnitude", () => {
  const ex = buildExplainMetadata(61.74, "Tonnes/Quarter", 61.74, {
    toTimeScale: "month",
    indicatorName: "Gold Reserves",
  });
  // Domain should be metals
  assertEquals(ex.domain, "metals");
  // Units should be base 'tonnes' with no per-time
  if (!ex.units) throw new Error("units missing");
  assertEquals(ex.units.normalizedUnit, "tonnes");
  assertEquals(ex.units.normalizedFullUnit, "tonnes");
  // No currency or magnitude for non-currency stocks
  assertEquals(ex.currency, undefined);
  assertEquals(ex.magnitude, undefined);
});

Deno.test("currency stock-like (Money Supply M0) - omit per-time in unit strings", () => {
  const ex = buildExplainMetadata(168100, "AED Millions/Month", 45762.66, {
    toCurrency: "USD",
    toMagnitude: "millions",
    toTimeScale: "month",
    indicatorName: "Money Supply M0",
    fx: { base: "USD", rates: { AED: 3.6733 } },
  });
  if (!ex.units) throw new Error("units missing");
  // Should not include 'per month' for stock-like monetary levels
  assertEquals(ex.units.normalizedUnit, "USD millions");
  assertEquals(ex.units.normalizedFullUnit, "USD millions");
});

Deno.test("prefer unit time over dataset periodicity (AUD/Week → USD per month)", () => {
  const ex = buildExplainMetadata(1631.1, "AUD/Week", 0, {
    toCurrency: "USD",
    toTimeScale: "month",
    explicitTimeScale: "quarter", // dataset reporting frequency should NOT drive conversion
    indicatorName: "Wages in Manufacturing",
    fx: { base: "USD", rates: { AUD: 1.499 } },
  });
  if (!ex.units || !ex.periodicity) {
    throw new Error("missing units/periodicity");
  }
  // Periodicity should reflect week→month conversion (from unit), not quarter→month
  assertEquals(ex.periodicity.original, "week");
  assertEquals(ex.periodicity.target, "month");
  assertEquals(ex.periodicity.direction, "downsample");
  // Factor ≈ 52/12
  const expected = 52 / 12;
  if (Math.abs((ex.periodicity.factor ?? 0) - expected) > 1e-12) {
    throw new Error(`unexpected factor: ${ex.periodicity.factor}`);
  }
  // Units and conversion summary
  assertEquals(ex.units.originalFullUnit, "AUD per week");
  assertEquals(ex.units.normalizedFullUnit, "USD per month");
  if (!ex.conversion) throw new Error("missing conversion");
  assertEquals(ex.conversion.summary, "AUD per week → USD per month");
});

Deno.test("reportingFrequency is set when explicit periodicity is provided (unit has different time)", () => {
  const ex = buildExplainMetadata(1631.1, "AUD/Week", 0, {
    toCurrency: "USD",
    toTimeScale: "month",
    explicitTimeScale: "quarter",
    indicatorName: "Wages in Manufacturing",
    fx: { base: "USD", rates: { AUD: 1.499 } },
  });
  // Reporting frequency should reflect dataset periodicity
  assertEquals(ex.reportingFrequency, "quarter");
  // Periodicity (conversion) should reflect unit time basis
  assertEquals(ex.periodicity?.original, "week");
});

Deno.test("reportingFrequency is set when unit has no time (fallback to dataset periodicity)", () => {
  const ex = buildExplainMetadata(300, "USD Million", 0, {
    toCurrency: "USD",
    toTimeScale: "month",
    explicitTimeScale: "quarter",
  });
  // Here unit has no time; conversion uses dataset periodicity and reportingFrequency matches it
  assertEquals(ex.reportingFrequency, "quarter");
  assertEquals(ex.periodicity?.original, "quarter");
  assertEquals(ex.periodicity?.target, "month");
});

Deno.test("reportingFrequency is undefined when not provided", () => {
  const ex = buildExplainMetadata(100, "USD Millions/Year", 8.3333333333, {
    toCurrency: "USD",
    toMagnitude: "millions",
    toTimeScale: "month",
  });
  assertEquals(ex.reportingFrequency, undefined);
});

Deno.test("buildExplainMetadata - thousands/quarter → millions/month, no FX (AZE-style)", () => {
  const explain = buildExplainMetadata(
    2445459.7,
    "USD Thousand per quarter",
    815.1532333333333,
    {
      toCurrency: "USD",
      toMagnitude: "millions",
      toTimeScale: "month",
    },
  );

  assertExists(explain.units);
  assertEquals(explain.units.originalUnit, "USD thousands");
  assertEquals(explain.units.normalizedUnit, "USD millions per month");

  // Magnitude step should be present (thousands → millions)
  assertExists(explain.magnitude);
  assertEquals(explain.magnitude.originalScale, "thousands");
  assertEquals(explain.magnitude.targetScale, "millions");

  // Periodicity step should be present (quarter → month)
  assertExists(explain.periodicity);
  assertEquals(explain.periodicity.original, "quarter");
  assertEquals(explain.periodicity.target, "month");
  assertEquals(explain.periodicity.adjusted, true);
});

Deno.test("buildExplainMetadata - Population stock: monthly basis without per-time units", () => {
  const explain = buildExplainMetadata(
    35.12,
    "units per year",
    35.12,
    {
      toTimeScale: "month",
      indicatorName: "Population",
    },
  );

  // Units should remain without "per month" since this is stock-like
  assertExists(explain.units);
  assertEquals(explain.units.normalizedUnit, "units");
  assertEquals(explain.units.normalizedFullUnit, "units");

  // Periodicity should indicate target month but adjusted=false
  assertExists(explain.periodicity);
  assertEquals(explain.periodicity.target, "month");
  assertEquals(explain.periodicity.adjusted, false);
});
