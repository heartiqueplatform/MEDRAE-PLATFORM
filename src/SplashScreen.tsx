"use client";

import { useEffect, useState } from "react";

export default function SplashScreen({ isLoading }: { isLoading: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    setTheme(savedTheme === "dark" ? "dark" : "light");
  }, []);

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 ${
        theme === "dark" ? "bg-black" : "bg-white"
      }`}
    >
      {/* Logo always visible */}
      <img src="/icon-512.jpg" alt="App Logo" className="w-32 h-32" />

      {/* Loader only if app is still loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center mt-6">
          <div className="animate-spin rounded-full h-24 w-24 border-t-8 border-b-8 border-blue-500 dark:border-blue-400"></div>
          <p
            className={`mt-4 text-lg font-semibold ${
              theme === "dark" ? "text-gray-300" : "text-black"
            }`}
          >
            Heartique is loading...
          </p>
        </div>
      )}
    </div>
  );
}
