/**
 * V2 Individual Stage Tests
 * Tests each V2 pipeline stage in isolation
 */

import { assertEquals, assertExists } from '@std/assert';
import { describe, it, beforeEach, afterEach } from '@std/testing/bdd';
import {
  createLocalDatabase,
  routeIndicators,
  classifyByFamily,
  classifyOrientations,
  applyFlaggingRules,
  reviewFlaggedIndicators,
  type LLMConfig,
  type Indicator,
} from '../../../mod.ts';
import { getProvider } from '../../providers/index.ts';
import { groupIndicatorsByFamily } from '../specialist/grouping.ts';
import { writeRouterResults } from '../router/storage.ts';
import { loadFixture } from '../../../tests/utils.ts';

describe('V2 Individual Stages', () => {
  let db: ReturnType<typeof createLocalDatabase>;
  const testDbPath = './test_v2_stages.db';

  const llmConfig: LLMConfig = {
    provider: 'anthropic',
    apiKey: Deno.env.get('ANTHROPIC_API_KEY') || 'test-key',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.1,
    quiet: true,
  };

  beforeEach(async () => {
    db = createLocalDatabase(testDbPath);
    await db.initialize();
  });

  afterEach(async () => {
    await db.close();
    try {
      await Deno.remove(testDbPath);
    } catch {
      // Ignore
    }
  });

  describe('Router Stage', () => {
    it('should assign families correctly', async () => {
      const fixture = await loadFixture('physical_fundamental.json');
      const indicators = fixture.indicators.slice(0, 3);

      const provider = getProvider(llmConfig.provider);

      const result = await routeIndicators(indicators, {
        provider,
        llmConfig,
        batchSize: 10,
        concurrency: 1,
        debug: false,
        quiet: true,
      });

      assertEquals(result.results.length, indicators.length);

      for (const routerResult of result.results) {
        assertExists(routerResult.indicator_id);
        assertExists(routerResult.family);
        assertExists(routerResult.confidence_family);
        assertEquals(typeof routerResult.confidence_family, 'number');
        assertEquals(routerResult.confidence_family >= 0, true);
        assertEquals(routerResult.confidence_family <= 1, true);
      }

      // Most physical-fundamental indicators should be routed correctly
      const correctFamily = result.results.filter(
        (r) => r.family === 'physical-fundamental'
      ).length;
      assertEquals(correctFamily >= 1, true);
    });

    it('should handle batching', async () => {
      const fixture = await loadFixture('physical_fundamental.json');
      const indicators = fixture.indicators.slice(0, 10);

      const provider = getProvider(llmConfig.provider);

      const result = await routeIndicators(indicators, {
        provider,
        llmConfig,
        batchSize: 3, // Small batch size
        concurrency: 1,
        debug: false,
        quiet: true,
      });

      assertEquals(result.results.length, indicators.length);
      // Should have made multiple API calls due to batching
      assertEquals(result.apiCalls >= 3, true);
    });
  });

  describe('Specialist Stage', () => {
    it('should classify indicators with family-specific prompts', async () => {
      const fixture = await loadFixture('composite_derived.json');
      const indicators = fixture.indicators.slice(0, 3);

      // First route to get families
      const provider = getProvider(llmConfig.provider);
      const routerResult = await routeIndicators(indicators, {
        provider,
        llmConfig,
        batchSize: 10,
        concurrency: 1,
        debug: false,
        quiet: true,
      });

      writeRouterResults(db as any, routerResult.results);

      // Group by family
      const grouped = groupIndicatorsByFamily(indicators, routerResult.results);

      // Classify
      const indicatorsWithFamilies = Array.from(grouped.values()).flat();
      const result = await classifyByFamily(indicatorsWithFamilies, {
        provider,
        llmConfig,
        batchSize: 10,
        concurrency: 1,
        debug: false,
        quiet: true,
      });

      assertEquals(result.results.length, indicators.length);

      for (const specialistResult of result.results) {
        assertExists(specialistResult.indicator_id);
        assertExists(specialistResult.indicator_type);
        assertExists(specialistResult.temporal_aggregation);
        assertEquals(typeof specialistResult.is_monetary, 'boolean');
        assertExists(specialistResult.confidence_cls);
      }

      // Composite-derived indicators should have index type
      const indexTypes = result.results.filter(
        (r) => r.indicator_type === 'index'
      ).length;
      assertEquals(indexTypes >= 1, true);
    });
  });

  describe('Orientation Stage', () => {
    it('should determine heat map orientation', async () => {
      const fixture = await loadFixture('change_movement.json');
      const indicators = fixture.indicators.slice(0, 3);

      const provider = getProvider(llmConfig.provider);

      const result = await classifyOrientations(indicators, {
        provider,
        llmConfig,
        batchSize: 10,
        concurrency: 1,
        debug: false,
        quiet: true,
      });

      assertEquals(result.results.length, indicators.length);

      for (const orientResult of result.results) {
        assertExists(orientResult.indicator_id);
        assertExists(orientResult.heat_map_orientation);
        assertExists(orientResult.confidence_orient);

        // Orientation should be one of the valid values
        const validOrientations = [
          'higher-is-positive',
          'lower-is-positive',
          'neutral',
        ];
        assertEquals(
          validOrientations.includes(orientResult.heat_map_orientation),
          true
        );
      }
    });

    it('should handle welfare-focused indicators', async () => {
      const indicators: Indicator[] = [
        {
          id: 'test-inflation',
          name: 'Inflation Rate',
          units: 'percent',
          description: 'Annual inflation rate',
        },
        {
          id: 'test-unemployment',
          name: 'Unemployment Rate',
          units: 'percent',
          description: 'Unemployment rate',
        },
      ];

      const provider = getProvider(llmConfig.provider);

      const result = await classifyOrientations(indicators, {
        provider,
        llmConfig,
        batchSize: 10,
        concurrency: 1,
        debug: false,
        quiet: true,
      });

      assertEquals(result.results.length, 2);

      // Inflation should be lower-is-positive (welfare perspective)
      const inflationResult = result.results.find(
        (r) => r.indicator_id === 'test-inflation'
      );
      assertExists(inflationResult);
      assertEquals(inflationResult.heat_map_orientation, 'lower-is-positive');

      // Unemployment should be lower-is-positive (welfare perspective)
      const unemploymentResult = result.results.find(
        (r) => r.indicator_id === 'test-unemployment'
      );
      assertExists(unemploymentResult);
      assertEquals(
        unemploymentResult.heat_map_orientation,
        'lower-is-positive'
      );
    });
  });

  describe('Flagging Stage', () => {
    it('should flag low confidence indicators', () => {
      const data = [
        {
          indicator_id: 'test-1',
          name: 'Test 1',
          family: 'physical-fundamental' as const,
          confidence_family: 0.5, // Low
          indicator_type: 'stock' as const,
          temporal_aggregation: 'point-in-time' as const,
          confidence_cls: 0.9,
          heat_map_orientation: 'higher-is-positive' as const,
          confidence_orient: 0.9,
        },
        {
          indicator_id: 'test-2',
          name: 'Test 2',
          family: 'physical-fundamental' as const,
          confidence_family: 0.9,
          indicator_type: 'stock' as const,
          temporal_aggregation: 'point-in-time' as const,
          confidence_cls: 0.5, // Low
          heat_map_orientation: 'higher-is-positive' as const,
          confidence_orient: 0.9,
        },
      ];

      const flagged = applyFlaggingRules(data, {
        confidenceFamilyMin: 0.75,
        confidenceClsMin: 0.75,
        confidenceOrientMin: 0.75,
      });

      assertEquals(flagged.length, 2);

      const flag1 = flagged.find((f) => f.indicator_id === 'test-1');
      assertExists(flag1);
      assertEquals(flag1.flag_type, 'low_confidence_family');

      const flag2 = flagged.find((f) => f.indicator_id === 'test-2');
      assertExists(flag2);
      assertEquals(flag2.flag_type, 'low_confidence_cls');
    });

    it('should flag temporal aggregation mismatches', () => {
      const data = [
        {
          indicator_id: 'test-1',
          name: 'GDP Index',
          family: 'composite-derived' as const,
          confidence_family: 0.9,
          indicator_type: 'index' as const,
          temporal_aggregation: 'period-rate' as const, // Mismatch!
          confidence_cls: 0.9,
          heat_map_orientation: 'higher-is-positive' as const,
          confidence_orient: 0.9,
        },
      ];

      const flagged = applyFlaggingRules(data, {
        confidenceFamilyMin: 0.75,
        confidenceClsMin: 0.75,
        confidenceOrientMin: 0.75,
      });

      assertEquals(flagged.length, 1);
      assertEquals(flagged[0].flag_type, 'temporal_mismatch');
      assertExists(flagged[0].current_value);
      assertExists(flagged[0].expected_value);
    });

    it('should flag type-family mismatches', () => {
      const data = [
        {
          indicator_id: 'test-1',
          name: 'Test',
          family: 'physical-fundamental' as const,
          confidence_family: 0.9,
          indicator_type: 'price' as const, // Wrong family!
          temporal_aggregation: 'point-in-time' as const,
          confidence_cls: 0.9,
          heat_map_orientation: 'higher-is-positive' as const,
          confidence_orient: 0.9,
        },
      ];

      const flagged = applyFlaggingRules(data, {
        confidenceFamilyMin: 0.75,
        confidenceClsMin: 0.75,
        confidenceOrientMin: 0.75,
      });

      assertEquals(flagged.length, 1);
      assertEquals(flagged[0].flag_type, 'type_mismatch');
    });
  });

  describe('Review Stage', () => {
    it('should review and fix flagged indicators', async () => {
      // Create some flagged data
      const flaggedData = [
        {
          indicator_id: 'test-1',
          name: 'Consumer Price Index',
          flag_type: 'temporal_mismatch' as const,
          flag_reason: 'Index should use point-in-time aggregation',
          current_value: 'period-rate',
          expected_value: 'point-in-time',
          confidence: 0.9,
        },
      ];

      // Write to database
      const { writeFlaggingResults } = await import(
        '../review/storage.ts'
      );
      writeFlaggingResults(db as any, flaggedData);

      // Also need classifications table entry
      db.prepare(`
        INSERT INTO classifications (indicator_id, name, family, indicator_type, temporal_aggregation, is_monetary, heat_map_orientation)
        VALUES ('test-1', 'Consumer Price Index', 'composite-derived', 'index', 'period-rate', 0, 'neutral')
      `).run();

      const provider = getProvider(llmConfig.provider);

      const result = await reviewFlaggedIndicators(db as any, provider, {
        provider,
        llmConfig,
        batchSize: 10,
        concurrency: 1,
        debug: false,
        quiet: true,
      });

      assertEquals(result.reviewed, 1);
      assertEquals(result.decisions.length, 1);

      const decision = result.decisions[0];
      assertExists(decision.indicator_id);
      assertExists(decision.action);
      assertExists(decision.reason);

      // Action should be one of: confirm, fix, escalate
      const validActions = ['confirm', 'fix', 'escalate'];
      assertEquals(validActions.includes(decision.action), true);

      if (decision.action === 'fix') {
        assertExists(decision.diff);
      }
    });
  });
});
