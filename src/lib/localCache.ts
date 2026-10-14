const PREFIX = "medrae:v1:";

export function cacheGet<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(PREFIX + key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
}

export function cacheSet<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
        /* quota / private mode — ignore */
    }
}

export function cacheDelete(key: string): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(PREFIX + key);
    } catch { /* ignore */ }
}

/** Cached value + a timestamp so we can decide whether to trust it. */
export interface CachedValue<T> {
    v: T;
    t: number; // epoch ms
}

export function cacheGetStamped<T>(key: string): CachedValue<T> | null {
    return cacheGet<CachedValue<T>>(key);
}

export function cacheSetStamped<T>(key: string, v: T): void {
    cacheSet(key, { v, t: Date.now() });
}

/** Consider cache fresh for N ms (default 5 min). */
export function isFresh(
    stamped: CachedValue<unknown> | null,
    ttlMs = 5 * 60_000
): boolean {
    if (!stamped) return false;
    return Date.now() - stamped.t < ttlMs;
}