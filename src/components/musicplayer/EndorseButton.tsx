"use client";
import React from "react";
import { ThumbsUp } from "lucide-react";

export const EndorseButton = React.memo(function EndorseButton({
    endorsed, count, onClick, compact = false,
}: {
    endorsed: boolean;
    count: number;
    onClick: () => void;
    compact?: boolean;
}) {
    const countLabel =
        count >= 1000
            ? `${(count / 1000).toFixed(1)}K`
            : count > 0
                ? String(count)
                : "";

    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
                shrink-0 flex items-center font-bold rounded-full transition-all touch-manipulation select-none
                ${compact ? "gap-1 px-2.5 py-1.5 text-[10px] min-h-[32px]" : "gap-1.5 px-3 py-2 text-xs min-h-[36px]"}
                md:min-h-0
                ${endorsed
                    ? "bg-blue-600 text-white"
                    : "bg-gh-l-hover dark:bg-gh-hover text-gh-l-text dark:text-gh-text hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"}
            `}
            title={endorsed ? "Endorsed — click to remove" : "Endorse this show"}
            aria-pressed={endorsed}
        >
            <ThumbsUp size={compact ? 12 : 13} fill={endorsed ? "currentColor" : "none"} />
            <span>{endorsed ? "Endorsed" : "Endorse"}</span>
            {countLabel && (
                <span className={`text-[10px] ${endorsed ? "text-white/80" : "text-gh-l-muted dark:text-gh-muted"}`}>
                    {countLabel}
                </span>
            )}
        </button>
    );
});