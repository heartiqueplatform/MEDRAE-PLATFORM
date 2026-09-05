"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, X, RefreshCw, Calendar, Clock, BookOpen, ChevronLeft } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
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

// =============================================
// HARDCODED UNIVERSAL EXAMS (Manually maintained)
// =============================================
const UNIVERSAL_EXAMS: CountdownPlan[] = [
    {
        id: "universal_1",
        exam_name: "Kenya Registered Community Health Nurse-Basic",
        exam_type: "Licensing Exam",
        exam_date: "2026-11-12",
        papers: ["Paper one,Time 9am-to-11 am", "Paper Two, Time: 2pm-to-4pm"],
        created_at: new Date().toISOString(),
        is_active: true,
    },
    {
        id: "universal_2",
        exam_name: "Kenya Registered Community Health Nurse-Basic",
        exam_type: "Licensing Exam",
        exam_date: "2027-5-20",
        papers: ["Paper one,Time 9am-to-11 am", "Paper Two, Time: 2pm-to-4pm"],
        created_at: new Date().toISOString(),
        is_active: true,
    },
];

// =============================================
// CACHE HELPERS - FOREVER CACHE (No expiration)
// =============================================
const CUSTOM_EXAMS_CACHE_KEY = "custom_exams_cache_v4";
const HIDDEN_EXAMS_KEY = "hidden_exams_v4";

interface CustomExamsCache {
    plans: CountdownPlan[];
    lastSynced: number;
}

const getCachedCustomExams = (): CustomExamsCache | null => {
    try {
        const cached = localStorage.getItem(CUSTOM_EXAMS_CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (e) { /* silent */ }
    return null;
};

const setCachedCustomExams = (data: CustomExamsCache) => {
    try {
        localStorage.setItem(CUSTOM_EXAMS_CACHE_KEY, JSON.stringify(data));
    } catch (e) { /* silent */ }
};

const getHiddenExams = (): string[] => {
    try {
        const hidden = localStorage.getItem(HIDDEN_EXAMS_KEY);
        return hidden ? JSON.parse(hidden) : [];
    } catch (e) { return []; }
};

const setHiddenExams = (hidden: string[]) => {
    try {
        localStorage.setItem(HIDDEN_EXAMS_KEY, JSON.stringify(hidden));
    } catch (e) { /* silent */ }
};

// =============================================
// MEMOIZED SUB-COMPONENTS
// =============================================

const CountdownDisplay = memo(({
    exam,
    countdown,
    onTap
}: {
    exam: CountdownPlan | null;
    countdown: { days: number; hours: number; minutes: number; seconds: number } | null;
    onTap: () => void;
}) => {
    if (!exam || !countdown) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No upcoming exams
            </div>
        );
    }

    const { days, hours, minutes, seconds } = countdown;

    return (
        <div
            onClick={onTap}
            className="cursor-pointer group w-full max-w-full"
        >
            <div className="text-center mb-2">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-1 truncate px-2">
                    {exam.exam_name}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate px-2">
                    {exam.exam_type}
                </p>
            </div>

            <div className="grid grid-cols-4 gap-1.5 sm:gap-3 max-w-full px-1">
                {[
                    { label: "Days", value: days },
                    { label: "Hours", value: hours },
                    { label: "Minutes", value: minutes },
                    { label: "Seconds", value: seconds }
                ].map((item) => (
                    <div key={item.label} className="text-center group-hover:scale-105 transition-transform min-w-0">
                        <div className="bg-white dark:bg-gray-800 rounded-lg px-1 sm:px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700">
                            <span className="font-mono text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white block">
                                {String(item.value).padStart(2, "0")}
                            </span>
                        </div>
                        <span className="text-[8px] sm:text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>

            <div className="text-center mt-3">
                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                    Tap to view details
                </p>
            </div>
        </div>
    );
});

CountdownDisplay.displayName = 'CountdownDisplay';

// =============================================
// MAIN COMPONENT
// =============================================

export default function CountdownCards() {
    // =============================================
    // INSTANT STATE INITIALIZATION FROM CACHE
    // =============================================
    const cachedData = getCachedCustomExams();
    const hiddenFromCache = getHiddenExams();

    const [customPlans, setCustomPlans] = useState<CountdownPlan[]>(() => {
        return cachedData?.plans || [];
    });

    const [universalExams] = useState<CountdownPlan[]>(() => {
        return UNIVERSAL_EXAMS;
    });

    const [hiddenExams, setHiddenExams] = useState<string[]>(() => {
        return hiddenFromCache;
    });

    const [countdowns, setCountdowns] = useState<{
        [id: string]: { days: number; hours: number; minutes: number; seconds: number };
    }>({});
    const [nextExamId, setNextExamId] = useState<string | null>(null);
    const [selectedExam, setSelectedExam] = useState<CountdownPlan | null>(null);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [addingExam, setAddingExam] = useState(false);
    const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
    const [examName, setExamName] = useState("");
    const [examType, setExamType] = useState("");
    const [examDate, setExamDate] = useState("");
    const [papers, setPapers] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    const isMounted = useRef(true);
    const timerInterval = useRef<NodeJS.Timeout>();
    const isSyncingRef = useRef(false);
    const syncAttempted = useRef(false);

    // =============================================
    // SILENT BACKGROUND SYNC - ONLY ON FIRST VISIT
    // =============================================
    const syncCustomExams = useCallback(async (force = false) => {
        // Skip if already syncing
        if (isSyncingRef.current) return;

        // Skip if offline
        if (!navigator.onLine) {
            setIsOffline(true);
            return;
        }

        // Skip if we already have cache and not forcing
        const hasCache = !!getCachedCustomExams();
        if (!force && hasCache && syncAttempted.current) {
            return;
        }

        isSyncingRef.current = true;
        setIsSyncing(true);

        try {
            const { data: authData } = await supabase.auth.getUser();
            const user = authData?.user;

            if (!user) {
                isSyncingRef.current = false;
                setIsSyncing(false);
                return;
            }

            // Fetch from Supabase
            const { data, error } = await supabase
                .from("countdown_plans")
                .select("*")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .order("exam_date", { ascending: true });

            if (error) {
                console.error("Supabase fetch error:", error);
                isSyncingRef.current = false;
                setIsSyncing(false);
                return;
            }

            const plans = data || [];

            // Update cache
            setCachedCustomExams({
                plans: plans,
                lastSynced: Date.now()
            });

            // Only update state if component is mounted
            if (isMounted.current) {
                setCustomPlans(plans);
            }

            console.log(`✅ Background sync: ${plans.length} custom exams`);
        } catch (error) {
            console.error("Background sync failed:", error);
        } finally {
            if (isMounted.current) {
                isSyncingRef.current = false;
                setIsSyncing(false);
            }
        }
    }, []);

    // =============================================
    // EFFECTS
    // =============================================
    useEffect(() => {
        isMounted.current = true;

        const handleOnline = () => {
            setIsOffline(false);
            // Background refresh when coming online
            if (!syncAttempted.current) {
                syncCustomExams(false);
            }
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // SILENT BACKGROUND SYNC - Only if no cache exists
        const hasCache = !!getCachedCustomExams();
        if (!hasCache && navigator.onLine) {
            // Start background sync without any UI loading
            setTimeout(() => {
                if (isMounted.current) {
                    syncCustomExams(false);
                    syncAttempted.current = true;
                }
            }, 500); // Small delay to let UI render first
        } else {
            syncAttempted.current = true;
        }

        return () => {
            isMounted.current = false;
            if (timerInterval.current) clearInterval(timerInterval.current);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [syncCustomExams]);

    // =============================================
    // EXAM OPERATIONS - INSTANT OPTIMISTIC UPDATES
    // =============================================

    const addPlan = useCallback(async () => {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) {
            alert("Please login to add exams");
            return;
        }

        if (!examName || !examType || !examDate) {
            alert("Please fill all required fields");
            return;
        }

        const newExam: CountdownPlan = {
            id: uuidv4(),
            user_id: user.id,
            exam_name: examName,
            exam_type: examType,
            start_date: new Date().toISOString().split("T")[0],
            exam_date: examDate,
            papers: papers.split(",").map((p) => p.trim()).filter(Boolean),
            is_active: true,
            created_at: new Date().toISOString(),
        };

        // INSTANT OPTIMISTIC UPDATE - UI updates immediately
        const updatedCustomPlans = [...customPlans, newExam];
        setCustomPlans(updatedCustomPlans);
        setAddingExam(true);

        // Update cache immediately
        setCachedCustomExams({
            plans: updatedCustomPlans,
            lastSynced: Date.now()
        });

        // Reset form instantly
        setExamName("");
        setExamType("");
        setExamDate("");
        setPapers("");
        setShowForm(false);

        // BACKGROUND SAVE to Supabase (silent)
        try {
            const { data, error } = await supabase
                .from("countdown_plans")
                .insert([newExam])
                .select();

            setAddingExam(false);

            if (error) {
                console.error("Supabase insert error:", error);
                // Rollback silently
                const rolledBack = customPlans.filter((e) => e.id !== newExam.id);
                setCustomPlans(rolledBack);
                setCachedCustomExams({
                    plans: rolledBack,
                    lastSynced: Date.now()
                });
            } else if (data && data[0]) {
                // Update with server data
                const serverData = data[0];
                const finalPlans = updatedCustomPlans.map(e =>
                    e.id === newExam.id ? serverData : e
                );
                setCustomPlans(finalPlans);
                setCachedCustomExams({
                    plans: finalPlans,
                    lastSynced: Date.now()
                });
                console.log("✅ Exam saved to Supabase");
            }
        } catch (error) {
            console.error("Add exam error:", error);
            // Rollback silently
            const rolledBack = customPlans.filter((e) => e.id !== newExam.id);
            setCustomPlans(rolledBack);
            setCachedCustomExams({
                plans: rolledBack,
                lastSynced: Date.now()
            });
            setAddingExam(false);
        }
    }, [examName, examType, examDate, papers, customPlans]);

    const deleteExam = useCallback(async (examId: string) => {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        // INSTANT OPTIMISTIC DELETE - UI updates immediately
        const previousPlans = [...customPlans];
        const updatedPlans = customPlans.filter((e) => e.id !== examId);
        setCustomPlans(updatedPlans);
        setDeletingExamId(examId);

        // Update cache immediately
        setCachedCustomExams({
            plans: updatedPlans,
            lastSynced: Date.now()
        });

        if (selectedExam?.id === examId) {
            setSelectedExam(null);
            setIsOverlayOpen(false);
        }

        // BACKGROUND DELETE from Supabase (silent)
        try {
            const { error } = await supabase
                .from("countdown_plans")
                .delete()
                .eq("id", examId)
                .eq("user_id", user.id);

            if (error) {
                console.error("Supabase delete error:", error);
                // Rollback silently
                setCustomPlans(previousPlans);
                setCachedCustomExams({
                    plans: previousPlans,
                    lastSynced: Date.now()
                });
            } else {
                console.log("✅ Exam deleted from Supabase");
            }
        } catch (error) {
            console.error("Delete exam error:", error);
            // Rollback silently
            setCustomPlans(previousPlans);
            setCachedCustomExams({
                plans: previousPlans,
                lastSynced: Date.now()
            });
        } finally {
            setDeletingExamId(null);
        }
    }, [customPlans, selectedExam]);

    const permanentlyHideExam = useCallback((examId: string) => {
        const newHidden = [...hiddenExams, examId];
        setHiddenExams(newHidden);
        setHiddenExams(newHidden);

        if (selectedExam?.id === examId) {
            setIsOverlayOpen(false);
            setSelectedExam(null);
        }
    }, [hiddenExams, selectedExam]);

    const resetHidden = useCallback(() => {
        setHiddenExams([]);
        setHiddenExams([]);
    }, []);

    const manualRefresh = useCallback(() => {
        // Force sync from Supabase
        syncAttempted.current = false;
        syncCustomExams(true);
    }, [syncCustomExams]);

    const openOverlay = useCallback((exam: CountdownPlan) => {
        setSelectedExam(exam);
        const countdown = countdowns[exam.id];
        if (countdown) setSelectedCountdown(countdown);
        setIsOverlayOpen(true);
    }, [countdowns]);

    const closeOverlay = useCallback(() => {
        setIsOverlayOpen(false);
        setTimeout(() => {
            setSelectedExam(null);
            setSelectedCountdown(null);
        }, 300);
    }, []);

    // =============================================
    // COMPUTED VALUES - Instant calculations
    // =============================================

    const allExams = useMemo(() =>
        [...universalExams, ...customPlans].filter(e => !hiddenExams.includes(e.id)),
        [universalExams, customPlans, hiddenExams]
    );

    const visibleExams = useMemo(() => {
        const now = new Date();
        return allExams.filter((exam) => {
            const endOfExamDay = new Date(exam.exam_date + "T23:59:59");
            return now <= endOfExamDay && !hiddenExams.includes(exam.id);
        });
    }, [allExams, hiddenExams]);

    const currentExam = useMemo(() => {
        if (visibleExams.length === 0) return null;
        const nextUpcoming = visibleExams.find(exam => exam.id === nextExamId);
        return nextUpcoming || visibleExams[0];
    }, [visibleExams, nextExamId]);

    const currentCountdown = useMemo(() => {
        if (!currentExam) return null;
        return countdowns[currentExam.id] || null;
    }, [currentExam, countdowns]);

    // =============================================
    // COUNTDOWN UPDATE - Smooth 1-second updates
    // =============================================

    useEffect(() => {
        if (allExams.length === 0) return;

        const calculateCountdown = (examDate: string) => {
            const now = new Date();
            const startOfDay = new Date(examDate + "T00:00:00");
            const endOfDay = new Date(examDate + "T23:59:59");

            if (now < startOfDay) {
                const diff = startOfDay.getTime() - now.getTime();
                return {
                    days: Math.floor(diff / 86400000),
                    hours: Math.floor((diff / 3600000) % 24),
                    minutes: Math.floor((diff / 60000) % 60),
                    seconds: Math.floor((diff / 1000) % 60),
                };
            }
            if (now >= startOfDay && now <= endOfDay) {
                const diff = endOfDay.getTime() - now.getTime();
                return {
                    days: 0,
                    hours: Math.floor(diff / 3600000),
                    minutes: Math.floor((diff / 60000) % 60),
                    seconds: Math.floor((diff / 1000) % 60),
                };
            }
            return { days: -1, hours: 0, minutes: 0, seconds: 0 };
        };

        const updateCountdowns = () => {
            const updated: typeof countdowns = {};
            let closestDiff = Infinity;
            let upcomingId: string | null = null;

            allExams.forEach((exam) => {
                const countdown = calculateCountdown(exam.exam_date);
                updated[exam.id] = countdown;

                const totalSeconds = countdown.days * 86400 + countdown.hours * 3600 + countdown.minutes * 60 + countdown.seconds;
                if (totalSeconds > 0 && totalSeconds < closestDiff) {
                    closestDiff = totalSeconds;
                    upcomingId = exam.id;
                }
            });

            setCountdowns(updated);
            setNextExamId(upcomingId);

            if (isOverlayOpen && selectedExam) {
                const selectedCountdownData = updated[selectedExam.id];
                if (selectedCountdownData) setSelectedCountdown(selectedCountdownData);
            }
        };

        updateCountdowns();
        timerInterval.current = setInterval(updateCountdowns, 1000);

        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, [allExams, isOverlayOpen, selectedExam]);

    // =============================================
    // RENDER HELPERS
    // =============================================

    const getExamStatus = useCallback((examId: string, examDate: string) => {
        const countdown = countdowns[examId];
        if (!countdown) return "upcoming";
        const now = new Date();
        const startOfDay = new Date(examDate + "T00:00:00");
        const endOfDay = new Date(examDate + "T23:59:59");
        if (now >= startOfDay && now <= endOfDay) return "in-progress";
        return "upcoming";
    }, [countdowns]);

    const formatDate = useCallback((examDate: string) => {
        const d = new Date(examDate);
        return d.toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }, []);

    // =============================================
    // ADD EXAM FORM COMPONENT
    // =============================================
    const AddExamForm = useCallback(() => (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
        >
            <div className="space-y-3 mt-4 p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 max-w-full">
                <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">
                            Exam Name *
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Clinical Nursing"
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            value={examName}
                            onChange={(e) => setExamName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">
                            Category *
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Final Exam"
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            value={examType}
                            onChange={(e) => setExamType(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">
                            Exam Date *
                        </label>
                        <input
                            type="date"
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            value={examDate}
                            onChange={(e) => setExamDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">
                            Papers (comma separated)
                        </label>
                        <input
                            type="text"
                            placeholder="Paper 1, Paper 2"
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            value={papers}
                            onChange={(e) => setPapers(e.target.value)}
                        />
                    </div>
                </div>
                <button
                    onClick={addPlan}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-lg font-medium text-sm uppercase tracking-wide shadow-md shadow-blue-500/25 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 mt-1"
                    disabled={addingExam}
                >
                    {addingExam ? "Creating..." : "Create Exam"}
                </button>
            </div>
        </motion.div>
    ), [examName, examType, examDate, papers, addingExam, addPlan]);

    // =============================================
    // OVERLAY COMPONENT
    // =============================================
    const [selectedCountdown, setSelectedCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

    const Overlay = useCallback(({
        exam,
        countdown,
        onClose,
        onPermanentHide,
        onDelete,
        highlightNext = false,
        isDeleting = false,
    }: {
        exam: CountdownPlan;
        countdown?: { days: number; hours: number; minutes: number; seconds: number };
        onClose: () => void;
        onPermanentHide: () => void;
        onDelete: () => void;
        highlightNext?: boolean;
        isDeleting?: boolean;
    }) => {
        const status = getExamStatus(exam.id, exam.exam_date);

        return (
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <div
                    className="relative w-full max-w-[95vw] sm:max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={`px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 ${highlightNext ? "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10" : ""}`}>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={onClose}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                                aria-label="Go back"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                            <div className="flex-1 text-center min-w-0">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate px-2">
                                    {exam.exam_name}
                                </h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>

                    <div className="px-3 sm:px-6 py-6 sm:py-8 space-y-6">
                        <div className="space-y-4">
                            {status === "in-progress" ? (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 text-center">
                                    <span className="text-green-700 dark:text-green-400 font-semibold text-xl">
                                        In Progress
                                    </span>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                        Today's the day! Best of luck! 🎯
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                                        {[
                                            { label: "Days", value: countdown?.days ?? 0 },
                                            { label: "Hours", value: countdown?.hours ?? 0 },
                                            { label: "Minutes", value: countdown?.minutes ?? 0 },
                                            { label: "Seconds", value: countdown?.seconds ?? 0 }
                                        ].map((item) => (
                                            <div key={item.label} className="text-center">
                                                <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-1 sm:px-4 py-2 sm:py-3 shadow-sm">
                                                    <span className="font-mono text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                                                        {String(item.value).padStart(2, "0")}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 block">
                                                    {item.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                                        Time remaining until exam day
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{formatDate(exam.exam_date)}</span>
                            </div>

                            {exam.papers && exam.papers.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        <BookOpen className="w-4 h-4 flex-shrink-0" />
                                        <span>Papers & Subjects</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {exam.papers.map((paper, idx) => (
                                            <span key={idx} className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full break-all">
                                                {paper}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-2">
                                {!exam.user_id && (
                                    <span className="px-3 py-1 text-xs font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 rounded-full">
                                        Official
                                    </span>
                                )}
                                {highlightNext && (
                                    <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                                        Next Up
                                    </span>
                                )}
                                {status === "in-progress" && (
                                    <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                                        Today
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {exam.user_id && (
                        <div className="px-3 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-900">
                            <button
                                onClick={onPermanentHide}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95"
                            >
                                <X className="w-4 h-4 flex-shrink-0" />
                                <span>Hide</span>
                            </button>
                            <button
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors active:scale-95 disabled:opacity-50"
                            >
                                <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }, [getExamStatus, formatDate]);

    // =============================================
    // RENDER - INSTANT DISPLAY, NO SKELETON
    // =============================================

    // Empty state - but still instant
    if (customPlans.length === 0 && universalExams.length === 0 && visibleExams.length === 0) {
        return (
            <div className="relative w-full overflow-hidden px-2 py-4 sm:px-4 sm:py-6 rounded-xl sm:rounded-2xl bg-white/90 dark:bg-muted/30 backdrop-blur-xl shadow-xl sm:shadow-2xl border-0">
                <div className="text-center py-8">
                    <div className="text-4xl mb-4">📅</div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                        {isOffline ? "You're Offline" : "No Exams Scheduled"}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {isOffline
                            ? "Connect to the internet to sync your exams"
                            : "Add your first exam countdown!"}
                    </p>
                    {!isOffline && (
                        <>
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Create Exam
                            </button>

                            <AnimatePresence>
                                {showForm && <AddExamForm />}
                            </AnimatePresence>
                        </>
                    )}
                    {isOffline && (
                        <button
                            onClick={manualRefresh}
                            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                        >
                            Retry
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Main content - INSTANT DISPLAY from cache
    return (
        <>
            <div className="relative w-full overflow-hidden px-2 py-4 sm:px-4 sm:py-6 rounded-xl sm:rounded-2xl bg-white/90 dark:bg-muted/30 backdrop-blur-xl shadow-xl sm:shadow-2xl border-0">
                {/* Background effects */}
                <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-blue-500/5 dark:bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16 sm:-mr-32 sm:-mt-32 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-purple-500/5 dark:bg-purple-500/10 blur-3xl rounded-full -ml-16 -mb-16 sm:-ml-32 sm:-mb-32 pointer-events-none" />

                <div className="relative z-10 w-full max-w-full overflow-x-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 px-1">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg flex-shrink-0">
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[8px] uppercase tracking-[2px] font-semibold text-blue-600 dark:text-blue-400">
                                    Countdown
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {visibleExams.length > 1 && (
                                <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                                    {visibleExams.length} exams
                                </span>
                            )}
                            <button
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 relative"
                                onClick={() => setShowForm(!showForm)}
                                title="Add Exam"
                            >
                                <Plus className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${showForm ? 'rotate-45' : ''}`} />
                            </button>
                            {hiddenExams.length > 0 && (
                                <button
                                    onClick={resetHidden}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                                    title="Show hidden exams"
                                >
                                    <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </button>
                            )}
                            {/* Silent sync indicator - very subtle */}
                            {isSyncing && (
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse flex-shrink-0" />
                            )}
                        </div>
                    </div>

                    {/* Main Countdown Display */}
                    <div className="px-1 sm:px-2 overflow-hidden">
                        <CountdownDisplay
                            exam={currentExam}
                            countdown={currentCountdown}
                            onTap={() => currentExam && openOverlay(currentExam)}
                        />
                    </div>

                    {/* Mini timeline */}
                    {visibleExams.length > 1 && (
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="flex gap-1.5 overflow-x-auto overflow-y-hidden pb-2 px-1 custom-scrollbar scrollbar-hide">
                                {visibleExams.map((exam) => {
                                    const isCurrent = exam.id === currentExam?.id;
                                    return (
                                        <button
                                            key={exam.id}
                                            onClick={() => openOverlay(exam)}
                                            className={`flex-shrink-0 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs transition-all whitespace-nowrap max-w-[100px] sm:max-w-[120px] ${isCurrent
                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <span className="truncate block max-w-[70px] sm:max-w-[90px]">{exam.exam_name}</span>
                                            {countdowns[exam.id] && (
                                                <span className="text-[8px] sm:text-[10px] opacity-75">
                                                    {countdowns[exam.id].days}d
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Add Exam Form */}
                    <AnimatePresence>
                        {showForm && <AddExamForm />}
                    </AnimatePresence>
                </div>
            </div>

            {/* Overlay */}
            <AnimatePresence>
                {isOverlayOpen && selectedExam && (
                    <Overlay
                        exam={selectedExam}
                        countdown={selectedCountdown || countdowns[selectedExam.id]}
                        onClose={closeOverlay}
                        onPermanentHide={() => permanentlyHideExam(selectedExam.id)}
                        onDelete={() => deleteExam(selectedExam.id)}
                        highlightNext={selectedExam.id === nextExamId}
                        isDeleting={deletingExamId === selectedExam.id}
                    />
                )}
            </AnimatePresence>
        </>
    );
}