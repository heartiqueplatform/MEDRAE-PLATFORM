import React from "react";

export const HospitalCardSkeleton = () => {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2.5 animate-pulse">
            {/* Header */}
            <div className="flex items-start gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-2.5 w-1/3 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>
            </div>

            {/* Location + acceptance */}
            <div className="flex items-center gap-3">
                <div className="h-3 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-3 w-28 rounded bg-slate-100 dark:bg-white/[0.06]" />
            </div>

            {/* Departments */}
            <div className="flex gap-1.5">
                <div className="h-5 w-14 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-5 w-16 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-5 w-12 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
            </div>

            {/* Actions */}
            <div className="flex gap-1.5">
                <div className="flex-1 h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
            </div>

            {/* Footer */}
            <div className="flex items-center gap-1.5 pt-1
                            border-t border-slate-100 dark:border-white/[0.04]">
                <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
            </div>
        </div>
    );
};