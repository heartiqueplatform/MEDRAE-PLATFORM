// src/components/Algorithm.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Brain,
    Target,
    AlertTriangle,
    Trophy,
    BookOpen,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Clock,
    CheckCircle2,
    PlayCircle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
// --- Interfaces ---
interface UnitData {
    quiz_id: string;
    unit_name: string;
    attempts: number;
    average_score: number;
    latest_score: number;
    best_score: number;
    worst_score: number;
    trend: string;
    status: string;
    practice_level: string;
}

interface RankingItem { value: UnitData; }

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

// ============================================================
// VIBRANT EDGE-TO-EDGE SCORE GRAPH
// ============================================================
interface ScoreGraphProps {
    points: number[];
    height?: number;
    colors: [string, string, string]; // gradient stops: start, mid, end
    glow: string;                     // glow shadow color
}

function ScoreGraph({ points, height = 130, colors, glow }: ScoreGraphProps) {
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    const safePoints = points && points.length >= 2 ? points : [0, 0];

    const uid = useMemo(
        () => Math.random().toString(36).slice(2, 9),
        []
    );

    // Wide virtual viewBox so curve always fills edge-to-edge
    const width = 600;
    const padX = 0;              // 🔥 no side padding = true edge-to-edge
    const padTop = 18;
    const padBottom = 6;
    const w = width - padX * 2;
    const h = height - padTop - padBottom;

    const min = Math.min(...safePoints);
    const max = Math.max(...safePoints);
    const range = max - min || 1;

    const coords = safePoints.map((p, i) => {
        const x = padX + (i / (safePoints.length - 1)) * w;
        // keep curve away from extreme top/bottom so glow isn't clipped
        const y = padTop + h - ((p - min) / range) * h;
        return [x, y] as const;
    });

    // Smooth Catmull-Rom → cubic bezier
    const linePath = coords.reduce((acc, [x, y], i) => {
        if (i === 0) return `M ${x} ${y}`;
        const [px, py] = coords[i - 1];
        const cx = (px + x) / 2;
        return `${acc} C ${cx} ${py}, ${cx} ${y}, ${x} ${y}`;
    }, "");

    const areaPath = `${linePath} L ${coords[coords.length - 1][0]
        } ${height} L ${coords[0][0]} ${height} Z`;

    const last = coords[coords.length - 1];

    const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const relX = ((e.clientX - rect.left) / rect.width) * width;
        let nearest = 0;
        let bestDist = Infinity;
        coords.forEach(([x], i) => {
            const d = Math.abs(x - relX);
            if (d < bestDist) {
                bestDist = d;
                nearest = i;
            }
        });
        setHoverIdx(nearest);
    };

    const hoverCoord = hoverIdx !== null ? coords[hoverIdx] : null;

    return (
        <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIdx(null)}
            className="block"
            style={{ overflow: "visible" }}
        >
            <defs>
                {/* Vivid line gradient (horizontal) */}
                <linearGradient id={`line-${uid}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={colors[0]} />
                    <stop offset="50%" stopColor={colors[1]} />
                    <stop offset="100%" stopColor={colors[2]} />
                </linearGradient>

                {/* Area gradient (vertical) */}
                <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors[1]} stopOpacity="0.35" />
                    <stop offset="55%" stopColor={colors[1]} stopOpacity="0.10" />
                    <stop offset="100%" stopColor={colors[1]} stopOpacity="0" />
                </linearGradient>

                {/* Soft glow under the line */}
                <filter id={`glow-${uid}`} x="-20%" y="-50%" width="140%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Area fill */}
            <path d={areaPath} fill={`url(#fill-${uid})`} stroke="none" />

            {/* Glowing underlay */}
            <path
                d={linePath}
                fill="none"
                stroke={glow}
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.35}
                filter={`url(#glow-${uid})`}
            />

            {/* Main vibrant line */}
            <path
                d={linePath}
                fill="none"
                stroke={`url(#line-${uid})`}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* End pulse dot */}
            <circle cx={last[0]} cy={last[1]} r={7} fill={colors[2]} opacity={0.25} />
            <circle cx={last[0]} cy={last[1]} r={3.5} fill={colors[2]} />

            {/* Hover */}
            {hoverCoord && (
                <>
                    <line
                        x1={hoverCoord[0]}
                        y1={padTop - 6}
                        x2={hoverCoord[0]}
                        y2={height}
                        stroke={colors[1]}
                        strokeWidth={1}
                        strokeDasharray="3 4"
                        opacity={0.5}
                    />
                    <circle
                        cx={hoverCoord[0]}
                        cy={hoverCoord[1]}
                        r={5}
                        fill="white"
                        stroke={colors[1]}
                        strokeWidth={2.5}
                    />
                    <g
                        transform={`translate(${Math.min(
                            Math.max(hoverCoord[0], 26),
                            width - 26
                        )}, ${Math.max(hoverCoord[1] - 26, 14)})`}
                    >
                        <rect
                            x={-22}
                            y={-14}
                            width={44}
                            height={20}
                            rx={6}
                            fill={colors[1]}
                        />
                        <text
                            x={0}
                            y={0}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="700"
                            fill="white"
                        >
                            {safePoints[hoverIdx!].toFixed(0)}%
                        </text>
                    </g>
                </>
            )}
        </svg>
    );
}

// --- Skeleton ---
function AlgorithmSkeleton() {
    return (
        <div className="w-full space-y-3 md:space-y-4">
            <div className="relative overflow-hidden rounded-xl border-0 bg-white dark:bg-slate-800/50 shadow-sm">
                <div className="p-6 md:p-8 flex flex-col items-center">
                    <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse mb-4" />
                    <div className="h-16 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-6" />
                </div>
                <div className="h-[130px] w-full bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
                <div className="p-6 md:p-8 pt-4 flex flex-col items-center">
                    <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="p-3 bg-white dark:bg-slate-800/50 rounded-xl text-center">
                        <div className="h-6 w-10 mx-auto bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1" />
                        <div className="h-2.5 w-14 mx-auto bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Main Component ---
export default function Algorithm() {
    const navigate = useNavigate();
    const [data, setData] = useState<AlgorithmData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
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
    const visibleUnitsData = useMemo(
        () => (expanded ? units : units.slice(0, visibleUnits)),
        [units, expanded]
    );
    const hasMoreUnits = units.length > visibleUnits;

    // ---- Graph series ----
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

    const toggleExpand = useCallback(() => setExpanded(prev => !prev), []);
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

    // 🎨 Vibrant multi-stop palettes per tier
    const theme = isHighScore
        ? {
            colors: ["#10b981", "#059669", "#0d9488"] as [string, string, string],
            glow: "#10b981",
            text: "text-emerald-600 dark:text-emerald-400",
            badgeBg: "bg-emerald-50 dark:bg-emerald-900/20",
        }
        : isMediumScore
            ? {
                colors: ["#f59e0b", "#f97316", "#ef4444"] as [string, string, string],
                glow: "#f97316",
                text: "text-amber-600 dark:text-amber-400",
                badgeBg: "bg-amber-50 dark:bg-amber-900/20",
            }
            : { colors: ["#ef4444", "#dc2626", "#b91c1c"] as [string, string, string], glow: "#ef4444", text: "text-red-600 dark:text-red-400", badgeBg: "bg-red-50 dark:bg-red-900/20" };
    return (
        <div className="w-full space-y-3 md:space-y-4">
            {/* ============================================ */}
            {/* HERO CARD — SCORE + EDGE-TO-EDGE GRAPH */}
            {/* ============================================ */}
            <div className="relative overflow-hidden rounded-2xl border-0 bg-white dark:bg-muted/30 shadow-sm">

                {/* Top block: label + big score (with side padding) */}
                <div className="px-5 md:px-8 pt-6 md:pt-8">
                    <div className="flex items-center justify-center gap-2 mb-5">
                        <Brain className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-[10px] md:text-xs font-normal tracking-[0.18em] text-gray-400 dark:text-gray-500 ">
                            Exam Prediction Readiness
                        </span>
                    </div>

                    <div className="flex flex-col items-center text-center">
                        <div className="flex items-baseline gap-0.5">
                            <span className={`text-4xl md:text-7xl font-semibold tracking-tight leading-none tabular-nums ${theme.text}`}>
                                {score.toFixed(1)}
                            </span>
                            <span className={`text-xl md:text-3xl font-normal ${theme.text}`}>%</span>
                        </div>

                        <p className="mt-3 text-xs md:text-sm font-normal text-gray-500 dark:text-gray-400">
                            {readiness} readiness
                        </p>

                        <p className="mt-1 text-xs md:text-sm font-normal text-gray-400 dark:text-gray-500 max-w-xs">
                            {isHighScore
                                ? "Strong performance — keep it up"
                                : isMediumScore
                                    ? "On track — a few more sessions to peak"
                                    : "Focus on weak units to raise this score"}
                        </p>
                    </div>
                </div>

                {/* 🔥 EDGE-TO-EDGE GRAPH — no side padding, bleeds both sides */}
                {/* 📊 REAL CHART — axes, grid, labels, tooltip */}
                {scoreSeries.length >= 2 && (
                    <div className="mt-6 w-full h-[220px] px-2">
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

                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />

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
                    </div>
                )}

                {/* Bottom block: divider + buttons + stats (with side padding) */}
                <div className="px-5 md:px-8 pb-6 md:pb-8">
                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-6" />

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => navigate("/Medrae-quizzes")}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5
                                bg-gray-900 dark:bg-white
                                hover:bg-gray-800 dark:hover:bg-gray-100
                                text-white dark:text-gray-900
                                text-xs md:text-sm font-normal rounded-xl
                                transition-colors active:scale-[0.98]"
                        >
                            <PlayCircle className="w-4 h-4" />
                            Practice
                        </button>
                        <button
                            onClick={() => navigate("/simulation/latest")}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5
                                bg-gray-50 dark:bg-gray-800
                                hover:bg-gray-100 dark:hover:bg-gray-700
                                text-gray-900 dark:text-white
                                border-0
                                text-xs md:text-sm font-normal rounded-xl
                                transition-colors active:scale-[0.98]"
                        >
                            <Target className="w-4 h-4" />
                            Simulate
                        </button>
                    </div>

                    <div className="grid grid-cols-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
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

            {/* ============================================ */}
            {/* UNIT BREAKDOWN */}
            {/* ============================================ */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Unit Mastery
                        </h3>
                    </div>
                    <span className="text-[8px] text-gray-400 dark:text-gray-500">Click to practice</span>
                </div>

                <div className="space-y-2">
                    {visibleUnitsData.map((unit) => {
                        const isWeak = unit.average_score < 60;
                        return (
                            <div
                                key={unit.quiz_id}
                                onClick={() => handleUnitClick(unit.quiz_id)}
                                className={`p-3 rounded-xl border-0 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${isWeak
                                    ? 'bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20'
                                    : 'bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-gray-700/30'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1.5">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                            {unit.unit_name}
                                        </h4>
                                        {isWeak && (
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 animate-pulse flex-shrink-0">
                                                Focus
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-lg font-black flex-shrink-0 ${isWeak ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                        {unit.average_score.toFixed(0)}%
                                    </span>
                                </div>

                                <div className="grid grid-cols-4 gap-1">
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{unit.best_score.toFixed(0)}%</p>
                                        <p className="text-[7px] text-gray-400 dark:text-gray-500 uppercase font-bold">Best</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400">{unit.latest_score.toFixed(0)}%</p>
                                        <p className="text-[7px] text-gray-400 dark:text-gray-500 uppercase font-bold">Latest</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-red-500 dark:text-red-400">{unit.worst_score.toFixed(0)}%</p>
                                        <p className="text-[7px] text-gray-400 dark:text-gray-500 uppercase font-bold">Lowest</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-purple-600 dark:text-purple-400">{unit.attempts}</p>
                                        <p className="text-[7px] text-gray-400 dark:text-gray-500 uppercase font-bold">Attempts</p>
                                    </div>
                                </div>

                                <div className="mt-1.5 flex items-center gap-1">
                                    <span className={`text-[8px] font-bold ${unit.trend === 'Improving' ? 'text-green-600 dark:text-green-400' : unit.trend === 'Declining' ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                                        {unit.trend === 'Improving' ? 'Improving' : unit.trend === 'Declining' ? 'Declining' : 'Stable'}
                                    </span>
                                    <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 ml-auto">
                                        {unit.practice_level || 'N/A'} Level
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {hasMoreUnits && (
                        <button
                            onClick={toggleExpand}
                            className="w-full py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-1"
                        >
                            {expanded ? (
                                <><ChevronUp className="w-3.5 h-3.5" /> Show Less</>
                            ) : (
                                <><ChevronDown className="w-3.5 h-3.5" /> Show {units.length - visibleUnits} More</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* ============================================ */}
            {/* STRENGTHS / FOCUS */}
            {/* ============================================ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-0">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Trophy className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
                        <h4 className="text-[10px] font-black text-green-800 dark:text-green-300 uppercase tracking-wider">Strengths</h4>
                    </div>
                    {data.rankings?.strongest.length > 0 ? (
                        data.rankings.strongest.slice(0, 3).map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-1 border-b border-green-200/30 dark:border-green-800/20 last:border-0">
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate mr-2">{i + 1}. {item.value.unit_name}</span>
                                <span className="text-xs font-black text-green-700 dark:text-green-400">{item.value.average_score.toFixed(0)}%</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Complete more units</p>
                    )}
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border-0">
                    <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
                        <h4 className="text-[10px] font-black text-red-800 dark:text-red-300 uppercase tracking-wider">Focus Areas</h4>
                    </div>
                    {data.rankings?.weakest.length > 0 ? (
                        data.rankings.weakest.slice(0, 3).map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-1 border-b border-red-200/30 dark:border-red-800/20 last:border-0">
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate mr-2">{i + 1}. {item.value.unit_name}</span>
                                <button
                                    onClick={() => handleUnitClick(item.value.quiz_id)}
                                    className="text-[8px] font-bold bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded-full transition-colors"
                                >
                                    Practice
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No critical areas</p>
                    )}
                </div>
            </div>

            {/* ============================================ */}
            {/* STUDY PLAN */}
            {/* ============================================ */}
            {data.recommendations?.length > 0 && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-gray-700/30">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                        <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Study Plan</h3>
                    </div>
                    <div className="space-y-1.5">
                        {data.recommendations.slice(0, 3).map((rec, i) => (
                            <div key={i} className="flex gap-2 items-start">
                                <CheckCircle2 className="w-3 h-3 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{rec}</p>
                            </div>
                        ))}
                        {data.recommendations.length > 3 && (
                            <button className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                                + {data.recommendations.length - 3} more tips
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-center gap-1.5 text-[8px] text-gray-400 dark:text-gray-500 py-1">
                <Clock className="w-2.5 h-2.5" />
                <span>Updated: {new Date(data.last_updated).toLocaleDateString()}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span className="text-blue-400 dark:text-blue-500">v2.2</span>
            </div>
        </div>
    );
}