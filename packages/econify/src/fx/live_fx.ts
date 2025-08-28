/**
 * Live FX rate fetching from multiple sources
 */

import type { FXTable } from '../types.ts';

export interface FXSource {
  name: string;
  endpoint: string;
  apiKey?: string;
  rateLimit?: number;
  priority: number;
}

export interface LiveFXOptions {
  sources?: FXSource[];
  fallback?: FXTable;
  cache?: boolean;
  cacheTTL?: number;
  retries?: number;
  timeout?: number;
}

export interface FXRateResponse {
  base: string;
  rates: Record<string, number>;
  timestamp: Date;
  source: string;
}

type Rates = Record<string, number>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isRates(v: unknown): v is Rates {
  return isRecord(v) && Object.values(v).every((n) => typeof n === 'number');
}

function isECBResponse(
  data: unknown
): data is { base: string; rates: Rates; date: string } {
  return (
    isRecord(data) &&
    typeof data.base === 'string' &&
    isRates((data as { rates?: unknown }).rates) &&
    typeof (data as { date?: unknown }).date === 'string'
  );
}

function isExchangeRateAPIResponse(
  data: unknown
): data is { base: string; rates: Rates } {
  return (
    isRecord(data) &&
    typeof (data as { base?: unknown }).base === 'string' &&
    isRates((data as { rates?: unknown }).rates)
  );
}

// Default FX sources (free tier APIs)
const DEFAULT_SOURCES: FXSource[] = [
  {
    name: 'ECB',
    endpoint: 'https://api.frankfurter.app/latest',
    priority: 1,
    rateLimit: 100,
  },
  {
    name: 'ExchangeRate-API',
    endpoint: 'https://api.exchangerate-api.com/v4/latest',
    priority: 2,
    rateLimit: 1500,
  },
];

// Cache for storing fetched rates
const rateCache = new Map<string, { data: FXRateResponse; expires: number }>();

/**
 * Fetch live FX rates from multiple sources
 */
export async function fetchLiveFXRates(
  base = 'USD',
  options: LiveFXOptions = {}
): Promise<FXTable> {
  const {
    sources = DEFAULT_SOURCES,
    fallback,
    cache = true,
    cacheTTL = 3600000, // 1 hour
    retries = 3,
    timeout = 5000,
  } = options;

  // Check cache first
  if (cache) {
    const cached = getCachedRates(base);
    if (cached) {
      return { base: cached.base, rates: cached.rates };
    }
  }

  // Sort sources by priority
  const sortedSources = [...sources].sort((a, b) => a.priority - b.priority);

  // Try each source
  for (const source of sortedSources) {
    try {
      const response = await fetchFromSource(source, base, timeout, retries);

      // Cache the result
      if (cache && response) {
        setCachedRates(base, response, cacheTTL);
      }

      return { base: response.base, rates: response.rates };
    } catch (error) {
      console.warn(`Failed to fetch from ${source.name}:`, error);
      continue;
    }
  }

  // Use fallback if all sources fail
  if (fallback) {
    console.warn('All FX sources failed, using fallback rates');
    return fallback;
  }

  throw new Error('Unable to fetch FX rates from any source');
}

/**
 * Fetch from a specific source with retries
 */
async function fetchFromSource(
  source: FXSource,
  base: string,
  timeout: number,
  maxRetries: number
): Promise<FXRateResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const url = `${source.endpoint}/${base}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: source.apiKey ? { 'X-API-Key': source.apiKey } : {},
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse response based on source format
      return parseSourceResponse(source.name, data);
    } catch (error) {
      lastError = error as Error;

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw lastError || new Error('Failed to fetch from source');
}

/**
 * Parse response based on source format
 */
function parseSourceResponse(
  sourceName: string,
  data: unknown
): FXRateResponse {
  switch (sourceName) {
    case 'ECB': {
      if (!isECBResponse(data)) throw new Error('Invalid ECB response format');
      return {
        base: data.base,
        rates: data.rates,
        timestamp: new Date(data.date),
        source: 'ECB',
      };
    }

    case 'ExchangeRate-API': {
      if (!isExchangeRateAPIResponse(data)) {
        throw new Error('Invalid ExchangeRate-API response format');
      }
      return {
        base: data.base,
        rates: data.rates,
        timestamp: new Date(),
        source: 'ExchangeRate-API',
      };
    }

    default: {
      if (!isRecord(data)) throw new Error('Invalid FX response');

      const base =
        (typeof (data as { base?: unknown }).base === 'string' &&
          (data as { base: string }).base) ||
        (typeof (data as { base_code?: unknown }).base_code === 'string' &&
          (data as { base_code: string }).base_code);

      const rates =
        (isRates((data as { rates?: unknown }).rates) &&
          (data as { rates: Rates }).rates) ||
        (isRates((data as { conversion_rates?: unknown }).conversion_rates) &&
          (data as { conversion_rates: Rates }).conversion_rates);

      const tsRaw =
        (data as { timestamp?: unknown }).timestamp ??
        (data as { date?: unknown }).date;

      if (!base || !rates) throw new Error('Missing base or rates');

      const timestamp =
        typeof tsRaw === 'string' || typeof tsRaw === 'number'
          ? new Date(tsRaw)
          : new Date();

      return { base, rates, timestamp, source: sourceName };
    }
  }
}

/**
 * Get cached rates if available
 */
function getCachedRates(base: string): FXRateResponse | null {
  const cached = rateCache.get(base);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  return null;
}

/**
 * Cache rates with expiration
 */
function setCachedRates(base: string, data: FXRateResponse, ttl: number): void {
  rateCache.set(base, {
    data,
    expires: Date.now() + ttl,
  });
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of rateCache.entries()) {
    if (value.expires <= now) {
      rateCache.delete(key);
    }
  }
}

/**
 * Get available currencies from live sources
 */
export async function getAvailableCurrencies(
  options: LiveFXOptions = {}
): Promise<string[]> {
  const fx = await fetchLiveFXRates('USD', options);
  return ['USD', ...Object.keys(fx.rates)].sort();
}
