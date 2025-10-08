/**
 * Dry run utilities for simulating classifications without LLM calls
 * @module
 */

import type {
  ClassifiedMetadata,
  Indicator,
  IndicatorCategory,
  IndicatorType,
  LLMProvider,
} from "../types.ts";
import { calculateCost, estimateTokens } from "./token_counter.ts";
import { generateSystemPrompt, generateUserPrompt } from "../providers/base.ts";
import { DEFAULT_MODELS } from "../types.ts";

/**
 * Generate a mock classification for dry run mode
 * Uses simple heuristics to assign plausible types
 */
export function generateMockClassification(
  indicator: Indicator,
): ClassifiedMetadata {
  const id = indicator.id ||
    `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Simple heuristics for mock classification
  let indicatorType: IndicatorType = "other";
  let indicatorCategory: IndicatorCategory = "other";
  let isMonetary = false;

  const name = indicator.name?.toLowerCase() || "";
  const units = indicator.units?.toLowerCase() || "";

  // Detect monetary
  if (
    indicator.currency_code || units.includes("usd") ||
    units.includes("billion") || units.includes("million")
  ) {
    isMonetary = true;
  }

  // Detect type based on name/units
  if (
    name.includes("gdp") || name.includes("revenue") ||
    name.includes("export") || name.includes("production")
  ) {
    indicatorType = "flow";
    indicatorCategory = "physical-fundamental";
  } else if (
    name.includes("debt") || name.includes("reserve") || name.includes("stock")
  ) {
    indicatorType = "stock";
    indicatorCategory = "physical-fundamental";
  } else if (name.includes("balance")) {
    indicatorType = "balance";
    indicatorCategory = "physical-fundamental";
  } else if (
    units.includes("%") || name.includes("rate") && !name.includes("exchange")
  ) {
    if (
      name.includes("growth") || name.includes("change") ||
      name.includes("inflation")
    ) {
      indicatorType = "rate";
      indicatorCategory = "change-movement";
    } else {
      indicatorType = "percentage";
      indicatorCategory = "numeric-measurement";
    }
  } else if (
    name.includes("index") || name.includes("s&p") || name.includes("cpi")
  ) {
    indicatorType = "index";
    indicatorCategory = "composite-derived";
  } else if (name.includes("ratio")) {
    indicatorType = "ratio";
    indicatorCategory = "numeric-measurement";
  } else if (name.includes("yield")) {
    indicatorType = "yield";
    indicatorCategory = "price-value";
  } else if (name.includes("price")) {
    indicatorType = "price";
    indicatorCategory = "price-value";
  } else if (name.includes("sentiment") || name.includes("confidence")) {
    indicatorType = "sentiment";
    indicatorCategory = "qualitative";
  } else if (
    name.includes("count") || name.includes("starts") || name.includes("number")
  ) {
    indicatorType = "count";
    indicatorCategory = "numeric-measurement";
  }

  // Determine temporal aggregation
  let temporalAggregation: ClassifiedMetadata["temporal_aggregation"] =
    "not-applicable";
  if (
    indicatorType === "stock" || indicatorType === "price" ||
    indicatorType === "index"
  ) {
    temporalAggregation = "point-in-time";
  } else if (indicatorType === "flow" || indicatorType === "balance") {
    temporalAggregation = "period-rate";
  } else if (indicatorType === "count") {
    temporalAggregation = "period-total";
  }

  // Determine heat map orientation
  let heatMapOrientation: ClassifiedMetadata["heat_map_orientation"] =
    "higher-is-positive";
  if (
    name.includes("unemployment") || name.includes("deficit") ||
    name.includes("volatility")
  ) {
    heatMapOrientation = "lower-is-positive";
  } else if (name.includes("debt") && !name.includes("gdp")) {
    heatMapOrientation = "neutral";
  }

  return {
    indicator_id: id,
    indicator_category: indicatorCategory,
    indicator_type: indicatorType,
    temporal_aggregation: temporalAggregation,
    is_monetary: isMonetary,
    heat_map_orientation: heatMapOrientation,
    confidence: 0.85, // Mock confidence
    reasoning:
      "[DRY RUN] This is a simulated classification based on simple heuristics.",
  };
}

/**
 * Estimate token usage for a batch of indicators
 */
export function estimateBatchTokens(
  indicators: Indicator[],
  includeReasoning: boolean = false,
): { inputTokens: number; outputTokens: number } {
  // Estimate input tokens (system + user prompt)
  const systemPrompt = generateSystemPrompt();
  const userPrompt = generateUserPrompt(indicators, includeReasoning);

  const inputTokens = estimateTokens(systemPrompt) + estimateTokens(userPrompt);

  // Estimate output tokens
  // Base: ~150 tokens per indicator without reasoning
  // With reasoning: ~250 tokens per indicator
  const tokensPerIndicator = includeReasoning ? 250 : 150;
  const outputTokens = indicators.length * tokensPerIndicator;

  return { inputTokens, outputTokens };
}

/**
 * Calculate estimated cost for a dry run
 */
export function estimateDryRunCost(
  indicators: Indicator[],
  provider: LLMProvider,
  model?: string,
  includeReasoning: boolean = false,
): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  provider: LLMProvider;
  model: string;
} {
  const actualModel = model || DEFAULT_MODELS[provider];
  const { inputTokens, outputTokens } = estimateBatchTokens(
    indicators,
    includeReasoning,
  );
  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = calculateCost(
    inputTokens,
    outputTokens,
    provider,
    actualModel,
  );

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
    provider,
    model: actualModel,
  };
}

/**
 * Print dry run information
 */
export async function printDryRunInfo(
  batchNumber: number,
  totalBatches: number,
  indicators: Indicator[],
  provider: LLMProvider,
  model: string,
  includeReasoning: boolean,
): Promise<void> {
  const { formatCost, formatTokens } = await import("./token_counter.ts");
  const estimate = estimateDryRunCost(
    indicators,
    provider,
    model,
    includeReasoning,
  );

  console.log(`\n🔍 DRY RUN - Batch ${batchNumber}/${totalBatches}`);
  console.log(`   Indicators: ${indicators.length}`);
  console.log(`   Provider: ${provider}/${model}`);
  console.log(`   Est. input tokens: ${formatTokens(estimate.inputTokens)}`);
  console.log(`   Est. output tokens: ${formatTokens(estimate.outputTokens)}`);
  console.log(`   Est. total tokens: ${formatTokens(estimate.totalTokens)}`);
  console.log(`   Est. cost: ${formatCost(estimate.estimatedCost)}`);
}
