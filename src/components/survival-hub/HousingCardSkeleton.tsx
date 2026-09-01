import React from 'react';

export const HousingCardSkeleton = () => {
    return (
        <div className="group relative overflow-hidden rounded-none md:rounded-2xl border-0 md:border border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-muted/30 border-b md:border-b md:border-slate-100/50 dark:border-slate-800/50 animate-pulse">

            {/* Header Color Skeleton */}
            <div className="h-1.5 md:h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />

            {/* Photo Area Skeleton */}
            <div className="relative h-48 md:h-56 w-full bg-slate-200 dark:bg-slate-700">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>
            </div>

            <div className="p-4 md:p-5">
                {/* Location Badge Skeleton */}
                <div className="flex items-center justify-between gap-1 bg-slate-50 px-3 md:px-4 py-1.5 md:py-2 border-b border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 -mx-4 md:-mx-5 -mt-4 md:-mt-5 mb-3 md:mb-4">
                    <div className="flex items-center gap-1 md:gap-1.5 min-w-0 flex-1">
                        <div className="h-2.5 w-2.5 rounded bg-slate-200 dark:bg-slate-600" />
                        <div className="h-2.5 w-32 rounded bg-slate-200 dark:bg-slate-600" />
                    </div>
                    <div className="h-5 w-14 rounded bg-slate-200 dark:bg-slate-600" />
                </div>

                {/* Title Skeleton */}
                <div className="flex justify-between items-start mb-1">
                    <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-600" />
                    <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-600" />
                </div>

                {/* Distance & Safety Skeleton */}
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-600" />
                    <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-2 w-2 rounded bg-slate-200 dark:bg-slate-600" />
                        ))}
                    </div>
                </div>

                {/* Amenities & Price Skeleton */}
                <div className="flex items-center justify-between mt-4 md:mt-6 bg-slate-50 dark:bg-slate-800/50 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                        <div className="h-2 w-16 rounded bg-slate-200 dark:bg-slate-600 mb-1" />
                        <div className="h-6 w-20 rounded bg-slate-200 dark:bg-slate-600" />
                    </div>
                    <div className="flex gap-2 md:gap-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-600" />
                        ))}
                    </div>
                </div>

                {/* Quick Actions Skeleton */}
                <div className="grid grid-cols-2 gap-1.5 md:gap-2 mt-3 md:mt-4">
                    <div className="h-9 md:h-10 rounded-lg md:rounded-xl bg-slate-200 dark:bg-slate-600" />
                    <div className="h-9 md:h-10 rounded-lg md:rounded-xl bg-slate-200 dark:bg-slate-600" />
                </div>
            </div>

            {/* Contributor Profile Bar Skeleton */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 p-3 md:p-4 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 md:gap-2.5 flex-1 min-w-0">
                    <div className="h-7 w-7 md:h-9 md:w-9 rounded-full bg-slate-200 dark:bg-slate-600 border-2 border-white dark:border-slate-700" />
                    <div className="min-w-0 flex-1">
                        <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-600 mb-1" />
                        <div className="h-2 w-16 rounded bg-slate-200 dark:bg-slate-600" />
                    </div>
                </div>
            </div>
        </div>
    );
};