import React from 'react';

export const ReviewCardSkeleton = () => {
    return (
        <div className="px-4 py-4 md:px-0 md:py-4 border-b border-slate-100/50 dark:border-slate-800/50 last:border-0 animate-pulse">

            {/* Header with Avatar and User Info */}
            <div className="flex items-center gap-2.5 md:gap-3">
                {/* Avatar Skeleton */}
                <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />

                <div className="flex-1 min-w-0">
                    {/* Name Skeleton */}
                    <div className="h-4 md:h-5 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-1" />
                    {/* Institution Skeleton */}
                    <div className="h-2.5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                </div>

                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    {/* Rating Stars Skeleton */}
                    <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" />
                        ))}
                    </div>
                    {/* Action Buttons Skeleton */}
                    <div className="flex items-center gap-0.5 md:gap-1">
                        <div className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-700" />
                        <div className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    </div>
                </div>
            </div>

            {/* Comment Text Skeleton */}
            <div className="mt-2 md:mt-3 space-y-1.5">
                <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-4/6 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
        </div>
    );
};