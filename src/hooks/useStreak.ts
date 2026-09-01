// hooks/useStreak.ts
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

const STREAK_CACHE_KEY = "user_streak_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Memory cache
let cachedStreak: number | null = null;
let cacheTimestamp = 0;
let fetchInProgress = false;
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 30000; // 30 seconds

// Helper to get cached streak
const getCachedStreak = (): number | null => {
    try {
        const cached = localStorage.getItem(STREAK_CACHE_KEY);
        if (cached) {
            const { streak, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                return streak;
            }
        }
        return null;
    } catch {
        return null;
    }
};

// Helper to save streak to cache
const saveStreakToCache = (streak: number) => {
    try {
        localStorage.setItem(STREAK_CACHE_KEY, JSON.stringify({
            streak,
            timestamp: Date.now()
        }));
        cachedStreak = streak;
        cacheTimestamp = Date.now();
    } catch (error) {
        console.error("Failed to cache streak:", error);
    }
};

export function useStreak() {
    const user = useUser();
    const [streak, setStreak] = useState<number>(() => {
        // Initialize from cache immediately
        if (typeof window !== "undefined") {
            const cached = getCachedStreak();
            if (cached !== null) {
                cachedStreak = cached;
                cacheTimestamp = Date.now();
                return cached;
            }
        }
        return 0;
    });

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const fetchStreak = useCallback(async (forceRefresh = false) => {
        if (!user?.id) return 0;

        // Return cached value if available and not forcing refresh
        if (!forceRefresh) {
            const cached = getCachedStreak();
            if (cached !== null) {
                if (isMounted.current && cached !== streak) {
                    setStreak(cached);
                }
                return cached;
            }
        }

        // Rate limiting
        const now = Date.now();
        if (!forceRefresh && now - lastFetchTime < MIN_FETCH_INTERVAL) {
            return streak;
        }

        // Prevent concurrent fetches
        if (fetchInProgress) return streak;
        fetchInProgress = true;
        lastFetchTime = now;

        try {
            const { data, error } = await supabase
                .from("login_activity")
                .select("streak")
                .eq("user_id", user.id)
                .order("login_date", { ascending: false })
                .limit(1)
                .maybeSingle(); // Changed from .single() to maybeSingle() to avoid errors

            if (error) throw error;

            const newStreak = data?.streak || 0;

            if (isMounted.current) {
                setStreak(newStreak);
                saveStreakToCache(newStreak);
            }

            return newStreak;
        } catch (err) {
            console.error("Error fetching streak:", err);
            return streak;
        } finally {
            fetchInProgress = false;
        }
    }, [user?.id, streak]);

    // Initial fetch
    useEffect(() => {
        if (!user?.id) return;

        // Small delay to prevent blocking initial render
        const timer = setTimeout(() => {
            fetchStreak();
        }, 100);

        return () => clearTimeout(timer);
    }, [user?.id, fetchStreak]);

    // Real-time subscription for streak updates

    // Smart refresh when tab becomes visible
    useEffect(() => {
        if (!user?.id) return;

        let visibilityTimeout: NodeJS.Timeout;
        const handleVisibilityChange = () => {
            if (!document.hidden && isMounted.current) {
                if (visibilityTimeout) clearTimeout(visibilityTimeout);
                visibilityTimeout = setTimeout(() => {
                    // Check if cache is stale (> 5 minutes)
                    const cached = getCachedStreak();
                    if (cached === null) {
                        fetchStreak(true);
                    }
                }, 500);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (visibilityTimeout) clearTimeout(visibilityTimeout);
        };
    }, [user?.id, fetchStreak]);

    // ✅ Returns just the number (backward compatible)
    return streak;
}

// ✅ Optional: Export a hook with more features (won't break existing code)
export function useStreakWithRefresh() {
    const user = useUser();
    const [streak, setStreak] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const refresh = useCallback(async () => {
        if (!user?.id || !isMounted.current) return 0;

        setIsLoading(true);
        try {
            const { data } = await supabase
                .from("login_activity")
                .select("streak")
                .eq("user_id", user.id)
                .order("login_date", { ascending: false })
                .limit(1)
                .maybeSingle();

            const newStreak = data?.streak || 0;
            if (isMounted.current) {
                setStreak(newStreak);
                saveStreakToCache(newStreak);
            }
            return newStreak;
        } catch (err) {
            console.error("Error refreshing streak:", err);
            return streak;
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [user?.id, streak]);

    // Initial load with cache
    useEffect(() => {
        if (!user?.id) return;

        const cached = getCachedStreak();
        if (cached !== null) {
            setStreak(cached);
        }

        refresh();
    }, [user?.id, refresh]);

    return { streak, isLoading, refresh };
}