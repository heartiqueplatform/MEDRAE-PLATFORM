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

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = () => {
    try { playSound("ui-tap"); } catch { }
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
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

function AlgorithmSkeleton() {
    return (
        <div className="w-full space-y-3 px-1">
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 md:p-4 space-y-3 animate-pulse">
                <div className="h-5 w-32 bg-slate-200 dark:bg-white/[0.06] rounded-full" />
                <div className="h-16 w-40 bg-slate-200 dark:bg-white/[0.06] rounded-xl" />
                <div className="h-5 w-24 bg-slate-200 dark:bg-white/[0.06] rounded-full" />
                <div className="h-4 w-2/3 bg-slate-200 dark:bg-white/[0.06] rounded" />
                <div className="h-[140px] w-full bg-slate-200 dark:bg-white/[0.06] rounded-xl" />
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="h-10 bg-slate-200 dark:bg-white/[0.06] rounded-xl" />
                    <div className="h-10 bg-slate-200 dark:bg-white/[0.06] rounded-xl" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-1.5">
                            <div className="h-5 w-10 mx-auto bg-slate-200 dark:bg-white/[0.06] rounded" />
                            <div className="h-3 w-16 mx-auto bg-slate-200 dark:bg-white/[0.06] rounded" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex gap-2 overflow-hidden">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="min-w-[62vw] sm:min-w-[240px] h-[140px] rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
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
/*  Snap Carousel                                                     */
/* ------------------------------------------------------------------ */

function SnapCarousel({
    children,
    itemWidthClass = "w-[164px]",
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
        const amount = (card?.offsetWidth ?? 240) + 6;
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
                            bg-white dark:bg-white/[0.08]
                            text-zinc-700 dark:text-zinc-200
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
                            bg-white dark:bg-white/[0.08]
                            text-zinc-700 dark:text-zinc-200
                            active:scale-[0.92] transition-transform
                            ${canRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                style={{ touchAction: "manipulation" }}
            >
                <ChevronRight className="h-4 w-4" />
            </button>

            <div
                ref={scrollerRef}
                className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth
                           px-1 pb-2 -mx-1
                           [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {Array.isArray(children)
                    ? children.map((child, i) => (
                        <div key={i} data-card className={`snap-start shrink-0 ${itemWidthClass}`}>
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
                        : "bg-zinc-200 dark:bg-white/[0.08]"
                        }`}
                />
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Custom Bar Chart                                                  */
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
                <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 z-30
                               rounded-xl bg-white dark:bg-[#1c2128] px-3 py-2
                               min-w-[140px] max-w-[200px]
                               shadow-lg shadow-black/5 dark:shadow-black/40">
                    <p className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">
                        {active.fullName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: active.fill }} />
                        <span className="text-[11px] font-bold tabular-nums text-zinc-600 dark:text-zinc-300">
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
                            <span className="text-[11px] font-bold tabular-nums leading-none transition-opacity"
                                style={{ color: d.fill, opacity: isActive ? 1 : 0.85 }}>
                                {d.score}%
                            </span>

                            <div className="relative w-full h-[140px] flex items-end">
                                <div
                                    className={`w-full rounded-t-lg transition-all duration-300 ease-out
                                                ${isActive ? "brightness-110 scale-y-[1.03]" : ""}`}
                                    style={{ height: `${heightPct}%`, backgroundColor: d.fill }}
                                />
                            </div>

                            <span className={`text-[9px] font-semibold truncate w-full text-center
                                            ${isActive ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`}>
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
/*  Strengths & Focus — Option A pattern applied                      */
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
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Complete a few units to unlock your coach insights
                </p>
            </div>
        );
    }

    const totalCount = strongest.length + weakest.length;

    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-3">
            <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1.5">
                    <MiniChampion size={18} />
                    <h4 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Your coach says
                    </h4>
                </div>
                {totalCount > 2 && (
                    <button
                        onClick={() => { tap(); onViewAll(); }}
                        className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400
                                   active:text-zinc-700 dark:active:text-zinc-200 transition-colors"
                        style={{ touchAction: "manipulation" }}
                    >
                        View all ({totalCount}) →
                    </button>
                )}
            </div>

            {strongest.length > 0 && (
                <div className="space-y-1">
                    <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-0.5">
                        Champion areas
                    </span>
                    {strongest.slice(0, 2).map((item, i) => (
                        <motion.button
                            key={`s-${i}`}
                            onClick={() => { tap(); onViewAll(); }}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06, duration: 0.25 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center gap-3 p-3 rounded-lg text-left
                                       bg-zinc-50 dark:bg-white/[0.03]
                                       hover:bg-zinc-100 dark:hover:bg-white/[0.06]
                                       active:bg-zinc-100 dark:active:bg-white/[0.08]
                                       transition-colors border-l-2 border-emerald-500"
                            style={{ touchAction: "manipulation" }}
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate">
                                    {item.value.unit_name}
                                </p>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                    Your best zone
                                </p>
                            </div>
                            <span className="text-[15px] font-bold tabular-nums text-zinc-900 dark:text-white shrink-0">
                                {item.value.average_score.toFixed(0)}%
                            </span>
                            <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                        </motion.button>
                    ))}
                </div>
            )}

            {weakest.length > 0 && (
                <div className="space-y-1">
                    <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-0.5">
                        Needs love
                    </span>
                    {weakest.slice(0, 2).map((item, i) => (
                        <motion.button
                            key={`w-${i}`}
                            onClick={() => { tap(); onViewAll(); }}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + i * 0.06, duration: 0.25 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center gap-3 p-3 rounded-lg text-left
                                       bg-zinc-50 dark:bg-white/[0.03]
                                       hover:bg-zinc-100 dark:hover:bg-white/[0.06]
                                       active:bg-zinc-100 dark:active:bg-white/[0.08]
                                       transition-colors border-l-2 border-rose-500"
                            style={{ touchAction: "manipulation" }}
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate">
                                    {item.value.unit_name}
                                </p>
                                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                    Practice to level up
                                </p>
                            </div>
                            <span className="text-[15px] font-bold tabular-nums text-zinc-900 dark:text-white shrink-0">
                                {item.value.average_score.toFixed(0)}%
                            </span>
                            <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                        </motion.button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
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
            } catch (e) { }
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
        if (Array.isArray(data.score_history) && data.score_history.length >= 2) return data.score_history;
        const u = data.unit_predictions || [];
        if (u.length >= 2) {
            return [...u].sort((a, b) => (a.attempts || 0) - (b.attempts || 0)).map(x => Number(x.average_score) || 0);
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
                const label = fromEnd === 0 ? "Now" : fromEnd === 1 ? "1 ago" : `${fromEnd} ago`;
                return { name: label, score: Number(s.toFixed(1)) };
            });
        }
        const u = data.unit_predictions || [];
        if (u.length >= 2) {
            const sorted = [...u].sort((a, b) => (a.attempts || 0) - (b.attempts || 0)).map(x => Number(x.average_score) || 0);
            return sorted.map((s, i) => {
                const label = i === 0 ? "Start" : i === sorted.length - 1 ? "Now" : `Step ${i}`;
                return { name: label, score: Number(s.toFixed(1)) };
            });
        }
        const s = data.overall_prediction?.predicted_score;
        if (s != null) return [{ name: "Start", score: 0 }, { name: "Now", score: Number(s.toFixed(1)) }];
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

    const handleUnitClick = useCallback((unitId: string) => {
        tap();
        navigate(`/Medrae-quizzes?unit=${unitId}`);
    }, [navigate]);

    if (loading && !data) return <AlgorithmSkeleton />;
    if (!data) return null;

    const score = data.overall_prediction?.predicted_score ?? 0;
    const readiness = data.overall_prediction?.readiness ?? "Not Available";
    const isHighScore = score >= 70;
    const isMediumScore = score >= 50 && score < 70;

    const tier = isHighScore ? "high" : isMediumScore ? "medium" : "low";
    const accent =
        tier === "high"
            ? { bg: "bg-emerald-50 dark:bg-emerald-400/10", text: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-600", stroke: "#10b981" }
            : tier === "medium"
                ? { bg: "bg-amber-50 dark:bg-amber-400/10", text: "text-amber-700 dark:text-amber-400", bar: "bg-amber-500", stroke: "#f59e0b" }
                : { bg: "bg-rose-50 dark:bg-rose-400/10", text: "text-rose-700 dark:text-rose-400", bar: "bg-rose-600", stroke: "#ef4444" };

    return (
        <div className="w-full space-y-3 px-1">
            {/* ── HERO CARD ── */}
            <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">

                <div className="
        relative isolate overflow-hidden
        rounded-[28px]
        p-5 md:p-7

        shadow-[0_8px_30px_rgba(90,70,150,0.07)]
        dark:shadow-[0_12px_35px_rgba(0,0,0,0.25)]
    ">
                    {/* Background image — fills the whole card */}
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: "url('/background05.jpg')" }}
                        aria-hidden
                    />

                    {/* Horizontal gradient: opaque left → transparent right */}
                    <div className="
            absolute inset-0
            bg-gradient-to-r
            from-white via-white/80 to-white/0
            dark:from-[#171827] dark:via-[#202033]/85 dark:to-[#251B2D]/0
        " aria-hidden />

                    {/* Soft brand tint */}
                    <div className="
            absolute inset-0
            bg-gradient-to-tr
            from-purple-200/20 via-transparent to-pink-200/10
            dark:from-purple-500/10 dark:via-transparent dark:to-pink-500/10
        " aria-hidden />

                    {/* Ambient glows */}
                    <div className="
            pointer-events-none absolute
            -top-20 -right-16
            w-64 h-64 rounded-full
            bg-purple-300/20 dark:bg-purple-500/15
            blur-[65px]
        " />
                    <div className="
            pointer-events-none absolute
            -bottom-24 -left-16
            w-64 h-64 rounded-full
            bg-pink-300/20 dark:bg-pink-500/10
            blur-[70px]
        " />

                    {/* Content — always left aligned */}
                    <div className="relative z-10 flex flex-col items-start text-left">

                        <div className="flex items-center gap-2 mb-4">

                            <span className="
                    text-[10px] font-bold uppercase
                    tracking-[0.16em]
                    text-zinc-700 dark:text-zinc-200
                ">
                                Exam prediction readiness
                            </span>
                            <Brain className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                        </div>

                        <div className="flex items-baseline gap-1">
                            <span className="
                    text-[64px] md:text-[80px]
                    font-extrabold tabular-nums
                    leading-none tracking-[-0.065em]
                    text-zinc-900 dark:text-white
                    drop-shadow-[0_2px_8px_rgba(0,0,0,0.10)]
                ">
                                {score.toFixed(1)}
                            </span>
                            <span className="
                    text-2xl font-medium
                    text-purple-600 dark:text-purple-300
                ">
                                %
                            </span>
                        </div>

                        <div className={`
                mt-4 inline-flex items-center gap-2
                rounded-full px-4 py-2
                backdrop-blur-xl
                shadow-sm
                ${accent.bg} ${accent.text}
                text-[11px] font-bold
            `}>
                            {readiness} readiness
                        </div>

                        <p className="
                mt-3 text-[11px]
                text-zinc-700 dark:text-zinc-200
                max-w-xs leading-relaxed
            ">
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
                        <div className="rounded-xl p-3 bg-zinc-50 dark:bg-white/[0.03]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    {chartMode === "bars" ? "Unit performance" : "Score trend"}
                                </span>
                                <div className="flex items-center gap-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] p-0.5">
                                    <button
                                        onClick={() => { tap(); setChartMode("bars"); }}
                                        aria-label="Bar chart"
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors
        ${chartMode === "bars"
                                                ? "bg-white dark:bg-white/[0.12] text-zinc-900 dark:text-white shadow-sm dark:shadow-black/20"
                                                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"}`}
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <BarChart3 className="h-3 w-3" />
                                        Bars
                                    </button>
                                    <button
                                        onClick={() => { tap(); setChartMode("line"); }}
                                        aria-label="Line chart"
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors
        ${chartMode === "line"
                                                ? "bg-white dark:bg-white/[0.12] text-zinc-900 dark:text-white shadow-sm dark:shadow-black/20"
                                                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"}`}
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
                                        <AreaChart data={lineChartData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={accent.stroke} stopOpacity={0.35} />
                                                    <stop offset="100%" stopColor={accent.stroke} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-white/[0.06]" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: 10, border: "none", fontSize: 12, padding: "8px 10px",
                                                    backgroundColor: "rgba(255,255,255,0.98)", color: "#0f172a",
                                                }}
                                                labelStyle={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}
                                                formatter={(value: number) => [`${value}%`, "Score"]}
                                            />
                                            <Area type="monotone" dataKey="score" stroke={accent.stroke} strokeWidth={2.5} fill="url(#scoreFill)" dot={{ r: 3, fill: accent.stroke }} activeDot={{ r: 6 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {chartMode === "bars" && barData.length > 0 && <HugeBarChart data={barData} />}

                            {chartMode === "bars" && (
                                <p className="mt-2 text-center text-[9px] font-medium text-zinc-400 dark:text-zinc-500">
                                    Bars colored by score tier · green ≥70% · amber ≥50% · red &lt;50%
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="px-4 md:px-6 pb-4 md:pb-6">
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-100 dark:border-white/[0.06]">
                        <button
                            onClick={() => { tap(); navigate("/Medrae-quizzes"); }}
                            className="h-10 rounded-xl bg-zinc-100 dark:bg-white/[0.08]
                                       text-zinc-900 dark:text-white
                                       text-sm font-bold
                                       flex items-center justify-center gap-1.5
                                       hover:bg-zinc-200 dark:hover:bg-white/[0.12]
                                       active:scale-[0.97] transition-colors"
                            style={{ touchAction: "manipulation" }}
                        >
                            <PlayCircle className="h-4 w-4" />
                            Practice
                        </button>
                        <button
                            onClick={() => { tap(); navigate("/simulation/latest"); }}
                            className="h-10 rounded-xl bg-zinc-100 dark:bg-white/[0.06]
                                       text-zinc-700 dark:text-zinc-200
                                       text-sm font-bold
                                       flex items-center justify-center gap-1.5
                                       hover:bg-zinc-200 dark:hover:bg-white/[0.1]
                                       active:scale-[0.97] transition-colors"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Target className="h-4 w-4" />
                            Simulate
                        </button>
                    </div>

                    <div className="grid grid-cols-3 mt-4 pt-4 border-t border-zinc-100 dark:border-white/[0.06]">
                        <div className="text-center">
                            <p className="text-base font-bold tabular-nums text-zinc-900 dark:text-white">
                                {data.simulation_analysis?.attempts || 0}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-0.5">Simulations</p>
                        </div>
                        <div className="text-center border-x border-zinc-100 dark:border-white/[0.06]">
                            <p className="text-base font-bold tabular-nums text-zinc-900 dark:text-white">
                                {data.simulation_analysis?.average_score?.toFixed(1) || 0}%
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-0.5">Avg score</p>
                        </div>
                        <div className="text-center">
                            <p className="text-base font-bold tabular-nums text-zinc-900 dark:text-white">
                                {data.unit_predictions?.length || 0}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-0.5">Units</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── UNIT MASTERY ── */}

            <div className="space-y-3">
                {/* Section heading */}
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className="
                flex items-center justify-center
                w-8 h-8 rounded-xl
                bg-blue-100 dark:bg-blue-400/10
            ">
                            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>

                        <div>
                            <h3 className="text-[12px] font-bold text-zinc-900 dark:text-white">
                                Unit mastery
                            </h3>
                            <p className="text-[9px] text-zinc-400 dark:text-zinc-500">
                                Your performance by subject
                            </p>
                        </div>
                    </div>

                    <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500">
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

                            const progressColor =
                                unitTier === "high"
                                    ? "from-emerald-400 to-teal-400"
                                    : unitTier === "medium"
                                        ? "from-amber-400 to-yellow-400"
                                        : "from-rose-400 to-pink-500";

                            const medal =
                                idx === 0 ? "🥇" :
                                    idx === 1 ? "🥈" :
                                        idx === 2 ? "🥉" : null;

                            const trend =
                                unit.trend === "Improving" ? "▲" :
                                    unit.trend === "Declining" ? "▼" : "—";

                            return (
                                <div
                                    key={unit.quiz_id}
                                    onClick={() => handleUnitClick(unit.quiz_id)}
                                    className="
                            group relative isolate overflow-hidden
                            h-full w-[164px] min-h-[164px]
                            p-3.5 rounded-[22px]
                            cursor-pointer flex flex-col
                            justify-between

                            bg-gradient-to-br
                            from-white via-[#FAFAFD] to-[#F0F2F8]

                            dark:bg-gradient-to-br
                            dark:from-[#242633]
                            dark:via-[#1D202B]
                            dark:to-[#171923]

                            shadow-[0_5px_18px_rgba(30,40,80,0.06)]
                            dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)]

                            active:scale-[0.97]
                            transition-all duration-200
                        "
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {/* Ambient accent */}
                                    <div className={`
                            pointer-events-none absolute
                            -top-12 -right-12
                            w-32 h-32 rounded-full
                            blur-[45px]
                            ${unitTier === "high"
                                            ? "bg-emerald-300/20 dark:bg-emerald-400/10"
                                            : unitTier === "medium"
                                                ? "bg-amber-300/20 dark:bg-amber-400/10"
                                                : "bg-rose-300/20 dark:bg-rose-400/10"
                                        }
                        `} />

                                    <div className="relative">
                                        {/* Rank and trend */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-1.5">
                                                {medal ? (
                                                    <span className="text-base leading-none">
                                                        {medal}
                                                    </span>
                                                ) : (
                                                    <span className="
                                            text-[10px] font-bold
                                            text-zinc-400 dark:text-zinc-500
                                        ">
                                                        #{idx + 1}
                                                    </span>
                                                )}

                                                {isWeak && (
                                                    <span className="
                                            text-[8px] font-bold
                                            uppercase tracking-wide
                                            px-1.5 py-1 rounded-md
                                            bg-rose-100 dark:bg-rose-400/10
                                            text-rose-600 dark:text-rose-400
                                        ">
                                                        Focus
                                                    </span>
                                                )}
                                            </div>

                                            <span className={`
                                    text-[10px] font-bold
                                    ${tierText}
                                `}>
                                                {trend}
                                            </span>
                                        </div>

                                        {/* Unit name */}
                                        <h4 className="
                                text-[12px] font-bold
                                text-zinc-800 dark:text-zinc-100
                                line-clamp-2 leading-[1.4]
                                min-h-[34px]
                                tracking-tight
                            ">
                                            {unit.unit_name}
                                        </h4>

                                        {/* Main score */}
                                        <div className="flex items-end justify-between mt-2">
                                            <div className="flex items-baseline gap-0.5">
                                                <span className={`
                                        text-[25px] font-extrabold
                                        tracking-[-0.055em]
                                        leading-none tabular-nums
                                        ${tierText}
                                    `}>
                                                    {unit.average_score.toFixed(0)}
                                                </span>

                                                <span className="
                                        text-[10px] font-semibold
                                        text-zinc-400 dark:text-zinc-500
                                    ">
                                                    %
                                                </span>
                                            </div>

                                            <div className="pb-0.5">
                                                <MasteryDots score={unit.average_score} />
                                            </div>
                                        </div>

                                        {/* Progress track */}
                                        <div className="
                                h-[4px] mt-3
                                rounded-full overflow-hidden
                                bg-zinc-200/80 dark:bg-white/[0.09]
                            ">
                                            <div
                                                className={`
                                        h-full rounded-full
                                        bg-gradient-to-r ${progressColor}
                                    `}
                                                style={{
                                                    width: `${Math.max(0, Math.min(100, unit.average_score))}%`
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Statistics footer */}
                                    <div className="
                            relative flex items-center
                            justify-between gap-1 mt-3
                        ">
                                        <span className="
                                text-[9px] font-semibold
                                text-emerald-700 dark:text-emerald-400
                                tabular-nums
                            ">
                                            B{unit.best_score.toFixed(0)}
                                        </span>

                                        <span className="
                                text-[9px] font-semibold
                                text-blue-700 dark:text-blue-400
                                tabular-nums
                            ">
                                            L{unit.latest_score.toFixed(0)}
                                        </span>

                                        <span className="
                                text-[9px] font-semibold
                                text-rose-700 dark:text-rose-400
                                tabular-nums
                            ">
                                            W{unit.worst_score.toFixed(0)}
                                        </span>

                                        <span className="
                                text-[9px] font-bold
                                text-zinc-500 dark:text-zinc-300
                                bg-zinc-200/70 dark:bg-white/[0.08]
                                rounded-md px-1.5 py-1
                            ">
                                            {unit.attempts}×
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </SnapCarousel>
                ) : (
                    <div className="
            rounded-[22px] p-5 text-center
            bg-gradient-to-br from-zinc-50 to-zinc-100
            dark:from-[#222430] dark:to-[#191B25]
        ">
                        <BookOpen className="
                h-6 w-6 mx-auto mb-2
                text-zinc-400 dark:text-zinc-500
            " />

                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            No units tracked yet — practice a quiz to start.
                        </p>
                    </div>
                )}
            </div>


            {/* ── STRENGTHS & FOCUS ── */}
            <StrengthsFocusStrip
                strongest={data.rankings?.strongest || []}
                weakest={data.rankings?.weakest || []}
                onViewAll={() => setOverlayOpen(true)}
            />

            {/* ── STUDY PLAN ── */}
            {
                data.recommendations?.length > 0 && (
                    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                            <MiniChampion size={18} />
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                Study plan
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {data.recommendations.map((rec, i) => (
                                <div key={i} className="flex gap-2 items-start">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">{rec}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            <CoachInsightsOverlay
                open={overlayOpen}
                onClose={() => setOverlayOpen(false)}
                strongest={data.rankings?.strongest || []}
                weakest={data.rankings?.weakest || []}
                onUnitClick={handleUnitClick}
            />
        </div >
    );
}