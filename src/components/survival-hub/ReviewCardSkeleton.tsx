import React from "react";

export const ReviewCardSkeleton = () => {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2.5 animate-pulse">
            {/* Header */}
            <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-white/[0.06] shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="h-3.5 w-32 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] shrink-0" />
            </div>

            {/* Stars */}
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="h-3.5 w-3.5 rounded bg-slate-100 dark:bg-white/[0.06]"
                    />
                ))}
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
                <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-3 w-4/6 rounded bg-slate-100 dark:bg-white/[0.06]" />
            </div>
        </div>
    );
};