import {
  assertEquals,
  assertExists,
  assertGreater,
  assertLess,
  assertNotEquals,
  assertStringIncludes,
} from "jsr:@std/assert";
import { processEconomicData } from "../../api/pipeline_api.ts";
import type { ParsedData } from "../shared/types.ts";

/**
 * End-to-End Auto-Targeting Validation Tests
 *
 * These tests validate that the V2 global auto-targeting implementation works correctly
 * with real-world data patterns, ensuring auto-targets are computed, applied, and
 * reflected in the final output with proper explain metadata.
 */

Deno.test("E2E Auto-Targeting: Consumer Spending with mixed currencies", async () => {
  // Real-world scenario: Consumer Spending data with majority USD, minority AFN
  const consumerSpendingData: ParsedData[] = [
    {
      id: "USACONSPE",
      value: 15000000,
      unit: "USD Million",
      name: "Consumer Spending",
      country_iso: "USA",
      date: "2024-12-31",
      category_group: "Consumer",
      currency_code: "USD",
      periodicity: "Yearly",
    },
    {
      id: "GBRCONSPE",
      value: 2000000,
      unit: "USD Million",
      name: "Consumer Spending",
      country_iso: "GBR",
      date: "2024-12-31",
      category_group: "Consumer",
      currency_code: "USD",
      periodicity: "Yearly",
    },
    {
      id: "DEUCONSPE",
      value: 3500000,
      unit: "USD Million",
      name: "Consumer Spending",
      country_iso: "DEU",
      date: "2024-12-31",
      category_group: "Consumer",
      currency_code: "USD",
      periodicity: "Yearly",
    },
    {
      id: "AFGANISTACONSPE",
      value: 1301129,
      unit: "AFN Million", // Minority currency - should be converted to USD
      name: "Consumer Spending",
      country_iso: "AFG",
      date: "2023-12-31",
      category_group: "Consumer",
      currency_code: "AFN",
      periodicity: "Yearly",
    },
  ];

  const result = await processEconomicData(consumerSpendingData, {
    engine: "v2",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time", "currency"],
    indicatorKey: "name",
    minMajorityShare: 0.6, // 75% USD should trigger auto-targeting
    tieBreakers: {
      currency: "prefer-USD",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    minQualityScore: 0,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: { AFN: 0.014 }, // 1 USD = ~71 AFN
      dates: { AFN: "2024-01-01" },
    },
    explain: true,
  });

  // Validate basic processing
  assertEquals(result.data.length, 4);
  assertExists(result.data[0]);

  // Find the AFN item that should have been converted
  const afnItem = result.data.find((item) => item.country_iso === "AFG");
  assertExists(afnItem, "AFG Consumer Spending item should exist");

  // CRITICAL: AFN should be converted to USD due to auto-targeting
  assertStringIncludes(
    afnItem.normalizedUnit || "",
    "USD",
    "AFN should be auto-converted to USD based on majority currency",
  );

  // Validate auto-target explain metadata exists
  assertExists(afnItem.explain, "Explain metadata should exist");

  // Check for auto-target information in explain
  if (afnItem.explain.autoTarget) {
    assertExists(
      afnItem.explain.autoTarget.currency,
      "Auto-target currency info should exist",
    );
    assertEquals(
      afnItem.explain.autoTarget.currency.selected,
      "USD",
      "Auto-target should select USD",
    );
    assertGreater(
      afnItem.explain.autoTarget.currency.dominance || 0,
      0.6,
      "USD dominance should be > 60%",
    );
  }

  // Validate conversion happened
  const actualValue = afnItem.normalized || 0;

  // The conversion should result in a reasonable USD value
  // AFN millions should convert to much smaller USD value
  // Just ensure it's converted and in a reasonable range (not the original AFN value)
  assertNotEquals(
    actualValue,
    1301129,
    "Value should be converted from original AFN amount",
  );
  assertGreater(actualValue, 1000, "Converted USD value should be significant");
  console.log(
    `✅ AFN converted to USD: ${1301129} AFN Million → ${actualValue} USD Million`,
  );

  console.log(
    "✅ Auto-targeting E2E test passed - AFN converted to USD based on majority",
  );
});

Deno.test("E2E Auto-Targeting: Mixed indicators with different auto-targets", async () => {
  // Test multiple indicators with different auto-targeting patterns
  const mixedData: ParsedData[] = [
    // GDP - mostly EUR
    {
      id: "DEUGDP",
      value: 4000000,
      unit: "EUR Million",
      name: "GDP",
      country_iso: "DEU",
      date: "2024-12-31",
      currency_code: "EUR",
      periodicity: "Yearly",
    },
    {
      id: "FRAGDP",
      value: 2800000,
      unit: "EUR Million",
      name: "GDP",
      country_iso: "FRA",
      date: "2024-12-31",
      currency_code: "EUR",
      periodicity: "Yearly",
    },
    {
      id: "USAGDP",
      value: 25000000,
      unit: "USD Million",
      name: "GDP",
      country_iso: "USA",
      date: "2024-12-31",
      currency_code: "USD",
      periodicity: "Yearly",
    },

    // Inflation Rate - percentages (no currency auto-targeting)
    {
      id: "DEUINF",
      value: 2.1,
      unit: "%",
      name: "Inflation Rate",
      country_iso: "DEU",
      date: "2024-12-31",
      currency_code: null,
      periodicity: "Monthly",
    },
    {
      id: "FRAINF",
      value: 1.8,
      unit: "%",
      name: "Inflation Rate",
      country_iso: "FRA",
      date: "2024-12-31",
      currency_code: null,
      periodicity: "Monthly",
    },
    {
      id: "USAINF",
      value: 3.2,
      unit: "%",
      name: "Inflation Rate",
      country_iso: "USA",
      date: "2024-12-31",
      currency_code: null,
      periodicity: "Monthly",
    },
  ];

  const result = await processEconomicData(mixedData, {
    engine: "v2",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["magnitude", "time", "currency"],
    indicatorKey: "name",
    minMajorityShare: 0.6,
    tieBreakers: {
      currency: "prefer-USD",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    minQualityScore: 0,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: { EUR: 1.1 },
      dates: { EUR: "2024-01-01" },
    },
    explain: true,
  });

  assertEquals(result.data.length, 6);

  // Check GDP auto-targeting (should target EUR - 67% majority)
  const gdpItems = result.data.filter((item) => item.name === "GDP");
  assertEquals(gdpItems.length, 3);

  const usdGdpItem = gdpItems.find((item) => item.country_iso === "USA");
  assertExists(usdGdpItem);

  // USD GDP should be converted to EUR due to auto-targeting
  if (usdGdpItem.explain?.autoTarget?.currency) {
    assertEquals(
      usdGdpItem.explain.autoTarget.currency.selected,
      "EUR",
      "GDP should auto-target to EUR",
    );
  }

  // Check Inflation Rate (should remain as percentages, no currency conversion)
  const inflationItems = result.data.filter((item) =>
    item.name === "Inflation Rate"
  );
  assertEquals(inflationItems.length, 3);

  inflationItems.forEach((item) => {
    assertStringIncludes(
      item.normalizedUnit || "",
      "%",
      "Inflation rates should remain as percentages",
    );
    const domainBucket =
      typeof item.explain?.domain === "object" && item.explain.domain !== null
        ? (item.explain.domain as any).bucket
        : item.explain?.domain;
    assertEquals(
      domainBucket,
      "percentages",
      "Should be classified as percentages",
    );
  });

  console.log("✅ Mixed indicators auto-targeting test passed");
});

Deno.test("E2E Auto-Targeting: Explain metadata validation", async () => {
  const testData: ParsedData[] = [
    {
      id: "IND1",
      value: 1000,
      unit: "USD Million",
      name: "Test Indicator",
      country_iso: "USA",
      date: "2024-12-31",
      currency_code: "USD",
      periodicity: "Quarterly",
    },
    {
      id: "IND2",
      value: 2000,
      unit: "USD Million",
      name: "Test Indicator",
      country_iso: "GBR",
      date: "2024-12-31",
      currency_code: "USD",
      periodicity: "Quarterly",
    },
    {
      id: "IND3",
      value: 500,
      unit: "EUR Million",
      name: "Test Indicator",
      country_iso: "DEU",
      date: "2024-12-31",
      currency_code: "EUR",
      periodicity: "Quarterly",
    },
  ];

  const result = await processEconomicData(testData, {
    engine: "v2",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["currency", "magnitude", "time"],
    indicatorKey: "name",
    minMajorityShare: 0.6,
    tieBreakers: {
      currency: "prefer-USD",
      magnitude: "prefer-millions",
      time: "prefer-month",
    },
    minQualityScore: 0,
    useLiveFX: false,
    fxFallback: {
      base: "USD",
      rates: { EUR: 1.1 },
      dates: { EUR: "2024-01-01" },
    },
    explain: true,
  });

  assertEquals(result.data.length, 3);

  // Validate explain metadata structure
  result.data.forEach((item, index) => {
    assertExists(item.explain, `Item ${index} should have explain metadata`);
    assertExists(item.explain.explain_version, "Should have explain version");
    assertEquals(
      item.explain.explain_version,
      "v2",
      "Should be V2 explain format",
    );

    // Check for router information
    assertExists(item.explain.router, "Should have router information");
    assertExists(
      item.explain.router.processed_buckets ||
        item.explain.router.processedBuckets,
      "Should have processed buckets",
    );

    // Check domain classification
    assertExists(item.explain.domain, "Should have domain classification");
    const domainBucket =
      typeof item.explain.domain === "object" && item.explain.domain !== null
        ? (item.explain.domain as any).bucket
        : item.explain.domain;
    assertExists(domainBucket, "Should have domain bucket");

    // For monetary items, check for auto-target metadata
    if (domainBucket === "monetaryStock" || domainBucket === "monetaryFlow") {
      // Auto-target metadata should be present
      if (item.explain.autoTarget) {
        assertExists(
          item.explain.autoTarget.currency,
          "Should have currency auto-target info",
        );
        assertExists(
          item.explain.autoTarget.currency.selected,
          "Should have selected currency",
        );
        assertExists(
          item.explain.autoTarget.currency.dominance,
          "Should have currency dominance",
        );
      }
    }
  });

  console.log("✅ Explain metadata validation test passed");
});

Deno.test("E2E Auto-Targeting: Global monthly dominance forces monthly (flows)", async () => {
  const data: ParsedData[] = [
    {
      id: "c1",
      value: 100,
      unit: "USD millions per month",
      name: "Trade Balance",
      country_iso: "USA",
    },
    {
      id: "c2",
      value: 120,
      unit: "USD millions per month",
      name: "Trade Balance",
      country_iso: "GBR",
    },
    {
      id: "c3",
      value: 90,
      unit: "USD millions per month",
      name: "Trade Balance",
      country_iso: "DEU",
    },
    {
      id: "c4",
      value: 80,
      unit: "USD millions per month",
      name: "Trade Balance",
      country_iso: "FRA",
    },
    {
      id: "c5",
      value: 110,
      unit: "USD millions per month",
      name: "Trade Balance",
      country_iso: "JPN",
    },
    {
      id: "c6",
      value: 300,
      unit: "USD millions per quarter",
      name: "Trade Balance",
      country_iso: "ARE",
    },
  ];

  const result = await processEconomicData(data, {
    engine: "v2",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["time", "currency", "magnitude"],
    indicatorKey: "name",
    minMajorityShare: 0.6,
    explain: true,
  });

  // All flow items should end up per month
  result.data.forEach((item) => {
    assertStringIncludes(item.normalizedUnit || "", "per month");
  });
});

Deno.test("E2E Auto-Targeting: Global quarterly dominance forces quarterly (flows)", async () => {
  const data: ParsedData[] = [
    {
      id: "q1",
      value: 300,
      unit: "USD millions per quarter",
      name: "Trade Balance",
      country_iso: "USA",
    },
    {
      id: "q2",
      value: 240,
      unit: "USD millions per quarter",
      name: "Trade Balance",
      country_iso: "GBR",
    },
    {
      id: "q3",
      value: 210,
      unit: "USD millions per quarter",
      name: "Trade Balance",
      country_iso: "DEU",
    },
    {
      id: "q4",
      value: 180,
      unit: "USD millions per quarter",
      name: "Trade Balance",
      country_iso: "FRA",
    },
    {
      id: "q5",
      value: 260,
      unit: "USD millions per quarter",
      name: "Trade Balance",
      country_iso: "JPN",
    },
    {
      id: "m1",
      value: 100,
      unit: "USD millions per month",
      name: "Trade Balance",
      country_iso: "ARE",
    },
  ];

  const result = await processEconomicData(data, {
    engine: "v2",
    autoTargetByIndicator: true,
    autoTargetDimensions: ["time", "currency", "magnitude"],
    indicatorKey: "name",
    minMajorityShare: 0.6,
    explain: true,
  });

  // All flow items should end up per quarter
  result.data.forEach((item) => {
    assertStringIncludes(item.normalizedUnit || "", "per quarter");
  });
});
