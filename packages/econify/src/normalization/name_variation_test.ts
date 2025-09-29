import { assertEquals } from "jsr:@std/assert@1";
import { computeAutoTargets } from "./auto_targets.ts";
import type { ParsedData } from "../workflows/economic-data-workflow.ts";

Deno.test("computeAutoTargets: handles indicator name variations correctly", () => {
  // Simulate the exact issue: same indicator with slight name variations
  const data: ParsedData[] = [
    // Balance of Trade items with different name variations
    {
      id: "1",
      name: "Balance of Trade", // Normal case
      value: 100,
      unit: "USD million/month",
    },
    {
      id: "2",
      name: "Balance of Trade ", // Trailing space
      value: 200,
      unit: "USD million/month",
    },
    {
      id: "3",
      name: "balance of trade", // Lowercase
      value: 150,
      unit: "USD million/quarter",
    },
    {
      id: "4",
      name: "BALANCE OF TRADE", // Uppercase
      value: 300,
      unit: "USD million/month",
    },
    {
      id: "5",
      name: "Balance  of  Trade", // Multiple spaces
      value: 250,
      unit: "USD million/month",
    },
    // Add one quarter entry to check majority calculation
    {
      id: "6",
      name: "Balance of Trade",
      value: 400,
      unit: "USD million/quarter",
    },
  ];

  const result = computeAutoTargets(data);

  // All variations should map to the same normalized key
  assertEquals(result.size, 1, "Should have exactly one indicator group");

  // The normalized key should be "balance of trade"
  const normalizedKey = "balance of trade";
  const selection = result.get(normalizedKey);

  assertEquals(
    selection !== undefined,
    true,
    "Should have selection for normalized key",
  );

  // With 4 monthly and 2 quarterly entries, monthly should be dominant (66.7%)
  assertEquals(
    selection?.time,
    "month",
    "Should select month as dominant time scale",
  );

  // Verify the shares calculation
  assertEquals(
    selection?.shares?.time?.month,
    4 / 6,
    "Month should have 4/6 share",
  );
  assertEquals(
    selection?.shares?.time?.quarter,
    2 / 6,
    "Quarter should have 2/6 share",
  );
});

Deno.test("computeAutoTargets: different indicators remain separate", () => {
  const data: ParsedData[] = [
    // Balance of Trade items
    {
      id: "1",
      name: "Balance of Trade",
      value: 100,
      unit: "USD million/month",
    },
    {
      id: "2",
      name: "balance of trade", // Same indicator, different case
      value: 200,
      unit: "USD million/month",
    },
    // GDP items (different indicator)
    {
      id: "3",
      name: "GDP",
      value: 1000,
      unit: "USD billion/quarter",
    },
    {
      id: "4",
      name: "gdp", // Same indicator, different case
      value: 1100,
      unit: "USD billion/quarter",
    },
  ];

  const result = computeAutoTargets(data);

  // Should have two separate indicator groups
  assertEquals(result.size, 2, "Should have exactly two indicator groups");

  // Check Balance of Trade group
  const botSelection = result.get("balance of trade");
  assertEquals(
    botSelection !== undefined,
    true,
    "Should have Balance of Trade group",
  );
  assertEquals(
    botSelection?.time,
    "month",
    "Balance of Trade should use month",
  );

  // Check GDP group
  const gdpSelection = result.get("gdp");
  assertEquals(gdpSelection !== undefined, true, "Should have GDP group");
  assertEquals(gdpSelection?.time, "quarter", "GDP should use quarter");
});

Deno.test("computeAutoTargets: custom resolver bypasses normalization", () => {
  const data: ParsedData[] = [
    {
      id: "1",
      name: "Custom Indicator",
      value: 100,
      unit: "USD million/month",
    },
    {
      id: "2",
      name: "custom indicator", // Different case
      value: 200,
      unit: "USD million/quarter",
    },
  ];

  // Custom resolver that returns exactly what it gets (no normalization)
  const customResolver = (d: ParsedData) => d.name || "";

  const result = computeAutoTargets(data, { indicatorKey: customResolver });

  // Should have two separate groups because resolver doesn't normalize
  assertEquals(result.size, 2, "Should have two groups with custom resolver");
  assertEquals(
    result.has("Custom Indicator"),
    true,
    "Should have exact 'Custom Indicator' key",
  );
  assertEquals(
    result.has("custom indicator"),
    true,
    "Should have exact 'custom indicator' key",
  );
});
