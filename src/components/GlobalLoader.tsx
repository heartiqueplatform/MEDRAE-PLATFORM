"use client";

export function GlobalLoader({ message = "..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full">
      <div className="flex flex-col items-center">
        {/* Bigger spinner with dark mode support */}
        <div className="animate-spin rounded-full h-24 w-24 border-t-8 border-b-8 border-blue-500 dark:border-blue-400"></div>

        {/* Text auto-adjusts for dark mode */}
        <p className="mt-4 text-lg font-semibold text-black dark:text-white">
          {message}
        </p>
      </div>
    </div>
  );
}
