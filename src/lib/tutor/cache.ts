// lib/tutor/cache.ts

/**
 * Per-entity TTL cache + request dedupe.
 *
 * Rules (from design system):
 *  - Cache per ENTITY (e.g. student:{id}), never per query page.
 *  - Short TTL (default 5 min). User's own data only.
 *  - In-memory Map is the source of truth. localStorage is a small, optional
 *    mirror for user-owned scalars (profile, roles) — NEVER for lists of
 *    other users (100k rows would blow quota).
 */

type Entry<T> = { data: T; expires: number };

const mem = new Map<string, Entry<any>>();
const inflight = new Map<string, Promise<any>>();

const DEFAULT_TTL = 5 * 60 * 1000;

/** Read a non-expired entry, or null. */
export function cacheGet<T>(key: string): T | null {
    const hit = mem.get(key);
    if (!hit) return null;
    if (hit.expires < Date.now()) {
        mem.delete(key);
        return null;
    }
    return hit.data as T;
}

/** Write an entry with TTL (ms). */
export function cacheSet<T>(key: string, data: T, ttlMs = DEFAULT_TTL): void {
    mem.set(key, { data, expires: Date.now() + ttlMs });
}

/** Delete one or many keys, or all keys with a prefix. */
export function cacheInvalidate(prefix: string): void {
    for (const k of mem.keys()) {
        if (k.startsWith(prefix)) mem.delete(k);
    }
}

/**
 * Dedupe + TTL. If a request for `key` is already in flight, reuse it.
 * If a fresh cache entry exists, return it. Otherwise call `fetcher`.
 */
export async function fetchWithDedupe<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs = DEFAULT_TTL
): Promise<T> {
    const cached = cacheGet<T>(key);
    if (cached !== null && cached !== undefined) return cached;

    const existing = inflight.get(key);
    if (existing) return existing as Promise<T>;

    const p = (async () => {
        try {
            const data = await fetcher();
            cacheSet(key, data, ttlMs);
            return data;
        } finally {
            inflight.delete(key);
        }
    })();

    inflight.set(key, p);
    return p;
}

/**
 * localStorage mirror for SMALL user-owned objects only (profile, roles).
 * Guarded by try/catch and a size cap so we never blow the quota.
 */
const LS_MAX_BYTES = 64 * 1024; // 64 KB — plenty for a profile/roles blob

export function lsGet<T>(key: string, ttlMs = DEFAULT_TTL): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { data, timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp > ttlMs) {
            localStorage.removeItem(key);
            return null;
        }
        return data as T;
    } catch {
        return null;
    }
}

export function lsSet<T>(key: string, data: T): void {
    try {
        const payload = JSON.stringify({ data, timestamp: Date.now() });
        if (payload.length > LS_MAX_BYTES) return; // silently skip oversized
        localStorage.setItem(key, payload);
    } catch {
        // quota or private mode — ignore
    }
}