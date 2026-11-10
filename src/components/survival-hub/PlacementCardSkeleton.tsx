import React from "react";

export const PlacementCardSkeleton = () => {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden
                        w-full max-w-sm mx-auto animate-pulse">
            {/* Photo */}
            <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-white/[0.06]" />

            <div className="p-3 space-y-2.5">
                {/* County + status row */}
                <div className="flex items-center justify-between gap-2">
                    <div className="h-4 w-16 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-4 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>

                {/* Title + location */}
                <div className="space-y-1.5">
                    <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-2.5 w-1/2 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>

                {/* Wards box */}
                <div className="rounded-xl bg-slate-100 dark:bg-white/[0.06] p-2.5 h-14" />

                {/* Primary CTA */}
                <div className="h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />

                {/* Secondary row */}
                <div className="grid grid-cols-2 gap-1.5">
                    <div className="h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                </div>
            </div>
        </div>
    );
};