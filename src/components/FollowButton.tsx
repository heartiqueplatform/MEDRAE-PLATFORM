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

    /* ── Optional label overrides (default: Follow / Following / Peer) ── */
    followLabel?: string;
    unfollowLabel?: string;
    mutualLabel?: string;
    loadingLabel?: string;
}

export const FollowButton = memo(function FollowButton({
    targetUserId,
    currentUserId,
    onStateChange,
    size = "sm",
    className = "",
    followLabel = "Follow",
    unfollowLabel = "Following",
    mutualLabel = "Peer",
    loadingLabel = "Follow",
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
            ? "text-[13px] px-4 py-2 gap-1.5 rounded-lg"
            : "text-[12px] px-3 py-1.5 gap-1 rounded-md";

    // Shared shell — no rounded-* here; size decides.
    const base = `inline-flex items-center justify-center font-semibold transition-colors duration-150 active:scale-[0.97] ${sizeClasses} ${className}`;
    const check = <Check className="w-3 h-3" strokeWidth={3} />;

    // ── Loading — muted, same shape as "Follow", still clickable ──
    if (loading) {
        return (
            <button
                type="button"
                onClick={handleClick}
                className={`${base} bg-slate-100 text-slate-400 dark:bg-white/[0.06] dark:text-slate-500`}
                style={{ touchAction: "manipulation" }}
            >
                {loadingLabel}
            </button>
        );
    }

    // ── Mutual — "Peer" — soft emerald tint, no border ──
    if (mutual) {
        return (
            <button
                type="button"
                onClick={handleClick}
                className={`${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/15`}
                style={{ touchAction: "manipulation" }}
                aria-pressed="true"
                aria-label={`${mutualLabel}. Tap to unfollow.`}
            >
                {mutualLabel}
                {check}
            </button>
        );
    }

    // ── Following one-way — muted slate, no border ──
    if (iFollow) {
        return (
            <button
                type="button"
                onClick={handleClick}
                className={`${base} bg-slate-100 text-slate-700 dark:bg-white/[0.08] dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.12]`}
                style={{ touchAction: "manipulation" }}
                aria-pressed="true"
                aria-label={`${unfollowLabel}. Tap to unfollow.`}
            >
                {unfollowLabel}
                {check}
            </button>
        );
    }

    // ── Not following — "Follow" — solid indigo (calm, not LinkedIn blue) ──
    return (
        <button
            type="button"
            onClick={handleClick}
            className={`${base} bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600`}
            style={{ touchAction: "manipulation" }}
            aria-pressed="false"
            aria-label={followLabel}
        >
            {followLabel}
        </button>
    );
});