"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { Check } from "lucide-react";

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
                <div className="w-full max-w-4xl bg-white/20 dark:bg-gray-900 p-6 rounded-2xl shadow-lg backdrop-blur-md">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                        Continue Unfinished Exams
                    </h2>
                    <ul className="space-y-2">
                        {unfinishedExams.map((exam) => (
                            <li key={exam.id} className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg shadow-sm gap-2">
                                <span className="flex-1">{exam.title}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditExam(exam)} className="bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600 transition-all">
                                        Edit
                                    </button>
                                    <button onClick={() => handleDeleteExam(exam.id)} className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-all">
                                        Delete
                                    </button>
                                    <button onClick={() => handleContinueExam(exam.id)} className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-all">
                                        Continue
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Create New Exam Section */}
            <div className="w-full max-w-4xl bg-white/20 dark:bg-gray-900 p-6 pt-1 rounded-2xl shadow-lg backdrop-blur-md">
                <h1 className="text-3xl font-semibold mb-6 text-gray-900 dark:text-white">
                    Create New Exam
                </h1>

                <form onSubmit={handleCreateExam} className="space-y-4">
                    {/* Text Fields */}
                    <input
                        type="text"
                        placeholder="Exam Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
                    />

                    <textarea
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Course"
                            value={course}
                            onChange={(e) => setCourse(e.target.value)}
                            className="w-full p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
                        />
                        <input
                            type="text"
                            placeholder="Block / Class"
                            value={block}
                            onChange={(e) => setBlock(e.target.value)}
                            className="w-full p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
                        />
                    </div>

                    <input
                        type="text"
                        placeholder="Exam Key"
                        value={examKey}
                        onChange={(e) => setExamKey(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-200">
                                Duration (minutes)
                            </label>
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="w-full p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-200">
                                Max Tab Switch
                            </label>
                            <input
                                type="number"
                                value={maxTabSwitch}
                                onChange={(e) => setMaxTabSwitch(Number(e.target.value))}
                                className="w-full p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm mb-1 text-gray-700 dark:text-gray-200">
                            Max Violation Limit
                        </label>
                        <input
                            type="number"
                            value={maxViolationLimit}
                            onChange={(e) => setMaxViolationLimit(Number(e.target.value))}
                            className="w-full p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
                        />
                    </div>

                    {/* Date Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-200">
                                Scheduled Start
                            </label>
                            <input
                                type="datetime-local"
                                value={scheduledStart}
                                onChange={(e) => setScheduledStart(e.target.value)}
                                className="w-full p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-200">
                                Scheduled End
                            </label>
                            <input
                                type="datetime-local"
                                value={scheduledEnd}
                                onChange={(e) => setScheduledEnd(e.target.value)}
                                className="w-full p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-200">
                                Released At
                            </label>
                            <input
                                type="datetime-local"
                                value={releasedAt}
                                onChange={(e) => setReleasedAt(e.target.value)}
                                className="w-full p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-200">
                                Closed At
                            </label>
                            <input
                                type="datetime-local"
                                value={closedAt}
                                onChange={(e) => setClosedAt(e.target.value)}
                                className="w-full p-3 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500"
                            />
                        </div>
                    </div>

                    {/* Toggle fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <ToggleButton
                            checked={isPublic}
                            onClick={() => setIsPublic(!isPublic)}
                            label="Public Exam"
                        />
                        <ToggleButton
                            checked={isFree}
                            onClick={() => setIsFree(!isFree)}
                            label="Free Exam"
                        />
                        <ToggleButton
                            checked={isActive}
                            onClick={() => setIsActive(!isActive)}
                            label="Active"
                        />
                        <ToggleButton
                            checked={isReleased}
                            onClick={() => setIsReleased(!isReleased)}
                            label="Released"
                        />
                        <ToggleButton
                            checked={resultsReleased}
                            onClick={() => setResultsReleased(!resultsReleased)}
                            label="Results Released"
                        />
                        <ToggleButton
                            checked={strictMode}
                            onClick={() => setStrictMode(!strictMode)}
                            label="Strict Mode"
                        />
                        <ToggleButton
                            checked={autoSubmitOnViolation}
                            onClick={() => setAutoSubmitOnViolation(!autoSubmitOnViolation)}
                            label="Auto Submit on Violation"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? "Creating..." : "Create Exam"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TutorExamList;