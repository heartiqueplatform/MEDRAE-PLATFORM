// hooks/useOnlineStatus.ts
import { useState, useEffect } from "react";

export function useOnlineStatus() {
  // Start with browser status immediately
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined" && "__APP_OFFLINE__" in window) {
      return !(window as any).__APP_OFFLINE__;
    }
    return navigator.onLine; // instant value
  });

  // Function to test actual internet connectivity
  const checkInternetConnection = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      await fetch("https://www.google.com/favicon.ico", {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setIsOnline(true); // confirmed online
    } catch (err) {
      setIsOnline(false); // confirmed offline
    }
  };

  useEffect(() => {
    // 1️⃣ Reflect browser's initial online/offline immediately
    const initialStatus = navigator.onLine;
    setIsOnline(initialStatus);

    // 2️⃣ Verify actual connection with fetch
    checkInternetConnection();

    // 3️⃣ Listen to browser events
    const handleOnline = () => checkInternetConnection(); // verify actual connection
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 4️⃣ Periodically verify connectivity
    const interval = setInterval(checkInternetConnection, 15000); // every 15s

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}