"use client";
import React from "react";

export function SkeletonList({ count = 8 }: { count?: number }) {
    return (
        <div className="animate-pulse">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="w-full rounded-2xl px-3 py-3 mb-1 flex items-center gap-3">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 rounded-full bg-gh-l-hover dark:bg-gh-hover" style={{ width: `${60 + (i % 4) * 8}%` }} />
                        <div className="h-2.5 rounded-full bg-gh-l-hover dark:bg-gh-hover" style={{ width: `${30 + (i % 3) * 10}%` }} />
                    </div>
                    <div className="shrink-0 w-4 h-4 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
                </div>
            ))}
        </div>
    );
}