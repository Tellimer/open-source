#!/usr/bin/env -S deno run --allow-read --allow-write
import { agentClassifications } from "./apply_classifications.ts";

// Read the current fixture file
const fixtureContent = await Deno.readTextFile(
  "./tests/fixtures/v2-test-indicators.ts",
);

// Find where the TEST_INDICATORS array starts
const arrayStartMatch = fixtureContent.match(
  /export const TEST_INDICATORS: TestIndicatorFixture\[\] = \[/,
);
if (!arrayStartMatch) {
  console.error("Could not find TEST_INDICATORS array");
  Deno.exit(1);
}

const arrayStart = arrayStartMatch.index! + arrayStartMatch[0].length;

// Find each indicator object and add expectation
const lines = fixtureContent.substring(arrayStart).split("\n");
let result = fixtureContent.substring(0, arrayStart);
let currentIndicator: string | null = null;
let indicatorLines: string[] = [];
let inIndicator = false;
let braceCount = 0;

for (const line of lines) {
  // Check if we're starting a new indicator
  const idMatch = line.match(/id: '([^']+)'/);
  if (idMatch) {
    currentIndicator = idMatch[1];
    inIndicator = true;
    braceCount = 0;
  }

  if (inIndicator) {
    indicatorLines.push(line);

    // Count braces to know when object ends
    for (const char of line) {
      if (char === "{") braceCount++;
      if (char === "}") braceCount--;
    }

    // When we close the indicator object
    if (braceCount === -1 && currentIndicator) {
      // Remove the closing brace line
      const lastLine = indicatorLines.pop()!;

      // Get classification
      const classification = agentClassifications[
        currentIndicator as keyof typeof agentClassifications
      ];

      if (classification) {
        // Add expectation object
        indicatorLines.push("    expectation: {");
        indicatorLines.push(
          `      indicator_family: '${classification.family}',`,
        );
        indicatorLines.push(
          `      indicator_type: '${classification.indicator_type}',`,
        );
        indicatorLines.push(
          `      indicator_category: '${classification.family}',`,
        );
        indicatorLines.push(
          `      temporal_aggregation: '${classification.temporal_aggregation}',`,
        );
        indicatorLines.push(
          `      is_monetary: ${
            "is_monetary" in classification ? classification.is_monetary : false
          },`,
        );
        indicatorLines.push(
          `      heat_map_orientation: '${classification.heat_map_orientation}'`,
        );
        indicatorLines.push("    }");
      }

      // Add back the closing brace
      indicatorLines.push(lastLine);

      // Add all lines to result
      result += "\n" + indicatorLines.join("\n");

      // Reset
      indicatorLines = [];
      currentIndicator = null;
      inIndicator = false;
    }
  } else {
    result += "\n" + line;
  }
}

// Write back
await Deno.writeTextFile("./tests/fixtures/v2-test-indicators.ts", result);
console.log("✅ Successfully applied expectations to all 100 indicators");
