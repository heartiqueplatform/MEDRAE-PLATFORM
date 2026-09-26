"use client";
import { useEffect, useState } from "react";
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
    FileQuestion
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";

type StudentResult = any;

// Skeleton Loader
const ResultsDetailSkeleton = () => (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-background px-2 py-4 md:px-4 md:py-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
            {/* Back button skeleton */}
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />

            {/* Paper info card skeleton */}
            <div className="bg-white dark:bg-muted/30 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="space-y-2">
                    <div className="h-6 w-56 md:w-72 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-4 w-48 md:w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                    <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                    <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                </div>
            </div>

            {/* Result summary skeleton */}
            <div className="bg-white dark:bg-muted/30 rounded-2xl p-4 md:p-5 flex items-center justify-between gap-4">
                <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-10 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-10 w-36 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            </div>

            {/* Questions skeleton */}
            <div className="space-y-3">
                <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white dark:bg-muted/30 rounded-2xl p-4 space-y-3">
                        <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
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

    if (loading) return <ResultsDetailSkeleton />;

    if (errorMessage) {
        const errorIcons = { auth: AlertCircle, network: WifiOff, server: ServerCrash, general: AlertCircle };
        const errorColors = { auth: "text-amber-600 dark:text-amber-400", network: "text-orange-600 dark:text-orange-400", server: "text-rose-600 dark:text-rose-400", general: "text-red-600 dark:text-red-400" };
        const errorBgs = { auth: "bg-amber-50 dark:bg-amber-950/20", network: "bg-orange-50 dark:bg-orange-950/20", server: "bg-rose-50 dark:bg-rose-950/20", general: "bg-red-50 dark:bg-red-950/20" };
        const ErrorIcon = errorIcons[errorType];

        return (
            <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-background flex items-center justify-center px-4 py-8">
                <div className="text-center max-w-sm">
                    <div className={`w-16 h-16 md:w-20 md:h-20 ${errorBgs[errorType]} rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6`}>
                        <ErrorIcon className={`w-8 h-8 md:w-10 md:h-10 ${errorColors[errorType]}`} />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-2">
                        {errorType === "network" ? "Connection Lost"
                            : errorType === "auth" ? "Sign In Needed"
                                : errorType === "server" ? "Server Hiccup"
                                    : "Oops!"}
                    </h3>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                        {errorMessage}
                    </p>
                    <div className="flex gap-2 justify-center flex-wrap">
                        {errorType === "network" && (
                            <Button
                                onClick={() => window.location.reload()}
                                className="text-xs md:text-sm gap-1.5 border-0 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Try Again
                            </Button>
                        )}
                        {errorType === "auth" && (
                            <Button
                                onClick={() => navigate("/login")}
                                className="text-xs md:text-sm border-0 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Sign In
                            </Button>
                        )}
                        <Button
                            onClick={() => navigate(-1)}
                            className="text-xs md:text-sm border-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                            Go Back
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!paper || !result) {
        return (
            <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-background flex items-center justify-center px-4 py-8">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                        <FileQuestion className="w-8 h-8 md:w-10 md:h-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-2">
                        No Results Yet
                    </h3>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                        {!paper
                            ? "We couldn't find this exam. It may have been removed."
                            : "You haven't taken this exam yet. Complete it to see your results!"}
                    </p>
                    <Button
                        onClick={() => navigate(-1)}
                        className="text-xs md:text-sm border-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const percent = ((result.score / result.total_questions) * 100).toFixed(1);

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-background px-2 py-4 md:px-4 md:py-8 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto space-y-4 md:space-y-6"
            >
                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors font-medium"
                >
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm">Back to Dashboard</span>
                </button>

                {/* PAPER INFO CARD — flat */}
                <div className="bg-white dark:bg-muted/30 rounded-2xl p-4 md:p-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                        <div className="min-w-0">
                            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {paper.title}
                            </h1>
                            {paper.description && (
                                <p className="mt-1.5 text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {paper.description}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                                <BookOpen size={12} /> {paper.course || "N/A"}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                                <Layout size={12} /> Block {paper.block || "N/A"}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                                <Clock size={12} /> {paper.duration} mins
                            </span>
                        </div>
                    </div>
                </div>

                {/* RESULT SUMMARY CARD — flat */}
                <div className="bg-white dark:bg-muted/30 rounded-2xl p-4 md:p-5">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                        <div className="space-y-1 text-center md:text-left">
                            <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                Final Score
                            </p>
                            <div className="flex items-baseline gap-1.5 md:gap-2 justify-center md:justify-start">
                                <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
                                    {result.score}
                                </span>
                                <span className="text-base md:text-lg text-slate-400 dark:text-slate-500 font-bold">
                                    / {result.total_questions}
                                </span>
                            </div>
                        </div>

                        <div className="text-center">
                            <p className={`text-3xl md:text-4xl font-black ${Number(percent) >= 50 ? 'text-green-600 dark:text-green-500' : 'text-rose-600 dark:text-rose-500'}`}>
                                {percent}%
                            </p>
                            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                Accuracy
                            </p>
                        </div>

                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-xs md:text-sm active:scale-[0.98] border-0"
                        >
                            {expanded ? "Hide Review" : "Review Answers"}
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>

                {/* ANSWERS SECTION */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4, ease: "circOut" }}
                            className="overflow-hidden space-y-3 md:space-y-4"
                        >
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mt-2">
                                Question Analysis
                            </h2>

                            {answers.map((ans: any, index: number) => (
                                <motion.div
                                    key={ans.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white dark:bg-muted/30 rounded-2xl p-4 md:p-5"
                                >
                                    {/* Question header */}
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <p className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                                            <span className="text-slate-400 mr-1.5">
                                                Q{index + 1}.
                                            </span>
                                            {ans.exam_questions?.question_text}
                                        </p>
                                        {ans.is_correct ? (
                                            <div className="p-1 bg-green-100 dark:bg-green-950/40 rounded-full shrink-0">
                                                <CheckCircle className="text-green-600 dark:text-green-400 w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                        ) : (
                                            <div className="p-1 bg-rose-100 dark:bg-rose-950/40 rounded-full shrink-0">
                                                <XCircle className="text-rose-600 dark:text-rose-400 w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Options grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                                        {["A", "B", "C", "D"].map((opt) => {
                                            const isSelected = ans.selected_answer === opt;
                                            const isCorrect = ans.exam_questions?.correct_answer === opt;

                                            let optionClasses = "bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400";
                                            let letterClasses = "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300";

                                            if (isSelected && isCorrect) {
                                                optionClasses = "bg-green-600 text-white";
                                                letterClasses = "bg-white/25 text-white";
                                            } else if (isSelected && !isCorrect) {
                                                optionClasses = "bg-amber-500 text-white";
                                                letterClasses = "bg-white/25 text-white";
                                            } else if (isCorrect) {
                                                optionClasses = "bg-green-600 text-white";
                                                letterClasses = "bg-white/25 text-white";
                                            }

                                            return (
                                                <div
                                                    key={opt}
                                                    className={`p-2.5 md:p-3 rounded-xl text-xs md:text-sm transition-all flex items-center gap-2.5 md:gap-3 ${optionClasses}`}
                                                >
                                                    <span className={`w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full text-[10px] md:text-xs font-bold shrink-0 ${letterClasses}`}>
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
                                        <div className="mt-3 p-3 md:p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20">
                                            <p className="text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">
                                                Explanation
                                            </p>
                                            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
                                                {ans.exam_questions.explanation}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default StudentResultsPage;