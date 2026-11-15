// src/lib/mistakes/mistakesCache.ts
const PREFIX = "mistakes_v3_";

export const CACHE_KEYS = {
    open: `${PREFIX}open`,
    resolved: `${PREFIX}resolved`,
    institution: `${PREFIX}institution`,
    counts: `${PREFIX}counts`,
    versionOpen: `${PREFIX}ver_open`,
    versionResolved: `${PREFIX}ver_res`,
    lastFetch: `${PREFIX}last_fetch`,
} as const;

export const CACHE_TTL = 1000 * 60 * 60 * 12; // 12h
export const MIN_FETCH_INTERVAL = 60_000;

export interface Envelope<T> {
    data: T;
    ts: number;
    institution?: string | null;
}

export function readEnvelope<T>(key: string): Envelope<T> | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as Envelope<T>;
    } catch {
        return null;
    }
}

export function writeEnvelope<T>(key: string, data: T, institution?: string | null) {
    try {
        localStorage.setItem(key, JSON.stringify({ data, ts: Date.now(), institution }));
    } catch { }
}

export function isFresh<T>(env: Envelope<T> | null, ttl = CACHE_TTL): boolean {
    return !!env && Date.now() - env.ts < ttl;
}

export function clearMistakesCache() {
    try {
        Object.values(CACHE_KEYS).forEach((k) => localStorage.removeItem(k));
    } catch { }
}

// institution cache — same contract as schoolWarsCache
export function readCachedInstitution(): string | null {
    const env = readEnvelope<string>(CACHE_KEYS.institution);
    return env?.data ?? null;
}
export function writeCachedInstitution(slug: string | null) {
    if (!slug) {
        try { localStorage.removeItem(CACHE_KEYS.institution); } catch { }
        return;
    }
    writeEnvelope(CACHE_KEYS.institution, slug);
}