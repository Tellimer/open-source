/**
 * Tests for exemption utilities
 */

import { assertEquals } from "@std/assert";
import {
  createExemptionSummary,
  type ExemptionCheckData,
  filterExemptions,
  shouldExemptFromNormalization,
} from "./exemptions.ts";
import type { NormalizationExemptions } from "../types.ts";

// Sample test data
const sampleData: ExemptionCheckData[] = [
  {
    id: "TEL_CCR",
    name: "Credit Rating",
    categoryGroup: "Tellimer",
  },
  {
    id: "IMF_GDP",
    name: "GDP Growth Rate",
    categoryGroup: "IMF WEO",
  },
  {
    id: "WB_INFLATION",
    name: "Inflation Rate",
    categoryGroup: "World Bank",
  },
  {
    id: "CUSTOM_INDEX",
    name: "Custom Market Index",
    categoryGroup: "Internal",
  },
  {
    id: "WAGES_MFG",
    name: "Manufacturing Wages",
    categoryGroup: "Labor Stats",
  },
];

Deno.test("shouldExemptFromNormalization - indicator ID exemption", () => {
  const exemptions: NormalizationExemptions = {
    indicatorIds: ["TEL_CCR", "CUSTOM_INDEX"],
  };

  assertEquals(
    shouldExemptFromNormalization(sampleData[0], exemptions),
    true,
    "TEL_CCR should be exempted",
  );
  assertEquals(
    shouldExemptFromNormalization(sampleData[3], exemptions),
    true,
    "CUSTOM_INDEX should be exempted",
  );
  assertEquals(
    shouldExemptFromNormalization(sampleData[1], exemptions),
    false,
    "IMF_GDP should not be exempted",
  );
});

Deno.test("shouldExemptFromNormalization - category group exemption", () => {
  const exemptions: NormalizationExemptions = {
    categoryGroups: ["IMF WEO", "Tellimer"],
  };

  assertEquals(
    shouldExemptFromNormalization(sampleData[0], exemptions),
    true,
    "Tellimer category should be exempted",
  );
  assertEquals(
    shouldExemptFromNormalization(sampleData[1], exemptions),
    true,
    "IMF WEO category should be exempted",
  );
  assertEquals(
    shouldExemptFromNormalization(sampleData[2], exemptions),
    false,
    "World Bank category should not be exempted",
  );
});

Deno.test("shouldExemptFromNormalization - indicator name exemption", () => {
  const exemptions: NormalizationExemptions = {
    indicatorNames: ["Credit Rating", "Index"],
  };

  assertEquals(
    shouldExemptFromNormalization(sampleData[0], exemptions),
    true,
    "Credit Rating name should be exempted",
  );
  assertEquals(
    shouldExemptFromNormalization(sampleData[3], exemptions),
    true,
    "Index name pattern should be exempted",
  );
  assertEquals(
    shouldExemptFromNormalization(sampleData[4], exemptions),
    false,
    "Wages name should not be exempted",
  );
});

Deno.test("shouldExemptFromNormalization - multiple criteria", () => {
  const exemptions: NormalizationExemptions = {
    indicatorIds: ["TEL_CCR"],
    categoryGroups: ["IMF WEO"],
    indicatorNames: ["Index"],
  };

  // Should match any of the criteria
  assertEquals(
    shouldExemptFromNormalization(sampleData[0], exemptions),
    true,
    "Should match indicator ID",
  );
  assertEquals(
    shouldExemptFromNormalization(sampleData[1], exemptions),
    true,
    "Should match category group",
  );
  assertEquals(
    shouldExemptFromNormalization(sampleData[3], exemptions),
    true,
    "Should match name pattern",
  );
  assertEquals(
    shouldExemptFromNormalization(sampleData[4], exemptions),
    false,
    "Should not match any criteria",
  );
});

Deno.test("shouldExemptFromNormalization - no exemptions", () => {
  assertEquals(
    shouldExemptFromNormalization(sampleData[0]),
    false,
    "Should not exempt when no exemptions provided",
  );

  assertEquals(
    shouldExemptFromNormalization(sampleData[0], {}),
    false,
    "Should not exempt when empty exemptions provided",
  );
});

Deno.test("filterExemptions - separates exempted and non-exempted", () => {
  const exemptions: NormalizationExemptions = {
    categoryGroups: ["Tellimer", "IMF WEO"],
    indicatorNames: ["Index"],
  };

  const result = filterExemptions(sampleData, exemptions);

  assertEquals(result.exempted.length, 3, "Should have 3 exempted items");
  assertEquals(
    result.nonExempted.length,
    2,
    "Should have 2 non-exempted items",
  );

  // Check specific exempted items
  const exemptedIds = result.exempted.map((item) => item.id);
  assertEquals(exemptedIds.includes("TEL_CCR"), true);
  assertEquals(exemptedIds.includes("IMF_GDP"), true);
  assertEquals(exemptedIds.includes("CUSTOM_INDEX"), true);

  // Check non-exempted items
  const nonExemptedIds = result.nonExempted.map((item) => item.id);
  assertEquals(nonExemptedIds.includes("WB_INFLATION"), true);
  assertEquals(nonExemptedIds.includes("WAGES_MFG"), true);
});

Deno.test("createExemptionSummary - generates summary", () => {
  const exempted = [sampleData[0], sampleData[1], sampleData[3]];
  const summary = createExemptionSummary(exempted, 5);

  assertEquals(summary.count, 3);
  assertEquals(summary.percentage, 60);
  assertEquals(summary.items.length, 3);

  // Check that reasons are tracked
  assertEquals(typeof summary.reasons, "object");
  assertEquals(Object.keys(summary.reasons).length > 0, true);
});

Deno.test("shouldExemptFromNormalization - case insensitive name matching", () => {
  const exemptions: NormalizationExemptions = {
    indicatorNames: ["credit rating", "INDEX"],
  };

  const testData = {
    id: "TEST",
    name: "Credit Rating Score",
    categoryGroup: "Test",
  };

  assertEquals(
    shouldExemptFromNormalization(testData, exemptions),
    true,
    "Should match case-insensitive name pattern",
  );
});
