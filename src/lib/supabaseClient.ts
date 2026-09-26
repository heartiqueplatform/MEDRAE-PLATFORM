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

const isOffline = (): boolean =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

// 🔧 Shared reachability probe. Cheap, cached for 10s, and — crucially —
// used to decide whether we should even attempt a token refresh.
let _reachability: { value: boolean; at: number } | null = null;
const REACHABILITY_TTL = 10 * 1000;

async function isReallyOnline(timeoutMs = 2500): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  if (_reachability && Date.now() - _reachability.at < REACHABILITY_TTL) {
    return _reachability.value;
  }
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(t);
    _reachability = { value: true, at: Date.now() };
    return true;
  } catch {
    _reachability = { value: false, at: Date.now() };
    return false;
  }
}

const getCacheTTL = (query: string): number => {
  if (query.includes('profiles') && query.includes('user_id')) return LONG_CACHE_TTL;
  if (query.includes('courses') || query.includes('units')) return LONG_CACHE_TTL;
  if (query.includes('subscription')) return 2 * 60 * 1000;
  if (query.includes('mistakes') || query.includes('progress')) return 30 * 1000;
  return DEFAULT_CACHE_TTL;
};

const cachedFetch = async (
  queryFn: () => Promise<any>,
  queryKey: string,
  options?: { bypassCache?: boolean; ttl?: number }
) => {
  const cacheKey = `supabase_${queryKey}`;

  if (!options?.bypassCache) {
    const cached = queryCache.get(cacheKey);
    // Offline: serve in-memory cache regardless of TTL.
    if (
      cached &&
      (isOffline() || Date.now() - cached.timestamp < (options?.ttl || cached.ttl))
    ) {
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

  let result: any;
  try {
    result = await promise;
  } catch (err) {
    // Network failed → return stale cache if we have it, otherwise rethrow.
    const stale = queryCache.get(cacheKey);
    if (stale) return stale.data;
    throw err;
  }

  queryCache.set(cacheKey, {
    data: result,
    timestamp: Date.now(),
    ttl: options?.ttl || getCacheTTL(queryKey),
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

// 🔧 Auth URL detection. We use this to *never* intercept auth traffic
// with our fake-response fallback, and to give auth requests a much
// shorter timeout than data requests.
const AUTH_URL_PATTERN = /\/(auth|token|refresh)\b|grant_type=/i;

export const getSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        // 🔧 CRITICAL FIX: Disable automatic token refresh.
        // The auto-refresher fires SIGNED_OUT when it can't reach the
        // server (offline, captive portal, sleeping device), which
        // nukes the cached session. We drive refresh manually below,
        // only when we've confirmed we're actually online.
        autoRefreshToken: false,
        detectSessionInUrl: true,
        storageKey: 'medrae_auth',
        flowType: 'pkce',
      },
      // 🚀 COMPLETELY DISABLE REALTIME - NO WEBSOCKETS AT ALL
      realtime: {
        enabled: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'medrae-platform',
          'X-Client-Version': '1.0.16',
        },
        fetch: (url, options) => {
          // 🔧 Respect the caller's signal. Supabase's auth client
          // passes its own AbortSignal for refresh timeouts; if we
          // ignore it, we can hang a refresh for 15s when it should
          // give up in 5s, and we'll retry it — which makes things worse.
          const callerSignal = (options as any)?.signal as AbortSignal | undefined;

          const isAuthRequest = AUTH_URL_PATTERN.test(String(url));

          // 🔧 Auth requests: short timeout, no retry, honor caller abort.
          // Data requests: longer timeout, one retry on real network errors.
          const timeoutMs = isAuthRequest ? 6000 : 15000;
          const maxRetries = isAuthRequest ? 0 : 1;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          // If the caller aborts, abort us too.
          const onCallerAbort = () => controller.abort();
          if (callerSignal) {
            if (callerSignal.aborted) controller.abort();
            else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
          }

          const cleanup = () => {
            clearTimeout(timeoutId);
            if (callerSignal) {
              callerSignal.removeEventListener('abort', onCallerAbort);
            }
          };

          const fetchWithRetry = async (retries: number): Promise<Response> => {
            try {
              const response = await fetch(url, {
                ...options,
                signal: controller.signal,
              });
              cleanup();
              return response;
            } catch (error) {
              const name = (error as Error).name;

              // 🔧 Never retry an abort — it's either our timeout or the
              // caller's, and retrying just delays the failure.
              if (name === 'AbortError') {
                cleanup();
                throw error;
              }

              if (retries > 0) {
                return fetchWithRetry(retries - 1);
              }
              cleanup();
              throw error;
            }
          };

          return fetchWithRetry(maxRetries);
        },
      },
    });
  }
  return supabaseInstance;
};

export const supabase = getSupabase();

// ─────────────────────────────────────────────────────────────
// 🔧 MANUAL TOKEN REFRESH
// Only runs when we've confirmed we're really online. Never runs
// while offline. Never throws — logs and lets the app continue
// with the cached session.
// ─────────────────────────────────────────────────────────────
let _refreshing: Promise<void> | null = null;

export async function refreshSessionIfOnline(): Promise<void> {
  if (_refreshing) return _refreshing;

  _refreshing = (async () => {
    try {
      const online = await isReallyOnline();
      if (!online) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Refresh if expiring within the next 5 minutes.
      const expiresAt = session.expires_at ?? 0;
      const now = Math.floor(Date.now() / 1000);
      if (expiresAt - now < 300) {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          // 🔧 Do NOT propagate. A failed refresh while we *think* we're
          // online is almost always a transient network issue. Supabase
          // will fire SIGNED_OUT; authManager's guards will suppress it
          // if we're actually offline.
          console.warn('[supabase] refreshSession failed:', error.message);
        }
      }
    } catch (err) {
      console.warn('[supabase] refreshSessionIfOnline threw:', err);
    } finally {
      _refreshing = null;
    }
  })();

  return _refreshing;
}

// 🔧 Refresh cadence: check every 4 minutes, and immediately on
// network recovery. Skipped entirely while offline.
if (typeof window !== 'undefined') {
  const REFRESH_INTERVAL = 4 * 60 * 1000;
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  const startRefreshLoop = () => {
    if (refreshTimer) return;
    refreshTimer = setInterval(() => {
      refreshSessionIfOnline().catch(() => { });
    }, REFRESH_INTERVAL);
  };

  const stopRefreshLoop = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  };

  window.addEventListener('online', () => {
    _reachability = null;
    refreshSessionIfOnline().catch(() => { });
    startRefreshLoop();
  });

  window.addEventListener('offline', () => {
    _reachability = { value: false, at: Date.now() };
    stopRefreshLoop();
  });

  // Only start the loop if we're plausibly online at boot.
  if (typeof navigator === 'undefined' || navigator.onLine) {
    startRefreshLoop();
    // Do one refresh attempt shortly after boot — but don't block.
    setTimeout(() => {
      refreshSessionIfOnline().catch(() => { });
    }, 3000);
  }
}

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
    (client) => client.from(table).select(select).eq('id', id).maybeSingle(),
    `id_${id}`,
    { ttl: LONG_CACHE_TTL }
  );
}

export async function fetchUserProfile(userId: string) {
  return queryWithCache(
    'profiles',
    (client) =>
      client.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
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
  return Promise.all(queries.map((q) => q())) as Promise<T>;
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
  const nextCursor =
    hasMore && items.length > 0
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

/**
 * Reads a cached entry from localStorage.
 * Offline: TTL is ignored — the entry is always returned if present.
 * Online:  TTL is still enforced by callers via `isCacheExpired`.
 */
export function getCachedData<T>(key: string): CachedData<T> | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed: CachedData<T> = JSON.parse(cached);
    if (isOffline()) return parsed;
    return parsed;
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
  if (isOffline()) return false;
  return Date.now() - cached.timestamp >= CACHE_DURATION;
}

export function clearCache(key?: string): void {
  if (key) {
    localStorage.removeItem(key);
  } else {
    Object.values(CACHE_KEYS).forEach((cacheKey) => {
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

export const onConnectionChange = (
  callback: (isConnected: boolean) => void
) => {
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