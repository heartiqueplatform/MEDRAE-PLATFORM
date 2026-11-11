"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, X, RefreshCw, Calendar, BookOpen, ChevronLeft, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { AnimatePresence, motion } from "framer-motion";
import { CenteredModal } from "@/components/ui/CenteredModal";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

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

interface Countdown {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

/* ------------------------------------------------------------------ */
/*  Hardcoded universal exams                                         */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Cache                                                             */
/* ------------------------------------------------------------------ */

const CUSTOM_EXAMS_CACHE_KEY = "custom_exams_cache_v4";
const HIDDEN_EXAMS_KEY = "hidden_exams_v4";

interface CustomExamsCache {
    plans: CountdownPlan[];
    lastSynced: number;
}

const getCachedCustomExams = (): CustomExamsCache | null => {
    try {
        const cached = localStorage.getItem(CUSTOM_EXAMS_CACHE_KEY);
        if (cached) return JSON.parse(cached);
    } catch { /* silent */ }
    return null;
};

const setCachedCustomExams = (data: CustomExamsCache) => {
    try {
        localStorage.setItem(CUSTOM_EXAMS_CACHE_KEY, JSON.stringify(data));
    } catch { /* silent */ }
};

const getHiddenExams = (): string[] => {
    try {
        const hidden = localStorage.getItem(HIDDEN_EXAMS_KEY);
        return hidden ? JSON.parse(hidden) : [];
    } catch { return []; }
};

const setHiddenExams = (hidden: string[]) => {
    try {
        localStorage.setItem(HIDDEN_EXAMS_KEY, JSON.stringify(hidden));
    } catch { /* silent */ }
};

/* ------------------------------------------------------------------ */
/*  Exam start time parser                                            */
/*                                                                    */
/*  We look at the first paper string and try to pull out a start     */
/*  time like "9am", "9:30 am", "14:00", "2pm". That becomes the     */
/*  countdown target on the exam day. If we can't parse anything,     */
/*  fall back to 00:00 (start of exam day).                           */
/* ------------------------------------------------------------------ */

const parseExamStartTime = (exam: CountdownPlan): Date => {
    // Default: start of exam day, local time
    const base = new Date(exam.exam_date + "T00:00:00");

    const paperText = (exam.papers && exam.papers[0]) || "";
    if (!paperText) return base;

    // Match patterns like "9am", "9:30am", "9 am", "14:00", "2pm", "2:15 pm"
    const match = paperText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!match) return base;

    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3]?.toLowerCase();

    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;

    // Sanity guard
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return base;

    const target = new Date(base);
    target.setHours(hour, minute, 0, 0);
    return target;
};

const calculateCountdown = (exam: CountdownPlan): Countdown => {
    const now = new Date();
    const target = parseExamStartTime(exam);
    const diff = target.getTime() - now.getTime();

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
    };
};

const isExamDay = (exam: CountdownPlan): boolean => {
    const now = new Date();
    const examDay = exam.exam_date; // "YYYY-MM-DD"
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return examDay === today;
};

const isPast = (exam: CountdownPlan): boolean => {
    const now = new Date();
    const target = parseExamStartTime(exam);
    // Give a full day of grace after exam start
    return now.getTime() > target.getTime() + 86400000;
};

const formatDate = (examDate: string): string => {
    const d = new Date(examDate);
    return d.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

/* ------------------------------------------------------------------ */
/*  Countdown display (memoized)                                      */
/* ------------------------------------------------------------------ */

const CountdownDisplay = memo(({
    exam,
    countdown,
    onTap,
}: {
    exam: CountdownPlan | null;
    countdown: Countdown | null;
    onTap: () => void;
}) => {
    if (!exam || !countdown) {
        return (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No upcoming exams
            </div>
        );
    }

    const { days, hours, minutes, seconds } = countdown;
    const inProgress = isExamDay(exam);

    return (
        <button
            onClick={onTap}
            className="w-full text-left active:scale-[0.99] transition-transform"
            style={{ touchAction: "manipulation" }}
        >
            <div className="text-center mb-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 px-1">
                    {exam.exam_name}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate px-1">
                    {exam.exam_type}
                </p>
            </div>

            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 px-1">
                {[
                    { label: "Days", value: days },
                    { label: "Hours", value: hours },
                    { label: "Mins", value: minutes },
                    { label: "Secs", value: seconds },
                ].map((item) => (
                    <div key={item.label} className="text-center min-w-0">
                        <div className="rounded-xl bg-slate-100 dark:bg-white/[0.06] py-2">
                            <span className="font-mono text-xl sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-white block">
                                {String(item.value).padStart(2, "0")}
                            </span>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1 block">
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>

            <div className="text-center mt-3">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {inProgress ? "Exam is in progress — tap for details" : "Tap to view details"}
                </p>
            </div>
        </button>
    );
});
CountdownDisplay.displayName = "CountdownDisplay";

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

export default function CountdownCards() {
    const cachedData = getCachedCustomExams();
    const hiddenFromCache = getHiddenExams();

    const [customPlans, setCustomPlans] = useState<CountdownPlan[]>(
        () => cachedData?.plans || []
    );
    const [universalExams] = useState<CountdownPlan[]>(() => UNIVERSAL_EXAMS);
    const [hiddenExams, setHiddenExams] = useState<string[]>(() => hiddenFromCache);

    const [countdowns, setCountdowns] = useState<Record<string, Countdown>>({});
    const [nextExamId, setNextExamId] = useState<string | null>(null);
    const [selectedExam, setSelectedExam] = useState<CountdownPlan | null>(null);
    const [selectedCountdown, setSelectedCountdown] = useState<Countdown | null>(null);
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

    /* ---- Background sync ---- */
    const syncCustomExams = useCallback(async (force = false) => {
        if (isSyncingRef.current) return;
        if (!navigator.onLine) { setIsOffline(true); return; }

        const hasCache = !!getCachedCustomExams();
        if (!force && hasCache && syncAttempted.current) return;

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

            const { data, error } = await supabase
                .from("countdown_plans")
                .select("*")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .order("exam_date", { ascending: true });

            if (error) {
                isSyncingRef.current = false;
                setIsSyncing(false);
                return;
            }

            const plans = data || [];
            setCachedCustomExams({ plans, lastSynced: Date.now() });
            if (isMounted.current) setCustomPlans(plans);
        } catch { /* silent */ }
        finally {
            if (isMounted.current) {
                isSyncingRef.current = false;
                setIsSyncing(false);
            }
        }
    }, []);

    /* ---- Mount / online-offline ---- */
    useEffect(() => {
        isMounted.current = true;

        const handleOnline = () => {
            setIsOffline(false);
            if (!syncAttempted.current) syncCustomExams(false);
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        const hasCache = !!getCachedCustomExams();
        if (!hasCache && navigator.onLine) {
            const t = setTimeout(() => {
                if (isMounted.current) {
                    syncCustomExams(false);
                    syncAttempted.current = true;
                }
            }, 500);
            return () => {
                isMounted.current = false;
                clearTimeout(t);
                if (timerInterval.current) clearInterval(timerInterval.current);
                window.removeEventListener("online", handleOnline);
                window.removeEventListener("offline", handleOffline);
            };
        }
        syncAttempted.current = true;

        return () => {
            isMounted.current = false;
            if (timerInterval.current) clearInterval(timerInterval.current);
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [syncCustomExams]);

    /* ---- Add plan ---- */
    const addPlan = useCallback(async () => {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) { alert("Please login to add exams"); return; }
        if (!examName || !examType || !examDate) { alert("Please fill all required fields"); return; }

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

        const updated = [...customPlans, newExam];
        setCustomPlans(updated);
        setAddingExam(true);
        setCachedCustomExams({ plans: updated, lastSynced: Date.now() });

        setExamName("");
        setExamType("");
        setExamDate("");
        setPapers("");
        setShowForm(false);

        try {
            const { data, error } = await supabase
                .from("countdown_plans")
                .insert([newExam])
                .select();

            setAddingExam(false);

            if (error) {
                const rolledBack = customPlans.filter((e) => e.id !== newExam.id);
                setCustomPlans(rolledBack);
                setCachedCustomExams({ plans: rolledBack, lastSynced: Date.now() });
            } else if (data && data[0]) {
                const finalPlans = updated.map((e) => (e.id === newExam.id ? data[0] : e));
                setCustomPlans(finalPlans);
                setCachedCustomExams({ plans: finalPlans, lastSynced: Date.now() });
            }
        } catch {
            const rolledBack = customPlans.filter((e) => e.id !== newExam.id);
            setCustomPlans(rolledBack);
            setCachedCustomExams({ plans: rolledBack, lastSynced: Date.now() });
            setAddingExam(false);
        }
    }, [examName, examType, examDate, papers, customPlans]);

    /* ---- Delete plan ---- */
    const deleteExam = useCallback(async (examId: string) => {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        const previous = [...customPlans];
        const updated = customPlans.filter((e) => e.id !== examId);
        setCustomPlans(updated);
        setDeletingExamId(examId);
        setCachedCustomExams({ plans: updated, lastSynced: Date.now() });

        if (selectedExam?.id === examId) {
            setSelectedExam(null);
            setIsOverlayOpen(false);
        }

        try {
            const { error } = await supabase
                .from("countdown_plans")
                .delete()
                .eq("id", examId)
                .eq("user_id", user.id);

            if (error) {
                setCustomPlans(previous);
                setCachedCustomExams({ plans: previous, lastSynced: Date.now() });
            }
        } catch {
            setCustomPlans(previous);
            setCachedCustomExams({ plans: previous, lastSynced: Date.now() });
        } finally {
            setDeletingExamId(null);
        }
    }, [customPlans, selectedExam]);

    /* ---- Hide / reset hidden ---- */
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
        syncAttempted.current = false;
        syncCustomExams(true);
    }, [syncCustomExams]);

    /* ---- Overlay open/close ---- */
    const openOverlay = useCallback((exam: CountdownPlan) => {
        setSelectedExam(exam);
        const c = countdowns[exam.id];
        if (c) setSelectedCountdown(c);
        setIsOverlayOpen(true);
    }, [countdowns]);

    const closeOverlay = useCallback(() => {
        setIsOverlayOpen(false);
        setTimeout(() => {
            setSelectedExam(null);
            setSelectedCountdown(null);
        }, 250);
    }, []);

    /* ---- Derived lists ---- */
    const allExams = useMemo(
        () => [...universalExams, ...customPlans].filter((e) => !hiddenExams.includes(e.id)),
        [universalExams, customPlans, hiddenExams]
    );

    const visibleExams = useMemo(
        () => allExams.filter((e) => !isPast(e) && !hiddenExams.includes(e.id)),
        [allExams, hiddenExams]
    );

    const currentExam = useMemo(() => {
        if (visibleExams.length === 0) return null;
        return visibleExams.find((e) => e.id === nextExamId) || visibleExams[0];
    }, [visibleExams, nextExamId]);

    const currentCountdown = useMemo(
        () => (currentExam ? countdowns[currentExam.id] || null : null),
        [currentExam, countdowns]
    );

    /* ---- Tick every second ---- */
    useEffect(() => {
        if (allExams.length === 0) return;

        const updateCountdowns = () => {
            const updated: Record<string, Countdown> = {};
            let closestDiff = Infinity;
            let upcomingId: string | null = null;

            allExams.forEach((exam) => {
                const c = calculateCountdown(exam);
                updated[exam.id] = c;

                if (!isPast(exam)) {
                    const totalSeconds =
                        c.days * 86400 + c.hours * 3600 + c.minutes * 60 + c.seconds;
                    if (totalSeconds < closestDiff) {
                        closestDiff = totalSeconds;
                        upcomingId = exam.id;
                    }
                }
            });

            setCountdowns(updated);
            setNextExamId(upcomingId);

            if (isOverlayOpen && selectedExam) {
                const c = updated[selectedExam.id];
                if (c) setSelectedCountdown(c);
            }
        };

        updateCountdowns();
        timerInterval.current = setInterval(updateCountdowns, 1000);
        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, [allExams, isOverlayOpen, selectedExam]);

    /* ---- Add exam form ---- */
    const AddExamForm = useCallback(() => (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
        >
            <div className="space-y-3 mt-4 rounded-2xl bg-slate-50 dark:bg-[#0d1117] p-3">
                <Field label="Exam Name *">
                    <input
                        type="text"
                        placeholder="e.g., Clinical Nursing"
                        className="w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium text-slate-900 dark:text-white outline-none"
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                    />
                </Field>
                <Field label="Category *">
                    <input
                        type="text"
                        placeholder="e.g., Final Exam"
                        className="w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium text-slate-900 dark:text-white outline-none"
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                    />
                </Field>
                <Field label="Exam Date *">
                    <input
                        type="date"
                        className="w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium text-slate-900 dark:text-white outline-none"
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                    />
                </Field>
                <Field label="Papers (comma separated)">
                    <input
                        type="text"
                        placeholder="Paper one, Time 9am-to-11 am"
                        className="w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium text-slate-900 dark:text-white outline-none"
                        value={papers}
                        onChange={(e) => setPapers(e.target.value)}
                    />
                </Field>
                <button
                    onClick={addPlan}
                    disabled={addingExam}
                    className="w-full h-10 rounded-xl bg-blue-600 text-white text-[13px] font-bold
                               flex items-center justify-center gap-1.5
                               active:scale-[0.97] transition-transform disabled:opacity-60"
                    style={{ touchAction: "manipulation" }}
                >
                    {addingExam ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {addingExam ? "Creating..." : "Create Exam"}
                </button>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug">
                    Tip: add the paper start time in the papers field (e.g. "Time 9am-to-11 am"). The
                    countdown will target that exact start time on exam day.
                </p>
            </div>
        </motion.div>
    ), [examName, examType, examDate, papers, addingExam, addPlan]);

    /* ---- Empty state ---- */
    if (customPlans.length === 0 && universalExams.length === 0 && visibleExams.length === 0) {
        return (
            <div className="w-full rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isOffline ? "You're Offline" : "No Exams Scheduled"}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {isOffline
                        ? "Connect to the internet to sync your exams"
                        : "Add your first exam countdown"}
                </p>
                {!isOffline && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="mt-4 h-10 px-4 rounded-xl bg-blue-600 text-white text-[12px] font-bold
                                   inline-flex items-center gap-1.5
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Create Exam
                    </button>
                )}
                {isOffline && (
                    <button
                        onClick={manualRefresh}
                        className="mt-4 h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06]
                                   text-slate-700 dark:text-slate-200 text-[12px] font-bold
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Retry
                    </button>
                )}
                <AnimatePresence>{showForm && <AddExamForm />}</AnimatePresence>
            </div>
        );
    }

    /* ---- Main ---- */
    return (
        <>
            <div className="w-full rounded-2xl bg-white dark:bg-[#161b22] p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Days remaining to exams
                        </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {visibleExams.length > 1 && (
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                {visibleExams.length} exams
                            </span>
                        )}
                        <button
                            onClick={() => setShowForm(!showForm)}
                            title="Add Exam"
                            className="h-9 w-9 rounded-full flex items-center justify-center
                                       bg-slate-100 dark:bg-white/[0.06]
                                       active:bg-slate-200 dark:active:bg-white/[0.12]
                                       transition-colors"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Plus
                                className={`h-4 w-4 text-slate-600 dark:text-slate-300 transition-transform duration-300 ${showForm ? "rotate-45" : ""
                                    }`}
                            />
                        </button>
                        {hiddenExams.length > 0 && (
                            <button
                                onClick={resetHidden}
                                title="Show hidden exams"
                                className="h-9 w-9 rounded-full flex items-center justify-center
                                           bg-slate-100 dark:bg-white/[0.06]
                                           active:bg-slate-200 dark:active:bg-white/[0.12]
                                           transition-colors"
                                style={{ touchAction: "manipulation" }}
                            >
                                <RefreshCw className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                            </button>
                        )}
                        {isSyncing && (
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse ml-1" />
                        )}
                    </div>
                </div>

                {/* Countdown */}
                <CountdownDisplay
                    exam={currentExam}
                    countdown={currentCountdown}
                    onTap={() => currentExam && openOverlay(currentExam)}
                />

                {/* Timeline */}
                {visibleExams.length > 1 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                            {visibleExams.map((exam) => {
                                const isCurrent = exam.id === currentExam?.id;
                                return (
                                    <button
                                        key={exam.id}
                                        onClick={() => openOverlay(exam)}
                                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-full
                                                    text-[10px] font-bold
                                                    whitespace-nowrap max-w-[120px]
                                                    active:scale-[0.97] transition-transform
                                                    ${isCurrent
                                                ? "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400"
                                                : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"
                                            }`}
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <span className="truncate block max-w-[90px]">
                                            {exam.exam_name}
                                        </span>
                                        {countdowns[exam.id] && (
                                            <span className="text-[9px] font-bold opacity-70 tabular-nums">
                                                {countdowns[exam.id].days}d
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Add form */}
                <AnimatePresence>{showForm && <AddExamForm />}</AnimatePresence>
            </div>

            {/* Overlay — CenteredModal */}
            {selectedExam && (
                <CenteredModal
                    open={isOverlayOpen}
                    onClose={closeOverlay}
                    title={selectedExam.exam_name}
                    maxWidthClass="max-w-md"
                    maxHeight="85vh"
                >
                    <OverlayContent
                        exam={selectedExam}
                        countdown={selectedCountdown || countdowns[selectedExam.id]}
                        onPermanentHide={() => permanentlyHideExam(selectedExam.id)}
                        onDelete={() => deleteExam(selectedExam.id)}
                        highlightNext={selectedExam.id === nextExamId}
                        isDeleting={deletingExamId === selectedExam.id}
                        closeOverlay={closeOverlay}
                    />
                </CenteredModal>
            )}
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Field helper                                                      */
/* ------------------------------------------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                {label}
            </label>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Overlay content — sits inside CenteredModal                       */
/* ------------------------------------------------------------------ */

function OverlayContent({
    exam,
    countdown,
    onPermanentHide,
    onDelete,
    highlightNext,
    isDeleting,
    closeOverlay,
}: {
    exam: CountdownPlan;
    countdown?: Countdown;
    onPermanentHide: () => void;
    onDelete: () => void;
    highlightNext: boolean;
    isDeleting: boolean;
    closeOverlay: () => void;
}) {
    const inProgress = isExamDay(exam);
    const target = parseExamStartTime(exam);
    const targetLabel = target.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });

    return (
        <div className="px-4 pb-4 space-y-4">
            {/* Countdown grid */}
            {inProgress ? (
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-400/10 p-5 text-center">
                    <p className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">
                        In Progress
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Today's the day — best of luck!
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-1.5">
                        {[
                            { label: "Days", value: countdown?.days ?? 0 },
                            { label: "Hours", value: countdown?.hours ?? 0 },
                            { label: "Mins", value: countdown?.minutes ?? 0 },
                            { label: "Secs", value: countdown?.seconds ?? 0 },
                        ].map((item) => (
                            <div key={item.label} className="text-center">
                                <div className="rounded-xl bg-slate-100 dark:bg-white/[0.06] py-2.5">
                                    <span className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white block">
                                        {String(item.value).padStart(2, "0")}
                                    </span>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1 block">
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
                        Counting down to <span className="font-bold text-slate-600 dark:text-slate-300">{targetLabel}</span> on exam day
                    </p>
                </div>
            )}

            {/* Meta */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-2.5 text-[12px] text-slate-600 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{formatDate(exam.exam_date)}</span>
                </div>

                {exam.papers && exam.papers.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Papers & Subjects
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {exam.papers.map((paper, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center rounded-full px-2 py-0.5
                                               text-[10px] font-bold
                                               bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300
                                               break-all"
                                >
                                    {paper}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                    {!exam.user_id && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5
                                         text-[10px] font-bold
                                         bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
                            Official
                        </span>
                    )}
                    {highlightNext && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5
                                         text-[10px] font-bold
                                         bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400">
                            Next Up
                        </span>
                    )}
                    {inProgress && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5
                                         text-[10px] font-bold
                                         bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
                            Today
                        </span>
                    )}
                </div>
            </div>

            {/* Actions — only for user-created exams */}
            {exam.user_id && (
                <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                    <button
                        onClick={() => {
                            onPermanentHide();
                            closeOverlay();
                        }}
                        className="flex-1 h-10 rounded-xl
                                   bg-slate-100 dark:bg-white/[0.06]
                                   text-slate-700 dark:text-slate-200
                                   text-[12px] font-bold
                                   flex items-center justify-center gap-1.5
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <X className="h-3.5 w-3.5" />
                        Hide
                    </button>
                    <button
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="flex-1 h-10 rounded-xl
                                   bg-rose-50 dark:bg-rose-400/10
                                   text-rose-700 dark:text-rose-400
                                   text-[12px] font-bold
                                   flex items-center justify-center gap-1.5
                                   active:scale-[0.97] transition-transform
                                   disabled:opacity-60"
                        style={{ touchAction: "manipulation" }}
                    >
                        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            )}
        </div>
    );
}