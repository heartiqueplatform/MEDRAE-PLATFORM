"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Bell, Plus, X, RefreshCw } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { RealtimeChannel } from "@supabase/supabase-js";
import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";
interface CountdownPlan {
    id: string;
    user_id?: string;
    exam_name: string;
    exam_type: string;
    start_date?: string;
    exam_date: string;
    papers?: string[];
    is_active?: boolean;
    notes?: string;
    created_at: string;
}

export default function CountdownCards() {
    const [plans, setPlans] = useState<CountdownPlan[]>([]);
    const [universalExams, setUniversalExams] = useState<CountdownPlan[]>([]);
    const [countdowns, setCountdowns] = useState<{
        [id: string]: { days: number; hours: number; minutes: number; seconds: number };
    }>({});
    const [nextExamId, setNextExamId] = useState<string | null>(null);
    const [hiddenAfterEnd, setHiddenAfterEnd] = useState<string[]>([]);
    const [selectedExam, setSelectedExam] = useState<CountdownPlan | null>(null);
    const [addingExam, setAddingExam] = useState(false);
    const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
    const [examName, setExamName] = useState("");
    const [examType, setExamType] = useState("");
    const [examDate, setExamDate] = useState("");
    const [papers, setPapers] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [hiddenExams, setHiddenExams] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Load cache and hidden exams on mount ---
    useEffect(() => {
        const cached = localStorage.getItem("allExams");
        if (cached && JSON.parse(cached).length > 0) {
            const parsed: CountdownPlan[] = JSON.parse(cached);
            const userExams = parsed.filter(e => e.user_id);
            const universal = parsed.filter(e => !e.user_id);

            setPlans(userExams);
            setUniversalExams(universal);

            // Auto-select first visible user exam
            const hidden = localStorage.getItem("hiddenExams");
            const hiddenExamsList = hidden ? JSON.parse(hidden) : [];
            if (hiddenExamsList.length > 0) setHiddenExams(hiddenExamsList);

            const firstVisibleUserExam = userExams.find(e => !hiddenExamsList.includes(e.id));
            if (firstVisibleUserExam) setSelectedExam(firstVisibleUserExam);

            setLoading(false);
        } else {
            fetchInitialExams();
        }
    }, []);

    // --- Realtime subscription ---
    useEffect(() => {
        let userChannel: RealtimeChannel;
        let universalChannel: RealtimeChannel;

        async function setupRealtime() {
            const user = await supabase.auth.getUser();
            const userId = user.data.user?.id;

            if (userId) {
                userChannel = supabase
                    .channel("user-countdown-plans")
                    .on(
                        "postgres_changes",
                        { event: "*", schema: "public", table: "countdown_plans", filter: `user_id=eq.${userId}` },
                        (payload) => updateExamsFromPayload("user", payload)
                    );
                await userChannel.subscribe();
            }

            universalChannel = supabase
                .channel("universal-exams")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "universal_exams" },
                    (payload) => updateExamsFromPayload("universal", payload)
                );
            await universalChannel.subscribe();
        }

        setupRealtime();

        return () => {
            if (userChannel) supabase.removeChannel(userChannel);
            if (universalChannel) supabase.removeChannel(universalChannel);
        };
    }, []);
    async function deleteExam(examId: string) {
        const user = await supabase.auth.getUser();
        if (!user.data.user) return;

        setDeletingExamId(examId); // START loading

        const { error } = await supabase
            .from("countdown_plans")
            .delete()
            .eq("id", examId)
            .eq("user_id", user.data.user.id);

        setDeletingExamId(null); // STOP loading

        if (error) {
            console.error(error);
            alert("Failed to delete exam");
        } else {
            setPlans((prev) => prev.filter((e) => e.id !== examId));
            localStorage.setItem(
                "allExams",
                JSON.stringify([...plans.filter((e) => e.id !== examId), ...universalExams])
            );
            if (selectedExam?.id === examId) setSelectedExam(null);
        }
    }
    // --- Countdown timer ---
    const allExams = [...plans, ...universalExams].filter(e => !hiddenExams.includes(e.id));
    const now = new Date();

    const visibleExams = allExams.filter((exam) => {
        const endOfExamDay = new Date(exam.exam_date + "T23:59:59");

        // ❌ Completely remove exams that ended before today
        if (now > endOfExamDay) return false;

        return !hiddenExams.includes(exam.id);
    });


    useEffect(() => {
        if (allExams.length === 0) return;

        const interval = setInterval(() => {
            const updated: typeof countdowns = {};
            let closestDiff = Infinity;
            let upcomingId: string | null = null;
            allExams.forEach((exam) => {
                const countdown = getCountdown(exam.exam_date);
                updated[exam.id] = countdown;

                const totalSeconds =
                    countdown.days * 86400 +
                    countdown.hours * 3600 +
                    countdown.minutes * 60 +
                    countdown.seconds;

                if (totalSeconds > 0 && totalSeconds < closestDiff) {
                    closestDiff = totalSeconds;
                    upcomingId = exam.id;
                }

                // Hide after 10 seconds
                const now = new Date();
                const endOfExamDay = new Date(exam.exam_date + "T23:59:59");

                // Hide ONLY after exam day is fully finished
                if (now > endOfExamDay && !hiddenAfterEnd.includes(exam.id)) {
                    setTimeout(() => {
                        setHiddenAfterEnd(prev => [...prev, exam.id]);
                    }, 10000);
                }

            });


            setCountdowns(updated);
            setNextExamId(upcomingId);
        }, 1000);

        return () => clearInterval(interval);
    }, [allExams]);
    function getExamStatus(examId: string, examDate: string) {
        const countdown = countdowns[examId];
        if (!countdown) return "upcoming";

        const now = new Date();
        const startOfDay = new Date(examDate + "T00:00:00");
        const endOfDay = new Date(examDate + "T23:59:59");

        // If today is the exam day → in-progress
        if (now >= startOfDay && now <= endOfDay) return "in-progress";

        // If exam is in the future → upcoming
        return "upcoming";
    }


    // --- Helpers ---
    function getCountdown(examDate: string) {
        const now = new Date();

        const startOfDay = new Date(examDate + "T00:00:00");
        const endOfDay = new Date(examDate + "T23:59:59");

        // BEFORE exam day
        if (now < startOfDay) {
            const diff = startOfDay.getTime() - now.getTime();
            return {
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff / 3600000) % 24),
                minutes: Math.floor((diff / 60000) % 60),
                seconds: Math.floor((diff / 1000) % 60),
            };
        }

        // DURING exam day (show hours left today)
        if (now >= startOfDay && now <= endOfDay) {
            const diff = endOfDay.getTime() - now.getTime();
            return {
                days: 0,
                hours: Math.floor(diff / 3600000),
                minutes: Math.floor((diff / 60000) % 60),
                seconds: Math.floor((diff / 1000) % 60),
            };
        }

        // AFTER exam day
        return { days: -1, hours: 0, minutes: 0, seconds: 0 };
    }


    function formatDate(examDate: string) {
        const d = new Date(examDate);
        return d.toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }

    function hideExam(examId: string) {
        const newHidden = [...hiddenExams, examId];
        setHiddenExams(newHidden);
        localStorage.setItem("hiddenExams", JSON.stringify(newHidden));
    }

    function resetHidden() {
        setHiddenExams([]);
        localStorage.removeItem("hiddenExams");
    }

    // --- Add new exam ---
    async function addPlan() {
        const user = await supabase.auth.getUser();
        if (!user.data.user) return;

        if (!examName || !examType || !examDate) {
            alert("Please fill all required fields");
            return;
        }

        setAddingExam(true); // START loading

        const { data, error } = await supabase
            .from("countdown_plans")
            .insert([
                {
                    id: uuidv4(),
                    user_id: user.data.user.id,
                    exam_name: examName,
                    exam_type: examType,
                    start_date: new Date().toISOString().split("T")[0],
                    exam_date: examDate,
                    papers: papers.split(",").map((p) => p.trim()),
                    is_active: true,
                },
            ])
            .select();

        setAddingExam(false); // STOP loading

        if (error) console.error(error);
        else {
            setPlans((prev) => [...prev, data[0]]);
            localStorage.setItem("allExams", JSON.stringify([...plans, ...universalExams, data[0]]));
            setExamName("");
            setExamType("");
            setExamDate("");
            setPapers("");
            setShowForm(false);
        }
    }

    // --- Initial fetch ---
    async function fetchInitialExams() {
        setLoading(true);
        const user = await supabase.auth.getUser();
        let userPlans: CountdownPlan[] = [];
        let universal: CountdownPlan[] = [];

        if (user.data.user) {
            const { data: plansData, error } = await supabase
                .from("countdown_plans")
                .select("*")
                .eq("user_id", user.data.user.id)
                .eq("is_active", true)
                .order("exam_date", { ascending: true });
            if (error) console.error(error);
            else userPlans = plansData || [];
        }

        const { data: universalData, error: universalError } = await supabase
            .from("universal_exams")
            .select("*")
            .order("exam_date", { ascending: true });
        if (universalError) console.error(universalError);
        else universal = universalData || [];

        setPlans(userPlans);
        setUniversalExams(universal);

        const all = [...userPlans, ...universal];
        if (all.length > 0) localStorage.setItem("allExams", JSON.stringify(all));
        setLoading(false);
    }

    function CountdownRectCard({
        exam,
        countdown,
        onClick,
        selected = false,
    }: {
        exam: CountdownPlan;
        countdown?: { days: number; hours: number; minutes: number; seconds: number };
        onClick: () => void;
        selected?: boolean;
    }) {
        return (
            <div

                onClick={onClick}
                className={`
        flex flex-col justify-between items-center
        w-32 sm:w-40 md:w-44 lg:w-48 h-48 sm:h-56 md:h-64
        p-4 rounded-xl cursor-pointer
        flex-shrink-0 transition-transform duration-300
        border border-gray-300/30 dark:border-gray-600/50
        ${selected
                        ? "scale-105 border-blue-400 shadow-[0_0_25px_8px_rgba(59,130,246,0.8)] bg-gray-100 dark:bg-gray-800"
                        : "border-gray-300/30 dark:border-gray-600/50 bg-gray-100 dark:bg-gray-800"
                    }
    `}
            >

                {/* Exam Name */}
                <span className={`text-center font-semibold text-sm sm:text-base ${selected ? "text-blue-900 dark:text-white" : "text-gray-900 dark:text-white"}`}>
                    {exam.exam_name}
                </span>

                {/* Countdown Numbers */}
                <div className="flex flex-col items-center justify-center mt-2 space-y-1">
                    <span className={`font-mono text-lg sm:text-xl ${selected ? "glow-text" : ""}`}>
                        {String(countdown?.days ?? 0).padStart(2, "0")}d
                    </span>
                    <span className={`font-mono text-base sm:text-lg ${selected ? "glow-text" : ""}`}>
                        {String(countdown?.hours ?? 0).padStart(2, "0")}:
                        {String(countdown?.minutes ?? 0).padStart(2, "0")}:
                        {String(countdown?.seconds ?? 0).padStart(2, "0")}
                    </span>
                </div>

                {/* Exam Date */}
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 mt-2 text-center">
                    {formatDate(exam.exam_date)}
                </span>
            </div>
        );
    }
    function ExamCard({
        exam,
        countdown,
        showHideButton = true,
        onHide,
        highlightNext = false,
    }: {
        exam: CountdownPlan;
        countdown?: { days: number; hours: number; minutes: number; seconds: number };
        showHideButton?: boolean;
        onHide?: () => void;
        highlightNext?: boolean;
    }) {
        const status = getExamStatus(exam.id, exam.exam_date);

        return (
            <div
                className={`relative border rounded-xl shadow-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center transition
      ${highlightNext ? "border-red-500" : ""}
      ${status === "in-progress"
                        ? "bg-green-100 dark:bg-green-900 border-green-500"
                        : "bg-gray-100 dark:bg-gray-800"}`}
            >
                <div className="flex-1 mb-3 md:mb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <p className="text-lg font-semibold mb-2 sm:mb-0">{exam.exam_name}</p>
                        {exam.user_id && (
                            <div className="flex space-x-2">
                                {/* Hide Button */}
                                {showHideButton && onHide && (
                                    <button
                                        onClick={onHide}
                                        className="flex items-center space-x-1 px-2 py-0.5 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-100 transition"
                                    >
                                        <span>Hide</span>
                                        <X className="w-3 h-3 text-gray-500" />
                                    </button>
                                )}
                                {/* Delete Button with confirmation */}
                                <button
                                    onClick={() => {
                                        if (confirm(`Are you sure you want to delete the exam "${exam.exam_name}"? This action cannot be undone.`)) {
                                            deleteExam(exam.id);
                                        }
                                    }}
                                    className="flex items-center space-x-1 px-2 py-0.5 border border-red-400 rounded text-xs text-red-700 hover:bg-red-100 transition"
                                    disabled={deletingExamId === exam.id}
                                >
                                    <span>{deletingExamId === exam.id ? "Deleting..." : "Delete"}</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-gray-500">Type: {exam.exam_type}</p>
                    <p className="text-sm text-gray-500">Date: {formatDate(exam.exam_date)}</p>
                    {exam.papers?.length > 0 && (
                        <p className="text-sm text-gray-500">Papers: {exam.papers.join(", ")}</p>
                    )}
                    {exam.notes && <p className="text-xs text-gray-400">{exam.notes}</p>}
                    {!exam.user_id && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-white bg-green-500 rounded-full">
                            Official
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    {highlightNext && <Bell className="text-red-500 w-6 h-6 animate-bounce" />}
                    <div className="font-mono bg-gray-100 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-center shadow-inner">
                        {status === "in-progress" ? (
                            <div className="flex flex-col items-center justify-center px-6">
                                <span className="text-green-700 dark:text-green-300 font-bold text-xl animate-pulse">
                                    Exam in Progress
                                </span>
                                <span className="text-xs text-gray-500 mt-1">Happening today</span>
                            </div>
                        ) : (
                            ["days", "hours", "minutes", "seconds"].map((unit, index) => (
                                <div key={unit} className="flex items-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-2xl">
                                            {String(countdown?.[unit as keyof typeof countdown] ?? 0).padStart(2, "0")}
                                        </span>
                                        <span className="text-xs text-gray-500">{unit}</span>
                                    </div>
                                    {index < 3 && <span className="text-4xl mx-1">:</span>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- Update exams from realtime payload ---
    function updateExamsFromPayload(type: "user" | "universal", payload: any) {
        const exam: CountdownPlan = payload.new;
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            if (type === "user") {
                setPlans((prev) => {
                    const exists = prev.find((e) => e.id === exam.id);
                    if (exists) return prev.map((e) => (e.id === exam.id ? exam : e));
                    else return [...prev, exam];
                });
            } else {
                setUniversalExams((prev) => {
                    const exists = prev.find((e) => e.id === exam.id);
                    if (exists) return prev.map((e) => (e.id === exam.id ? exam : e));
                    else return [...prev, exam];
                });
            }
        } else if (payload.eventType === "DELETE") {
            if (type === "user") setPlans((prev) => prev.filter((e) => e.id !== payload.old.id));
            else setUniversalExams((prev) => prev.filter((e) => e.id !== payload.old.id));
        }

        localStorage.setItem("allExams", JSON.stringify([...plans, ...universalExams]));
    }
    // --- Skeleton Loader ---
    const renderSkeleton = () => (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex space-x-4 p-4 border rounded-lg bg-gray-100 dark:bg-gray-800">
                    <div className="flex-1 space-y-2 py-1">
                        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                    <div className="w-32 h-16 bg-gray-300 dark:bg-gray-700 rounded"></div>
                </div>
            ))}
        </div>
    );

    return (

        <div className="relative overflow-hidden w-full px-4 py-6 rounded-xl border-0 bg-white/70 dark:bg-slate-950/50 backdrop-blur-xl shadow-2xl mt-6 transition-all duration-500">

            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16" />

            {/* Section Heading */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-2 mb-8 px-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl shadow-inner group transition-all">
                        <img
                            src="/clock.ico"
                            alt="Exam Countdown"
                            className="w-8 h-8 object-contain group-hover:rotate-12 transition-transform duration-500"
                        />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-[3px] font-bold text-blue-600 dark:text-blue-400">Academic focus</p>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Exam Countdown
                        </h2>
                    </div>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-xs md:text-right leading-relaxed">
                    Precision timing for your finals. Tap any card to synchronize your study plan.
                </p>
            </div>

            {/* Analog Clock Horizontal Grid */}
            <div className="relative z-10 flex gap-2 overflow-x-auto pb-4 pt-2 custom-scrollbar snap-x snap-mandatory scroll-smooth no-scrollbar">
                {visibleExams.map((exam) => (
                    <div key={exam.id} className="snap-center flex-shrink-0 transition-transform duration-300 hover:scale-[1.02]">
                        <CountdownRectCard
                            exam={exam}
                            countdown={countdowns[exam.id]}
                            onClick={() => setSelectedExam(exam)}
                            selected={selectedExam?.id === exam.id}
                        />
                    </div>
                ))}
            </div>

            {/* Detailed View - Transitions & Focus */}
            <AnimatePresence mode="wait">
                {selectedExam && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mt-6 relative z-10"
                    >
                        <div className="absolute inset-0 bg-blue-500/5 rounded-[2rem] blur-xl" />
                        <div className="relative">
                            <ExamCard
                                exam={selectedExam}
                                countdown={countdowns[selectedExam.id]}
                                showHideButton={true}
                                onHide={() => hideExam(selectedExam.id)}
                                highlightNext={selectedExam.id === nextExamId}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Control Panel */}
            <div className="relative z-10 flex flex-wrap items-center gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                <button
                    className="group flex items-center space-x-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 active:scale-95"
                    onClick={() => setShowForm(!showForm)}
                >
                    <Plus className={`w-4 h-4 transition-transform duration-500 ${showForm ? 'rotate-45' : ''}`} />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Plan New Exam</span>
                </button>

                <button
                    onClick={resetHidden}
                    className="flex items-center space-x-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Reset Views</span>
                </button>
            </div>

            {/* Advanced Add Exam Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-4 mt-6 p-6 rounded-[2rem] bg-slate-50/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-2">Subject Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Clinical Nursing"
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:opacity-50"
                                        value={examName}
                                        onChange={(e) => setExamName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-2">Category</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. End of Semester"
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:opacity-50"
                                        value={examType}
                                        onChange={(e) => setExamType(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-2">Assessment Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={examDate}
                                        onChange={(e) => setExamDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-2">Exam Papers</label>
                                    <input
                                        type="text"
                                        placeholder="Paper 1, Paper 2..."
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:opacity-50"
                                        value={papers}
                                        onChange={(e) => setPapers(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={addPlan}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl font-bold text-xs uppercase tracking-[2px] shadow-xl shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                                disabled={addingExam}
                            >
                                {addingExam ? "Synchronizing Data..." : "Finalize Exam Schedule"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
