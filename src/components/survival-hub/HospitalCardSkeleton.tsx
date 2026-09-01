import React from 'react';

export const HospitalCardSkeleton = () => {
    return (
        <div className="rounded-none md:rounded-xl border-0 md:border bg-white px-4 py-4 md:p-5 dark:bg-muted/30 shadow-none md:shadow-sm border-b md:border-b md:border-slate-100/50 dark:border-slate-800/50 animate-pulse">
            <div className="flex gap-3 md:gap-4">
                {/* Icon Skeleton */}
                <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700">
                    <div className="h-5 w-5 md:h-6 md:w-6 rounded bg-slate-300 dark:bg-slate-600" />
                </div>

                <div className="flex-1 min-w-0">
                    {/* Title Skeleton */}
                    <div className="h-5 md:h-6 w-48 rounded bg-slate-200 dark:bg-slate-700 mb-1.5" />

                    {/* Subtitle Skeleton */}
                    <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />

                    {/* Distance Skeleton */}
                    <div className="mt-2 md:mt-3 flex items-center gap-1.5 md:gap-2">
                        <div className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>

                    {/* Student Friendly Badge Skeleton */}
                    <div className="mt-2 md:mt-3 flex items-center gap-1">
                        <div className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>

                    {/* Buttons Skeleton */}
                    <div className="mt-3 md:mt-4 flex gap-1.5 md:gap-2">
                        <div className="flex-1 h-9 md:h-10 rounded-lg md:rounded-xl bg-slate-200 dark:bg-slate-700" />
                        <div className="h-9 md:h-10 w-9 md:w-10 rounded-lg md:rounded-xl bg-slate-200 dark:bg-slate-700" />
                    </div>
                </div>
            </div>

            {/* Departments Section Skeleton */}
            <div className="mt-3 md:mt-4 flex flex-wrap gap-1.5 md:gap-2 border-t border-slate-50 pt-3 md:pt-4 dark:border-slate-800">
                {[...Array(3)].map((_, i) => (
                    <div
                        key={i}
                        className="h-5 w-16 rounded-md bg-slate-200 dark:bg-slate-700"
                    />
                ))}
            </div>

            {/* Uploader Info Skeleton */}
            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="flex items-center gap-0.5 md:gap-1">
                    <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
                </div>
            </div>
        </div>
    );
};