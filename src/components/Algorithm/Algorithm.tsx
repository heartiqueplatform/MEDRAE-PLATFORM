// src/components/Algorithm.tsx
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Brain,
    Target,
    BookOpen,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    PlayCircle,
    LineChart as LineChartIcon,
    BarChart3,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
    ChampionMascot,
    CoachMascot,
    SproutMascot,
    MiniChampion,
    MiniCoach,
} from "@/components/Algorithm/Mascots";
import { CoachInsightsOverlay } from "@/components/Algorithm/CoachInsightsOverlay";
import type { UnitData, RankingItem } from "@/components/Algorithm/types";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

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

// --- Skeleton ---
function AlgorithmSkeleton() {
    return (
        <div className="w-full space-y-3">
            <div className="relative overflow-hidden rounded-xl border-0 bg-white dark:bg-slate-800/50">
                <div className="p-6 md:p-8 flex flex-col items-center">
                    <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse mb-4" />
                    <div className="h-16 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-6" />
                </div>
                <div className="h-[130px] w-full bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
                <div className="p-6 md:p-8 pt-4 flex flex-col items-center">
                    <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                </div>
            </div>
            <div className="flex gap-2 overflow-hidden">
                {[1, 2, 3].map(i => (
                    <div key={i} className="min-w-[78vw] sm:min-w-[280px] h-[140px] rounded-2xl bg-white dark:bg-slate-800/50 animate-pulse" />
                ))}
            </div>
        </div>
    );
}

// --- Tier helpers ---
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

// --- Horizontal Snap Carousel ---
function SnapCarousel({ children, itemWidthClass = "w-[78vw] sm:w-[280px]" }: {
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
        const card = el.querySelector<HTMLElement>("[data-card]");
        const amount = (card?.offsetWidth ?? 280) + 12;
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
                    w-8 h-8 items-center justify-center rounded-full
                    bg-white/95 dark:bg-gray-800/95 backdrop-blur-md
                    text-gray-700 dark:text-gray-200 transition-opacity
                    ${canLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <button
                type="button"
                aria-label="Scroll right"
                onClick={() => scrollByCards(1)}
                disabled={!canRight}
                className={`hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20
                    w-8 h-8 items-center justify-center rounded-full
                    bg-white/95 dark:bg-gray-800/95 backdrop-blur-md
                    text-gray-700 dark:text-gray-200 transition-opacity
                    ${canRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
                <ChevronRight className="w-4 h-4" />
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

// --- Mastery Dots ---
function MasteryDots({ score }: { score: number }) {
    const filled = Math.max(0, Math.min(5, Math.round(score / 20)));
    return (
        <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map(i => (
                <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${i < filled
                        ? "bg-current"
                        : "bg-gray-200 dark:bg-gray-700"
                        }`}
                />
            ))}
        </div>
    );
}

// --- Custom Tooltip for Bar Chart ---
function BarTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
        <div className="rounded-lg bg-white dark:bg-[#161b22] px-3 py-2 ring-1 ring-gray-200 dark:ring-[#30363d]">
            <p className="text-[11px] font-bold text-gray-900 dark:text-[#e6edf3] mb-0.5 max-w-[180px] truncate">
                {d.fullName}
            </p>
            <div className="flex items-center gap-2">
                <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: barColorFor(d.score) }}
                />
                <span className="text-xs font-bold tabular-nums text-gray-700 dark:text-[#8b949e]">
                    {d.score}% avg · {d.attempts}×
                </span>
            </div>
        </div>
    );
}

// --- Compact Strengths & Focus (opens overlay on tap) ---
interface StrengthsFocusStripProps {
    strongest: { value: UnitData }[];
    weakest: { value: UnitData }[];
    onViewAll: () => void;
}

function StrengthsFocusStrip({
    strongest,
    weakest,
    onViewAll,
}: StrengthsFocusStripProps) {
    const hasAny = strongest.length > 0 || weakest.length > 0;

    if (!hasAny) {
        return (
            <div className="p-4 rounded-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md text-center">
                <div className="flex justify-center mb-1">
                    <SproutMascot size={40} />
                </div>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1">
                    Complete a few units to unlock your coach insights
                </p>
            </div>
        );
    }

    const totalCount = strongest.length + weakest.length;

    return (
        <div className="rounded-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-3 space-y-2">
            <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1.5">
                    <MiniChampion size={18} />
                    <h4 className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Your Coach Says
                    </h4>
                </div>
                {totalCount > 2 && (
                    <button
                        onClick={onViewAll}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400
                            hover:underline transition-colors"
                    >
                        View all ({totalCount}) →
                    </button>
                )}
            </div>

            {strongest.length > 0 && (
                <div className="space-y-1">
                    <div className="flex items-center gap-1 px-0.5">
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            Champion Areas
                        </span>
                        <div className="flex-1 h-px bg-emerald-200/50 dark:bg-emerald-900/40" />
                    </div>
                    <div className="space-y-1">
                        {strongest.slice(0, 2).map((item, i) => (
                            <motion.button
                                key={`s-${i}`}
                                onClick={onViewAll}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06, duration: 0.25 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left
                                    bg-gradient-to-r from-emerald-50 to-emerald-50/40
                                    dark:from-emerald-900/20 dark:to-emerald-900/5
                                    hover:from-emerald-100/80 hover:to-emerald-50/60
                                    dark:hover:from-emerald-900/30 dark:hover:to-emerald-900/10
                                    transition-colors"
                            >
                                <div className="shrink-0">
                                    <MiniChampion size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 truncate">
                                        {item.value.unit_name}
                                    </p>
                                    <p className="text-[9px] font-medium text-emerald-700/70 dark:text-emerald-400/80">
                                        Your best zone
                                    </p>
                                </div>
                                <div className="shrink-0 flex items-center gap-1.5">
                                    <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                        {item.value.average_score.toFixed(0)}%
                                    </span>
                                    <ChevronRight className="w-3 h-3 text-emerald-500/60 dark:text-emerald-400/50" />
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
                            Needs Love
                        </span>
                        <div className="flex-1 h-px bg-rose-200/50 dark:bg-rose-900/40" />
                    </div>
                    <div className="space-y-1">
                        {weakest.slice(0, 2).map((item, i) => (
                            <motion.button
                                key={`w-${i}`}
                                onClick={onViewAll}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + i * 0.06, duration: 0.25 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left
                                    bg-gradient-to-r from-rose-50 to-rose-50/40
                                    dark:from-rose-900/20 dark:to-rose-900/5
                                    hover:from-rose-100/80 hover:to-rose-50/60
                                    dark:hover:from-rose-900/30 dark:hover:to-rose-900/10
                                    transition-colors"
                            >
                                <div className="shrink-0">
                                    <MiniCoach size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-rose-900 dark:text-rose-200 truncate">
                                        {item.value.unit_name}
                                    </p>
                                    <p className="text-[9px] font-medium text-rose-700/70 dark:text-rose-400/80">
                                        Practice to level up
                                    </p>
                                </div>
                                <div className="shrink-0 flex items-center gap-1.5">
                                    <span className="text-sm font-bold tabular-nums text-rose-700 dark:text-rose-300">
                                        {item.value.average_score.toFixed(0)}%
                                    </span>
                                    <ChevronRight className="w-3 h-3 text-rose-500/60 dark:text-rose-400/50" />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Main Component ---
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

    // LINE chart series
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

    // BAR chart data — chronological (natural order), NOT sorted by score
    const barData = useMemo(() => {
        const u = data?.unit_predictions || [];
        return u.map(x => ({
            name: x.unit_name.length > 12
                ? x.unit_name.slice(0, 12) + "…"
                : x.unit_name,
            fullName: x.unit_name,
            score: Math.round(Number(x.average_score) || 0),
            attempts: x.attempts || 0,
            fill: barColorFor(Number(x.average_score) || 0),
        }));
    }, [data]);

    const handleUnitClick = useCallback(
        (unitId: string) => navigate(`/Medrae-quizzes?unit=${unitId}`),
        [navigate]
    );

    if (loading && !data) return <AlgorithmSkeleton />;
    if (!data) return null;

    const score = data.overall_prediction?.predicted_score ?? 0;
    const readiness = data.overall_prediction?.readiness ?? "Not Available";
    const isHighScore = score >= 70;
    const isMediumScore = score >= 50 && score < 70;

    const theme = isHighScore
        ? { colors: ["#10b981", "#059669", "#0d9488"] as [string, string, string], glow: "#10b981" }
        : isMediumScore
            ? { colors: ["#f59e0b", "#f97316", "#ef4444"] as [string, string, string], glow: "#f97316" }
            : { colors: ["#ef4444", "#dc2626", "#b91c1c"] as [string, string, string], glow: "#ef4444" };

    return (
        <div className="w-full space-y-2">
            {/* HERO CARD */}
            <div className="relative overflow-hidden rounded-2xl border-0 bg-white dark:bg-muted/30">
                <div className="px-4 md:px-6 pt-4 md:pt-6">
                    <div
                        className={`relative overflow-hidden rounded-2xl p-5 md:p-7
            ${isHighScore
                                ? "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600"
                                : isMediumScore
                                    ? "bg-gradient-to-br from-amber-500 via-orange-500 to-red-500"
                                    : "bg-gradient-to-br from-red-500 via-red-600 to-rose-700"}`}
                    >
                        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-black/10 blur-3xl pointer-events-none" />
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="flex items-center justify-center gap-2 mb-4 md:mb-5">
                                <Brain className="w-4 h-4 text-white/70" />
                                <span className="text-[10px] md:text-xs font-medium tracking-[0.18em] text-white/70 uppercase">
                                    Exam Prediction Readiness
                                </span>
                            </div>
                            <div className="flex items-baseline gap-0.5 text-white drop-shadow-sm">
                                <span className="text-5xl md:text-7xl font-semibold tracking-tight leading-none tabular-nums">
                                    {score.toFixed(1)}
                                </span>
                                <span className="text-2xl md:text-3xl font-normal">%</span>
                            </div>
                            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-sm
                                bg-white/20 backdrop-blur-sm text-white text-[11px] md:text-xs font-bold tracking-wide">
                                {readiness} readiness
                            </div>
                            <p className="mt-3 text-xs md:text-sm font-medium text-white/85 max-w-xs leading-relaxed">
                                {isHighScore
                                    ? "Strong performance — keep it up"
                                    : isMediumScore
                                        ? "On track — a few more sessions to peak"
                                        : "Focus on weak units to raise this score"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* CHART WITH TOGGLE */}
                {(scoreSeries.length >= 2 || barData.length >= 1) && (
                    <div className="px-4 md:px-6 mt-2">
                        <div
                            className={`relative overflow-hidden rounded-2xl p-3 pt-3
                ${isHighScore
                                    ? "bg-emerald-50/70 dark:bg-emerald-950/20"
                                    : isMediumScore
                                        ? "bg-amber-50/70 dark:bg-amber-950/20"
                                        : "bg-red-50/70 dark:bg-red-950/20"}`}
                        >
                            <div className={`absolute -top-16 -left-10 h-40 w-40 rounded-full blur-3xl pointer-events-none
                    ${isHighScore
                                    ? "bg-emerald-400/20"
                                    : isMediumScore
                                        ? "bg-amber-400/20"
                                        : "bg-red-400/20"}`}
                            />

                            {/* Toggle — Bars first, Line second */}
                            <div className="relative z-10 flex items-center justify-between mb-1 px-1">
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    {chartMode === "bars" ? "Unit Performance" : "Score Trend"}
                                </span>
                                <div className="flex items-center gap-1 p-0.5 rounded-full
                                    bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                                    <button
                                        onClick={() => setChartMode("bars")}
                                        aria-label="Bar chart"
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full
                                            text-[10px] font-bold transition-all
                                            ${chartMode === "bars"
                                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                                : "text-gray-600 dark:text-gray-400"}`}
                                    >
                                        <BarChart3 className="w-3 h-3" />
                                        Bars
                                    </button>
                                    <button
                                        onClick={() => setChartMode("line")}
                                        aria-label="Line chart"
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full
                                            text-[10px] font-bold transition-all
                                            ${chartMode === "line"
                                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                                : "text-gray-600 dark:text-gray-400"}`}
                                    >
                                        <LineChartIcon className="w-3 h-3" />
                                        Line
                                    </button>
                                </div>
                            </div>

                            <div className="relative z-10 w-full h-[200px]">
                                {chartMode === "line" && scoreSeries.length >= 2 && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={scoreSeries.map((s, i) => ({
                                                name: `#${i + 1}`,
                                                score: Number(s.toFixed(1)),
                                            }))}
                                            margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                                        >
                                            <defs>
                                                <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={theme.colors[1]} stopOpacity={0.35} />
                                                    <stop offset="100%" stopColor={theme.colors[1]} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="currentColor"
                                                className="text-slate-200 dark:text-slate-700/60"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 10, fill: "#9ca3af" }}
                                                axisLine={{ stroke: "#e5e7eb" }}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                tick={{ fontSize: 10, fill: "#9ca3af" }}
                                                axisLine={false}
                                                tickLine={false}
                                                width={40}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: 8,
                                                    border: "none",
                                                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                                    fontSize: 12,
                                                }}
                                                formatter={(value: number) => [`${value}%`, "Score"]}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="score"
                                                stroke={theme.colors[1]}
                                                strokeWidth={2.5}
                                                fill="url(#scoreFill)"
                                                dot={{ r: 3, fill: theme.colors[1] }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}

                                {chartMode === "bars" && barData.length > 0 && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={barData}
                                            margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="currentColor"
                                                className="text-slate-200 dark:text-slate-700/60"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 9, fill: "#9ca3af" }}
                                                axisLine={{ stroke: "#e5e7eb" }}
                                                tickLine={false}
                                                interval={0}
                                                angle={-35}
                                                textAnchor="end"
                                                height={50}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                tick={{ fontSize: 10, fill: "#9ca3af" }}
                                                axisLine={false}
                                                tickLine={false}
                                                width={40}
                                            />
                                            <Tooltip
                                                content={<BarTooltip />}
                                                cursor={{ fill: "rgba(148,163,184,0.08)" }}
                                            />
                                            <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={56}>
                                                {barData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Legend for bars */}
                            {chartMode === "bars" && (
                                <div className="relative z-10 flex items-center justify-center gap-3 mt-1 text-[9px] font-bold">
                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        70%+
                                    </span>
                                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        50–69%
                                    </span>
                                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                                        &lt;50%
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="px-5 md:px-8 pb-5 md:pb-6">
                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-4" />
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => navigate("/Medrae-quizzes")}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5
                                bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100
                                text-white dark:text-gray-900 text-xs md:text-sm font-normal rounded-xl
                                transition-colors active:scale-[0.98]"
                        >
                            <PlayCircle className="w-4 h-4" />
                            Practice
                        </button>
                        <button
                            onClick={() => navigate("/simulation/latest")}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5
                                bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700
                                text-gray-900 dark:text-white text-xs md:text-sm font-normal rounded-xl
                                transition-colors active:scale-[0.98]"
                        >
                            <Target className="w-4 h-4" />
                            Simulate
                        </button>
                    </div>
                    <div className="grid grid-cols-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="text-center">
                            <p className="text-base md:text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                                {data.simulation_analysis?.attempts || 0}
                            </p>
                            <p className="text-[10px] md:text-[11px] font-normal text-gray-400 dark:text-gray-500 mt-0.5">
                                Simulations
                            </p>
                        </div>
                        <div className="text-center border-x border-gray-100 dark:border-gray-800">
                            <p className="text-base md:text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                                {data.simulation_analysis?.average_score?.toFixed(1) || 0}%
                            </p>
                            <p className="text-[10px] md:text-[11px] font-normal text-gray-400 dark:text-gray-500 mt-0.5">
                                Avg Score
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-base md:text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                                {data.unit_predictions?.length || 0}
                            </p>
                            <p className="text-[10px] md:text-[11px] font-normal text-gray-400 dark:text-gray-500 mt-0.5">
                                Units Tracked
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* UNIT MASTERY */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Unit Mastery
                        </h3>
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                        Swipe to explore →
                    </span>
                </div>

                {visibleUnitsData.length > 0 ? (
                    <SnapCarousel>
                        {visibleUnitsData.map((unit, idx) => {
                            const isWeak = unit.average_score < 60;
                            const tier = scoreTier(unit.average_score);
                            const tierBg =
                                tier === "high"
                                    ? "bg-emerald-50/80 dark:bg-emerald-950/30"
                                    : tier === "medium"
                                        ? "bg-amber-50/80 dark:bg-amber-950/30"
                                        : "bg-red-50/80 dark:bg-red-950/30";
                            const tierText =
                                tier === "high"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : tier === "medium"
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-red-600 dark:text-red-400";
                            const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;

                            return (
                                <div
                                    key={unit.quiz_id}
                                    onClick={() => handleUnitClick(unit.quiz_id)}
                                    className={`relative h-full p-3 rounded-2xl cursor-pointer
                                        transition-transform active:scale-[0.98]
                                        bg-white/95 dark:bg-gray-800/95 backdrop-blur-md
                                        ${tierBg}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            {medal ? (
                                                <span className="text-base leading-none">{medal}</span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-400 tabular-nums">
                                                    #{idx + 1}
                                                </span>
                                            )}
                                            {isWeak && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full
                                                    bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                                                    Focus
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold ${tierText}`}>
                                            {unit.trend === "Improving" ? "▲" : unit.trend === "Declining" ? "▼" : "—"}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-2 min-h-[2.2em]">
                                        {unit.unit_name}
                                    </h4>
                                    <div className="flex items-end justify-between mb-2">
                                        <span className={`text-2xl font-bold tabular-nums leading-none ${tierText}`}>
                                            {unit.average_score.toFixed(0)}%
                                        </span>
                                        <div className={tierText}>
                                            <MasteryDots score={unit.average_score} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] font-semibold">
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-100/70 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                            B{unit.best_score.toFixed(0)}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded bg-blue-100/70 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                            L{unit.latest_score.toFixed(0)}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded bg-rose-100/70 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
                                            W{unit.worst_score.toFixed(0)}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded bg-purple-100/70 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ml-auto">
                                            {unit.attempts}×
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </SnapCarousel>
                ) : (
                    <div className="p-4 rounded-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            No units tracked yet — practice a quiz to start.
                        </p>
                    </div>
                )}
            </div>

            {/* STRENGTHS & FOCUS — taps open overlay */}
            <StrengthsFocusStrip
                strongest={data.rankings?.strongest || []}
                weakest={data.rankings?.weakest || []}
                onViewAll={() => setOverlayOpen(true)}
            />

            {/* STUDY PLAN — always fully expanded */}
            {data.recommendations?.length > 0 && (
                <div className="p-3 rounded-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <MiniChampion size={18} />
                        <h3 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            Study Plan
                        </h3>
                    </div>
                    <div className="space-y-1.5">
                        {data.recommendations.map((rec, i) => (
                            <div key={i} className="flex gap-2 items-start">
                                <CheckCircle2 className="w-3 h-3 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {rec}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* OVERLAY */}
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