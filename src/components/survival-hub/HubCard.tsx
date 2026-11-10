import React from "react";
import { LucideIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { playSound } from "@/lib/soundManager";

interface HubCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color: string;
    count?: number;
    loading?: boolean;
}

const tap = () => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
};

export const HubCard = ({
    title,
    description,
    icon: Icon,
    href,
    color,
    count,
    loading = false,
}: HubCardProps) => {
    /* ── Skeleton ─────────────────────────────────────── */
    if (loading) {
        return (
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="h-3 w-4/5 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    </div>
                </div>
                {count !== undefined && (
                    <div className="mt-2 pl-[52px]">
                        <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            to={href}
            onClick={tap}
            className="group rounded-2xl bg-white dark:bg-[#161b22] p-3
                       flex items-center gap-3
                       active:scale-[0.98] transition-transform"
            style={{ touchAction: "manipulation" }}
        >
            {/* Icon chip */}
            <div
                className={`${color} h-10 w-10 rounded-xl
                            flex items-center justify-center
                            text-white shrink-0`}
            >
                <Icon size={18} strokeWidth={2.25} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                        {title}
                    </h3>
                    {count !== undefined && (
                        <span className="shrink-0 text-[10px] font-bold tabular-nums
                                         text-slate-500 dark:text-slate-400
                                         bg-slate-100 dark:bg-white/[0.06]
                                         px-1.5 py-0.5 rounded-full">
                            {count}
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400
                              leading-snug mt-0.5 line-clamp-2">
                    {description}
                </p>
                {count !== undefined && (
                    <span className="inline-flex items-center gap-1 mt-1
                                     text-[10px] font-bold uppercase tracking-wider
                                     text-blue-600 dark:text-blue-400">
                        {count} listed
                        <ArrowRight className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>
                )}
            </div>
        </Link>
    );
};