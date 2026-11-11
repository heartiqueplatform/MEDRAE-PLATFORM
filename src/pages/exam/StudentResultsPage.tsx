"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    XCircle,
    Clock,
    BookOpen,
    Layout,
    WifiOff,
    AlertCircle,
    ServerCrash,
    RefreshCw,
    FileQuestion,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "@/lib/soundManager";

type StudentResult = any;

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

const ResultsDetailSkeleton = () => (
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
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-3 pb-24 safe-bottom">
            <div className="w-full max-w-[880px] mx-auto space-y-3">
                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3 animate-pulse">
                    <div className="h-5 w-56 md:w-72 bg-slate-200 dark:bg-white/[0.1] rounded" />
                    <div className="h-3 w-48 md:w-64 bg-slate-200 dark:bg-white/[0.1] rounded" />
                    <div className="flex gap-1.5">
                        <div className="h-6 w-20 bg-slate-200 dark:bg-white/[0.1] rounded-full" />
                        <div className="h-6 w-16 bg-slate-200 dark:bg-white/[0.1] rounded-full" />
                        <div className="h-6 w-20 bg-slate-200 dark:bg-white/[0.1] rounded-full" />
                    </div>
                </div>
                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 flex items-center justify-between gap-4 animate-pulse">
                    <div className="h-10 w-24 bg-slate-200 dark:bg-white/[0.1] rounded" />
                    <div className="h-10 w-20 bg-slate-200 dark:bg-white/[0.1] rounded" />
                    <div className="h-10 w-36 bg-slate-200 dark:bg-white/[0.1] rounded-xl" />
                </div>
            </div>
        </main>
    </div>
);

const StudentResultsPage = () => {
    const { paper_id } = useParams();
    const navigate = useNavigate();
    const [paper, setPaper] = useState<any>(null);
    const [result, setResult] = useState<StudentResult | null>(null);
    const [answers, setAnswers] = useState<any[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorType, setErrorType] = useState<"auth" | "network" | "server" | "general">("general");

    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) navigate(-1);
        else navigate("/dashboard/student", { replace: true });
    }, [navigate]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!paper_id || !/^[0-9a-fA-F-]{36}$/.test(paper_id)) {
                    setErrorMessage("This exam link doesn't look right. Please check and try again.");
                    setErrorType("general");
                    setLoading(false);
                    return;
                }

                const { data: { user }, error: userErr } = await supabase.auth.getUser();

                if (userErr) {
                    if (userErr.message?.includes("fetch") || userErr.message?.includes("network") || !navigator.onLine) {
                        setErrorMessage("Oops! Looks like you're offline. Check your connection and try again.");
                        setErrorType("network");
                    } else {
                        setErrorMessage("We couldn't verify your session. Please sign in again.");
                        setErrorType("auth");
                    }
                    setLoading(false);
                    return;
                }

                if (!user) {
                    setErrorMessage("Please sign in to view your exam results.");
                    setErrorType("auth");
                    setLoading(false);
                    return;
                }

                const { data: paperData, error: paperErr } = await supabase
                    .from("exam_papers")
                    .select("*")
                    .eq("id", paper_id)
                    .maybeSingle();

                if (paperErr) {
                    setErrorMessage("Having trouble loading this exam. Pull down to refresh!");
                    setErrorType("server");
                    setLoading(false);
                    return;
                }

                if (!paperData) {
                    setErrorMessage("We couldn't find this exam. It may have been removed.");
                    setErrorType("general");
                    setLoading(false);
                    return;
                }
                setPaper(paperData);

                const { data: resData, error: resErr } = await supabase
                    .from("exam_results")
                    .select("*")
                    .eq("paper_id", paper_id)
                    .eq("user_id", user.id)
                    .maybeSingle();
                if (resErr) { setResult(null); } else { setResult(resData); }

                const { data: answersData } = await supabase
                    .from("exam_answers")
                    .select(`*, exam_questions(question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)`)
                    .eq("paper_id", paper_id)
                    .eq("user_id", user.id);
                setAnswers(answersData || []);
            } catch (err) {
                setErrorMessage("Something unexpected happened. Please try again.");
                setErrorType("general");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [paper_id]);

    /* ─── LOADING ───────────────────────────────────────────── */
    if (loading) return <ResultsDetailSkeleton />;

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
            auth: "Sign in needed",
            server: "Server hiccup",
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
                            {errorType === "network" && (
                                <button
                                    onClick={() => { tap(); window.location.reload(); }}
                                    className="h-10 px-4 rounded-xl bg-blue-600 text-white
                                               text-sm font-bold
                                               flex items-center justify-center gap-1.5
                                               active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Try again
                                </button>
                            )}
                            {errorType === "auth" && (
                                <button
                                    onClick={() => { tap(); navigate("/login"); }}
                                    className="h-10 px-4 rounded-xl bg-blue-600 text-white
                                               text-sm font-bold
                                               active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    Sign in
                                </button>
                            )}
                            <button
                                onClick={handleBack}
                                className="h-10 px-4 rounded-xl
                                           bg-slate-100 dark:bg-white/[0.06]
                                           text-slate-700 dark:text-slate-200
                                           text-sm font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Go back
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    /* ─── NO RESULT ─────────────────────────────────────────── */
    if (!paper || !result) {
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
                            No results yet
                        </p>
                    </div>
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex items-center justify-center px-4 py-6">
                    <div className="text-center max-w-sm">
                        <div className="h-16 w-16 rounded-full
                                        bg-slate-100 dark:bg-white/[0.06]
                                        flex items-center justify-center mx-auto mb-4">
                            <FileQuestion className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h2 className="text-base font-bold mb-2">
                            No results yet
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                            {!paper
                                ? "We couldn't find this exam. It may have been removed."
                                : "You haven't taken this exam yet. Complete it to see your results!"}
                        </p>
                        <button
                            onClick={handleBack}
                            className="h-10 px-4 rounded-xl
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200
                                       text-sm font-bold
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            Go back
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const percent = ((result.score / result.total_questions) * 100).toFixed(1);

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
                        {paper.title || "Results"}
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {paper.course || "—"} · Block {paper.block || "—"}
                    </p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                 text-[10px] font-bold tabular-nums shrink-0
                                 ${Number(percent) >= 50
                        ? "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400"
                    }`}>
                    {percent}%
                </span>
            </header>

            {/* ── SCROLLING BODY ──────────────────────────────── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto px-4 py-3 pb-24 safe-bottom space-y-3">

                    {/* Paper info card */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className="space-y-1">
                            <h2 className="text-sm font-bold leading-tight">
                                {paper.title}
                            </h2>
                            {paper.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {paper.description}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                             text-[10px] font-bold uppercase tracking-wider
                                             bg-blue-50 dark:bg-blue-400/10
                                             text-blue-700 dark:text-blue-400">
                                <BookOpen className="h-3 w-3" />
                                {paper.course || "N/A"}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                             text-[10px] font-bold uppercase tracking-wider
                                             bg-violet-50 dark:bg-violet-400/10
                                             text-violet-700 dark:text-violet-400">
                                <Layout className="h-3 w-3" />
                                Block {paper.block || "N/A"}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                             text-[10px] font-bold uppercase tracking-wider
                                             bg-slate-100 dark:bg-white/[0.06]
                                             text-slate-600 dark:text-slate-300">
                                <Clock className="h-3 w-3" />
                                {paper.duration} mins
                            </span>
                        </div>
                    </section>

                    {/* Result summary */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="text-center md:text-left">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-slate-500 dark:text-slate-400 mb-1">
                                    Final score
                                </p>
                                <div className="flex items-baseline gap-1.5 justify-center md:justify-start">
                                    <span className="text-3xl font-bold tabular-nums leading-none
                                                     text-slate-900 dark:text-white">
                                        {result.score}
                                    </span>
                                    <span className="text-base font-bold text-slate-400 dark:text-slate-500">
                                        / {result.total_questions}
                                    </span>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className={`text-3xl font-bold tabular-nums leading-none
                                               ${Number(percent) >= 50
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-rose-600 dark:text-rose-400"
                                    }`}>
                                    {percent}%
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-slate-400 dark:text-slate-500 mt-1">
                                    Accuracy
                                </p>
                            </div>

                            <button
                                onClick={() => { tap(); setExpanded(!expanded); }}
                                className="h-10 px-4 rounded-xl bg-blue-600 text-white
                                           text-sm font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                {expanded ? "Hide review" : "Review answers"}
                                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                        </div>
                    </section>

                    {/* Answers expand/collapse */}
                    <AnimatePresence initial={false}>
                        {expanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="overflow-hidden space-y-2"
                            >
                                <h2 className="text-[11px] font-bold uppercase tracking-wider
                                               text-slate-500 dark:text-slate-400 mt-2 px-1">
                                    Question analysis
                                </h2>

                                {answers.map((ans: any, index: number) => (
                                    <div
                                        key={ans.id}
                                        className="rounded-2xl bg-white dark:bg-[#161b22] p-4"
                                    >
                                        {/* Question header */}
                                        <div className="flex justify-between items-start gap-2 mb-3">
                                            <p className="text-[12px] font-bold leading-snug
                                                          text-slate-900 dark:text-white">
                                                <span className="text-slate-400 dark:text-slate-500 mr-1.5 tabular-nums">
                                                    Q{index + 1}.
                                                </span>
                                                {ans.exam_questions?.question_text}
                                            </p>
                                            {ans.is_correct ? (
                                                <div className="p-1 rounded-full shrink-0
                                                                bg-emerald-50 dark:bg-emerald-400/10">
                                                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                            ) : (
                                                <div className="p-1 rounded-full shrink-0
                                                                bg-rose-50 dark:bg-rose-400/10">
                                                    <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Options */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                                            {["A", "B", "C", "D"].map((opt) => {
                                                const isSelected = ans.selected_answer === opt;
                                                const isCorrect = ans.exam_questions?.correct_answer === opt;

                                                let optionClasses = "bg-slate-50 dark:bg-[#0d1117] text-slate-600 dark:text-slate-300";
                                                let letterClasses = "bg-slate-200 dark:bg-white/[0.1] text-slate-600 dark:text-slate-300";

                                                if (isSelected && isCorrect) {
                                                    optionClasses = "bg-emerald-600 text-white";
                                                    letterClasses = "bg-white/25 text-white";
                                                } else if (isSelected && !isCorrect) {
                                                    optionClasses = "bg-amber-500 text-white";
                                                    letterClasses = "bg-white/25 text-white";
                                                } else if (isCorrect) {
                                                    optionClasses = "bg-emerald-600 text-white";
                                                    letterClasses = "bg-white/25 text-white";
                                                }

                                                return (
                                                    <div
                                                        key={opt}
                                                        className={`p-2.5 rounded-xl text-[11px]
                                                                    flex items-center gap-2.5
                                                                    ${optionClasses}`}
                                                    >
                                                        <span className={`h-5 w-5 flex items-center justify-center rounded-full
                                                                         text-[10px] font-bold shrink-0
                                                                         ${letterClasses}`}>
                                                            {opt}
                                                        </span>
                                                        <span className="leading-snug">
                                                            {ans.exam_questions?.[`option_${opt.toLowerCase()}`]}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Explanation */}
                                        {ans.exam_questions?.explanation && (
                                            <div className="rounded-xl bg-blue-50 dark:bg-blue-400/10 p-3">
                                                <p className="text-[10px] font-bold uppercase tracking-wider
                                                              text-blue-600 dark:text-blue-400 mb-1">
                                                    Explanation
                                                </p>
                                                <p className="text-[11px] text-slate-600 dark:text-slate-300
                                                              italic leading-relaxed">
                                                    {ans.exam_questions.explanation}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default StudentResultsPage;