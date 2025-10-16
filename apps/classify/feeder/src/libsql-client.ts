/**
 * LibSQL (Turso) client for fetching source indicators
 */

import { createClient } from "@libsql/client";
import type { Indicator, SourceIndicator } from "./types.ts";

export class LibSQLClient {
  private client: ReturnType<typeof createClient>;

  constructor(url: string, authToken?: string) {
    this.client = createClient({
      url,
      authToken,
    });
  }

  /**
   * Get indicators ready to be queued (not yet sent)
   */
  async getQueuedIndicators(limit: number): Promise<SourceIndicator[]> {
    const result = await this.client.execute({
      sql: `
        SELECT
          id as indicator_id,
          name,
          units,
          definition as description,
          periodicity,
          sample_values,
          source_name,
          source_url,
          long_name,
          category_group,
          dataset,
          aggregation_method,
          scale,
          topic,
          currency_code,
          created_at,
          updated_at,
          deleted_at,
          queued,
          sent_at,
          sent_trace_id,
          processed
        FROM source_indicators
        WHERE queued = 1 AND sent_at IS NULL
        ORDER BY updated_at DESC
        LIMIT ?
      `,
      args: [limit],
    });

    return result.rows.map((row: any) => this.mapRow(row));
  }

  /**
   * Mark indicators as sent with trace ID
   */
  async markAsSent(
    indicatorIds: string[],
    traceId: string
  ): Promise<void> {
    if (indicatorIds.length === 0) return;

    const placeholders = indicatorIds.map(() => "?").join(",");
    await this.client.execute({
      sql: `
        UPDATE source_indicators
        SET sent_at = CURRENT_TIMESTAMP, sent_trace_id = ?
        WHERE id IN (${placeholders})
      `,
      args: [traceId, ...indicatorIds],
    });
  }

  /**
   * Mark indicators as processed
   */
  async markAsProcessed(indicatorIds: string[]): Promise<void> {
    if (indicatorIds.length === 0) return;

    const placeholders = indicatorIds.map(() => "?").join(",");
    await this.client.execute({
      sql: `
        UPDATE source_indicators
        SET processed = 1
        WHERE id IN (${placeholders})
      `,
      args: indicatorIds,
    });
  }

  /**
   * Get progress statistics
   */
  async getProgress(): Promise<{
    total: number;
    queued: number;
    sent: number;
    processed: number;
  }> {
    const totalResult = await this.client.execute({
      sql: "SELECT COUNT(*) as count FROM source_indicators WHERE queued = 1",
      args: [],
    });

    const sentResult = await this.client.execute({
      sql: "SELECT COUNT(*) as count FROM source_indicators WHERE sent_at IS NOT NULL",
      args: [],
    });

    const processedResult = await this.client.execute({
      sql: "SELECT COUNT(*) as count FROM source_indicators WHERE processed = 1",
      args: [],
    });

    return {
      total: (totalResult.rows[0] as any).count as number,
      queued: (totalResult.rows[0] as any).count as number,
      sent: (sentResult.rows[0] as any).count as number,
      processed: (processedResult.rows[0] as any).count as number,
    };
  }

  /**
   * Close the connection
   */
  close(): void {
    // LibSQL client doesn't have explicit close method
  }

  /**
   * Map database row to SourceIndicator
   */
  private mapRow(row: any): SourceIndicator {
    let sampleValues;
    if (row.sample_values) {
      try {
        sampleValues = JSON.parse(row.sample_values as string);
      } catch {
        sampleValues = undefined;
      }
    }

    return {
      indicator_id: row.indicator_id as string,
      name: row.name as string,
      units: row.units as string | null,
      description: row.description as string | null,
      periodicity: row.periodicity as string | null,
      sample_values: sampleValues,
      source_name: row.source_name as string,
      source_url: row.source_url as string,
      long_name: row.long_name as string,
      category_group: row.category_group as string,
      dataset: row.dataset as string,
      aggregation_method: row.aggregation_method as string,
      scale: row.scale as string,
      topic: row.topic as string,
      currency_code: row.currency_code as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      deleted_at: row.deleted_at as string | null,
      queued: row.queued === 1,
      sent_at: row.sent_at as string | null,
      sent_trace_id: row.sent_trace_id as string | null,
      processed: row.processed === 1,
    };
  }
}
