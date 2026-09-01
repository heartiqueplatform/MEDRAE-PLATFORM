import React from 'react';

export const PlacementCardSkeleton = () => {
    return (
        <div className="overflow-hidden rounded-none md:rounded-2xl border-0 md:border bg-white shadow-none md:shadow-sm dark:bg-muted/30 border-b md:border-b md:border-slate-100/50 dark:border-slate-800/50 animate-pulse">

            {/* PHOTO SECTION SKELETON */}
            <div className="relative h-48 md:h-56 w-full bg-slate-200 dark:bg-slate-700">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>
            </div>

            <div className="p-4 md:p-5">
                {/* Header Badges Skeleton */}
                <div className="mb-2 md:mb-3 flex items-center justify-between flex-wrap gap-1">
                    <div className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 md:px-2 py-0.5 md:py-1">
                        <div className="h-2 w-16 rounded bg-slate-300 dark:bg-slate-600" />
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                        <div className="flex items-center gap-0.5 md:gap-1">
                            <div className="h-2.5 w-2.5 rounded bg-slate-200 dark:bg-slate-700" />
                            <div className="h-2 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                        </div>
                        <div className="h-6 w-6 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    </div>
                </div>

                {/* Title Skeleton */}
                <div className="h-6 md:h-7 w-48 rounded bg-slate-200 dark:bg-slate-700 mb-1" />
                <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-3 md:mb-4" />

                {/* Wards Section Skeleton */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 md:p-3 rounded-lg md:rounded-xl mb-3 md:mb-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-start gap-1.5 md:gap-2">
                        <div className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700 mt-0.5" />
                        <div className="flex-1">
                            <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                            <div className="h-3 w-56 rounded bg-slate-200 dark:bg-slate-700 mt-1" />
                        </div>
                    </div>
                </div>

                {/* Action Buttons Skeleton */}
                <div className="grid grid-cols-1 gap-1.5 md:gap-2 mt-3 md:mt-4">
                    <div className="h-10 md:h-12 rounded-lg md:rounded-xl bg-slate-200 dark:bg-slate-700" />
                    <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                        <div className="h-9 md:h-10 rounded-lg md:rounded-xl bg-slate-200 dark:bg-slate-700" />
                        <div className="h-9 md:h-10 rounded-lg md:rounded-xl bg-slate-200 dark:bg-slate-700" />
                    </div>
                </div>
            </div>
        </div>
    );
};