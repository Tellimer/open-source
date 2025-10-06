/**
 * Review-All-Flag Runner
 * Reviews all classifications and flags issues WITHOUT auto-fixing
 * Creates escalation flags for human review
 */

import type { LLMConfig } from '../../types.ts';
import type { V2DatabaseClient } from '../db/client.ts';
import { readClassifications } from '../output/storage.ts';
import { AiSdkProvider } from '../providers/ai-sdk.ts';
import {
  generateReviewSystemPrompt,
  generateReviewUserPrompt,
} from './prompts.ts';
import { ReviewBatchSchema } from '../schemas/index.ts';

interface ReviewAllFlagResult {
  reviewed: number;
  flaggedForFix: number;
  flaggedForEscalation: number;
  confirmed: number;
  issues: Array<{
    indicator_id: string;
    indicator_name: string;
    issue_type: 'needs_fix' | 'needs_escalation';
    reason: string;
    suggested_diff?: Record<string, any>;
    confidence: number;
  }>;
}

export async function reviewAllAndFlag(
  db: V2DatabaseClient,
  llmConfig: LLMConfig,
  options: {
    batchSize?: number;
    concurrency?: number;
    debug?: boolean;
    quiet?: boolean;
  } = {}
): Promise<ReviewAllFlagResult> {
  const batchSize = options.batchSize || 20;
  const quiet = options.quiet || false;

  // 1) Read all classifications
  const classifications = readClassifications(db);
  if (classifications.length === 0) {
    if (!quiet) console.log('No classifications found.');
    return {
      reviewed: 0,
      flaggedForFix: 0,
      flaggedForEscalation: 0,
      confirmed: 0,
      issues: [],
    };
  }

  if (!quiet) {
    console.log(`📊 Total classifications to review: ${classifications.length}`);
    console.log(`📦 Batch size: ${batchSize}\n`);
  }

  // 2) Synthesize review_all flags for every classification
  const now = new Date().toISOString();
  const syntheticFlags = classifications.map((c) => ({
    indicator_id: c.indicator_id,
    flag_type: 'review_all_flag' as const,
    flag_reason: 'Quality audit: review without auto-fix',
    current_value: JSON.stringify({
      family: c.family,
      indicator_type: c.indicator_type,
      temporal_aggregation: c.temporal_aggregation,
      heat_map_orientation: c.heat_map_orientation,
      is_monetary: c.is_monetary,
      reasoning_router: c.reasoning_router,
      reasoning_specialist: c.reasoning_specialist,
    }),
    flagged_at: now,
  }));

  // 3) Process in batches and collect issues (NO auto-fix)
  const result: ReviewAllFlagResult = {
    reviewed: 0,
    flaggedForFix: 0,
    flaggedForEscalation: 0,
    confirmed: 0,
    issues: [],
  };

  const aiProvider = new AiSdkProvider(llmConfig);
  const totalBatches = Math.ceil(syntheticFlags.length / batchSize);

  for (let i = 0; i < syntheticFlags.length; i += batchSize) {
    const batch = syntheticFlags.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    if (!quiet) {
      console.log(
        `🔍 Processing batch ${batchNum}/${totalBatches} (${batch.length} indicators)...`
      );
    }

    // Add indicator names to batch for better review context
    const batchWithNames = batch.map((flag) => {
      const classification = classifications.find(
        (c) => c.indicator_id === flag.indicator_id
      );
      return {
        ...flag,
        name: classification?.name || 'Unknown',
      };
    });

    // Run LLM review
    const systemPrompt = generateReviewSystemPrompt();
    const userPrompt = generateReviewUserPrompt(batchWithNames as any);

    const aiResult = await aiProvider.generateStructured(
      systemPrompt,
      userPrompt,
      ReviewBatchSchema
    );

    // Debug: Log LLM response to catch any ID mismatches
    if (options.debug && !quiet) {
      console.log('\n[DEBUG] LLM Response:');
      console.log(JSON.stringify(aiResult.data.results.slice(0, 3), null, 2));
      console.log(
        `[DEBUG] Expected IDs: ${batch.map((f) => f.indicator_id).slice(0, 3).join(', ')}\n`
      );
    }

    // Collect issues WITHOUT applying fixes
    // Use index-based mapping to handle reasoning models that may not preserve exact indicator_ids
    for (let idx = 0; idx < aiResult.data.results.length; idx++) {
      const decision = aiResult.data.results[idx];
      const actualIndicator = batch[idx]; // Use index instead of trusting LLM's indicator_id
      const classification = classifications.find(
        (c) => c.indicator_id === actualIndicator.indicator_id
      );

      result.reviewed++;

      if (decision.action === 'confirm') {
        result.confirmed++;
      } else if (decision.action === 'fix') {
        result.flaggedForFix++;
        result.issues.push({
          indicator_id: actualIndicator.indicator_id, // Use actual ID from batch
          indicator_name: classification?.name || 'Unknown',
          issue_type: 'needs_fix',
          reason: decision.reason,
          suggested_diff: decision.diff,
          confidence: decision.confidence,
        });
      } else if (decision.action === 'escalate') {
        result.flaggedForEscalation++;
        result.issues.push({
          indicator_id: actualIndicator.indicator_id, // Use actual ID from batch
          indicator_name: classification?.name || 'Unknown',
          issue_type: 'needs_escalation',
          reason: decision.reason,
          confidence: decision.confidence,
        });
      }
    }

    if (!quiet && options.debug) {
      console.log(
        `  ✓ Batch ${batchNum}: ${aiResult.data.results.length} decisions`
      );
    }
  }

  // 4) Write issues to a flagging table for human review
  if (result.issues.length > 0) {
    const issueFlags = result.issues.map((issue) => ({
      indicator_id: issue.indicator_id,
      flag_type:
        issue.issue_type === 'needs_fix'
          ? 'review_suggested_fix'
          : 'review_escalation',
      flag_reason: issue.reason,
      current_value: issue.suggested_diff
        ? JSON.stringify(issue.suggested_diff)
        : null,
      expected_value: null,
      flagged_at: now,
    }));

    // Import and use writeFlaggingResults
    const { writeFlaggingResults } = await import('./storage.ts');
    writeFlaggingResults(db, issueFlags as any);
  }

  // 5) Output summary
  if (!quiet) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 REVIEW-ALL-FLAG SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Reviewed:        ${result.reviewed}`);
    console.log(`✅ Confirmed Correct:   ${result.confirmed}`);
    console.log(`🔧 Flagged for Fix:    ${result.flaggedForFix}`);
    console.log(`⚠️  Flagged for Review: ${result.flaggedForEscalation}`);
    console.log('='.repeat(60));

    if (result.issues.length > 0) {
      console.log('\n🚩 FLAGGED ISSUES:\n');
      result.issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue.indicator_name} (${issue.indicator_id})`);
        console.log(`   Type: ${issue.issue_type}`);
        console.log(`   Reason: ${issue.reason}`);
        if (issue.suggested_diff) {
          console.log(
            `   Suggested Fix: ${JSON.stringify(issue.suggested_diff)}`
          );
        }
        console.log(`   Confidence: ${(issue.confidence * 100).toFixed(0)}%\n`);
      });
    }

    console.log(
      '\n💡 Issues have been flagged in the database for human review.'
    );
    console.log('   Run a query on flagging_results table to see all flags.');
  }

  return result;
}
