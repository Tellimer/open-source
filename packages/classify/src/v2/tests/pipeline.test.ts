/**
 * V2 Pipeline Tests
 * Tests complete V2 pipeline using existing fixtures
 */

import { assertEquals, assertExists } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import {
  classifyIndicatorsV2,
  createLocalDatabase,
  type LLMConfig,
  type V2Config,
} from "../../../mod.ts";
import { type FixtureFile, loadAllFixtures } from "../../../tests/utils.ts";

describe("V2 Pipeline", () => {
  let db: ReturnType<typeof createLocalDatabase>;
  let fixtures: FixtureFile[];
  const testDbPath = "./test_v2_pipeline.db";

  beforeEach(async () => {
    // Load all fixtures
    fixtures = await loadAllFixtures();

    // Create test database
    db = createLocalDatabase(testDbPath);
    await db.initialize();
  });

  afterEach(async () => {
    // Close database
    await db.close();

    // Clean up test database
    try {
      await Deno.remove(testDbPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe("Full Pipeline Flow", () => {
    it("should process physical-fundamental indicators", async () => {
      const fixture = fixtures.find((f) => f.category === "Physical/Fundamental");
      assertExists(fixture, "Physical fundamental fixture should exist");

      const indicators = fixture.indicators.slice(0, 3).map((f) => f.indicator); // Test with first 3

      const llmConfig: LLMConfig = {
        provider: "anthropic",
        apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "test-key",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.1,
      };

      const v2Config: Partial<V2Config> = {
        database: db as any,
        thresholds: {
          confidenceFamilyMin: 0.7,
          confidenceClsMin: 0.7,
          confidenceOrientMin: 0.7,
        },
        batch: {
          routerBatchSize: 10,
          specialistBatchSize: 10,
          orientationBatchSize: 10,
          reviewBatchSize: 5,
        },
        concurrency: {
          router: 1,
          specialist: 1,
          orientation: 1,
          review: 1,
        },
      };

      const result = await classifyIndicatorsV2(
        indicators,
        llmConfig,
        v2Config,
      );

      // Verify result structure
      assertEquals(result.summary.total, indicators.length);
      assertEquals(result.summary.successful, indicators.length);
      assertExists(result.executionId);
      assertExists(result.processingTime);

      // Verify classifications
      assertEquals(result.classifications.length, indicators.length);

      for (const classification of result.classifications) {
        assertExists(classification.indicator_id);
        assertExists(classification.family);
        assertExists(classification.indicator_type);
        assertExists(classification.temporal_aggregation);
        assertExists(classification.heat_map_orientation);
        assertEquals(typeof classification.is_currency_denominated, "boolean");
      }

      // Verify stage metrics
      assertExists(result.stages.router);
      assertExists(result.stages.specialist);
      assertExists(result.stages.orientation);
      assertExists(result.stages.flagging);
      assertExists(result.stages.review);
    });

    it("should handle multiple families", async () => {
      // Mix indicators from different families
      const indicators = [];
      for (const fixture of fixtures.slice(0, 3)) {
        indicators.push(...fixture.indicators.slice(0, 2).map((f) => f.indicator));
      }

      const llmConfig: LLMConfig = {
        provider: "anthropic",
        apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "test-key",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.1,
      };

      const v2Config: Partial<V2Config> = {
        database: db as any,
      };

      const result = await classifyIndicatorsV2(
        indicators,
        llmConfig,
        v2Config,
      );

      assertEquals(result.summary.total, indicators.length);
      assertEquals(result.summary.successful, indicators.length);

      // Verify specialist stage processed multiple families
      if (result.stages.specialist.families) {
        assertEquals(result.stages.specialist.families >= 1, true);
      }
    });
  });

  describe("Flagging and Review", () => {
    it("should flag low confidence indicators", async () => {
      const fixture = fixtures[0];
      const indicators = fixture.indicators.slice(0, 5).map((f) => f.indicator);

      const llmConfig: LLMConfig = {
        provider: "anthropic",
        apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "test-key",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.1,
      };

      const v2Config: Partial<V2Config> = {
        database: db as any,
        thresholds: {
          // Very high thresholds to trigger flags
          confidenceFamilyMin: 0.95,
          confidenceClsMin: 0.95,
          confidenceOrientMin: 0.95,
        },
      };

      const result = await classifyIndicatorsV2(
        indicators,
        llmConfig,
        v2Config,
      );

      // Some indicators should be flagged with high thresholds
      assertExists(result.summary.flagged);

      if (result.summary.flagged > 0) {
        // If flagged, should have review metrics
        assertExists(result.summary.reviewed);
        assertExists(result.summary.fixed);
        assertExists(result.summary.escalated);
      }
    });
  });

  describe("Database Persistence", () => {
    it("should persist all stage results", async () => {
      const fixture = fixtures[0];
      const indicators = fixture.indicators.slice(0, 3).map((f) => f.indicator);

      const llmConfig: LLMConfig = {
        provider: "anthropic",
        apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "test-key",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.1,
      };

      const v2Config: Partial<V2Config> = {
        database: db as any,
      };

      await classifyIndicatorsV2(indicators, llmConfig, v2Config);

      // Verify router results in database
      const routerResults = db
        .prepare("SELECT * FROM router_results")
        .all();
      assertEquals(routerResults.length, indicators.length);

      // Verify specialist results in database
      const specialistResults = db
        .prepare("SELECT * FROM specialist_results")
        .all();
      assertEquals(specialistResults.length, indicators.length);

      // Verify orientation results in database
      const orientationResults = db
        .prepare("SELECT * FROM orientation_results")
        .all();
      assertEquals(orientationResults.length, indicators.length);

      // Verify classifications table populated
      const classifications = db
        .prepare("SELECT * FROM classifications")
        .all();
      assertEquals(classifications.length, indicators.length);

      // Verify execution record created
      const executions = db
        .prepare("SELECT * FROM pipeline_executions")
        .all();
      assertEquals(executions.length, 1);
    });

    it("should support upsert behavior", async () => {
      const fixture = fixtures[0];
      const indicators = fixture.indicators.slice(0, 2).map((f) => f.indicator);

      const llmConfig: LLMConfig = {
        provider: "anthropic",
        apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "test-key",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.1,
      };

      const v2Config: Partial<V2Config> = {
        database: db as any,
      };

      // First run
      await classifyIndicatorsV2(indicators, llmConfig, v2Config);

      const countBefore = db
        .prepare("SELECT COUNT(*) FROM classifications")
        .value();

      // Second run - should upsert, not duplicate
      await classifyIndicatorsV2(indicators, llmConfig, v2Config);

      const countAfter = db
        .prepare("SELECT COUNT(*) FROM classifications")
        .value();

      assertEquals(countBefore, countAfter);

      // But should have 2 execution records
      const executions = db
        .prepare("SELECT * FROM pipeline_executions")
        .all();
      assertEquals(executions.length, 2);
    });
  });

  describe("Performance and Metrics", () => {
    it("should track token usage and costs", async () => {
      const fixture = fixtures[0];
      const indicators = fixture.indicators.slice(0, 3).map((f) => f.indicator);

      const llmConfig: LLMConfig = {
        provider: "anthropic",
        apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "test-key",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.1,
      };

      const v2Config: Partial<V2Config> = {
        database: db as any,
      };

      const result = await classifyIndicatorsV2(
        indicators,
        llmConfig,
        v2Config,
      );

      // Verify metrics exist
      assertExists(result.apiCalls);
      assertEquals(result.apiCalls > 0, true);

      // Each stage should have metrics
      assertEquals(result.stages.router.apiCalls > 0, true);
      assertEquals(result.stages.specialist.apiCalls > 0, true);
      assertEquals(result.stages.orientation.apiCalls > 0, true);
    });

    it("should complete within reasonable time", async () => {
      const fixture = fixtures[0];
      const indicators = fixture.indicators.slice(0, 5).map((f) => f.indicator);

      const llmConfig: LLMConfig = {
        provider: "anthropic",
        apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "test-key",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.1,
      };

      const v2Config: Partial<V2Config> = {
        database: db as any,
      };

      const startTime = Date.now();
      const result = await classifyIndicatorsV2(
        indicators,
        llmConfig,
        v2Config,
      );
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (adjust as needed)
      assertEquals(duration < 60000, true); // Less than 60 seconds

      // Verify processing time is tracked
      assertExists(result.processingTime);
      assertEquals(result.processingTime > 0, true);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid indicators gracefully", async () => {
      const indicators = [
        { name: "" }, // Invalid - no name
        { name: "Test", id: "test-1" },
      ];

      const llmConfig: LLMConfig = {
        provider: "anthropic",
        apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "test-key",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.1,
      };

      const v2Config: Partial<V2Config> = {
        database: db as any,
      };

      try {
        await classifyIndicatorsV2(indicators as any, llmConfig, v2Config);
      } catch (error) {
        // Should throw or handle gracefully
        assertExists(error);
      }
    });

    it("should record failed executions", async () => {
      const indicators = [{ name: "Test", id: "test-1" }];

      const llmConfig: LLMConfig = {
        provider: "anthropic",
        apiKey: "invalid-key", // Invalid API key
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.1,
      };

      const v2Config: Partial<V2Config> = {
        database: db as any,
      };

      try {
        await classifyIndicatorsV2(indicators, llmConfig, v2Config);
      } catch {
        // Expected to fail
      }

      // Should have execution record with failed status
      const executions = db
        .prepare("SELECT * FROM pipeline_executions WHERE status = 'failed'")
        .all();

      assertEquals(executions.length >= 1, true);
    });
  });
});
