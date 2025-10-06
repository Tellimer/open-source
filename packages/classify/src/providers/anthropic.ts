/**
 * Anthropic provider implementation
 * @module
 */

import type {
  ClassifiedMetadata,
  Indicator,
  LLMConfig,
  LLMProviderInterface,
} from '../types.ts';
import {
  ClassificationError,
  DEFAULT_CONFIG,
  DEFAULT_MODELS,
} from '../types.ts';
import {
  generateSystemPrompt,
  generateUserPrompt,
  parseClassificationResponse,
  postProcessClassifications,
  retryWithBackoff,
} from './base.ts';

/**
 * Anthropic API response types
 */
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * Anthropic provider for indicator classification
 */
export class AnthropicProvider implements LLMProviderInterface {
  readonly name = 'anthropic' as const;

  validateConfig(config: LLMConfig): void {
    if (!config.apiKey) {
      throw new ClassificationError('Anthropic API key is required', this.name);
    }
  }

  async classify(
    indicators: Indicator[],
    config: LLMConfig
  ): Promise<ClassifiedMetadata[]> {
    this.validateConfig(config);

    const model = config.model || DEFAULT_MODELS.anthropic;
    const temperature = config.temperature ?? DEFAULT_CONFIG.temperature;
    const maxTokens = config.maxTokens ?? DEFAULT_CONFIG.maxTokens;
    const timeout = config.timeout ?? DEFAULT_CONFIG.timeout;
    const includeReasoning = (config.includeReasoning ??
      DEFAULT_CONFIG.includeReasoning) as boolean;

    const systemPrompt = generateSystemPrompt();
    const userPrompt = generateUserPrompt(indicators, includeReasoning);

    const messages: AnthropicMessage[] = [
      { role: 'user', content: userPrompt },
    ];

    const requestBody = {
      model,
      messages,
      system: systemPrompt,
      temperature,
      max_tokens: maxTokens,
    };

    try {
      const response = await retryWithBackoff(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
              const errorText = await res.text();
              const httpErr = new Error(
                `Anthropic API error (${res.status}): ${errorText}`
              ) as Error & { status?: number; headers?: Headers };
              httpErr.status = res.status;
              httpErr.headers = res.headers;
              throw httpErr;
            }

            return (await res.json()) as AnthropicResponse;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        },
        (config.maxRetries ?? DEFAULT_CONFIG.maxRetries) as number,
        (config.retryDelay ?? DEFAULT_CONFIG.retryDelay) as number
      );

      const content = response.content[0]?.text;
      if (!content) {
        throw new Error('No content in Anthropic response');
      }

      const parsed = parseClassificationResponse(content, indicators.length);
      return postProcessClassifications(indicators, parsed);
    } catch (error) {
      throw new ClassificationError(
        `Anthropic classification failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        this.name,
        error instanceof Error ? error : undefined
      );
    }
  }
}
