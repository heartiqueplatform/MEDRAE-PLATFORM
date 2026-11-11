// src/components/Algorithm.tsx
"use client";

import { useEffect, useState, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Brain,
    Target,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    PlayCircle,
    LineChart as LineChartIcon,
    BarChart3,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
    MiniChampion,
    MiniCoach,
    SproutMascot,
} from "@/components/Algorithm/Mascots";
import { CoachInsightsOverlay } from "@/components/Algorithm/CoachInsightsOverlay";
import type { UnitData, RankingItem } from "@/components/Algorithm/types";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = () => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    vibrate(15);
};

interface AlgorithmData {
    user_id: string;
    overall_prediction: { predicted_score: number; readiness: string; };
    unit_predictions: UnitData[];
    simulation_analysis: { attempts: number; average_score: number; };
    rankings: { strongest: RankingItem[]; weakest: RankingItem[]; };
    recommendations: string[];
    confidence_data: { confidence: string; updated_at: string; };
    last_updated: string;
    score_history?: number[];
}

/* ------------------------------------------------------------------ */
/*  Skeleton — GitHub palette, matches real card shape                */
/* ------------------------------------------------------------------ */

function AlgorithmSkeleton() {
    return (
        <div className="w-full space-y-3 px-1">
            {/* Hero card skeleton */}
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 md:p-4 space-y-3 animate-pulse">
                <div className="h-5 w-32 bg-slate-200 dark:bg-white/[0.1] rounded-full" />
                <div className="h-16 w-40 bg-slate-200 dark:bg-white/[0.1] rounded-xl" />
                <div className="h-5 w-24 bg-slate-200 dark:bg-white/[0.1] rounded-full" />
                <div className="h-4 w-2/3 bg-slate-200 dark:bg-white/[0.1] rounded" />
                <div className="h-[140px] w-full bg-slate-200 dark:bg-white/[0.06] rounded-xl" />
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="h-10 bg-slate-200 dark:bg-white/[0.1] rounded-xl" />
                    <div className="h-10 bg-slate-200 dark:bg-white/[0.1] rounded-xl" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-1.5">
                            <div className="h-5 w-10 mx-auto bg-slate-200 dark:bg-white/[0.1] rounded" />
                            <div className="h-3 w-16 mx-auto bg-slate-200 dark:bg-white/[0.1] rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Unit mastery carousel skeleton */}
            <div className="flex gap-2 overflow-hidden">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="min-w-[62vw] sm:min-w-[240px] h-[140px]
                                   rounded-2xl bg-white dark:bg-[#161b22] animate-pulse"
                    />
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Tier helpers                                                      */
/* ------------------------------------------------------------------ */

function scoreTier(s: number) {
    if (s >= 70) return "high";
    if (s >= 50) return "medium";
    return "low";
}

function barColorFor(score: number) {
    if (score >= 70) return "#10b981";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
}

/* ------------------------------------------------------------------ */
/*  Horizontal Snap Carousel                                          */
/* ------------------------------------------------------------------ */

function SnapCarousel({
    children,
    itemWidthClass = "w-[48vw] sm:w-[200px]",
}: {
    children: React.ReactNode;
    itemWidthClass?: string;
}) {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);

    const updateArrows = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return;
        setCanLeft(el.scrollLeft > 8);
        setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    }, []);

    useEffect(() => {
        updateArrows();
        const el = scrollerRef.current;
        if (!el) return;
        el.addEventListener("scroll", updateArrows, { passive: true });
        window.addEventListener("resize", updateArrows);
        return () => {
            el.removeEventListener("scroll", updateArrows);
            window.removeEventListener("resize", updateArrows);
        };
    }, [updateArrows, children]);

    const scrollByCards = (dir: 1 | -1) => {
        const el = scrollerRef.current;
        if (!el) return;
        tap();
        const card = el.querySelector<HTMLElement>("[data-card]");
        const amount = (card?.offsetWidth ?? 240) + 12;
        el.scrollBy({ left: dir * amount, behavior: "smooth" });
    };

    return (
        <div className="relative">
            <button
                type="button"
                aria-label="Scroll left"
                onClick={() => scrollByCards(-1)}
                disabled={!canLeft}
                className={`hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20
                            h-8 w-8 items-center justify-center rounded-full
                            bg-white dark:bg-[#161b22]
                            text-slate-700 dark:text-slate-200
                            active:scale-[0.92] transition-transform
                            ${canLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                style={{ touchAction: "manipulation" }}
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <button
                type="button"
                aria-label="Scroll right"
                onClick={() => scrollByCards(1)}
                disabled={!canRight}
                className={`hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20
                            h-8 w-8 items-center justify-center rounded-full
                            bg-white dark:bg-[#161b22]
                            text-slate-700 dark:text-slate-200
                            active:scale-[0.92] transition-transform
                            ${canRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                style={{ touchAction: "manipulation" }}
            >
                <ChevronRight className="h-4 w-4" />
            </button>

            <div
                ref={scrollerRef}
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth
                           px-1 pb-2 -mx-1
                           [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {Array.isArray(children)
                    ? children.map((child, i) => (
                        <div
                            key={i}
                            data-card
                            className={`snap-start shrink-0 ${itemWidthClass}`}
                        >
                            {child}
                        </div>
                    ))
                    : children}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Mastery Dots                                                      */
/* ------------------------------------------------------------------ */

function MasteryDots({ score }: { score: number }) {
    const filled = Math.max(0, Math.min(5, Math.round(score / 20)));
    return (
        <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
                <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${i < filled
                        ? "bg-current"
                        : "bg-slate-200 dark:bg-white/[0.08]"
                        }`}
                />
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Custom CSS Bar Chart                                              */
/* ------------------------------------------------------------------ */

function HugeBarChart({
    data,
}: {
    data: { name: string; fullName: string; score: number; attempts: number; fill: string }[];
}) {
    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    const active = activeIdx !== null ? data[activeIdx] : null;

    return (
        <div className="relative">
            {active && (
                <div
                    className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 z-30
                               rounded-xl bg-white dark:bg-[#161b22] px-3 py-2
                               min-w-[140px] max-w-[200px]"
                >
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                        {active.fullName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: active.fill }}
                        />
                        <span className="text-[11px] font-bold tabular-nums text-slate-600 dark:text-slate-300">
                            {active.score}% avg · {active.attempts}×
                        </span>
                    </div>
                </div>
            )}

            <div
                className="flex gap-3 items-end overflow-x-auto overflow-y-visible pt-14 pb-1 px-1
                           [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                           snap-x snap-mandatory"
                style={{
                    touchAction: "pan-x pan-y",
                    WebkitOverflowScrolling: "touch",
                    overscrollBehaviorX: "contain",
                    overscrollBehaviorY: "auto",
                }}
            >
                {data.map((d, i) => {
                    const heightPct = Math.max(4, Math.min(100, d.score));
                    const isActive = activeIdx === i;
                    return (
                        <button
                            key={i}
                            type="button"
                            onMouseEnter={() => setActiveIdx(i)}
                            onMouseLeave={() => setActiveIdx(null)}
                            onTouchStart={() => setActiveIdx(i)}
                            onClick={() => {
                                tap();
                                setActiveIdx(isActive ? null : i);
                                if (!isActive) {
                                    setTimeout(() => setActiveIdx((cur) => (cur === i ? null : cur)), 3000);
                                }
                            }}
                            className="snap-start shrink-0 flex flex-col items-center gap-1.5 w-[58px] outline-none"
                            style={{ touchAction: "manipulation" }}
                            aria-label={`${d.fullName}: ${d.score}%`}
                        >
                            <span
                                className="text-[11px] font-bold tabular-nums leading-none transition-opacity"
                                style={{ color: d.fill, opacity: isActive ? 1 : 0.85 }}
                            >
                                {d.score}%
                            </span>

                            <div className="relative w-full h-[140px] flex items-end">
                                <div
                                    className={`w-full rounded-t-lg transition-all duration-300 ease-out
                                                ${isActive ? "brightness-110 scale-y-[1.03]" : ""}`}
                                    style={{
                                        height: `${heightPct}%`,
                                        backgroundColor: d.fill,
                                    }}
                                />
                            </div>

                            <span
                                className={`text-[9px] font-semibold truncate w-full text-center
                                            ${isActive
                                        ? "text-slate-900 dark:text-white"
                                        : "text-slate-500 dark:text-slate-400"}`}
                            >
                                {d.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Strengths & Focus                                                 */
/* ------------------------------------------------------------------ */

interface StrengthsFocusStripProps {
    strongest: { value: UnitData }[];
    weakest: { value: UnitData }[];
    onViewAll: () => void;
}

function StrengthsFocusStrip({ strongest, weakest, onViewAll }: StrengthsFocusStripProps) {
    const hasAny = strongest.length > 0 || weakest.length > 0;

    if (!hasAny) {
        return (
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 text-center">
                <div className="flex justify-center mb-1">
                    <SproutMascot size={40} />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Complete a few units to unlock your coach insights
                </p>
            </div>
        );
    }

    const totalCount = strongest.length + weakest.length;

    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2">
            <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1.5">
                    <MiniChampion size={18} />
                    <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Your coach says
                    </h4>
                </div>
                {totalCount > 2 && (
                    <button
                        onClick={() => { tap(); onViewAll(); }}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400
                                   active:text-blue-700 dark:active:text-blue-300 transition-colors"
                        style={{ touchAction: "manipulation" }}
                    >
                        View all ({totalCount}) →
                    </button>
                )}
            </div>

            {strongest.length > 0 && (
                <div className="space-y-1">
                    <div className="flex items-center gap-1 px-0.5">
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            Champion areas
                        </span>
                        <div className="flex-1 h-px bg-slate-200/60 dark:bg-white/[0.06]" />
                    </div>
                    <div className="space-y-1">
                        {strongest.slice(0, 2).map((item, i) => (
                            <motion.button
                                key={`s-${i}`}
                                onClick={() => { tap(); onViewAll(); }}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06, duration: 0.25 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left
                                           bg-emerald-50 dark:bg-emerald-400/10
                                           active:bg-emerald-100 dark:active:bg-emerald-400/20
                                           transition-colors"
                                style={{ touchAction: "manipulation" }}
                            >
                                <div className="shrink-0">
                                    <MiniChampion size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                        {item.value.unit_name}
                                    </p>
                                    <p className="text-[9px] font-medium text-emerald-700 dark:text-emerald-400">
                                        Your best zone
                                    </p>
                                </div>
                                <div className="shrink-0 flex items-center gap-1.5">
                                    <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                                        {item.value.average_score.toFixed(0)}%
                                    </span>
                                    <ChevronRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}

            {weakest.length > 0 && (
                <div className="space-y-1">
                    <div className="flex items-center gap-1 px-0.5">
                        <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                            Needs love
                        </span>
                        <div className="flex-1 h-px bg-slate-200/60 dark:bg-white/[0.06]" />
                    </div>
                    <div className="space-y-1">
                        {weakest.slice(0, 2).map((item, i) => (
                            <motion.button
                                key={`w-${i}`}
                                onClick={() => { tap(); onViewAll(); }}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + i * 0.06, duration: 0.25 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left
                                           bg-rose-50 dark:bg-rose-400/10
                                           active:bg-rose-100 dark:active:bg-rose-400/20
                                           transition-colors"
                                style={{ touchAction: "manipulation" }}
                            >
                                <div className="shrink-0">
                                    <MiniCoach size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                        {item.value.unit_name}
                                    </p>
                                    <p className="text-[9px] font-medium text-rose-700 dark:text-rose-400">
                                        Practice to level up
                                    </p>
                                </div>
                                <div className="shrink-0 flex items-center gap-1.5">
                                    <span className="text-sm font-bold tabular-nums text-rose-700 dark:text-rose-400">
                                        {item.value.average_score.toFixed(0)}%
                                    </span>
                                    <ChevronRight className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function Algorithm() {
    const navigate = useNavigate();
    const [data, setData] = useState<AlgorithmData | null>(null);
    const [loading, setLoading] = useState(true);
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [chartMode, setChartMode] = useState<"line" | "bars">("bars");
    const visibleUnits = 3;

    const loadAlgorithm = useCallback(async () => {
        const cached = localStorage.getItem("medrae_algo_book_cache");
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setData(parsed);
                setLoading(false);
            } catch (e) { /* ignore */ }
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: result, error } = await supabase
            .from("algorithm_predictions")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (!error && result) {
            const parse = (field: any) => {
                if (field == null) return field;
                return typeof field === "string" ? JSON.parse(field) : field;
            };
            const formatted: AlgorithmData = {
                ...result,
                overall_prediction: parse(result.overall_prediction),
                unit_predictions: parse(result.unit_predictions),
                rankings: parse(result.rankings),
                simulation_analysis: parse(result.simulation_analysis),
                recommendations: parse(result.recommendations),
                confidence_data: parse(result.confidence_data),
                score_history: parse(result.score_history) || [],
            };
            setData(formatted);
            localStorage.setItem("medrae_algo_book_cache", JSON.stringify(formatted));
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadAlgorithm(); }, [loadAlgorithm]);

    const units = useMemo(() => data?.unit_predictions || [], [data?.unit_predictions]);
    const visibleUnitsData = useMemo(() => units.slice(0, visibleUnits), [units]);

    const scoreSeries = useMemo(() => {
        if (!data) return [];
        if (Array.isArray(data.score_history) && data.score_history.length >= 2) {
            return data.score_history;
        }
        const u = data.unit_predictions || [];
        if (u.length >= 2) {
            return [...u]
                .sort((a, b) => (a.attempts || 0) - (b.attempts || 0))
                .map(x => Number(x.average_score) || 0);
        }
        const s = data.overall_prediction?.predicted_score;
        return s != null ? [0, s] : [];
    }, [data]);

    const lineChartData = useMemo(() => {
        if (!data) return [];

        if (Array.isArray(data.score_history) && data.score_history.length >= 2) {
            const n = data.score_history.length;
            return data.score_history.map((s, i) => {
                const fromEnd = n - 1 - i;
                const label =
                    fromEnd === 0 ? "Now"
                        : fromEnd === 1 ? "1 ago"
                            : `${fromEnd} ago`;
                return { name: label, score: Number(s.toFixed(1)) };
            });
        }

        const u = data.unit_predictions || [];
        if (u.length >= 2) {
            const sorted = [...u]
                .sort((a, b) => (a.attempts || 0) - (b.attempts || 0))
                .map(x => Number(x.average_score) || 0);
            return sorted.map((s, i) => {
                const label =
                    i === 0 ? "Start"
                        : i === sorted.length - 1 ? "Now"
                            : `Step ${i}`;
                return { name: label, score: Number(s.toFixed(1)) };
            });
        }

        const s = data.overall_prediction?.predicted_score;
        if (s != null) {
            return [
                { name: "Start", score: 0 },
                { name: "Now", score: Number(s.toFixed(1)) },
            ];
        }
        return [];
    }, [data]);

    const barData = useMemo(() => {
        const u = data?.unit_predictions || [];
        return u.map(x => ({
            name: x.unit_name.length > 8 ? x.unit_name.slice(0, 8) + "…" : x.unit_name,
            fullName: x.unit_name,
            score: Math.round(Number(x.average_score) || 0),
            attempts: x.attempts || 0,
            fill: barColorFor(Number(x.average_score) || 0),
            tier: scoreTier(Number(x.average_score) || 0),
        }));
    }, [data]);

    const handleUnitClick = useCallback(
        (unitId: string) => {
            tap();
            navigate(`/Medrae-quizzes?unit=${unitId}`);
        },
        [navigate]
    );

    if (loading && !data) return <AlgorithmSkeleton />;
    if (!data) return null;

    const score = data.overall_prediction?.predicted_score ?? 0;
    const readiness = data.overall_prediction?.readiness ?? "Not Available";
    const isHighScore = score >= 70;
    const isMediumScore = score >= 50 && score < 70;

    const tier =
        isHighScore ? "high" : isMediumScore ? "medium" : "low";
    const accent =
        tier === "high"
            ? {
                bg: "bg-emerald-50 dark:bg-emerald-400/10",
                text: "text-emerald-700 dark:text-emerald-400",
                bar: "bg-emerald-600",
                stroke: "#10b981",
            }
            : tier === "medium"
                ? {
                    bg: "bg-amber-50 dark:bg-amber-400/10",
                    text: "text-amber-700 dark:text-amber-400",
                    bar: "bg-amber-500",
                    stroke: "#f59e0b",
                }
                : {
                    bg: "bg-rose-50 dark:bg-rose-400/10",
                    text: "text-rose-700 dark:text-rose-400",
                    bar: "bg-rose-600",
                    stroke: "#ef4444",
                };

    return (
        <div className="w-full space-y-3 px-1">
            {/* ── HERO CARD ──────────────────────────────────────── */}
            <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                {/* Score section */}
                <div className="p-4 md:p-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <Brain className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                            <span className="text-[10px] font-bold uppercase tracking-wider
                                             text-slate-500 dark:text-slate-400">
                                Exam prediction readiness
                            </span>
                        </div>
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-5xl font-bold tabular-nums leading-none tracking-tight
                                             text-slate-900 dark:text-white">
                                {score.toFixed(1)}
                            </span>
                            <span className="text-2xl font-normal text-slate-500 dark:text-slate-400">
                                %
                            </span>
                        </div>
                        <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1
                                         ${accent.bg} ${accent.text}
                                         text-[11px] font-bold`}>
                            {readiness} readiness
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                            {isHighScore
                                ? "Strong performance — keep it up"
                                : isMediumScore
                                    ? "On track — a few more sessions to peak"
                                    : "Focus on weak units to raise this score"}
                        </p>
                    </div>
                </div>

                {/* Chart panel */}
                {(scoreSeries.length >= 2 || barData.length >= 1) && (
                    <div className="px-3 md:px-6 pb-3">
                        <div className={`rounded-xl p-3 ${accent.bg}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider
                                                 text-slate-500 dark:text-slate-400">
                                    {chartMode === "bars" ? "Unit performance" : "Score trend"}
                                </span>
                                <div className="flex items-center gap-0.5 rounded-full
                                                bg-white dark:bg-white/[0.06] p-0.5">
                                    <button
                                        onClick={() => { tap(); setChartMode("bars"); }}
                                        aria-label="Bar chart"
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full
                                                    text-[10px] font-bold transition-colors
                                                    ${chartMode === "bars"
                                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                                : "text-slate-500 dark:text-slate-400"}`}
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <BarChart3 className="h-3 w-3" />
                                        Bars
                                    </button>
                                    <button
                                        onClick={() => { tap(); setChartMode("line"); }}
                                        aria-label="Line chart"
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full
                                                    text-[10px] font-bold transition-colors
                                                    ${chartMode === "line"
                                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                                : "text-slate-500 dark:text-slate-400"}`}
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <LineChartIcon className="h-3 w-3" />
                                        Line
                                    </button>
                                </div>
                            </div>

                            {chartMode === "line" && scoreSeries.length >= 2 && (
                                <div className="w-full h-[200px]" style={{ touchAction: "pan-y" }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={lineChartData}
                                            margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                                        >
                                            <defs>
                                                <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={accent.stroke} stopOpacity={0.35} />
                                                    <stop offset="100%" stopColor={accent.stroke} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="currentColor"
                                                className="text-slate-200 dark:text-white/[0.06]"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 10, fill: "#94a3b8" }}
                                                axisLine={false}
                                                tickLine={false}
                                                interval="preserveStartEnd"
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                tick={{ fontSize: 10, fill: "#94a3b8" }}
                                                axisLine={false}
                                                tickLine={false}
                                                width={40}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: 10,
                                                    border: "none",
                                                    fontSize: 12,
                                                    padding: "8px 10px",
                                                    backgroundColor: "rgba(255,255,255,0.98)",
                                                    color: "#0f172a",
                                                }}
                                                labelStyle={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}
                                                formatter={(value: number) => [`${value}%`, "Score"]}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="score"
                                                stroke={accent.stroke}
                                                strokeWidth={2.5}
                                                fill="url(#scoreFill)"
                                                dot={{ r: 3, fill: accent.stroke }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {chartMode === "bars" && barData.length > 0 && (
                                <HugeBarChart data={barData} />
                            )}

                            {chartMode === "bars" && (
                                <div className="flex items-center justify-center gap-3 mt-2 text-[9px] font-bold">
                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        70%+
                                    </span>
                                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                                        50–69%
                                    </span>
                                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                                        &lt;50%
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions + stats */}
                <div className="px-4 md:px-6 pb-4 md:pb-6">
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                        <button
                            onClick={() => { tap(); navigate("/Medrae-quizzes"); }}
                            className="h-10 rounded-xl bg-slate-900 dark:bg-white
                                       text-white dark:text-slate-900
                                       text-sm font-bold
                                       flex items-center justify-center gap-1.5
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <PlayCircle className="h-4 w-4" />
                            Practice
                        </button>
                        <button
                            onClick={() => { tap(); navigate("/simulation/latest"); }}
                            className="h-10 rounded-xl
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200
                                       text-sm font-bold
                                       flex items-center justify-center gap-1.5
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Target className="h-4 w-4" />
                            Simulate
                        </button>
                    </div>

                    <div className="grid grid-cols-3 mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                        <div className="text-center">
                            <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                                {data.simulation_analysis?.attempts || 0}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-slate-500 dark:text-slate-400 mt-0.5">
                                Simulations
                            </p>
                        </div>
                        <div className="text-center border-x border-slate-100 dark:border-white/[0.06]">
                            <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                                {data.simulation_analysis?.average_score?.toFixed(1) || 0}%
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-slate-500 dark:text-slate-400 mt-0.5">
                                Avg score
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                                {data.unit_predictions?.length || 0}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-slate-500 dark:text-slate-400 mt-0.5">
                                Units
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── UNIT MASTERY ─────────────────────────────────── */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-[11px] font-bold uppercase tracking-wider
                                       text-slate-500 dark:text-slate-400">
                            Unit mastery
                        </h3>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Swipe to explore →
                    </span>
                </div>

                {visibleUnitsData.length > 0 ? (
                    <SnapCarousel>
                        {visibleUnitsData.map((unit, idx) => {
                            const isWeak = unit.average_score < 60;
                            const unitTier = scoreTier(unit.average_score);
                            const tierText =
                                unitTier === "high"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : unitTier === "medium"
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-rose-600 dark:text-rose-400";
                            const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;

                            return (
                                <div
                                    key={unit.quiz_id}
                                    onClick={() => handleUnitClick(unit.quiz_id)}
                                    className="relative h-full p-2.5 rounded-2xl cursor-pointer
                                               bg-white dark:bg-[#161b22]
                                               active:scale-[0.98] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            {medal ? (
                                                <span className="text-base leading-none">{medal}</span>
                                            ) : (
                                                <span className="text-[10px] font-bold tabular-nums
                                                                 text-slate-400 dark:text-slate-500">
                                                    #{idx + 1}
                                                </span>
                                            )}
                                            {isWeak && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full
                                                                 bg-rose-50 dark:bg-rose-400/10
                                                                 text-rose-700 dark:text-rose-400">
                                                    Focus
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold ${tierText}`}>
                                            {unit.trend === "Improving" ? "▲" : unit.trend === "Declining" ? "▼" : "—"}
                                        </span>
                                    </div>
                                    <h4 className="text-[12px] font-bold text-slate-900 dark:text-white
                                                   line-clamp-2 leading-tight mb-1.5 min-h-[2em]">
                                        {unit.unit_name}
                                    </h4>
                                    <div className="flex items-end justify-between mb-1.5">
                                        <span className={`text-xl font-bold tabular-nums leading-none ${tierText}`}>
                                            {unit.average_score.toFixed(0)}%
                                        </span>
                                        <div className={tierText}>
                                            <MasteryDots score={unit.average_score} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 text-[8px] font-semibold">
                                        <span className="px-1.5 py-0.5 rounded
                                                         bg-emerald-50 dark:bg-emerald-400/10
                                                         text-emerald-700 dark:text-emerald-400">
                                            B{unit.best_score.toFixed(0)}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded
                                                         bg-blue-50 dark:bg-blue-400/10
                                                         text-blue-700 dark:text-blue-400">
                                            L{unit.latest_score.toFixed(0)}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded
                                                         bg-rose-50 dark:bg-rose-400/10
                                                         text-rose-700 dark:text-rose-400">
                                            W{unit.worst_score.toFixed(0)}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded ml-auto
                                                         bg-slate-100 dark:bg-white/[0.06]
                                                         text-slate-600 dark:text-slate-300">
                                            {unit.attempts}×
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </SnapCarousel>
                ) : (
                    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 text-center">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            No units tracked yet — practice a quiz to start.
                        </p>
                    </div>
                )}
            </div>

            {/* ── STRENGTHS & FOCUS ────────────────────────────── */}
            <StrengthsFocusStrip
                strongest={data.rankings?.strongest || []}
                weakest={data.rankings?.weakest || []}
                onViewAll={() => setOverlayOpen(true)}
            />

            {/* ── STUDY PLAN ───────────────────────────────────── */}
            {data.recommendations?.length > 0 && (
                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        <MiniChampion size={18} />
                        <h3 className="text-[10px] font-bold uppercase tracking-wider
                                       text-blue-600 dark:text-blue-400">
                            Study plan
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {data.recommendations.map((rec, i) => (
                            <div key={i} className="flex gap-2 items-start">
                                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {rec}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── OVERLAY ──────────────────────────────────────── */}
            <CoachInsightsOverlay
                open={overlayOpen}
                onClose={() => setOverlayOpen(false)}
                strongest={data.rankings?.strongest || []}
                weakest={data.rankings?.weakest || []}
                onUnitClick={handleUnitClick}
            />
        </div>
    );
}