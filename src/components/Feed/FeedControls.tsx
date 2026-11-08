"use client";

import React, { useMemo } from "react";
import { Star, Zap, Sparkles, Trophy, Crown, Coins } from "lucide-react";

type Props = {
    questionCount: number;
    userTokens?: number;   // from profiles.tokens
    user?: any;
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

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    Starter: { bg: "bg-slate-100 dark:bg-[#161b22]", text: "text-slate-600 dark:text-[#8b949e]", label: "Starter" },
    Rising: { bg: "bg-blue-50 dark:bg-[#0d1c2e]", text: "text-blue-600 dark:text-blue-400", label: "Rising" },
    Skilled: { bg: "bg-purple-50 dark:bg-[#1a0d24]", text: "text-purple-600 dark:text-purple-400", label: "Skilled" },
    Expert: { bg: "bg-orange-50 dark:bg-[#241208]", text: "text-orange-600 dark:text-orange-400", label: "Expert" },
    Legend: { bg: "bg-amber-50 dark:bg-[#241d0b]", text: "text-amber-700 dark:text-amber-400", label: "Legend" },
};

const LOG_MAX = Math.log1p(MILESTONES[MILESTONES.length - 1].value);
const LOG_MIN = Math.log1p(1);
const logPositionPct = (value: number) => {
    const v = Math.max(1, value);
    return ((Math.log1p(v) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
};

export default function FeedControls({
    questionCount,
    userTokens = 0,
    user,
}: Props) {
    const { progress, stepProgress, remaining, currentTier, xpUntilNext } = useMemo(() => {
        const nextIdx = MILESTONES.findIndex((m) => m.value > questionCount);
        const nextM = nextIdx === -1 ? MILESTONES[MILESTONES.length - 1] : MILESTONES[nextIdx];
        const prevM = nextIdx <= 0 ? { value: 0 } : MILESTONES[nextIdx - 1];

        const overall = Math.min(100, Math.max(0, logPositionPct(questionCount)));
        const stepSpan = nextM.value - prevM.value || 1;
        const stepPct = Math.min(100, Math.max(0, ((questionCount - prevM.value) / stepSpan) * 100));

        const reached = [...MILESTONES].reverse().find((m) => m.value <= questionCount);
        const tier = reached?.tier ?? "Starter";

        const remainder = questionCount % 10;
        const xpLeft = remainder === 0 ? 10 : 10 - remainder;

        return {
            progress: Math.round(overall * 10) / 10,
            stepProgress: Math.round(stepPct),
            remaining: Math.max(0, nextM.value - questionCount),
            currentTier: tier,
            xpUntilNext: xpLeft,
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

    const clampedProgress = Math.max(progress, 0.5);

    return (
        <div className="w-full bg-white dark:bg-[#0d1117]">
            <div className="mx-auto w-full">
                <div className="flex flex-col gap-1.5 px-3 py-2 sm:px-4 sm:py-3">
                    {/* ROW 1: message · tier · XP badge */}
                    <div className="flex flex-nowrap items-center gap-x-1.5 gap-y-0">
                        <p className="min-w-0 shrink truncate text-[13px] font-semibold leading-tight text-gray-900 dark:text-[#e6edf3]">
                            {message}
                        </p>

                        <span
                            className={`shrink-0 rounded-full px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide ${tierStyle.bg} ${tierStyle.text}`}
                        >
                            {tierStyle.label}
                        </span>

                        {/* XP badge — always visible */}
                        <div className="ml-auto flex shrink-0 items-center gap-1 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-[#241d0b] dark:to-[#2a1f0a] px-2 py-1 rounded-full">
                            <Coins size={11} className="text-amber-600 dark:text-amber-400" />
                            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 tabular-nums">
                                {userTokens}
                            </span>
                            <span className="text-[9px] font-semibold uppercase text-amber-700 dark:text-amber-400/80">
                                XP
                            </span>
                        </div>
                    </div>

                    {/* ROW 2: progress bar */}
                    <div className="relative -mt-2 h-4">
                        <div className="absolute inset-x-0 top-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-[#21262d]">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 transition-[width] duration-700 ease-out"
                                style={{ width: `${clampedProgress}%` }}
                            />
                        </div>
                        <div
                            className="pointer-events-none absolute -top-0.5 -translate-x-1/2 transition-[left] duration-700 ease-out"
                            style={{ left: `${clampedProgress}%` }}
                        >
                            <div className="flex flex-col items-center">
                                <span className="whitespace-nowrap rounded-full bg-orange-500 px-1.5 py-[1px] text-[8.5px] font-bold leading-none text-white tabular-nums">
                                    {remaining > 0 ? `${stepProgress}%` : "🏆"}
                                </span>
                                <div className="-mt-[1px] h-2 w-2 rounded-full border-2 border-white bg-orange-500 dark:border-[#0d1117]" />
                            </div>
                        </div>
                    </div>

                    {/* ROW 3: counter + XP-to-next + milestone ticks */}
                    <div className="relative -mt-2 h-4 w-full text-[10.5px] tabular-nums">
                        <div className="absolute inset-y-0 left-0 z-10 flex items-center gap-1 bg-white dark:bg-[#0d1117] pr-2 text-gray-500 dark:text-[#8b949e]">
                            <span className="font-semibold text-gray-700 dark:text-[#e6edf3]">
                                {questionCount.toLocaleString()}
                            </span>
                            <span>tried</span>
                            <span className="text-gray-300 dark:text-[#30363d]">·</span>
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                {xpUntilNext} to next XP
                            </span>
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
                                const transformClass = isFirst || isLast ? "translate-x-0" : "-translate-x-1/2";

                                return (
                                    <span
                                        key={m.value}
                                        className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[8.5px] tabular-nums transition-colors ${transformClass} ${reached ? "font-semibold text-orange-500" : "font-medium text-gray-400 dark:text-[#8b949e]"} ${!isKey ? "hidden sm:inline" : ""}`}
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