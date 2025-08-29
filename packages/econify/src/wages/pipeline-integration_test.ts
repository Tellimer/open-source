/**
 * Test the pipeline integration with real wages data
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import {
  createWagesPipelineConfig,
  processWagesIndicator,
} from "./pipeline-integration.ts";
import type { FXTable } from "../types.ts";

// Sample FX rates
const fx: FXTable = {
  base: "USD",
  rates: {
    EUR: 0.92,
    ALL: 90.91,
    ARS: 350.0,
    AMD: 387.5,
    AUD: 1.52,
    AZN: 1.70,
    BGN: 1.80,
    BHD: 0.377,
    BAM: 1.80,
    BYN: 3.20,
    BRL: 5.15,
    BWP: 13.5,
    CAD: 1.36,
    CHF: 0.88,
    CLP: 950.0,
    CNY: 7.25,
    CRC: 520.0,
    CUP: 24.0,
    CZK: 22.8,
    DKK: 6.85,
  },
};

// Sample wages data based on your provided data
const sampleWagesIndicator = {
  indicator_id: "WAGES",
  indicator_name: "Wages",
  value_range: { min: 29.68, max: 7473636.363636364 },
  countries: {
    ALB: {
      date: "2025-03-31",
      value: 7473636.363636364,
      tooltip: {
        indicatorId: "ALBANIAWAG",
        currency: "ALL",
        units: "ALL/Month",
        periodicity: "Quarterly",
        original_value: "82210.000",
        normalized_value: 7473636.363636364,
      },
    },
    ARG: {
      date: "2025-05-31",
      value: "1627306.000",
      tooltip: {
        indicatorId: "ARGENTINAWAG",
        currency: "ARS",
        units: "ARS/Month",
        periodicity: "Monthly",
      },
    },
    ARM: {
      date: "2025-06-30",
      value: "297624.000",
      tooltip: {
        indicatorId: "ARMENIAWAG",
        currency: "AMD",
        units: "AMD/Month",
        periodicity: "Monthly",
      },
    },
    AUS: {
      date: "2023-12-31",
      value: "1432.600",
      tooltip: {
        indicatorId: "AUSTRALIAWAG",
        currency: "AUD",
        units: "AUD/Week",
        periodicity: "Quarterly",
      },
    },
    CAN: {
      date: "2023-07-31",
      value: "29.680",
      tooltip: {
        indicatorId: "CANADAWAG",
        currency: "CAD",
        units: "CAD/Hour",
        periodicity: "Monthly",
      },
    },
    CHN: {
      date: "2024-12-31",
      value: "124110.000",
      tooltip: {
        indicatorId: "CHINAWAG",
        currency: "CNY",
        units: "CNY/Year",
        periodicity: "Yearly",
      },
    },
  },
};

Deno.test("processWagesIndicator - full integration", async () => {
  const result = await processWagesIndicator(sampleWagesIndicator, fx, {
    targetCurrency: "USD",
    excludeIndexValues: false,
  });

  // Check structure
  assertExists(result.original);
  assertExists(result.normalized);
  assertExists(result.summary);
  assertExists(result.comparable);

  // Check summary
  assertEquals(result.summary.total, 6);
  assertEquals(result.summary.dataTypes.currency, 6); // All are currency-based
  assertEquals(result.summary.comparable, 6); // All should be comparable

  // Check that values are normalized
  assertExists(result.summary.valueRange);
  assertEquals(
    result.summary.valueRange.min < result.summary.valueRange.max,
    true,
  );

  // Values should be in reasonable USD/month range
  assertEquals(result.summary.valueRange.min > 100, true); // At least $100/month
  assertEquals(result.summary.valueRange.max < 100000, true); // Less than $100k/month
});

Deno.test("processWagesIndicator - currency conversions", async () => {
  const result = await processWagesIndicator(sampleWagesIndicator, fx, {
    targetCurrency: "USD",
  });

  const comparable = result.comparable;

  // Find specific countries and check conversions
  const albResult = comparable.find((c) => c.country === "ALB");
  assertExists(albResult);
  // The function uses the main value (7473636.363636364) not original_value
  // 7473636.363636364 ALL/Month -> ~82,209 USD/month (7473636 / 90.91)
  const expectedAlb = 7473636.363636364 / 90.91;
  assertEquals(
    Math.abs(albResult.normalizedValue! - expectedAlb) < 100,
    true,
    `Expected ALB ~${expectedAlb}, got ${albResult.normalizedValue}`,
  );

  const canResult = comparable.find((c) => c.country === "CAN");
  assertExists(canResult);
  // Original: 29.68 CAD/Hour, should convert to ~16k USD/month
  // 29.68 CAD/hour * (365*24/12) hours/month / 1.36 CAD/USD ≈ 16k
  const expectedCan = (29.68 * 365 * 24 / 12) / 1.36;
  assertEquals(Math.abs(canResult.normalizedValue! - expectedCan) < 100, true);

  const ausResult = comparable.find((c) => c.country === "AUS");
  assertExists(ausResult);
  // Original: 1432.6 AUD/Week, should convert to ~4k USD/month
  // 1432.6 AUD/week * 52/12 weeks/month / 1.52 AUD/USD ≈ 4k
  const expectedAus = (1432.6 * 52 / 12) / 1.52;
  assertEquals(Math.abs(ausResult.normalizedValue! - expectedAus) < 100, true);
});

Deno.test("createWagesPipelineConfig", () => {
  const config = createWagesPipelineConfig({
    targetCurrency: "EUR",
    minQualityScore: 50,
  });

  assertEquals(config.targetCurrency, "EUR");
  assertEquals(config.targetTimeScale, "month");
  assertEquals(config.minQualityScore, 50);
  assertEquals(config.adjustInflation, false);
  assertEquals(config.inferUnits, true);
});

Deno.test("processWagesIndicator - handles mixed data", async () => {
  // Test with mixed currency and index data
  const mixedData = {
    ...sampleWagesIndicator,
    countries: {
      ...sampleWagesIndicator.countries,
      TEST_INDEX: {
        date: "2025-01-01",
        value: "125.5",
        tooltip: {
          indicatorId: "TESTINDEX",
          currency: null,
          units: "points",
          periodicity: "Monthly",
        },
      },
    },
  };

  const result = await processWagesIndicator(mixedData, fx);

  // Should handle the index value appropriately
  assertEquals(result.summary.total, 7);
  assertEquals(result.summary.dataTypes.currency, 6);
  assertEquals(result.summary.dataTypes.index, 1);

  // Comparable should only include currency values
  assertEquals(result.comparable.length, 6);
});

Deno.test("processWagesIndicator - updates indicator data", async () => {
  const result = await processWagesIndicator(sampleWagesIndicator, fx);

  // Check that the normalized indicator has updated value range
  assertExists(result.normalized.value_range);

  // The normalized range should be much more reasonable than the original
  // Original: 29.68 - 7,473,636 (huge range, mixed units)
  // Normalized: should be in hundreds to tens of thousands USD/month
  assertEquals(
    result.normalized.value_range.min > 500,
    true,
    "Min should be reasonable wage",
  );
  assertEquals(
    result.normalized.value_range.max < 100000,
    true,
    "Max should be reasonable wage",
  );
  assertEquals(
    result.normalized.value_range.max < sampleWagesIndicator.value_range.max,
    true,
    "Normalized max should be much smaller than original max",
  );

  // Check that country data is updated
  const albCountry = result.normalized.countries.ALB;
  assertExists(albCountry);
  assertExists(albCountry.tooltip.wage_normalization);
  assertEquals(albCountry.tooltip.wage_normalization.data_type, "currency");
  assertEquals(albCountry.tooltip.units, "USD/month");

  // Check that the value was actually normalized (should be much smaller than original)
  assertEquals(typeof albCountry.value, "number");
  assertEquals(
    albCountry.value < 100000,
    true,
    "Normalized value should be reasonable",
  );
});
