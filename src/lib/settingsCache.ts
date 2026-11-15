// src/lib/settingsCache.ts
/**
 * Lightweight localStorage cache for the Settings → "Your profiles" panel.
 * Cache-first reads = instant paint on slow networks.
 */

type CacheEntry<T> = {
    data: T;
    expiresAt: number;
};

const PREFIX = "medrae.settings.v1.";

/* ────────────────────────────────────────────────────────────── */
/*  Generic helpers                                                */
/* ────────────────────────────────────────────────────────────── */

export function readCache<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        if (!raw) return null;
        const entry: CacheEntry<T> = JSON.parse(raw);
        if (!entry || !("expiresAt" in entry)) return null;
        if (Date.now() > entry.expiresAt) {
            localStorage.removeItem(PREFIX + key);
            return null;
        }
        return entry.data;
    } catch {
        return null;
    }
}

export function writeCache<T>(key: string, data: T, ttlMs: number): void {
    try {
        const entry: CacheEntry<T> = {
            data,
            expiresAt: Date.now() + ttlMs,
        };
        localStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
        // localStorage full or disabled — non-fatal
    }
}

export function clearCache(key?: string): void {
    try {
        if (key) {
            localStorage.removeItem(PREFIX + key);
            return;
        }
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(PREFIX)) toRemove.push(k);
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
        // ignore
    }
}

/* ────────────────────────────────────────────────────────────── */
/*  Typed cache keys                                               */
/* ────────────────────────────────────────────────────────────── */

export type CachedUser = { id: string; email: string };
export type CachedProfile = { email: string; role: string };
export type CachedRole = { role: string; userId: string };

const TTL_5_MIN = 5 * 60 * 1000;

export const cachedUser = {
    get: () => readCache<CachedUser>("user"),
    set: (u: CachedUser) => writeCache("user", u, TTL_5_MIN),
    clear: () => clearCache("user"),
};

export const cachedProfile = {
    get: () => readCache<CachedProfile>("profile"),
    set: (p: CachedProfile) => writeCache("profile", p, TTL_5_MIN),
    clear: () => clearCache("profile"),
};

export const cachedRoles = {
    get: () => readCache<CachedRole[]>("roles"),
    set: (r: CachedRole[]) => writeCache("roles", r, TTL_5_MIN),
    clear: () => clearCache("roles"),
};

/** Wipe every cached value — call on signOut or role change. */
export function clearSettingsCache(): void {
    clearCache();
}