"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Crown, Star, Zap, Sparkles } from "lucide-react";

type Props = {
    questionCount: number;
    session: any;
    supabase: any;
    setFeedImages: (val: any) => void;
    setQuestions: (val: any) => void;
    setAnswers: (val: any) => void;
    setQuestionCount: (val: number) => void;
    user: any;
};

const MILESTONES = [
    { value: 100, label: "100", tier: "Starter", icon: Star },
    { value: 200, label: "200", tier: "Starter", icon: Star },
    { value: 300, label: "300", tier: "Starter", icon: Star },
    { value: 400, label: "400", tier: "Starter", icon: Star },
    { value: 500, label: "500", tier: "Rising", icon: Zap },
    { value: 1000, label: "1K", tier: "Rising", icon: Zap },
    { value: 2000, label: "2K", tier: "Rising", icon: Zap },
    { value: 3000, label: "3K", tier: "Skilled", icon: Sparkles },
    { value: 4000, label: "4K", tier: "Skilled", icon: Sparkles },
    { value: 5000, label: "5K", tier: "Expert", icon: Trophy },
    { value: 7500, label: "7.5K", tier: "Expert", icon: Trophy },
    { value: 10000, label: "10K", tier: "Legend", icon: Crown },
];

const KEY_MILESTONES = [100, 500, 1000, 5000, 10000];

const TIER_STYLES: Record<
    string,
    { bg: string; text: string; label: string }
> = {
    Starter: {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-600 dark:text-slate-300",
        label: "Starter",
    },
    Rising: {
        bg: "bg-blue-50 dark:bg-blue-500/10",
        text: "text-blue-600 dark:text-blue-300",
        label: "Rising",
    },
    Skilled: {
        bg: "bg-purple-50 dark:bg-purple-500/10",
        text: "text-purple-600 dark:text-purple-300",
        label: "Skilled",
    },
    Expert: {
        bg: "bg-orange-50 dark:bg-orange-500/10",
        text: "text-orange-600 dark:text-orange-300",
        label: "Expert",
    },
    Legend: {
        bg: "bg-amber-50 dark:bg-amber-500/10",
        text: "text-amber-700 dark:text-amber-300",
        label: "Legend",
    },
};

const LOG_MAX = Math.log1p(MILESTONES[MILESTONES.length - 1].value);
const LOG_MIN = Math.log1p(1);

const logPositionPct = (value: number) => {
    const v = Math.max(1, value);
    return ((Math.log1p(v) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
};

export default function FeedControls({
    questionCount,
    session,
    supabase,
    setFeedImages,
    setQuestions,
    setAnswers,
    setQuestionCount,
    user,
}: Props) {
    const [busy, setBusy] = useState<null | "images" | "questions">(null);

    const { next, progress, stepProgress, remaining, currentTier } = useMemo(() => {
        const nextIdx = MILESTONES.findIndex((m) => m.value > questionCount);
        const nextM =
            nextIdx === -1 ? MILESTONES[MILESTONES.length - 1] : MILESTONES[nextIdx];
        const prevM = nextIdx <= 0 ? { value: 0 } : MILESTONES[nextIdx - 1];

        const overall = Math.min(100, Math.max(0, logPositionPct(questionCount)));
        const stepSpan = nextM.value - prevM.value || 1;
        const stepPct = Math.min(
            100,
            Math.max(0, ((questionCount - prevM.value) / stepSpan) * 100)
        );

        const reached = [...MILESTONES].reverse().find((m) => m.value <= questionCount);
        const tier = reached?.tier ?? "Starter";

        return {
            next: nextM,
            progress: Math.round(overall * 10) / 10,
            stepProgress: Math.round(stepPct),
            remaining: Math.max(0, nextM.value - questionCount),
            currentTier: tier,
        };
    }, [questionCount]);

    const tierStyle = TIER_STYLES[currentTier];

    const message = useMemo(() => {
        if (questionCount === 0) return "Ready when you are";
        if (questionCount < 100) return "Great start";
        if (questionCount < 500) return "Warming up";
        if (questionCount < 1000) return "Solid grind";
        if (questionCount < 3000) return "You're on fire";
        if (questionCount < 5000) return "Crushing it";
        if (questionCount < 10000) return "Elite territory";
        return "Legend status";
    }, [questionCount]);

    const handleResetImages = async () => {
        const ok = window.confirm("Reset all seen images? This cannot be undone.");
        if (!ok) return;
        const userId = session?.user?.id;
        if (!userId) return;
        try {
            setBusy("images");
            await supabase.from("seen_images").delete().eq("user_id", userId);
            const { data: newImages } = await supabase
                .from("qfeed_images")
                .select("*")
                .order("created_at", { ascending: true });
            setFeedImages(newImages);
        } finally {
            setBusy(null);
        }
    };

    const handleResetQuestions = async () => {
        const ok = window.confirm("Reset all seen questions? This cannot be undone.");
        if (!ok) return;
        const userId = session?.user?.id;
        if (!userId) return;
        try {
            setBusy("questions");
            await supabase.from("qfeed_seen").delete().eq("user_id", userId);
            localStorage.removeItem(`feed_questions_${userId}`);
            localStorage.removeItem(`feed_answers_${userId}`);
            localStorage.removeItem(`feed_count_${userId}`);
            setQuestions([]);
            setAnswers({});
            setQuestionCount(0);
        } finally {
            setBusy(null);
        }
    };

    const clampedProgress = Math.max(progress, 0.5);

    return (
        <div
            className="
                w-full
                rounded-2xl sm:rounded-xl
                bg-white dark:bg-muted/100
                border-0
                overflow-visible
            "
        >
            <div className="mx-auto w-full">
                <div className="flex flex-col gap-1.5 px-3 py-2 sm:px-4 sm:py-3">

                    {/* ── ROW 1: message · tier · buttons (single row) ── */}
                    <div className="flex flex-nowrap items-center gap-x-1.5 gap-y-0">
                        <p className="min-w-0 shrink truncate text-[13px] font-semibold leading-tight text-gray-900 dark:text-gray-100">
                            {message}
                        </p>

                        <span
                            className={`shrink-0 rounded-full px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide ${tierStyle.bg} ${tierStyle.text}`}
                        >
                            {tierStyle.label}
                        </span>

                        <div className="ml-auto flex shrink-0 items-center gap-1">
                            <Button
                                size="sm"
                                disabled={busy !== null}
                                onClick={handleResetImages}
                                className="h-6 cursor-pointer rounded-md border-0 bg-blue-500 px-1.5 text-[10px] font-semibold text-white shadow-none hover:bg-blue-600 active:scale-[0.98] disabled:opacity-60"
                            >
                                {busy === "images" ? "Resetting…" : "Reset Images"}
                            </Button>

                            <Button
                                size="sm"
                                disabled={busy !== null}
                                onClick={handleResetQuestions}
                                className="h-6 cursor-pointer rounded-md border-0 bg-red-500 px-1.5 text-[10px] font-semibold text-white shadow-none hover:bg-red-600 active:scale-[0.98] disabled:opacity-60"
                            >
                                {busy === "questions" ? "Resetting…" : "Reset Questions"}
                            </Button>
                        </div>
                    </div>

                    {/* ── ROW 2: progress bar with % head-dot ── */}
                    <div className="relative mt-1 h-5">
                        <div className="absolute inset-x-0 top-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 transition-[width] duration-700 ease-out"
                                style={{ width: `${clampedProgress}%` }}
                            />
                        </div>

                        {/* Head dot + % label */}
                        <div
                            className="pointer-events-none absolute top-0 -translate-x-1/2 transition-[left] duration-700 ease-out"
                            style={{ left: `${clampedProgress}%` }}
                        >
                            <div className="flex flex-col items-center">
                                <span className="whitespace-nowrap rounded-full bg-orange-500 px-1.5 py-[1px] text-[8.5px] font-bold leading-none text-white tabular-nums">
                                    {remaining > 0 ? `${stepProgress}%` : "🏆"}
                                </span>
                                <div className="-mt-[1px] h-2 w-2 rounded-full border-2 border-white bg-orange-500 dark:border-gray-950" />
                            </div>
                        </div>
                    </div>

                    {/* ── ROW 3: counter + milestone ticks ── */}
                    <div className="relative mt-1 h-4 w-full text-[10.5px] tabular-nums">
                        <div className="absolute inset-y-0 left-0 z-10 flex items-center gap-1 bg-white dark:bg-muted/100 pr-2 text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                                {questionCount.toLocaleString()}
                            </span>
                            <span>tried</span>
                        </div>

                        <div className="absolute inset-y-0 left-0 right-0">
                            {MILESTONES.map((m, idx) => {
                                const reached = questionCount >= m.value;
                                const leftPct = logPositionPct(m.value);
                                const isKey = KEY_MILESTONES.includes(m.value);
                                const isFirst = idx === 0;
                                const isLast = idx === MILESTONES.length - 1;

                                const positionStyle = isFirst
                                    ? { left: 0 }
                                    : isLast
                                        ? { right: 0 }
                                        : { left: `${leftPct}%` };

                                const transformClass = isFirst || isLast
                                    ? "translate-x-0"
                                    : "-translate-x-1/2";

                                return (
                                    <span
                                        key={m.value}
                                        className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[8.5px] tabular-nums transition-colors ${transformClass} ${reached
                                            ? "font-semibold text-orange-500"
                                            : "font-medium text-gray-400 dark:text-gray-600"
                                            } ${!isKey ? "hidden sm:inline" : ""}`}
                                        style={positionStyle}
                                    >
                                        {m.label}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}