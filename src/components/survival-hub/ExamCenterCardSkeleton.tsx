import React from "react";

export const ExamCenterCardSkeleton = () => {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2.5 animate-pulse">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex gap-1.5">
                        <div className="h-4 w-16 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="h-4 w-12 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                    </div>
                    <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>
                <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-white/[0.06] shrink-0" />
            </div>

            {/* Location */}
            <div className="h-3 w-40 rounded bg-slate-100 dark:bg-white/[0.06]" />

            {/* Find buddies CTA */}
            <div className="h-12 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />

            {/* Housing / Hospitals */}
            <div className="grid grid-cols-2 gap-1.5">
                <div className="h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                <div className="col-span-2 h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
            </div>

            {/* Footer */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                <div className="space-y-1">
                    <div className="h-2 w-16 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>
            </div>
        </div>
    );
};