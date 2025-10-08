/**
 * Tests for classification functions
 */

import { assertEquals, assertExists } from "@std/assert";
import type { ClassifiedMetadata, Indicator } from "./types.ts";
import {
  generateSystemPrompt,
  generateUserPrompt,
  parseClassificationResponse,
} from "./providers/base.ts";

Deno.test("generateSystemPrompt - returns valid system prompt", () => {
  const prompt = generateSystemPrompt();

  assertExists(prompt);
  assertEquals(typeof prompt, "string");
  assertEquals(prompt.length > 100, true);
  assertEquals(prompt.includes("indicator_type"), true);
  assertEquals(prompt.includes("is_monetary"), true);
  assertEquals(prompt.includes("is_cumulative"), true);
});

Deno.test("generateUserPrompt - formats single indicator", () => {
  const indicators: Indicator[] = [
    {
      name: "GDP",
      units: "USD billions",
      currency_code: "USD",
      periodicity: "quarterly",
      sample_values: [21000, 21500],
    },
  ];

  const prompt = generateUserPrompt(indicators, false);

  assertExists(prompt);
  assertEquals(prompt.includes("GDP"), true);
  assertEquals(prompt.includes("USD billions"), true);
  assertEquals(prompt.includes("quarterly"), true);
  assertEquals(prompt.includes("21000"), true);
});

Deno.test("generateUserPrompt - formats multiple indicators", () => {
  const indicators: Indicator[] = [
    {
      name: "GDP",
      units: "USD billions",
    },
    {
      name: "Unemployment Rate",
      units: "%",
    },
  ];

  const prompt = generateUserPrompt(indicators, false);

  assertExists(prompt);
  assertEquals(prompt.includes("Indicator 1"), true);
  assertEquals(prompt.includes("Indicator 2"), true);
  assertEquals(prompt.includes("GDP"), true);
  assertEquals(prompt.includes("Unemployment Rate"), true);
});

Deno.test(
  "generateUserPrompt - includes reasoning request when enabled",
  () => {
    const indicators: Indicator[] = [{ name: "GDP" }];

    const withReasoning = generateUserPrompt(indicators, true);
    const withoutReasoning = generateUserPrompt(indicators, false);

    assertEquals(withReasoning.includes("reasoning"), true);
    assertEquals(withoutReasoning.includes("Do not include"), true);
  },
);

Deno.test("parseClassificationResponse - parses valid JSON array", () => {
  const response = JSON.stringify([
    {
      indicator_id: "ind_1",
      indicator_category: "physical-fundamental",
      indicator_type: "flow",
      temporal_aggregation: "period-rate",
      is_monetary: true,
      heat_map_orientation: "higher-is-positive",
      confidence: 0.95,
    },
    {
      indicator_id: "ind_2",
      indicator_category: "numeric-measurement",
      indicator_type: "percentage",
      temporal_aggregation: "not-applicable",
      is_monetary: false,
      heat_map_orientation: "lower-is-positive",
      confidence: 0.98,
    },
  ]);

  const result = parseClassificationResponse(response, 2);

  assertEquals(result.length, 2);
  assertEquals(result[0].indicator_id, "ind_1");
  assertEquals(result[0].indicator_category, "physical-fundamental");
  assertEquals(result[0].indicator_type, "flow");
  assertEquals(result[0].temporal_aggregation, "period-rate");
  assertEquals(result[0].is_monetary, true);
  assertEquals(result[0].heat_map_orientation, "higher-is-positive");
  assertEquals(result[0].confidence, 0.95);
  assertEquals(result[1].indicator_id, "ind_2");
  assertEquals(result[1].indicator_category, "numeric-measurement");
  assertEquals(result[1].indicator_type, "percentage");
  assertEquals(result[1].temporal_aggregation, "not-applicable");
  assertEquals(result[1].heat_map_orientation, "lower-is-positive");
});

Deno.test("parseClassificationResponse - handles markdown code blocks", () => {
  const response = "```json\n" +
    JSON.stringify([
      {
        indicator_category: "physical-fundamental",
        indicator_type: "stock",
        temporal_aggregation: "point-in-time",
        is_monetary: true,
        heat_map_orientation: "lower-is-positive",
        confidence: 0.9,
      },
    ]) +
    "\n```";

  const result = parseClassificationResponse(response, 1);

  assertEquals(result.length, 1);
  assertEquals(result[0].indicator_type, "stock");
  assertEquals(result[0].heat_map_orientation, "lower-is-positive");
});

Deno.test("parseClassificationResponse - throws on invalid JSON", () => {
  let error: Error | undefined;

  try {
    parseClassificationResponse("not valid json", 1);
  } catch (e) {
    error = e as Error;
  }

  assertExists(error);
  assertEquals(error.message.includes("Failed to parse"), true);
});

Deno.test("parseClassificationResponse - throws on wrong count", () => {
  const response = JSON.stringify([
    {
      indicator_category: "physical-fundamental",
      indicator_type: "flow",
      temporal_aggregation: "period-rate",
      is_monetary: true,
      heat_map_orientation: "higher-is-positive",
    },
  ]);

  let error: Error | undefined;

  try {
    parseClassificationResponse(response, 2); // Expecting 2, got 1
  } catch (e) {
    error = e as Error;
  }

  assertExists(error);
  assertEquals(error.message.includes("Expected 2"), true);
});

Deno.test("parseClassificationResponse - validates indicator_type", () => {
  const response = JSON.stringify([
    {
      indicator_category: "physical-fundamental",
      indicator_type: "invalid_type",
      temporal_aggregation: "period-rate",
      is_monetary: true,
      heat_map_orientation: "higher-is-positive",
    },
  ]);

  let error: Error | undefined;

  try {
    parseClassificationResponse(response, 1);
  } catch (e) {
    error = e as Error;
  }

  assertExists(error);
  assertEquals(error.message.includes("invalid indicator_type"), true);
});

Deno.test("parseClassificationResponse - validates is_monetary", () => {
  const response = JSON.stringify([
    {
      indicator_category: "physical-fundamental",
      indicator_type: "flow",
      temporal_aggregation: "period-rate",
      is_monetary: "yes", // Should be boolean
      heat_map_orientation: "higher-is-positive",
    },
  ]);

  let error: Error | undefined;

  try {
    parseClassificationResponse(response, 1);
  } catch (e) {
    error = e as Error;
  }

  assertExists(error);
  assertEquals(error.message.includes("invalid is_monetary"), true);
});

Deno.test(
  "parseClassificationResponse - validates heat_map_orientation",
  () => {
    const response = JSON.stringify([
      {
        indicator_category: "physical-fundamental",
        indicator_type: "flow",
        temporal_aggregation: "period-rate",
        is_monetary: true,
        heat_map_orientation: "invalid-orientation", // Should be one of the valid values
      },
    ]);

    let error: Error | undefined;

    try {
      parseClassificationResponse(response, 1);
    } catch (e) {
      error = e as Error;
    }

    assertExists(error);
    assertEquals(error.message.includes("invalid heat_map_orientation"), true);
  },
);

Deno.test("parseClassificationResponse - validates confidence range", () => {
  const response = JSON.stringify([
    {
      indicator_category: "physical-fundamental",
      indicator_type: "flow",
      temporal_aggregation: "period-rate",
      is_monetary: true,
      heat_map_orientation: "higher-is-positive",
      confidence: 1.5, // Should be 0-1
    },
  ]);

  let error: Error | undefined;

  try {
    parseClassificationResponse(response, 1);
  } catch (e) {
    error = e as Error;
  }

  assertExists(error);
  assertEquals(error.message.includes("invalid confidence"), true);
});

Deno.test("parseClassificationResponse - accepts optional fields", () => {
  const response = JSON.stringify([
    {
      indicator_category: "physical-fundamental",
      indicator_type: "flow",
      temporal_aggregation: "period-rate",
      is_monetary: true,
      heat_map_orientation: "higher-is-positive",
      confidence: 0.95,
      reasoning: "This is a flow indicator because...",
      custom_field: "custom value",
    },
  ]);

  const result = parseClassificationResponse(response, 1);

  assertEquals(result.length, 1);
  assertEquals(result[0].reasoning, "This is a flow indicator because...");
  assertEquals(
    (result[0] as ClassifiedMetadata & { custom_field: string }).custom_field,
    "custom value",
  );
});
