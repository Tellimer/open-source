/**
 * LLM Pricing Calculator
 * @module
 */

/**
 * Pricing per million tokens (MTok)
 * Updated: 2025-10-02
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic Claude
  'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-haiku-4-20250514': { input: 0.80, output: 4 },
  'claude-opus-4-20250514': { input: 15, output: 75 },

  // OpenAI
  'gpt-5': { input: 5, output: 15 },
  'gpt-4o': { input: 2.50, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },

  // Google Gemini
  'gemini-2.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.5-pro': { input: 1.25, output: 5 },
};

/**
 * Calculate cost from token usage
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    console.warn(`[Pricing] Unknown model: ${model}, cost will be $0`);
    return 0;
  }

  // Convert from per-million to per-token
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}
