"use client";

import { useEffect, useRef } from "react";
import {
    MessageSquare, ImageIcon, Stethoscope, Users, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedTab =
    | "questions" | "images" | "cases" | "community" | "more";

interface Props {
    active: FeedTab;
    onChange: (tab: FeedTab) => void;
    counts?: { questions?: number; images?: number; community?: number };
}

const TABS = [
    { key: "community" as FeedTab, label: "Community", icon: Users, showCount: "community" as const, accent: "violet" },
    { key: "questions" as FeedTab, label: "Questions", icon: MessageSquare, showCount: "questions" as const, accent: "blue" },
    { key: "cases" as FeedTab, label: "Clinical", icon: Stethoscope, accent: "emerald" },
    { key: "images" as FeedTab, label: "Images", icon: ImageIcon, showCount: "images" as const, accent: "amber" },
    { key: "more" as FeedTab, label: "Find More", icon: UserCircle, accent: "rose" },
];

const ACCENT_MAP: Record<string, string> = {
    blue: "bg-blue-600 text-white shadow-blue-500/30",
    amber: "bg-amber-500 text-white shadow-amber-500/30",
    emerald: "bg-emerald-500 text-white shadow-emerald-500/30",
    violet: "bg-violet-500 text-white shadow-violet-500/30",
    rose: "bg-rose-500 text-white shadow-rose-500/30",
};

export default function FeedTabs({ active, onChange, counts }: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);

    /* Scroll active pill into view (WhatsApp-style centering) */
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const el = container.querySelector<HTMLElement>(
            `[data-tab-id="${active}"]`
        );
        if (el) {
            el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
    }, [active]);

    const handleTap = (key: FeedTab) => {
        if (navigator.vibrate) navigator.vibrate(10);
        onChange(key);
    };

    return (
        <div className="sticky top-0 z-40 px-2 sm:px-2 pt-2 pb-3 bg-transparent">
            <div
                ref={scrollRef}
                className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                {TABS.map((t) => {
                    const isActive = active === t.key;
                    const Icon = t.icon;
                    const count =
                        t.showCount === "questions" ? counts?.questions
                            : t.showCount === "images" ? counts?.images
                                : t.showCount === "community" ? counts?.community
                                    : undefined;
                    const showBadge = !!count && count > 0;

                    return (
                        <button
                            key={t.key}
                            data-tab-id={t.key}
                            onClick={() => handleTap(t.key)}
                            aria-current={isActive ? "page" : undefined}
                            style={{ touchAction: "manipulation" }}
                            className={cn(
                                "shrink-0 flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-bold",
                                "transition-all duration-200 active:scale-95 shadow-none",
                                isActive
                                    ? `${ACCENT_MAP[t.accent ?? "blue"]} shadow-none`
                                    : "bg-white text-slate-700 ring-none hover:bg-slate-50 " +
                                    "dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {t.label}

                            {t.showCount && showBadge && (
                                <span
                                    className={cn(
                                        "ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full",
                                        "text-[9px] font-black tabular-nums leading-none",
                                        isActive
                                            ? "bg-white text-slate-900"
                                            : "bg-rose-500 text-white"
                                    )}
                                >
                                    {count && count > 99 ? "99+" : count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}