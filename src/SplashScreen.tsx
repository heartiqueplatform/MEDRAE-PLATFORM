"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showLoader, setShowLoader] = useState(false); // 👈 controls spinner

  useEffect(() => {
    // Read the user theme from localStorage
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme === "dark") {
      setTheme("dark");
    } else {
      setTheme("light");
    }

    // Example: Only show loader if something takes long (optional)
    const timer = setTimeout(() => {
      setShowLoader(true); // 👈 show after delay if still loading
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 ${
        theme === "dark" ? "bg-black" : "bg-white"
      }`}
    >
      {/* Logo */}
      <img
        src="/icon-512.jpg"
        alt="App Logo"
        className="w-32 h-32"
      />

      {/* Loader (only if showLoader is true) */}
      {showLoader && (
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
