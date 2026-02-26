"use client";
import { useEffect, useState } from "react";
import { MedicalDoodles } from "@/components/MedicalDoodles";

export function GlobalLoader() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [displayedText, setDisplayedText] = useState("");
  const fullText = "MEDRAE";

  useEffect(() => {
    const letters = fullText.split("");
    let currentIndex = 0;

    const typeNextLetter = () => {
      if (currentIndex < letters.length) {
        setDisplayedText(letters.slice(0, currentIndex + 1).join(""));
        currentIndex++;
        setTimeout(typeNextLetter, 150);
      }
    };

    typeNextLetter();

    return () => {
      currentIndex = letters.length;
    };
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
  }, []);

  const borderColors =
    theme === "dark"
      ? "border-t-red-500 border-r-yellow-500 border-b-green-500 border-l-blue-500"
      : "border-t-red-400 border-r-yellow-400 border-b-green-400 border-l-blue-400";

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full gap-6 bg-gray-50 dark:bg-gray-900 overflow-hidden">

      {/* Background Doodles */}
      <MedicalDoodles />

      {/* Spinning Loader */}
      <div className="relative flex items-center justify-center h-24 w-24">
        <div
          className={`animate-spin rounded-full h-24 w-24 ${borderColors} border-8`}
        ></div>
      </div>

      {/* Animated Brand Name */}
      <h1 className="text-3xl md:text-2xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-widest">
        {displayedText}
        <span className="animate-blink text-gray-900 dark:text-white"></span>
      </h1>
    </div>
  );
}