/**
 * Google Gemini provider implementation
 * @module
 */

import type {
  ClassifiedMetadata,
  Indicator,
  LLMConfig,
  LLMProviderInterface,
} from "../types.ts";
import {
  ClassificationError,
  DEFAULT_CONFIG,
  DEFAULT_MODELS,
} from "../types.ts";
import {
  generateSystemPrompt,
  generateUserPrompt,
  parseClassificationResponse,
  postProcessClassifications,
} from "./base.ts";

/**
 * Gemini API response types
 */
interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

/**
 * Google Gemini provider for indicator classification
 */
export class GeminiProvider implements LLMProviderInterface {
  readonly name = "gemini" as const;

  validateConfig(config: LLMConfig): void {
    if (!config.apiKey) {
      throw new ClassificationError(
        "Google Gemini API key is required",
        this.name,
      );
    }
  }

  async classify(
    indicators: Indicator[],
    config: LLMConfig,
  ): Promise<ClassifiedMetadata[]> {
    this.validateConfig(config);

    const model = config.model || DEFAULT_MODELS.gemini;
    const temperature = config.temperature ?? DEFAULT_CONFIG.temperature;
    const maxTokens = config.maxTokens ?? DEFAULT_CONFIG.maxTokens;
    const timeout = config.timeout ?? DEFAULT_CONFIG.timeout;
    const includeReasoning = (config.includeReasoning ??
      DEFAULT_CONFIG.includeReasoning) as boolean;
    const maxRetries =
      (config.maxRetries ?? DEFAULT_CONFIG.maxRetries) as number;
    const retryDelay =
      (config.retryDelay ?? DEFAULT_CONFIG.retryDelay) as number;

    const systemPrompt = generateSystemPrompt();
    const userPrompt = generateUserPrompt(indicators, includeReasoning);

    // Gemini combines system and user prompts
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

    const contents: GeminiContent[] = [
      {
        role: "user",
        parts: [{ text: combinedPrompt }],
      },
    ];

    const requestBody = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      },
    };

    // Perform the API call with retries
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      let timeoutId: number | undefined;

      try {
        // Use Promise.race to enforce hard timeout
        const fetchPromise = (async () => {
          const url =
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Gemini API error (${res.status}): ${errorText}`);
          }

          return (await res.json()) as GeminiResponse;
        })();

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error(`Request timeout after ${timeout}ms`));
          }, timeout);
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        // Clear timeout on success
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }

        const content = response.candidates[0]?.content?.parts[0]?.text;
        if (!content) {
          throw new Error("No content in Gemini response");
        }

        const parsed = parseClassificationResponse(content, indicators.length);
        return postProcessClassifications(indicators, parsed);
      } catch (error) {
        // Always clear timeout on error
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }

        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on timeout errors - fail fast
        if (
          lastError.message.includes("timeout") ||
          lastError.message.includes("abort")
        ) {
          throw new ClassificationError(
            `Gemini classification failed: ${lastError.message}`,
            this.name,
            lastError,
          );
        }

        // Check for rate limit error (429) and extract retry delay
        if (
          lastError.message.includes("429") ||
          lastError.message.includes("RESOURCE_EXHAUSTED")
        ) {
          // Extract retry delay from error message if available
          const retryMatch = lastError.message.match(/retry in ([\d.]+)s/i);
          if (retryMatch && attempt < maxRetries) {
            const apiRetryDelay = Math.ceil(parseFloat(retryMatch[1]) * 1000);
            await new Promise((resolve) => setTimeout(resolve, apiRetryDelay));
            continue;
          }
          // If no retry delay or last attempt, fail immediately
          throw new ClassificationError(
            `Gemini classification failed: ${lastError.message}`,
            this.name,
            lastError,
          );
        }

        // Retry on other errors with exponential backoff
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new ClassificationError(
      `Gemini classification failed after ${maxRetries + 1} attempts: ${
        lastError?.message ?? "Unknown error"
      }`,
      this.name,
      lastError,
    );
  }
}
