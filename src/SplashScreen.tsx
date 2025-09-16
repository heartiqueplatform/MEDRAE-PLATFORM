"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    setTheme(savedTheme === "dark" ? "dark" : "light");

    // Prevent splash from showing again after first load
    const alreadyShown = sessionStorage.getItem("splashShown");
    if (alreadyShown) {
      setShowSplash(false);
      return;
    }

    // Mark splash as shown and auto-hide after 1 second
    sessionStorage.setItem("splashShown", "true");
    const timer = setTimeout(() => setShowSplash(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!showSplash) return null;

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 ${
        theme === "dark" ? "bg-black" : "bg-white"
      }`}
    >
      {/* Logo always visible */}
      <img src="/icon-512.jpg" alt="App Logo" className="w-32 h-32" />

      {/* Loader while splash is visible */}
      <div className="flex flex-col items-center justify-center mt-6">
        <div className="animate-spin rounded-full h-20 w-20 border-t-8 border-b-8 border-blue-500 dark:border-blue-400"></div>
        <p
          className={`mt-4 text-lg font-semibold ${
            theme === "dark" ? "text-gray-300" : "text-black"
          }`}
        >
          Heartique is loading...
        </p>
      </div>
    </div>
  );
}
