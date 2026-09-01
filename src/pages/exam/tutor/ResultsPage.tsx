"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import React from 'react';
import {
    CheckCircle,
    Users,
    BarChart3,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronUp,
    Mail,
    Send,
    FileSearch,
    PieChart,
    ClipboardCheck,
    AlertCircle,
    RefreshCw,
    WifiOff,
    ServerCrash
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

type StudentResult = any;
type PaperResults = {
    paper: { id: string; title: string; is_released: boolean };
    results: StudentResult[];
};

// Skeleton Loader
const ExamResultsSkeleton = () => (
    <div className="min-h-screen bg-white dark:bg-background p-0 md:p-4 lg:p-8 transition-colors duration-300 pb-20 md:pb-6">
        <div className="w-full md:max-w-full md:px-4 lg:px-6 mx-auto space-y-4 md:space-y-6">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center px-4 md:px-0 pt-4 md:pt-0">
                <div>
                    <div className="h-6 md:h-7 w-48 md:w-56 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1.5" />
                    <div className="h-4 w-36 md:w-44 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
                <div className="h-9 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            </div>

            {/* Paper Cards Skeleton */}
            {[1, 2].map((i) => (
                <div key={i} className="space-y-3 px-4 md:px-0">
                    <div className="bg-white dark:bg-muted/30 p-4 md:p-6 rounded-none md:rounded-xl shadow-none md:shadow-sm border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="space-y-2">
                                <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                                <div className="h-6 md:h-7 w-52 md:w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            </div>
                            <div className="h-10 w-36 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                        </div>
                    </div>
                    {/* Stats Grid Skeleton */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map((j) => (
                            <div key={j} className="bg-white dark:bg-muted/30 p-3 md:p-4 rounded-lg md:rounded-2xl border-b border-slate-100 dark:border-slate-800 md:border-b-0 md:shadow-sm">
                                <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse mb-3" />
                                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1" />
                                <div className="h-5 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ExamResultsPage = () => {
    const [resultsByPaper, setResultsByPaper] = useState<PaperResults[]>([]);
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorType, setErrorType] = useState<"auth" | "network" | "server" | "general">("general");

    const fetchResults = async () => {
        setLoading(true);
        setErrorMessage("");
        try {
            const { data: papers, error: paperErr } = await supabase.from("exam_papers").select("id, title, is_released").order("created_at", { ascending: false });

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

            if (!papers || papers.length === 0) { setResultsByPaper([]); setLoading(false); return; }

            const resultsData = await Promise.all(
                papers.map(async (paper) => {
                    const { data: answerData } = await supabase.from("exam_answers").select("user_id, question_id, selected_answer, is_correct, answered_at").eq("paper_id", paper.id);
                    const userAnswersMap = new Map();
                    answerData?.forEach((ans) => {
                        if (!userAnswersMap.has(ans.user_id)) userAnswersMap.set(ans.user_id, []);
                        userAnswersMap.get(ans.user_id).push(ans);
                    });

                    const { data: questions } = await supabase.from("exam_questions").select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation").eq("paper_id", paper.id);
                    const totalQuestions = questions?.length || 0;

                    const userResults = await Promise.all(
                        Array.from(userAnswersMap.entries()).map(async ([userId, answers]) => {
                            const { data: profile } = await supabase.from("profiles").select("name, email, avatar_url").eq("user_id", userId).single();
                            let correctCount = 0;
                            answers.forEach((ans: any) => { if (ans.is_correct === true) correctCount++; });

                            const { data: existingResult } = await supabase.from("exam_results").select("*").eq("user_id", userId).eq("paper_id", paper.id).maybeSingle();
                            let resultRecord = existingResult;
                            if (!existingResult && answers.length > 0) {
                                const { data: newResult } = await supabase.from("exam_results").insert({ user_id: userId, paper_id: paper.id, score: correctCount, total_questions: totalQuestions, submitted_at: new Date().toISOString(), is_released: paper.is_released || false }).select().single();
                                if (newResult) resultRecord = newResult;
                            } else if (existingResult && existingResult.score !== correctCount) {
                                const { data: updatedResult } = await supabase.from("exam_results").update({ score: correctCount, total_questions: totalQuestions }).eq("id", existingResult.id).select().single();
                                if (updatedResult) resultRecord = updatedResult;
                            }

                            const fullAnswers = answers.map((ans: any) => {
                                const question = questions?.find((q: any) => q.id === ans.question_id);
                                return { ...ans, exam_questions: question || null };
                            });

                            return { id: resultRecord?.id || `temp-${userId}`, user_id: userId, paper_id: paper.id, score: resultRecord?.score || correctCount, total_questions: resultRecord?.total_questions || totalQuestions, submitted_at: resultRecord?.submitted_at || new Date().toISOString(), is_released: resultRecord?.is_released || paper.is_released || false, profile: profile || { name: "Unknown", email: "", avatar_url: null }, answers: fullAnswers || [] };
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

    const refreshResults = async () => { setRefreshing(true); await fetchResults(); setRefreshing(false); };

    useEffect(() => { fetchResults(); }, []);

    const releaseResults = async (paperId: string) => {
        const paper = resultsByPaper.find((p) => p.paper.id === paperId);
        const currentlyReleased = paper?.paper.is_released ?? false;
        const newReleaseState = !currentlyReleased;
        await supabase.from("exam_papers").update({ is_released: newReleaseState }).eq("id", paperId);
        await supabase.from("exam_results").update({ is_released: newReleaseState }).eq("paper_id", paperId);
        setResultsByPaper((prev) => prev.map((p) => p.paper.id === paperId ? { ...p, paper: { ...p.paper, is_released: newReleaseState }, results: p.results.map((r) => ({ ...r, is_released: newReleaseState })) } : p));
    };

    const toggleStudentRelease = async (resultId: string, current: boolean) => {
        await supabase.from("exam_results").update({ is_released: !current }).eq("id", resultId);
        setResultsByPaper((prev) => prev.map((p) => ({ ...p, results: p.results.map((r) => r.id === resultId ? { ...r, is_released: !current } : r) })));
    };

    if (loading) return <ExamResultsSkeleton />;

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
                        {errorType === "network" ? "Connection Lost" : errorType === "server" ? "Server Hiccup" : "Oops!"}
                    </h3>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">{errorMessage}</p>
                    <Button onClick={refreshResults} className="text-xs md:text-sm gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" /> Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-background p-0 md:p-4 lg:p-8 transition-colors duration-300 pb-20 md:pb-6">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 mx-auto space-y-4 md:space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center px-4 md:px-0 pt-4 md:pt-0">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Exam Results Dashboard</h1>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">View and manage student performance</p>
                    </div>
                    <Button onClick={refreshResults} disabled={refreshing} variant="outline" className="gap-1.5 text-xs md:text-sm h-9">
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {/* Empty State */}
                {!loading && (!resultsByPaper || resultsByPaper.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-16 md:py-20 text-center px-4">
                        <div className="bg-white dark:bg-muted/30 p-6 md:p-8 rounded-xl md:shadow-sm border border-slate-100 dark:border-slate-800 max-w-md w-full">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                                <FileSearch className="w-8 h-8 md:w-10 md:h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-2 md:mb-3 tracking-tight">No Records Found..Refresh Page</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                Exam results will populate here automatically once students submit their answers.
                            </p>
                        </div>
                    </div>
                )}

                {/* Paper Results List */}
                {resultsByPaper.map(({ paper, results }: any) => {
                    const average = results.length > 0 ? results.reduce((a: any, b: any) => a + b.score, 0) / results.length : 0;
                    if (results.length === 0) return null;

                    return (
                        <div key={paper.id} className="space-y-3">
                            {/* Paper Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-muted/30 p-4 md:p-6 md:rounded-xl md:shadow-sm border-0 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                        <Badge className={`text-[10px] md:text-xs ${paper.is_released ? "bg-blue-500" : "bg-amber-500"}`}>
                                            {paper.is_released ? "Public" : "Draft"}
                                        </Badge>
                                        <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">ID: {paper.id.slice(0, 8)}</span>
                                        <Badge variant="outline" className="text-[9px] md:text-[10px]">{results.length} Candidates</Badge>
                                    </div>
                                    <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{paper.title}</h1>
                                </div>
                                <Button
                                    onClick={() => releaseResults(paper.id)}
                                    className={`h-9 md:h-10 px-4 md:px-5 rounded-xl font-bold transition-all text-xs md:text-sm ${paper.is_released
                                        ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600"
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                        }`}
                                >
                                    <Send className="w-3.5 h-3.5 mr-1.5" />
                                    {paper.is_released ? "Revoke" : "Release All"}
                                </Button>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-4 md:px-0">
                                <StatCard label="Candidates" value={results.length} icon={<Users />} color="blue" />
                                <StatCard label="Avg. Score" value={`${average.toFixed(1)}%`} icon={<PieChart />} color="indigo" />
                                <StatCard label="Top Score" value={results.length ? `${Math.max(...results.map((r: any) => r.score))}%` : "0%"} icon={<TrendingUp />} color="emerald" />
                                <StatCard label="Lowest" value={results.length ? `${Math.min(...results.map((r: any) => r.score))}%` : "0%"} icon={<TrendingDown />} color="rose" />
                            </div>

                            {/* Candidate Roster */}
                            <div className="space-y-3 md:space-y-4 px-4 md:px-0">
                                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-400">Candidate Performance</h3>
                                {results.map((student: any) => {
                                    const percent = student.total_questions > 0 ? ((student.score / student.total_questions) * 100) : 0;
                                    const isExpanded = expandedStudent === student.id;

                                    return (
                                        <div
                                            key={student.id}
                                            className={`group transition-all duration-300 md:rounded-xl border overflow-hidden ${isExpanded
                                                ? "bg-white dark:bg-muted/30 border-0 md:ring-4 md:ring-indigo-50 dark:md:ring-indigo-900/10 md:shadow-xl"
                                                : "bg-white/60 dark:bg-slate-900/60 border-0 md:hover:border-slate-200"
                                                } border-b border-slate-100 dark:border-slate-800 md:border-b-0 ${!paper.is_released && !student.is_released ? "opacity-75" : ""}`}
                                        >
                                            <div className="p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                                                    <div className="relative">
                                                        <img
                                                            src={student.profile?.avatar_url || "/default-avatar.png"}
                                                            alt="Avatar"
                                                            className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md"
                                                            loading="lazy"
                                                        />
                                                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border-2 border-white dark:border-slate-900 ${student.is_released ? "bg-green-500" : "bg-slate-300"}`} />
                                                    </div>
                                                    <div>
                                                        <h2 className="font-bold text-slate-900 dark:text-white leading-none mb-0.5 text-sm md:text-base">{student.profile?.name || "Unknown"}</h2>
                                                        <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Mail className="w-2.5 h-2.5 md:w-3 md:h-3" /> {student.profile?.email || "No email"}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-between md:justify-end">
                                                    <label className="flex items-center gap-1.5 md:gap-2 cursor-pointer select-none bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                                                        <input type="checkbox" className="w-3.5 h-3.5 md:w-4 md:h-4 rounded border-slate-300 text-indigo-600" checked={!!student.is_released} onChange={() => toggleStudentRelease(student.id, student.is_released ?? false)} />
                                                        <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-500">Release</span>
                                                    </label>

                                                    <div className="text-right">
                                                        <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white">{student.score} <span className="text-slate-400 text-xs md:text-sm">/ {student.total_questions}</span></div>
                                                        <div className="w-20 md:w-24"><Progress value={percent} className={`h-1 md:h-1.5 mt-0.5 md:mt-1 ${percent > 70 ? "bg-emerald-500" : percent > 40 ? "bg-amber-500" : "bg-rose-500"}`} /></div>
                                                    </div>

                                                    <Button variant="ghost" size="icon" className={`rounded-xl h-8 w-8 md:h-9 md:w-9 ${isExpanded ? "bg-indigo-50 text-indigo-600" : ""}`} onClick={() => setExpandedStudent(isExpanded ? null : student.id)}>
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </Button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="px-4 md:px-6 pb-6 md:pb-8 space-y-4 md:space-y-6">
                                                    <Separator className="opacity-50" />
                                                    <h4 className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-black uppercase text-slate-400 tracking-widest"><ClipboardCheck className="w-3.5 h-3.5 md:w-4 md:h-4" /> Review</h4>
                                                    {student.answers?.length > 0 ? (
                                                        student.answers.map((ans: any, idx: number) => (
                                                            <div key={ans.id || idx} className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                                <div className="flex justify-between gap-3 md:gap-4 mb-3 md:mb-4">
                                                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs md:text-sm"><span className="text-slate-400 mr-1.5 md:mr-2">Q{idx + 1}.</span>{ans.exam_questions?.question_text || "N/A"}</p>
                                                                    {ans.is_correct ? (
                                                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none h-fit text-[10px] md:text-xs"><CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" /> Correct</Badge>
                                                                    ) : (
                                                                        <Badge className="bg-rose-500/10 text-rose-600 border-none h-fit text-[10px] md:text-xs"><XCircle className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" /> Wrong</Badge>
                                                                    )}
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                                                                    {["A", "B", "C", "D"].map((opt) => {
                                                                        const isSelected = ans.selected_answer === opt;
                                                                        const isCorrect = ans.exam_questions?.correct_answer === opt;
                                                                        return (
                                                                            <div key={opt} className={`p-2 md:p-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-medium border ${isCorrect ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 text-emerald-700" : isSelected ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 text-rose-700" : "bg-white dark:bg-muted/30 border-slate-200 dark:border-slate-700 text-slate-500"}`}>
                                                                                <span className="font-black mr-1.5 md:mr-2">{opt}:</span>{ans.exam_questions?.[`option_${opt.toLowerCase()}`] || "N/A"}
                                                                                {isSelected && !isCorrect && <span className="ml-1.5 italic text-[9px] md:text-[10px]">(Student)</span>}
                                                                                {isCorrect && <span className="ml-1.5 italic text-[9px] md:text-[10px]">(Key)</span>}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {ans.exam_questions?.explanation && (
                                                                    <div className="mt-3 md:mt-4 p-2.5 md:p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg md:rounded-xl border border-blue-100 dark:border-blue-800 text-[10px] md:text-[11px] text-blue-700 dark:text-blue-300 flex gap-1.5 md:gap-2">
                                                                        <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                                                                        <span><strong>Rationale:</strong> {ans.exam_questions.explanation}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center py-6 md:py-8 text-slate-400 text-xs md:text-sm">No detailed answers available.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ExamResultsPage;

// StatCard Sub-component
function StatCard({ label, value, icon, color }: any) {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20",
        indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20",
        emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20",
        rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/20",
    };
    return (
        <Card className="border-none shadow-none md:shadow-sm bg-white dark:bg-muted/30 md:rounded-2xl overflow-hidden group border-b border-slate-100 dark:border-slate-800 md:border-b-0">
            <CardContent className="p-3 md:p-5">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-3 transition-transform group-hover:scale-110 ${colors[color]}`}>
                    {React.cloneElement(icon, { size: 16 })}
                </div>
                <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-0.5 md:mb-1">{label}</p>
                <p className="text-lg md:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</p>
            </CardContent>
        </Card>
    );
}