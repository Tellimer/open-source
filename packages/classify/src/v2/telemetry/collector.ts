/**
 * Telemetry Collection for V2 Pipeline
 * Tracks metrics, performance, and costs across all stages
 * @module
 */

import type { LLMProvider } from '../../types.ts';
import type { V2PipelineStage } from '../types.ts';

/**
 * Stage-level telemetry event
 */
export interface StageTelemetryEvent {
  executionId: string;
  stage: V2PipelineStage;
  timestamp: string;
  duration: number;
  indicatorsProcessed: number;
  apiCalls: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
  provider?: LLMProvider;
  model?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Error telemetry event
 */
export interface ErrorTelemetryEvent {
  executionId: string;
  stage: V2PipelineStage;
  timestamp: string;
  error: string;
  indicatorId?: string;
  retryAttempt?: number;
}

/**
 * Pipeline-level telemetry summary
 */
export interface PipelineTelemetry {
  executionId: string;
  startTime: string;
  endTime?: string;
  totalDuration?: number;
  totalIndicators: number;
  totalApiCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCost: number;
  provider: LLMProvider;
  model: string;
  stages: Map<V2PipelineStage, StageTelemetryEvent[]>;
  errors: ErrorTelemetryEvent[];
}

/**
 * Telemetry collector class
 */
export class TelemetryCollector {
  private telemetry: PipelineTelemetry;
  private stageStartTimes: Map<V2PipelineStage, number> = new Map();

  constructor(
    executionId: string,
    provider: LLMProvider,
    model: string,
    totalIndicators: number
  ) {
    this.telemetry = {
      executionId,
      startTime: new Date().toISOString(),
      totalIndicators,
      totalApiCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalEstimatedCost: 0,
      provider,
      model,
      stages: new Map(),
      errors: [],
    };
  }

  /**
   * Mark start of a stage
   */
  startStage(stage: V2PipelineStage): void {
    this.stageStartTimes.set(stage, Date.now());
  }

  /**
   * Mark end of a stage and record metrics
   */
  endStage(
    stage: V2PipelineStage,
    indicatorsProcessed: number,
    apiCalls: number,
    options?: {
      inputTokens?: number;
      outputTokens?: number;
      estimatedCost?: number;
      metadata?: Record<string, unknown>;
    }
  ): void {
    const startTime = this.stageStartTimes.get(stage);
    if (!startTime) {
      console.warn(`[Telemetry] Stage ${stage} was never started`);
      return;
    }

    const duration = Date.now() - startTime;

    const event: StageTelemetryEvent = {
      executionId: this.telemetry.executionId,
      stage,
      timestamp: new Date().toISOString(),
      duration,
      indicatorsProcessed,
      apiCalls,
      inputTokens: options?.inputTokens,
      outputTokens: options?.outputTokens,
      estimatedCost: options?.estimatedCost,
      provider: this.telemetry.provider,
      model: this.telemetry.model,
      metadata: options?.metadata,
    };

    // Add to stage events
    if (!this.telemetry.stages.has(stage)) {
      this.telemetry.stages.set(stage, []);
    }
    this.telemetry.stages.get(stage)!.push(event);

    // Update totals
    this.telemetry.totalApiCalls += apiCalls;
    if (options?.inputTokens) {
      this.telemetry.totalInputTokens += options.inputTokens;
    }
    if (options?.outputTokens) {
      this.telemetry.totalOutputTokens += options.outputTokens;
    }
    if (options?.estimatedCost) {
      this.telemetry.totalEstimatedCost += options.estimatedCost;
    }

    this.stageStartTimes.delete(stage);
  }

  /**
   * Record an error
   */
  recordError(
    stage: V2PipelineStage,
    error: Error | string,
    indicatorId?: string,
    retryAttempt?: number
  ): void {
    const event: ErrorTelemetryEvent = {
      executionId: this.telemetry.executionId,
      stage,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : error,
      indicatorId,
      retryAttempt,
    };

    this.telemetry.errors.push(event);
  }

  /**
   * Finalize telemetry collection
   */
  finalize(): PipelineTelemetry {
    this.telemetry.endTime = new Date().toISOString();
    this.telemetry.totalDuration =
      new Date(this.telemetry.endTime).getTime() -
      new Date(this.telemetry.startTime).getTime();

    return this.telemetry;
  }

  /**
   * Get current telemetry snapshot
   */
  getSnapshot(): PipelineTelemetry {
    return { ...this.telemetry };
  }

  /**
   * Get stage summary
   */
  getStageSummary(stage: V2PipelineStage): {
    totalDuration: number;
    totalIndicators: number;
    totalApiCalls: number;
    avgDuration: number;
    avgIndicatorsPerCall: number;
  } | null {
    const events = this.telemetry.stages.get(stage);
    if (!events || events.length === 0) return null;

    const totalDuration = events.reduce((sum, e) => sum + e.duration, 0);
    const totalIndicators = events.reduce((sum, e) => sum + e.indicatorsProcessed, 0);
    const totalApiCalls = events.reduce((sum, e) => sum + e.apiCalls, 0);

    return {
      totalDuration,
      totalIndicators,
      totalApiCalls,
      avgDuration: totalDuration / events.length,
      avgIndicatorsPerCall: totalApiCalls > 0 ? totalIndicators / totalApiCalls : 0,
    };
  }

  /**
   * Export telemetry as JSON
   */
  toJSON(): string {
    const data = {
      ...this.telemetry,
      stages: Array.from(this.telemetry.stages.entries()).map(([stage, events]) => ({
        stage,
        events,
      })),
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Print summary to console
   */
  printSummary(): void {
    console.log('\n📊 V2 Pipeline Telemetry Summary');
    console.log('═'.repeat(60));
    console.log(`Execution ID: ${this.telemetry.executionId}`);
    console.log(`Provider: ${this.telemetry.provider} (${this.telemetry.model})`);
    console.log(`Total Indicators: ${this.telemetry.totalIndicators}`);
    console.log(`Total API Calls: ${this.telemetry.totalApiCalls}`);
    console.log(
      `Total Tokens: ${this.telemetry.totalInputTokens + this.telemetry.totalOutputTokens} (in: ${this.telemetry.totalInputTokens}, out: ${this.telemetry.totalOutputTokens})`
    );
    console.log(`Estimated Cost: $${this.telemetry.totalEstimatedCost.toFixed(4)}`);
    if (this.telemetry.totalDuration) {
      console.log(`Total Duration: ${this.telemetry.totalDuration}ms`);
    }
    console.log('');

    console.log('Stage Breakdown:');
    for (const [stage, events] of this.telemetry.stages.entries()) {
      const summary = this.getStageSummary(stage);
      if (summary) {
        console.log(`  ${stage}:`);
        console.log(`    • Duration: ${summary.totalDuration}ms`);
        console.log(`    • Indicators: ${summary.totalIndicators}`);
        console.log(`    • API Calls: ${summary.totalApiCalls}`);
        console.log(
          `    • Avg Time/Call: ${summary.avgDuration.toFixed(1)}ms`
        );
      }
    }

    if (this.telemetry.errors.length > 0) {
      console.log('');
      console.log(`⚠️  Errors: ${this.telemetry.errors.length}`);
      for (const error of this.telemetry.errors.slice(0, 5)) {
        console.log(
          `  • [${error.stage}] ${error.error}${error.indicatorId ? ` (${error.indicatorId})` : ''}`
        );
      }
      if (this.telemetry.errors.length > 5) {
        console.log(`  ... and ${this.telemetry.errors.length - 5} more`);
      }
    }

    console.log('═'.repeat(60));
    console.log('');
  }
}

/**
 * Create a new telemetry collector
 */
export function createTelemetryCollector(
  executionId: string,
  provider: LLMProvider,
  model: string,
  totalIndicators: number
): TelemetryCollector {
  return new TelemetryCollector(executionId, provider, model, totalIndicators);
}
