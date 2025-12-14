"use client";

export function GlobalLoader() {
  return (
    <div className="flex items-center justify-center min-h-[70vh] w-full">
      {/* Multicolor spherical spinning ball */}
      <div className="animate-spin rounded-full h-32 w-32 border-8 border-t-red-500 border-r-yellow-500 border-b-green-500 border-l-blue-500"></div>
    </div>
  );
}
