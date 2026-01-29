"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Bell, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface CountdownPlan {
    id: string;
    user_id: string;
    exam_name: string;
    exam_type: string;
    start_date: string;
    exam_date: string;
    papers: string[];
    is_active: boolean;
    created_at: string;
}

export default function CountdownCards() {
    const [plans, setPlans] = useState<CountdownPlan[]>([]);
    const [loading, setLoading] = useState(false);

    const [examName, setExamName] = useState("");
    const [examType, setExamType] = useState("");
    const [examDate, setExamDate] = useState("");
    const [papers, setPapers] = useState("");
    const [showForm, setShowForm] = useState(false);

    const [countdowns, setCountdowns] = useState<{
        [id: string]: { days: number; hours: number; minutes: number; seconds: number };
    }>({});
    const [nextExamId, setNextExamId] = useState<string | null>(null);

    // Fetch plans
    async function fetchPlans() {
        setLoading(true);
        const user = await supabase.auth.getUser();
        if (!user.data.user) {
            setLoading(false);
            return;
        }
        const { data, error } = await supabase
            .from("countdown_plans")
            .select("*")
            .eq("user_id", user.data.user.id)
            .eq("is_active", true)
            .order("exam_date", { ascending: true });
        if (error) console.error(error);
        else setPlans(data || []);
        setLoading(false);
    }

    useEffect(() => {
        fetchPlans();
    }, []);

    // Update countdowns
    useEffect(() => {
        if (plans.length === 0) return;

        const interval = setInterval(() => {
            const updated: typeof countdowns = {};
            let closestDiff = Infinity;
            let upcomingId: string | null = null;

            plans.forEach((plan) => {
                const countdown = getCountdown(plan.exam_date);
                updated[plan.id] = countdown;

                const totalSeconds =
                    countdown.days * 86400 +
                    countdown.hours * 3600 +
                    countdown.minutes * 60 +
                    countdown.seconds;

                if (totalSeconds > 0 && totalSeconds < closestDiff) {
                    closestDiff = totalSeconds;
                    upcomingId = plan.id;
                }
            });

            setCountdowns(updated);
            setNextExamId(upcomingId);
        }, 1000);

        return () => clearInterval(interval);
    }, [plans]);

    function getCountdown(examDate: string) {
        const now = new Date();
        const target = new Date(examDate + "T23:59:59");
        const diff = target.getTime() - now.getTime();
        if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        return { days, hours, minutes, seconds };
    }

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
            setExamName("");
            setExamType("");
            setExamDate("");
            setPapers("");
            setShowForm(false);
        }
    }

    return (
        <div className="space-y-10 w-full px-2 sm:px-2">
            {loading && <p>Loading countdowns...</p>}
            {plans.length === 0 && !loading && <p>No active countdown plans.</p>}

            {/* Countdown Cards */}
            {plans.map((plan) => (
                <div
                    key={plan.id}
                    className={`relative border rounded-lg shadow-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-900 transition ${plan.id === nextExamId ? "border-red-500" : ""
                        }`}
                >
                    {/* Exam info */}
                    <div className="flex-1 mb-3 md:mb-0">
                        <p className="text-lg font-semibold">{plan.exam_name}</p>
                        <p className="text-sm text-gray-500">Type: {plan.exam_type}</p>
                        <p className="text-sm text-gray-500">Papers: {plan.papers.join(", ")}</p>
                    </div>

                    {/* Countdown timer in box */}
                    <div className="flex items-center space-x-2">
                        {plan.id === nextExamId && <Bell className="text-red-500 w-6 h-6 animate-bounce" />}
                        <div className="font-mono text-2xl bg-gray-100 dark:bg-gray-800 rounded-lg p-3 flex space-x-4 shadow-inner">
                            <div className="text-center">
                                <div>{countdowns[plan.id]?.days ?? 0}</div>
                                <div className="text-xs text-gray-500">Days</div>
                            </div>
                            <div className="text-center">
                                <div>{countdowns[plan.id]?.hours ?? 0}</div>
                                <div className="text-xs text-gray-500">Hours</div>
                            </div>
                            <div className="text-center">
                                <div>{countdowns[plan.id]?.minutes ?? 0}</div>
                                <div className="text-xs text-gray-500">Min</div>
                            </div>
                            <div className="text-center">
                                <div>{countdowns[plan.id]?.seconds ?? 0}</div>
                                <div className="text-xs text-gray-500">Sec</div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Toggle Add Exam Form */}
            <button
                className="flex items-center space-x-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                onClick={() => setShowForm(!showForm)}
            >
                <Plus className="w-5 h-5" />
                <span>Add Upcoming Exam</span>
            </button>

            {showForm && (
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
            )}
        </div>
    );
}
