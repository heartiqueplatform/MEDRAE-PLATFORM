// src/lib/school-wars/schoolWarsCache.ts

import { institutions } from "@/components/forms/institutions.data";

export const CACHE_KEY = "school_wars_leaderboard_v8";
export const CURRENT_INSTITUTION_KEY = "school_wars_current_institution_v1";
export const CACHE_TTL_MS = 15 * 60 * 1000;
export const HARD_STALE_MS = 6 * 60 * 60 * 1000;

export type LeaderboardRow = {
    rank: number;
    institution: string;
    institution_label: string;
    member_count: number;
    total_attempts: number;
    school_score: number;
    top_score: number;
    last_activity: string | null;
    has_activity: boolean;
};

export type CacheEnvelope = {
    data: LeaderboardRow[];
    ts: number;
    dbRefreshedAt: number | null;
};

export function readCache(): CacheEnvelope | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CacheEnvelope;
        if (!Array.isArray(parsed?.data)) return null;
        if (Date.now() - parsed.ts > HARD_STALE_MS) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function writeCache(data: LeaderboardRow[], dbRefreshedAt: number | null) {
    try {
        const envelope: CacheEnvelope = { data, ts: Date.now(), dbRefreshedAt };
        localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
    } catch { }
}

export function isFresh(env: CacheEnvelope | null): boolean {
    if (!env) return false;
    return Date.now() - env.ts < CACHE_TTL_MS;
}

export function readCachedInstitution(): string | null {
    try {
        const raw = localStorage.getItem(CURRENT_INSTITUTION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { slug?: string; ts?: number };
        if (!parsed?.slug) return null;
        if (parsed.ts && Date.now() - parsed.ts > 30 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(CURRENT_INSTITUTION_KEY);
            return null;
        }
        return parsed.slug;
    } catch {
        return null;
    }
}

export function writeCachedInstitution(slug: string | null) {
    try {
        if (!slug || slug === "other") {
            localStorage.removeItem(CURRENT_INSTITUTION_KEY);
            return;
        }
        localStorage.setItem(
            CURRENT_INSTITUTION_KEY,
            JSON.stringify({ slug, ts: Date.now() })
        );
    } catch { }
}

export function prettyLabel(slug: string, fallback: string): string {
    const found = institutions.find((i) => i.value === slug);
    return found?.label ?? fallback;
}