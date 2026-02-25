"use client";
import { useEffect, useState } from "react";

export function GlobalLoader() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [displayedText, setDisplayedText] = useState("");
  const fullText = "MEDRAE";

  useEffect(() => {
    const letters = fullText.split(""); // ["M","E","D","R","A","E"]
    let currentIndex = 0;

    const typeNextLetter = () => {
      if (currentIndex < letters.length) {
        setDisplayedText(letters.slice(0, currentIndex + 1).join(""));
        currentIndex++;
        setTimeout(typeNextLetter, 150); // speed per letter
      }
    };

    typeNextLetter();

    // Cleanup on unmount
    return () => {
      currentIndex = letters.length; // stop typing
    };
  }, []);
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
  }, []);

  const ecgColor = theme === "dark" ? "lime" : "red";
  const borderColors =
    theme === "dark"
      ? "border-t-red-500 border-r-yellow-500 border-b-green-500 border-l-blue-500"
      : "border-t-red-400 border-r-yellow-400 border-b-green-400 border-l-blue-400";

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full gap-0">
      {/* Spinning Loader */}
      {/* Spinning Loader + Centered ECG */}
      <div className="relative flex items-center justify-center h-32 w-32">
        {/* Spinning Circle */}
        <div
          className={`animate-spin rounded-full h-32 w-32 ${borderColors} border-8`}
        ></div>

        {/* ECG Inside Circle */}
        <svg
          className="absolute w-24 h-8"
          viewBox="0 0 1200 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff0000" />
              <stop offset="16%" stopColor="#ff7f00" />
              <stop offset="33%" stopColor="#ffff00" />
              <stop offset="50%" stopColor="#00ff00" />
              <stop offset="66%" stopColor="#0000ff" />
              <stop offset="83%" stopColor="#4b0082" />
              <stop offset="100%" stopColor="#8b00ff" />
            </linearGradient>
          </defs>

          <path
            d="M0 50 L50 50 L70 10 L90 90 L110 50
L150 50 L170 10 L190 90 L210 50
L250 50 L270 10 L290 90 L310 50
L350 50 L370 10 L390 90 L410 50
L450 50 L470 10 L490 90 L510 50
L550 50 L570 10 L590 90 L610 50
L650 50 L670 10 L690 90 L710 50
L750 50 L770 10 L790 90 L810 50
L850 50 L870 10 L890 90 L910 50
L950 50 L970 10 L990 90 L1010 50
L1050 50 L1070 10 L1090 90 L1110 50
L1150 50 L1170 10 L1190 90 L1200 50"
            stroke="url(#rainbowGradient)"
            strokeWidth="2"
            fill="transparent"
            strokeDasharray="1200"
            strokeDashoffset="1200"
            className="animate-ecg"
          />
        </svg>
      </div>

      {/* Animated Brand Name */}
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mt-1">
        {displayedText}
        <span className="animate-blink">|</span> {/* blinking cursor */}
      </h1>
    </div>
  );
}
