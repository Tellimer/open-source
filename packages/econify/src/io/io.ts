/**
 * Import/Export utilities for various formats
 */

import { parseUnit } from "../units/units.ts";
import { inferUnit } from "../inference/inference.ts";

export type ExportFormat = "csv" | "json" | "excel" | "parquet";
export type ImportFormat = "csv" | "json" | "excel";

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  preserveUnits?: boolean;
  headers?: boolean;
  delimiter?: string;
}

export interface ImportOptions {
  format?: ImportFormat;
  detectUnits?: boolean;
  inferTypes?: boolean;
  headers?: boolean;
  delimiter?: string;
  columnMapping?: Record<string, string>;
}

type Row = Record<string, unknown>;

/**
 * Export data to various formats.
 *
 * @param data Array of row objects to export
 * @param options Export options: format, headers, delimiter, metadata flags
 * @returns Serialized content (string for CSV/JSON, buffer for others)
 */
export function exportTo(
  data: Row[],
  options: ExportOptions,
): string | ArrayBuffer {
  switch (options.format) {
    case "csv":
      return exportToCSV(data, options);
    case "json":
      return exportToJSON(data, options);
    case "excel":
      return exportToExcel(data, options);
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/**
 * Export to CSV
 */
function exportToCSV(data: Row[], options: ExportOptions): string {
  if (data.length === 0) return "";

  const delimiter = options.delimiter || ",";
  const headers = Object.keys(data[0]);

  let csv = "";
  if (options.headers !== false) {
    csv = headers.join(delimiter) + "\n";
  }

  for (const row of data) {
    const values = headers.map((h) => {
      const value = row[h];
      if (typeof value === "string" && value.includes(delimiter)) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value ?? "");
    });
    csv += values.join(delimiter) + "\n";
  }

  return csv;
}

/**
 * Export to JSON
 */
function exportToJSON(data: Row[], options: ExportOptions): string {
  if (options.includeMetadata) {
    return JSON.stringify(
      {
        data,
        metadata: {
          count: data.length,
          exportDate: new Date().toISOString(),
          preservedUnits: options.preserveUnits,
        },
      },
      null,
      2,
    );
  }

  return JSON.stringify(data, null, 2);
}

/**
 * Export to Excel (simplified - returns CSV for now)
 */
function exportToExcel(data: Row[], options: ExportOptions): string {
  // In a real implementation, this would create an actual Excel file
  // For now, return tab-separated values
  return exportToCSV(data, { ...options, delimiter: "\t" });
}

/**
 * Import from various formats.
 *
 * @param source String/URL/Response/File content source
 * @param options Import options: format, detectUnits, inferTypes, mapping
 * @returns Parsed rows with optional post-processing
 */
export async function importFrom(
  source: string | File | Response,
  options: ImportOptions = {},
): Promise<Row[]> {
  const content = await getContent(source);
  const format = options.format || detectFormat(content);

  let data: Row[];

  switch (format) {
    case "csv":
      data = importFromCSV(content, options);
      break;
    case "json":
      data = importFromJSON(content);
      break;
    default:
      throw new Error(`Unsupported import format: ${format}`);
  }

  // Post-process: detect units and infer types
  if (options.detectUnits || options.inferTypes) {
    data = postProcessData(data, options);
  }

  return data;
}

/**
 * Get content from source
 */
async function getContent(source: string | File | Response): Promise<string> {
  if (typeof source === "string") {
    // If it's a URL
    if (source.startsWith("http")) {
      const response = await fetch(source);
      return response.text();
    }
    // Otherwise treat as content
    return source;
  }

  if (source instanceof Response) {
    return source.text();
  }

  if (source instanceof File) {
    return source.text();
  }

  throw new Error("Invalid source type");
}

/**
 * Detect format from content
 */
function detectFormat(content: string): ImportFormat {
  const trimmed = content.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "json";
  }

  return "csv";
}

/**
 * Import from CSV
 */
function importFromCSV(content: string, options: ImportOptions): Row[] {
  const lines = content.trim().split("\n");
  if (lines.length === 0) return [];

  const delimiter = options.delimiter || ",";
  const hasHeaders = options.headers !== false;

  const headers = hasHeaders
    ? lines[0].split(delimiter).map((h) => h.trim())
    : lines[0].split(delimiter).map((_, i) => `col${i}`);

  const dataLines = hasHeaders ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const values = parseCSVLine(line, delimiter);
    const row: Row = {};

    headers.forEach((header, i) => {
      const mappedHeader = options.columnMapping?.[header] || header;
      row[mappedHeader] = parseValue(values[i]);
    });

    return row;
  });
}

/**
 * Parse CSV line handling quotes
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map((s) => s.trim());
}

/**
 * Parse value to appropriate type
 */
function parseValue(value: string): number | boolean | string | null {
  if (!value) return null;

  // Try number
  const num = Number(value);
  if (!isNaN(num)) return num;

  // Try boolean
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  // Return as string
  return value;
}

/**
 * Import from JSON
 */
function importFromJSON(content: string): Row[] {
  const parsed: unknown = JSON.parse(content);

  if (Array.isArray(parsed)) {
    const isRowArray = parsed.every((v) => typeof v === "object" && v !== null);
    if (isRowArray) return parsed as Row[];
  }

  if (isObjectWithArray((parsed as { data?: unknown })?.data)) {
    return (parsed as { data: unknown[] }).data as Row[];
  }

  throw new Error("Invalid JSON structure for import");
}

function isObjectWithArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

/**
 * Post-process data
 */
function postProcessData(data: Row[], options: ImportOptions): Row[] {
  return data.map((row) => {
    const processed: Row = {};

    for (const [key, value] of Object.entries(row)) {
      processed[key] = value;

      // Detect units
      if (options.detectUnits && typeof value === "string") {
        const parsed = parseUnit(value);
        if (parsed.category !== "unknown") {
          processed[`${key}_unit`] = parsed.normalized || value;
          processed[`${key}_category`] = parsed.category;
        }
      }

      // Infer types
      if (options.inferTypes && typeof value === "number") {
        const context = { text: key };
        const inferred = inferUnit(value, context);
        if (inferred.confidence > 0.7) {
          processed[`${key}_inferred_unit`] = inferred.unit;
        }
      }
    }

    return processed;
  });
}
