"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Brain,
    Target,
    TrendingUp,
    AlertTriangle,
    Trophy,
    BookOpen,
    Sparkles,
    Zap,
    ChevronDown,
    ChevronUp,
    Clock,
    CheckCircle2,
    PlayCircle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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
}

// --- Skeleton Components (Compact) ---
function AlgorithmSkeleton() {
    return (
        <div className="w-full space-y-3 md:space-y-4">
            {/* Main Card Skeleton */}
            <div className="relative overflow-hidden rounded-xl border-0 bg-white dark:bg-slate-800/50 p-4 md:p-6 shadow-sm">
                <div className="flex flex-col items-center text-center">
                    <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse mb-3" />
                    <div className="flex items-center gap-4 mb-2">
                        <div className="h-12 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                        <div className="flex flex-col items-start gap-1">
                            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
            </div>

            {/* Stats Skeleton */}
            <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="p-3 bg-white dark:bg-slate-800/50 rounded-xl text-center">
                        <div className="h-6 w-10 mx-auto bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1" />
                        <div className="h-2.5 w-14 mx-auto bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                ))}
            </div>

            {/* Units Skeleton */}
            <div className="space-y-2">
                {[1, 2].map(i => (
                    <div key={i} className="p-3 bg-white dark:bg-slate-800/50 rounded-xl">
                        <div className="flex justify-between items-center">
                            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            <div className="h-5 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        </div>
                        <div className="grid grid-cols-4 gap-1 mt-2">
                            {[1, 2, 3, 4].map(j => (
                                <div key={j} className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            ))}
                        </div>
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
            const parse = (field: any) => typeof field === 'string' ? JSON.parse(field) : field;
            const formatted: AlgorithmData = {
                ...result,
                overall_prediction: parse(result.overall_prediction),
                unit_predictions: parse(result.unit_predictions),
                rankings: parse(result.rankings),
                simulation_analysis: parse(result.simulation_analysis),
                recommendations: parse(result.recommendations),
                confidence_data: parse(result.confidence_data),
            };
            setData(formatted);
            localStorage.setItem("medrae_algo_book_cache", JSON.stringify(formatted));
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadAlgorithm(); }, [loadAlgorithm]);

    const units = useMemo(() => data?.unit_predictions || [], [data?.unit_predictions]);
    const visibleUnitsData = useMemo(() => expanded ? units : units.slice(0, visibleUnits), [units, expanded, visibleUnits]);
    const hasMoreUnits = units.length > visibleUnits;

    const toggleExpand = useCallback(() => setExpanded(prev => !prev), []);
    const handleUnitClick = useCallback((unitId: string) => {
        navigate(`/Medrae-quizzes?unit=${unitId}`);
    }, [navigate]);

    if (loading && !data) {
        return <AlgorithmSkeleton />;
    }

    if (!data) return null;

    const score = data.overall_prediction?.predicted_score ?? 0;
    const readiness = data.overall_prediction?.readiness ?? "Not Available";
    const isHighScore = score >= 70;

    return (
        <div className="w-full space-y-3 md:space-y-4">
            {/* Main Prediction Card - Compact & Smart */}
            <div className="relative overflow-hidden rounded-xl border-0 bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-all">
                {/* Simple gradient background instead of image */}
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-transparent dark:from-blue-950/20 dark:via-purple-950/10 dark:to-transparent" />

                {/* Content */}
                <div className="relative z-10 p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {/* Left: Score */}
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-start">
                                <div className="flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        NCK Prediction
                                    </span>
                                </div>
                                <div className="flex items-end gap-2 mt-1">
                                    <span className={`text-3xl md:text-4xl font-black ${isHighScore ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                        {score.toFixed(1)}%
                                    </span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${readiness === 'High' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : readiness === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                                        {readiness}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Quick Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate("/Medrae-quizzes")}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
                            >
                                <PlayCircle className="w-3.5 h-3.5" />
                                Practice
                            </button>
                            <button
                                onClick={() => navigate("/simulation/latest")}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
                            >
                                <Target className="w-3.5 h-3.5" />
                                Simulate
                            </button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                        <div className="text-center">
                            <p className="text-sm font-black text-gray-900 dark:text-white">
                                {data.simulation_analysis?.attempts || 0}
                            </p>
                            <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                Simulations
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black text-green-600 dark:text-green-400">
                                {data.simulation_analysis?.average_score.toFixed(1) || 0}%
                            </p>
                            <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                Avg Score
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black text-purple-600 dark:text-purple-400">
                                {data.unit_predictions?.length || 0}
                            </p>
                            <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                Units
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Unit Breakdown - Compact Cards */}
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
                                className={`p-3 rounded-xl border-0 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${isWeak ? 'bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20' : 'bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-gray-700/30'}`}
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

                                {/* Mini trend indicator */}
                                <div className="mt-1.5 flex items-center gap-1">
                                    <span className={`text-[8px] font-bold ${unit.trend === 'Improving' ? 'text-green-600 dark:text-green-400' : unit.trend === 'Declining' ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                                        {unit.trend === 'Improving' ? '📈 Improving' : unit.trend === 'Declining' ? '📉 Declining' : '➡️ Stable'}
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

            {/* Strengths & Weaknesses - Side by side on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border border-green-200/50 dark:border-green-800/20">
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

                <div className="p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border border-red-200/50 dark:border-red-800/20">
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
                        <p className="text-xs text-gray-500 dark:text-gray-400">No critical areas!</p>
                    )}
                </div>
            </div>

            {/* Recommendations - Compact */}
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

            {/* Footer - Tiny */}
            <div className="flex items-center justify-center gap-1.5 text-[8px] text-gray-400 dark:text-gray-500 py-1">
                <Clock className="w-2.5 h-2.5" />
                <span>Updated: {new Date(data.last_updated).toLocaleDateString()}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span className="text-blue-400 dark:text-blue-500">v2.0</span>
            </div>
        </div>
    );
}