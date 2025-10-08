/**
 * Structured Logging for V2 Pipeline
 * @module
 */

import type { V2PipelineStage } from "../types.ts";

/**
 * Log level
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  stage?: V2PipelineStage;
  executionId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Whether to output to console */
  console: boolean;
  /** Whether to include timestamps */
  timestamps: boolean;
  /** Whether to pretty-print JSON metadata */
  prettyPrint: boolean;
  /** Custom log handler */
  handler?: (entry: LogEntry) => void;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: "info",
  console: true,
  timestamps: true,
  prettyPrint: false,
};

/**
 * Log level hierarchy for filtering
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Structured logger for V2 pipeline
 */
export class V2Logger {
  private config: LoggerConfig;
  private executionId?: string;
  private entries: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set execution ID for all subsequent logs
   */
  setExecutionId(executionId: string): void {
    this.executionId = executionId;
  }

  /**
   * Log debug message
   */
  debug(
    message: string,
    metadata?: Record<string, unknown>,
    stage?: V2PipelineStage,
  ): void {
    this.log("debug", message, metadata, stage);
  }

  /**
   * Log info message
   */
  info(
    message: string,
    metadata?: Record<string, unknown>,
    stage?: V2PipelineStage,
  ): void {
    this.log("info", message, metadata, stage);
  }

  /**
   * Log warning message
   */
  warn(
    message: string,
    metadata?: Record<string, unknown>,
    stage?: V2PipelineStage,
  ): void {
    this.log("warn", message, metadata, stage);
  }

  /**
   * Log error message
   */
  error(
    message: string,
    metadata?: Record<string, unknown>,
    stage?: V2PipelineStage,
  ): void {
    this.log("error", message, metadata, stage);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    stage?: V2PipelineStage,
  ): void {
    // Filter by log level
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      stage,
      executionId: this.executionId,
      message,
      metadata,
    };

    // Store entry
    this.entries.push(entry);

    // Output to console if enabled
    if (this.config.console) {
      this.outputToConsole(entry);
    }

    // Call custom handler if provided
    if (this.config.handler) {
      this.config.handler(entry);
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = this.formatPrefix(entry);
    const message = `${prefix}${entry.message}`;

    // Choose console method based on level
    const consoleMethod = entry.level === "error"
      ? console.error
      : entry.level === "warn"
      ? console.warn
      : console.log;

    if (entry.metadata) {
      if (this.config.prettyPrint) {
        consoleMethod(message, JSON.stringify(entry.metadata, null, 2));
      } else {
        consoleMethod(message, entry.metadata);
      }
    } else {
      consoleMethod(message);
    }
  }

  /**
   * Format log prefix
   */
  private formatPrefix(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.config.timestamps) {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      parts.push(`[${time}]`);
    }

    const levelIcon = this.getLevelIcon(entry.level);
    parts.push(levelIcon);

    if (entry.stage) {
      parts.push(`[${entry.stage}]`);
    }

    if (entry.executionId) {
      const shortId = entry.executionId.split("-")[0];
      parts.push(`[${shortId}]`);
    }

    return parts.join(" ") + " ";
  }

  /**
   * Get icon for log level
   */
  private getLevelIcon(level: LogLevel): string {
    switch (level) {
      case "debug":
        return "🔍";
      case "info":
        return "ℹ️";
      case "warn":
        return "⚠️";
      case "error":
        return "❌";
    }
  }

  /**
   * Get all log entries
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries for a specific stage
   */
  getEntriesByStage(stage: V2PipelineStage): LogEntry[] {
    return this.entries.filter((e) => e.stage === stage);
  }

  /**
   * Get entries by level
   */
  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter((e) => e.level === level);
  }

  /**
   * Clear all log entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Export logs as JSON
   */
  toJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Print log summary
   */
  printSummary(): void {
    const errors = this.entries.filter((e) => e.level === "error");
    const warnings = this.entries.filter((e) => e.level === "warn");

    console.log("\n📝 Log Summary");
    console.log("═".repeat(60));
    console.log(`Total Entries: ${this.entries.length}`);
    console.log(`  • Errors: ${errors.length}`);
    console.log(`  • Warnings: ${warnings.length}`);
    console.log(
      `  • Info: ${this.entries.filter((e) => e.level === "info").length}`,
    );
    console.log(
      `  • Debug: ${this.entries.filter((e) => e.level === "debug").length}`,
    );
    console.log("═".repeat(60));
    console.log("");
  }
}

/**
 * Create a new logger instance
 */
export function createLogger(config: Partial<LoggerConfig> = {}): V2Logger {
  return new V2Logger(config);
}

/**
 * Global logger instance (can be configured)
 */
export const logger = new V2Logger();
