/**
 * Classification service exports
 */

export { normalizeUnits } from "./normalize.ts";
export {
  createLLMClient,
  getLLMConfig,
  type LLMClient,
  type LLMConfig,
  type LLMProvider,
} from "./llm-clients.ts";
export * from "./types.ts";
export {
  checkCurrencyRuleBased,
  inferScaleRuleBased,
  inferTimeRuleBased,
} from "./rules.ts";

// Re-export prompts
export {
  createTimeInferencePrompt,
  timeInferenceSchema,
} from "./prompts/time.ts";
export {
  createScaleInferencePrompt,
  scaleInferenceSchema,
} from "./prompts/scale.ts";
export {
  createCurrencyCheckPrompt,
  currencyCheckSchema,
} from "./prompts/currency.ts";
export {
  createFamilyAssignmentPrompt,
  familyAssignmentSchema,
} from "./prompts/family.ts";
export {
  createFamilyAssignmentCurrencyPrompt,
  familyAssignmentCurrencySchema,
} from "./prompts/family-currency.ts";
export {
  createFamilyAssignmentNonCurrencyPrompt,
  familyAssignmentNonCurrencySchema,
} from "./prompts/family-non-currency.ts";
export {
  createTypeClassificationPrompt,
  typeClassificationSchema,
} from "./prompts/type.ts";
export {
  createTypeClassificationCurrencyPrompt,
  typeClassificationCurrencySchema,
} from "./prompts/type-currency.ts";
export {
  createTypeClassificationNonCurrencyPrompt,
  typeClassificationNonCurrencySchema,
} from "./prompts/type-non-currency.ts";
export {
  booleanReviewSchema,
  createBooleanReviewPrompt,
} from "./prompts/boolean-review.ts";
export {
  createFinalReviewPrompt,
  finalReviewSchema,
} from "./prompts/final-review.ts";
