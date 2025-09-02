"use client";

import { useTheme } from "next-themes"; // or any theme hook you use

export function GlobalLoader({ message = "Loading..." }: { message?: string }) {
  const { theme } = useTheme();

  // Adjust background based on theme
  const bgClass =
    theme === "dark"
      ? "bg-gray-900 bg-opacity-50"
      : "bg-gray-100 bg-opacity-50";

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-xl ${bgClass} w-full max-w-xl mx-auto mt-10`}>
      <div className="flex flex-col items-center">
        {/* Bigger spinner */}
        <div className="animate-spin rounded-full h-24 w-24 border-t-8 border-b-8 border-blue-500"></div>
        <p className={`mt-4 text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-800"}`}>
          {message}
        </p>
      </div>
    </div>
  );
}
