"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    setTheme(savedTheme === "dark" ? "dark" : "light");

    // Hide splash after 1s (adjust if you want longer/shorter)
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
      <img src="/icon-512.jpg" alt="App Logo" className="w-32 h-32" />

      {/* Optional loader while showing splash */}
      <div className="flex flex-col items-center justify-center mt-6">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 dark:border-blue-400"></div>
      </div>
    </div>
  );
}
