/**
 * LLM client abstractions for classification stages
 * Ported from Motia workflow to Restate
 * @module
 */

import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';

/**
 * Generic LLM client interface
 * Uses optimized system/user prompt split for maximum cache hit rates
 */
export interface LLMClient {
  generateObject<T>(params: {
    systemPrompt: string;  // Static instructions (cacheable)
    userPrompt: string;    // Variable data (not cached)
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
const LM_STUDIO_BASE_URL = Bun.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1';

const lmstudioProvider = createOpenAI({
  baseURL: LM_STUDIO_BASE_URL,
  apiKey: 'lm-studio',
});

const lmstudioClient = (modelId: string) => lmstudioProvider.chat(modelId);

const openaiProvider = createOpenAI({
  apiKey: Bun.env.OPENAI_API_KEY || 'not-needed',
});

const openaiClient = (modelId: string) => openaiProvider.chat(modelId);

const anthropicProvider = createAnthropic({
  apiKey: Bun.env.ANTHROPIC_API_KEY || 'not-needed',
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
    systemPrompt: string;
    userPrompt: string;
    schema: z.ZodSchema<T>;
  }): Promise<T> {
    const modelName = this.config.model ||
      process.env.LM_STUDIO_MODEL ||
      'mistral-7b-instruct-v0.3';

    console.log(`[LocalLLMClient] Calling model: ${modelName}`);

    const modelInstance = lmstudioClient(modelName);

    try {
      // Combine prompts for local model (doesn't benefit from caching)
      const combinedPrompt = `${params.systemPrompt}\n\n${params.userPrompt}`;

      const result = await generateObject({
        model: modelInstance,
        schema: params.schema,
        messages: [{ role: 'user', content: combinedPrompt }],
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
 * OpenAI client using native OpenAI SDK with optimized prompt caching
 *
 * PROMPT CACHING:
 * - System messages >1024 tokens are automatically cached by OpenAI
 * - Cached input tokens cost 75% less for gpt-4.1-mini ($0.10/M vs $0.40/M)
 * - Cache is valid for 5-10 minutes of activity
 * - Strategy: systemPrompt for static instructions, userPrompt for variable data
 * - GPT-4.1-mini: 14x cheaper than GPT-5-mini with working cache
 */
class OpenAIClient implements LLMClient {
  private client: OpenAI;

  constructor(private config: LLMConfig) {
    this.client = new OpenAI({
      apiKey: Bun.env.OPENAI_API_KEY || config.apiKey,
    });
  }

  async generateObject<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    schema: z.ZodSchema<T>;
  }): Promise<T> {
    const modelName = this.config.model || process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    try {
      // Use native OpenAI SDK with Zod schema validation
      const completion = await this.client.chat.completions.parse({
        model: modelName,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt }
        ],
        response_format: zodResponseFormat(params.schema, 'response'),
        temperature: this.config.temperature || 0.2,
      });

      // Log usage information including cached tokens
      if (completion.usage) {
        const usage = completion.usage;
        const cachedTokens = (usage as any).prompt_tokens_details?.cached_tokens || 0;
        const promptTokens = usage.prompt_tokens || 0;
        const completionTokens = usage.completion_tokens || 0;
        const totalTokens = usage.total_tokens || 0;
        const cacheHitRate = promptTokens > 0 ? ((cachedTokens / promptTokens) * 100).toFixed(1) : '0.0';

        const usageMsg = `[OpenAIClient] Usage: prompt=${promptTokens} (cached=${cachedTokens}, ${cacheHitRate}%), completion=${completionTokens}, total=${totalTokens}`;
        console.error(usageMsg);
      }

      const message = completion.choices[0]?.message;
      if (!message?.parsed) {
        throw new Error('No parsed response from OpenAI');
      }

      return message.parsed as T;
    } catch (error) {
      console.error(`[OpenAIClient] Error:`, error);
      throw error;
    }
  }
}

/**
 * Anthropic client using Vercel AI SDK
 * Note: Anthropic also supports prompt caching
 */
class AnthropicClient implements LLMClient {
  constructor(private config: LLMConfig) {}

  async generateObject<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    schema: z.ZodSchema<T>;
  }): Promise<T> {
    const modelName = this.config.model || 'claude-3-5-haiku-20241022';
    console.log(`[AnthropicClient] Calling model: ${modelName}`);

    // Combine prompts for single message (Anthropic uses different approach)
    const combinedPrompt = `${params.systemPrompt}\n\n${params.userPrompt}`;

    const result = await generateObject({
      model: anthropicClient(modelName),
      schema: params.schema,
      messages: [{ role: 'user', content: combinedPrompt }],
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
  const provider = (Bun.env[stageEnvVar] as LLMProvider) || defaultProvider;

  console.log(
    `[LLM Config] Stage: ${stage}, Provider: ${provider}`,
  );

  // Get API keys
  const apiKeys = {
    openai: Bun.env.OPENAI_API_KEY,
    anthropic: Bun.env.ANTHROPIC_API_KEY,
    local: 'not-needed',
  };

  return {
    provider,
    apiKey: apiKeys[provider as keyof typeof apiKeys],
    temperature: 0.2,
  };
}
