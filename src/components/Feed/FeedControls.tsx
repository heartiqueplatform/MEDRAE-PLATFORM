"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Eraser, RefreshCw, Flame, Sparkles, Trophy, Crown, Star, Zap } from "lucide-react";

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

/* ── Milestone ladder: 100 → 10,000 ── */
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

/* Tier colors */
const TIER_STYLES: Record<string, { bg: string; text: string; ring: string; label: string }> = {
    Starter: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", ring: "ring-slate-300 dark:ring-slate-600", label: "Starter" },
    Rising: { bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-300", ring: "ring-blue-300 dark:ring-blue-500", label: "Rising" },
    Skilled: { bg: "bg-purple-100 dark:bg-purple-500/20", text: "text-purple-600 dark:text-purple-300", ring: "ring-purple-300 dark:ring-purple-500", label: "Skilled" },
    Expert: { bg: "bg-orange-100 dark:bg-orange-500/20", text: "text-orange-600 dark:text-orange-300", ring: "ring-orange-300 dark:ring-orange-500", label: "Expert" },
    Legend: { bg: "bg-yellow-100 dark:bg-yellow-500/20", text: "text-yellow-700 dark:text-yellow-300", ring: "ring-yellow-300 dark:ring-yellow-500", label: "Legend" },
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
    /* ── Compute current tier, next milestone, progress ── */
    const { next, prev, progress, remaining, currentTier } = useMemo(() => {
        const nextIdx = MILESTONES.findIndex((m) => m.value > questionCount);
        const nextM = nextIdx === -1 ? MILESTONES[MILESTONES.length - 1] : MILESTONES[nextIdx];
        const prevM = nextIdx <= 0 ? { value: 0 } : MILESTONES[nextIdx - 1];
        const span = nextM.value - prevM.value || 1;
        const pct = Math.min(100, Math.round(((questionCount - prevM.value) / span) * 100));

        // Current tier = last milestone reached, or "Starter" if none
        const reached = [...MILESTONES].reverse().find((m) => m.value <= questionCount);
        const tier = reached?.tier ?? "Starter";

        return {
            next: nextM,
            prev: prevM,
            progress: pct,
            remaining: Math.max(0, nextM.value - questionCount),
            currentTier: tier,
        };
    }, [questionCount]);

    const tierStyle = TIER_STYLES[currentTier];
    const TierIcon = MILESTONES.find((m) => m.tier === currentTier)?.icon ?? Star;

    /* ── Encouraging message ── */
    const message = useMemo(() => {
        if (questionCount === 0) return "Ready when you are. Let's get started! 🚀";
        if (questionCount < 100) return "Great start — keep the momentum going! 💪";
        if (questionCount < 500) return "You're warming up nicely. Keep going! 🔥";
        if (questionCount < 1000) return "Solid grind. 1K is within reach! ⚡";
        if (questionCount < 3000) return "You're on fire. 3K coming up! 🌟";
        if (questionCount < 5000) return "Crushing it. 5K is yours! 🏆";
        if (questionCount < 10000) return "Elite territory. 10K awaits! 👑";
        return "Legend status. You've mastered the feed! 🎉";
    }, [questionCount]);

    return (
        <div className="w-full rounded-2xl bg-gray-50 dark:bg-muted/90 p-4 sm:p-5">
            <div className="flex flex-col gap-4">

                {/* ── HEADER: Tier badge + human message ── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-snug flex items-start gap-2">
                                <span className="min-w-0">{message}</span>
                                <TierIcon
                                    className={`${tierStyle.text} flex-shrink-0 mt-0.5`}
                                    size={18}
                                />
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span className={`font-semibold ${tierStyle.text}`}>{tierStyle.label}</span>
                                {" · "}
                                <span className="font-semibold text-gray-700 dark:text-gray-200">{questionCount}</span> tried
                                {remaining > 0 && (
                                    <> · <span className="font-semibold text-gray-700 dark:text-gray-200">{remaining}</span> to {next.label}</>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Sparkles size={16} className="text-yellow-500" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            Next: <span className="font-semibold">{next.label}</span>
                        </span>
                    </div>
                </div>

                {/* ── PROGRESS BAR ── */}
                <div className="relative">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Milestone ticks — only show key ones on mobile, all on desktop */}
                    <div className="mt-2 flex justify-between text-[10px] font-medium text-gray-400 dark:text-gray-500">
                        {MILESTONES.map((m) => {
                            const reached = questionCount >= m.value;
                            return (
                                <span
                                    key={m.value}
                                    className={`${reached ? "text-orange-500 font-semibold" : ""
                                        } ${m.value >= 1000 ? "hidden sm:inline" : ""}`}
                                >
                                    {m.label}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {/* ── TIER LEGEND (subtle, collapsible feel) ── */}
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    {Object.entries(TIER_STYLES).map(([key, style]) => {
                        const active = currentTier === key;
                        const minVal = MILESTONES.find((m) => m.tier === key)?.value ?? 0;
                        return (
                            <span
                                key={key}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium transition ${active
                                    ? `${style.bg} ${style.text} ring-1 ${style.ring}`
                                    : "text-gray-400 dark:text-gray-500"
                                    }`}
                            >
                                {style.label}
                                <span className="opacity-60">{minVal >= 1000 ? `${minVal / 1000}K` : minVal}</span>
                            </span>
                        );
                    })}
                </div>

                {/* ── ACTION BUTTONS: no borders, distinct colors ── */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Reset Images — blue */}
                    <Button
                        size="sm"
                        className="flex items-center gap-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.98] border-0 shadow-none"
                        onClick={async () => {
                            const confirmed = window.confirm(
                                "Reset all seen images? This cannot be undone."
                            );
                            if (!confirmed) return;

                            const userId = session?.user?.id;
                            if (!userId) return;

                            await supabase.from("seen_images").delete().eq("user_id", userId);

                            const { data: newImages } = await supabase
                                .from("qfeed_images")
                                .select("*")
                                .order("created_at", { ascending: true });

                            setFeedImages(newImages);
                            alert("Images reset complete!");
                        }}
                    >
                        <RotateCcw size={16} />
                        <span className="text-sm">Reset Images</span>
                    </Button>

                    {/* Reset Questions — red */}
                    <Button
                        size="sm"
                        className="flex items-center gap-2 rounded-lg bg-red-500 text-white hover:bg-red-600 active:scale-[0.98] border-0 shadow-none"
                        onClick={async () => {
                            const confirmed = window.confirm(
                                "Reset all seen questions? This cannot be undone."
                            );
                            if (!confirmed) return;

                            const userId = session?.user?.id;
                            if (!userId) return;

                            await supabase
                                .from("qfeed_seen")
                                .delete()
                                .eq("user_id", userId);

                            localStorage.removeItem(`feed_questions_${userId}`);
                            localStorage.removeItem(`feed_answers_${userId}`);
                            localStorage.removeItem(`feed_count_${userId}`);

                            setQuestions([]);
                            setAnswers({});
                            setQuestionCount(0);

                            alert("Questions reset complete!");
                        }}
                    >
                        <Eraser size={16} />
                        <span className="text-sm">Reset Questions</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}