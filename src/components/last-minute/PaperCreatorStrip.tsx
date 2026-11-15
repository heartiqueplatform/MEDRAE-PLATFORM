// src/components/last-minute/PaperCreatorStrip.tsx
"use client";

import { CheckCircle2 } from "lucide-react";
import { useUser } from "@supabase/auth-helpers-react";

export interface PaperCreator {
    user_id: string | null;
    name: string | null;
    avatar_url: string | null;
    role: string | null;
    institution: string | null;
    is_verified_contributor: boolean | null;
    contributor_tier: string | null;
    nck_license_verified: boolean | null;
}

export function PaperCreatorStrip({
    creator,
    onSelect,
    variant = "card",
}: {
    creator: PaperCreator | null | undefined;
    onSelect: (userId: string) => void;
    variant?: "card" | "modal";
}) {
    const user = useUser();
    if (!creator?.name) return null;

    const isCard = variant === "card";

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!creator.user_id) return;
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20);
        onSelect(creator.user_id);
    };

    return (
        <button
            onClick={handleClick}
            disabled={!creator.user_id}
            className={`flex items-center gap-2 flex-wrap text-left
        rounded-lg px-1 py-1 transition-all touch-manipulation
        disabled:cursor-default disabled:hover:bg-transparent
        ${isCard
                    ? "mt-2 -mx-1 hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-[0.985]"
                    : "-m-1 hover:bg-white dark:hover:bg-white/[0.04] active:scale-[0.985] w-full"
                }`}
            title={creator.user_id ? `View ${creator.name}'s profile` : undefined}
            aria-label={creator.user_id ? `View ${creator.name}'s profile` : undefined}
        >
            {creator.avatar_url ? (
                <img
                    src={creator.avatar_url}
                    alt={creator.name}
                    className={`rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-white/[0.08]
            ${isCard ? "h-7 w-7" : "h-11 w-11 ring-2"}`}
                    onError={(e) => (e.currentTarget.style.display = "none")}
                />
            ) : (
                <span
                    className={`rounded-full bg-slate-200 dark:bg-white/[0.08]
            flex items-center justify-center font-bold shrink-0
            text-slate-500 dark:text-slate-400
            ring-1 ring-slate-200 dark:ring-white/[0.08]
            ${isCard ? "h-7 w-7 text-[11px]" : "h-11 w-11 text-base ring-2"}`}
                >
                    {creator.name.charAt(0).toUpperCase()}
                </span>
            )}

            <span
                className={`font-semibold text-slate-600 dark:text-slate-300 truncate
          ${isCard ? "text-[13px] max-w-[160px]" : "text-[15px] text-slate-900 dark:text-white max-w-[200px]"}`}
            >
                {creator.name}
            </span>

            {creator.contributor_tier === "gold" && (
                <span
                    className={`font-bold uppercase tracking-wider rounded-full
            bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300
            ${isCard ? "text-[10px] px-2 py-0.5" : "text-[10px] px-2.5 py-1"}`}
                >
                    Gold
                </span>
            )}

            {creator.nck_license_verified && (
                <span
                    className={`font-bold uppercase tracking-wider rounded-full
            bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300
            ${isCard ? "text-[10px] px-2 py-0.5" : "text-[10px] px-2.5 py-1"}`}
                >
                    NCK ✓
                </span>
            )}

            {creator.is_verified_contributor && (
                <CheckCircle2
                    size={isCard ? 18 : 18}
                    strokeWidth={2.4}
                    className="text-emerald-500 shrink-0"
                    aria-label="Verified contributor"
                />
            )}

            {user?.id === creator.user_id && (
                <span
                    className={`font-extrabold uppercase tracking-wider rounded-full
            bg-emerald-500 text-white shadow-sm shadow-emerald-500/30
            ${isCard ? "text-[10px] px-2 py-0.5" : "text-[10px] px-2.5 py-1"}`}
                >
                    You
                </span>
            )}
        </button>
    );
}