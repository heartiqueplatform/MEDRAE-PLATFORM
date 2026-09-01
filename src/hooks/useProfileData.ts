// hooks/useProfileData.ts
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@supabase/auth-helpers-react";


const PROFILE_CACHE_KEY = "user_profile_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MIN_FETCH_INTERVAL = 30000; // 30 seconds

// Memory cache
let cachedProfile: any = null;
let cacheTimestamp = 0;
let fetchInProgress = false;
let lastFetchTime = 0;

// Helper to get cached profile
const getCachedProfile = (): any | null => {
    try {
        const cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
            const { profile, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                return profile;
            }
        }
        return null;
    } catch {
        return null;
    }
};

// Helper to save profile to cache
const saveProfileToCache = (profile: any) => {
    try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
            profile,
            timestamp: Date.now()
        }));
        cachedProfile = profile;
        cacheTimestamp = Date.now();
    } catch (error) {
        console.error("Failed to cache profile:", error);
    }
};

export function useProfileData() {
    const session = useSession();
    const user = session?.user;

    const [profile, setProfile] = useState<any>(() => {
        // Initialize from cache immediately
        if (typeof window !== "undefined") {
            const cached = getCachedProfile();
            if (cached) {
                cachedProfile = cached;
                cacheTimestamp = Date.now();
                return cached;
            }
        }
        return null;
    });

    const isMounted = useRef(true);


    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const fetchProfile = useCallback(async (forceRefresh = false) => {
        if (!user?.id) return null;

        // Return cached value if available and not forcing refresh
        if (!forceRefresh) {
            const cached = getCachedProfile();
            if (cached) {
                if (isMounted.current && cached !== profile) {
                    setProfile(cached);
                }
                return cached;
            }
        }

        // Rate limiting
        const now = Date.now();
        if (!forceRefresh && now - lastFetchTime < MIN_FETCH_INTERVAL) {
            return profile;
        }

        // Prevent concurrent fetches
        if (fetchInProgress) return profile;
        fetchInProgress = true;
        lastFetchTime = now;

        try {
            // ✅ Select only needed fields for better performance
            const { data, error } = await supabase
                .from("profiles")
                .select("user_id, name, username, avatar_url, role, institution, bio, is_online, last_seen")
                .eq("user_id", user.id)
                .maybeSingle();

            if (error) throw error;

            if (isMounted.current) {
                setProfile(data || null);
                if (data) {
                    saveProfileToCache(data);
                }
            }

            return data;
        } catch (err) {
            console.error("Error fetching profile:", err);
            return profile;
        } finally {
            fetchInProgress = false;
        }
    }, [user?.id, profile]);

    // Initial fetch
    useEffect(() => {
        if (!user?.id) return;

        // Small delay to prevent blocking initial render
        const timer = setTimeout(() => {
            fetchProfile();
        }, 100);

        return () => clearTimeout(timer);
    }, [user?.id, fetchProfile]);


    // Smart refresh when tab becomes visible
    useEffect(() => {
        if (!user?.id) return;

        let visibilityTimeout: NodeJS.Timeout;
        const handleVisibilityChange = () => {
            if (!document.hidden && isMounted.current) {
                if (visibilityTimeout) clearTimeout(visibilityTimeout);
                visibilityTimeout = setTimeout(() => {
                    // Check if cache is stale (> 5 minutes since last check)
                    const cached = getCachedProfile();
                    if (!cached) {
                        fetchProfile(true);
                    }
                }, 500);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (visibilityTimeout) clearTimeout(visibilityTimeout);
        };
    }, [user?.id, fetchProfile]);

    // Listen for profile updates from other tabs
    useEffect(() => {
        if (!user?.id) return;

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === PROFILE_CACHE_KEY && e.newValue) {
                try {
                    const { profile: cachedProfileData } = JSON.parse(e.newValue);
                    if (cachedProfileData && isMounted.current) {
                        setProfile(cachedProfileData);
                        cachedProfile = cachedProfileData;
                        cacheTimestamp = Date.now();
                    }
                } catch (err) {
                    console.error("Failed to parse storage event:", err);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [user?.id]);

    // ✅ Returns just the profile object (backward compatible)
    return profile;
}

// ✅ Optional: Export a hook with more features (won't break existing code)
export function useProfileDataWithRefresh() {
    const session = useSession();
    const user = session?.user;

    const [profile, setProfile] = useState<any>(() => {
        if (typeof window !== "undefined") {
            const cached = getCachedProfile();
            if (cached) return cached;
        }
        return null;
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const refresh = useCallback(async () => {
        if (!user?.id || !isMounted.current) return null;

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from("profiles")
                .select("user_id, name, username, avatar_url, role, institution, bio, is_online, last_seen")
                .eq("user_id", user.id)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (isMounted.current) {
                setProfile(data || null);
                if (data) saveProfileToCache(data);
            }
            return data;
        } catch (err) {
            console.error("Error refreshing profile:", err);
            if (isMounted.current) setError(err as Error);
            return null;
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [user?.id]);

    // Initial load with cache
    useEffect(() => {
        if (!user?.id) return;

        const cached = getCachedProfile();
        if (cached) {
            setProfile(cached);
        }

        refresh();
    }, [user?.id, refresh]);

    return { profile, isLoading, error, refresh };
}

// ✅ Optional: Lightweight hooks for specific fields
export function useProfileName() {
    const profile = useProfileData();
    return profile?.name || null;
}

export function useProfileAvatar() {
    const profile = useProfileData();
    return profile?.avatar_url || null;
}

export function useProfileRole() {
    const profile = useProfileData();
    return profile?.role || null;
}