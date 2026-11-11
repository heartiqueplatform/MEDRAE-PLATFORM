"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import {
    ArrowRight,
    Check,
    Clock,
    Edit3,
    FileEdit,
    FileText,
    Globe,
    PlayCircle,
    PlusCircle,
    ShieldAlert,
    Trash2,
    History,
    FileSearch,
    Sparkles,
    ChevronLeft,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" | "warning" = "light") => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(60);
    else vibrate(15);
};

/* ------------------------------------------------------------------ */
/*  Toggle button                                                     */
/* ------------------------------------------------------------------ */

const ToggleButton = ({
    checked,
    onClick,
    label,
}: {
    checked: boolean;
    onClick: () => void;
    label: string;
}) => (
    <button
        type="button"
        onClick={() => {
            tap();
            onClick();
        }}
        className={`flex items-center gap-2 w-full text-left rounded-xl px-3 py-2.5
                    transition-colors
                    ${checked
                ? "bg-blue-50 dark:bg-blue-400/10"
                : "bg-slate-50 dark:bg-[#0d1117] active:bg-slate-100 dark:active:bg-white/[0.1]"
            }`}
        style={{ touchAction: "manipulation" }}
    >
        <span
            className={`h-5 w-5 flex items-center justify-center rounded-md shrink-0
                        ${checked
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-white/[0.08] text-transparent"
                }`}
        >
            {checked && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
        <span
            className={`text-[11px] font-bold leading-tight
                        ${checked
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-slate-700 dark:text-slate-200"
                }`}
        >
            {label}
        </span>
    </button>
);

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

const ExamSkeleton = () => (
    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3 animate-pulse">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-white/[0.06]" />
            <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 bg-slate-200 dark:bg-white/[0.1] rounded" />
                <div className="h-3 w-24 bg-slate-200 dark:bg-white/[0.1] rounded" />
            </div>
        </div>
        {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-200 dark:bg-white/[0.06]" />
        ))}
    </div>
);

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

    // All exams created by the tutor
    const [allExams, setAllExams] = useState<any[]>([]);

    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) navigate(-1);
        else navigate("/dashboard/tutor", { replace: true });
    }, [navigate]);

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

    // Helper: UTC → datetime-local string
    const convertUTCToLocalInput = (utcDate: string | null) => {
        if (!utcDate) return "";
        try {
            const date = new Date(utcDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch {
            return "";
        }
    };

    // Helper: datetime-local → UTC ISO string
    const convertLocalToUTC = (localDate: string) => {
        if (!localDate) return null;
        try {
            return new Date(localDate).toISOString();
        } catch {
            return null;
        }
    };

    const handleContinueExam = (examId: string) => {
        tap();
        navigate(`/tutor/exams/${examId}`);
    };

    const handleEditExam = (exam: any) => {
        tap();
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

        tap("warning");
        setLoading(true);

        const { error } = await supabase.from("exam_papers").delete().eq("id", examId);

        setLoading(false);

        if (error) {
            console.error(error);
            alert("Failed to delete exam");
            return;
        }

        setAllExams((prev) => prev.filter((e) => e.id !== examId));
        alert("Exam deleted successfully");
    };

    const handleCreateExam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert("Not authenticated");

        tap("success");
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

    /* ─── REAL PAGE ──────────────────────────────────────────── */
    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* ── HEADER ──────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors shrink-0"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate">
                        {editingExamId ? "Edit exam" : "Exam papers"}
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {allExams.length > 0
                            ? `${allExams.length} exam${allExams.length > 1 ? "s" : ""} · ${allExams.filter((e) => e.closed_at === null).length} draft`
                            : "Create and manage exams"}
                    </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                 text-[10px] font-bold uppercase tracking-wider
                                 bg-amber-50 dark:bg-amber-400/10
                                 text-amber-700 dark:text-amber-400 shrink-0">
                    <History className="h-3 w-3" />
                    Tutor
                </span>
            </header>

            {/* ── SCROLLING BODY ──────────────────────────────── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto px-4 py-3 pb-24 safe-bottom space-y-3">

                    {/* Loading skeleton */}
                    {isLoadingExams && <ExamSkeleton />}

                    {/* Exam list */}
                    {!isLoadingExams && allExams.length > 0 && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg
                                                bg-amber-50 dark:bg-amber-400/10
                                                flex items-center justify-center shrink-0">
                                    <History className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-amber-600 dark:text-amber-400 leading-none mb-1">
                                        Your papers
                                    </p>
                                    <h2 className="text-sm font-bold leading-tight">
                                        {allExams.length} exam{allExams.length > 1 ? "s" : ""} created
                                    </h2>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider
                                                 text-slate-400 dark:text-slate-500 shrink-0">
                                    {allExams.filter((e) => e.closed_at === null).length} draft ·{" "}
                                    {allExams.filter((e) => e.closed_at !== null).length} done
                                </span>
                            </div>

                            <div className="space-y-2">
                                {allExams.map((exam) => {
                                    const isEditingThis = editingExamId === exam.id;
                                    const isDraft = exam.closed_at === null;
                                    return (
                                        <div
                                            key={exam.id}
                                            className={`rounded-xl p-3 space-y-2.5 transition-colors
                                                        ${isEditingThis
                                                    ? "bg-blue-50 dark:bg-blue-400/10"
                                                    : "bg-slate-50 dark:bg-[#0d1117]"
                                                }`}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0
                                                                ${isEditingThis
                                                        ? "bg-blue-100 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400"
                                                        : "bg-slate-200 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                                                    }`}>
                                                    {isEditingThis ? (
                                                        <Edit3 className="h-4 w-4" />
                                                    ) : (
                                                        <FileEdit className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <p className="text-[12px] font-bold truncate leading-tight">
                                                            {exam.title || "Untitled exam"}
                                                        </p>
                                                        {isEditingThis && (
                                                            <span className="text-[9px] font-bold uppercase tracking-wider
                                                                             bg-blue-100 dark:bg-blue-400/20
                                                                             text-blue-700 dark:text-blue-300
                                                                             px-1.5 py-0.5 rounded-full">
                                                                Editing
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                                  text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                                                        <span className={isDraft ? "text-amber-500" : "text-emerald-500"}>
                                                            ● {isDraft ? "Draft" : "Completed"}
                                                        </span>
                                                        {exam.course && ` · ${exam.course}`}
                                                        {exam.block && ` · ${exam.block}`}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <button
                                                    onClick={() => handleEditExam(exam)}
                                                    className={`flex-1 min-w-[80px] h-9 rounded-lg
                                                                text-[10px] font-bold uppercase tracking-wider
                                                                flex items-center justify-center gap-1
                                                                active:scale-[0.97] transition-transform
                                                                ${isEditingThis
                                                            ? "bg-blue-600 text-white"
                                                            : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200"
                                                        }`}
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    <Edit3 className="h-3 w-3" />
                                                    {isEditingThis ? "Editing" : "Edit"}
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteExam(exam.id)}
                                                    className="h-9 px-3 rounded-lg
                                                               bg-rose-50 dark:bg-rose-400/10
                                                               text-rose-700 dark:text-rose-400
                                                               text-[10px] font-bold uppercase tracking-wider
                                                               flex items-center justify-center gap-1
                                                               active:scale-[0.97] transition-transform"
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    Delete
                                                </button>

                                                <button
                                                    onClick={() => handleContinueExam(exam.id)}
                                                    className="flex-1 min-w-[90px] h-9 rounded-lg
                                                               bg-emerald-600 text-white
                                                               text-[10px] font-bold uppercase tracking-wider
                                                               flex items-center justify-center gap-1
                                                               active:scale-[0.97] transition-transform"
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    {isEditingThis ? (
                                                        <>
                                                            <FileText className="h-3 w-3" />
                                                            Preview
                                                        </>
                                                    ) : (
                                                        <>
                                                            <PlayCircle className="h-3 w-3" />
                                                            {isDraft ? "Resume" : "View"}
                                                        </>
                                                    )}
                                                </button>

                                                {isEditingThis && (
                                                    <button
                                                        type="submit"
                                                        form="exam-form"
                                                        className="flex-1 min-w-[90px] h-9 rounded-lg
                                                                   bg-blue-600 text-white
                                                                   text-[10px] font-bold uppercase tracking-wider
                                                                   flex items-center justify-center gap-1
                                                                   active:scale-[0.97] transition-transform"
                                                        style={{ touchAction: "manipulation" }}
                                                    >
                                                        <Check className="h-3 w-3" />
                                                        Update
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Empty state */}
                    {!isLoadingExams && allExams.length === 0 && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-5 text-center space-y-3">
                            <div className="h-16 w-16 rounded-full
                                            bg-amber-50 dark:bg-amber-400/10
                                            flex items-center justify-center mx-auto">
                                <FileSearch className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold">
                                    No exams created yet
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                    You haven't started creating any exams. Configure your first
                                    one below to begin assessing your students.
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                            bg-amber-50 dark:bg-amber-400/10
                                            text-amber-700 dark:text-amber-300">
                                <Sparkles className="h-3 w-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                    Get started below
                                </span>
                            </div>
                        </section>
                    )}

                    {/* Create/edit form */}
                    <section
                        id="exam-form-container"
                        className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden"
                    >
                        <div className="px-4 py-3
                                        border-b border-slate-200/70 dark:border-white/[0.06]
                                        flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg
                                            bg-blue-50 dark:bg-blue-400/10
                                            flex items-center justify-center shrink-0">
                                <PlusCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-blue-600 dark:text-blue-400 leading-none mb-1">
                                    {editingExamId ? "Edit mode" : "New exam"}
                                </p>
                                <h2 className="text-sm font-bold leading-tight truncate">
                                    {editingExamId ? "Update exam configuration" : "Create exam session"}
                                </h2>
                            </div>
                        </div>

                        <form id="exam-form" onSubmit={handleCreateExam} className="p-4 space-y-4">

                            {/* Section 1: Identity */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-slate-500 dark:text-slate-400">
                                        Exam identity
                                    </p>
                                </div>

                                <input
                                    type="text"
                                    placeholder="Exam title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    className="w-full h-10 px-3 rounded-xl text-sm font-bold
                                               bg-slate-50 dark:bg-[#0d1117]
                                               border-0 outline-none
                                               text-slate-900 dark:text-white
                                               placeholder:text-slate-400 dark:placeholder:text-slate-500
                                               placeholder:font-normal
                                               focus:ring-2 focus:ring-blue-500/40"
                                />

                                <textarea
                                    placeholder="Description (scope, objectives, etc.)"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full p-3 rounded-xl text-sm resize-none
                                               bg-slate-50 dark:bg-[#0d1117]
                                               border-0 outline-none
                                               text-slate-900 dark:text-white
                                               placeholder:text-slate-400 dark:placeholder:text-slate-500
                                               focus:ring-2 focus:ring-blue-500/40"
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider
                                                          text-slate-500 dark:text-slate-400 ml-1">
                                            Course
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Nursing"
                                            value={course}
                                            onChange={(e) => setCourse(e.target.value)}
                                            className="w-full h-10 px-3 rounded-xl text-sm
                                                       bg-slate-50 dark:bg-[#0d1117]
                                                       border-0 outline-none
                                                       text-slate-900 dark:text-white
                                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                                       focus:ring-2 focus:ring-blue-500/40"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider
                                                          text-slate-500 dark:text-slate-400 ml-1">
                                            Block / Class
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Section B"
                                            value={block}
                                            onChange={(e) => setBlock(e.target.value)}
                                            className="w-full h-10 px-3 rounded-xl text-sm
                                                       bg-slate-50 dark:bg-[#0d1117]
                                                       border-0 outline-none
                                                       text-slate-900 dark:text-white
                                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                                       focus:ring-2 focus:ring-blue-500/40"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Security */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                    <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-slate-500 dark:text-slate-400">
                                        Security & proctoring
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider
                                                      text-slate-500 dark:text-slate-400 ml-1">
                                        Access key (exam password)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter a secure key"
                                        value={examKey}
                                        onChange={(e) => setExamKey(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl text-sm font-mono font-bold tracking-widest
                                                   bg-slate-50 dark:bg-[#0d1117]
                                                   border-0 outline-none
                                                   text-blue-600 dark:text-blue-400
                                                   placeholder:text-slate-400 dark:placeholder:text-slate-500
                                                   placeholder:font-sans placeholder:tracking-normal placeholder:font-normal
                                                   focus:ring-2 focus:ring-blue-500/40"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider
                                                          text-slate-500 dark:text-slate-400 ml-1">
                                            Duration (mins)
                                        </label>
                                        <input
                                            type="number"
                                            value={duration}
                                            onChange={(e) => setDuration(Number(e.target.value))}
                                            className="w-full h-10 px-3 rounded-xl text-sm
                                                       bg-slate-50 dark:bg-[#0d1117]
                                                       border-0 outline-none
                                                       text-slate-900 dark:text-white
                                                       focus:ring-2 focus:ring-blue-500/40"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider
                                                          text-slate-500 dark:text-slate-400 ml-1">
                                            Max tab switches
                                        </label>
                                        <input
                                            type="number"
                                            value={maxTabSwitch}
                                            onChange={(e) => setMaxTabSwitch(Number(e.target.value))}
                                            className="w-full h-10 px-3 rounded-xl text-sm
                                                       bg-slate-50 dark:bg-[#0d1117]
                                                       border-0 outline-none
                                                       text-slate-900 dark:text-white
                                                       focus:ring-2 focus:ring-blue-500/40"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider
                                                          text-slate-500 dark:text-slate-400 ml-1">
                                            Violation limit
                                        </label>
                                        <input
                                            type="number"
                                            value={maxViolationLimit}
                                            onChange={(e) => setMaxViolationLimit(Number(e.target.value))}
                                            className="w-full h-10 px-3 rounded-xl text-sm
                                                       bg-slate-50 dark:bg-[#0d1117]
                                                       border-0 outline-none
                                                       text-slate-900 dark:text-white
                                                       focus:ring-2 focus:ring-blue-500/40"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider
                                                          text-blue-600 dark:text-blue-400 ml-1">
                                            Tutor reset code *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Admin reset code"
                                            value={tutorResetCode}
                                            onChange={(e) => setTutorResetCode(e.target.value)}
                                            required
                                            className="w-full h-10 px-3 rounded-xl text-sm font-bold
                                                       bg-blue-50 dark:bg-blue-400/10
                                                       border-0 outline-none
                                                       text-slate-900 dark:text-white
                                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                                       placeholder:font-normal
                                                       focus:ring-2 focus:ring-blue-500/40"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Dates */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-slate-500 dark:text-slate-400">
                                        Scheduling & release
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3
                                                bg-slate-50 dark:bg-[#0d1117] rounded-xl p-3">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider
                                                      text-slate-500 dark:text-slate-400 text-center">
                                            Exam window
                                        </p>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">
                                                Scheduled start
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={scheduledStart}
                                                onChange={(e) => setScheduledStart(e.target.value)}
                                                className="w-full h-10 px-2 rounded-lg text-[11px] font-bold
                                                           bg-white dark:bg-[#161b22]
                                                           border-0 outline-none
                                                           text-slate-900 dark:text-white
                                                           focus:ring-2 focus:ring-blue-500/40"
                                            />
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 ml-1">
                                                Stored as UTC
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">
                                                Scheduled end
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={scheduledEnd}
                                                onChange={(e) => setScheduledEnd(e.target.value)}
                                                className="w-full h-10 px-2 rounded-lg text-[11px] font-bold
                                                           bg-white dark:bg-[#161b22]
                                                           border-0 outline-none
                                                           text-slate-900 dark:text-white
                                                           focus:ring-2 focus:ring-blue-500/40"
                                            />
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 ml-1">
                                                Stored as UTC
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider
                                                      text-slate-500 dark:text-slate-400 text-center">
                                            Publicity window
                                        </p>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">
                                                Released at
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={releasedAt}
                                                onChange={(e) => setReleasedAt(e.target.value)}
                                                className="w-full h-10 px-2 rounded-lg text-[11px] font-bold
                                                           bg-white dark:bg-[#161b22]
                                                           border-0 outline-none
                                                           text-slate-900 dark:text-white
                                                           focus:ring-2 focus:ring-blue-500/40"
                                            />
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 ml-1">
                                                Stored as UTC
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">
                                                Closed at
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={closedAt}
                                                onChange={(e) => setClosedAt(e.target.value)}
                                                className="w-full h-10 px-2 rounded-lg text-[11px] font-bold
                                                           bg-white dark:bg-[#161b22]
                                                           border-0 outline-none
                                                           text-slate-900 dark:text-white
                                                           focus:ring-2 focus:ring-blue-500/40"
                                            />
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 ml-1">
                                                Stored as UTC
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Toggles */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                    <Globe className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-slate-500 dark:text-slate-400">
                                        Visibility & automation
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    <ToggleButton checked={isPublic} onClick={() => setIsPublic(!isPublic)} label="Public access" />
                                    <ToggleButton checked={isFree} onClick={() => setIsFree(!isFree)} label="Free trial exam" />
                                    <ToggleButton checked={isActive} onClick={() => setIsActive(!isActive)} label="Status: Active" />
                                    <ToggleButton checked={isReleased} onClick={() => setIsReleased(!isReleased)} label="Status: Released" />
                                    <ToggleButton checked={resultsReleased} onClick={() => setResultsReleased(!resultsReleased)} label="Results visibility" />
                                    <ToggleButton checked={strictMode} onClick={() => setStrictMode(!strictMode)} label="Strict proctoring" />
                                    <div className="sm:col-span-2">
                                        <ToggleButton
                                            checked={autoSubmitOnViolation}
                                            onClick={() => setAutoSubmitOnViolation(!autoSubmitOnViolation)}
                                            label="Auto-terminate on violation"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-10 rounded-xl bg-blue-600 text-white
                                           text-sm font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform
                                           disabled:opacity-50 disabled:active:scale-100"
                                style={{ touchAction: "manipulation" }}
                            >
                                {loading ? (
                                    "Configuring secure session…"
                                ) : (
                                    <>
                                        {editingExamId ? "Update exam" : "Finalize & create exam"}
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default TutorExamList;