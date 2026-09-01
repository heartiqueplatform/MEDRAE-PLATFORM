
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private inflightRequests: Map<string, Promise<any>> = new Map();

  /**
   * Get or execute a query with automatic caching and deduplication
   * @param key - Unique cache key
   * @param fetchFn - Function that returns a Promise
   * @param ttl - Time to live in milliseconds (default: 5 minutes)
   * @returns Cached or fetched data
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<T> {
    // 1. Check if valid cache exists
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // 2. Check if request is already in-flight (deduplication)
    const inflightKey = `__INFLIGHT_${key}`;
    if (this.inflightRequests.has(inflightKey)) {
      return this.inflightRequests.get(inflightKey)!;
    }

    // 3. Execute fetch and cache the Promise (in-flight)
    const promise = fetchFn()
      .then((data) => {
        // Cache the successful result
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl,
        });
        return data;
      })
      .finally(() => {
        // Remove from in-flight map when complete
        this.inflightRequests.delete(inflightKey);
      });

    this.inflightRequests.set(inflightKey, promise);
    return promise;
  }

  /**
   * Set a value directly in cache
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get a value from cache (without fetching if expired)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }

    // Remove expired entry
    this.cache.delete(key);
    return null;
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate multiple entries by prefix (e.g., "survivalApi:getExamCenters")
   */
  invalidateByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics (useful for debugging)
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      inflightRequests: this.inflightRequests.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const queryCache = new QueryCache();

/**
 * Helper to create a cache key from service, method, and params
 */
export function makeCacheKey(
  service: string,
  method: string,
  params?: Record<string, any>
): string {
  const paramStr = params ? JSON.stringify(params) : "";
  return `${service}:${method}:${paramStr}`;
}
