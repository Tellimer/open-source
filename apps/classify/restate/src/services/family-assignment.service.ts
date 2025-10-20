/**
 * Family Assignment Service (Stage 3)
 * Assigns indicator to one of 7 semantic families
 */

import * as restate from "@restatedev/restate-sdk";
import { TerminalError } from "@restatedev/restate-sdk";
import { createLLMClient, getLLMConfig } from "../llm/clients.ts";
import {
  createFamilyAssignmentCurrencyPrompt,
  createFamilyAssignmentNonCurrencyPrompt,
  createFamilyAssignmentPrompt,
  familyAssignmentCurrencySchema,
  familyAssignmentNonCurrencySchema,
  familyAssignmentSchema,
} from "../prompts/index.ts";
import { DatabaseRepository } from "../db/repository.ts";
import type { IndicatorInput } from "../types.ts";

interface FamilyAssignmentInput extends IndicatorInput {
  time_basis: string;
  normalized_scale: string;
  is_currency: boolean;
  detected_currency: string | null;
  parsed_unit_type?: string;
  llm_provider?: "local" | "openai" | "anthropic";
}

const familyAssignmentService = restate.service({
  name: "family-assignment",
  handlers: {
    assign: async (ctx: restate.Context, input: FamilyAssignmentInput) => {
      const {
        indicator_id,
        name,
        description,
        time_basis,
        normalized_scale,
        is_currency,
        sample_values,
        source_name,
        category_group,
        dataset,
        topic,
        llm_provider = "openai",
      } = input;

      const startTime = Date.now();

      ctx.console.info("Assigning family", {
        indicator_id,
        name,
        provider: llm_provider,
      });

      try {
        await ctx.run("log-start", async () => {
          const repo = new DatabaseRepository();
          await repo.logProcessing({
            indicator_id,
            stage: "family",
            status: "started",
          });
        });

        // Get LLM configuration
        const llmConfig = getLLMConfig("family-assignment", llm_provider);
        const llmClient = createLLMClient(llmConfig);

        // Route to currency-specific or non-currency-specific prompt
        let systemPrompt: string;
        let userPrompt: string;
        let schema: any;

        if (is_currency) {
          // Currency-specific prompt (only 2 families: physical-fundamental, price-value)
          const prompts = createFamilyAssignmentCurrencyPrompt({
            name,
            description,
            timeBasis: time_basis,
            scale: normalized_scale,
            detectedCurrency: input.detected_currency,
            sampleValues: sample_values,
            sourceName: source_name,
            categoryGroup: category_group,
            dataset,
            topic,
          });
          systemPrompt = prompts.systemPrompt;
          userPrompt = prompts.userPrompt;
          schema = familyAssignmentCurrencySchema;
        } else {
          // Non-currency-specific prompt (6 families with rate disambiguation)
          const prompts = createFamilyAssignmentNonCurrencyPrompt({
            name,
            description,
            timeBasis: time_basis,
            scale: normalized_scale,
            parsedUnitType: input.parsed_unit_type,
            sampleValues: sample_values,
            sourceName: source_name,
            categoryGroup: category_group,
            dataset,
            topic,
          });
          systemPrompt = prompts.systemPrompt;
          userPrompt = prompts.userPrompt;
          schema = familyAssignmentNonCurrencySchema;
        }

        // Generate family assignment
        const familyResult = await ctx.run(
          "llm-family-assignment",
          async () => {
            try {
              return await llmClient.generateObject({
                systemPrompt,
                userPrompt,
                schema,
              });
            } catch (error: any) {
              if (
                error.name === "AI_TypeValidationError" ||
                error.name === "AI_NoObjectGeneratedError"
              ) {
                ctx.console.error("Schema validation failed", {
                  indicator_id,
                  error: error.message,
                  llm_response: error.value || error.text,
                });
              }
              throw error;
            }
          },
          {
            maxRetries: 3,
          },
        );

        // Determine model
        let model: string;
        if (llm_provider === "openai") {
          model = process.env.OPENAI_MODEL || "gpt-5-mini";
        } else if (llm_provider === "anthropic") {
          model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
        } else {
          model = process.env.LM_STUDIO_MODEL || "mistral-7b-instruct-v0.3";
        }

        const result = {
          family: familyResult.family,
          confidence: familyResult.confidence,
          reasoning: familyResult.reasoning,
          provider: llmConfig.provider,
          model,
          created_at: new Date().toISOString(),
        };

        // Save to database
        await ctx.run("save-to-db", async () => {
          const repo = new DatabaseRepository();
          await repo.saveStageResult("family", indicator_id, result);

          const processingTime = Date.now() - startTime;
          await repo.logProcessing({
            indicator_id,
            stage: "family",
            status: "completed",
            metadata: { processing_time_ms: processingTime },
          });
        });

        const processingTime = Date.now() - startTime;
        ctx.console.info("Family assignment complete", {
          indicator_id,
          family: familyResult.family,
          confidence: familyResult.confidence,
          processing_time_ms: processingTime,
        });

        return {
          success: true,
          result,
        };
      } catch (error) {
        ctx.console.error("Family assignment failed", {
          indicator_id,
          error: error instanceof Error ? error.message : String(error),
        });

        // Log failure
        await ctx.run("log-failure", async () => {
          const repo = new DatabaseRepository();
          await repo.logProcessing({
            indicator_id,
            stage: "family",
            status: "failed",
            error_message: error instanceof Error
              ? error.message
              : String(error),
          });
        });

        throw error;
      }
    },
  },
});

export default familyAssignmentService;
