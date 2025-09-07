"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Read the user theme from localStorage
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme === "dark") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }, []);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 ${
        theme === "dark" ? "bg-black" : "bg-white"
      }`}
    >
      <img
        src="/icon-512.jpg" // your logo
        alt="App Logo"
        className="w-32 h-32"
      />
    </div>
  );
}
