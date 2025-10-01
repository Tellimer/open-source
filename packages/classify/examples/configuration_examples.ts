/**
 * Configuration examples for different LLM providers
 *
 * This file demonstrates various configuration options for each provider.
 */

import type { LLMConfig } from "../mod.ts";

/**
 * OpenAI Configuration Examples
 */

// Basic OpenAI configuration
export const openaiBasic: LLMConfig = {
  provider: "openai",
  apiKey: "sk-...", // Your OpenAI API key
  model: "gpt-4o", // Latest GPT-4 with reasoning
};

// OpenAI with custom parameters
export const openaiCustom: LLMConfig = {
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o-mini", // Smaller, faster model
  temperature: 0.0, // Most deterministic (0-1)
  maxTokens: 1500, // Limit response length
  timeout: 20000, // 20 second timeout
};

// OpenAI with all options
export const openaiAdvanced: LLMConfig = {
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o",
  temperature: 0.1,
  maxTokens: 2000,
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  includeReasoning: true,
};

/**
 * Anthropic Configuration Examples
 */

// Basic Anthropic configuration
export const anthropicBasic: LLMConfig = {
  provider: "anthropic",
  apiKey: "sk-ant-...", // Your Anthropic API key
  model: "claude-3-5-sonnet-20241022", // Latest Claude with reasoning
};

// Anthropic with custom parameters
export const anthropicCustom: LLMConfig = {
  provider: "anthropic",
  apiKey: "sk-ant-...",
  model: "claude-3-5-sonnet-20241022",
  temperature: 0.0,
  maxTokens: 1500,
  timeout: 25000,
};

// Anthropic with all options
export const anthropicAdvanced: LLMConfig = {
  provider: "anthropic",
  apiKey: "sk-ant-...",
  model: "claude-3-5-sonnet-20241022",
  temperature: 0.1,
  maxTokens: 2000,
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  includeReasoning: true,
};

/**
 * Google Gemini Configuration Examples
 */

// Basic Gemini configuration
export const geminiBasic: LLMConfig = {
  provider: "gemini",
  apiKey: "AIza...", // Your Google API key
  model: "gemini-2.0-flash-thinking-exp-01-21", // Latest Gemini with reasoning
};

// Gemini with custom parameters
export const geminiCustom: LLMConfig = {
  provider: "gemini",
  apiKey: "AIza...",
  model: "gemini-1.5-pro", // Alternative model
  temperature: 0.0,
  maxTokens: 1500,
  timeout: 20000,
};

// Gemini with all options
export const geminiAdvanced: LLMConfig = {
  provider: "gemini",
  apiKey: "AIza...",
  model: "gemini-2.0-flash-thinking-exp-01-21",
  temperature: 0.1,
  maxTokens: 2000,
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  includeReasoning: true,
};

/**
 * Environment-based configuration
 *
 * Best practice: Store API keys in environment variables
 */

export function getConfigFromEnv(): LLMConfig {
  // Try OpenAI first
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      model: "gpt-4o",
    };
  }

  // Try Anthropic
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    return {
      provider: "anthropic",
      apiKey: anthropicKey,
      model: "claude-3-5-sonnet-20241022",
    };
  }

  // Try Gemini
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    return {
      provider: "gemini",
      apiKey: geminiKey,
      model: "gemini-2.0-flash-thinking-exp-01-21",
    };
  }

  throw new Error(
    "No API key found. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY",
  );
}

/**
 * Model recommendations by use case
 */

// For production: Balance of speed and quality
export const productionConfig: LLMConfig = {
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o",
  temperature: 0.1, // Low temperature for consistency
  maxTokens: 2000,
  timeout: 30000,
  maxRetries: 3,
};

// For development: Fast iteration
export const developmentConfig: LLMConfig = {
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o-mini", // Faster, cheaper
  temperature: 0.1,
  maxTokens: 1000,
  timeout: 15000,
  maxRetries: 2,
};

// For high accuracy: Best quality
export const highAccuracyConfig: LLMConfig = {
  provider: "anthropic",
  apiKey: "sk-ant-...",
  model: "claude-3-5-sonnet-20241022", // Best reasoning
  temperature: 0.0, // Most deterministic
  maxTokens: 3000,
  timeout: 45000,
  maxRetries: 5,
  includeReasoning: true,
};

// For cost optimization: Cheapest option
export const costOptimizedConfig: LLMConfig = {
  provider: "gemini",
  apiKey: "AIza...",
  model: "gemini-2.0-flash-thinking-exp-01-21", // Fast and cheap
  temperature: 0.1,
  maxTokens: 1000,
  timeout: 15000,
  maxRetries: 2,
};

/**
 * Usage example
 */
if (import.meta.main) {
  console.log("Configuration Examples");
  console.log("=====================\n");

  console.log("OpenAI Basic:");
  console.log(JSON.stringify(openaiBasic, null, 2));
  console.log();

  console.log("Anthropic Custom:");
  console.log(JSON.stringify(anthropicCustom, null, 2));
  console.log();

  console.log("Gemini Advanced:");
  console.log(JSON.stringify(geminiAdvanced, null, 2));
  console.log();

  try {
    const envConfig = getConfigFromEnv();
    console.log("Environment-based config:");
    console.log(JSON.stringify({ ...envConfig, apiKey: "***" }, null, 2));
  } catch (_error) {
    console.log("No environment API keys found");
  }
}

