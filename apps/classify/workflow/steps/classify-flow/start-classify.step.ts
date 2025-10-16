/**
 * API Step: Start Classification
 * Triggers batch classification for indicators
 */

import { ApiRouteConfig } from 'motia';
import { z } from 'zod';
import { getDatabase } from '../../src/db/client.ts';
import { createRepository } from '../../src/db/index.ts';

// Startup throttle
const SERVICE_START_TS = Date.now();
const STARTUP_WARM_MS = Number(process.env.STARTUP_WARM_MS || '0');
const API_KEY = process.env.API_KEY;

function getHeader(req: any, name: string): string | undefined {
  const h = req?.headers;
  if (!h) return undefined;
  return h[name] || h[name.toLowerCase()] || h[name.toUpperCase()];
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const indicatorInputSchema = z.object({
  indicator_id: z.string(),
  name: z.string(),
  units: z.string().optional(),
  description: z.string().optional(),
  periodicity: z.string().optional(),
  sample_values: z
    .array(
      z.object({
        date: z.string(),
        value: z.number(),
      })
    )
    .optional(),
  // Additional contextual fields from source_indicators
  source_name: z.string().optional(),
  source_url: z.string().optional(),
  long_name: z.string().optional(),
  category_group: z.string().optional(),
  dataset: z.string().optional(),
  aggregation_method: z.string().optional(),
  scale: z.string().optional(),
  topic: z.string().optional(),
  currency_code: z.string().optional(),
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'StartClassify',
  description: 'Trigger classification workflow for batch of indicators',
  path: '/classify/batch',
  method: 'POST',
  flows: ['classify-indicator'],
  bodySchema: z.object({
    indicators: z.array(indicatorInputSchema).min(1).max(100),
    llm_provider: z
      .enum(['local', 'openai', 'anthropic'])
      .optional()
      .default('local'), // LLM provider selection
  }),
  responseSchema: {
    202: z.object({
      message: z.string(),
      count: z.number(),
      trace_id: z.string(),
    }),
  },
  emits: ['indicator.normalize'],
};

export const handler = async (
  req: {
    body: {
      indicators: (typeof indicatorInputSchema._type)[];
      llm_provider?: string;
    };
  },
  { emit, logger, traceId }: { emit: any; logger: any; traceId: string }
) => {
  // API key guard (acts like a lightweight middleware)
  if (API_KEY) {
    const provided = getHeader(req as any, 'x-api-key');
    if (!provided || provided !== API_KEY) {
      return {
        status: 401,
        body: { error: 'unauthorized' },
      };
    }
  }

  // Warm-up delay to let pools/VM settle on cold start
  const elapsed = Date.now() - SERVICE_START_TS;
  if (STARTUP_WARM_MS > 0 && elapsed < STARTUP_WARM_MS) {
    await sleep(STARTUP_WARM_MS - elapsed);
  }

  const { indicators, llm_provider = 'local' } = req.body;

  logger.info('Starting batch classification', {
    count: indicators.length,
    llm_provider,
    traceId,
  });

  // Initialize batch statistics tracking
  try {
    const repo = createRepository(getDatabase());

    // Determine model based on provider
    let model: string;
    if (llm_provider === 'openai') {
      model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
    } else if (llm_provider === 'anthropic') {
      model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    } else {
      model = process.env.LM_STUDIO_MODEL || 'mistral-7b-instruct-v0.3';
    }

    await repo.startBatchStats({
      batch_id: traceId,
      total_indicators: indicators.length,
      model,
      provider: llm_provider,
    });

    logger.info('Batch stats initialized', {
      traceId,
      model,
      provider: llm_provider,
    });
  } catch (error) {
    logger.error('Failed to initialize batch stats', { error, traceId });
  }

  // Emit indicators in small internal chunks to avoid event-storm/OOM
  const INTERNAL_EMIT_BATCH = Number(process.env.INTERNAL_EMIT_BATCH || '10');
  logger.info('Emitting indicators to pipeline', {
    total_indicators: indicators.length,
  });

  for (let i = 0; i < indicators.length; i += INTERNAL_EMIT_BATCH) {
    const batch = indicators.slice(i, i + INTERNAL_EMIT_BATCH);
    await Promise.all(
      batch.map((indicator) =>
        emit({
          topic: 'indicator.normalize',
          data: {
            ...indicator,
            llm_provider, // Pass LLM provider selection through pipeline
          },
        })
      )
    );
    // Small pacing to reduce spikes
    if (i + INTERNAL_EMIT_BATCH < indicators.length) {
      await sleep(Number(process.env.INTERNAL_EMIT_DELAY_MS || '100'));
    }
  }

  logger.info('All indicators emitted', {
    count: indicators.length,
  });

  return {
    status: 202,
    body: {
      message: 'Classification started',
      count: indicators.length,
      trace_id: traceId,
    },
  };
};
