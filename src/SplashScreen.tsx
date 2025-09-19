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
        <div className="flex space-x-2">
  <svg className="w-4 h-4 text-red-500 animate-bounce delay-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 
      4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 
      14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 
      6.86-8.55 11.54L12 21.35z"/>
  </svg>
  <svg className="w-4 h-4 text-red-500 animate-bounce delay-150" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 
      4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 
      14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 
      6.86-8.55 11.54L12 21.35z"/>
  </svg>
  <svg className="w-4 h-4 text-red-500 animate-bounce delay-300" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 
      4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 
      14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 
      6.86-8.55 11.54L12 21.35z"/>
  </svg>
</div>

      )}
    </div>
  );
}
