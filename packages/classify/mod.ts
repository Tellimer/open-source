/**
 * @tellimer/classify - LLM-based economic indicator classification
 *
 * This package provides LLM-powered classification and metadata enrichment
 * for economic indicators. It supports multiple LLM providers including
 * OpenAI, Anthropic, and Google Gemini.
 *
 * @example
 * ```ts
 * import { classifyIndicators } from "@tellimer/classify";
 *
 * const indicators = [
 *   {
 *     name: "GDP",
 *     units: "USD",
 *     currency_code: "USD",
 *     periodicity: "quarterly",
 *     source: "World Bank",
 *     sample_values: [21000000000000, 21500000000000, 22000000000000]
 *   }
 * ];
 *
 * const config = {
 *   provider: "openai",
 *   apiKey: "your-api-key",
 *   model: "gpt-4o"
 * };
 *
 * const enriched = await classifyIndicators(indicators, config);
 * console.log(enriched[0].indicator_type); // "flow"
 * console.log(enriched[0].is_monetary); // true
 * ```
 *
 * @module
 */

export * from "./src/classify.ts";
export * from "./src/types.ts";
export * from "./src/providers/index.ts";

// Cost tracking utilities
export {
  calculateCost,
  estimateTokens,
  extractTokenUsage,
  formatCost,
  formatTokens,
} from "./src/utils/token_counter.ts";

export {
  getCostSummary,
  printCostSummary,
  projectCost,
  printCostProjections,
  type CostSummary,
} from "./src/utils/cost_summary.ts";

