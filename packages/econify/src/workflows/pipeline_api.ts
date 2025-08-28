/**
 * Clean API for the pipeline that abstracts away XState completely
 */

import { createActor } from 'npm:xstate';
import { pipelineMachine } from './pipeline_v5.ts';
import type { ParsedData, PipelineConfig } from './pipeline_v5.ts';

export interface PipelineOptions extends PipelineConfig {
  onProgress?: (step: string, progress: number) => void;
  onWarning?: (warning: string) => void;
  onError?: (error: Error) => void;
}

export interface PipelineResult {
  data: ParsedData[];
  warnings: string[];
  errors: Error[];
  metrics: {
    processingTime: number;
    recordsProcessed: number;
    recordsFailed: number;
    qualityScore?: number;
  };
}

/**
 * Process economic data through the pipeline
 * 
 * @param data - Array of economic data points to process
 * @param options - Pipeline configuration and callbacks
 * @returns Promise<PipelineResult> - Processed data with metadata
 * 
 * @example
 * ```ts
 * const result = await processEconomicData(
 *   [
 *     { value: 100, unit: 'USD Million', name: 'GDP' },
 *     { value: 3.5, unit: 'percent', name: 'Inflation' }
 *   ],
 *   {
 *     targetCurrency: 'EUR',
 *     targetMagnitude: 'billions',
 *     minQualityScore: 60,
 *     onProgress: (step, progress) => console.log(`${step}: ${progress}%`),
 *   }
 * );
 * 
 * console.log(result.data); // Processed data
 * console.log(result.metrics.qualityScore); // Quality score
 * ```
 */
export async function processEconomicData(
  data: ParsedData[],
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const { onProgress, onWarning, onError, ...config } = options;
  
  return new Promise((resolve, reject) => {
    const actor = createActor(pipelineMachine, {
      input: {
        rawData: data,
        config,
      },
    });

    let lastState = '';
    const startTime = Date.now();

    actor.subscribe((state) => {
      // Track progress through states
      if (state.value !== lastState) {
        lastState = state.value as string;
        
        const progressMap: Record<string, number> = {
          idle: 0,
          validating: 10,
          parsing: 20,
          qualityCheck: 30,
          qualityReview: 40,
          fetchingRates: 50,
          normalizing: 60,
          adjusting: 70,
          finalizing: 90,
          success: 100,
          error: -1,
        };

        // Clean up state names for external consumption
        const cleanStateName = lastState
          .replace('adjusting.', '')
          .replace('xstate.', '')
          .replace('.actor.', ' ')
          .replace(/([A-Z])/g, ' $1')
          .toLowerCase()
          .trim();

        const progress = progressMap[lastState] ?? 0;
        if (onProgress && progress >= 0) {
          onProgress(cleanStateName, progress);
        }
      }

      // Handle warnings
      if (state.context.warnings.length > 0 && onWarning) {
        state.context.warnings.forEach(warning => {
          if (!warning.startsWith('_processed_')) {
            onWarning(warning);
            // Mark as processed to avoid duplicate calls
            state.context.warnings[state.context.warnings.indexOf(warning)] = '_processed_' + warning;
          }
        });
      }

      // Handle completion
      if (state.matches('success')) {
        const result: PipelineResult = {
          data: state.context.finalData || [],
          warnings: state.context.warnings.filter(w => !w.startsWith('_processed_')),
          errors: [],
          metrics: {
            processingTime: Date.now() - startTime,
            recordsProcessed: state.context.finalData?.length || 0,
            recordsFailed: data.length - (state.context.finalData?.length || 0),
            qualityScore: state.context.qualityScore?.overall,
          },
        };
        resolve(result);
      }

      // Handle errors
      if (state.matches('error')) {
        const errors = state.context.errors.map(e => 
          new Error(e.message || 'Pipeline error')
        );
        
        if (onError && errors[0]) {
          onError(errors[0]);
        }

        const result: PipelineResult = {
          data: state.context.normalizedData || state.context.parsedData || [],
          warnings: state.context.warnings.filter(w => !w.startsWith('_processed_')),
          errors,
          metrics: {
            processingTime: Date.now() - startTime,
            recordsProcessed: state.context.normalizedData?.length || 0,
            recordsFailed: data.length,
            qualityScore: state.context.qualityScore?.overall,
          },
        };
        reject(errors[0] || new Error('Pipeline failed'));
      }
    });

    actor.start();
    actor.send({ type: 'START' });
  });
}

/**
 * Process economic data with automatic quality review handling
 * Will automatically continue if quality is below threshold
 * 
 * @param data - Array of economic data points to process
 * @param options - Pipeline configuration
 * @returns Promise<PipelineResult> - Processed data with metadata
 */
export async function processEconomicDataAuto(
  data: ParsedData[],
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  return new Promise((resolve, reject) => {
    const { onProgress, onWarning, onError, ...config } = options;
    const actor = createActor(pipelineMachine, {
      input: {
        rawData: data,
        config,
      },
    });

    const startTime = Date.now();
    let hasReviewed = false;

    actor.subscribe((state) => {
      // Auto-continue on quality review
      if (state.matches('qualityReview') && !hasReviewed) {
        hasReviewed = true;
        if (onWarning) {
          onWarning(`Quality score ${state.context.qualityScore?.overall || 0} below threshold ${config.minQualityScore || 70}, continuing anyway`);
        }
        setTimeout(() => actor.send({ type: 'CONTINUE' }), 0);
      }

      if (onProgress) {
        const progressMap: Record<string, number> = {
          idle: 0,
          validating: 10,
          parsing: 20,
          qualityCheck: 30,
          qualityReview: 40,
          fetchingRates: 50,
          normalizing: 60,
          adjusting: 70,
          finalizing: 90,
          success: 100,
        };
        const progress = progressMap[state.value as string] ?? 0;
        onProgress(state.value as string, progress);
      }

      if (state.matches('success')) {
        resolve({
          data: state.context.finalData || [],
          warnings: state.context.warnings,
          errors: [],
          metrics: {
            processingTime: Date.now() - startTime,
            recordsProcessed: state.context.finalData?.length || 0,
            recordsFailed: 0,
            qualityScore: state.context.qualityScore?.overall,
          },
        });
      }

      if (state.matches('error')) {
        const error = new Error(state.context.errors[0]?.message || 'Pipeline failed');
        if (onError) onError(error);
        reject(error);
      }
    });

    actor.start();
    actor.send({ type: 'START' });
  });
}

/**
 * Validate data without processing
 * Useful for checking data quality before processing
 * 
 * @param data - Array of economic data points to validate
 * @param options - Validation options
 * @returns Promise<{valid: boolean, score: number, issues: string[]}>
 */
export async function validateEconomicData(
  data: ParsedData[],
  options: { requiredFields?: string[] } = {}
): Promise<{ valid: boolean; score: number; issues: string[] }> {
  if (!data || data.length === 0) {
    return { valid: false, score: 0, issues: ['No data provided'] };
  }

  const issues: string[] = [];
  
  // Check required fields
  if (options.requiredFields) {
    const invalid = data.filter(
      item => !options.requiredFields!.every(field => field in item)
    );
    if (invalid.length > 0) {
      issues.push(`${invalid.length} records missing required fields`);
    }
  }

  // Check basic validity
  const invalidValues = data.filter(item => 
    typeof item.value !== 'number' || isNaN(item.value) || !isFinite(item.value)
  );
  if (invalidValues.length > 0) {
    issues.push(`${invalidValues.length} records have invalid values`);
  }

  const missingUnits = data.filter(item => !item.unit);
  if (missingUnits.length > 0) {
    issues.push(`${missingUnits.length} records missing units`);
  }

  // Calculate score
  const score = Math.max(0, 100 - (issues.length * 20));

  return {
    valid: issues.length === 0,
    score,
    issues,
  };
}