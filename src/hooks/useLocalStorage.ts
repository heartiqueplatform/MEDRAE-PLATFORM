// hooks/useLocalStorage.ts
import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Ensure we are in the browser (Next.js SSR-safe)
  const isBrowser = typeof window !== "undefined";

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!isBrowser) return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error reading localStorage key:", key, error);
      return initialValue;
    }
  });

  // Update localStorage whenever state changes
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (isBrowser) {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
      // Trigger event for other tabs/components
      window.dispatchEvent(new Event("localStorageChange"));
    } catch (error) {
      console.error("Error setting localStorage key:", key, error);
    }
  };

  // Listen for changes from other tabs/components
  useEffect(() => {
    const handleStorageChange = () => {
      if (!isBrowser) return;
      try {
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? JSON.parse(item) : initialValue);
      } catch (error) {
        console.error("Error syncing localStorage key:", key, error);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleStorageChange);
    };
  }, [key, initialValue, isBrowser]);

  return [storedValue, setValue] as const;
}
