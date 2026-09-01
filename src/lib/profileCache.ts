// lib/profileCache.ts
export const PROFILE_CACHE_KEY = 'userProfile';
export const CACHE_VERSION = 'v2';

export const getProfileCache = () => {
    try {
        const cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            // Check if cache is stale (older than 5 minutes)
            if (parsed._timestamp && Date.now() - parsed._timestamp < 5 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (e) { /* silent */ }
    return null;
};

export const setProfileCache = (data: any) => {
    try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
            ...data,
            _timestamp: Date.now(),
            _version: CACHE_VERSION
        }));
    } catch (e) { /* silent */ }
};

export const clearProfileCache = () => {
    try {
        localStorage.removeItem(PROFILE_CACHE_KEY);
    } catch (e) { /* silent */ }
};