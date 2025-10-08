/**
 * CLI: deno task review:all
 * Reviews all existing classifications and auto-fixes issues
 *
 * Environment variables (loaded from .env):
 * - OPENAI_API_KEY or ANTHROPIC_API_KEY (required, based on provider)
 * - REVIEW_PROVIDER (default: openai) - 'openai', 'anthropic', or 'gemini'
 * - REVIEW_MODEL (default: gpt-4o for openai, claude-sonnet-4-5-20250929 for anthropic)
 * - CLASSIFY_DB (default: ./data/classify_v2.db)
 *
 * Note: Use non-reasoning models (gpt-4o, gpt-4o-mini) for structured outputs.
 *       Reasoning models (o3-mini, o1) don't follow JSON schemas reliably.
 */

import { createLocalDatabase } from "../../../mod.ts";
import { reviewAllClassifications } from "../review/reviewAll.ts";

// Env-based config (loaded from .env with --env flag)
const dbPath = Deno.env.get("CLASSIFY_DB") || "./data/classify_v2.db";
const provider = (Deno.env.get("REVIEW_PROVIDER") || "openai") as any;

// Set default model based on provider
// Use gpt-4o (not gpt-5/o3) for structured outputs - reasoning models don't follow schemas well
const defaultModel = provider === "openai"
  ? "gpt-4o"
  : "claude-sonnet-4-5-20250929";
const model = Deno.env.get("REVIEW_MODEL") || defaultModel;
const apiKey = Deno.env.get("OPENAI_API_KEY") ||
  Deno.env.get("ANTHROPIC_API_KEY") || "";

if (!apiKey) {
  console.error("Missing API key: set OPENAI_API_KEY or ANTHROPIC_API_KEY");
  Deno.exit(1);
}

const db = createLocalDatabase(dbPath);
await db.initialize();

await reviewAllClassifications(
  db,
  { provider, apiKey, model },
  { quiet: false },
);

db.close();
