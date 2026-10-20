// src/components/FollowButton.tsx
"use client";

import { memo } from "react";
import { Check } from "lucide-react";
import { useFollow } from "@/hooks/useFollow";
import { useAuth } from "@/context/AuthProvider";

interface Props {
    targetUserId: string;
    /** Optional current user id. If omitted, uses auth context. */
    currentUserId?: string;
    /** Optional callback when state changes (after optimistic + reconciled). */
    onStateChange?: (next: {
        iFollow: boolean;
        theyFollow: boolean;
        mutual: boolean;
    }) => void;
    /** Visual size. Default 'sm'. */
    size?: "sm" | "md";
    className?: string;
}

export const FollowButton = memo(function FollowButton({
    targetUserId,
    currentUserId,
    onStateChange,
    size = "sm",
    className = "",
}: Props) {
    const { user } = useAuth();
    const me = currentUserId ?? user?.id ?? null;

    // Hide entirely on self. Cannot follow yourself.
    if (!me || me === targetUserId) return null;

    const { status, loading, toggleFollow } = useFollow(targetUserId);
    const { iFollow, mutual } = status;

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation(); // row clicks open profile — don't bubble
        e.preventDefault();
        await toggleFollow();
        onStateChange?.({
            iFollow: !iFollow,
            theyFollow: status.theyFollow,
            mutual: !iFollow && status.theyFollow,
        });
    };

    const sizeClasses =
        size === "md"
            ? "text-[13px] px-4 py-2"
            : "text-[12px] px-3 py-1.5";
    const base = `inline-flex items-center justify-center gap-1 font-semibold rounded-sm transition-colors active:scale-95 ${sizeClasses} ${className}`;
    // Loading: render the Follow style but muted, still clickable (optimistic covers the fast path)
    if (loading) {
        return (
            <button
                type="button"
                onClick={handleClick}
                className={`${base} bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500`}
                style={{ touchAction: "manipulation" }}
            >
                Follow
            </button>
        );
    }

    if (mutual) {
        return (
            <button
                type="button"
                onClick={handleClick}
                className={`${base} bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/15`}
                style={{ touchAction: "manipulation" }}
                aria-pressed="true"
                aria-label="Mutual follow. Tap to unfollow."
            >
                Mutual
                <Check className="w-3 h-3" strokeWidth={3} />
            </button>
        );
    }

    if (iFollow) {
        return (
            <button
                type="button"
                onClick={handleClick}
                className={`${base} bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700`}
                style={{ touchAction: "manipulation" }}
                aria-pressed="true"
                aria-label="Following. Tap to unfollow."
            >
                Following
                <Check className="w-3 h-3" strokeWidth={3} />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`${base} bg-blue-600 text-white hover:bg-blue-700`}
            style={{ touchAction: "manipulation" }}
            aria-pressed="false"
            aria-label="Follow"
        >
            Follow
        </button>
    );
});