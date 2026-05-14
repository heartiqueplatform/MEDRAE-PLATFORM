import { useState, useEffect, useRef } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined" && "__APP_OFFLINE__" in window) {
      return !(window as any).__APP_OFFLINE__;
    }
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });

  // Track consecutive failures using a Ref to avoid re-renders
  const failureCount = useRef(0);
  const THRESHOLD = 3; // Number of failed attempts before showing "Offline"

  const checkInternetConnection = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Shorter timeout for snappier checks

      // Use a cache-busting timestamp to prevent getting 200 from local cache
      await fetch("https://www.google.com/favicon.ico?t=" + Date.now(), {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // SUCCESS: Reset failures and set online immediately
      failureCount.current = 0;
      setIsOnline(true);
    } catch (err) {
      // FAILURE: Increment count
      failureCount.current += 1;

      // Only flip to offline if we've hit the threshold
      if (failureCount.current >= THRESHOLD) {
        setIsOnline(false);
      }
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      // When browser says online, verify it once
      checkInternetConnection();
    };

    const handleOffline = () => {
      // When browser is certain it's offline (e.g., Airplane mode),
      // we can react faster, but still give it one check
      failureCount.current = THRESHOLD - 1; // Set to 2, so the next check confirms it
      checkInternetConnection();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    checkInternetConnection();

    // Verification Interval
    // 10s is a good balance for exams.
    // If it fails, it will take 30s total to show "Offline" (10s * 3 attempts)
    const interval = setInterval(checkInternetConnection, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}