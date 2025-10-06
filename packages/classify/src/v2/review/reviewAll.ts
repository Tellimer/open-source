/**
 * Review-All Runner
 * Reviews all classifications by synthesizing flags and passing to review stage
 */

import type { LLMConfig } from '../../types.ts';
import type { V2DatabaseClient } from '../db/client.ts';
import { readClassifications } from '../output/storage.ts';
import { writeFlaggingResults } from './storage.ts';
import { reviewFlaggedIndicators } from './review.ts';

export async function reviewAllClassifications(
  db: V2DatabaseClient,
  llmConfig: LLMConfig,
  options: {
    batchSize?: number;
    concurrency?: number;
    debug?: boolean;
    quiet?: boolean;
  } = {}
) {
  // 1) Read all classifications
  const classifications = readClassifications(db);
  if (classifications.length === 0) {
    if (!options.quiet) console.log('No classifications found.');
    return;
  }

  // 2) Synthesize review_all flags for every classification
  const now = new Date().toISOString();
  const syntheticFlags = classifications.map((c) => ({
    indicator_id: c.indicator_id,
    flag_type: 'review_all' as const,
    flag_reason: 'Review-all: forced review of all classifications',
    flagged_at: now,
  }));

  // 3) Write flags
  writeFlaggingResults(db, syntheticFlags as any);

  // 4) Run review stage on all (now-flagged) items
  const result = await reviewFlaggedIndicators(db, llmConfig, {
    batchSize: options.batchSize || 20,
    concurrency: options.concurrency || 2,
    debug: options.debug || false,
    quiet: options.quiet || false,
  });

  if (!options.quiet) {
    console.log('\nReview-all complete.');
    console.log(`  • Reviewed: ${result.reviewed}`);
    console.log(`  • Fixed: ${result.fixed}`);
    console.log(`  • Escalated: ${result.escalated}`);
  }

  return result;
}
