// hooks/useOnlineStatus.ts
import { useState, useEffect } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Function to test actual internet connectivity
  const checkInternetConnection = async () => {
    try {
      // We use a small fetch request to a reliable server
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      await fetch("https://www.google.com/favicon.ico", {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setIsOnline(true);
    } catch (err) {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkInternetConnection();

    // Listen to browser events
    const handleOnline = () => checkInternetConnection();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Optional: periodically check internet in case connection is flaky
    const interval = setInterval(checkInternetConnection, 15000); // every 15 seconds

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}
