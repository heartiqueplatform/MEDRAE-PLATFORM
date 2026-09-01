// src/hooks/useUserProfile.ts
import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";


const PROFILE_CACHE_KEY = "userProfile_v2";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MIN_FETCH_INTERVAL = 30 * 1000; // 30 seconds

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

// Helper to clear cache
const clearProfileCache = () => {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    cachedProfile = null;
    cacheTimestamp = 0;
  } catch (error) {
    console.error("Failed to clear cache:", error);
  }
};

export function useUserProfile() {
  const user = useUser();

  const [profile, setProfile] = useState<any>(() => {
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

  const [loading, setLoading] = useState(() => {
    // Only loading if no profile and no cache
    if (typeof window !== "undefined") {
      const cached = getCachedProfile();
      return !cached;
    }
    return true;
  });

  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
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
          setLoading(false);
        }
        return cached;
      }
    }

    // Rate limiting
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime < MIN_FETCH_INTERVAL && cachedProfile) {
      return cachedProfile;
    }

    // Prevent concurrent fetches
    if (fetchInProgress) return cachedProfile;
    fetchInProgress = true;
    lastFetchTime = now;

    if (isMounted.current) {
      setLoading(true);
      setError(null);
    }

    try {
      // ✅ Select only needed fields for better performance
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("user_id, name, username, avatar_url, role, institution, bio, is_online, last_seen")
        .eq("user_id", user.id)
        .maybeSingle(); // Use maybeSingle to avoid 406 errors

      if (fetchError) throw fetchError;

      if (isMounted.current) {
        setProfile(data || null);
        if (data) {
          saveProfileToCache(data);
        }
        setLoading(false);
        return data;
      }
      return null;
    } catch (err) {
      console.error("❌ Error fetching profile:", err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch profile");

        // Fallback to cached data
        const cached = getCachedProfile();
        if (cached) {
          setProfile(cached);
        }
        setLoading(false);
      }
      return null;
    } finally {
      fetchInProgress = false;
    }
  }, [user?.id, profile]);

  // Initial fetch with cache
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
          const cached = getCachedProfile();
          // Refresh if no cache or cache older than 1 hour
          if (!cached || Date.now() - cacheTimestamp > 60 * 60 * 1000) {
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
      if (e.key === PROFILE_CACHE_KEY && e.newValue && isMounted.current) {
        try {
          const { profile: cachedProfileData } = JSON.parse(e.newValue);
          if (cachedProfileData && cachedProfileData.user_id === user.id) {
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

  // Manual refresh with cache busting
  const refreshProfile = useCallback(async () => {
    clearProfileCache();
    return await fetchProfile(true);
  }, [fetchProfile]);

  // Update profile locally (optimistic update)
  const updateProfile = useCallback((updates: Partial<any>) => {
    if (!profile) return;

    const updatedProfile = { ...profile, ...updates };
    setProfile(updatedProfile);
    saveProfileToCache(updatedProfile);

    // Optionally sync to server in background
    supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user?.id)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to sync profile update:", error);
          // Revert on error?
          fetchProfile(true);
        }
      });
  }, [profile, user?.id, fetchProfile]);

  // ✅ Returns same structure as before (backward compatible)
  return {
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile
  };
}

// ✅ Optional: Lightweight hook for specific profile fields
export function useProfileField<T = any>(fieldName: string): T | null {
  const { profile } = useUserProfile();
  return profile?.[fieldName] ?? null;
}

// ✅ Optional: Hook for just profile name
export function useProfileName() {
  const { profile, loading } = useUserProfile();
  return { name: profile?.name || null, loading };
}

// ✅ Optional: Hook for just profile avatar
export function useProfileAvatar() {
  const { profile, loading } = useUserProfile();
  return { avatar: profile?.avatar_url || null, loading };
}