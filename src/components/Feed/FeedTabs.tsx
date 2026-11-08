"use client";

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

const TABS: {
    key: FeedTab;
    label: string;
    shortLabel: string;
    icon: typeof MessageSquare;
    showCount?: "questions" | "images" | "community";
}[] = [
        {
            key: "questions",
            label: "Questions",
            shortLabel: "Quiz",
            icon: MessageSquare,
            showCount: "questions",
        },
        {
            key: "community",
            label: "Community",
            shortLabel: "Community",
            icon: Users,
            showCount: "community",
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
    return (
        <div className="w-full bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-md">
            <div className="flex w-full max-w-4xl mx-auto">
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
                            onClick={() => onChange(t.key)}
                            className={`relative flex-1 flex items-center justify-center gap-1 xs:gap-1.5 py-2.5 transition-colors ${isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-500 dark:text-[#8b949e] hover:text-gray-700 dark:hover:text-[#e6edf3]"
                                }`}
                            aria-current={isActive ? "page" : undefined}
                        >
                            <Icon size={16} strokeWidth={2.2} className="flex-shrink-0" />

                            {/* Full label on wider screens, short on very small */}
                            <span className="hidden xs:inline text-[12.5px] font-semibold leading-none">
                                {t.label}
                            </span>
                            <span className="xs:hidden text-[10.5px] font-semibold leading-none">
                                {t.shortLabel}
                            </span>

                            {typeof count === "number" && count > 0 && (
                                <span
                                    className={`ml-0.5 text-[9.5px] font-bold tabular-nums px-1 py-[0.5px] rounded-full leading-none ${isActive
                                        ? "bg-blue-100 dark:bg-[#0d1c2e] text-blue-700 dark:text-blue-300"
                                        : "bg-gray-100 dark:bg-[#161b22] text-gray-600 dark:text-[#8b949e]"
                                        }`}
                                >
                                    {count > 99 ? "99+" : count}
                                </span>
                            )}

                            {/* Active underline */}
                            {isActive && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] w-8 rounded-full bg-blue-600 dark:bg-blue-400" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}