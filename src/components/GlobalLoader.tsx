"use client";
import { useEffect, useState } from "react";

export function GlobalLoader() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

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
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full gap-6">
      {/* Spinning Loader */}
      <div
        className={`animate-spin rounded-full h-32 w-32 ${borderColors} border-8`}
      ></div>

      {/* ECG Line */}
      <svg
        className="w-48 h-12"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0 50 L50 50 L70 30 L90 70 L110 50 L150 50 L170 30 L190 70 L210 50 L250 50 L270 30 L290 70 L310 50 L350 50 L370 30 L390 70 L410 50 L450 50 L470 30 L490 70 L510 50 L550 50 L570 30 L590 70 L610 50 L650 50 L670 30 L690 70 L710 50 L750 50 L770 30 L790 70 L810 50 L850 50 L870 30 L890 70 L910 50 L950 50 L970 30 L990 70 L1010 50 L1050 50 L1070 30 L1090 70 L1110 50 L1150 50 L1170 30 L1190 70 L1200 50"
          stroke={ecgColor}
          strokeWidth="2"
          fill="transparent"
          strokeDasharray="1200"
          strokeDashoffset="1200"
          className="animate-ecg"
        />
      </svg>
    </div>
  );
}
