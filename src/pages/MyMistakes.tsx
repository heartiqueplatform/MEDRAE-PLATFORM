"use client";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "@/lib/soundManager";
import { useSession } from "@supabase/auth-helpers-react";
import { MistakesCard } from "@/components/MistakesCard";
import React from 'react';
import { Trophy, Sparkles, ArrowRight, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Question {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    explanation: string;
    additional?: string;
    topic?: string;
    difficulty?: string;
    user_selected?: string;
}
interface Mistake {
    id: string;
    times_wrong: number;
    first_wrong_at: string;
    last_wrong_at: string;
    resolved: boolean;
    quiz_id: string;
    questions: Question;
    mistake_reason?: string;
}

// Cache keys
const MISTAKES_CACHE_KEY = "my_mistakes_cache";
const MISTAKES_VERSION_KEY = "my_mistakes_version";
const CACHE_DURATION = 43200000; // 12 hours

let fetchInProgress = false;
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 43200000; // 12 hours

// Helper to check if data has changed using lightweight query
async function checkForChanges(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
        const { data, error } = await supabase
            .from("user_mistakes")
            .select("last_wrong_at")
            .eq("user_id", userId)
            .eq("resolved", false)
            .order("last_wrong_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) return false;

        const currentVersion = data?.last_wrong_at || "no_data";
        const cachedVersion = localStorage.getItem(MISTAKES_VERSION_KEY);

        if (cachedVersion !== currentVersion) {
            localStorage.setItem(MISTAKES_VERSION_KEY, currentVersion);
            return true;
        }
        return false;
    } catch (err) { return false; }
}

// Cache helpers
const getCachedMistakes = (): Mistake[] => {
    try {
        const cached = localStorage.getItem(MISTAKES_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_DURATION) {
                return parsed.data.filter((m: Mistake) => m.questions && Object.keys(m.questions).length > 0);
            }
        }
    } catch (e) {
        console.error("Failed to parse cached mistakes:", e);
    }
    return [];
};

const setCachedMistakes = (data: Mistake[]) => {
    try {
        localStorage.setItem(MISTAKES_CACHE_KEY, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
    } catch (e) { }
};

// Skeleton Loader Component
const MistakesSkeleton = () => {
    return (
        <div className="w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 space-y-0 md:space-y-2 pb-4 md:pb-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="mb-0 md:mb-1">
                <div className="relative bg-white/50 dark:bg-muted/30 backdrop-blur-md md:border-0 md:rounded-2xl md:shadow-lg p-4 md:p-6 lg:p-8 text-start overflow-hidden border-b border-slate-100 dark:border-slate-800 md:border-b-0 rounded-none">
                    <div className="flex justify-between items-start">
                        <div className="space-y-3 w-full">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                <div className="h-8 md:h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-48"></div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            </div>
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
                        </div>
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Card Skeletons */}
            {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-visible md:border-0 md:shadow-md md:rounded-xl bg-white/40 dark:bg-muted/30 rounded-none border-none shadow-none border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                    <CardHeader className="p-3 md:p-4">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 md:gap-1">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4">
                        {["A", "B", "C", "D"].map((letter) => (
                            <div key={letter} className="flex justify-between items-center py-1.5 md:py-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                            </div>
                        ))}
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default function MyMistakes() {
    const navigate = useNavigate();
    const session = useSession();
    const user = session?.user || null;

    const isMounted = useRef(true);
    const pendingResolves = useRef<Map<string, boolean>>(new Map());

    const [mistakes, setMistakes] = useState<Mistake[]>(() => getCachedMistakes());
    const [loading, setLoading] = useState(false);
    const [mistakeCount, setMistakeCount] = useState(mistakes.length);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const getOfflineQueue = useCallback((): string[] => {
        const stored = localStorage.getItem("offlineResolved");
        if (!stored) return [];
        try {
            return JSON.parse(stored) as string[];
        } catch (err) {
            console.error("Failed to parse offline queue:", err);
            return [];
        }
    }, []);

    const saveToOfflineQueue = useCallback((questionId: string) => {
        const queue = getOfflineQueue();
        if (!queue.includes(questionId)) {
            queue.push(questionId);
            localStorage.setItem("offlineResolved", JSON.stringify(queue));
        }
    }, [getOfflineQueue]);

    const syncOfflineQueue = useCallback(async () => {
        const queue = getOfflineQueue();
        if (!queue.length) return;

        try {
            if (!user) return;
            for (const questionId of queue) {
                const { error } = await supabase
                    .from("user_mistakes")
                    .update({ resolved: true })
                    .eq("user_id", user.id)
                    .eq("question_id", questionId);
                if (!error) {
                    const updatedQueue = getOfflineQueue().filter(id => id !== questionId);
                    localStorage.setItem("offlineResolved", JSON.stringify(updatedQueue));
                }
            }
        } catch (err) {
            console.error("Sync offline queue failed:", err);
        }
    }, [user, getOfflineQueue]);

    const fetchMistakes = useCallback(async (forceRefresh = false) => {
        if (!user || fetchInProgress) return;

        const now = Date.now();
        const lastSync = localStorage.getItem(MISTAKES_VERSION_KEY + "_time");

        // If not a force refresh, and we sync'd recently, just use cache and STOP
        if (!forceRefresh && lastSync && (now - parseInt(lastSync)) < 43200000) {
            const cached = getCachedMistakes();
            if (cached.length > 0) {
                setMistakes(cached);
                setMistakeCount(cached.length);
                setLoading(false);
                return;
            }
        }

        fetchInProgress = true;
        lastFetchTime = now;

        if (isMounted.current) {
            const cached = getCachedMistakes();
            if (cached.length === 0) {
                setLoading(true);
            }
            setIsRefreshing(true);
        }

        try {
            const { data, error } = await supabase
                .from("user_mistakes")
                .select(`
                    id,
                    times_wrong,
                    first_wrong_at,
                    last_wrong_at,
                    resolved,
                    quiz_id,
                    user_selected,
                    mistake_reason,
                    questions:question_id (
                        id,
                        question_text,
                        option_a,
                        option_b,
                        option_c,
                        option_d,
                        correct_answer,
                        explanation,
                        additional,
                        topic,
                        difficulty
                    )
                `)
                .eq("user_id", user.id)
                .eq("resolved", false)
                .order("last_wrong_at", { ascending: false });

            if (error) {
                console.error(error);
                return;
            }

            if (!isMounted.current) return;

            const userMistakes = (data || []).filter(
                (m) => m.questions && Object.keys(m.questions).length > 0
            );

            setMistakes(userMistakes);
            setMistakeCount(userMistakes.length);
            setCachedMistakes(userMistakes);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching mistakes:", err);
        } finally {
            fetchInProgress = false;
            if (isMounted.current) {
                setIsRefreshing(false);
            }
        }
    }, [user]);

    // Initial load
    useEffect(() => {
        isMounted.current = true;

        const cached = getCachedMistakes();
        if (cached.length > 0) {
            setMistakes(cached);
            setMistakeCount(cached.length);
            setLoading(false);
            fetchMistakes(); // Background fetch
        } else {
            setLoading(true);
            fetchMistakes();
        }

        if (navigator.onLine) syncOfflineQueue();

        return () => {
            isMounted.current = false;
        };
    }, [fetchMistakes, syncOfflineQueue]);

    // Smart refresh when tab becomes visible
    useEffect(() => {
        let focusTimer: NodeJS.Timeout;
        const handleFocus = async () => {
            if (focusTimer) clearTimeout(focusTimer);
            focusTimer = setTimeout(async () => {
                const now = Date.now();
                const lastSync = localStorage.getItem(MISTAKES_VERSION_KEY + "_time");

                if (lastSync && (now - parseInt(lastSync)) < 43200000) return;

                if (isMounted.current && user) {
                    const hasChanges = await checkForChanges(user.id);
                    if (hasChanges) {
                        fetchMistakes(true);
                    }
                }
            }, 500);
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('online', syncOfflineQueue);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('online', syncOfflineQueue);
            if (focusTimer) clearTimeout(focusTimer);
        };
    }, [user, fetchMistakes, syncOfflineQueue]);

    const vibrateTap = (duration = 40) => {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate(duration);
        }
    };

    const markAsResolved = useCallback((questionId: string) => {
        if (pendingResolves.current.has(questionId)) return;
        pendingResolves.current.set(questionId, true);
        setTimeout(() => pendingResolves.current.delete(questionId), 2000);

        const updated = mistakes.filter((m) => m.questions.id !== questionId);
        setMistakes(updated);
        setMistakeCount(updated.length);
        setCachedMistakes(updated);

        playSound("tap-correct", false);

        const updateMistake = async () => {
            try {
                if (!user || !navigator.onLine) {
                    saveToOfflineQueue(questionId);
                    return;
                }

                const { error } = await supabase
                    .from("user_mistakes")
                    .update({ resolved: true })
                    .eq("user_id", user.id)
                    .eq("question_id", questionId);

                if (error) {
                    saveToOfflineQueue(questionId);
                    const rollback = mistakes.filter((m) => m.questions.id === questionId);
                    if (rollback.length > 0 && isMounted.current) {
                        setMistakes(prev => [...rollback, ...prev]);
                        setMistakeCount(prev => prev + 1);
                        setCachedMistakes([...rollback, ...mistakes]);
                    }
                } else {
                    localStorage.removeItem(MISTAKES_VERSION_KEY);
                }
            } catch (err) {
                saveToOfflineQueue(questionId);
                console.error("Error, queued:", questionId, err);
            }
        };

        updateMistake();
    }, [mistakes, user, saveToOfflineQueue]);

    const getReasonClass = (reason?: string) => {
        switch (reason) {
            case "Misread question":
                return "bg-red-100 dark:bg-red-800 border-red-300 dark:border-red-700";
            case "Concept gap":
                return "bg-blue-100 dark:bg-blue-800 border-blue-300 dark:border-blue-700";
            case "Rushed":
                return "bg-yellow-100 dark:bg-yellow-800 border-yellow-300 dark:border-yellow-700";
            case "Guess":
                return "bg-green-100 dark:bg-green-800 border-green-300 dark:border-green-700";
            default:
                return "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600";
        }
    };

    const handleManualRefresh = async () => {
        await fetchMistakes(true);
    };

    // Show skeleton loader on first load
    if (loading) {
        return <MistakesSkeleton />;
    }

    if (!mistakes.length) {
        return (
            <div className="flex justify-center items-center min-h-[70vh] p-4 md:p-6 bg-transparent">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-full max-w-md"
                >
                    <div className="absolute -inset-1 rounded-xl blur-2xl opacity-30 dark:opacity-40" />
                    <div className="relative bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 border-0 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 p-6 md:p-10 text-center overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent dark:from-emerald-500/5 pointer-events-none" />
                        <div className="flex justify-center mb-4 md:mb-6">
                            <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 border-emerald-200 dark:border-emerald-500/30 px-3 md:px-4 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                                Milestone Achieved
                            </Badge>
                        </div>
                        <div className="relative mb-6 md:mb-8 flex justify-center">
                            <div className="bg-emerald-50 dark:bg-emerald-500/15 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 dark:shadow-emerald-500/10">
                                <Trophy className="w-10 h-10 md:w-12 md:h-12 text-emerald-500 dark:text-emerald-400" />
                            </div>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                                <Sparkles className="w-24 h-24 md:w-28 md:h-28 text-emerald-200 dark:text-emerald-500/30" />
                            </motion.div>
                        </div>
                        <div className="space-y-2 md:space-y-3 mb-8 md:mb-10">
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                Flawless <span className="text-emerald-500 dark:text-emerald-400">Performance</span>
                            </h2>
                            <p className="text-slate-600 dark:text-slate-300 text-xs md:text-sm leading-relaxed font-medium">
                                Extraordinary work! You answered every question with 100% accuracy. Your clinical knowledge is currently peaking.
                            </p>
                        </div>
                        <div className="space-y-3 md:space-y-4">
                            <Button
                                onClick={() => navigate("/Medrae-quizzes")}
                                className="w-full h-12 md:h-14 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-2xl shadow-xl shadow-blue-200/50 dark:shadow-blue-900/30 transition-all group font-bold text-sm md:text-md"
                            >
                                <div className="flex items-center justify-center gap-2 md:gap-3">
                                    <div className="relative">
                                        <Heart className="w-5 h-5 md:w-6 md:h-6 text-white fill-rose-500 stroke-white stroke-[1.5px] transition-transform group-hover:scale-125" />
                                    </div>
                                    Continue My Journey
                                    <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Button>
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                🏆 Streak Active • Keep Practicing
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10">
                            <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-emerald-500 dark:text-emerald-400" />
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 space-y-0 md:space-y-2 pb-4 md:pb-6">
            {/* Header with manual refresh button - NO floating indicators */}
            <div className="mb-0 md:mb-1">
                <div className="relative bg-white/50 dark:bg-muted/30 backdrop-blur-md md:border-0 md:rounded-2xl md:shadow-lg p-4 md:p-6 lg:p-8 text-start overflow-hidden border-b border-slate-100 dark:border-slate-800 md:border-b-0 rounded-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-1.5 md:h-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full blur-xl opacity-50" />
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-xl md:text-xl lg:text-4xl font-bold mb-2 md:mb-3 text-gray-900 dark:text-white relative z-10 flex items-center gap-2 md:gap-3">

                                Hello there! You have <span className="font-bold text-red-600 dark:text-red-400">{mistakeCount}</span> unresolved {mistakeCount === 1 ? "mistake" : "mistakes"}.

                            </h1>


                        </div>


                    </div>
                </div>
                <MistakesCard />
            </div>

            <AnimatePresence>
                {mistakes.map((m, i) => (
                    <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -300, transition: { duration: 0.4, type: "spring", stiffness: 150 } }}
                        layout
                        className="mb-0 md:mb-4"
                    >
                        <Card className="overflow-visible md:border-0 md:shadow-md md:rounded-xl bg-white/40 dark:bg-muted/30 rounded-none border-none shadow-none border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                            <CardHeader className="p-3 md:p-4">
                                <CardTitle className="text-sm md:text-base lg:text-lg">
                                    Q{i + 1}: {m.questions?.question_text ?? "Question unavailable"}
                                </CardTitle>
                                <CardDescription className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 md:gap-1 text-xs md:text-sm">
                                    <span>
                                        Wrong {m.times_wrong} {m.times_wrong === 1 ? "time" : "times"}
                                    </span>
                                    <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                        Last Attempt: {dayjs(m.last_wrong_at).format("DD MMM YYYY, h:mm A")}
                                    </span>
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 text-xs md:text-sm lg:text-base">
                                {["A", "B", "C", "D"].map((letter) => {
                                    const optionText = m.questions?.[`option_${letter.toLowerCase()}` as keyof Question] ?? "—";
                                    const isCorrect = letter === m.questions?.correct_answer;
                                    const isUserChoice = letter === m.user_selected;

                                    return (
                                        <div key={letter} className="flex justify-between items-center py-1.5 md:py-2 flex-wrap gap-1.5 md:gap-2">
                                            <span className={isCorrect ? "font-semibold text-green-700 dark:text-green-400" : isUserChoice ? "font-semibold text-red-700 dark:text-red-400" : ""}>
                                                <strong>{letter}.</strong> {optionText}
                                            </span>
                                            {isUserChoice && !isCorrect && (
                                                <span className="ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-medium bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 rounded-full">
                                                    Your Choice
                                                </span>
                                            )}
                                            {isCorrect && (
                                                <span className="ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-medium bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-200 rounded-full">
                                                    Correct Answer
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}

                                {m.mistake_reason && (
                                    <div className={`mt-1.5 md:mt-2 px-2 md:px-3 py-1.5 md:py-2 rounded-md border text-xs md:text-sm ${getReasonClass(m.mistake_reason)} text-black dark:text-white`}>
                                        <strong>Reason for mistake:</strong> {m.mistake_reason}
                                    </div>
                                )}

                                <p className="leading-relaxed text-xs md:text-sm">
                                    <strong>Explanation:</strong>{" "}
                                    {m.questions?.explanation ?? "No explanation available."}
                                </p>
                                {m.questions?.additional && (
                                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded border-l-4 border-blue-500 text-xs italic">
                                        <strong>Pro Tip:</strong> {m.questions.additional}
                                    </div>
                                )}
                                {m.questions?.topic && (
                                    <div className="mt-2">
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">
                                            Topic: {m.questions.topic}
                                        </span>
                                    </div>
                                )}
                                <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}>
                                    <Button
                                        onClick={() => {
                                            vibrateTap(40);
                                            if (m.questions?.id) {
                                                markAsResolved(m.questions.id);
                                            }
                                        }}
                                        className="w-full sm:w-auto text-xs md:text-sm h-10 md:h-11"
                                    >
                                        Mark as Understood
                                    </Button>
                                </motion.div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>

        </div>
    );
}