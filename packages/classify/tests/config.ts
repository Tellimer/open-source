/**
 * Test configuration for end-to-end tests
 */

import type { LLMProvider } from '../src/types.ts';

/**
 * Test configuration interface
 */
export interface TestConfig {
  /** LLM providers to test */
  providers: LLMProvider[];
  /** API keys for each provider */
  apiKeys: Record<LLMProvider, string | undefined>;
  /** Default test timeout in milliseconds */
  timeout: number;
  /** Number of retries for failed tests */
  maxRetries: number;
  /** Batch size for classification */
  batchSize: number;
  /** Whether to include reasoning in classifications */
  includeReasoning: boolean;
  /** Minimum confidence threshold for validation */
  minConfidence: number;
  /** Maximum confidence threshold for validation */
  maxConfidence: number;
}

/**
 * Get API key from environment for a provider
 */
function getApiKey(provider: LLMProvider): string | undefined {
  switch (provider) {
    case 'openai':
      return Deno.env.get('OPENAI_API_KEY');
    case 'anthropic':
      return Deno.env.get('ANTHROPIC_API_KEY');
    case 'gemini':
      return Deno.env.get('GEMINI_API_KEY');
    default:
      return undefined;
  }
}

/**
 * Get available providers (those with API keys set)
 */
export function getAvailableProviders(): LLMProvider[] {
  const allProviders: LLMProvider[] = ['openai', 'anthropic', 'gemini'];
  return allProviders.filter((provider) => getApiKey(provider) !== undefined);
}

/**
 * Default test configuration
 */
export const defaultTestConfig: TestConfig = {
  providers: getAvailableProviders(),
  apiKeys: {
    openai: getApiKey('openai'),
    anthropic: getApiKey('anthropic'),
    gemini: getApiKey('gemini'),
  },
  timeout: 60000, // 60 seconds
  maxRetries: 3,
  batchSize: 5,
  includeReasoning: false,
  minConfidence: 0.0,
  maxConfidence: 1.0,
};

/**
 * Get test config with overrides
 */
export function getTestConfig(overrides?: Partial<TestConfig>): TestConfig {
  return {
    ...defaultTestConfig,
    ...overrides,
  };
}

/**
 * Check if a provider is available for testing
 */
export function isProviderAvailable(provider: LLMProvider): boolean {
  return getApiKey(provider) !== undefined;
}

/**
 * Get API key for a provider or throw error
 */
export function requireApiKey(provider: LLMProvider): string {
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    throw new Error(
      `API key for ${provider} not found. Set ${provider.toUpperCase()}_API_KEY environment variable.`
    );
  }
  return apiKey;
}

/**
 * Skip test if provider is not available
 */
export function skipIfProviderUnavailable(provider: LLMProvider): void {
  if (!isProviderAvailable(provider)) {
    console.log(
      `⚠️  Skipping test: ${provider} API key not set (${provider.toUpperCase()}_API_KEY)`
    );
    Deno.exit(0);
  }
}

/**
 * Test thresholds for validation
 */
export const testThresholds = {
  /** Minimum schema validation pass rate */
  schemaValidation: 0.95, // 95%

  /** Minimum classification accuracy against ground truth */
  classificationAccuracy: 0.75, // 75%

  /** Minimum temporal aggregation detection accuracy */
  temporalAccuracy: 0.9, // 90%

  /** Minimum confidence score correlation */
  confidenceCorrelation: 0.7, // 70%

  /** Minimum provider consistency (agreement rate) */
  providerConsistency: 0.8, // 80%

  /** Minimum retry success rate */
  retrySuccess: 0.95, // 95%
};

/**
 * Confidence score ranges for validation
 */
export const confidenceRanges = {
  veryHigh: { min: 0.95, max: 1.0, label: 'Very High (0.95-1.0)' },
  high: { min: 0.85, max: 0.94, label: 'High (0.85-0.94)' },
  moderate: { min: 0.7, max: 0.84, label: 'Moderate (0.70-0.84)' },
  low: { min: 0.0, max: 0.69, label: 'Low (<0.70)' },
};

/**
 * Test data paths
 */
export const testPaths = {
  fixtures: './tests/fixtures',
  e2e: './tests/e2e',
  results: './tests/results',
};

/**
 * Model configurations for each provider
 */
export const providerModels = {
  openai: 'gpt-5',
  anthropic: 'claude-4.5-sonnet',
  gemini: 'gemini-2.5-flash', // More capable model for better accuracy
};

/**
 * Get model for a provider
 */
export function getModelForProvider(provider: LLMProvider): string {
  return providerModels[provider];
}
