"use client";

import { motion } from "framer-motion";
import { SearchX, Sparkles, RefreshCw } from "lucide-react";

type Variant = "filter" | "search" | "updating";

interface Props {
    variant: Variant;
    /** What the user typed in search (only used for variant="search") */
    query?: string;
    /** Called when user taps "Clear filters" or "Try again" */
    onReset: () => void;
}

const COPY: Record<Variant, { icon: typeof SearchX; title: string; sub: string; cta: string }> = {
    filter: {
        icon: SearchX,
        title: "Nothing here yet",
        sub: "No units match this category. Try another, or show everything.",
        cta: "Show all units",
    },
    search: {
        icon: SearchX,
        title: "No results",
        sub: "",  // filled in dynamically with the query
        cta: "Clear search",
    },
    updating: {
        icon: Sparkles,
        title: "Fresh updates incoming",
        sub: "Our team is adding new units. Check back soon.",
        cta: "Refresh",
    },
};

export function EmptyState({ variant, query, onReset }: Props) {
    const { icon: Icon, title, sub, cta } = COPY[variant];

    const finalSub =
        variant === "search" && query
            ? `Nothing matched "${query}". Try a different word.`
            : sub;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center justify-center text-center py-14 px-6 select-none"
        >
            {/* ── Icon bubble — animated pulse ring ── */}
            <div className="relative mb-5">
                <span className="absolute inset-0 rounded-full bg-blue-500/15 blur-xl scale-150 pointer-events-none" />
                <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-16 h-16 rounded-2xl
                        bg-gradient-to-br from-blue-500 to-indigo-600
                        flex items-center justify-center shadow-lg shadow-blue-500/25"
                >
                    <Icon className="w-7 h-7 text-white" strokeWidth={2.2} />
                </motion.div>
            </div>

            {/* ── Title ── */}
            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                {title}
            </h3>

            {/* ── Subtext ── */}
            <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-[280px]">
                {finalSub}
            </p>

            {/* ── CTA ── */}
            <button
                onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(20);
                    onReset();
                }}
                className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-xl
                    bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                    text-white text-[13px] font-bold
                    transition-colors touch-manipulation
                    shadow-sm shadow-blue-500/20"
            >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.5} />
                {cta}
            </button>
        </motion.div>
    );
}