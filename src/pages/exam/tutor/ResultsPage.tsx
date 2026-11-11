"use client";

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import React from "react";
import {
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    Mail,
    Send,
    FileSearch,
    PieChart,
    TrendingUp,
    TrendingDown,
    Users,
    ClipboardCheck,
    AlertCircle,
    RefreshCw,
    WifiOff,
    ServerCrash,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";

type StudentResult = any;
type PaperResults = {
    paper: { id: string; title: string; is_released: boolean };
    results: StudentResult[];
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
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

const ExamResultsSkeleton = () => (
    <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
        <header className="shrink-0 flex items-center gap-2 px-2 h-14
                           bg-white dark:bg-[#0d1117]
                           border-b border-slate-200/70 dark:border-white/[0.06]
                           safe-top">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-4 w-40 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-32 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
            </div>
            <div className="h-9 w-24 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-3 pb-24 safe-bottom">
            <div className="w-full max-w-[880px] mx-auto space-y-3">
                {[1, 2].map((i) => (
                    <div key={i} className="rounded-2xl bg-white dark:bg-[#161b22] p-4 animate-pulse space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1.5">
                                <div className="h-4 w-20 bg-slate-200 dark:bg-white/[0.1] rounded-full" />
                                <div className="h-4 w-48 bg-slate-200 dark:bg-white/[0.1] rounded" />
                            </div>
                            <div className="h-9 w-24 bg-slate-200 dark:bg-white/[0.1] rounded-lg" />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="rounded-xl bg-slate-50 dark:bg-white/[0.04] p-3 space-y-1.5">
                                    <div className="h-7 w-7 bg-slate-200 dark:bg-white/[0.1] rounded-lg" />
                                    <div className="h-2.5 w-16 bg-slate-200 dark:bg-white/[0.1] rounded" />
                                    <div className="h-4 w-12 bg-slate-200 dark:bg-white/[0.1] rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    </div>
);

const ExamResultsPage = () => {
    const navigate = useNavigate();
    const [resultsByPaper, setResultsByPaper] = useState<PaperResults[]>([]);
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorType, setErrorType] = useState<"auth" | "network" | "server" | "general">("general");

    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) navigate(-1);
        else navigate("/tutor/exams", { replace: true });
    }, [navigate]);

    const fetchResults = async () => {
        setLoading(true);
        setErrorMessage("");
        try {
            const { data: papers, error: paperErr } = await supabase
                .from("exam_papers")
                .select("id, title, is_released")
                .order("created_at", { ascending: false });

            if (paperErr) {
                if (paperErr.message?.includes("fetch") || !navigator.onLine) {
                    setErrorMessage("Oops! Looks like you're offline. Check your connection and try again.");
                    setErrorType("network");
                } else {
                    setErrorMessage("Having trouble reaching our servers. Pull down to refresh!");
                    setErrorType("server");
                }
                setLoading(false);
                return;
            }

            if (!papers || papers.length === 0) {
                setResultsByPaper([]);
                setLoading(false);
                return;
            }

            const resultsData = await Promise.all(
                papers.map(async (paper) => {
                    const { data: answerData } = await supabase
                        .from("exam_answers")
                        .select("user_id, question_id, selected_answer, is_correct, answered_at")
                        .eq("paper_id", paper.id);

                    const userAnswersMap = new Map();
                    answerData?.forEach((ans) => {
                        if (!userAnswersMap.has(ans.user_id)) userAnswersMap.set(ans.user_id, []);
                        userAnswersMap.get(ans.user_id).push(ans);
                    });

                    const { data: questions } = await supabase
                        .from("exam_questions")
                        .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation")
                        .eq("paper_id", paper.id);
                    const totalQuestions = questions?.length || 0;

                    const userResults = await Promise.all(
                        Array.from(userAnswersMap.entries()).map(async ([userId, answers]) => {
                            const { data: profile } = await supabase
                                .from("profiles")
                                .select("name, email, avatar_url")
                                .eq("user_id", userId)
                                .single();

                            let correctCount = 0;
                            answers.forEach((ans: any) => { if (ans.is_correct === true) correctCount++; });

                            const { data: existingResult } = await supabase
                                .from("exam_results")
                                .select("*")
                                .eq("user_id", userId)
                                .eq("paper_id", paper.id)
                                .maybeSingle();

                            let resultRecord = existingResult;
                            if (!existingResult && answers.length > 0) {
                                const { data: newResult } = await supabase
                                    .from("exam_results")
                                    .insert({
                                        user_id: userId,
                                        paper_id: paper.id,
                                        score: correctCount,
                                        total_questions: totalQuestions,
                                        submitted_at: new Date().toISOString(),
                                        is_released: paper.is_released || false,
                                    })
                                    .select()
                                    .single();
                                if (newResult) resultRecord = newResult;
                            } else if (existingResult && existingResult.score !== correctCount) {
                                const { data: updatedResult } = await supabase
                                    .from("exam_results")
                                    .update({ score: correctCount, total_questions: totalQuestions })
                                    .eq("id", existingResult.id)
                                    .select()
                                    .single();
                                if (updatedResult) resultRecord = updatedResult;
                            }

                            const fullAnswers = answers.map((ans: any) => {
                                const question = questions?.find((q: any) => q.id === ans.question_id);
                                return { ...ans, exam_questions: question || null };
                            });

                            return {
                                id: resultRecord?.id || `temp-${userId}`,
                                user_id: userId,
                                paper_id: paper.id,
                                score: resultRecord?.score || correctCount,
                                total_questions: resultRecord?.total_questions || totalQuestions,
                                submitted_at: resultRecord?.submitted_at || new Date().toISOString(),
                                is_released: resultRecord?.is_released || paper.is_released || false,
                                profile: profile || { name: "Unknown", email: "", avatar_url: null },
                                answers: fullAnswers || [],
                            };
                        })
                    );
                    return { paper, results: userResults };
                })
            );
            setResultsByPaper(resultsData);
        } catch (err) {
            setErrorMessage("Something unexpected happened. Please try again.");
            setErrorType("general");
        }
        setLoading(false);
    };

    const refreshResults = async () => {
        tap();
        setRefreshing(true);
        await fetchResults();
        setRefreshing(false);
    };

    useEffect(() => { fetchResults(); }, []);

    const releaseResults = async (paperId: string) => {
        tap();
        const paper = resultsByPaper.find((p) => p.paper.id === paperId);
        const currentlyReleased = paper?.paper.is_released ?? false;
        const newReleaseState = !currentlyReleased;
        await supabase.from("exam_papers").update({ is_released: newReleaseState }).eq("id", paperId);
        await supabase.from("exam_results").update({ is_released: newReleaseState }).eq("paper_id", paperId);
        setResultsByPaper((prev) =>
            prev.map((p) =>
                p.paper.id === paperId
                    ? {
                        ...p,
                        paper: { ...p.paper, is_released: newReleaseState },
                        results: p.results.map((r) => ({ ...r, is_released: newReleaseState })),
                    }
                    : p
            )
        );
    };

    const toggleStudentRelease = async (resultId: string, current: boolean) => {
        tap();
        await supabase.from("exam_results").update({ is_released: !current }).eq("id", resultId);
        setResultsByPaper((prev) =>
            prev.map((p) => ({
                ...p,
                results: p.results.map((r) => (r.id === resultId ? { ...r, is_released: !current } : r)),
            }))
        );
    };

    /* ─── LOADING ───────────────────────────────────────────── */
    if (loading) return <ExamResultsSkeleton />;

    /* ─── ERROR ─────────────────────────────────────────────── */
    if (errorMessage) {
        const errorIcons = { auth: AlertCircle, network: WifiOff, server: ServerCrash, general: AlertCircle };
        const errorColors = {
            auth: "text-amber-600 dark:text-amber-400",
            network: "text-amber-600 dark:text-amber-400",
            server: "text-rose-600 dark:text-rose-400",
            general: "text-rose-600 dark:text-rose-400",
        };
        const errorBgs = {
            auth: "bg-amber-50 dark:bg-amber-400/10",
            network: "bg-amber-50 dark:bg-amber-400/10",
            server: "bg-rose-50 dark:bg-rose-400/10",
            general: "bg-rose-50 dark:bg-rose-400/10",
        };
        const errorTitles = {
            network: "Connection lost",
            server: "Server hiccup",
            auth: "Sign in needed",
            general: "Oops!",
        };
        const ErrorIcon = errorIcons[errorType];

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
                            Exam results
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
                        <button
                            onClick={refreshResults}
                            className="h-10 px-4 rounded-xl bg-blue-600 text-white
                                       text-sm font-bold
                                       flex items-center justify-center gap-1.5 mx-auto
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Try again
                        </button>
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
                        {resultsByPaper.length > 0
                            ? `${resultsByPaper.length} paper${resultsByPaper.length > 1 ? "s" : ""} · ${resultsByPaper.reduce((a, p) => a + p.results.length, 0)} candidate${resultsByPaper.reduce((a, p) => a + p.results.length, 0) === 1 ? "" : "s"}`
                            : "View and manage performance"}
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

                    {/* Empty state */}
                    {(!resultsByPaper || resultsByPaper.length === 0) && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] py-14 px-6 text-center">
                            <div className="h-16 w-16 rounded-full
                                            bg-slate-100 dark:bg-white/[0.06]
                                            flex items-center justify-center mx-auto mb-4">
                                <FileSearch className="h-7 w-7 text-slate-400 dark:text-slate-500" />
                            </div>
                            <h2 className="text-sm font-bold mb-1.5">
                                No records found
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                                Exam results will populate here automatically once students
                                submit their answers. Tap refresh to check again.
                            </p>
                        </section>
                    )}

                    {/* Paper results */}
                    {resultsByPaper.map(({ paper, results }: any) => {
                        if (results.length === 0) return null;
                        const average = results.reduce((a: any, b: any) => a + b.score, 0) / results.length;

                        return (
                            <section key={paper.id} className="space-y-2">
                                {/* Paper header */}
                                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5
                                                                 text-[10px] font-bold uppercase tracking-wider
                                                                 ${paper.is_released
                                                        ? "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400"
                                                        : "bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400"
                                                    }`}>
                                                    {paper.is_released ? "Public" : "Draft"}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider
                                                                 text-slate-400 dark:text-slate-500 tabular-nums">
                                                    ID: {paper.id.slice(0, 8)}
                                                </span>
                                                <span className="inline-flex items-center rounded-full px-2 py-0.5
                                                                 text-[10px] font-bold uppercase tracking-wider
                                                                 bg-slate-100 dark:bg-white/[0.06]
                                                                 text-slate-600 dark:text-slate-300">
                                                    {results.length} candidate{results.length === 1 ? "" : "s"}
                                                </span>
                                            </div>
                                            <h2 className="text-sm font-bold leading-tight truncate">
                                                {paper.title}
                                            </h2>
                                        </div>

                                        <button
                                            onClick={() => releaseResults(paper.id)}
                                            className={`h-9 px-3 rounded-xl shrink-0
                                                        text-[11px] font-bold uppercase tracking-wider
                                                        flex items-center justify-center gap-1
                                                        active:scale-[0.97] transition-transform
                                                        ${paper.is_released
                                                    ? "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"
                                                    : "bg-emerald-600 text-white"
                                                }`}
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <Send className="h-3 w-3" />
                                            {paper.is_released ? "Revoke" : "Release"}
                                        </button>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                        <StatCard label="Candidates" value={results.length} icon={<Users />} color="blue" />
                                        <StatCard label="Avg score" value={`${average.toFixed(1)}%`} icon={<PieChart />} color="violet" />
                                        <StatCard
                                            label="Top score"
                                            value={results.length ? `${Math.max(...results.map((r: any) => r.score))}%` : "0%"}
                                            icon={<TrendingUp />}
                                            color="emerald"
                                        />
                                        <StatCard
                                            label="Lowest"
                                            value={results.length ? `${Math.min(...results.map((r: any) => r.score))}%` : "0%"}
                                            icon={<TrendingDown />}
                                            color="rose"
                                        />
                                    </div>
                                </div>

                                {/* Candidate roster */}
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider
                                                   text-slate-500 dark:text-slate-400 px-1 pt-1">
                                        Candidate performance
                                    </h3>

                                    {results.map((student: any) => {
                                        const percent = student.total_questions > 0
                                            ? (student.score / student.total_questions) * 100
                                            : 0;
                                        const isExpanded = expandedStudent === student.id;
                                        const dimmed = !paper.is_released && !student.is_released;

                                        return (
                                            <div
                                                key={student.id}
                                                className={`rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden
                                                            ${dimmed ? "opacity-75" : ""}`}
                                            >
                                                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="relative shrink-0">
                                                            <img
                                                                src={student.profile?.avatar_url || "/default-avatar.png"}
                                                                alt="Avatar"
                                                                className="h-10 w-10 rounded-full object-cover
                                                                           bg-slate-100 dark:bg-white/[0.06]"
                                                                loading="lazy"
                                                            />
                                                            <span
                                                                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full
                                                                            ring-2 ring-white dark:ring-[#161b22]
                                                                            ${student.is_released
                                                                        ? "bg-emerald-500"
                                                                        : "bg-slate-300 dark:bg-slate-600"
                                                                    }`}
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h2 className="text-[12px] font-bold truncate leading-tight">
                                                                {student.profile?.name || "Unknown"}
                                                            </h2>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400
                                                                          flex items-center gap-1 truncate mt-0.5">
                                                                <Mail className="h-3 w-3 shrink-0" />
                                                                <span className="truncate">
                                                                    {student.profile?.email || "No email"}
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <label
                                                            className="flex items-center gap-1.5 cursor-pointer select-none
                                                                       h-8 px-2.5 rounded-full
                                                                       bg-slate-100 dark:bg-white/[0.06]"
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="h-3.5 w-3.5 rounded border-slate-300
                                                                           text-blue-600 focus:ring-blue-500/40"
                                                                checked={!!student.is_released}
                                                                onChange={() => toggleStudentRelease(student.id, student.is_released ?? false)}
                                                            />
                                                            <span className="text-[10px] font-bold uppercase tracking-wider
                                                                             text-slate-600 dark:text-slate-300">
                                                                Release
                                                            </span>
                                                        </label>

                                                        <div className="text-right min-w-[64px]">
                                                            <div className="text-base font-bold tabular-nums leading-none">
                                                                {student.score}
                                                                <span className="text-slate-400 dark:text-slate-500 text-[11px] ml-0.5">
                                                                    / {student.total_questions}
                                                                </span>
                                                            </div>
                                                            <div className="w-20 mt-1.5 h-1 rounded-full overflow-hidden
                                                                            bg-slate-100 dark:bg-white/[0.06]">
                                                                <div
                                                                    className={`h-full rounded-full
                                                                                ${percent > 70
                                                                            ? "bg-emerald-500"
                                                                            : percent > 40
                                                                                ? "bg-amber-500"
                                                                                : "bg-rose-500"
                                                                        }`}
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                tap();
                                                                setExpandedStudent(isExpanded ? null : student.id);
                                                            }}
                                                            aria-label={isExpanded ? "Collapse" : "Expand"}
                                                            className={`h-8 w-8 rounded-full flex items-center justify-center
                                                                        transition-colors shrink-0
                                                                        ${isExpanded
                                                                    ? "bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400"
                                                                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                                                                }`}
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="px-4 pb-4 space-y-2">
                                                        <div className="h-px bg-slate-200/60 dark:bg-white/[0.06]" />

                                                        <h4 className="flex items-center gap-1.5
                                                                       text-[10px] font-bold uppercase tracking-wider
                                                                       text-slate-500 dark:text-slate-400 pt-1">
                                                            <ClipboardCheck className="h-3 w-3" />
                                                            Answer review
                                                        </h4>

                                                        {student.answers?.length > 0 ? (
                                                            student.answers.map((ans: any, idx: number) => (
                                                                <div
                                                                    key={ans.id || idx}
                                                                    className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2"
                                                                >
                                                                    <div className="flex justify-between gap-2">
                                                                        <p className="text-[11px] font-bold leading-snug flex-1 min-w-0">
                                                                            <span className="text-slate-400 dark:text-slate-500 mr-1.5 tabular-nums">
                                                                                Q{idx + 1}.
                                                                            </span>
                                                                            {ans.exam_questions?.question_text || "N/A"}
                                                                        </p>
                                                                        {ans.is_correct ? (
                                                                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 shrink-0
                                                                                             text-[10px] font-bold
                                                                                             bg-emerald-50 dark:bg-emerald-400/10
                                                                                             text-emerald-700 dark:text-emerald-400">
                                                                                <CheckCircle2 className="h-3 w-3" />
                                                                                Correct
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 shrink-0
                                                                                             text-[10px] font-bold
                                                                                             bg-rose-50 dark:bg-rose-400/10
                                                                                             text-rose-700 dark:text-rose-400">
                                                                                <XCircle className="h-3 w-3" />
                                                                                Wrong
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                        {["A", "B", "C", "D"].map((opt) => {
                                                                            const isSelected = ans.selected_answer === opt;
                                                                            const isCorrect = ans.exam_questions?.correct_answer === opt;

                                                                            const cls = isCorrect
                                                                                ? "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300"
                                                                                : isSelected
                                                                                    ? "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-300"
                                                                                    : "bg-white dark:bg-[#161b22] text-slate-600 dark:text-slate-300";

                                                                            return (
                                                                                <div
                                                                                    key={opt}
                                                                                    className={`p-2 rounded-lg text-[11px] leading-snug ${cls}`}
                                                                                >
                                                                                    <span className="font-bold mr-1.5">
                                                                                        {opt}:
                                                                                    </span>
                                                                                    {ans.exam_questions?.[`option_${opt.toLowerCase()}`] || "N/A"}
                                                                                    {isSelected && !isCorrect && (
                                                                                        <span className="ml-1.5 italic text-[9px] opacity-70">
                                                                                            (Student)
                                                                                        </span>
                                                                                    )}
                                                                                    {isCorrect && (
                                                                                        <span className="ml-1.5 italic text-[9px] opacity-70">
                                                                                            (Key)
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    {ans.exam_questions?.explanation && (
                                                                        <div className="rounded-lg bg-blue-50 dark:bg-blue-400/10 p-2.5
                                                                                        flex gap-1.5">
                                                                            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5
                                                                                                   text-blue-600 dark:text-blue-400" />
                                                                            <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                                                                                <strong>Rationale:</strong>{" "}
                                                                                {ans.exam_questions.explanation}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-center py-6 text-[11px]
                                                                            text-slate-400 dark:text-slate-500">
                                                                No detailed answers available.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default ExamResultsPage;

/* ------------------------------------------------------------------ */
/*  StatCard                                                          */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, icon, color }: any) {
    const colors: any = {
        blue: "bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400",
        violet: "bg-violet-50 dark:bg-violet-400/10 text-violet-600 dark:text-violet-400",
        emerald: "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
        rose: "bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400",
    };
    return (
        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>
                {React.cloneElement(icon, { size: 14 })}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider
                          text-slate-500 dark:text-slate-400 leading-none mb-1">
                {label}
            </p>
            <p className="text-base font-bold tabular-nums leading-none
                          text-slate-900 dark:text-white">
                {value}
            </p>
        </div>
    );
}