"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import { GlobalLoader } from "@/components/GlobalLoader";
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
    AlertCircle
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

const ExamResultsPage = () => {
    const [resultsByPaper, setResultsByPaper] = useState<PaperResults[]>([]);
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const { data: papers, error: paperErr } = await supabase
                .from("exam_papers")
                .select("id, title, is_released")
                .order("created_at", { ascending: false });

            if (paperErr) throw paperErr;
            if (!papers || papers.length === 0) {
                setResultsByPaper([]);
                setLoading(false);
                return;
            }

            const resultsData = await Promise.all(
                papers.map(async (paper) => {
                    const { data: resData, error: resErr } = await supabase
                        .from("exam_results")
                        .select("*")
                        .eq("paper_id", paper.id)
                        .order("submitted_at", { ascending: false });

                    if (resErr) console.error("Results fetch error:", resErr);

                    const resultsWithProfiles = await Promise.all(
                        (resData || []).map(async (res) => {
                            const { data: profile } = await supabase
                                .from("profiles")
                                .select("name, email, avatar_url")
                                .eq("user_id", res.user_id)
                                .single();

                            const { data: answers } = await supabase
                                .from("exam_answers")
                                .select(
                                    `*, exam_questions(question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)`
                                )
                                .eq("paper_id", paper.id)
                                .eq("user_id", res.user_id);

                            return {
                                ...res,
                                profile: profile || {},
                                answers: answers || [],
                            };
                        })
                    );

                    return { paper, results: resultsWithProfiles };
                })
            );

            setResultsByPaper(resultsData);
        } catch (err) {
            console.error("Error fetching results:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchResults();
    }, []);

    const releaseResults = async (paperId: string) => {
        setLoading(true);

        // Find current release status from state
        const paper = resultsByPaper.find((p) => p.paper.id === paperId);
        const currentlyReleased = paper?.paper.is_released ?? false;
        const newReleaseState = !currentlyReleased;

        // Update exam_papers
        const { error: paperErr } = await supabase
            .from("exam_papers")
            .update({ is_released: newReleaseState })
            .eq("id", paperId);

        if (paperErr) {
            console.error("Failed to update paper release:", paperErr);
            setLoading(false);
            return;
        }

        // Update all student exam_results for this paper
        const { error: studentErr } = await supabase
            .from("exam_results")
            .update({ is_released: newReleaseState })
            .eq("paper_id", paperId);

        if (studentErr) console.error("Failed to update student results:", studentErr);

        // Update local UI state
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

        setLoading(false);
    };
    const toggleStudentRelease = async (
        resultId: string,
        current: boolean
    ) => {

        const { data, error } = await supabase
            .from("exam_results")
            .update({ is_released: !current })
            .eq("id", resultId)
            .select();
        if (error) {
            console.error("Student release update failed:", error);
            return;
        }
        setResultsByPaper((prev) =>
            prev.map((p) => ({
                ...p,
                results: p.results.map((r) =>
                    r.id === resultId
                        ? { ...r, is_released: !current }
                        : r
                ),
            }))
        );
    };
    return (

        <div className="min-h-screen bg-[#F8FAFC] dark:bg-background p-4 md:p-8 transition-colors duration-300">
            <div className="max-w-5xl mx-auto space-y-4">

                {loading && <GlobalLoader />}

                {/* ---------- EMPTY STATE ---------- */}
                {!loading && (!resultsByPaper || resultsByPaper.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
                        <div className="bg-white dark:bg-slate-900 p-10 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 max-w-md">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <FileSearch className="w-10 h-10 text-slate-300" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">No Records Found</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                Exam results will populate here automatically once students finalize their submissions.
                            </p>
                        </div>
                    </div>
                )}

                {/* ---------- PAPER RESULTS LIST ---------- */}
                {resultsByPaper.map(({ paper, results }: any) => {
                    const average = results.length > 0
                        ? results.reduce((a: any, b: any) => a + b.score, 0) / results.length
                        : 0;

                    return (
                        <div key={paper.id} className="space-y-3">

                            {/* Paper Header Section */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border-0 ">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge className={paper.is_released ? "bg-blue-500" : "bg-amber-500"}>
                                            {paper.is_released ? "Public" : "Draft Mode"}
                                        </Badge>
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Exam Code: {paper.id.slice(0, 8)}</span>
                                    </div>
                                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {paper.title}
                                    </h1>
                                </div>

                                <Button
                                    onClick={() => releaseResults(paper.id)}
                                    className={`h-12 px-6 rounded-xl font-bold transition-all shadow-lg ${paper.is_released
                                        ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600"
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none"
                                        }`}
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    {paper.is_released ? "Revoke Access" : "Release All Results"}
                                </Button>
                            </div>

                            {/* ANALYTICS GRID */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                <StatCard label="Candidates" value={results.length} icon={<Users />} color="blue" />
                                <StatCard label="Avg. Proficiency" value={`${average.toFixed(1)}%`} icon={<PieChart />} color="indigo" />
                                <StatCard label="Top Performance" value={results.length ? Math.max(...results.map((r: any) => r.score)) : 0} icon={<TrendingUp />} color="emerald" />
                                <StatCard label="Lowest Score" value={results.length ? Math.min(...results.map((r: any) => r.score)) : 0} icon={<TrendingDown />} color="rose" />
                            </div>

                            {/* CANDIDATE ROSTER */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Candidate Performance Roster</h3>
                                {results.map((student: any) => {
                                    const percent = ((student.score / student.total_questions) * 100);
                                    const isExpanded = expandedStudent === student.id;

                                    return (
                                        <div
                                            key={student.id}
                                            className={`group transition-all duration-300 rounded-xl border overflow-hidden ${isExpanded
                                                ? "bg-white dark:bg-slate-900 border-0 ring-4 ring-indigo-50 dark:ring-indigo-900/10 shadow-xl"
                                                : "bg-white/60 dark:bg-slate-900/60 border-0  hover:border-slate-200"
                                                } ${!paper.is_released && !student.is_released ? "opacity-75 grayscale-[0.3]" : ""}`}
                                        >
                                            <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-3">
                                                {/* Profile Info */}
                                                <div className="flex items-center gap-4 w-full md:w-auto">
                                                    <div className="relative">
                                                        <img
                                                            src={student.profile?.avatar_url || "/default-avatar.png"}
                                                            alt="Avatar"
                                                            className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md"
                                                        />
                                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${student.is_released ? "bg-green-500" : "bg-slate-300"}`} />
                                                    </div>
                                                    <div>
                                                        <h2 className="font-bold text-slate-900 dark:text-white leading-none mb-1">
                                                            {student.profile?.name || "Unknown Candidate"}
                                                        </h2>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> {student.profile?.email}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Middle Controls: Toggle Release */}
                                                <div className="flex items-center bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                            checked={!!student.is_released}
                                                            onChange={() => toggleStudentRelease(student.id, student.is_released ?? false)}
                                                        />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Individual Release</span>
                                                    </label>
                                                </div>

                                                {/* Performance & Actions */}
                                                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                                    <div className="text-right">
                                                        <div className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                            {student.score} <span className="text-slate-400 text-sm font-medium">/ {student.total_questions}</span>
                                                        </div>
                                                        <div className="w-24">
                                                            <Progress value={percent} className={`h-1.5 mt-1 ${percent > 70 ? "bg-emerald-500" : percent > 40 ? "bg-amber-500" : "bg-rose-500"}`} />
                                                        </div>
                                                    </div>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`rounded-xl transition-transform ${isExpanded ? "bg-indigo-50 text-indigo-600" : ""}`}
                                                        onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                                                    >
                                                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* EXPANDED ANSWERS SECTION */}
                                            {isExpanded && (
                                                <div className="px-6 pb-8 space-y-6 animate-in slide-in-from-top duration-300">
                                                    <Separator className="opacity-50" />
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <h4 className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-widest">
                                                            <ClipboardCheck className="w-4 h-4" /> Comprehensive Review
                                                        </h4>
                                                        {student.answers?.map((ans: any, idx: number) => (
                                                            <div
                                                                key={ans.id}
                                                                className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group/ans"
                                                            >
                                                                <div className="flex justify-between gap-4 mb-4">
                                                                    <p className="font-bold text-slate-800 dark:text-slate-200">
                                                                        <span className="text-slate-400 mr-2">Q{idx + 1}.</span>
                                                                        {ans.exam_questions?.question_text || "Question content unavailable"}
                                                                    </p>
                                                                    {ans.is_correct ? (
                                                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none h-fit"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Correct</Badge>
                                                                    ) : (
                                                                        <Badge className="bg-rose-500/10 text-rose-600 border-none h-fit"><XCircle className="w-3.5 h-3.5 mr-1" /> Incorrect</Badge>
                                                                    )}
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    {["A", "B", "C", "D"].map((opt) => {
                                                                        const isSelected = ans.selected_answer === opt;
                                                                        const isCorrect = ans.exam_questions?.correct_answer === opt;

                                                                        return (
                                                                            <div
                                                                                key={opt}
                                                                                className={`p-3 rounded-xl text-xs font-medium border transition-all ${isCorrect
                                                                                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 text-emerald-700"
                                                                                    : isSelected
                                                                                        ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 text-rose-700"
                                                                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"
                                                                                    }`}
                                                                            >
                                                                                <span className="font-black mr-2">{opt}:</span>
                                                                                {ans.exam_questions?.[`option_${opt.toLowerCase()}`]}
                                                                                {isSelected && !isCorrect && <span className="ml-2 italic text-[10px]">(Student's choice)</span>}
                                                                                {isCorrect && <span className="ml-2 italic text-[10px]">(Correct Key)</span>}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {ans.exam_questions?.explanation && (
                                                                    <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 text-[11px] text-blue-700 dark:text-blue-300 flex gap-2">
                                                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                                        <span><strong>Rationale:</strong> {ans.exam_questions.explanation}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
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
}

export default ExamResultsPage;
// Sub-component for Stats
function StatCard({ label, value, icon, color }: any) {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20",
        indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20",
        emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20",
        rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/20",
    };

    return (
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden group">
            <CardContent className="p-6">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${colors[color]}`}>
                    {React.cloneElement(icon, { size: 20 })}
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</p>
            </CardContent>
        </Card>
    );
}