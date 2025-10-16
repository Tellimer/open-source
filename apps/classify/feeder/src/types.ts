/**
 * Shared TypeScript types for feeder service
 */

export interface Indicator {
  indicator_id: string;
  name: string;
  units?: string | null;
  description?: string | null;
  periodicity?: string | null;
  sample_values?: Array<{ date: string; value: number }>;
  // Additional contextual fields
  source_name?: string;
  source_url?: string;
  long_name?: string;
  category_group?: string;
  dataset?: string;
  aggregation_method?: string;
  scale?: string;
  topic?: string;
  currency_code?: string;
}

export interface SourceIndicator extends Indicator {
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Status tracking fields
  queued?: boolean;
  sent_at?: string | null;
  sent_trace_id?: string | null;
  processed?: boolean;
}

export interface BatchResponse {
  message: string;
  count: number;
  trace_id: string;
}

export interface FeederConfig {
  motiaApiUrl: string;
  libsqlUrl: string;
  libsqlAuthToken?: string;
  postgresUrl: string;
  batchSize: number;
  concurrency: number;
  interBatchDelayMs: number;
  provider: "openai" | "anthropic" | "local";
}

export interface BatchProgress {
  totalIndicators: number;
  queued: number;
  sent: number;
  completed: number;
  failed: number;
}
