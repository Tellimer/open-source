/**
 * Smart caching layer for computations
 */

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  storage?: "memory" | "localStorage";
  keyGenerator?: (...args: any[]) => string;
}

class SmartCache {
  private cache = new Map<string, { value: any; expires: number }>();
  private options: CacheOptions;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: 3600000, // 1 hour default
      maxSize: 1000,
      storage: "memory",
      ...options,
    };
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    if (this.cache.size >= (this.options.maxSize || 1000)) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + (this.options.ttl || 3600000),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Create cached version of a function
 */
export function withCache<T extends (...args: any[]) => any>(
  fn: T,
  options: CacheOptions = {},
): T {
  const cache = new SmartCache(options);
  const keyGen = options.keyGenerator || ((...args) => JSON.stringify(args));

  return ((...args: Parameters<T>) => {
    const key = keyGen(...args);
    const cached = cache.get<ReturnType<T>>(key);

    if (cached !== null) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}
