"use client";
import React from "react";
import { motion } from "framer-motion";
import { ThumbsUp, Heart, Bookmark } from "lucide-react";

export const ReactionIcon = React.memo(function ReactionIcon({
    kind, active, count, onClick,
}: {
    kind: "like" | "love" | "save";
    active: boolean;
    count: number;
    onClick: () => void;
}) {
    const Icon = kind === "like" ? ThumbsUp : kind === "love" ? Heart : Bookmark;

    const activeColor =
        kind === "love"
            ? "text-rose-500"
            : kind === "save"
                ? "text-emerald-600"
                : "text-blue-600";

    const display =
        count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count > 0 ? String(count) : "";

    const bumpKey = `${kind}-${count}-${active ? 1 : 0}`;

    // Only the bookmark shows a word. Like/Love stay icon-only.
    const showLabel = kind === "save";
    const label = kind === "save" ? (active ? "Bookmarked" : "Bookmark") : "";

    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
                flex items-center justify-center gap-1 h-11 rounded-full
                text-[11px] font-semibold tabular-nums transition-colors touch-manipulation select-none
                ${showLabel ? "px-2.5" : "px-1.5"}
                ${active
                    ? activeColor
                    : "text-gh-l-muted dark:text-gh-muted hover:text-gh-l-text dark:hover:text-gh-text"}
            `}
            aria-label={`${kind}${count > 0 ? ` (${count})` : ""}`}
            aria-pressed={active}
        >
            <motion.span
                key={bumpKey}
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 600, damping: 18 }}
                className="flex items-center justify-center"
            >
                <Icon size={18} fill={active ? "currentColor" : "none"} strokeWidth={active ? 0 : 2} />
            </motion.span>
            {showLabel && (
                <span className="text-[10px] font-semibold leading-none">
                    {label}
                </span>
            )}
            {display && (
                <span className="text-[10px] font-medium tabular-nums opacity-80">{display}</span>
            )}
        </button>
    );
});