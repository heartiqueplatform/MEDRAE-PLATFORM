"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

import React from 'react';
import {
    Monitor,
    Send,
    Lock,
    FileText,
    Users,
    PlayCircle,
    CheckCircle,
    BarChart3,
    ChevronDown,
    ChevronUp,
    Settings2,
    Clock,
    ShieldCheck,
    ExternalLink,
    Eye,
    XCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Exam = any;

const ExamReady = () => {
    const user = useUser();
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [loading, setLoading] = useState(true); // <-- new loading state

    useEffect(() => {
        if (!user) return;

        const fetchExams = async () => {
            setLoading(true); // start loader
            const { data } = await supabase
                .from("exam_papers")
                .select("*")
                .eq("created_by", user.id)
                .order("created_at", { ascending: false });

            if (!data) return;

            const enriched = await Promise.all(
                data.map(async (exam) => {
                    const [
                        { count: questions },
                        { count: sessions },
                        { count: active },
                        { count: completed },
                        { count: results },
                        { data: instructions },
                    ] = await Promise.all([
                        supabase.from("exam_questions").select("id", { count: "exact", head: true }).eq("paper_id", exam.id),
                        supabase.from("exam_sessions").select("id", { count: "exact", head: true }).eq("paper_id", exam.id),
                        supabase.from("exam_sessions").select("id", { count: "exact", head: true }).eq("paper_id", exam.id).eq("status", "started"),
                        supabase.from("exam_sessions").select("id", { count: "exact", head: true }).eq("paper_id", exam.id).eq("status", "completed"),
                        supabase.from("exam_results").select("id", { count: "exact", head: true }).eq("paper_id", exam.id),
                        supabase.from("exam_instructions").select("*").eq("paper_id", exam.id),
                    ]);

                    return {
                        ...exam,
                        questions: questions || 0,
                        sessions: sessions || 0,
                        active: active || 0,
                        completed: completed || 0,
                        results: results || 0,
                        instructions,
                    };
                })
            );

            setExams(enriched);
            setLoading(false); // stop loader
        };

        fetchExams();
    }, [user]);

    const updateExam = async (id: string, updates: any) => {
        await supabase.from("exam_papers").update(updates).eq("id", id);
        window.location.reload();
    };
    if (loading) {
        return <GlobalLoader />;
    }

    // If no exams, show centered message
    if (!exams || exams.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                <div className="bg-gray-100 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-300 dark:border-gray-700 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                        No Exams Yet
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        You haven’t created any exams yet. Once you create or release exams, they will appear here.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 mb-10 max-w-6xl mx-auto px-4">
            {exams.map((exam: any) => {
                const isClosed = !exam.is_active && exam.closed_at;
                const isReleased = exam.is_released;
                const resultsReleased = exam.results_released;

                return (
                    <Card
                        key={exam.id}
                        className="overflow-hidden border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] transition-all hover:ring-1 hover:ring-indigo-500/20"
                    >
                        {/* TOP BAR / STATUS INDICATOR */}
                        <div className={`h-1.5 w-full ${isClosed ? 'bg-slate-400' : isReleased ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                        <CardContent className="p-6 md:p-8">
                            {/* HEADER SECTION */}
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge variant="outline" className="rounded-full px-3 py-0.5 border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            {exam.course}
                                        </Badge>
                                        <Badge variant="outline" className="rounded-full px-3 py-0.5 border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            {exam.block}
                                        </Badge>
                                        {isClosed ? (
                                            <Badge className="bg-slate-500 text-white border-none">Session Closed</Badge>
                                        ) : isReleased ? (
                                            <Badge className="bg-emerald-500 text-white border-none">Live / Released</Badge>
                                        ) : (
                                            <Badge className="bg-amber-500 text-white border-none">Draft Mode</Badge>
                                        )}
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                        {exam.title}
                                    </h2>
                                </div>

                                {/* PRIMARY ACTIONS GRID */}
                                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full lg:w-auto">
                                    <Button
                                        onClick={() => navigate(`/tutor/exams/${exam.id}/monitor`)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none font-bold text-xs h-10"
                                    >
                                        <Monitor className="w-3.5 h-3.5 mr-2" /> Live Monitor
                                    </Button>

                                    <Button
                                        variant="outline"
                                        onClick={() => navigate(`/tutor/exams/${exam.id}/results`)}
                                        className="border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl font-bold text-xs h-10"
                                    >
                                        <BarChart3 className="w-3.5 h-3.5 mr-2" /> Analytics
                                    </Button>

                                    {/* Operational Dropdown Replacement (Styled Buttons) */}
                                    {!isReleased && !isClosed && (
                                        <Button
                                            onClick={() => updateExam(exam.id, { is_released: true, released_at: new Date() })}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs h-10"
                                        >
                                            <Send className="w-3.5 h-3.5 mr-2" /> Release Exam
                                        </Button>
                                    )}

                                    {isReleased && !resultsReleased && (
                                        <Button
                                            onClick={() => updateExam(exam.id, { results_released: true })}
                                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs h-10"
                                        >
                                            <Eye className="w-3.5 h-3.5 mr-2" /> Post Results
                                        </Button>
                                    )}

                                    {!isClosed && (
                                        <Button
                                            onClick={() => updateExam(exam.id, { closed_at: new Date(), is_active: false })}
                                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl font-bold text-xs h-10 border-transparent transition-all"
                                        >
                                            <XCircle className="w-3.5 h-3.5 mr-2" /> Close Session
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* STATS CHIPS */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-8">
                                <StatChip icon={<FileText />} label="Questions" value={exam.questions} />
                                <StatChip icon={<Users />} label="Enrolled" value={exam.sessions} />
                                <StatChip icon={<PlayCircle />} label="In-Progress" value={exam.active} color="indigo" />
                                <StatChip icon={<CheckCircle />} label="Completed" value={exam.completed} color="emerald" />
                                <StatChip icon={<BarChart3 />} label="Evaluated" value={exam.results} />
                            </div>

                            {/* EXPANDABLE SECTION */}
                            <div className="mt-6">
                                <Button
                                    variant="ghost"
                                    onClick={() => setExpanded(expanded === exam.id ? null : exam.id)}
                                    className="w-full justify-between hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 rounded-xl"
                                >
                                    <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Settings2 className="w-3.5 h-3.5" /> Technical Configuration
                                    </span>
                                    {expanded === exam.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </Button>

                                {expanded === exam.id && (
                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-4 duration-300">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400">Description</label>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                                    {exam.description || "No description provided for this session."}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <InfoItem icon={<Clock />} label="Duration" value={`${exam.duration}m`} />
                                                <InfoItem icon={<ShieldCheck />} label="Strict Mode" value={exam.strict_mode ? "Enabled" : "Disabled"} />
                                                <InfoItem icon={<Monitor />} label="Tab Limit" value={exam.max_tab_switch} />
                                                <InfoItem icon={<Lock />} label="Violations" value={exam.max_violation_limit} />
                                            </div>
                                        </div>

                                        <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                                                <PlayCircle className="w-3.5 h-3.5" /> Exam Lifecycle
                                            </h4>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-500">Scheduled Launch</span>
                                                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">{exam.scheduled_start || "Manual"}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-500">Scheduled End</span>
                                                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">{exam.scheduled_end || "Manual"}</span>
                                                </div>
                                                <Separator className="opacity-50" />
                                                <div className="space-y-2 pt-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">Instructions Preview</span>
                                                    <div className="space-y-1.5">
                                                        {exam.instructions?.length ? (
                                                            exam.instructions.map((i: any) => (
                                                                <p key={i.id} className="text-[11px] text-slate-500 font-medium flex items-start gap-2">
                                                                    <span className="text-indigo-500">•</span> {i.content}
                                                                </p>
                                                            ))
                                                        ) : (
                                                            <p className="text-[11px] text-slate-400 italic">No instructional headers added</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

// Sub-component for Statistic Chips
function StatChip({ icon, label, value, color = "slate" }: any) {
    const colorMap: any = {
        slate: "text-slate-400",
        indigo: "text-indigo-500",
        emerald: "text-emerald-500",
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl flex items-center gap-3">
            <div className={`${colorMap[color]} opacity-80`}>
                {React.cloneElement(icon, { size: 14 })}
            </div>
            <div>
                <span className="block text-xs font-black text-slate-800 dark:text-slate-200 leading-none">{value}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none">{label}</span>
            </div>
        </div>
    );
}



export default ExamReady;
// Sub-component for Details in Expansion
function InfoItem({ icon, label, value }: any) {
    return (
        <div className="flex items-center gap-2">
            <div className="text-slate-400">{React.cloneElement(icon, { size: 14 })}</div>
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">{label}</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none">{value}</span>
            </div>
        </div>
    );
}