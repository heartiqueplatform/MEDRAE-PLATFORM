"use client";



import { useEffect, useState } from "react";

export default function SplashScreen() {
  const firstVisit = !localStorage.getItem("splashShown");
  const [showSplash, setShowSplash] = useState(firstVisit);

  const [theme] = useState<"light" | "dark">(
    (localStorage.getItem("theme") as "light" | "dark" | null) === "dark"
      ? "dark"
      : "light"
  );

  useEffect(() => {
    if (firstVisit) {
      localStorage.setItem("splashShown", "true");
      const timer = setTimeout(() => setShowSplash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [firstVisit]);

  if (!showSplash) return null;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-black"
    >
      {/* Logo */}
      <img src="/pwa-192x192.jpeg" alt="App Logo" className="w-32 h-32 mb-6" />

      {/* Bouncing Hearts Loader */}
      <div className="flex space-x-1">
        {[0, 0.1, 0.2, 0.3, 0.4].map((delay, idx) => (
          <div
            key={idx}
            className="animate-bounce"
            style={{
              animationDelay: `${delay}s`,
              animationDuration: "0.6s",
              transformOrigin: "center bottom",
            }}
          >
            <svg
              className="w-3 h-3 text-red-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42
              4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81
              14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4
              6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
