/**
 * End-to-end test for scale outlier detection in pipeline API
 */

import { assertEquals } from "jsr:@std/assert@1";
import { processEconomicData } from "./pipeline_api.ts";

Deno.test("processEconomicData - Tourist Arrivals with outlier detection", async () => {
  // Real-world scenario: Armenia stores raw counts, others store in thousands
  const data = [
    {
      id: "ARM",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      scale: "Thousands",
      metadata: { country: "Armenia" },
    },
    {
      id: "BRA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      scale: "Thousands",
      metadata: { country: "Brazil" },
    },
    {
      id: "VNM",
      name: "Tourist Arrivals",
      value: 1467,
      unit: "Thousands",
      scale: "Thousands",
      metadata: { country: "Vietnam" },
    },
    {
      id: "GRC",
      name: "Tourist Arrivals",
      value: 875,
      unit: "Thousands",
      scale: "Thousands",
      metadata: { country: "Greece" },
    },
    {
      id: "MEX",
      name: "Tourist Arrivals",
      value: 3200,
      unit: "Thousands",
      scale: "Thousands",
      metadata: { country: "Mexico" },
    },
  ];

  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    detectScaleOutliers: true,
    scaleOutlierOptions: {
      includeDetails: true,
    },
    explain: true,
  });

  // Armenia should be flagged as outlier
  const armenia = result.data.find((item) => item.id === "ARM");
  assertEquals(armenia?.explain?.qualityWarnings?.length, 1);
  assertEquals(armenia?.explain?.qualityWarnings?.[0].type, "scale-outlier");
  assertEquals(armenia?.explain?.qualityWarnings?.[0].severity, "warning");

  // Check that details are included
  const warning = armenia?.explain?.qualityWarnings?.[0];
  // Note: magnitude is calculated from the normalized value
  // Armenia: 520,394 (stored value) → magnitude 5
  // Others: 6,774, 1,467, 875, 3,200 → magnitudes 3, 3, 2, 3
  // The dominant cluster is at magnitude 3
  assertEquals(warning?.details?.magnitude, 5);
  assertEquals(warning?.details?.dominantMagnitude, 3);
  assertEquals(warning?.details?.magnitudeDifference, 2);

  // Others should have no warnings
  const brazil = result.data.find((item) => item.id === "BRA");
  assertEquals(brazil?.explain?.qualityWarnings, undefined);

  const vietnam = result.data.find((item) => item.id === "VNM");
  assertEquals(vietnam?.explain?.qualityWarnings, undefined);

  const greece = result.data.find((item) => item.id === "GRC");
  assertEquals(greece?.explain?.qualityWarnings, undefined);

  const mexico = result.data.find((item) => item.id === "MEX");
  assertEquals(mexico?.explain?.qualityWarnings, undefined);
});

Deno.test("processEconomicData - outlier detection disabled by default", async () => {
  const data = [
    {
      id: "ARM",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "BRA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "VNM",
      name: "Tourist Arrivals",
      value: 1467,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "GRC",
      name: "Tourist Arrivals",
      value: 875,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "MEX",
      name: "Tourist Arrivals",
      value: 3200,
      unit: "Thousands",
      scale: "Thousands",
    },
  ];

  // Without detectScaleOutliers enabled
  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    explain: true,
  });

  // No warnings should be added
  const armenia = result.data.find((item) => item.id === "ARM");
  assertEquals(armenia?.explain?.qualityWarnings, undefined);
});

Deno.test("processEconomicData - outlier detection requires autoTargetByIndicator", async () => {
  const data = [
    {
      id: "ARM",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "BRA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "VNM",
      name: "Tourist Arrivals",
      value: 1467,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "GRC",
      name: "Tourist Arrivals",
      value: 875,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "MEX",
      name: "Tourist Arrivals",
      value: 3200,
      unit: "Thousands",
      scale: "Thousands",
    },
  ];

  // With detectScaleOutliers but without autoTargetByIndicator
  const result = await processEconomicData(data, {
    detectScaleOutliers: true,
    explain: true,
  });

  // No warnings should be added (outlier detection requires auto-targeting)
  const armenia = result.data.find((item) => item.id === "ARM");
  assertEquals(armenia?.explain?.qualityWarnings, undefined);
});

Deno.test("processEconomicData - multiple indicator groups with outliers", async () => {
  const data = [
    // Tourist Arrivals group - Armenia is outlier
    {
      id: "ARM-TA",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "BRA-TA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "VNM-TA",
      name: "Tourist Arrivals",
      value: 1467,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "MEX-TA",
      name: "Tourist Arrivals",
      value: 3200,
      unit: "Thousands",
      scale: "Thousands",
    },
    // GDP group - no outliers (all similar magnitude)
    {
      id: "ARM-GDP",
      name: "GDP",
      value: 15000,
      unit: "USD Millions",
      scale: "Millions",
      currency_code: "USD",
    },
    {
      id: "BRA-GDP",
      name: "GDP",
      value: 2000000,
      unit: "USD Millions",
      scale: "Millions",
      currency_code: "USD",
    },
    {
      id: "VNM-GDP",
      name: "GDP",
      value: 350000,
      unit: "USD Millions",
      scale: "Millions",
      currency_code: "USD",
    },
    {
      id: "MEX-GDP",
      name: "GDP",
      value: 1200000,
      unit: "USD Millions",
      scale: "Millions",
      currency_code: "USD",
    },
  ];

  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    detectScaleOutliers: true,
    explain: true,
  });

  // Tourist Arrivals - Armenia should be marked
  const armTA = result.data.find((item) => item.id === "ARM-TA");
  assertEquals(armTA?.explain?.qualityWarnings?.length, 1);

  // Tourist Arrivals - others OK
  const braTA = result.data.find((item) => item.id === "BRA-TA");
  assertEquals(braTA?.explain?.qualityWarnings, undefined);

  // GDP - all OK (no clear outlier in this group)
  const armGDP = result.data.find((item) => item.id === "ARM-GDP");
  assertEquals(armGDP?.explain?.qualityWarnings, undefined);

  const braGDP = result.data.find((item) => item.id === "BRA-GDP");
  assertEquals(braGDP?.explain?.qualityWarnings, undefined);
});

Deno.test("processEconomicData - custom outlier thresholds", async () => {
  const data = [
    {
      id: "A",
      name: "Test Indicator",
      value: 100,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "B",
      name: "Test Indicator",
      value: 200,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "C",
      name: "Test Indicator",
      value: 300,
      unit: "Thousands",
      scale: "Thousands",
    },
    {
      id: "D",
      name: "Test Indicator",
      value: 5000, // ~16x larger - magnitude difference of 1
      unit: "Thousands",
      scale: "Thousands",
    },
  ];

  // With stricter threshold (1 magnitude = 10x)
  const result = await processEconomicData(data, {
    autoTargetByIndicator: true,
    detectScaleOutliers: true,
    scaleOutlierOptions: {
      magnitudeDifferenceThreshold: 1, // Detect 10x differences
    },
    explain: true,
  });

  // D should be flagged with stricter threshold
  // A/B/C: 100-300 → magnitude 2 (dominant cluster with 3/4 = 75%)
  // D: 5000 → magnitude 3 (1 magnitude away = outlier with threshold 1)
  const itemD = result.data.find((item) => item.id === "D");
  assertEquals(itemD?.explain?.qualityWarnings?.length, 1);

  // Others should be OK
  const itemA = result.data.find((item) => item.id === "A");
  assertEquals(itemA?.explain?.qualityWarnings, undefined);
});
