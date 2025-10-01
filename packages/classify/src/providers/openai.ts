/**
 * OpenAI provider implementation
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
 * OpenAI API response types
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Minimal shape for the Responses API
interface OpenAIResponsesResponse {
  output_text?: string;
  choices?: Array<{ message?: { content?: string } }>;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  }>;
  response?: { content?: Array<{ type?: string; text?: string }> };
}

function extractTextFromAnyOpenAIResponse(
  data: OpenAIResponse | OpenAIResponsesResponse
): string | undefined {
  // New Responses API convenience field
  if ((data as OpenAIResponsesResponse).output_text) {
    return (data as OpenAIResponsesResponse).output_text;
  }
  // Responses API nested content
  const resp = data as OpenAIResponsesResponse;
  if (resp.response?.content && resp.response.content.length > 0) {
    const first = resp.response.content.find((c) => typeof c.text === 'string');
    if (first?.text) return first.text;
  }
  // GPT-5 Responses API: output array with message type
  if (resp.output && resp.output.length > 0) {
    // Look for the message type output (not reasoning)
    const messageOutput = resp.output.find((o: any) => o.type === 'message');
    if (messageOutput?.content && Array.isArray(messageOutput.content)) {
      const textContent = messageOutput.content.find(
        (c: any) => c.type === 'output_text' && typeof c.text === 'string'
      );
      if (textContent?.text) return textContent.text;
    }
    // Fallback to first output block
    const firstBlock = resp.output[0];
    const firstText = firstBlock.content?.find(
      (c) => typeof c.text === 'string'
    );
    if (firstText?.text) return firstText.text;
  }
  // Chat Completions shape
  const chat = data as OpenAIResponse;
  return chat.choices?.[0]?.message?.content;
}

/**
 * OpenAI provider for indicator classification
 */
export class OpenAIProvider implements LLMProviderInterface {
  readonly name = 'openai' as const;

  validateConfig(config: LLMConfig): void {
    if (!config.apiKey) {
      throw new ClassificationError('OpenAI API key is required', this.name);
    }
  }

  async classify(
    indicators: Indicator[],
    config: LLMConfig
  ): Promise<ClassifiedMetadata[]> {
    this.validateConfig(config);

    const model = config.model || DEFAULT_MODELS.openai;
    const temperature = config.temperature ?? DEFAULT_CONFIG.temperature;
    const timeout = config.timeout ?? DEFAULT_CONFIG.timeout;

    // GPT-5 uses reasoning tokens and needs more output capacity
    // If user explicitly set a high value, use it; otherwise use 8000 for GPT-5
    let maxTokens = config.maxTokens ?? DEFAULT_CONFIG.maxTokens;
    if (
      model.toLowerCase().includes('gpt-5') &&
      maxTokens === DEFAULT_CONFIG.maxTokens
    ) {
      maxTokens = 8000;
    }
    const includeReasoning = (config.includeReasoning ??
      DEFAULT_CONFIG.includeReasoning) as boolean;

    const systemPrompt = generateSystemPrompt();
    const userPrompt = generateUserPrompt(indicators, includeReasoning);

    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      // First try Chat Completions (max_tokens)
      const chatBody = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      } as const;

      let content: string | undefined;
      try {
        const chatResp = await retryWithBackoff(
          async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
              const res = await fetch(
                'https://api.openai.com/v1/chat/completions',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config.apiKey}`,
                  },
                  body: JSON.stringify(chatBody),
                  signal: controller.signal,
                }
              );

              clearTimeout(timeoutId);

              if (!res.ok) {
                const errorText = await res.text();
                throw new Error(
                  `OpenAI API error (${res.status}): ${errorText}`
                );
              }

              return (await res.json()) as OpenAIResponse;
            } catch (error) {
              clearTimeout(timeoutId);
              throw error;
            }
          },
          (config.maxRetries ?? DEFAULT_CONFIG.maxRetries) as number,
          (config.retryDelay ?? DEFAULT_CONFIG.retryDelay) as number
        );
        content = extractTextFromAnyOpenAIResponse(chatResp);
      } catch (chatError) {
        const msg =
          chatError instanceof Error ? chatError.message : String(chatError);
        const needsResponsesApi =
          msg.includes("'max_tokens' is not supported") ||
          msg.toLowerCase().includes('responses api');

        if (!needsResponsesApi) {
          throw chatError;
        }

        // Fallback to Responses API (max_output_tokens for GPT-5+)
        // GPT-5 doesn't support temperature parameter
        const responsesBody: Record<string, unknown> = {
          model,
          input: `${systemPrompt}

${userPrompt}`,
          max_output_tokens: maxTokens,
        };

        // Only add temperature if model supports it (not GPT-5)
        if (!model.toLowerCase().includes('gpt-5')) {
          responsesBody.temperature = temperature;
        }

        const responsesResp = await retryWithBackoff(
          async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
              const res = await fetch('https://api.openai.com/v1/responses', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify(responsesBody),
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              if (!res.ok) {
                const errorText = await res.text();
                throw new Error(
                  `OpenAI API error (${res.status}): ${errorText}`
                );
              }
              return (await res.json()) as OpenAIResponsesResponse;
            } catch (error) {
              clearTimeout(timeoutId);
              throw error;
            }
          },
          (config.maxRetries ?? DEFAULT_CONFIG.maxRetries) as number,
          (config.retryDelay ?? DEFAULT_CONFIG.retryDelay) as number
        );
        content = extractTextFromAnyOpenAIResponse(responsesResp);
      }

      if (!content || typeof content !== 'string') {
        throw new Error('No content in OpenAI response');
      }

      const parsed = parseClassificationResponse(content, indicators.length);
      return postProcessClassifications(indicators, parsed);
    } catch (error) {
      throw new ClassificationError(
        `OpenAI classification failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        this.name,
        error instanceof Error ? error : undefined
      );
    }
  }
}
