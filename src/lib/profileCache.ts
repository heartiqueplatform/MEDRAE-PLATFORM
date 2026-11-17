// lib/profileCache.ts
// ✅ SINGLE SOURCE OF TRUTH for the signed-in user's profile.
// Every entry is namespaced by auth user id, so switching accounts on a
// shared phone can NEVER serve the previous account's avatar/name/role.

export const PROFILE_CACHE_KEY = "userProfile";
export const CACHE_VERSION = "v2";

export interface ProfileCache {
    name?: string | null;
    role?: string | null;
    avatar_url?: string | null;
    _timestamp?: number;
    _version?: string;
}

const keyFor = (userId: string) => `${PROFILE_CACHE_KEY}_${userId}`;

/**
 * Read the profile cache for a specific user.
 * Returns null if userId is missing or no cache exists.
 * NOTE: no TTL here. Age gates refetch, never render.
 */
export const getProfileCache = (userId?: string | null): ProfileCache | null => {
    if (!userId) return null;
    try {
        const raw = localStorage.getItem(keyFor(userId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ProfileCache;
        if (parsed._version !== CACHE_VERSION) {
            // Schema changed — treat as miss so it gets rewritten.
            localStorage.removeItem(keyFor(userId));
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

/**
 * Write the profile cache for a specific user.
 * Never clobbers a real avatar with null/empty.
 */
export const setProfileCache = (userId: string, data: Partial<ProfileCache>) => {
    if (!userId) return;
    try {
        const existing = (() => {
            try {
                const raw = localStorage.getItem(keyFor(userId));
                return raw ? (JSON.parse(raw) as ProfileCache) : null;
            } catch {
                return null;
            }
        })();

        const merged: ProfileCache = {
            name: data.name ?? existing?.name ?? null,
            role: data.role ?? existing?.role ?? null,
            // Preserve a good avatar if the incoming value is null/empty.
            avatar_url:
                (data.avatar_url && data.avatar_url.trim() !== ""
                    ? data.avatar_url
                    : existing?.avatar_url) ?? null,
            _timestamp: Date.now(),
            _version: CACHE_VERSION,
        };

        localStorage.setItem(keyFor(userId), JSON.stringify(merged));
    } catch {
        /* silent */
    }
};

/** Remove this user's cache (call on sign-out). */
export const clearProfileCache = (userId?: string | null) => {
    if (!userId) return;
    try {
        localStorage.removeItem(keyFor(userId));
    } catch {
        /* silent */
    }
};

/**
 * Remove every profile cache that does NOT belong to `keepUserId`.
 * Call this once whenever authUser?.id becomes known — it wipes any
 * foreign-account blob that a previous session left behind on the device.
 */
export const purgeForeignProfileCaches = (keepUserId: string) => {
    if (!keepUserId) return;
    try {
        const prefix = `${PROFILE_CACHE_KEY}_`;
        const keepKey = keyFor(keepUserId);
        Object.keys(localStorage).forEach((k) => {
            if (k.startsWith(prefix) && k !== keepKey) {
                localStorage.removeItem(k);
            }
        });
        // Legacy unscoped key from the old version — always drop it.
        localStorage.removeItem(PROFILE_CACHE_KEY);
    } catch {
        /* silent */
    }
};