"use client";
import React from "react";
import { Headphones } from "lucide-react";

export const FollowButton = React.memo(function FollowButton({
    following,
    followerCount,
    onClick,
    compact = false,
}: {
    following: boolean;
    followerCount: number;
    onClick: () => void;
    compact?: boolean;
}) {
    const countLabel =
        followerCount >= 1000
            ? `${(followerCount / 1000).toFixed(1)}K`
            : followerCount > 0
                ? String(followerCount)
                : "";

    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
                shrink-0 flex items-center font-bold rounded-full transition-all touch-manipulation select-none relative
                ${compact ? "gap-1 px-2.5 py-1.5 text-[10px] min-h-[32px]" : "gap-1.5 px-3 py-2 text-xs min-h-[36px]"}
                md:min-h-0
                ${following
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "bg-gh-l-hover dark:bg-gh-hover text-gh-l-text dark:text-gh-text hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"}
                before:absolute before:inset-[-4px] before:content-[''] md:before:inset-0
            `}
            title={following ? "Unfollow" : "Follow this show"}
        >
            <Headphones size={compact ? 12 : 13} />
            <span>{following ? "Following" : "Follow"}</span>
            {countLabel && (
                <span className={`text-[10px] ${following ? "text-white/70 dark:text-slate-900/70" : "text-gh-l-muted dark:text-gh-muted"}`}>
                    {countLabel}
                </span>
            )}
        </button>
    );
});