/**
 * LLM provider exports
 * @module
 */

export { OpenAIProvider } from "./openai.ts";
export { AnthropicProvider } from "./anthropic.ts";
export { GeminiProvider } from "./gemini.ts";
export * from "./base.ts";

import type { LLMProvider, LLMProviderInterface } from "../types.ts";
import { OpenAIProvider } from "./openai.ts";
import { AnthropicProvider } from "./anthropic.ts";
import { GeminiProvider } from "./gemini.ts";

/**
 * Get a provider instance by name
 */
export function getProvider(provider: LLMProvider): LLMProviderInterface {
  switch (provider) {
    case "openai":
      return new OpenAIProvider();
    case "anthropic":
      return new AnthropicProvider();
    case "gemini":
      return new GeminiProvider();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

