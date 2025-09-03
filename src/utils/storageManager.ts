// utils/storageManager.ts
import { useLocalStorage } from "@/hooks/useLocalStorage";

// Centralized storage manager with predefined keys
export const storageKeys = {
  NAME: "name",
  EMAIL: "email",
  THEME: "theme", // e.g., 'light' or 'dark'
  LANGUAGE: "language",
  NOTIFICATIONS_ENABLED: "notificationsEnabled",
};

// Hooks for each key
export const useName = () => useLocalStorage<string>(storageKeys.NAME, "");
export const useEmail = () => useLocalStorage<string>(storageKeys.EMAIL, "");
export const useTheme = () => useLocalStorage<"light" | "dark">(storageKeys.THEME, "light");
export const useLanguage = () => useLocalStorage<string>(storageKeys.LANGUAGE, "en");
export const useNotificationsEnabled = () =>
  useLocalStorage<boolean>(storageKeys.NOTIFICATIONS_ENABLED, true);
