/**
 * LLM client abstractions for classification stages
 * Ported from Motia workflow to Restate
 * @module
 */

import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

/**
 * Generic LLM client interface
 * Supports both legacy (single prompt) and optimized (system/user split) modes
 */
export interface LLMClient {
  generateObject<T>(params: {
    prompt?: string;  // Legacy: single prompt (deprecated for caching)
    systemPrompt?: string;  // Optimized: static instructions (cacheable)
    userPrompt?: string;    // Optimized: variable data (not cached)
    schema: z.ZodSchema<T>;
  }): Promise<T>;
}

/**
 * Configuration for LLM providers
 */
export type LLMProvider = 'local' | 'openai' | 'anthropic';

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  apiKey?: string;
}

// Instantiate provider clients once at module level
const LM_STUDIO_BASE_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1';

const lmstudioProvider = createOpenAI({
  baseURL: LM_STUDIO_BASE_URL,
  apiKey: 'lm-studio',
});

const lmstudioClient = (modelId: string) => lmstudioProvider.chat(modelId);

const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'not-needed',
});

const openaiClient = (modelId: string) => openaiProvider.chat(modelId);

const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'not-needed',
});

const anthropicClient = (modelId: string) => anthropicProvider(modelId);

/**
 * Factory function to create LLM client based on config
 */
export function createLLMClient(config: LLMConfig): LLMClient {
  switch (config.provider) {
    case 'local':
      return new LocalLLMClient(config);
    case 'openai':
      return new OpenAIClient(config);
    case 'anthropic':
      return new AnthropicClient(config);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

/**
 * Local LLM client (LM Studio)
 */
class LocalLLMClient implements LLMClient {
  constructor(private config: LLMConfig) {}

  async generateObject<T>(params: {
    prompt: string;
    schema: z.ZodSchema<T>;
  }): Promise<T> {
    const modelName = this.config.model ||
      process.env.LM_STUDIO_MODEL ||
      'mistral-7b-instruct-v0.3';

    console.log(`[LocalLLMClient] Calling model: ${modelName}`);

    const modelInstance = lmstudioClient(modelName);

    try {
      const result = await generateObject({
        model: modelInstance,
        schema: params.schema,
        messages: [{ role: 'user', content: params.prompt }],
        mode: 'json',
        temperature: this.config.temperature || 0.2,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(600000), // 10 minutes
      });

      console.log(`[LocalLLMClient] Success!`);
      return result.object as T;
    } catch (error) {
      console.error(`[LocalLLMClient] Error:`, error);
      throw error;
    }
  }
}

/**
 * OpenAI client using Vercel AI SDK with prompt caching support
 *
 * PROMPT CACHING:
 * - System messages >1024 tokens are automatically cached by OpenAI
 * - Cached input tokens cost 90% less ($0.025/M vs $0.25/M for GPT-5-mini)
 * - Cache is valid for 5-10 minutes of activity
 * - Use 'system' role for instructions, 'user' role for indicator data
 */
class OpenAIClient implements LLMClient {
  constructor(private config: LLMConfig) {}

  async generateObject<T>(params: {
    prompt: string;
    schema: z.ZodSchema<T>;
  }): Promise<T> {
    const modelName = this.config.model || process.env.OPENAI_MODEL || 'gpt-5-mini';
    console.log(`[OpenAIClient] Calling model: ${modelName} (with prompt caching)`);

    try {
      const result = await generateObject({
        model: openaiClient(modelName),
        schema: params.schema,
        // Use system message for cacheable instructions
        messages: [
          { role: 'system', content: params.prompt },
          { role: 'user', content: 'Please analyze and classify this indicator according to the instructions above.' }
        ],
        mode: 'json',
        temperature: this.config.temperature || 0.2,
        maxRetries: 3,
      });

      console.log(`[OpenAIClient] Success!`);
      return result.object as T;
    } catch (error) {
      console.error(`[OpenAIClient] Error:`, error);
      throw error;
    }
  }
}

/**
 * Anthropic client using Vercel AI SDK
 */
class AnthropicClient implements LLMClient {
  constructor(private config: LLMConfig) {}

  async generateObject<T>(params: {
    prompt: string;
    schema: z.ZodSchema<T>;
  }): Promise<T> {
    const modelName = this.config.model || 'claude-3-5-haiku-20241022';
    console.log(`[AnthropicClient] Calling model: ${modelName}`);

    const result = await generateObject({
      model: anthropicClient(modelName),
      schema: params.schema,
      messages: [{ role: 'user', content: params.prompt }],
      mode: 'json',
      temperature: this.config.temperature || 0.2,
      maxRetries: 2,
    });

    return result.object as T;
  }
}

/**
 * Get LLM config from environment or defaults
 */
export function getLLMConfig(
  stage: string,
  defaultProvider: LLMProvider = 'local',
): LLMConfig {
  // Check for stage-specific override
  const stageEnvVar = `LLM_PROVIDER_${stage.toUpperCase().replace(/-/g, '_')}`;
  const provider = (process.env[stageEnvVar] as LLMProvider) || defaultProvider;

  console.log(
    `[LLM Config] Stage: ${stage}, Provider: ${provider}`,
  );

  // Get API keys
  const apiKeys = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    local: 'not-needed',
  };

  return {
    provider,
    apiKey: apiKeys[provider as keyof typeof apiKeys],
    temperature: 0.2,
  };
}
