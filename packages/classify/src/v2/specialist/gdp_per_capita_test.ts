/**
 * Test to verify GDP per capita indicators are correctly classified as "flow" not "ratio"
 */

import { assertEquals } from "jsr:@std/assert@^1.0.11";
import {
  classifyIndicatorsV2,
  type LLMConfig,
  type V2Config,
} from "../../../mod.ts";

Deno.test("GDP per capita indicators should be classified as 'flow' not 'ratio'", async () => {
  const testDbPath = "./test_gdp_per_capita.db";

  try {
    const indicators = [
      {
        id: "NGDPRPC",
        name: "Gross domestic product per capita, constant prices",
        description: "GDP divided by total population",
        unit: "USD",
      },
      {
        id: "PPPPC",
        name: "GDP per capita, PPP",
        description: "Purchasing power parity GDP per capita",
        unit: "International dollars",
      },
      {
        id: "GDP_PER_CAP",
        name: "GDP per capita",
        description: "Real GDP divided by population",
        unit: "EUR",
      },
      {
        id: "GNI_PC",
        name: "GNI per capita",
        description: "Gross National Income per capita",
        unit: "USD",
      },
    ];

    const llmConfig: LLMConfig = {
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "",
      temperature: 0.1,
    };

    const v2Config: Partial<V2Config> = {
      database: {
        type: "local",
        path: testDbPath,
        walMode: true,
        autoMigrate: true,
      },
    };

    const result = await classifyIndicatorsV2(indicators, llmConfig, v2Config);

    const results = result.classifications;

    console.log("\n=== GDP Per Capita Classification Results ===");
    results.forEach((result) => {
      console.log(
        `${result.indicator_id}: indicator_type="${result.indicator_type}", is_currency_denominated=${result.is_currency_denominated}`,
      );
    });

    // All GDP per capita indicators should be classified as "flow"
    results.forEach((result) => {
      assertEquals(
        result.indicator_type,
        "flow",
        `${result.indicator_id} should be classified as "flow" not "${result.indicator_type}"`,
      );
      assertEquals(
        result.is_currency_denominated,
        true,
        `${result.indicator_id} should have is_currency_denominated=true`,
      );
    });

    console.log(
      "\n✅ All GDP per capita indicators correctly classified as 'flow'\n",
    );
  } finally {
    // Clean up test database
    try {
      await Deno.remove(testDbPath);
    } catch {
      // Ignore if file doesn't exist
    }
  }
});
