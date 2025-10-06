/**
 * CLI: deno task review:all-flag
 * Reviews all existing classifications and flags issues WITHOUT auto-fixing
 * Useful for quality audits and human oversight
 *
 * Environment variables (loaded from .env):
 * - OPENAI_API_KEY or ANTHROPIC_API_KEY (required, based on provider)
 * - REVIEW_PROVIDER (default: openai) - 'openai', 'anthropic', or 'gemini'
 * - REVIEW_MODEL (default: gpt-4o for openai, claude-sonnet-4-5-20250929 for anthropic)
 * - CLASSIFY_DB (default: ./data/classify_v2.db)
 *
 * Note: GPT-5 (o3-mini) reasoning model supported via index-based mapping.
 */

import { createLocalDatabase } from '../../../mod.ts';
import { reviewAllAndFlag } from '../review/reviewAllFlag.ts';

// Env-based config (loaded from .env with --env flag)
const dbPath = Deno.env.get('CLASSIFY_DB') || './data/classify_v2.db';
const provider = (Deno.env.get('REVIEW_PROVIDER') || 'openai') as any;

// Set default model based on provider
const defaultModel = provider === 'openai' ? 'gpt-5' : 'claude-sonnet-4-5-20250929';
const model = Deno.env.get('REVIEW_MODEL') || defaultModel;
const apiKey =
  Deno.env.get('OPENAI_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || '';

if (!apiKey) {
  console.error('Missing API key: set OPENAI_API_KEY or ANTHROPIC_API_KEY');
  Deno.exit(1);
}

const db = createLocalDatabase(dbPath);
await db.initialize();

console.log('🔍 Review-All-Flag Mode: Flagging issues for human review (no auto-fix)\n');

await reviewAllAndFlag(
  db,
  { provider, apiKey, model },
  { quiet: false }
);

db.close();
