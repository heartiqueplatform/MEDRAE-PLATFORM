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
    if (sessionStorage.getItem("splashShown") || appReady) {
      setShowSplash(false);
      return;
    }
    sessionStorage.setItem("splashShown", "true");
  }, [appReady]);

  if (!showSplash) return null;

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-50 ${
        theme === "dark" ? "bg-black" : "bg-white"
      }`}
    >
      {/* Logo */}
      <img src="/icon-512.jpg" alt="App Logo" className="w-32 h-32 mb-8" />

      {/* Bouncing Dots Loader (just below logo) */}
      {!appReady && (
        <div className="flex space-x-3">
          <span className="w-4 h-4 bg-blue-500 rounded-full animate-bounce delay-0"></span>
          <span className="w-4 h-4 bg-blue-500 rounded-full animate-bounce delay-150"></span>
          <span className="w-4 h-4 bg-blue-500 rounded-full animate-bounce delay-300"></span>
        </div>
      )}
    </div>
  );
}
