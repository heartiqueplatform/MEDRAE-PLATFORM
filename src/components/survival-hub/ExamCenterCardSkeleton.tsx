import React from 'react';

export const ExamCenterCardSkeleton = () => {
    return (
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-none md:rounded-[2rem] border-0 md:border bg-white px-4 py-4 md:p-5 shadow-none md:shadow-sm dark:bg-muted/30 border-b md:border-b md:border-slate-100/50 dark:border-slate-800/50 animate-pulse">

            {/* 1. Header: Badge & Status Skeleton */}
            <div className="flex justify-between items-start mb-3 md:mb-4">
                <div className="flex flex-col gap-0.5 md:gap-1">
                    <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                        <div className="flex items-center gap-1 rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 md:px-2 py-0.5 md:py-1">
                            <span className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                <div className="h-2 w-12 rounded bg-slate-300 dark:bg-slate-600" />
                            </span>
                        </div>
                        <div className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 md:px-2 py-0.5 md:py-1">
                            <div className="h-2 w-10 rounded bg-slate-300 dark:bg-slate-600" />
                        </div>
                    </div>
                    <div className="mt-1 h-6 md:h-7 w-48 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="rounded-xl md:rounded-2xl bg-slate-200 dark:bg-slate-700 p-2 md:p-3">
                    <div className="h-4 w-4 md:h-5 md:w-5 rounded bg-slate-300 dark:bg-slate-600" />
                </div>
            </div>

            {/* 2. Location Info Skeleton */}
            <div className="flex items-center gap-2 mb-4 md:mb-5 px-0 md:px-1">
                <div className="flex -space-x-1.5 md:-space-x-2 mr-1.5 md:mr-2">
                    <div className="h-5 w-5 md:h-6 md:w-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700" />
                    <div className="h-5 w-5 md:h-6 md:w-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                </div>
            </div>

            {/* 3. Exam Buddies Button Skeleton */}
            <div className="relative mb-3 flex items-center justify-between overflow-hidden rounded-xl md:rounded-2xl bg-slate-200 dark:bg-slate-700 p-3 md:p-4">
                <div className="relative z-10 flex items-center gap-2 md:gap-3">
                    <div className="rounded-lg md:rounded-xl bg-slate-300 dark:bg-slate-600 p-1.5 md:p-2">
                        <div className="h-4 w-4 md:h-[18px] md:w-[18px] rounded bg-slate-400 dark:bg-slate-500" />
                    </div>
                    <div>
                        <div className="h-2 w-16 rounded bg-slate-300 dark:bg-slate-600 mb-1" />
                        <div className="h-3 w-24 rounded bg-slate-300 dark:bg-slate-600" />
                    </div>
                </div>
                <div className="h-4 w-4 md:h-5 md:w-5 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* 4. Action Grid Skeleton */}
            <div className="grid grid-cols-2 gap-1.5 md:gap-2 mb-3 md:mb-4">
                <div className="h-9 md:h-11 rounded-lg md:rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="h-9 md:h-11 rounded-lg md:rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="col-span-2 h-9 md:h-10 rounded-lg md:rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* 5. Footer: Uploader & Meta Skeleton */}
            <div className="pt-3 md:pt-4 border-t border-slate-100/50 md:border-t md:border-dashed md:border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="h-6 w-6 md:h-7 md:w-7 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 p-0.5 border border-white dark:border-slate-800 shadow-sm" />
                    <div className="flex flex-col">
                        <div className="h-2 w-12 rounded bg-slate-200 dark:bg-slate-700 mb-0.5" />
                        <div className="h-2.5 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                </div>
                <div className="flex items-center gap-0.5 md:gap-1 bg-slate-200 dark:bg-slate-700 p-0.5 md:p-1 rounded-lg">
                    <div className="h-6 w-6 md:h-7 md:w-7 rounded bg-slate-300 dark:bg-slate-600" />
                    <div className="w-px md:w-[1px] h-2.5 md:h-3 bg-slate-300 dark:bg-slate-600"></div>
                    <div className="h-6 w-6 md:h-7 md:w-7 rounded bg-slate-300 dark:bg-slate-600" />
                </div>
            </div>
        </div>
    );
};