/**
 * Integration tests for scale outlier detection in auto-targets
 */

import { assertEquals } from "jsr:@std/assert@1";
import { applyScaleOutlierDetection } from "./auto_targets.ts";
import type { ParsedData } from "../workflows/economic-data-workflow.ts";

Deno.test("applyScaleOutlierDetection - Tourist Arrivals real scenario", () => {
  // Real-world scenario: Armenia stores raw counts, others store in thousands
  // After normalization, Armenia shows 520M tourists vs Brazil 6.77M
  // Magnitude distribution: 5:1, 6:3, 8:1 → dominant is 6 with 3/5 = 60%
  const data: ParsedData[] = [
    {
      id: "ARM",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      normalized: 520_394_000,
      metadata: { country: "Armenia" },
    },
    {
      id: "BRA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      normalized: 6_774_000,
      metadata: { country: "Brazil" },
    },
    {
      id: "VNM",
      name: "Tourist Arrivals",
      value: 1467,
      unit: "Thousands",
      normalized: 1_467_000,
      metadata: { country: "Vietnam" },
    },
    {
      id: "GRC",
      name: "Tourist Arrivals",
      value: 875,
      unit: "Thousands",
      normalized: 875_000,
      metadata: { country: "Greece" },
    },
    {
      id: "MEX",
      name: "Tourist Arrivals",
      value: 3200,
      unit: "Thousands",
      normalized: 3_200_000,
      metadata: { country: "Mexico" },
    },
  ];

  const result = applyScaleOutlierDetection(data, {
    detectScaleOutliers: true,
    scaleOutlierOptions: { includeDetails: true },
  });

  // Armenia should be marked as outlier
  const armenia = result.data.find((item) => item.id === "ARM");
  assertEquals(armenia?.explain?.qualityWarnings?.length, 1);
  assertEquals(armenia?.explain?.qualityWarnings?.[0].type, "scale-outlier");
  assertEquals(armenia?.explain?.qualityWarnings?.[0].severity, "warning");

  // Others should have no warnings
  const brazil = result.data.find((item) => item.id === "BRA");
  assertEquals(brazil?.explain?.qualityWarnings, undefined);

  const vietnam = result.data.find((item) => item.id === "VNM");
  assertEquals(vietnam?.explain?.qualityWarnings, undefined);

  const greece = result.data.find((item) => item.id === "GRC");
  assertEquals(greece?.explain?.qualityWarnings, undefined);
});

Deno.test("applyScaleOutlierDetection - disabled by default", () => {
  const data: ParsedData[] = [
    {
      id: "ARM",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      normalized: 520_394_000,
    },
    {
      id: "BRA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      normalized: 6_774_000,
    },
  ];

  // Without detectScaleOutliers enabled
  const result = applyScaleOutlierDetection(data, {});

  // No warnings should be added
  assertEquals(result.data[0].explain?.qualityWarnings, undefined);
  assertEquals(result.data[1].explain?.qualityWarnings, undefined);
});

Deno.test("applyScaleOutlierDetection - groups by indicator name", () => {
  const data: ParsedData[] = [
    // Tourist Arrivals group - Armenia is outlier
    {
      id: "ARM-TA",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      normalized: 520_394_000,
    },
    {
      id: "BRA-TA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      normalized: 6_774_000,
    },
    {
      id: "VNM-TA",
      name: "Tourist Arrivals",
      value: 1467,
      unit: "Thousands",
      normalized: 1_467_000,
    },
    // GDP group - no outliers
    {
      id: "ARM-GDP",
      name: "GDP",
      value: 15000,
      unit: "USD Millions",
      normalized: 15_000_000_000,
    },
    {
      id: "BRA-GDP",
      name: "GDP",
      value: 2000000,
      unit: "USD Millions",
      normalized: 2_000_000_000_000,
    },
    {
      id: "VNM-GDP",
      name: "GDP",
      value: 350000,
      unit: "USD Millions",
      normalized: 350_000_000_000,
    },
  ];

  const result = applyScaleOutlierDetection(data, {
    detectScaleOutliers: true,
  });

  // Tourist Arrivals - Armenia should be marked
  const armTA = result.data.find((item) => item.id === "ARM-TA");
  assertEquals(armTA?.explain?.qualityWarnings?.length, 1);

  // Tourist Arrivals - others OK
  const braTA = result.data.find((item) => item.id === "BRA-TA");
  assertEquals(braTA?.explain?.qualityWarnings, undefined);

  // GDP - all OK (no clear outlier, magnitudes are 10, 12, 11)
  const armGDP = result.data.find((item) => item.id === "ARM-GDP");
  assertEquals(armGDP?.explain?.qualityWarnings, undefined);

  const braGDP = result.data.find((item) => item.id === "BRA-GDP");
  assertEquals(braGDP?.explain?.qualityWarnings, undefined);
});

Deno.test("applyScaleOutlierDetection - preserves existing explain data", () => {
  const data: ParsedData[] = [
    {
      id: "ARM",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      normalized: 520_394_000,
      explain: {
        magnitude: {
          originalScale: "thousands",
          targetScale: "thousands",
          factor: 1,
          direction: "none",
          description: "No scaling needed",
        },
      },
    },
    {
      id: "BRA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      normalized: 6_774_000,
    },
    {
      id: "VNM",
      name: "Tourist Arrivals",
      value: 1467,
      unit: "Thousands",
      normalized: 1_467_000,
    },
  ];

  const result = applyScaleOutlierDetection(data, {
    detectScaleOutliers: true,
  });

  const armenia = result.data.find((item) => item.id === "ARM");

  // Should preserve existing explain.magnitude
  assertEquals(armenia?.explain?.magnitude?.description, "No scaling needed");

  // Should add quality warning
  assertEquals(armenia?.explain?.qualityWarnings?.length, 1);
  assertEquals(armenia?.explain?.qualityWarnings?.[0].type, "scale-outlier");
});

Deno.test("applyScaleOutlierDetection - handles missing normalized values", () => {
  const data: ParsedData[] = [
    {
      id: "ARM",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      // Missing normalized value
    },
    {
      id: "BRA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      normalized: 6_774_000,
    },
  ];

  // Should not crash
  const result = applyScaleOutlierDetection(data, {
    detectScaleOutliers: true,
  });

  assertEquals(result.data.length, 2);
  // Too few valid items for detection
  assertEquals(result.data[0].explain?.qualityWarnings, undefined);
  assertEquals(result.data[1].explain?.qualityWarnings, undefined);
});

Deno.test("applyScaleOutlierDetection - custom indicator key resolver", () => {
  const data: ParsedData[] = [
    {
      id: "ARM",
      value: 520394,
      unit: "Thousands",
      normalized: 520_394_000,
      metadata: { indicator_name: "Tourist Arrivals" },
    },
    {
      id: "BRA",
      value: 6774,
      unit: "Thousands",
      normalized: 6_774_000,
      metadata: { indicator_name: "Tourist Arrivals" },
    },
    {
      id: "VNM",
      value: 1467,
      unit: "Thousands",
      normalized: 1_467_000,
      metadata: { indicator_name: "Tourist Arrivals" },
    },
  ];

  // Use custom key resolver to get indicator name from metadata
  const result = applyScaleOutlierDetection(data, {
    detectScaleOutliers: true,
    indicatorKey: (d) =>
      String((d.metadata as Record<string, unknown>)?.indicator_name ?? ""),
  });

  const armenia = result.data.find((item) => item.id === "ARM");
  assertEquals(armenia?.explain?.qualityWarnings?.length, 1);
});

Deno.test("applyScaleOutlierDetection - empty data array", () => {
  const result = applyScaleOutlierDetection([], {
    detectScaleOutliers: true,
  });

  assertEquals(result.data.length, 0);
});

Deno.test("applyScaleOutlierDetection - quality warning details", () => {
  const data: ParsedData[] = [
    {
      id: "ARM",
      name: "Tourist Arrivals",
      value: 520394,
      unit: "Thousands",
      normalized: 520_394_000,
    },
    {
      id: "BRA",
      name: "Tourist Arrivals",
      value: 6774,
      unit: "Thousands",
      normalized: 6_774_000,
    },
    {
      id: "VNM",
      name: "Tourist Arrivals",
      value: 1467,
      unit: "Thousands",
      normalized: 1_467_000,
    },
  ];

  const result = applyScaleOutlierDetection(data, {
    detectScaleOutliers: true,
    scaleOutlierOptions: { includeDetails: true },
  });

  const armenia = result.data.find((item) => item.id === "ARM");
  const warning = armenia?.explain?.qualityWarnings?.[0];

  assertEquals(warning?.type, "scale-outlier");
  assertEquals(warning?.severity, "warning");
  assertEquals(typeof warning?.message, "string");
  assertEquals(warning?.details?.value, 520_394_000);
  assertEquals(warning?.details?.magnitude, 8);
  assertEquals(warning?.details?.dominantMagnitude, 6);
  assertEquals(warning?.details?.magnitudeDifference, 2);
  assertEquals(typeof warning?.details?.distribution, "object");
});
