"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import React from 'react';

import { BarChart3, ChevronRight, Lock, BookOpen, Trophy, ClipboardList, GraduationCap } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

const ResultsListPage = () => {
    const navigate = useNavigate();
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchResults = async () => {
            try {
                setLoading(true);
                setErrorMessage("");

                const {
                    data: { user },
                    error: userErr,
                } = await supabase.auth.getUser();

                if (userErr || !user) {
                    setErrorMessage("You must be logged in.");
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from("exam_results")
                    .select(`
                        id,
                        paper_id,
                        score,
                        total_questions,
                        submitted_at,
                            is_released,
                        exam_papers!inner (
                            id,
                            title,
                            course,
                            is_released
                        )
                    `)
                    .eq("user_id", user.id)
                    .order("submitted_at", { ascending: false });

                if (error) {
                    console.error(error);
                    setErrorMessage("Failed to load results.");
                    setLoading(false);
                    return;
                }

                setResults(data || []);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setErrorMessage("Something went wrong.");
                setLoading(false);
            }
        };

        fetchResults();
    }, []);

    if (loading) return <GlobalLoader />;
    if (errorMessage) return <p className="p-8">{errorMessage}</p>;


    return (
        /* BACKGROUND COLORS PRESERVED: bg-slate-50 (Light) | bg-[#18191a] (Dark) */
        <div className="min-h-screen bg-slate-50 dark:bg-background p-4 md:p-10 transition-colors duration-200">

            {/* CONTAINER COLOR PRESERVED: bg-white (Light) | bg-[#242526] (Dark) */}
            <div className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-900 rounded-2xl border-0 shadow-sm overflow-hidden">

                {/* Header Section */}
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-inner">
                                <BarChart3 className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                                    Official Results Portal
                                </h1>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Institutional Examination Records
                                </p>
                            </div>
                        </div>

                        {results.length > 0 && (
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                <GraduationCap className="h-4 w-4 text-slate-400" />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {results.length} Assessments Recorded
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-6 md:p-8">
                    {results.length === 0 ? (
                        /* Professional Empty State */
                        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                                <ClipboardList className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No Records Found</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                                You currently have no examination results linked to your institutional account.
                                Scores will appear here automatically once released by your tutor or department.
                            </p>
                        </div>
                    ) : (
                        /* Results List */
                        <div className="space-y-4">
                            {results.map((res) => {
                                const isReleased = res.exam_papers?.is_released && res.is_released;
                                const percentage = ((res.score / res.total_questions) * 100).toFixed(1);

                                return (
                                    <div
                                        key={res.id}
                                        onClick={() => isReleased && navigate(`/exam/${res.paper_id}/results`)}
                                        className={`group relative flex flex-col md:flex-row md:items-center justify-between p-5 rounded-xl border transition-all duration-200
                                            ${isReleased
                                                ? "bg-white dark:bg-gray-800 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md cursor-pointer"
                                                : "bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800 opacity-70 cursor-not-allowed"
                                            }`}
                                    >
                                        {/* Left Side: Exam Info */}
                                        <div className="flex gap-4 items-start">
                                            <div className={`mt-1 p-2 rounded-lg ${isReleased ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                <BookOpen className={`h-5 w-5 ${isReleased ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                                            </div>
                                            <div className="space-y-1">
                                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                                    {res.exam_papers.title}
                                                </h2>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                        {res.exam_papers.course || "General Assessment"}
                                                    </span>
                                                    <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                    <span className="text-xs text-slate-400">
                                                        ID: {res.paper_id.slice(0, 8)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Score or Locked Status */}
                                        <div className="mt-4 md:mt-0 flex items-center justify-between md:justify-end gap-6 border-t md:border-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
                                            {isReleased ? (
                                                <div className="flex items-center gap-5">
                                                    <div className="text-right">
                                                        <div className="flex items-center justify-end gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xl">
                                                            <Trophy className="h-5 w-5" />
                                                            {res.score}/{res.total_questions}
                                                        </div>
                                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                                            Final Grade: {percentage}%
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-1" />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-900/30 text-xs font-bold uppercase tracking-wide">
                                                    <Lock className="h-3.5 w-3.5" />
                                                    Pending Verification
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Disclaimer */}
                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-medium">
                        Official Academic Transcript • Generated via Institutional Gateway
                    </p>
                </div>
            </div>
        </div>
    );
};


export default ResultsListPage;