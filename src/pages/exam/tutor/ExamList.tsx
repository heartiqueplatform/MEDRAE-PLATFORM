"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { ArrowRight, Check, Clock, Edit3, FileEdit, FileText, Globe, PlayCircle, PlusCircle, ShieldAlert, Trash2, History } from "lucide-react";

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
    // Dates & scheduling
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

    // Unfinished exams
    const [unfinishedExams, setUnfinishedExams] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;

        const fetchUnfinishedExams = async () => {
            const { data, error } = await supabase
                .from("exam_papers")
                .select("*")
                .eq("created_by", user.id)
                .is("closed_at", null) // or use a field to indicate unfinished exams
                .order("created_at", { ascending: false });

            if (error) console.error(error);
            else setUnfinishedExams(data || []);
        };

        fetchUnfinishedExams();
    }, [user]);

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
        setScheduledStart(exam.scheduled_start || "");
        setScheduledEnd(exam.scheduled_end || "");
        setReleasedAt(exam.released_at || "");
        setClosedAt(exam.closed_at || "");
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

        // Remove from local state
        setUnfinishedExams(prev => prev.filter(e => e.id !== examId));
        alert("Exam deleted successfully");
    };

    const handleCreateExam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert("Not authenticated");

        setLoading(true);

        if (editingExamId) {
            // EDIT EXISTING EXAM
            const { error } = await supabase
                .from("exam_papers")
                .update({
                    title,
                    description,
                    course,
                    block,
                    duration,
                    exam_key: examKey,
                    scheduled_start: scheduledStart || null,
                    scheduled_end: scheduledEnd || null,
                    released_at: releasedAt || null,
                    closed_at: closedAt || null,
                    is_public: isPublic,
                    is_free: isFree,
                    is_active: isActive,
                    is_released: isReleased,
                    results_released: resultsReleased,
                    strict_mode: strictMode,
                    auto_submit_on_violation: autoSubmitOnViolation,
                    max_tab_switch: maxTabSwitch,
                    max_violation_limit: maxViolationLimit,
                    tutor_reset_code: tutorResetCode, // ← added here

                })
                .eq("id", editingExamId);

            setLoading(false);

            if (error) {
                console.error(error);
                alert("Error updating exam");
                return;
            }

            setEditingExamId(null); // reset editing state
            // optionally refetch exams list here
        } else {
            // CREATE NEW EXAM (your existing code preserved)
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
                        scheduled_start: scheduledStart || null,
                        scheduled_end: scheduledEnd || null,
                        released_at: releasedAt || null,
                        closed_at: closedAt || null,
                        is_public: isPublic,
                        is_free: isFree,
                        is_active: isActive,
                        is_released: isReleased,
                        results_released: resultsReleased,
                        strict_mode: strictMode,
                        auto_submit_on_violation: autoSubmitOnViolation,
                        max_tab_switch: maxTabSwitch,
                        max_violation_limit: maxViolationLimit,
                        tutor_reset_code: tutorResetCode, // ← added here
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

            navigate(`/tutor/exams/${data.id}`);
        }

        // Reset form after create or edit
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

    return (
        <div className="min-h-screen bg-transparent pt-0 p-6 flex flex-col justify-start items-center gap-2">
            {/* Unfinished Exams Section */}
            {unfinishedExams.length > 0 && (
                <div className="w-full max-w-4xl mb-2 group">
                    <div className="relative overflow-hidden bg-white/40 dark:bg-background rounded-xl shadow-xl backdrop-blur-xl border-0 transition-all duration-300">

                        {/* Header with Decorative Status Bar */}
                        <div className="h-2 w-full bg-gradient-to-r from-amber-400 to-orange-500 opacity-80" />

                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl">
                                        <History className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                            Continue <span className="text-amber-600">Drafts</span>
                                        </h2>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
                                            {unfinishedExams.length} Session{unfinishedExams.length > 1 ? 's' : ''} awaiting finalization
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <ul className="grid grid-cols-1 gap-3">
                                {unfinishedExams.map((exam) => (
                                    <li
                                        key={exam.id}
                                        className="group/item flex flex-col sm:flex-row justify-between items-center p-4 bg-white/60 dark:bg-slate-800/40 rounded-2xl border-0  hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-200 gap-4"
                                    >
                                        <div className="flex items-center gap-4 flex-1 w-full">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover/item:text-amber-500 transition-colors">
                                                <FileEdit className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm md:text-base leading-tight">
                                                    {exam.title || "Untitled Draft Session"}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                                    Last modified recently
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            {/* EDIT ACTION */}
                                            <button
                                                onClick={() => handleEditExam(exam)}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl border-0 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                Edit
                                            </button>

                                            {/* DELETE ACTION */}
                                            <button
                                                onClick={() => handleDeleteExam(exam.id)}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl border-0 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete
                                            </button>

                                            {/* CONTINUE ACTION */}
                                            <button
                                                onClick={() => handleContinueExam(exam.id)}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-widest bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                <PlayCircle className="w-4 h-4" />
                                                Resume
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Subtle bottom detail */}
                        <div className="px-8 py-3 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Draft Persistence Active</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Create New Exam Section */}
            <div className="w-full max-w-4xl bg-white/40 dark:bg-background p-1 rounded-xl shadow-xl backdrop-blur-xl border-0 transition-all duration-300">
                <div className="p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none">
                            <PlusCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                Create New <span className="text-blue-600">Exam Session</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Configure session parameters and proctoring protocols.</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateExam} className="space-y-10">

                        {/* SECTION 1: IDENTITY & CONTENT */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4 border-b pb-2 dark:border-slate-800">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Exam Identity</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Exam Title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        className="w-full p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-slate-800 dark:text-white placeholder:font-normal"
                                    />
                                </div>

                                <textarea
                                    placeholder="Description (Scope, Objectives, etc.)"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all"
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Course</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Nursing"
                                            value={course}
                                            onChange={(e) => setCourse(e.target.value)}
                                            className="w-full p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Block / Class</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Section B"
                                            value={block}
                                            onChange={(e) => setBlock(e.target.value)}
                                            className="w-full p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: SECURITY & INTEGRITY */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4 border-b pb-2 dark:border-slate-800">
                                <ShieldAlert className="w-4 h-4 text-rose-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Security & Proctoring</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Access Key (Exam Password)</label>
                                    <input
                                        type="text"
                                        placeholder="Enter a secure key"
                                        value={examKey}
                                        onChange={(e) => setExamKey(e.target.value)}
                                        className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-blue-500 font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Duration (Minutes)</label>
                                    <input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="w-full p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Max Tab Switches</label>
                                    <input
                                        type="number"
                                        value={maxTabSwitch}
                                        onChange={(e) => setMaxTabSwitch(Number(e.target.value))}
                                        className="w-full p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Violation Tolerance Limit</label>
                                    <input
                                        type="number"
                                        value={maxViolationLimit}
                                        onChange={(e) => setMaxViolationLimit(Number(e.target.value))}
                                        className="w-full p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border-0 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-blue-500 ml-2">
                                        Tutor Reset Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Admin Reset Code"
                                        value={tutorResetCode}
                                        onChange={(e) => setTutorResetCode(e.target.value)}
                                        required
                                        className="w-full p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border-0 dark:border-blue-800 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: TEMPORAL LOGIC (DATES) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4 border-0 pb-2">
                                <Clock className="w-4 h-4 text-cyan-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Scheduling & Release</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/30 p-6 rounded-3xl border-0">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Exam Window</h4>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">Scheduled Start</label>
                                        <input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border-none outline-none text-sm font-bold shadow-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">Scheduled End</label>
                                        <input type="datetime-local" value={scheduledEnd} onChange={(e) => setScheduledEnd(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border-none outline-none text-sm font-bold shadow-sm" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Publicity Window</h4>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">Released At</label>
                                        <input type="datetime-local" value={releasedAt} onChange={(e) => setReleasedAt(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border-none outline-none text-sm font-bold shadow-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">Closed At</label>
                                        <input type="datetime-local" value={closedAt} onChange={(e) => setClosedAt(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border-none outline-none text-sm font-bold shadow-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* SECTION 4: OPERATIONAL TOGGLES */}
                        <div className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] shadow-xl border-0 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
                                <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                                    Visibility & Automation
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
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
                            className="group w-full relative h-16 overflow-hidden rounded-[2rem] bg-blue-600 text-white font-black text-lg uppercase tracking-widest shadow-2xl shadow-blue-200 dark:shadow-none hover:bg-blue-700 disabled:bg-slate-300 transition-all active:scale-[0.98]"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <>Configuring Secure Session...</>
                                ) : (
                                    <>
                                        Finalize & Create Exam
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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