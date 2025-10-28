/**
 * LLM client abstractions for classification stages
 *
 * FIX: Use top-level imports to avoid memory leaks and "Deno is not defined" errors
 * Dynamic imports were causing OOM crashes (code 137)
 */

import { z } from "zod";
// Import AI SDK at module level - instantiate once, not per call
// Note: Motia runs in Node.js mode, so no 'npm:' prefix needed
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

/**
 * Generic LLM client interface
 */
export interface LLMClient {
  generateObject<T>(params: {
    prompt: string;
    schema: z.ZodSchema<T>;
  }): Promise<T>;
}

/**
 * Configuration for LLM providers
 */
export type LLMProvider = "local" | "openai" | "anthropic";

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  apiKey?: string;
}

// Instantiate provider clients once at module level
// This prevents memory leaks from repeated dynamic imports
// Note: Motia runs in Node.js mode, so use process.env not Deno.env
const LM_STUDIO_BASE_URL = process.env.LM_STUDIO_URL ||
  "http://127.0.0.1:1234/v1";
// LM Studio client - must use chat completions API, not responses API
const lmstudioProvider = createOpenAI({
  baseURL: LM_STUDIO_BASE_URL,
  apiKey: "lm-studio",
});

// Create a chat model (not responses model) for LM Studio compatibility
const lmstudioClient = (modelId: string) => lmstudioProvider.chat(modelId);

const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "not-needed",
});
const openaiClient = (modelId: string) => openaiProvider.chat(modelId);

const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "not-needed",
});
const anthropicClient = (modelId: string) => anthropicProvider(modelId);

/**
 * Factory function to create LLM client based on config
 */
export function createLLMClient(config: LLMConfig): LLMClient {
  switch (config.provider) {
    case "local":
      return new LocalLLMClient(config);
    case "openai":
      return new OpenAIClient(config);
    case "anthropic":
      return new AnthropicClient(config);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

/**
 * Local LLM client (LM Studio)
 * Uses local Mistral model via LM Studio's OpenAI-compatible API
 * Running at http://127.0.0.1:1234
 */
class LocalLLMClient implements LLMClient {
  constructor(private config: LLMConfig) {}

  async generateObject<T>(params: {
    prompt: string;
    schema: z.ZodSchema<T>;
  }): Promise<T> {
    // Use pre-instantiated client (no dynamic imports!)
    // LM Studio supports OpenAI's response_format for JSON mode
    // Model name from LM Studio (check LM Studio UI for actual model name)
    const modelName = this.config.model ||
      process.env.LM_STUDIO_MODEL ||
      "mistral-7b-instruct-v0.3";

    console.log(
      `[LocalLLMClient] Calling generateObject with model: ${modelName}`,
    );

    const modelInstance = lmstudioClient(modelName);
    console.log(
      `[LocalLLMClient] Model instance:`,
      JSON.stringify(modelInstance, null, 2),
    );

    try {
      const result = await generateObject({
        model: modelInstance,
        schema: params.schema,
        messages: [{ role: "user", content: params.prompt }],
        mode: "json", // AI SDK will add response_format: {type: "json_object"}
        temperature: this.config.temperature || 0.2,
        maxRetries: 2, // Reduce retries to avoid OOM
        // Increase timeout for local LLM which can be slow when queue is backed up
        // Local Mistral 7B averages 6.4min per request when handling 75 concurrent requests
        abortSignal: AbortSignal.timeout(600000), // 10 minutes timeout
        // Add schemaName and schemaDescription for better error messages
        experimental_telemetry: {
          isEnabled: true,
          functionId: "local-llm-classify",
        },
      });

      console.log(`[LocalLLMClient] Success! Got result`);
      console.log(
        `[LocalLLMClient] Result object:`,
        JSON.stringify(result.object, null, 2),
      );
      return result.object as T;
    } catch (error) {
      console.error(`[LocalLLMClient] Error calling generateObject:`, error);

      // Try to extract and log the actual response from the error
      if (error && typeof error === "object") {
        // Log all error properties for debugging
        console.error(`[LocalLLMClient] Error keys:`, Object.keys(error));

        // Check for response text in various possible locations
        const errorObj = error as any;
        if (errorObj.text) {
          console.error(`[LocalLLMClient] Error text:`, errorObj.text);
        }
        if (errorObj.response) {
          console.error(
            `[LocalLLMClient] Raw response:`,
            JSON.stringify(errorObj.response, null, 2),
          );
        }
        if (errorObj.responseMessages) {
          console.error(
            `[LocalLLMClient] Response messages:`,
            JSON.stringify(errorObj.responseMessages, null, 2),
          );
        }
        if (errorObj.cause) {
          console.error(`[LocalLLMClient] Error cause:`, errorObj.cause);
        }
      }
      throw error;
    }
  }
}

/**
 * OpenAI client using Vercel AI SDK
 */
class OpenAIClient implements LLMClient {
  constructor(private config: LLMConfig) {}

  async generateObject<T>(params: {
    prompt: string;
    schema: z.ZodSchema<T>;
  }): Promise<T> {
    const modelName = this.config.model || "gpt-4o-mini";
    console.log(
      `[OpenAIClient] Calling generateObject with model: ${modelName}`,
    );

    try {
      const result = await generateObject({
        model: openaiClient(modelName),
        schema: params.schema,
        messages: [{ role: "user", content: params.prompt }],
        mode: "json", // Force strict JSON schema adherence
        temperature: this.config.temperature || 0.2,
        maxRetries: 3, // Increase retries to 3
      });

      console.log(`[OpenAIClient] Success! Got result`);
      console.log(
        `[OpenAIClient] Result object:`,
        JSON.stringify(result.object, null, 2),
      );
      return result.object as T;
    } catch (error) {
      console.error(`[OpenAIClient] Error calling generateObject:`, error);

      // Try to extract and log the actual response from the error
      if (error && typeof error === "object") {
        // Log all error properties for debugging
        console.error(`[OpenAIClient] Error keys:`, Object.keys(error));

        // Check for response text in various possible locations
        const errorObj = error as any;
        if (errorObj.text) {
          console.error(`[OpenAIClient] Error text:`, errorObj.text);
        }
        if (errorObj.response) {
          console.error(
            `[OpenAIClient] Raw response:`,
            JSON.stringify(errorObj.response, null, 2),
          );
        }
        if (errorObj.responseMessages) {
          console.error(
            `[OpenAIClient] Response messages:`,
            JSON.stringify(errorObj.responseMessages, null, 2),
          );
        }
        if (errorObj.cause) {
          console.error(`[OpenAIClient] Error cause:`, errorObj.cause);
        }
        // AI SDK v5 stores validation errors in a specific structure
        if (errorObj.validationErrors) {
          console.error(
            `[OpenAIClient] Validation errors:`,
            JSON.stringify(errorObj.validationErrors, null, 2),
          );
        }
        // Try to extract the actual text that was returned
        if (errorObj.rawResponse) {
          console.error(
            `[OpenAIClient] Raw LLM text:`,
            errorObj.rawResponse,
          );
        }
      }
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
    const result = await generateObject({
      model: anthropicClient(this.config.model || "claude-3-5-haiku-20241022"),
      schema: params.schema,
      messages: [{ role: "user", content: params.prompt }],
      mode: "json", // Force strict JSON schema adherence
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
  defaultProvider: LLMProvider = "local",
): LLMConfig {
  // Check for stage-specific override
  const stageEnvVar = `LLM_PROVIDER_${stage.toUpperCase().replace(/-/g, "_")}`;
  const provider = (process.env[stageEnvVar] as LLMProvider) || defaultProvider;

  console.log(
    `[LLM Config] Stage: ${stage}, Env: ${stageEnvVar}=${
      process.env[stageEnvVar]
    }, Provider: ${provider}`,
  );

  // Get API keys (not needed for local)
  const apiKeys = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    local: "not-needed", // LM Studio doesn't require real API key
  };

  return {
    provider,
    apiKey: apiKeys[provider as keyof typeof apiKeys],
    temperature: 0.2, // Low temperature for consistent classification
  };
}
