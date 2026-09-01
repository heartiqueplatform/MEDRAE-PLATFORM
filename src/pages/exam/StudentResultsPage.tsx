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

// Skeleton Loader - starts at top
const ResultsDetailSkeleton = () => (
    <div className="min-h-screen bg-white dark:bg-background p-0 md:p-4 lg:p-8 pb-20 md:pb-6">
        <div className="w-full md:max-w-full md:px-4 lg:px-6 mx-auto space-y-4 md:space-y-6 px-0 md:px-0">
            {/* Back button skeleton */}
            <div className="px-4 md:px-0 pt-4 md:pt-0">
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>

            {/* Paper info card skeleton */}
            <div className="overflow-hidden rounded-none md:rounded-xl bg-white/80 dark:bg-muted/30 backdrop-blur-xl border-0 shadow-none md:shadow-sm border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                <div className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                        <div className="space-y-2 flex-1">
                            <div className="h-6 md:h-7 w-56 md:w-72 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            <div className="h-4 w-48 md:w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <div className="h-5 md:h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                            <div className="h-5 md:h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                            <div className="h-5 md:h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Result summary skeleton */}
                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3 md:p-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="space-y-1 text-center md:text-left">
                            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto md:mx-0" />
                            <div className="h-8 md:h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto md:mx-0" />
                        </div>
                        <div className="h-10 md:h-12 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="h-9 md:h-11 w-36 md:w-44 bg-slate-200 dark:bg-slate-700 rounded-lg md:rounded-xl animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Questions skeleton */}
            <div className="space-y-3 px-4 md:px-0">
                <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-2" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 md:p-5 rounded-xl border-b border-slate-100 dark:border-slate-800 md:rounded-2xl md:border md:shadow-sm">
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="h-4 md:h-5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            <div className="h-5 w-5 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mb-2">
                            {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="h-10 md:h-11 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                            ))}
                        </div>
                        <div className="h-14 md:h-16 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mt-2" />
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

                const { data: paperData, error: paperErr } = await supabase.from("exam_papers").select("*").eq("id", paper_id).maybeSingle();

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

                const { data: resData, error: resErr } = await supabase.from("exam_results").select("*").eq("paper_id", paper_id).eq("user_id", user.id).maybeSingle();
                if (resErr) { setResult(null); } else { setResult(resData); }

                const { data: answersData } = await supabase.from("exam_answers").select(`*, exam_questions(question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)`).eq("paper_id", paper_id).eq("user_id", user.id);
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
            <div className="min-h-screen bg-white dark:bg-background flex items-center justify-center p-4 md:p-8">
                <div className="text-center max-w-sm">
                    <div className={`w-16 h-16 md:w-20 md:h-20 ${errorBgs[errorType]} rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6`}>
                        <ErrorIcon className={`w-8 h-8 md:w-10 md:h-10 ${errorColors[errorType]}`} />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                        {errorType === "network" ? "Connection Lost" : errorType === "auth" ? "Sign In Needed" : errorType === "server" ? "Server Hiccup" : "Oops!"}
                    </h3>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">{errorMessage}</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                        {errorType === "network" && (
                            <Button onClick={() => window.location.reload()} className="text-xs md:text-sm gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5" /> Try Again
                            </Button>
                        )}
                        {errorType === "auth" && (
                            <Button onClick={() => navigate("/login")} className="text-xs md:text-sm">Sign In</Button>
                        )}
                        <Button variant="outline" onClick={() => navigate(-1)} className="text-xs md:text-sm">Go Back</Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!paper || !result) {
        return (
            <div className="min-h-screen bg-white dark:bg-background flex items-center justify-center p-4 md:p-8">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                        <FileQuestion className="w-8 h-8 md:w-10 md:h-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No Results Yet</h3>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                        {!paper ? "We couldn't find this exam. It may have been removed." : "You haven't taken this exam yet. Complete it to see your results!"}
                    </p>
                    <Button variant="outline" onClick={() => navigate(-1)} className="text-xs md:text-sm">Go Back</Button>
                </div>
            </div>
        );
    }

    const percent = ((result.score / result.total_questions) * 100).toFixed(1);

    return (
        <div className="min-h-screen bg-white dark:bg-background p-0 md:p-4 lg:p-8 pb-20 md:pb-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full md:max-w-full md:px-4 lg:px-6 mx-auto space-y-4 md:space-y-6 px-0 md:px-0"
            >
                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-1.5 md:gap-2 text-gray-500 hover:text-blue-600 transition-colors font-medium px-4 md:px-0 pt-4 md:pt-0"
                >
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm md:text-base">Back to Dashboard</span>
                </button>

                {/* Paper info Card */}
                <div className="overflow-hidden rounded-none md:rounded-xl bg-white/80 dark:bg-muted/30 backdrop-blur-xl border-0 shadow-none md:shadow-sm border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                    <div className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                            <div>
                                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">{paper.title}</h1>
                                {paper.description && (
                                    <p className="mt-1 md:mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{paper.description}</p>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 md:gap-2">
                                <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] md:text-xs font-bold uppercase tracking-wider border border-blue-100 dark:border-blue-800">
                                    <BookOpen size={12} /> {paper.course || "N/A"}
                                </span>
                                <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[9px] md:text-xs font-bold uppercase tracking-wider border border-purple-100 dark:border-purple-800">
                                    <Layout size={12} /> Block {paper.block || "N/A"}
                                </span>
                                <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[9px] md:text-xs font-bold uppercase tracking-wider">
                                    <Clock size={12} /> {paper.duration} mins
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Result Summary */}
                    <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-3 md:p-4">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                            <div className="space-y-0.5 md:space-y-1 text-center md:text-left">
                                <p className="text-[9px] md:text-xs font-medium text-gray-500 uppercase tracking-widest">Final Score</p>
                                <div className="flex items-baseline gap-1.5 md:gap-2">
                                    <span className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">{result.score}</span>
                                    <span className="text-base md:text-lg text-gray-400">/ {result.total_questions}</span>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className={`text-2xl md:text-3xl font-bold ${Number(percent) >= 50 ? 'text-green-500' : 'text-red-500'}`}>{percent}%</p>
                                <p className="text-[9px] md:text-xs font-medium text-gray-400 uppercase">Accuracy</p>
                            </div>
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg md:rounded-xl font-semibold transition-all shadow-md hover:shadow-blue-500/20 text-xs md:text-sm active:scale-[0.98]"
                            >
                                {expanded ? "Hide Review" : "Review Answers"}
                                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Answers Section */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4, ease: "circOut" }}
                            className="overflow-hidden space-y-3 md:space-y-4 px-4 md:px-0"
                        >
                            <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 mt-2 md:mt-0 mb-1 md:mb-0">Question Analysis</h2>
                            {answers.map((ans: any, index: number) => (
                                <motion.div
                                    key={ans.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`p-4 md:p-5 rounded-xl md:rounded-2xl border-0 md:border backdrop-blur-sm transition-all ${ans.is_correct
                                        ? "bg-white/70 dark:bg-muted/30 border-green-100 dark:border-green-900/30 md:shadow-sm"
                                        : "bg-white/70 dark:bg-muted/30 border-red-100 dark:border-red-900/30 md:shadow-sm"
                                        } border-b border-slate-100 dark:border-slate-800 md:border-b md:border-green-100 dark:border-green-900/30`}
                                >
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <p className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                                            <span className="text-gray-400 mr-1.5 md:mr-2">Q{index + 1}.</span>
                                            {ans.exam_questions?.question_text}
                                        </p>
                                        {ans.is_correct ? (
                                            <div className="p-0.5 md:p-1 bg-green-100 dark:bg-green-900/30 rounded-full shrink-0">
                                                <CheckCircle className="text-green-500 w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                        ) : (
                                            <div className="p-0.5 md:p-1 bg-red-100 dark:bg-red-900/30 rounded-full shrink-0">
                                                <XCircle className="text-red-500 w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2 mb-2">
                                        {["A", "B", "C", "D"].map((opt) => {
                                            const isSelected = ans.selected_answer === opt;
                                            const isCorrect = ans.exam_questions?.correct_answer === opt;
                                            return (
                                                <div key={opt} className={`p-2 md:p-2.5 rounded-lg md:rounded-xl border text-xs md:text-sm transition-all flex items-center gap-2 md:gap-3 ${isSelected && isCorrect ? "bg-green-600 text-white border-green-600" : isSelected ? "bg-yellow-500 text-black border-yellow-500 font-bold" : isCorrect ? "bg-green-600 text-white border-green-600 font-bold" : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400"}`}>
                                                    <span className={`w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full text-[10px] md:text-xs shrink-0 ${(isSelected || isCorrect) ? "bg-white/20" : "bg-gray-200 dark:bg-gray-700"}`}>{opt}</span>
                                                    {ans.exam_questions?.[`option_${opt.toLowerCase()}`]}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {ans.exam_questions?.explanation && (
                                        <div className="mt-3 md:mt-4 p-3 md:p-4 rounded-lg md:rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                                            <p className="text-[9px] md:text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5 md:mb-1">Explanation</p>
                                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 italic">{ans.exam_questions.explanation}</p>
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