// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Get keys from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// Lazy initialization
let supabaseInstance: ReturnType<typeof createClient> | null = null;

const pendingRequests = new Map<string, Promise<any>>();
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const LONG_CACHE_TTL = 60 * 60 * 1000; // 1 hour for static data

const getCacheTTL = (query: string): number => {
  if (query.includes('profiles') && query.includes('user_id')) return LONG_CACHE_TTL;
  if (query.includes('courses') || query.includes('units')) return LONG_CACHE_TTL;
  if (query.includes('subscription')) return 2 * 60 * 1000;
  if (query.includes('mistakes') || query.includes('progress')) return 30 * 1000;
  return DEFAULT_CACHE_TTL;
};

const cachedFetch = async (queryFn: () => Promise<any>, queryKey: string, options?: { bypassCache?: boolean; ttl?: number }) => {
  const cacheKey = `supabase_${queryKey}`;

  if (!options?.bypassCache) {
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < (options?.ttl || cached.ttl)) {
      return cached.data;
    }
  }

  if (pendingRequests.has(queryKey)) {
    return pendingRequests.get(queryKey);
  }

  const promise = queryFn().finally(() => {
    pendingRequests.delete(queryKey);
  });

  pendingRequests.set(queryKey, promise);
  const result = await promise;

  queryCache.set(cacheKey, {
    data: result,
    timestamp: Date.now(),
    ttl: options?.ttl || getCacheTTL(queryKey)
  });

  if (queryCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of queryCache.entries()) {
      if (now - value.timestamp > value.ttl * 2) {
        queryCache.delete(key);
      }
    }
  }

  return result;
};

export const invalidateCache = (pattern?: string) => {
  if (pattern) {
    for (const key of queryCache.keys()) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    queryCache.clear();
  }
};

export const getSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lockAcquireTimeout: 10000,
        storageKey: 'medrae_auth',
        flowType: 'pkce',
      },
      // 🚀 COMPLETELY DISABLE REALTIME - NO WEBSOCKETS AT ALL
      realtime: {
        enabled: false, // This kills all WebSocket connections
      },
      global: {
        headers: {
          'X-Client-Info': 'medrae-platform',
          'X-Client-Version': '1.0.16',
        },
        fetch: (url, options) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const fetchWithRetry = async (retries = 2): Promise<Response> => {
            try {
              const response = await fetch(url, {
                ...options,
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              return response;
            } catch (error) {
              if (retries > 0 && (error as Error).name === 'AbortError') {
                clearTimeout(timeoutId);
                return fetchWithRetry(retries - 1);
              }
              clearTimeout(timeoutId);
              throw error;
            }
          };

          return fetchWithRetry();
        },
      },
    });
  }
  return supabaseInstance;
};

export const supabase = getSupabase();

// ============================================
// QUERY HELPERS (No realtime)
// ============================================

export async function queryWithCache<T>(
  table: string,
  query: (client: typeof supabase) => Promise<{ data: T | null; error: any }>,
  key: string,
  options?: { bypassCache?: boolean; ttl?: number }
): Promise<T | null> {
  try {
    const result = await cachedFetch(
      async () => {
        const { data, error } = await query(supabase);
        if (error) throw error;
        return data;
      },
      `${table}_${key}`,
      options
    );
    return result;
  } catch (error) {
    console.error(`Query error for ${table}:`, error);
    return null;
  }
}

export async function fetchById<T>(
  table: string,
  id: string | number,
  select = '*'
): Promise<T | null> {
  return queryWithCache<T>(
    table,
    client => client.from(table).select(select).eq('id', id).maybeSingle(),
    `id_${id}`,
    { ttl: LONG_CACHE_TTL }
  );
}

export async function fetchUserProfile(userId: string) {
  return queryWithCache(
    'profiles',
    client => client.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    `user_profile_${userId}`,
    { ttl: LONG_CACHE_TTL }
  );
}

// ============================================
// BATCH & PAGINATION (No realtime)
// ============================================

export async function batchQueries<T extends any[]>(
  queries: Array<() => Promise<any>>
): Promise<T> {
  return Promise.all(queries.map(q => q())) as Promise<T>;
}

export async function paginatedQuery<T>(
  table: string,
  select: string,
  pageSize: number,
  cursor?: { column: string; value: any },
  filters?: Record<string, any>
): Promise<{ data: T[]; nextCursor: any; hasMore: boolean }> {
  let query = supabase.from(table).select(select).limit(pageSize + 1);

  if (cursor) {
    query = query.gt(cursor.column, cursor.value);
  }

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Pagination error for ${table}:`, error);
    return { data: [], nextCursor: null, hasMore: false };
  }

  const hasMore = (data?.length || 0) > pageSize;
  const items = (data || []).slice(0, pageSize);
  const nextCursor = hasMore && items.length > 0
    ? items[items.length - 1][cursor?.column || 'id']
    : null;

  return { data: items as T[], nextCursor, hasMore };
}

// ============================================
// CACHE HELPERS
// ============================================

export const CACHE_KEYS = {
  MICRO_CASE_CARDS: 'micro_case_cards_cache',
  UNIT_COUNTS: 'unitQuestionCounts_v2',
  SUBSCRIPTION_STATUS: 'subscriptionStatus',
  FREE_UNITS: 'freeUnits',
} as const;

export const CACHE_DURATION = 24 * 60 * 60 * 1000;

export interface CachedData<T> {
  data: T;
  timestamp: number;
}

export function getCachedData<T>(key: string): CachedData<T> | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export function saveCachedData<T>(key: string, data: T): void {
  try {
    const cacheData: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Failed to save cache for ${key}:`, error);
  }
}

export function isCacheExpired(cached: CachedData<any> | null): boolean {
  if (!cached) return true;
  return Date.now() - cached.timestamp >= CACHE_DURATION;
}

export function clearCache(key?: string): void {
  if (key) {
    localStorage.removeItem(key);
  } else {
    Object.values(CACHE_KEYS).forEach(cacheKey => {
      localStorage.removeItem(cacheKey);
    });
    queryCache.clear();
  }
}

export function getRandomItem<T>(items: T[]): T | null {
  if (!items || items.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}


let connectionListener: ((isConnected: boolean) => void) | null = null;

export const onConnectionChange = (callback: (isConnected: boolean) => void) => {
  connectionListener = callback;
};

if (typeof window !== 'undefined') {
  const handleOnline = () => {
    console.log('🌐 Connection restored - invalidating cache');
    queryCache.clear(); // Clear cache on reconnect to get fresh data
    connectionListener?.(true);
  };

  const handleOffline = () => {
    console.log('⚠️ Connection lost - using cached data');
    connectionListener?.(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

// Debug helper
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__SUPABASE_DEBUG__ = {
    getCacheStats: () => ({
      cacheSize: queryCache.size,
      pendingRequests: pendingRequests.size,
    }),
    invalidateCache,
    clearCache,
  };
}