import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HubCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color: string;
    count?: number;
    loading?: boolean;
}

export const HubCard = ({ title, description, icon: Icon, href, color, count, loading = false }: HubCardProps) => {
    // If loading, show skeleton
    if (loading) {
        return (
            <div className="group relative flex flex-col items-start gap-3 md:gap-4 border-0 md:border rounded-none md:rounded-2xl bg-white px-4 py-5 md:p-6 transition-all md:shadow-sm dark:bg-muted/30 border-b md:border-b md:border-slate-100/50 dark:border-slate-800/50 animate-pulse">

                {/* Icon Skeleton */}
                <div className="rounded-xl md:rounded-2xl bg-slate-200 dark:bg-slate-700 p-2.5 md:p-3">
                    <div className="h-5 w-5 md:h-6 md:w-6 rounded bg-slate-300 dark:bg-slate-600" />
                </div>

                {/* Title Skeleton */}
                <div className="w-full">
                    <div className="flex items-center justify-between">
                        <div className="h-5 md:h-6 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                        {count !== undefined && (
                            <div className="h-5 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                        )}
                    </div>
                </div>

                {/* Description Skeleton */}
                <div className="space-y-1.5 w-full">
                    <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
                </div>

                {/* Count Indicator Skeleton */}
                {count !== undefined && (
                    <div className="mt-2 md:mt-3 flex items-center gap-2 w-full">
                        <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-700" />
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            to={href}
            className="group relative overflow-hidden rounded-none md:rounded-2xl border-0 md:border border-slate-200 bg-white px-4 py-5 md:p-6 shadow-none md:shadow-sm transition-all hover:md:shadow-md dark:border-slate-800 dark:bg-slate-900 border-b md:border-b md:border-slate-100/50 dark:border-slate-800/50 active:scale-[0.98] md:active:scale-100"
        >
            <div className="flex items-center gap-3 md:block md:gap-0">
                <div className={`${color} inline-flex rounded-lg p-2.5 md:p-3 text-white shrink-0`}>
                    <Icon size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white truncate">{title}</h3>
                    <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 md:line-clamp-none">{description}</p>
                </div>
            </div>

            {count !== undefined && (
                <div className="mt-3 md:mt-4">
                    <span className="inline-block text-[10px] md:text-xs font-medium text-blue-600 dark:text-blue-400">
                        {count} locations listed →
                    </span>
                </div>
            )}
        </Link>
    );
};