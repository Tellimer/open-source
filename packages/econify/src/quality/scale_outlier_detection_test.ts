/**
 * Tests for scale outlier detection
 */

import { assertEquals } from "jsr:@std/assert@1";
import { detectScaleOutliers } from "./scale_outlier_detection.ts";

Deno.test("detectScaleOutliers - Tourist Arrivals scenario", () => {
  // Real-world scenario: Armenia stores raw counts, others store in thousands
  // All labeled as "Thousands" in database
  // After normalization (multiply by 1000):
  // - Armenia: 520,394 * 1000 = 520,394,000 (magnitude 8)
  // - Brazil: 6,774 * 1000 = 6,774,000 (magnitude 6)
  // - Vietnam: 1,467 * 1000 = 1,467,000 (magnitude 6)
  // - Greece: 875 * 1000 = 875,000 (magnitude 5)
  // - Mexico: 3,200 * 1000 = 3,200,000 (magnitude 6)
  // Magnitude distribution: 5:1, 6:3, 8:1 → dominant is 6 with 3/5 = 60%
  const items = [
    { id: "ARM", normalized: 520_394_000 }, // magnitude 8 - OUTLIER
    { id: "BRA", normalized: 6_774_000 }, // magnitude 6
    { id: "VNM", normalized: 1_467_000 }, // magnitude 6
    { id: "GRC", normalized: 875_000 }, // magnitude 5
    { id: "MEX", normalized: 3_200_000 }, // magnitude 6
  ];

  const result = detectScaleOutliers(items);

  assertEquals(result.hasOutliers, true);
  assertEquals(result.outlierIds, ["ARM"]);
  assertEquals(result.dominantMagnitude, 6);
  assertEquals(
    result.reason,
    "1 value(s) are 100x+ different from majority scale (3/5 at magnitude 6)",
  );
});

Deno.test("detectScaleOutliers - no outliers when values are similar scale", () => {
  const items = [
    { id: "A", normalized: 1_000_000 }, // magnitude 6
    { id: "B", normalized: 2_500_000 }, // magnitude 6
    { id: "C", normalized: 500_000 }, // magnitude 5 (within 1 magnitude)
    { id: "D", normalized: 8_000_000 }, // magnitude 6
  ];

  const result = detectScaleOutliers(items);

  assertEquals(result.hasOutliers, false);
  assertEquals(result.outlierIds, []);
});

Deno.test("detectScaleOutliers - too few items returns no outliers", () => {
  const items = [
    { id: "A", normalized: 1_000_000 },
    { id: "B", normalized: 100_000_000 },
  ];

  const result = detectScaleOutliers(items);

  assertEquals(result.hasOutliers, false);
  assertEquals(
    result.reason,
    "Too few items for outlier detection (need at least 3)",
  );
});

Deno.test("detectScaleOutliers - empty array returns no outliers", () => {
  const result = detectScaleOutliers([]);

  assertEquals(result.hasOutliers, false);
  assertEquals(result.reason, "No items to analyze");
});

Deno.test("detectScaleOutliers - no clear majority cluster", () => {
  // Values spread across different magnitudes, no clear cluster
  const items = [
    { id: "A", normalized: 100 }, // magnitude 2
    { id: "B", normalized: 1_000 }, // magnitude 3
    { id: "C", normalized: 10_000 }, // magnitude 4
    { id: "D", normalized: 100_000 }, // magnitude 5
    { id: "E", normalized: 1_000_000 }, // magnitude 6
  ];

  const result = detectScaleOutliers(items);

  assertEquals(result.hasOutliers, false);
  assertEquals(result.reason.startsWith("No clear majority cluster"), true);
});

Deno.test("detectScaleOutliers - multiple outliers", () => {
  const items = [
    { id: "A", normalized: 1_000_000 }, // magnitude 6
    { id: "B", normalized: 2_000_000 }, // magnitude 6
    { id: "C", normalized: 3_000_000 }, // magnitude 6
    { id: "D", normalized: 500_000_000 }, // magnitude 8 - OUTLIER
    { id: "E", normalized: 800_000_000 }, // magnitude 8 - OUTLIER
  ];

  const result = detectScaleOutliers(items);

  assertEquals(result.hasOutliers, true);
  assertEquals(result.outlierIds.sort(), ["D", "E"]);
  assertEquals(result.dominantMagnitude, 6);
});

Deno.test("detectScaleOutliers - custom cluster threshold", () => {
  // Distribution: magnitude 5 has 2 items (40%), magnitude 6 has 2 items (40%), magnitude 8 has 1 item (20%)
  // Since 5 and 6 both have 40%, the dominant will be whichever comes first in sort (likely 5)
  const items = [
    { id: "A", normalized: 1_000_000 }, // magnitude 6
    { id: "B", normalized: 2_000_000 }, // magnitude 6
    { id: "C", normalized: 500_000 }, // magnitude 5
    { id: "D", normalized: 800_000 }, // magnitude 5
    { id: "E", normalized: 300_000_000 }, // magnitude 8
  ];

  // With default 60% threshold - no clear majority (max is 40%)
  const result1 = detectScaleOutliers(items);
  assertEquals(result1.hasOutliers, false);

  // With 40% threshold - magnitude 5 is dominant (2/5 = 40%)
  const result2 = detectScaleOutliers(items, { clusterThreshold: 0.4 });
  assertEquals(result2.hasOutliers, true);
  assertEquals(result2.outlierIds, ["E"]);
  assertEquals(result2.dominantMagnitude, 5); // 5 and 6 are tied, but 5 has higher count first in sort
});

Deno.test("detectScaleOutliers - custom magnitude difference threshold", () => {
  const items = [
    { id: "A", normalized: 1_000_000 }, // magnitude 6
    { id: "B", normalized: 2_000_000 }, // magnitude 6
    { id: "C", normalized: 3_000_000 }, // magnitude 6
    { id: "D", normalized: 50_000_000 }, // magnitude 7 (1 magnitude away)
  ];

  // With default 2 magnitude threshold - no outliers
  const result1 = detectScaleOutliers(items);
  assertEquals(result1.hasOutliers, false);

  // With 1 magnitude threshold - D is outlier
  const result2 = detectScaleOutliers(items, {
    magnitudeDifferenceThreshold: 1,
  });
  assertEquals(result2.hasOutliers, true);
  assertEquals(result2.outlierIds, ["D"]);
});

Deno.test("detectScaleOutliers - include details option", () => {
  const items = [
    { id: "A", normalized: 1_000_000 }, // magnitude 6
    { id: "B", normalized: 2_000_000 }, // magnitude 6
    { id: "C", normalized: 3_000_000 }, // magnitude 6
    { id: "D", normalized: 500_000_000 }, // magnitude 8 - OUTLIER
  ];

  const result = detectScaleOutliers(items, { includeDetails: true });

  assertEquals(result.hasOutliers, true);
  assertEquals(result.outlierDetails?.length, 1);
  assertEquals(result.outlierDetails?.[0].id, "D");
  assertEquals(result.outlierDetails?.[0].value, 500_000_000);
  assertEquals(result.outlierDetails?.[0].magnitude, 8);
  assertEquals(result.outlierDetails?.[0].magnitudeDifference, 2);
});

Deno.test("detectScaleOutliers - handles zero values", () => {
  const items = [
    { id: "A", normalized: 0 }, // skip
    { id: "B", normalized: 1_000_000 }, // magnitude 6
    { id: "C", normalized: 2_000_000 }, // magnitude 6
    { id: "D", normalized: 3_000_000 }, // magnitude 6
  ];

  const result = detectScaleOutliers(items);

  // Should analyze 3 items (excluding zero)
  assertEquals(result.hasOutliers, false);
  assertEquals(result.dominantMagnitude, 6);
});

Deno.test("detectScaleOutliers - handles negative values", () => {
  const items = [
    { id: "A", normalized: -1_000_000 }, // magnitude 6 (abs value)
    { id: "B", normalized: 2_000_000 }, // magnitude 6
    { id: "C", normalized: -3_000_000 }, // magnitude 6
    { id: "D", normalized: -500_000_000 }, // magnitude 8 - OUTLIER
  ];

  const result = detectScaleOutliers(items);

  assertEquals(result.hasOutliers, true);
  assertEquals(result.outlierIds, ["D"]);
  assertEquals(result.dominantMagnitude, 6);
});

Deno.test("detectScaleOutliers - distribution information", () => {
  const items = [
    { id: "A", normalized: 1_000_000 }, // magnitude 6
    { id: "B", normalized: 2_000_000 }, // magnitude 6
    { id: "C", normalized: 500_000 }, // magnitude 5
    { id: "D", normalized: 300_000_000 }, // magnitude 8
  ];

  const result = detectScaleOutliers(items);

  assertEquals(result.distribution, {
    5: 1,
    6: 2,
    8: 1,
  });
});
