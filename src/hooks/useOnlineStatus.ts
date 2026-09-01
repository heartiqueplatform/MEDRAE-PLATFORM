// hooks/useOnlineStatus.ts
import { useState, useEffect, useRef, useCallback } from "react";

const STATUS_CACHE_KEY = "online_status_cache";
const CACHE_DURATION = 30 * 1000; // 30 seconds
const HEALTH_ENDPOINTS = [
  "https://www.google.com/favicon.ico",
  "https://www.cloudflare.com/favicon.ico",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/module/index.js",
];

// Memory cache
let cachedStatus: boolean | null = null;
let cacheTimestamp = 0;
let checkInProgress = false;
let consecutiveFailures = 0;
let currentBackoff = 10000; // Start with 10 seconds

// Helper to get cached status
const getCachedStatus = (): boolean | null => {
  try {
    const cached = localStorage.getItem(STATUS_CACHE_KEY);
    if (cached) {
      const { status, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return status;
      }
    }
    return null;
  } catch {
    return null;
  }
};

// Helper to save status to cache
const saveStatusToCache = (status: boolean) => {
  try {
    localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify({
      status,
      timestamp: Date.now()
    }));
    cachedStatus = status;
    cacheTimestamp = Date.now();
  } catch (error) {
    console.error("Failed to cache status:", error);
  }
};

// Check internet with multiple endpoints
const checkInternetConnection = async (): Promise<boolean> => {
  if (checkInProgress) return cachedStatus ?? true;

  checkInProgress = true;

  try {
    // Try multiple endpoints in parallel
    const results = await Promise.race([
      Promise.all(HEALTH_ENDPOINTS.map(async (endpoint) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
          await fetch(`${endpoint}?t=${Date.now()}`, {
            method: "HEAD",
            mode: "no-cors",
            signal: controller.signal,
            cache: "no-store",
          });
          clearTimeout(timeoutId);
          return true;
        } catch {
          clearTimeout(timeoutId);
          return false;
        }
      })),
      new Promise<boolean[]>((resolve) => {
        setTimeout(() => resolve([false, false, false]), 3500);
      })
    ]);

    const isConnected = results.some(result => result === true);

    if (isConnected) {
      // Success - reset everything
      consecutiveFailures = 0;
      currentBackoff = 10000;
      saveStatusToCache(true);
      return true;
    } else {
      consecutiveFailures++;

      // Implement exponential backoff
      if (consecutiveFailures >= 3) {
        currentBackoff = Math.min(currentBackoff * 1.5, 60000);
      }

      if (consecutiveFailures >= 2) {
        saveStatusToCache(false);
        return false;
      }

      return cachedStatus ?? true;
    }
  } catch (err) {
    consecutiveFailures++;
    if (consecutiveFailures >= 3) {
      saveStatusToCache(false);
      return false;
    }
    return cachedStatus ?? true;
  } finally {
    checkInProgress = false;
  }
};

export function useOnlineStatus() {
  // Initialize from cache or browser
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;

    // Check for service worker offline flag
    if ("__APP_OFFLINE__" in window && (window as any).__APP_OFFLINE__) {
      return false;
    }

    // Check localStorage cache
    const cached = getCachedStatus();
    if (cached !== null) {
      return cached;
    }

    // Fallback to navigator.onLine
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });

  const failureCount = useRef(0);
  const THRESHOLD = 3;
  const intervalRef = useRef<NodeJS.Timeout>();
  const isMounted = useRef(true);
  const backoffRef = useRef(10000);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const checkStatus = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;

    // Use cache unless forced
    if (!forceRefresh) {
      const cached = getCachedStatus();
      if (cached !== null && Date.now() - cacheTimestamp < CACHE_DURATION) {
        if (cached !== isOnline) {
          setIsOnline(cached);
        }
        return;
      }
    }

    const result = await checkInternetConnection();

    if (isMounted.current && result !== isOnline) {
      setIsOnline(result);
    }
  }, [isOnline]);

  // Custom check with threshold logic (maintaining original behavior)
  const checkWithThreshold = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      await fetch("https://www.google.com/favicon.ico?t=" + Date.now(), {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      // Success
      failureCount.current = 0;
      if (isMounted.current) {
        setIsOnline(true);
        saveStatusToCache(true);
      }

      // Reset backoff on success
      backoffRef.current = 10000;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(checkWithThreshold, 10000);
      }
    } catch (err) {
      // Failure
      failureCount.current += 1;

      if (failureCount.current >= THRESHOLD) {
        if (isMounted.current) {
          setIsOnline(false);
          saveStatusToCache(false);
        }

        // Implement progressive backoff
        if (backoffRef.current < 60000) {
          backoffRef.current = Math.min(backoffRef.current * 1.5, 60000);
        }

        // Adjust interval based on backoff
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(checkWithThreshold, backoffRef.current);
        }
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      failureCount.current = 0;
      backoffRef.current = 10000;
      setIsOnline(true);
      saveStatusToCache(true);
    };

    const handleOffline = () => {
      if (isMounted.current) {
        setIsOnline(false);
        saveStatusToCache(false);
      }
    };

    // 1. Trust the browser events (Zero data usage!)
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 2. Initial check
    checkInternetConnection();

    // 3. The "Relaxed" Interval
    // Change from 10 seconds (10000) to 5 minutes (300000)
    // There is NO reason to check every 10 seconds in the background!
    intervalRef.current = setInterval(checkInternetConnection, 300000);

    // 4. Cross-tab synchronization (Keep this, it's smart!)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STATUS_CACHE_KEY && e.newValue && isMounted.current) {
        try {
          const { status } = JSON.parse(e.newValue);
          if (typeof status === 'boolean' && status !== isOnline) {
            setIsOnline(status);
          }
        } catch (err) { }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener('storage', handleStorageChange);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOnline]); // Removed checkWithThreshold from dependencies to stop re-trigger loops

  // ✅ Returns just the boolean (backward compatible)
  return isOnline;
}

// ✅ Optional: Hook with more features (won't break existing code)
export function useOnlineStatusWithDetails() {
  const isOnline = useOnlineStatus();
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [connectionType, setConnectionType] = useState<string>("unknown");

  useEffect(() => {
    setLastChecked(new Date());

    if (typeof navigator !== "undefined" && "connection" in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection?.effectiveType || "unknown");
    }
  }, [isOnline]);

  return {
    isOnline,
    lastChecked,
    connectionType,
    isOffline: !isOnline,
  };
}

// ✅ Optional: Hook with manual retry
export function useOnlineStatusWithRetry() {
  const isOnline = useOnlineStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  const retry = useCallback(async () => {
    setIsRetrying(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch("https://www.google.com/favicon.ico?t=" + Date.now(), {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    } finally {
      setIsRetrying(false);
    }
  }, []);

  return { isOnline, retry, isRetrying };
}