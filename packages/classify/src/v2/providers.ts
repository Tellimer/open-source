/**
 * V2 Provider Factory
 * @module
 */

import type { LLMConfig, LLMProviderInterface } from '../types.ts';
import { getProvider } from '../providers/index.ts';

/**
 * Create V2 provider from LLM config
 * Reuses existing V1 provider infrastructure
 */
export function createV2Provider(config: LLMConfig): LLMProviderInterface {
  return getProvider(config.provider);
}
