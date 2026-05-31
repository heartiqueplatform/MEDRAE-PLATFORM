/**
 * useCachedQuery Hook - Fetch data with automatic caching and deduplication
 * Usage: const { data, loading, error, refetch } = useCachedQuery("key", fetchFn, deps, ttl)
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { queryCache } from "@/lib/queryCache";

interface UseCachedQueryOptions {
  /** Cache TTL in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** If true, skip fetching on mount */
  skip?: boolean;
  /** Called when fetch succeeds */
  onSuccess?: (data: any) => void;
  /** Called when fetch fails */
  onError?: (error: Error) => void;
}

interface UseCachedQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching data with caching and deduplication
 * @param key - Unique cache key
 * @param fetchFn - Async function to fetch data
 * @param deps - Dependency array (re-fetches if changed)
 * @param options - Additional options
 * @returns data, loading, error, refetch
 */
export function useCachedQuery<T>(
  key: string,
  fetchFn: () => Promise<T>,
  deps: any[] = [],
  options: UseCachedQueryOptions = {}
): UseCachedQueryResult<T> {
  const { ttl = 5 * 60 * 1000, skip = false, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<Error | null>(null);

  // Track if component is mounted (prevent state updates on unmount)
  const isMountedRef = useRef(true);

  // Fetch function
  const fetchData = useCallback(async () => {
    if (skip) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await queryCache.getOrFetch(key, fetchFn, ttl);

      if (isMountedRef.current) {
        setData(result);
        onSuccess?.(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [key, fetchFn, ttl, skip, onSuccess, onError]);

  // Fetch on mount and when deps change
  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, deps);

  // Manual refetch (invalidates cache and fetches fresh data)
  const refetch = useCallback(async () => {
    queryCache.invalidate(key);
    await fetchData();
  }, [key, fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Advanced hook with more control over caching behavior
 */
export function useCachedQueryAdvanced<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: UseCachedQueryOptions & {
    /** If true, always refetch even if cached */
    forceRefresh?: boolean;
    /** Retry failed requests N times */
    retry?: number;
    /** Delay between retries in ms */
    retryDelay?: number;
  } = {}
): UseCachedQueryResult<T> & {
  /** Force invalidate cache and refetch */
  invalidate: () => Promise<void>;
  /** Get current cache value without triggering fetch */
  getCached: () => T | null;
} {
  const {
    forceRefresh = false,
    retry = 0,
    retryDelay = 1000,
    ...baseOptions
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!baseOptions.skip);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);

  const fetchWithRetry = useCallback(async (): Promise<T> => {
    try {
      retryCountRef.current = 0;

      const wrappedFetch = async () => {
        try {
          return await fetchFn();
        } catch (err) {
          if (retryCountRef.current < retry) {
            retryCountRef.current++;
            await new Promise((res) => setTimeout(res, retryDelay));
            return wrappedFetch();
          }
          throw err;
        }
      };

      if (forceRefresh) {
        queryCache.invalidate(key);
      }

      return await queryCache.getOrFetch(
        key,
        wrappedFetch,
        baseOptions.ttl
      );
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }, [key, fetchFn, forceRefresh, retry, retryDelay, baseOptions.ttl]);

  const fetchData = useCallback(async () => {
    if (baseOptions.skip) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithRetry();

      if (isMountedRef.current) {
        setData(result);
        baseOptions.onSuccess?.(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        baseOptions.onError?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchWithRetry, baseOptions]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  const refetch = useCallback(async () => {
    queryCache.invalidate(key);
    await fetchData();
  }, [key, fetchData]);

  const invalidate = useCallback(async () => {
    queryCache.invalidate(key);
    await fetchData();
  }, [key, fetchData]);

  const getCached = useCallback(() => {
    return queryCache.get<T>(key);
  }, [key]);

  return { data, loading, error, refetch, invalidate, getCached };
}
