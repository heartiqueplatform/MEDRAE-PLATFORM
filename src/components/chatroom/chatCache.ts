// src/components/chatroom/chatCache.ts
// ─────────────────────────────────────────────────────────────
// Two-layer cache for the chat feature.
//
//   L1 (memory)      → Map, ~0.1ms reads, dies on reload
//   L2 (localStorage)→ JSON, ~1-5ms reads, survives reload + offline
//   L3 (Supabase)    → network, only hit on cache miss or explicit refresh
//
// Design goals:
//   • Never more than 1 in-flight request per key (dedupe)
//   • Stale-while-revalidate: return cache, refresh in background
//   • Hard cap on memory (LRU eviction above MAX_ENTRIES)
//   • TTL per entry (configurable per call)
//   • Offline: serve cache regardless of TTL (never blank)
// ─────────────────────────────────────────────────────────────
type CacheEntry<T> = {
    data: T;
    ts: number;      // when cached
    ttl: number;     // ms
};

const MAX_ENTRIES = 200; // hard cap on memory map size

const memory = new Map<string, CacheEntry<any>>();
const pending = new Map<string, Promise<any>>();

// ── CACHE VERSIONING ────────────────────────────────────────
// Bump this number whenever you change the SHAPE of cached data
// (e.g. adding image_url to Unit). Old cache entries become
// invisible automatically — users never have to clear anything.
// ────────────────────────────────────────────────────────────
const CACHE_VERSION = "v2";

const LS_PREFIX = `chatcache_${CACHE_VERSION}_`;
const LS_TS_PREFIX = `chatcache_${CACHE_VERSION}_ts_`;
const isOffline = (): boolean =>
    typeof navigator !== "undefined" && navigator.onLine === false;

// ── LRU-ish eviction: when over cap, drop the oldest ─────────
const evictIfNeeded = () => {
    if (memory.size <= MAX_ENTRIES) return;
    // delete oldest by ts
    const entries = Array.from(memory.entries()).sort(
        (a, b) => a[1].ts - b[1].ts
    );
    const toDrop = entries.length - MAX_ENTRIES;
    for (let i = 0; i < toDrop; i++) {
        memory.delete(entries[i][0]);
    }
};

// ── Public API ───────────────────────────────────────────────

/**
 * Read from memory first, then localStorage.
 * Returns null if absent or expired (unless offline — then returns stale).
 */
export function getCached<T>(key: string): T | null {
    // L1 memory
    const mem = memory.get(key);
    if (mem) {
        const fresh = Date.now() - mem.ts < mem.ttl;
        if (fresh || isOffline()) return mem.data as T;
        // expired — drop and fall through to L2
        memory.delete(key);
    }

    // L2 localStorage
    try {
        const raw = localStorage.getItem(LS_PREFIX + key);
        if (!raw) return null;
        const tsRaw = localStorage.getItem(LS_TS_PREFIX + key);
        const ts = tsRaw ? parseInt(tsRaw) : 0;
        const data = JSON.parse(raw) as T;

        // we don't know the TTL of a localStorage entry without metadata,
        // so use a default of 5 min. Callers can override by re-caching.
        const ttl = 5 * 60 * 1000;
        const fresh = Date.now() - ts < ttl;
        if (fresh || isOffline()) {
            // rehydrate L1
            memory.set(key, { data, ts, ttl });
            return data;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Write to both layers.
 */
export function setCached<T>(key: string, data: T, ttl = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = { data, ts: Date.now(), ttl };

    // L1
    memory.set(key, entry);
    evictIfNeeded();

    // L2
    try {
        localStorage.setItem(LS_PREFIX + key, JSON.stringify(data));
        localStorage.setItem(LS_TS_PREFIX + key, String(entry.ts));
    } catch {
        // quota exceeded — ignore, memory still works
    }
}

/**
 * Delete from both layers.
 */
export function invalidateCached(key: string): void {
    memory.delete(key);
    try {
        localStorage.removeItem(LS_PREFIX + key);
        localStorage.removeItem(LS_TS_PREFIX + key);
    } catch { }
}

/**
 * Clear EVERYTHING (all chat cache).
 */
export function clearAllChatCache(): void {
    memory.clear();
    try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith(LS_PREFIX) || k.startsWith(LS_TS_PREFIX))) {
                toRemove.push(k);
            }
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
    } catch { }
}

/**
 * Fetch-with-cache. This is the workhorse.
 *
 * - Cache hit → returns instantly.
 * - Cache miss → fetches, caches, returns.
 * - `revalidate: true` + cache exists → returns cache, fetches in background.
 * - In-flight dedupe → same key won't fire 2 requests.
 *
 * @example
 *   const units = await fetchCached(
 *     "units",
 *     () => supabase.from("quizzes").select("*"),
 *     { ttl: 60_000, revalidate: true }
 *   );
 */
export async function fetchCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    opts?: { ttl?: number; revalidate?: boolean }
): Promise<T> {
    const ttl = opts?.ttl ?? 5 * 60 * 1000;
    const cached = getCached<T>(key);

    // Offline + cache → return cache, skip network entirely
    if (cached !== null && isOffline()) return cached;

    // Cache hit
    if (cached !== null) {
        // Stale-while-revalidate: return cache now, refresh in background
        if (opts?.revalidate && !pending.has(key)) {
            const p = fetcher()
                .then((data) => {
                    setCached(key, data, ttl);
                    return data;
                })
                .catch(() => cached) // silent failure, keep cache
                .finally(() => {
                    pending.delete(key);
                });
            pending.set(key, p);
        }
        return cached;
    }

    // Cache miss — dedupe
    if (pending.has(key)) return pending.get(key)!;

    const p = fetcher()
        .then((data) => {
            setCached(key, data, ttl);
            return data;
        })
        .finally(() => {
            pending.delete(key);
        });

    pending.set(key, p);
    return p;
}

/**
 * In-flight request count — handy for debugging / network tab awareness.
 */
export function getCacheStats() {
    return {
        memorySize: memory.size,
        pendingSize: pending.size,
        maxEntries: MAX_ENTRIES,
    };
}
/**
 * Purge any cache entries from OLD versions.
 * Called once on app boot — safe to call repeatedly.
 * Removes `chatcache_units`, `chatcache_v1_units`, etc.,
 * but leaves current version's keys intact.
 */
export function purgeOldCacheVersions(): void {
    try {
        const currentPrefix = `chatcache_${CACHE_VERSION}_`;
        const allPrefix = "chatcache_";
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            if (!k.startsWith(allPrefix)) continue;
            if (k.startsWith(currentPrefix)) continue; // keep current
            toRemove.push(k);
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
        if (toRemove.length > 0) {
            console.info(`[chat-cache] purged ${toRemove.length} old cache keys`);
        }
    } catch {
        // Ignore — cache purge must never break the app
    }
}