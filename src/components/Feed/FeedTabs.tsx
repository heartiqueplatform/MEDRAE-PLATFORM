"use client";

import { useEffect, useRef } from "react";
import {
    MessageSquare,
    ImageIcon,
    Stethoscope,
    Users,
    UserCircle,
} from "lucide-react";

export type FeedTab =
    | "questions"
    | "images"
    | "cases"
    | "community"
    | "more";

interface Props {
    active: FeedTab;
    onChange: (tab: FeedTab) => void;
    counts?: {
        questions?: number;
        images?: number;
        community?: number;
    };
}

// Order: Community first, then Questions, Cases, Images, More
const TABS: {
    key: FeedTab;
    label: string;
    shortLabel: string;
    icon: typeof MessageSquare;
    showCount?: "questions" | "images" | "community";
}[] = [
        {
            key: "community",
            label: "Community",
            shortLabel: "Community",
            icon: Users,
            showCount: "community",
        },
        {
            key: "questions",
            label: "Questions",
            shortLabel: "Quiz",
            icon: MessageSquare,
            showCount: "questions",
        },
        {
            key: "cases",
            label: "Cases",
            shortLabel: "Cases",
            icon: Stethoscope,
        },
        {
            key: "images",
            label: "Images",
            shortLabel: "Images",
            icon: ImageIcon,
            showCount: "images",
        },
        {
            key: "more",
            label: "More",
            shortLabel: "More",
            icon: UserCircle,
        },
    ];

export default function FeedTabs({ active, onChange, counts }: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeBtnRef = useRef<HTMLButtonElement>(null);

    // Center the active tab on mount + whenever it changes.
    useEffect(() => {
        const btn = activeBtnRef.current;
        const container = scrollRef.current;
        if (!btn || !container) return;

        const btnLeft = btn.offsetLeft;
        const btnWidth = btn.offsetWidth;
        const containerLeft = container.scrollLeft;
        const containerWidth = container.clientWidth;

        const isVisible =
            btnLeft >= containerLeft + 8 &&
            btnLeft + btnWidth <= containerLeft + containerWidth - 8;

        if (!isVisible) {
            const targetScroll =
                btnLeft - containerWidth / 2 + btnWidth / 2;
            container.scrollTo({
                left: Math.max(0, targetScroll),
                behavior: "smooth",
            });
        }
    }, [active]);

    const handleTabTap = (key: FeedTab) => {
        if (navigator.vibrate) navigator.vibrate(10);
        onChange(key);
    };

    return (
        <div className="w-full relative bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-md">
            {/* Scrollable row on mobile, fixed row on desktop */}
            <div
                ref={scrollRef}
                className="
                    flex w-full max-w-4xl mx-auto
                    overflow-x-auto
                    snap-x snap-mandatory
                    scroll-smooth
                    [scrollbar-width:none]
                    [&::-webkit-scrollbar]:hidden
                "
                style={{
                    WebkitOverflowScrolling: "touch",
                }}
            >
                {TABS.map((t) => {
                    const isActive = active === t.key;
                    const Icon = t.icon;
                    const count =
                        t.showCount === "questions"
                            ? counts?.questions
                            : t.showCount === "images"
                                ? counts?.images
                                : t.showCount === "community"
                                    ? counts?.community
                                    : undefined;

                    return (
                        <button
                            key={t.key}
                            ref={isActive ? activeBtnRef : null}
                            onClick={() => handleTabTap(t.key)}
                            className={`
                                relative flex items-center justify-center gap-1.5 xs:gap-2 py-3
                                flex-shrink-0 snap-start
                                min-w-[104px] px-3
                                sm:flex-1 sm:min-w-0 sm:px-0
                                transition-colors
                                ${isActive
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-gray-500 dark:text-[#8b949e] hover:text-gray-700 dark:hover:text-[#e6edf3]"
                                }
                            `}
                            aria-current={isActive ? "page" : undefined}
                        >
                            <Icon
                                size={19}
                                strokeWidth={2.2}
                                className="flex-shrink-0"
                            />

                            {/* Full label on wider screens, short on very small */}
                            <span className="hidden xs:inline text-[13.5px] font-semibold leading-none">
                                {t.label}
                            </span>
                            <span className="xs:hidden text-[12px] font-semibold leading-none">
                                {t.shortLabel}
                            </span>

                            {typeof count === "number" && count > 0 && (
                                <span
                                    className={`ml-0.5 text-[10.5px] font-bold tabular-nums px-1.5 py-[1px] rounded-full leading-none ${isActive
                                        ? "bg-blue-100 dark:bg-[#0d1c2e] text-blue-700 dark:text-blue-300"
                                        : "bg-gray-100 dark:bg-[#161b22] text-gray-600 dark:text-[#8b949e]"
                                        }`}
                                >
                                    {count > 99 ? "99+" : count}
                                </span>
                            )}

                            {/* Active underline — bigger to match bigger tab */}
                            {isActive && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] w-10 rounded-full bg-blue-600 dark:bg-blue-400" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Fade edge — mobile only, hints at scrollable content */}
            <div
                className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 sm:hidden
                    bg-gradient-to-l from-white dark:from-[#0d1117] to-transparent"
                aria-hidden
            />
        </div>
    );
}