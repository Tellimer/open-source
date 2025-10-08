/**
 * AI SDK Provider - Wrapper for Vercel AI SDK with Valibot validation
 * @module
 */

import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { valibotSchema } from "@ai-sdk/valibot";
import type { BaseSchema } from "valibot";
import * as v from "valibot";
import type { LLMConfig } from "../../types.ts";

/**
 * AI SDK generation result with metrics
 */
export interface AiSdkResult<T> {
  data: T;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

/**
 * AI SDK Provider wrapper for structured generation
 */
export class AiSdkProvider {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Get AI SDK model instance from provider config
   */
  private getModel() {
    const { provider, model, apiKey } = this.config;

    if (!model) {
      throw new Error("Model is required in LLMConfig");
    }
    if (!apiKey) {
      throw new Error("API key is required in LLMConfig");
    }

    switch (provider) {
      case "openai": {
        const openaiProvider = createOpenAI({ apiKey });
        return openaiProvider(model as any);
      }

      case "anthropic": {
        const anthropicProvider = createAnthropic({ apiKey });
        return anthropicProvider(model as any);
      }

      case "gemini": {
        const googleProvider = createGoogleGenerativeAI({ apiKey });
        return googleProvider(model as any);
      }

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Generate structured output with Valibot schema validation
   * Uses AI SDK's valibotSchema() for universal provider compatibility
   */
  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: BaseSchema<any, T, any>,
  ): Promise<AiSdkResult<T>> {
    const model = this.getModel() as any;
    // Some OpenAI reasoning models do not support temperature – omit for OpenAI
    const isOpenAI = this.config.provider === "openai";
    const temperature = isOpenAI ? undefined : this.config.temperature ?? 0.0;

    // Use valibotSchema() helper for universal compatibility across all providers
    const generationArgs: any = {
      model,
      schema: valibotSchema(schema as any),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };
    if (typeof temperature === "number") {
      generationArgs.temperature = temperature;
    }

    const result = await generateObject(generationArgs);

    // Log raw response if debug mode enabled
    if (this.config.debug) {
      console.log(
        "[AI SDK] Raw LLM response:",
        JSON.stringify(result.object, null, 2),
      );
    }

    // Validate the result with Valibot
    let validated: T;
    try {
      validated = v.parse(schema, result.object) as T;
    } catch (validationError) {
      console.error("[AI SDK] Validation failed!");
      console.error(
        "[AI SDK] Raw response:",
        JSON.stringify(result.object, null, 2),
      );
      console.error("[AI SDK] Validation error:", validationError);
      throw validationError;
    }

    return {
      data: validated as T,
      usage: {
        promptTokens: (result.usage as any).promptTokens || 0,
        completionTokens: (result.usage as any).completionTokens || 0,
        totalTokens: result.usage.totalTokens || 0,
      },
      model: this.config.model || "",
      provider: this.config.provider,
    };
  }
}
