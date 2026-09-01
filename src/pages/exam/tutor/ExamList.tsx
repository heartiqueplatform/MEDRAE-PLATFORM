"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { ArrowRight, Check, Clock, Edit3, FileEdit, FileText, Globe, PlayCircle, PlusCircle, ShieldAlert, Trash2, History, FileSearch, Sparkles } from "lucide-react";

const TutorExamList = () => {
    const user = useUser();
    const navigate = useNavigate();
    const [editingExamId, setEditingExamId] = useState<string | null>(null);
    // Core fields
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [course, setCourse] = useState("");
    const [block, setBlock] = useState("");
    const [duration, setDuration] = useState(30);
    const [examKey, setExamKey] = useState("");
    const [tutorResetCode, setTutorResetCode] = useState("");
    // Dates & scheduling - store as strings for datetime-local inputs
    const [scheduledStart, setScheduledStart] = useState("");
    const [scheduledEnd, setScheduledEnd] = useState("");
    const [releasedAt, setReleasedAt] = useState("");
    const [closedAt, setClosedAt] = useState("");

    // Boolean flags
    const [isPublic, setIsPublic] = useState(true);
    const [isFree, setIsFree] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [isReleased, setIsReleased] = useState(false);
    const [resultsReleased, setResultsReleased] = useState(false);
    const [strictMode, setStrictMode] = useState(true);
    const [autoSubmitOnViolation, setAutoSubmitOnViolation] = useState(true);

    // Limits
    const [maxTabSwitch, setMaxTabSwitch] = useState(3);
    const [maxViolationLimit, setMaxViolationLimit] = useState(5);

    const [loading, setLoading] = useState(false);
    const [isLoadingExams, setIsLoadingExams] = useState(true);

    // All exams created by the tutor (both finished and unfinished)
    const [allExams, setAllExams] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;

        const fetchAllExams = async () => {
            setIsLoadingExams(true);
            const { data, error } = await supabase
                .from("exam_papers")
                .select("*")
                .eq("created_by", user.id)
                .order("created_at", { ascending: false });

            if (error) console.error(error);
            else setAllExams(data || []);
            setIsLoadingExams(false);
        };

        fetchAllExams();
    }, [user]);

    // Helper function to convert UTC database time to local datetime-local input format
    const convertUTCToLocalInput = (utcDate: string | null) => {
        if (!utcDate) return "";
        try {
            const date = new Date(utcDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch (e) {
            return "";
        }
    };

    // Helper function to convert local datetime-local input to UTC ISO string
    const convertLocalToUTC = (localDate: string) => {
        if (!localDate) return null;
        try {
            const date = new Date(localDate);
            return date.toISOString();
        } catch (e) {
            return null;
        }
    };

    const handleContinueExam = (examId: string) => {
        navigate(`/tutor/exams/${examId}`);
    };

    const handleEditExam = (exam: any) => {
        setEditingExamId(exam.id);
        setTitle(exam.title);
        setDescription(exam.description);
        setCourse(exam.course);
        setBlock(exam.block);
        setDuration(exam.duration);
        setExamKey(exam.exam_key);
        setTutorResetCode(exam.tutor_reset_code || "");

        setScheduledStart(convertUTCToLocalInput(exam.scheduled_start));
        setScheduledEnd(convertUTCToLocalInput(exam.scheduled_end));
        setReleasedAt(convertUTCToLocalInput(exam.released_at));
        setClosedAt(convertUTCToLocalInput(exam.closed_at));

        setIsPublic(exam.is_public);
        setIsFree(exam.is_free);
        setIsActive(exam.is_active);
        setIsReleased(exam.is_released);
        setResultsReleased(exam.results_released);
        setStrictMode(exam.strict_mode);
        setAutoSubmitOnViolation(exam.auto_submit_on_violation);
        setMaxTabSwitch(exam.max_tab_switch);
        setMaxViolationLimit(exam.max_violation_limit);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDeleteExam = async (examId: string) => {
        const confirmDelete = window.confirm(
            "⚠️ Warning: Deleting this exam will remove ALL related data including questions, student submissions, and results. Are you sure you want to delete it?"
        );
        if (!confirmDelete) return;

        setLoading(true);

        const { error } = await supabase.from("exam_papers").delete().eq("id", examId);

        setLoading(false);

        if (error) {
            console.error(error);
            alert("Failed to delete exam");
            return;
        }

        setAllExams(prev => prev.filter(e => e.id !== examId));
        alert("Exam deleted successfully");
    };

    const handleCreateExam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert("Not authenticated");

        setLoading(true);

        const scheduledStartUTC = convertLocalToUTC(scheduledStart);
        const scheduledEndUTC = convertLocalToUTC(scheduledEnd);
        const releasedAtUTC = convertLocalToUTC(releasedAt);
        const closedAtUTC = convertLocalToUTC(closedAt);

        if (editingExamId) {
            const { error } = await supabase
                .from("exam_papers")
                .update({
                    title,
                    description,
                    course,
                    block,
                    duration,
                    exam_key: examKey,
                    scheduled_start: scheduledStartUTC,
                    scheduled_end: scheduledEndUTC,
                    released_at: releasedAtUTC,
                    closed_at: closedAtUTC,
                    is_public: isPublic,
                    is_free: isFree,
                    is_active: isActive,
                    is_released: isReleased,
                    results_released: resultsReleased,
                    strict_mode: strictMode,
                    auto_submit_on_violation: autoSubmitOnViolation,
                    max_tab_switch: maxTabSwitch,
                    max_violation_limit: maxViolationLimit,
                    tutor_reset_code: tutorResetCode,
                })
                .eq("id", editingExamId);

            setLoading(false);

            if (error) {
                console.error(error);
                alert("Error updating exam");
                return;
            }

            const { data: updatedExams } = await supabase
                .from("exam_papers")
                .select("*")
                .eq("created_by", user.id)
                .order("created_at", { ascending: false });

            if (updatedExams) setAllExams(updatedExams);

            setEditingExamId(null);
            alert("Exam updated successfully!");
        } else {
            const { data, error } = await supabase
                .from("exam_papers")
                .insert([
                    {
                        created_by: user.id,
                        title,
                        description,
                        course,
                        block,
                        duration,
                        exam_key: examKey,
                        scheduled_start: scheduledStartUTC,
                        scheduled_end: scheduledEndUTC,
                        released_at: releasedAtUTC,
                        closed_at: closedAtUTC,
                        is_public: isPublic,
                        is_free: isFree,
                        is_active: isActive,
                        is_released: isReleased,
                        results_released: resultsReleased,
                        strict_mode: strictMode,
                        auto_submit_on_violation: autoSubmitOnViolation,
                        max_tab_switch: maxTabSwitch,
                        max_violation_limit: maxViolationLimit,
                        tutor_reset_code: tutorResetCode,
                    },
                ])
                .select()
                .single();

            setLoading(false);

            if (error) {
                console.error(error);
                alert("Error creating exam");
                return;
            }

            const { data: updatedExams } = await supabase
                .from("exam_papers")
                .select("*")
                .eq("created_by", user.id)
                .order("created_at", { ascending: false });

            if (updatedExams) setAllExams(updatedExams);

            navigate(`/tutor/exams/${data.id}`);
        }

        setTitle("");
        setDescription("");
        setCourse("");
        setBlock("");
        setDuration(30);
        setExamKey("");
        setScheduledStart("");
        setScheduledEnd("");
        setReleasedAt("");
        setClosedAt("");
        setIsPublic(true);
        setIsFree(false);
        setIsActive(true);
        setIsReleased(false);
        setResultsReleased(false);
        setStrictMode(true);
        setAutoSubmitOnViolation(true);
        setMaxTabSwitch(3);
        setMaxViolationLimit(5);
    };

    // Helper toggle button
    const ToggleButton = ({
        checked,
        onClick,
        label,
    }: {
        checked: boolean;
        onClick: () => void;
        label: string;
    }) => (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={onClick}
                className={`w-6 h-6 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 transition-all ${checked ? "bg-blue-500 text-white" : "bg-transparent"
                    }`}
            >
                {checked && <Check size={16} />}
            </button>
            <span className="text-gray-800 dark:text-gray-200 select-none">{label}</span>
        </div>
    );

    // Skeleton Loader for Exam List
    const ExamSkeleton = () => (
        <div className="w-full md:max-w-full md:px-4 lg:px-6 mx-auto mb-4 px-0 sm:px-4 md:px-0">
            <div className="relative overflow-hidden bg-white/40 dark:bg-background rounded-none sm:rounded-xl shadow-xl backdrop-blur-xl border-0 transition-all duration-300">
                <div className="h-2 w-full bg-gradient-to-r from-amber-400 to-orange-500 opacity-80" />
                <div className="p-4 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
                            <div>
                                <div className="h-6 sm:h-7 w-32 sm:w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                                <div className="h-3 w-20 sm:w-28 bg-slate-200 dark:bg-slate-700 rounded mt-1 animate-pulse" />
                            </div>
                        </div>
                        <div className="h-4 w-32 sm:w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 bg-white/60 dark:bg-slate-800/40 rounded-xl sm:rounded-2xl gap-3 sm:gap-4">
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                                    <div className="flex-1">
                                        <div className="h-4 sm:h-5 w-32 sm:w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                        <div className="h-3 w-24 sm:w-32 bg-slate-200 dark:bg-slate-700 rounded mt-1 animate-pulse" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                                    <div className="h-7 sm:h-9 w-16 sm:w-20 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                                    <div className="h-7 sm:h-9 w-16 sm:w-20 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                                    <div className="h-7 sm:h-9 w-16 sm:w-20 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-transparent p-0 m-0 w-full font-['Inter',system-ui,-apple-system,sans-serif]">

            {/* Loading State - Skeleton */}
            {isLoadingExams && <ExamSkeleton />}

            {/* All Exams Section - Only show when loaded and has exams */}
            {!isLoadingExams && allExams.length > 0 && (
                <div className="w-full md:max-w-full md:px-4 lg:px-6 mx-auto mb-4 px-0 sm:px-4 md:px-0">
                    <div className="relative overflow-hidden bg-white/40 dark:bg-background rounded-none sm:rounded-xl shadow-xl backdrop-blur-xl border-0 transition-all duration-300">

                        {/* Header with Decorative Status Bar */}
                        <div className="h-2 w-full bg-gradient-to-r from-amber-400 to-orange-500 opacity-80" />

                        <div className="p-4 sm:p-8">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 sm:p-3 rounded-2xl">
                                        <History className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                            Your <span className="text-amber-600">Exam Papers</span>
                                        </h2>
                                        <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            {allExams.length} Exam{allExams.length > 1 ? 's' : ''} Created
                                        </p>
                                    </div>
                                </div>
                                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    {allExams.filter(e => e.closed_at === null).length} Draft{allExams.filter(e => e.closed_at === null).length !== 1 ? 's' : ''} · {allExams.filter(e => e.closed_at !== null).length} Completed
                                </div>
                            </div>

                            <ul className="grid grid-cols-1 gap-2 sm:gap-3">
                                {allExams.map((exam) => (
                                    <li
                                        key={exam.id}
                                        className={`group/item flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 bg-white/60 dark:bg-slate-800/40 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 gap-3 sm:gap-4 ${editingExamId === exam.id
                                            ? 'border-blue-400 dark:border-blue-600 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30'
                                            : 'border-transparent hover:border-amber-300 dark:hover:border-amber-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full">
                                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors ${editingExamId === exam.id
                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover/item:text-amber-500'
                                                }`}>
                                                {editingExamId === exam.id ? (
                                                    <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                ) : (
                                                    <FileEdit className="w-4 h-4 sm:w-5 sm:h-5" />
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold text-sm sm:text-base leading-tight truncate ${editingExamId === exam.id
                                                        ? 'text-blue-600 dark:text-blue-400'
                                                        : 'text-slate-800 dark:text-slate-200'
                                                        }`}>
                                                        {exam.title || "Untitled Exam"}
                                                    </span>
                                                    {editingExamId === exam.id && (
                                                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                                            Editing
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                                    {exam.closed_at === null ? (
                                                        <span className="text-amber-500">● Draft</span>
                                                    ) : (
                                                        <span className="text-emerald-500">● Completed</span>
                                                    )}
                                                    {exam.course && ` · ${exam.course}`}
                                                    {exam.block && ` · ${exam.block}`}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                                            <button
                                                onClick={() => handleEditExam(exam)}
                                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all duration-200 ${editingExamId === exam.id
                                                    ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30'
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-0 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'
                                                    }`}
                                            >
                                                <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                <span>{editingExamId === exam.id ? 'Editing' : 'Edit Exam'}</span>
                                            </button>

                                            <button
                                                onClick={() => handleDeleteExam(exam.id)}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg sm:rounded-xl border-0 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all duration-200"
                                            >
                                                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                <span>Delete</span>
                                            </button>

                                            <button
                                                onClick={() => handleContinueExam(exam.id)}
                                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all duration-200 ${editingExamId === exam.id
                                                    ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30'
                                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-none'
                                                    }`}
                                            >
                                                {editingExamId === exam.id ? (
                                                    <>
                                                        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        <span>Preview</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        <span>{exam.closed_at === null ? "Resume" : "View/Edit"}</span>
                                                    </>
                                                )}
                                            </button>

                                            {editingExamId === exam.id && (
                                                <button
                                                    type="submit"
                                                    form="exam-form"
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                                >
                                                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    <span>Update Exam</span>
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="px-4 sm:px-8 py-2 sm:py-3 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">All exams displayed from Medrae Database</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State - No Exams Created Yet */}
            {!isLoadingExams && allExams.length === 0 && (
                <div className="w-full md:max-w-full md:px-4 lg:px-6 mx-auto mb-4 px-4 sm:px-0">
                    <div className="relative overflow-hidden bg-white/40 dark:bg-background rounded-xl shadow-xl backdrop-blur-xl border-0 transition-all duration-300">
                        <div className="h-2 w-full bg-gradient-to-r from-amber-400 to-orange-500 opacity-80" />
                        <div className="p-8 sm:p-12 text-center">
                            <div className="flex flex-col items-center justify-center gap-4">
                                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                                    <FileSearch className="w-10 h-10 text-amber-600 dark:text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                        No Exams Created Yet
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                                        You haven't started creating any exams. Click the button below to create your first exam and begin assessing your students.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 mt-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                        Get started with your first exam today
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingExamId(null);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                    }}
                                    className="mt-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
                                >
                                    <PlusCircle className="w-4 h-4 inline mr-2" />
                                    Create Your First Exam
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create New Exam Section - Edge to Edge on Phone */}
            <div className="w-full md:max-w-full md:px-4 lg:px-6 mx-auto bg-white/40 dark:bg-background p-1 rounded-xl shadow-xl backdrop-blur-xl border-0 transition-all duration-300 sm:mx-auto">
                <div className="p-4 sm:p-8">
                    <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                        <div className="bg-blue-600 p-2.5 sm:p-3 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none">
                            <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                {editingExamId ? "Edit" : "Create New"} <span className="text-blue-600">Exam Session</span>
                            </h1>
                            <p className="text-[10px] sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                                {editingExamId ? "Update your exam configuration" : "Configure session parameters and proctoring protocols."}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateExam} className="space-y-6 sm:space-y-10">

                        {/* SECTION 1: IDENTITY & CONTENT */}
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center gap-2 mb-3 sm:mb-4 border-b pb-2 dark:border-slate-800">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">Exam Identity</h3>
                            </div>

                            <div className="space-y-3 sm:space-y-4">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Exam Title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-slate-800 dark:text-white placeholder:font-normal text-sm sm:text-base"
                                    />
                                </div>

                                <textarea
                                    placeholder="Description (Scope, Objectives, etc.)"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all text-sm sm:text-base"
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[8px] sm:text-[10px] font-bold uppercase text-slate-400 ml-2">Course</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Nursing"
                                            value={course}
                                            onChange={(e) => setCourse(e.target.value)}
                                            className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] sm:text-[10px] font-bold uppercase text-slate-400 ml-2">Block / Class</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Section B"
                                            value={block}
                                            onChange={(e) => setBlock(e.target.value)}
                                            className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: SECURITY & INTEGRITY */}
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center gap-2 mb-3 sm:mb-4 border-b pb-2 dark:border-slate-800">
                                <ShieldAlert className="w-4 h-4 text-rose-500" />
                                <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">Security & Proctoring</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="sm:col-span-2 space-y-1">
                                    <label className="text-[8px] sm:text-[10px] font-bold uppercase text-slate-400 ml-2">Access Key (Exam Password)</label>
                                    <input
                                        type="text"
                                        placeholder="Enter a secure key"
                                        value={examKey}
                                        onChange={(e) => setExamKey(e.target.value)}
                                        className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-blue-500 font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400 text-sm sm:text-base"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[8px] sm:text-[10px] font-bold uppercase text-slate-400 ml-2">Duration (Minutes)</label>
                                    <input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[8px] sm:text-[10px] font-bold uppercase text-slate-400 ml-2">Max Tab Switches</label>
                                    <input
                                        type="number"
                                        value={maxTabSwitch}
                                        onChange={(e) => setMaxTabSwitch(Number(e.target.value))}
                                        className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[8px] sm:text-[10px] font-bold uppercase text-slate-400 ml-2">Violation Tolerance Limit</label>
                                    <input
                                        type="number"
                                        value={maxViolationLimit}
                                        onChange={(e) => setMaxViolationLimit(Number(e.target.value))}
                                        className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[8px] sm:text-[10px] font-bold uppercase text-blue-500 ml-2">
                                        Tutor Reset Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Admin Reset Code"
                                        value={tutorResetCode}
                                        onChange={(e) => setTutorResetCode(e.target.value)}
                                        required
                                        className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-900/20 border-0 dark:border-blue-800 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm sm:text-base"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: TEMPORAL LOGIC (DATES) */}
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center gap-2 mb-3 sm:mb-4 border-0 pb-2">
                                <Clock className="w-4 h-4 text-cyan-500" />
                                <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">Scheduling & Release</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-slate-50 dark:bg-slate-800/30 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-0">
                                <div className="space-y-3 sm:space-y-4">
                                    <h4 className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Exam Window</h4>
                                    <div className="space-y-1">
                                        <label className="text-[8px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">Scheduled Start (Your Local Time)</label>
                                        <input
                                            type="datetime-local"
                                            value={scheduledStart}
                                            onChange={(e) => setScheduledStart(e.target.value)}
                                            className="w-full p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border-none outline-none text-xs sm:text-sm font-bold shadow-sm"
                                        />
                                        <p className="text-[8px] text-slate-400 ml-1">This will be stored as UTC in the database</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">Scheduled End (Your Local Time)</label>
                                        <input
                                            type="datetime-local"
                                            value={scheduledEnd}
                                            onChange={(e) => setScheduledEnd(e.target.value)}
                                            className="w-full p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border-none outline-none text-xs sm:text-sm font-bold shadow-sm"
                                        />
                                        <p className="text-[8px] text-slate-400 ml-1">This will be stored as UTC in the database</p>
                                    </div>
                                </div>

                                <div className="space-y-3 sm:space-y-4">
                                    <h4 className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Publicity Window</h4>
                                    <div className="space-y-1">
                                        <label className="text-[8px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">Released At (Your Local Time)</label>
                                        <input
                                            type="datetime-local"
                                            value={releasedAt}
                                            onChange={(e) => setReleasedAt(e.target.value)}
                                            className="w-full p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border-none outline-none text-xs sm:text-sm font-bold shadow-sm"
                                        />
                                        <p className="text-[8px] text-slate-400 ml-1">This will be stored as UTC in the database</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">Closed At (Your Local Time)</label>
                                        <input
                                            type="datetime-local"
                                            value={closedAt}
                                            onChange={(e) => setClosedAt(e.target.value)}
                                            className="w-full p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border-none outline-none text-xs sm:text-sm font-bold shadow-sm"
                                        />
                                        <p className="text-[8px] text-slate-400 ml-1">This will be stored as UTC in the database</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: OPERATIONAL TOGGLES */}
                        <div className="bg-white dark:bg-slate-950 p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-xl border-0 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-4 sm:mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
                                <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                                    Visibility & Automation
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-3 sm:gap-y-4">
                                <ToggleButton checked={isPublic} onClick={() => setIsPublic(!isPublic)} label="Public Access" />
                                <ToggleButton checked={isFree} onClick={() => setIsFree(!isFree)} label="Free Trial Exam" />
                                <ToggleButton checked={isActive} onClick={() => setIsActive(!isActive)} label="Status: Active" />
                                <ToggleButton checked={isReleased} onClick={() => setIsReleased(!isReleased)} label="Status: Released" />
                                <ToggleButton checked={resultsReleased} onClick={() => setResultsReleased(!resultsReleased)} label="Results Visibility" />
                                <ToggleButton checked={strictMode} onClick={() => setStrictMode(!strictMode)} label="Strict Proctoring" />
                                <div className="sm:col-span-2">
                                    <ToggleButton
                                        checked={autoSubmitOnViolation}
                                        onClick={() => setAutoSubmitOnViolation(!autoSubmitOnViolation)}
                                        label="Auto-Terminate on Violation"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group w-full relative h-14 sm:h-16 overflow-hidden rounded-2xl sm:rounded-[2rem] bg-blue-600 text-white font-black text-base sm:text-lg uppercase tracking-widest shadow-2xl shadow-blue-200 dark:shadow-none hover:bg-blue-700 disabled:bg-slate-300 transition-all active:scale-[0.98]"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <>Configuring Secure Session...</>
                                ) : (
                                    <>
                                        {editingExamId ? "Update Exam" : "Finalize & Create Exam"}
                                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TutorExamList;