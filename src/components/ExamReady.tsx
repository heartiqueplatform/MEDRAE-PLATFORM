"use client";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import {
    Users,
    FileText,
    Clock,
    PlayCircle,
    CheckCircle,
    XCircle,
    BarChart3,
    Eye,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

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
        <div className="space-y-6 mb-10">
            {exams.map((exam) => (
                <div
                    key={exam.id}
                    className="bg-white/10 dark:bg-gray-900/30 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{exam.title}</h2>
                            <p className="text-sm text-gray-900">
                                {exam.course} • {exam.block}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate(`/tutor/exams/${exam.id}/monitor`)}
                                className="px-3 py-2 bg-blue-600 rounded-lg text-white text-sm"
                            >
                                Monitor
                            </button>

                            <button
                                onClick={() =>
                                    updateExam(exam.id, {
                                        is_released: true,
                                        released_at: new Date(),
                                    })
                                }
                                className="px-3 py-2 bg-green-600 rounded-lg text-white text-sm"
                            >
                                Release Exam
                            </button>

                            <button
                                onClick={() =>
                                    updateExam(exam.id, {
                                        results_released: true,
                                    })
                                }
                                className="px-3 py-2 bg-purple-600 rounded-lg text-white text-sm"
                            >
                                Release Results
                            </button>

                            <button
                                onClick={() =>
                                    updateExam(exam.id, {
                                        closed_at: new Date(),
                                        is_active: false,
                                    })
                                }
                                className="px-3 py-2 bg-red-600 rounded-lg text-white text-sm"
                            >
                                Close
                            </button>

                            <button
                                onClick={() => navigate(`/tutor/exams/${exam.id}/results`)}
                                className="px-3 py-2 bg-gray-700 rounded-lg text-white text-sm"
                            >
                                View Results
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 text-sm text-gray-800 dark:text-gray-200">
                        <div className="flex items-center gap-2"><FileText size={16} /> {exam.questions} Questions</div>
                        <div className="flex items-center gap-2"><Users size={16} /> {exam.sessions} Started</div>
                        <div className="flex items-center gap-2"><PlayCircle size={16} /> {exam.active} Active</div>
                        <div className="flex items-center gap-2"><CheckCircle size={16} /> {exam.completed} Completed</div>
                        <div className="flex items-center gap-2"><BarChart3 size={16} /> {exam.results} Submitted</div>
                    </div>

                    {/* Expand */}
                    <div className="mt-4">
                        <button
                            onClick={() =>
                                setExpanded(expanded === exam.id ? null : exam.id)
                            }
                            className="text-blue-400 flex items-center gap-1 text-sm"
                        >
                            {expanded === exam.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            Full Details
                        </button>
                    </div>

                    {expanded === exam.id && (
                        <div className="mt-4 text-sm text-gray-300 space-y-2">
                            <p><strong>Description:</strong> {exam.description}</p>
                            <p><strong>Duration:</strong> {exam.duration} minutes</p>
                            <p><strong>Start:</strong> {exam.scheduled_start || "Not Set"}</p>
                            <p><strong>End:</strong> {exam.scheduled_end || "Not Set"}</p>
                            <p><strong>Strict Mode:</strong> {exam.strict_mode ? "Yes" : "No"}</p>
                            <p><strong>Max Tab Switch:</strong> {exam.max_tab_switch}</p>
                            <p><strong>Violation Limit:</strong> {exam.max_violation_limit}</p>

                            <div className="mt-2">
                                <strong>Instructions:</strong>
                                {exam.instructions?.length ? (
                                    exam.instructions.map((i: any) => (
                                        <p key={i.id} className="ml-3 mt-1">• {i.content}</p>
                                    ))
                                ) : (
                                    <p className="ml-3 text-gray-500">No instructions added</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ExamReady;