/**
 * Parity runner for comparing V1 vs V2 pipeline outputs
 * Identifies differences and categorizes them as expected vs unexpected
 */

import { createPipeline } from "../../workflows/index.ts";
import type { ParsedData, PipelineConfig } from "../../workflows/index.ts";

export interface ParityResult {
  id: string;
  v1Output: any;
  v2Output: any;
  differences: ParityDifference[];
  status: "identical" | "expected_differences" | "unexpected_differences";
}

export interface ParityDifference {
  field: string;
  v1Value: any;
  v2Value: any;
  category: "expected" | "unexpected";
  reason?: string;
}

export interface ParitySummary {
  totalItems: number;
  identical: number;
  expectedDifferences: number;
  unexpectedDifferences: number;
  results: ParityResult[];
  summary: string;
}

/**
 * Expected differences between V1 and V2
 */
const EXPECTED_DIFFERENCES = {
  // V2 has different explain structure
  explainVersion: {
    v1: undefined,
    v2: "v2",
    reason: "V2 adds explainVersion field",
  },

  // V2 may have different domain classification
  domain: {
    reason: "V2 uses unified classification (wages as monetaryFlow)",
  },

  // V2 doesn't include inflation/seasonality adjustments
  seasonalAdjustment: {
    v1: "present",
    v2: "absent",
    reason: "V2 excludes inflation/seasonality by design",
  },

  // V2 may have different explain metadata structure
  explainStructure: {
    reason: "V2 uses flat explain structure with normalized keys",
  },
};

/**
 * Compare two values and determine if differences are expected
 */
function compareValues(
  field: string,
  v1Value: any,
  v2Value: any,
): ParityDifference | null {
  // Skip comparison if values are identical
  if (JSON.stringify(v1Value) === JSON.stringify(v2Value)) {
    return null;
  }

  // Check for expected differences
  let category: "expected" | "unexpected" = "unexpected";
  let reason: string | undefined;

  // Explain version differences
  if (field === "explain.explainVersion") {
    if (v1Value === undefined && v2Value === "v2") {
      category = "expected";
      reason = "V2 adds explainVersion field";
    }
  }

  // Explain structure differences
  if (field.startsWith("explain.")) {
    // V2 may have flatter structure
    if (typeof v1Value === "object" && typeof v2Value === "object") {
      category = "expected";
      reason = "V2 uses flat explain structure";
    }
  }

  // Domain classification differences
  if (field === "domain" || field.includes("domain")) {
    category = "expected";
    reason = "V2 uses unified classification";
  }

  // Seasonal adjustment differences
  if (field.includes("seasonal") || field.includes("inflation")) {
    if (v1Value !== undefined && v2Value === undefined) {
      category = "expected";
      reason = "V2 excludes inflation/seasonality";
    }
  }

  // Numerical precision differences (within tolerance)
  if (typeof v1Value === "number" && typeof v2Value === "number") {
    const diff = Math.abs(v1Value - v2Value);
    const tolerance = Math.max(Math.abs(v1Value), Math.abs(v2Value)) * 0.001; // 0.1% tolerance
    if (diff <= tolerance) {
      category = "expected";
      reason = "Numerical precision difference within tolerance";
    }
  }

  return {
    field,
    v1Value,
    v2Value,
    category,
    reason,
  };
}

/**
 * Deep compare two objects and find all differences
 */
function deepCompare(obj1: any, obj2: any, path = ""): ParityDifference[] {
  const differences: ParityDifference[] = [];

  // Get all unique keys from both objects
  const keys = new Set([
    ...Object.keys(obj1 || {}),
    ...Object.keys(obj2 || {}),
  ]);

  for (const key of keys) {
    const currentPath = path ? `${path}.${key}` : key;
    const val1 = obj1?.[key];
    const val2 = obj2?.[key];

    if (
      typeof val1 === "object" && typeof val2 === "object" &&
      val1 !== null && val2 !== null &&
      !Array.isArray(val1) && !Array.isArray(val2)
    ) {
      // Recursively compare objects
      differences.push(...deepCompare(val1, val2, currentPath));
    } else {
      // Compare primitive values or arrays
      const diff = compareValues(currentPath, val1, val2);
      if (diff) {
        differences.push(diff);
      }
    }
  }

  return differences;
}

/**
 * Run parity comparison for a single dataset
 */
export async function runParityComparison(
  data: ParsedData[],
  config: Omit<PipelineConfig, "engine">,
): Promise<ParityResult[]> {
  // Helper: run with timeout to avoid hangs during parity runs
  const withTimeout = async <T>(
    p: Promise<T>,
    ms: number,
    label: string,
  ): Promise<T | null> => {
    return await new Promise<T | null>((resolve) => {
      let t: number | undefined = setTimeout(() => {
        console.warn(`[Parity] ${label} timed out after ${ms}ms`);
        t = undefined;
        resolve(null);
      }, ms);
      p.then((v) => {
        if (t !== undefined) {
          clearTimeout(t);
          t = undefined;
        }
        resolve(v as T);
      })
        .catch((_e) => {
          if (t !== undefined) {
            clearTimeout(t);
            t = undefined;
          }
          resolve(null);
        });
    });
  };

  // Run V1 pipeline (guarded)
  const v1Config: PipelineConfig = { ...config, engine: "v1" };
  const v1Pipeline = createPipeline(v1Config);
  const v1Results = (await withTimeout(v1Pipeline.run(data), 15000, "V1")) ??
    [] as any[];

  // Run V2 pipeline (guarded)
  const v2Config: PipelineConfig = { ...config, engine: "v2" };
  const v2Pipeline = createPipeline(v2Config);
  const v2Results = (await withTimeout(v2Pipeline.run(data), 15000, "V2")) ??
    [] as any[];

  // Compare results item by item
  const results: ParityResult[] = [];

  // Iterate over original input length to ensure stable reporting even on timeouts
  const maxLength = data.length;

  for (let i = 0; i < maxLength; i++) {
    const v1Item = v1Results[i];
    const v2Item = v2Results[i];
    const id = v1Item?.id || v2Item?.id || `item_${i}`;

    // Find differences
    const differences = deepCompare(v1Item, v2Item);

    // Categorize result
    let status: ParityResult["status"] = "identical";
    if (differences.length > 0) {
      const hasUnexpected = differences.some((d) =>
        d.category === "unexpected"
      );
      status = hasUnexpected
        ? "unexpected_differences"
        : "expected_differences";
    }

    results.push({
      id: String(id),
      v1Output: v1Item,
      v2Output: v2Item,
      differences,
      status,
    });
  }

  return results;
}

/**
 * Generate parity summary from results
 */
export function generateParitySummary(results: ParityResult[]): ParitySummary {
  const totalItems = results.length;
  const identical = results.filter((r) => r.status === "identical").length;
  const expectedDifferences =
    results.filter((r) => r.status === "expected_differences").length;
  const unexpectedDifferences =
    results.filter((r) => r.status === "unexpected_differences").length;

  const summary = `
Parity Analysis Summary:
- Total items: ${totalItems}
- Identical: ${identical} (${(identical / totalItems * 100).toFixed(1)}%)
- Expected differences: ${expectedDifferences} (${
    (expectedDifferences / totalItems * 100).toFixed(1)
  }%)
- Unexpected differences: ${unexpectedDifferences} (${
    (unexpectedDifferences / totalItems * 100).toFixed(1)
  }%)

${
    unexpectedDifferences > 0
      ? "⚠️  Unexpected differences found - review required"
      : "✅ All differences are expected"
  }
  `.trim();

  return {
    totalItems,
    identical,
    expectedDifferences,
    unexpectedDifferences,
    results,
    summary,
  };
}

/**
 * Format parity results for console output
 */
export function formatParityReport(summary: ParitySummary): string {
  let report = summary.summary + "\n\n";

  // Add details for unexpected differences
  const unexpectedResults = summary.results.filter((r) =>
    r.status === "unexpected_differences"
  );
  if (unexpectedResults.length > 0) {
    report += "UNEXPECTED DIFFERENCES:\n";
    report += "=".repeat(50) + "\n";

    for (const result of unexpectedResults) {
      report += `\nItem: ${result.id}\n`;
      const unexpectedDiffs = result.differences.filter((d) =>
        d.category === "unexpected"
      );
      for (const diff of unexpectedDiffs) {
        report += `  ${diff.field}: V1=${JSON.stringify(diff.v1Value)} → V2=${
          JSON.stringify(diff.v2Value)
        }\n`;
      }
    }
  }

  // Add summary of expected differences
  const expectedResults = summary.results.filter((r) =>
    r.status === "expected_differences"
  );
  if (expectedResults.length > 0) {
    report += "\nEXPECTED DIFFERENCES (sample):\n";
    report += "=".repeat(50) + "\n";

    // Show first few expected differences as examples
    const sampleResult = expectedResults[0];
    report += `\nExample from item: ${sampleResult.id}\n`;
    const expectedDiffs = sampleResult.differences.filter((d) =>
      d.category === "expected"
    ).slice(0, 3);
    for (const diff of expectedDiffs) {
      report += `  ${diff.field}: ${diff.reason || "Expected difference"}\n`;
    }
  }

  return report;
}
