import React from "react";

export const HousingCardSkeleton = () => {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden animate-pulse">
            {/* Photo */}
            <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-white/[0.06]" />

            <div className="p-3 space-y-2.5">
                {/* Location row */}
                <div className="h-7 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />

                {/* Title */}
                <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-white/[0.06]" />

                {/* Distance + stars */}
                <div className="flex items-center gap-2.5">
                    <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="h-2.5 w-2.5 rounded bg-slate-100 dark:bg-white/[0.06]"
                            />
                        ))}
                    </div>
                </div>

                {/* Price row */}
                <div className="h-14 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />

                {/* Actions */}
                <div className="grid grid-cols-2 gap-1.5">
                    <div className="h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                </div>
            </div>

            {/* Contributor */}
            <div className="flex items-center gap-2 px-3 py-2
                            border-t border-slate-100 dark:border-white/[0.04]">
                <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                <div className="space-y-1">
                    <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-2 w-16 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>
            </div>
        </div>
    );
};