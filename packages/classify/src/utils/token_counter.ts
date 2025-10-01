/**
 * Token counting and cost estimation utilities
 * @module
 */

import type { LLMProvider, TokenUsage } from '../types.ts';

/**
 * Pricing information per provider (per 1M tokens)
 * Updated as of January 2025
 */
const PRICING: Record<
  LLMProvider,
  Record<string, { input: number; output: number }>
> = {
  openai: {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o-2024-11-20': { input: 2.50, output: 10.00 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4': { input: 30.00, output: 60.00 },
    'default': { input: 2.50, output: 10.00 },
  },
  anthropic: {
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-5-sonnet-20240620': { input: 3.00, output: 15.00 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
    'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'default': { input: 3.00, output: 15.00 },
  },
  gemini: {
    'gemini-2.0-flash-thinking-exp-01-21': { input: 0.00, output: 0.00 }, // Free during preview
    'gemini-2.0-flash-exp': { input: 0.00, output: 0.00 }, // Free during preview
    'gemini-2.5-flash': { input: 0.00, output: 0.00 }, // Free during preview
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'default': { input: 0.00, output: 0.00 }, // Default to 2.5 Flash (free)
  },
};

/**
 * Simple token estimation based on character count
 * ~4 characters per token (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Remove extra whitespace
  const cleaned = text.replace(/\s+/g, ' ').trim();
  // Approximate: 1 token ≈ 4 characters for English text
  return Math.ceil(cleaned.length / 4);
}

/**
 * Calculate cost based on token usage
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  provider: LLMProvider,
  model: string
): number {
  const pricing = PRICING[provider][model] || PRICING[provider].default;

  // Convert from per-1M tokens to actual cost
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Extract token usage from provider response
 */
export function extractTokenUsage(
  // deno-lint-ignore no-explicit-any
  response: any,
  provider: LLMProvider,
  model: string,
  estimatedInput?: number
): TokenUsage {
  let inputTokens = 0;
  let outputTokens = 0;

  // Extract actual token counts from response if available
  if (provider === 'openai') {
    inputTokens = response.usage?.prompt_tokens || estimatedInput || 0;
    outputTokens = response.usage?.completion_tokens || 0;
  } else if (provider === 'anthropic') {
    inputTokens = response.usage?.input_tokens || estimatedInput || 0;
    outputTokens = response.usage?.output_tokens || 0;
  } else if (provider === 'gemini') {
    // Gemini includes usage metadata
    inputTokens = response.usageMetadata?.promptTokenCount || estimatedInput || 0;
    outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
  }

  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = calculateCost(inputTokens, outputTokens, provider, model);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
    provider,
    model,
  };
}

/**
 * Combine multiple token usage records
 */
export function combineTokenUsage(usages: TokenUsage[]): TokenUsage {
  if (usages.length === 0) {
    throw new Error('Cannot combine empty token usage array');
  }

  const first = usages[0];
  const combined = usages.reduce(
    (acc, usage) => ({
      inputTokens: acc.inputTokens + usage.inputTokens,
      outputTokens: acc.outputTokens + usage.outputTokens,
      totalTokens: acc.totalTokens + usage.totalTokens,
      estimatedCost: acc.estimatedCost + usage.estimatedCost,
      provider: acc.provider,
      model: acc.model,
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      provider: first.provider,
      model: first.model,
    }
  );

  return combined;
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`;
}

/**
 * Format token count with commas
 */
export function formatTokens(tokens: number): string {
  return tokens.toLocaleString();
}
