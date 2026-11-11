"use client";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import React from 'react';

import {
    BarChart3,
    ChevronRight,
    ChevronLeft,
    Lock,
    BookOpen,
    Trophy,
    ClipboardList,
    GraduationCap,
    RefreshCw,
    WifiOff,
    AlertCircle,
    ServerCrash,
} from 'lucide-react';
import { playSound } from "@/lib/soundManager";

type Result = {
    id: string;
    paper_id: string;
    score: number;
    total_questions: number;
    submitted_at: string;
    is_released: boolean;
    exam_papers: {
        id: string;
        title: string;
        course: string;
        is_released: boolean;
    };
};

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

/* ------------------------------------------------------------------ */
/*  Skeletons                                                         */
/* ------------------------------------------------------------------ */

const ResultsSkeleton = () => (
    <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
        <header className="shrink-0 flex items-center gap-2 px-2 h-14
                           bg-white dark:bg-[#0d1117]
                           border-b border-slate-200/70 dark:border-white/[0.06]
                           safe-top">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-4 w-40 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-28 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
            </div>
            <div className="h-9 w-24 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-3 pb-24 safe-bottom">
            <div className="w-full max-w-[880px] mx-auto space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-2xl bg-white dark:bg-[#161b22] p-4 animate-pulse">
                        <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-white/[0.06] shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-40 md:w-52 bg-slate-200 dark:bg-white/[0.1] rounded" />
                                <div className="h-3 w-32 md:w-44 bg-slate-200 dark:bg-white/[0.1] rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    </div>
);

const ResultsListPage = () => {
    const navigate = useNavigate();
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorType, setErrorType] = useState<"network" | "server" | "general">("general");
    const [refreshing, setRefreshing] = useState(false);

    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) navigate(-1);
        else navigate("/dashboard/student", { replace: true });
    }, [navigate]);

    const fetchResults = async () => {
        try {
            setLoading(true);
            setErrorMessage("");

            const { data: { user }, error: userErr } = await supabase.auth.getUser();

            if (userErr) {
                if (userErr.message?.includes("fetch") || userErr.message?.includes("network") || !navigator.onLine) {
                    setErrorMessage("Oops! Looks like you're offline. Check your connection and try again.");
                    setErrorType("network");
                } else {
                    setErrorMessage("Having trouble reaching our servers. Pull down to refresh!");
                    setErrorType("server");
                }
                setLoading(false);
                return;
            }

            if (!user) {
                setErrorMessage("Your session needs a quick refresh. Pull down to reload!");
                setErrorType("server");
                setLoading(false);
                return;
            }

            const { data: answerData, error: answerErr } = await supabase
                .from("exam_answers")
                .select(`paper_id, question_id, selected_answer, is_correct, answered_at, exam_papers!inner (id, title, course, is_released)`)
                .eq("user_id", user.id)
                .order("answered_at", { ascending: false });

            if (answerErr) {
                if (answerErr.message?.includes("fetch") || answerErr.message?.includes("network") || !navigator.onLine) {
                    setErrorMessage("Oops! Looks like you're offline. Check your connection and try again.");
                    setErrorType("network");
                } else {
                    setErrorMessage("Having trouble loading your results. Pull down to refresh!");
                    setErrorType("server");
                }
                setLoading(false);
                return;
            }

            if (!answerData || answerData.length === 0) {
                setResults([]);
                setLoading(false);
                return;
            }

            const paperMap = new Map();
            answerData.forEach((ans: any) => {
                if (!paperMap.has(ans.paper_id)) {
                    paperMap.set(ans.paper_id, {
                        paper_id: ans.paper_id,
                        answers: [],
                        paper_info: ans.exam_papers
                    });
                }
                paperMap.get(ans.paper_id).answers.push(ans);
            });

            const processedResults = await Promise.all(
                Array.from(paperMap.values()).map(async ({ paper_id, answers, paper_info }) => {
                    const { data: questions } = await supabase
                        .from("exam_questions")
                        .select("id")
                        .eq("paper_id", paper_id);

                    const totalQuestions = questions?.length || 0;
                    let correctCount = 0;
                    answers.forEach((ans: any) => {
                        if (ans.is_correct === true) correctCount++;
                    });

                    const { data: existingResult } = await supabase
                        .from("exam_results")
                        .select("*")
                        .eq("user_id", user.id)
                        .eq("paper_id", paper_id)
                        .maybeSingle();

                    let resultRecord = existingResult;
                    if (!existingResult && answers.length > 0) {
                        const { data: newResult } = await supabase
                            .from("exam_results")
                            .insert({
                                user_id: user.id,
                                paper_id,
                                score: correctCount,
                                total_questions: totalQuestions,
                                submitted_at: new Date().toISOString(),
                                is_released: paper_info?.is_released || false,
                            })
                            .select()
                            .single();
                        if (newResult) resultRecord = newResult;
                    } else if (existingResult && existingResult.score !== correctCount) {
                        const { data: updatedResult } = await supabase
                            .from("exam_results")
                            .update({
                                score: correctCount,
                                total_questions: totalQuestions,
                            })
                            .eq("id", existingResult.id)
                            .select()
                            .single();
                        if (updatedResult) resultRecord = updatedResult;
                    }

                    return {
                        id: resultRecord?.id || `temp-${paper_id}`,
                        paper_id,
                        score: resultRecord?.score || correctCount,
                        total_questions: resultRecord?.total_questions || totalQuestions,
                        submitted_at: resultRecord?.submitted_at || answers[0]?.answered_at || new Date().toISOString(),
                        is_released: resultRecord?.is_released || paper_info?.is_released || false,
                        exam_papers: paper_info || {
                            id: paper_id,
                            title: "Untitled Exam",
                            course: "General",
                            is_released: false
                        },
                    };
                })
            );

            const validResults = processedResults
                .filter((r) => r !== null)
                .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

            setResults(validResults as Result[]);
            setLoading(false);

        } catch (err) {
            if (!navigator.onLine) {
                setErrorMessage("Oops! Looks like you're offline. Check your connection and try again.");
                setErrorType("network");
            } else {
                setErrorMessage("Something unexpected happened. Pull down to refresh or try again later.");
                setErrorType("server");
            }
            setLoading(false);
        }
    };

    const refreshResults = async () => {
        tap();
        setRefreshing(true);
        await fetchResults();
        setRefreshing(false);
    };

    useEffect(() => { fetchResults(); }, []);

    /* ─── LOADING ───────────────────────────────────────────── */
    if (loading) return <ResultsSkeleton />;

    /* ─── ERROR ─────────────────────────────────────────────── */
    if (errorMessage) {
        const errorIcons = { network: WifiOff, server: ServerCrash, general: AlertCircle };
        const errorColors = {
            network: "text-amber-600 dark:text-amber-400",
            server: "text-rose-600 dark:text-rose-400",
            general: "text-amber-600 dark:text-amber-400",
        };
        const errorBgs = {
            network: "bg-amber-50 dark:bg-amber-400/10",
            server: "bg-rose-50 dark:bg-rose-400/10",
            general: "bg-amber-50 dark:bg-amber-400/10",
        };
        const errorTitles = {
            network: "Connection lost",
            server: "Server hiccup",
            general: "Something's not right",
        };
        const ErrorIcon = errorIcons[errorType] || errorIcons.general;

        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white">
                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                   bg-white dark:bg-[#0d1117]
                                   border-b border-slate-200/70 dark:border-white/[0.06]
                                   z-30 safe-top">
                    <button
                        onClick={handleBack}
                        aria-label="Go back"
                        className="h-10 w-10 rounded-full flex items-center justify-center
                                   text-slate-700 dark:text-slate-200
                                   active:bg-slate-100 dark:active:bg-white/5
                                   transition-colors shrink-0"
                        style={{ touchAction: "manipulation" }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">
                            Results
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Something went wrong
                        </p>
                    </div>
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex items-center justify-center px-4 py-6">
                    <div className="text-center max-w-sm">
                        <div className={`h-16 w-16 ${errorBgs[errorType]} rounded-full
                                        flex items-center justify-center mx-auto mb-4`}>
                            <ErrorIcon className={`h-8 w-8 ${errorColors[errorType]}`} />
                        </div>
                        <h2 className="text-base font-bold mb-2">
                            {errorTitles[errorType]}
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                            {errorMessage}
                        </p>
                        <div className="flex gap-2 justify-center flex-wrap">
                            <button
                                onClick={refreshResults}
                                className="h-10 px-4 rounded-xl bg-blue-600 text-white
                                           text-sm font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Try again
                            </button>
                            <button
                                onClick={() => { tap(); window.location.reload(); }}
                                className="h-10 px-4 rounded-xl
                                           bg-slate-100 dark:bg-white/[0.06]
                                           text-slate-700 dark:text-slate-200
                                           text-sm font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Refresh page
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    /* ─── REAL PAGE ─────────────────────────────────────────── */
    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* ── HEADER ──────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors shrink-0"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate">
                        Exam results
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {results.length > 0
                            ? `${results.length} assessment${results.length > 1 ? "s" : ""}`
                            : "Official records"}
                    </p>
                </div>
                <button
                    onClick={refreshResults}
                    disabled={refreshing}
                    className="h-9 px-2.5 rounded-full flex items-center justify-center gap-1 shrink-0
                               bg-slate-100 dark:bg-white/[0.06]
                               active:bg-slate-200 dark:active:bg-white/[0.1]
                               disabled:opacity-50
                               transition-colors"
                    style={{ touchAction: "manipulation" }}
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                    <span className="text-[11px] font-semibold">
                        {refreshing ? "Refreshing" : "Refresh"}
                    </span>
                </button>
            </header>

            {/* ── SCROLLING BODY ──────────────────────────────── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto px-4 py-3 pb-24 safe-bottom space-y-3">

                    {results.length === 0 ? (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] py-14 px-6 text-center">
                            <div className="h-16 w-16 rounded-full
                                            bg-slate-100 dark:bg-white/[0.06]
                                            flex items-center justify-center mx-auto mb-4">
                                <ClipboardList className="h-7 w-7 text-slate-400 dark:text-slate-500" />
                            </div>
                            <h3 className="text-sm font-bold mb-1.5">
                                No records found
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                                You haven't completed any exams yet, or your results are still
                                being processed. Results will appear here automatically once
                                your tutor releases them.
                            </p>
                        </section>
                    ) : (
                        <div className="space-y-2">
                            {results.map((res) => {
                                const isReleased = res.exam_papers?.is_released && res.is_released;
                                const percentage = res.total_questions > 0
                                    ? ((res.score / res.total_questions) * 100).toFixed(1)
                                    : "0.0";

                                return (
                                    <div
                                        key={res.id}
                                        onClick={() => {
                                            if (isReleased) {
                                                tap();
                                                navigate(`/exam/${res.paper_id}/results`);
                                            }
                                        }}
                                        className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-3
                                                    rounded-2xl p-4 transition-colors
                                                    ${isReleased
                                                ? "bg-white dark:bg-[#161b22] cursor-pointer active:scale-[0.99] transition-transform"
                                                : "bg-slate-100/70 dark:bg-white/[0.04] opacity-75 cursor-not-allowed"
                                            }`}
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <div className="flex gap-3 items-start min-w-0">
                                            <div className={`mt-0.5 p-2 rounded-lg shrink-0
                                                            ${isReleased
                                                    ? "bg-emerald-50 dark:bg-emerald-400/10"
                                                    : "bg-slate-200 dark:bg-white/[0.06]"
                                                }`}>
                                                <BookOpen className={`h-4 w-4
                                                                     ${isReleased
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-slate-400 dark:text-slate-500"
                                                    }`} />
                                            </div>
                                            <div className="space-y-1 min-w-0">
                                                <h2 className="text-[12px] font-bold truncate leading-tight">
                                                    {res.exam_papers.title || "Untitled exam"}
                                                </h2>
                                                <div className="flex items-center gap-2 flex-wrap
                                                                text-[10px] text-slate-500 dark:text-slate-400">
                                                    <span className="font-bold uppercase tracking-wider">
                                                        {res.exam_papers.course || "General"}
                                                    </span>
                                                    <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                                    <span className="text-slate-400 dark:text-slate-500 tabular-nums">
                                                        ID: {res.paper_id.slice(0, 8)}
                                                    </span>
                                                    <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                                    <span className="text-slate-400 dark:text-slate-500">
                                                        {new Date(res.submitted_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-2 shrink-0">
                                            {isReleased ? (
                                                <>
                                                    <div className="text-right">
                                                        <div className="flex items-center justify-end gap-1.5
                                                                        text-emerald-600 dark:text-emerald-400
                                                                        text-base font-bold tabular-nums leading-none">
                                                            <Trophy className="h-4 w-4" />
                                                            {res.score}/{res.total_questions}
                                                        </div>
                                                        <div className="text-[10px] font-bold uppercase tracking-wider
                                                                        text-slate-400 dark:text-slate-500 mt-1">
                                                            {percentage}%
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600
                                                                             group-active:translate-x-0.5 transition-transform" />
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full
                                                                bg-amber-50 dark:bg-amber-400/10
                                                                text-amber-700 dark:text-amber-400
                                                                text-[10px] font-bold uppercase tracking-wider">
                                                    <Lock className="h-3 w-3" />
                                                    Pending release
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer note */}
                    <p className="text-[9px] text-center uppercase tracking-[0.2em] font-semibold
                                  text-slate-400 dark:text-slate-500 leading-relaxed pt-2">
                        Official academic transcript · Generated via institutional gateway
                    </p>
                </div>
            </main>
        </div>
    );
};

export default ResultsListPage;