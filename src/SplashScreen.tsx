"use client";

import { useEffect, useState } from "react";

export default function SplashScreen({
  appReady,
}: {
  appReady: boolean;
}) {
  const [theme] = useState<"light" | "dark">(
    (localStorage.getItem("theme") as "light" | "dark" | null) === "dark"
      ? "dark"
      : "light"
  );
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // If already shown once, skip
    if (sessionStorage.getItem("splashShown")) {
      setShowSplash(false);
      return;
    }

    // If app is ready immediately → skip splash
    if (appReady) {
      setShowSplash(false);
      return;
    }

    // Otherwise, show splash until appReady flips true
    if (!appReady) {
      sessionStorage.setItem("splashShown", "true");
    }
  }, [appReady]);

  if (!showSplash) return null;

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 ${
        theme === "dark" ? "bg-black" : "bg-white"
      }`}
    >
      {/* Logo */}
      <img src="/icon-512.jpg" alt="App Logo" className="w-32 h-32" />

      {/* Loader */}
      {!appReady && (
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
      )}
    </div>
  );
}
