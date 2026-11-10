"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    MessageSquare, ImageIcon, Stethoscope, Users, UserCircle,
} from "lucide-react";

export type FeedTab =
    | "questions" | "images" | "cases" | "community" | "more";

interface Props {
    active: FeedTab;
    onChange: (tab: FeedTab) => void;
    counts?: { questions?: number; images?: number; community?: number };
}

const TABS = [
    { key: "community" as FeedTab, label: "Community", icon: Users, showCount: "community" as const },
    { key: "questions" as FeedTab, label: "Questions", icon: MessageSquare, showCount: "questions" as const },
    { key: "cases" as FeedTab, label: "Cases", icon: Stethoscope },
    { key: "images" as FeedTab, label: "Images", icon: ImageIcon, showCount: "images" as const },
    { key: "more" as FeedTab, label: "More", icon: UserCircle },
];

export default function FeedTabs({ active, onChange, counts }: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [indicator, setIndicator] = useState({ left: 0, width: 0 });

    useLayoutEffect(() => {
        const btn = btnRefs.current[active];
        const container = scrollRef.current;
        if (!btn || !container) return;

        setIndicator({
            left: btn.offsetLeft - container.scrollLeft,
            width: btn.offsetWidth,
        });

        // Scroll active into view
        const btnLeft = btn.offsetLeft;
        const btnWidth = btn.offsetWidth;
        const containerWidth = container.clientWidth;
        const isVisible =
            btnLeft >= container.scrollLeft + 8 &&
            btnLeft + btnWidth <= container.scrollLeft + containerWidth - 8;
        if (!isVisible) {
            container.scrollTo({
                left: btnLeft - containerWidth / 2 + btnWidth / 2,
                behavior: "smooth",
            });
        }
    }, [active]);

    const handleTap = (key: FeedTab) => {
        if (navigator.vibrate) navigator.vibrate(10);
        onChange(key);
    };

    return (
        <div className="w-full bg-white dark:bg-[#0d1117]">
            <div className="px-3 py-2">
                <div
                    ref={scrollRef}
                    className="relative flex items-center gap-0
                               rounded-xl bg-slate-100 dark:bg-white/[0.06]
                               p-1 overflow-x-auto
                               [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    style={{ WebkitOverflowScrolling: "touch" }}
                >
                    {/* Sliding indicator behind the active tab */}
                    <span
                        className="absolute top-1 bottom-1 rounded-lg
                                   bg-white dark:bg-[#161b22]
                                   shadow-sm transition-all duration-200"
                        style={{
                            left: indicator.left,
                            width: indicator.width,
                        }}
                        aria-hidden
                    />

                    {TABS.map((t) => {
                        const isActive = active === t.key;
                        const Icon = t.icon;
                        const count =
                            t.showCount === "questions" ? counts?.questions
                                : t.showCount === "images" ? counts?.images
                                    : t.showCount === "community" ? counts?.community
                                        : undefined;

                        return (
                            <button
                                key={t.key}
                                ref={(el) => { btnRefs.current[t.key] = el; }}
                                onClick={() => handleTap(t.key)}
                                className={`relative z-10 shrink-0
                                            flex items-center justify-center gap-1.5
                                            h-9 px-3 rounded-lg
                                            transition-colors
                                            ${isActive
                                        ? "text-slate-900 dark:text-white"
                                        : "text-slate-500 dark:text-slate-400"}`}
                                aria-current={isActive ? "page" : undefined}
                                style={{ touchAction: "manipulation" }}
                            >
                                <Icon
                                    size={15}
                                    strokeWidth={isActive ? 2.4 : 2}
                                    className="shrink-0"
                                />
                                <span className={`text-[12px] leading-none ${isActive ? "font-bold" : "font-semibold"}`}>
                                    {t.label}
                                </span>
                                {typeof count === "number" && count > 0 && (
                                    <span className="text-[9px] font-bold tabular-nums
                                                     px-1 py-px rounded-full leading-none
                                                     bg-slate-200 dark:bg-white/[0.1]
                                                     text-slate-700 dark:text-slate-200">
                                        {count > 99 ? "99+" : count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}