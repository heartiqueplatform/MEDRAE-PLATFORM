"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import React from 'react';

import { BarChart3, ChevronRight, Lock, BookOpen, Trophy, ClipboardList, GraduationCap, RefreshCw, WifiOff, AlertCircle, ServerCrash } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

// Skeleton Loader Component
const ResultsSkeleton = () => (
    <div className="min-h-screen bg-white dark:bg-background p-0 md:p-4 lg:p-8 transition-colors duration-200 pb-20 md:pb-6">
        <div className="w-full md:max-w-full md:px-4 lg:px-6 mx-auto bg-white dark:bg-muted/30 rounded-none md:rounded-2xl border-0 shadow-none md:shadow-sm overflow-hidden border-b border-slate-100 dark:border-slate-800 md:border-b-0">
            {/* Header Skeleton */}
            <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="h-9 w-9 md:h-11 md:w-11 bg-slate-200 dark:bg-slate-700 rounded-lg md:rounded-xl animate-pulse" />
                        <div>
                            <div className="h-5 md:h-6 w-48 md:w-56 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1.5" />
                            <div className="h-3 md:h-4 w-36 md:w-44 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                        <div className="h-8 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                    </div>
                </div>
            </div>
            {/* Content Skeleton */}
            <div className="p-4 md:p-6 space-y-0 md:space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-3 md:p-4 border-b border-slate-100 dark:border-slate-800 md:border-b md:border-slate-200 md:dark:border-slate-700 md:rounded-xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex gap-2 md:gap-3 items-start">
                                <div className="h-8 w-8 md:h-9 md:w-9 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mt-0.5" />
                                <div className="space-y-1.5">
                                    <div className="h-4 md:h-5 w-40 md:w-52 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                    <div className="h-3 w-32 md:w-44 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-5 md:h-6 w-16 md:w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Footer Skeleton */}
            <div className="bg-slate-50/50 dark:bg-slate-900/30 p-2.5 md:p-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="h-3 w-64 mx-auto bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
        </div>
    </div>
);

const ResultsListPage = () => {
    const navigate = useNavigate();
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorType, setErrorType] = useState<"network" | "server" | "general">("general");
    const [refreshing, setRefreshing] = useState(false);

    const fetchResults = async () => {
        try {
            setLoading(true);
            setErrorMessage("");

            const { data: { user }, error: userErr } = await supabase.auth.getUser();

            if (userErr) {
                // Network error - can't reach Supabase
                if (userErr.message?.includes("fetch") || userErr.message?.includes("network") || !navigator.onLine) {
                    setErrorMessage("Oops! Looks like you're offline. Check your connection and try again.");
                    setErrorType("network");
                } else {
                    // Server/database error
                    setErrorMessage("Having trouble reaching our servers. Pull down to refresh!");
                    setErrorType("server");
                }
                setLoading(false);
                return;
            }

            if (!user) {
                // User session expired or not found - still a server/auth issue, not user's fault
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
            // Catch-all for unexpected errors
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

    const refreshResults = async () => { setRefreshing(true); await fetchResults(); setRefreshing(false); };

    useEffect(() => { fetchResults(); }, []);

    if (loading) return <ResultsSkeleton />;

    if (errorMessage) {
        const errorIcons = { network: WifiOff, server: ServerCrash, general: AlertCircle };
        const errorColors = { network: "text-orange-600 dark:text-orange-400", server: "text-rose-600 dark:text-rose-400", general: "text-amber-600 dark:text-amber-400" };
        const errorBgs = { network: "bg-orange-50 dark:bg-orange-950/20", server: "bg-rose-50 dark:bg-rose-950/20", general: "bg-amber-50 dark:bg-amber-950/20" };
        const errorTitles = { network: "Connection Lost", server: "Server Hiccup", general: "Something's Not Right" };
        const ErrorIcon = errorIcons[errorType] || errorIcons.general;

        return (
            <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-white dark:bg-background">
                <div className="text-center max-w-sm">
                    <div className={`w-16 h-16 md:w-20 md:h-20 ${errorBgs[errorType]} rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6`}>
                        <ErrorIcon className={`w-8 h-8 md:w-10 md:h-10 ${errorColors[errorType]}`} />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                        {errorTitles[errorType]}
                    </h3>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">{errorMessage}</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                        <Button onClick={refreshResults} className="text-xs md:text-sm gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5" /> Try Again
                        </Button>
                        <Button variant="outline" onClick={() => window.location.reload()} className="text-xs md:text-sm">
                            Refresh Page
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-white dark:bg-background p-0 md:p-4 lg:p-8 transition-colors duration-200 pb-20 md:pb-6">

            {/* Main Container */}
            <div className="w-full md:max-w-full md:px-4 lg:px-6 mx-auto bg-white dark:bg-muted/30 rounded-none md:rounded-2xl border-0 shadow-none md:shadow-sm overflow-hidden border-b border-slate-100 dark:border-slate-800 md:border-b-0">

                {/* Header Section */}
                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="h-9 w-9 md:h-11 md:w-11 bg-slate-100 dark:bg-slate-800 rounded-lg md:rounded-xl flex items-center justify-center shadow-inner">
                                <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <div>
                                <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                                    Official Results Portal
                                </h1>
                                <p className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Institutional Examination Records
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 md:gap-2">
                            <Button onClick={refreshResults} disabled={refreshing} variant="outline" size="sm" className="gap-1 md:gap-1.5 text-[10px] md:text-xs h-8 md:h-9">
                                <RefreshCw className={`h-3 w-3 md:h-3.5 md:w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Refresh</span>
                            </Button>

                            {results.length > 0 && (
                                <div className="flex items-center gap-1.5 md:gap-2 bg-slate-50 dark:bg-slate-900/50 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <GraduationCap className="h-3 w-3 md:h-3.5 md:w-3.5 text-slate-400" />
                                    <span className="text-[9px] md:text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {results.length} Assessment{results.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-4 md:p-6">
                    {results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-10 md:py-12 px-2">
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-3 md:mb-4">
                                <ClipboardList className="h-7 w-7 md:h-8 md:w-8 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-200 mb-1 md:mb-1.5">No Records Found</h3>
                            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                                You haven't completed any exams yet, or your results are still being processed.
                                Results will appear here automatically once your tutor releases them.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-0 md:space-y-3">
                            {results.map((res, index) => {
                                const isReleased = res.exam_papers?.is_released && res.is_released;
                                const percentage = res.total_questions > 0 ? ((res.score / res.total_questions) * 100).toFixed(1) : "0.0";

                                return (
                                    <div key={res.id}>
                                        <div
                                            onClick={() => isReleased && navigate(`/exam/${res.paper_id}/results`)}
                                            className={`group relative flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 md:rounded-xl md:border transition-all duration-200
                                                ${isReleased
                                                    ? "bg-white dark:bg-muted/30 hover:md:border-slate-400 dark:hover:md:border-slate-600 hover:md:shadow-md cursor-pointer"
                                                    : "bg-slate-50/50 dark:bg-slate-900/20 opacity-70 cursor-not-allowed"
                                                } border-b border-slate-100 dark:border-slate-800 md:border-b md:border-slate-200 dark:border-slate-800
                                            `}
                                        >
                                            <div className="flex gap-2 md:gap-3 items-start">
                                                <div className={`mt-0.5 p-1.5 rounded-lg ${isReleased ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                    <BookOpen className={`h-3.5 w-3.5 md:h-4 md:w-4 ${isReleased ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">{res.exam_papers.title || "Untitled Exam"}</h2>
                                                    <div className="flex items-center gap-1.5 md:gap-2">
                                                        <span className="text-[9px] md:text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{res.exam_papers.course || "General Assessment"}</span>
                                                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                        <span className="text-[9px] md:text-[10px] text-slate-400">ID: {res.paper_id.slice(0, 8)}</span>
                                                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                        <span className="text-[9px] md:text-[10px] text-slate-400">{new Date(res.submitted_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-2 md:mt-0 flex items-center justify-between md:justify-end gap-3 md:gap-4 border-t md:border-0 pt-2 md:pt-0 border-slate-100 dark:border-slate-800">
                                                {isReleased ? (
                                                    <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between">
                                                        <div className="text-right">
                                                            <div className="flex items-center justify-end gap-1 md:gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-sm md:text-lg">
                                                                <Trophy className="h-3.5 w-3.5 md:h-4 md:w-4" />{res.score}/{res.total_questions}
                                                            </div>
                                                            <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Score: {percentage}%</div>
                                                        </div>
                                                        <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-300 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform group-hover:md:translate-x-1" />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-0.5 md:py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-900/30 text-[9px] md:text-[10px] font-bold uppercase tracking-wide">
                                                        <Lock className="h-2.5 w-2.5 md:h-3 md:w-3" /> Pending Release
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Disclaimer */}
                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-2.5 md:p-3 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[8px] md:text-[10px] text-slate-400 uppercase tracking-[0.2em] font-medium">
                        Official Academic Transcript • Generated via Institutional Gateway
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResultsListPage;