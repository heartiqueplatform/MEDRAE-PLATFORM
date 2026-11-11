// src/pages/challenge/cache.ts

export interface CachedUser {
    user_id: string;
    name: string;
    username: string;
    avatar_url: string;
    is_online: boolean;
    is_pinned?: boolean;
    pinned_at?: number;
    institution?: string | null;
    is_same_school?: boolean;
}

// Cache keys - persistent across sessions
export const PLAYERS_CACHE_KEY = "challenge_players_cache_v5";
export const CHALLENGES_CACHE_KEY = "challenge_history_cache_v5";
export const CACHE_VERSION = "5.2";
export const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days cache

// Read the current user's campus slug (written by SchoolWarsCard)
export const readSchoolSlug = (): string | null => {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("school_wars_current_institution_v1");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.slug ?? null;
    } catch {
        return null;
    }
};

// Memory cache for faster access
export let playersMemoryCache: CachedUser[] | null = null;
export let challengesMemoryCache: any[] | null = null;

export const loadCache = <T,>(key: string): T | null => {
    try {
        const cached = localStorage.getItem(key);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.version === CACHE_VERSION) {
                return parsed.data;
            }
        }
        return null;
    } catch (error) {
        console.error("Failed to load cache:", error);
        return null;
    }
};

export const saveCache = <T,>(key: string, data: T): void => {
    try {
        const cacheData = {
            data,
            timestamp: Date.now(),
            version: CACHE_VERSION,
        };
        localStorage.setItem(key, JSON.stringify(cacheData));

        if (key === PLAYERS_CACHE_KEY) {
            playersMemoryCache = data as any;
        } else if (key === CHALLENGES_CACHE_KEY) {
            challengesMemoryCache = data as any;
        }
    } catch (error) {
        console.error("Failed to save cache:", error);
    }
};

export const clearAllCache = () => {
    localStorage.removeItem(PLAYERS_CACHE_KEY);
    localStorage.removeItem(CHALLENGES_CACHE_KEY);
    playersMemoryCache = null;
    challengesMemoryCache = null;
};