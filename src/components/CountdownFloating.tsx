"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Bell, Plus, X, RefreshCw } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { RealtimeChannel } from "@supabase/supabase-js";

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
        if (cached) {
            const parsed: CountdownPlan[] = JSON.parse(cached);
            setPlans(parsed.filter(e => e.user_id));
            setUniversalExams(parsed.filter(e => !e.user_id));
            setLoading(false);
        }

        const hidden = localStorage.getItem("hiddenExams");
        if (hidden) setHiddenExams(JSON.parse(hidden));

        fetchInitialExams();
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
        <div className="space-y-6 w-full px-2 sm:px-2">
            <div className="flex justify-end space-x-2">
                <button
                    onClick={resetHidden}
                    className="flex items-center space-x-1 bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reset Hidden Exams</span>
                </button>
            </div>
            {loading && renderSkeleton()}
            {!loading && allExams.length === 0 && <p>No active countdown plans.</p>}
            {!loading &&
                visibleExams.map((exam) => {
                    const status = getExamStatus(exam.id, exam.exam_date);

                    return (
                        <div
                            key={exam.id}
                            className={`relative border rounded-lg shadow-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center transition
        ${exam.id === nextExamId ? "border-red-500" : ""}
        ${status === "in-progress"
                                    ? "bg-green-100 dark:bg-green-900 border-green-500"
                                    : "bg-white dark:bg-gray-900"}
      `}
                        >
                            <div className="flex-1 mb-3 md:mb-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                                    <p className="text-lg font-semibold mb-2 sm:mb-0">{exam.exam_name}</p>
                                    <div className="flex">
                                        <button
                                            onClick={() => hideExam(exam.id)}
                                            className="flex items-center space-x-1 px-2 py-0.5 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-100 transition"
                                        >
                                            <span>Hide Irrelevant</span>
                                            <X className="w-3 h-3 text-gray-500" />
                                        </button>
                                    </div>
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
                                {exam.id === nextExamId && <Bell className="text-red-500 w-6 h-6 animate-bounce" />}
                                <div className="font-mono bg-gray-100 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-center shadow-inner">
                                    {status === "in-progress" ? (
                                        <div className="flex flex-col items-center justify-center px-6">
                                            <span className="text-green-700 dark:text-green-300 font-bold text-xl animate-pulse">
                                                Exam in Progress
                                            </span>
                                            <span className="text-xs text-gray-500 mt-1">
                                                Happening today
                                            </span>
                                        </div>
                                    ) : (
                                        ["days", "hours", "minutes", "seconds"].map((unit, index) => (
                                            <div key={unit} className="flex items-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-4xl">
                                                        {String(
                                                            countdowns[exam.id]?.[unit as keyof typeof countdowns[exam.id]] ?? 0
                                                        ).padStart(2, "0")}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {unit.charAt(0).toUpperCase() + unit.slice(1)}
                                                    </span>
                                                </div>
                                                {index < 3 && <span className="text-4xl mx-1">:</span>}
                                            </div>
                                        ))
                                    )}

                                </div>

                            </div>

                        </div>
                    )
                }

                )}
            < button
                className="flex items-center space-x-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                onClick={() => setShowForm(!showForm)}
            >
                <Plus className="w-5 h-5" />
                <span>Add your Upcoming Exams</span>
            </button>

            {
                showForm && (
                    <div className="space-y-2 mt-2 border-t pt-4">
                        <input
                            type="text"
                            placeholder="Exam Name"
                            className="w-full border rounded p-2"
                            value={examName}
                            onChange={(e) => setExamName(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Exam Type"
                            className="w-full border rounded p-2"
                            value={examType}
                            onChange={(e) => setExamType(e.target.value)}
                        />
                        <input
                            type="date"
                            className="w-full border rounded p-2"
                            value={examDate}
                            onChange={(e) => setExamDate(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Papers (comma separated)"
                            className="w-full border rounded p-2"
                            value={papers}
                            onChange={(e) => setPapers(e.target.value)}
                        />
                        <button
                            onClick={addPlan}
                            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                        >
                            Add Exam
                        </button>
                    </div>
                )
            }
        </div >
    );
}
