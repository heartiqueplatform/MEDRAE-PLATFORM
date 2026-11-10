import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Brain,
    CheckCircle2,
    Clock,
    Target,
    Trophy,
    BarChart3,
    BookOpen,
    Sparkles,
    Loader2,
    ChevronRight,
    ChevronLeft,
    AlertCircle,
    Wifi,
    WifiOff,
    RefreshCw,
    TrendingDown,
    Check,
    X,
    SkipForward,
    XCircle,
} from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";
import { academicProgress } from "@/lib/academicProgress";
import { playSound } from "@/lib/soundManager";
import React from "react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" = "light") => {
    playSound("ui-tap");
    vibrate(type === "success" ? [20, 30, 20] : 15);
};

const withTimeout = <T,>(promise: Promise<T>, ms = 12000): Promise<T> => {
    let settled = false;
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error("Network timeout"));
        }, ms);
        promise
            .then((res) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(res);
            })
            .catch((err) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                reject(err);
            });
    });
};

function formatDate(dateString: string) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface ProgressSummary {
    total_questions_attempted: number;
    correct_answers: number;
    incorrect_answers: number;
    skipped_questions: number;
    overall_accuracy: number;
    total_time_spent: number;
    questions_mastered: number;
    questions_needing_review: number;
}

interface RecentAttempt {
    question_id: string;
    question_text: string;
    selected_option: string | null;
    is_correct: boolean;
    attempted_at: string;
    time_taken: number | null;
}

interface WeakArea {
    question_id: string;
    question_text: string;
    accuracy: number;
    attempts_count: number;
    topic_id: string;
}

/* ------------------------------------------------------------------ */
/*  StatCard (4-card row)                                              */
/* ------------------------------------------------------------------ */

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtitle?: string;
    iconColor: string;
}

const StatCard = React.memo(
    ({ icon, label, value, subtitle, iconColor }: StatCardProps) => {
        return (
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
                <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {label}
                        </p>
                        <p className="mt-1 text-lg font-black tabular-nums text-slate-900 dark:text-white leading-none">
                            {value}
                        </p>
                        {subtitle && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <div
                        className={`rounded-lg p-1.5 shrink-0 ml-2 ${iconColor}`}
                    >
                        {icon}
                    </div>
                </div>
            </div>
        );
    }
);
StatCard.displayName = "StatCard";

/* ------------------------------------------------------------------ */
/*  AttemptRow                                                         */
/* ------------------------------------------------------------------ */

interface AttemptRowProps {
    attempt: RecentAttempt;
    onView: (questionId: string) => void;
}

const AttemptRow = React.memo(({ attempt, onView }: AttemptRowProps) => {
    const date = useMemo(
        () => formatDate(attempt.attempted_at),
        [attempt.attempted_at]
    );

    return (
        <button
            onClick={() => onView(attempt.question_id)}
            className="w-full flex items-center justify-between p-3
                       active:bg-slate-50 dark:active:bg-white/[0.03]
                       transition-colors text-left"
            style={{ touchAction: "manipulation" }}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${attempt.is_correct ? "bg-emerald-600" : "bg-rose-600"
                        }`}
                >
                    {attempt.is_correct ? <Check size={12} /> : <X size={12} />}
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-xs text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[400px]">
                        {attempt.question_text || "Question"}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span
                            className={
                                attempt.is_correct
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                            }
                        >
                            {attempt.is_correct ? "Correct" : "Wrong"}
                        </span>
                        <span>·</span>
                        <span>{date}</span>
                        {attempt.time_taken && (
                            <>
                                <span>·</span>
                                <span>{attempt.time_taken}s</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
        </button>
    );
});
AttemptRow.displayName = "AttemptRow";

/* ------------------------------------------------------------------ */
/*  WeakAreaRow                                                        */
/* ------------------------------------------------------------------ */

const WeakAreaRow = React.memo(
    ({ area, index }: { area: WeakArea; index: number }) => {
        const accuracy = useMemo(() => Math.round(area.accuracy), [area.accuracy]);
        return (
            <div className="flex items-center justify-between p-2.5 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold tabular-nums text-slate-400 w-4">
                        {index + 1}
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[200px]">
                            {area.question_text || "Question"}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {area.attempts_count} attempt
                            {area.attempts_count > 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-14 h-1 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-rose-500"
                            style={{ width: `${Math.min(100, accuracy)}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums text-rose-600 dark:text-rose-400 min-w-[32px] text-right">
                        {accuracy}%
                    </span>
                </div>
            </div>
        );
    }
);
WeakAreaRow.displayName = "WeakAreaRow";

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

const ProgressSkeleton = React.memo(() => {
    return (
        <div className="w-full max-w-[880px] mx-auto px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="rounded-2xl bg-white dark:bg-[#161b22] p-3 h-20 animate-pulse"
                    />
                ))}
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 h-32 animate-pulse" />
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 h-40 animate-pulse" />
        </div>
    );
});
ProgressSkeleton.displayName = "ProgressSkeleton";

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ProgressPage() {
    const navigate = useNavigate();
    const session = useSession();
    const user = session?.user;
    const userId = user?.id;

    const [summary, setSummary] = useState<ProgressSummary | null>(null);
    const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
    const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== "undefined" ? navigator.onLine : true
    );
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasLoadedFromCache, setHasLoadedFromCache] = useState(false);

    const isMountedRef = useRef(true);
    const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isLoadingRef = useRef(false);

    const totalAnswered = useMemo(
        () =>
            (summary?.correct_answers || 0) + (summary?.incorrect_answers || 0),
        [summary?.correct_answers, summary?.incorrect_answers]
    );

    const totalQuestions = useMemo(
        () => totalAnswered + (summary?.skipped_questions || 0),
        [totalAnswered, summary?.skipped_questions]
    );

    const needsPractice = useMemo(
        () =>
            totalQuestions -
            (summary?.questions_mastered || 0) -
            (summary?.questions_needing_review || 0),
        [
            totalQuestions,
            summary?.questions_mastered,
            summary?.questions_needing_review,
        ]
    );

    /* ── cache read ── */
    useEffect(() => {
        try {
            const cached = sessionStorage.getItem("progress_page_cache");
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.summary) {
                    setSummary(parsed.summary);
                    setHasLoadedFromCache(true);
                }
                if (parsed.recentAttempts) setRecentAttempts(parsed.recentAttempts);
                if (parsed.weakAreas) setWeakAreas(parsed.weakAreas);
                setIsLoading(false);
            }
        } catch {
            /* silent */
        }
    }, []);

    /* ── cache write ── */
    useEffect(() => {
        if (summary && !isLoading) {
            try {
                sessionStorage.setItem(
                    "progress_page_cache",
                    JSON.stringify({
                        summary,
                        recentAttempts,
                        weakAreas,
                        timestamp: Date.now(),
                    })
                );
            } catch {
                /* silent */
            }
        }
    }, [summary, recentAttempts, weakAreas, isLoading]);

    /* ── online/offline ── */
    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);
        return () => {
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
        };
    }, []);

    /* ── data load ── */
    const loadProgressData = useCallback(
        async (forceRefresh = false) => {
            if (!userId) return;
            if (isLoadingRef.current && !forceRefresh) return;
            isLoadingRef.current = true;

            try {
                if (!hasLoadedFromCache || forceRefresh) setIsLoading(true);
                setError(null);

                const [summaryRes, recentRes, weakRes] = await Promise.allSettled([
                    withTimeout(academicProgress.getProgressSummary(userId), 12000),
                    withTimeout(academicProgress.getRecentAttempts(userId, 15), 12000),
                    withTimeout(academicProgress.getWeakAreas(userId, 5), 12000),
                ]);

                if (!isMountedRef.current) return;

                let anySuccess = false;

                if (summaryRes.status === "fulfilled" && summaryRes.value) {
                    setSummary(summaryRes.value);
                    anySuccess = true;
                }
                if (recentRes.status === "fulfilled" && recentRes.value) {
                    setRecentAttempts(recentRes.value);
                    anySuccess = true;
                }
                if (weakRes.status === "fulfilled" && weakRes.value) {
                    setWeakAreas(weakRes.value);
                    anySuccess = true;
                }

                if (anySuccess) {
                    setHasLoadedFromCache(true);
                    setError(null);
                } else if (!hasLoadedFromCache) {
                    setError("Failed to load progress data. Please try again.");
                }
            } catch (err) {
                console.error("Error loading progress data:", err);
                if (isMountedRef.current && !hasLoadedFromCache) {
                    setError("Failed to load progress data. Please try again.");
                }
            } finally {
                if (isMountedRef.current) {
                    setIsLoading(false);
                    isLoadingRef.current = false;
                }
            }
        },
        [userId, hasLoadedFromCache]
    );

    /* ── refresh ── */
    const handleRefresh = useCallback(async () => {
        tap();
        setRefreshing(true);
        await loadProgressData(true);
        setRefreshing(false);
    }, [loadProgressData]);

    /* ── back ── */
    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/nursing", { replace: true });
        }
    }, [navigate]);

    const formatTime = useCallback((seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }, []);

    /* ── initial load ── */
    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = setTimeout(() => loadProgressData(), 100);

        const refreshInterval = setInterval(() => {
            if (isMountedRef.current && isOnline) loadProgressData(true);
        }, 120000);

        return () => {
            isMountedRef.current = false;
            if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
            clearInterval(refreshInterval);
        };
    }, [userId, loadProgressData, isOnline]);

    /* ── not signed in ── */
    if (!user) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-50 dark:bg-[#0d1117]">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto" />
                    <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Loading your progress…
                    </p>
                </div>
            </div>
        );
    }

    /* ── initial loading ── */
    if (isLoading && !hasLoadedFromCache) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white">
                <header className="shrink-0 h-14 border-b border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-[#0d1117] flex items-center px-2">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    <div className="ml-2 h-5 w-32 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                </header>
                <main className="flex-1 overflow-y-auto no-scrollbar">
                    <ProgressSkeleton />
                </main>
            </div>
        );
    }

    /* ── error, nothing to show ── */
    if (error && !hasLoadedFromCache && !summary) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white">
                <header className="shrink-0 h-14 border-b border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-[#0d1117] flex items-center px-2">
                    <button
                        onClick={handleBack}
                        aria-label="Back"
                        className="h-10 w-10 rounded-full flex items-center justify-center active:bg-slate-100 dark:active:bg-white/5"
                        style={{ touchAction: "manipulation" }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <h1 className="text-base font-bold ml-1">Progress</h1>
                </header>
                <main className="flex-1 overflow-y-auto no-scrollbar">
                    <div className="max-w-[880px] mx-auto px-4 py-10 text-center">
                        <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-rose-100 dark:bg-rose-400/10 flex items-center justify-center">
                            <AlertCircle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
                        </div>
                        <h2 className="text-lg font-bold mb-1">Failed to load</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            {error}
                        </p>
                        <button
                            onClick={handleRefresh}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try again
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    /* ── no summary, but not error (shouldn't happen but safety) ── */
    if (!summary) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
                <main className="flex-1 overflow-y-auto no-scrollbar">
                    <ProgressSkeleton />
                </main>
            </div>
        );
    }

    /* ── MAIN RENDER ── */
    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* ── HEADER ── */}
            <header className="shrink-0 bg-white dark:bg-[#0d1117] border-b border-slate-200/70 dark:border-white/[0.06] z-30">
                <div className="flex items-center gap-2 px-2 h-14">
                    <button
                        onClick={handleBack}
                        aria-label="Back"
                        className="h-10 w-10 rounded-full flex items-center justify-center
                                   active:bg-slate-100 dark:active:bg-white/5 transition-colors"
                        style={{ touchAction: "manipulation" }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">
                            Progress
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            {totalQuestions} question
                            {totalQuestions === 1 ? "" : "s"} attempted
                        </p>
                    </div>

                    <div
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 shrink-0
                                    ${isOnline
                                ? "bg-emerald-100 dark:bg-emerald-400/10"
                                : "bg-amber-100 dark:bg-amber-400/10"
                            }`}
                    >
                        {isOnline ? (
                            <Wifi className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                        ) : (
                            <WifiOff className="h-3 w-3 text-amber-700 dark:text-amber-300" />
                        )}
                        <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${isOnline
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-amber-700 dark:text-amber-300"
                                }`}
                        >
                            {isOnline ? "Live" : "Offline"}
                        </span>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        aria-label="Refresh"
                        className="h-9 w-9 rounded-full flex items-center justify-center
                                   active:bg-slate-100 dark:active:bg-white/5 transition-colors shrink-0
                                   disabled:opacity-50"
                        style={{ touchAction: "manipulation" }}
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""
                                }`}
                        />
                    </button>
                </div>
            </header>

            {/* ── SCROLLABLE BODY ── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto pb-16">
                    {/* Offline / stale banner */}
                    {(!isOnline || error) && summary && (
                        <section className="px-4 pt-3">
                            <div className="flex items-center gap-2
                                            rounded-xl bg-amber-50 dark:bg-amber-400/10
                                            p-2.5
                                            text-[11px] font-semibold
                                            text-amber-800 dark:text-amber-300">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="flex-1 truncate">
                                    {isOnline
                                        ? "Couldn't refresh — showing last saved progress."
                                        : "Offline — showing last saved progress."}
                                </span>
                                <button
                                    onClick={handleRefresh}
                                    className="underline underline-offset-2 whitespace-nowrap"
                                >
                                    Retry
                                </button>
                            </div>
                        </section>
                    )}

                    {/* 4 stat cards */}
                    <section className="px-4 pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <StatCard
                                icon={<Trophy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                                label="Answered"
                                value={totalQuestions}
                                subtitle={`${totalAnswered} attempted`}
                                iconColor="bg-emerald-50 dark:bg-emerald-400/10"
                            />
                            <StatCard
                                icon={<Target className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
                                label="Accuracy"
                                value={`${Math.round(summary?.overall_accuracy || 0)}%`}
                                subtitle={`${summary?.correct_answers || 0} correct`}
                                iconColor="bg-cyan-50 dark:bg-cyan-400/10"
                            />
                            <StatCard
                                icon={<Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                                label="Mastered"
                                value={summary?.questions_mastered || 0}
                                subtitle="80%+ accuracy"
                                iconColor="bg-purple-50 dark:bg-purple-400/10"
                            />
                            <StatCard
                                icon={<Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                                label="Time spent"
                                value={formatTime(summary?.total_time_spent || 0)}
                                iconColor="bg-amber-50 dark:bg-amber-400/10"
                            />
                        </div>
                    </section>

                    {/* Breakdown row — 3 cells */}
                    <section className="px-4 pt-3">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-white dark:bg-[#161b22] p-3 text-center">
                                <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <p className="text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400 leading-none">
                                    {summary?.correct_answers || 0}
                                </p>
                                <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                                    Correct
                                </p>
                            </div>
                            <div className="rounded-xl bg-white dark:bg-[#161b22] p-3 text-center">
                                <XCircle className="mx-auto mb-1 h-4 w-4 text-rose-600 dark:text-rose-400" />
                                <p className="text-lg font-black tabular-nums text-rose-600 dark:text-rose-400 leading-none">
                                    {summary?.incorrect_answers || 0}
                                </p>
                                <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                                    Incorrect
                                </p>
                            </div>
                            <div className="rounded-xl bg-white dark:bg-[#161b22] p-3 text-center">
                                <SkipForward className="mx-auto mb-1 h-4 w-4 text-amber-600 dark:text-amber-400" />
                                <p className="text-lg font-black tabular-nums text-amber-600 dark:text-amber-400 leading-none">
                                    {summary?.skipped_questions || 0}
                                </p>
                                <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                                    Skipped
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Recent activity */}
                    <section className="px-4 pt-6">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-slate-400" />
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Recent activity
                                    </h2>
                                </div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {recentAttempts.length} attempt
                                    {recentAttempts.length === 1 ? "" : "s"}
                                </span>
                            </div>
                            <div className="max-h-[420px] overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-white/[0.04]">
                                {recentAttempts.length === 0 ? (
                                    <div className="px-4 py-8 text-center">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            No questions attempted yet.
                                        </p>
                                        <button
                                            onClick={() => {
                                                tap("success");
                                                navigate("/nursing");
                                            }}
                                            className="mt-3 inline-flex items-center gap-1.5
                                                       rounded-xl bg-emerald-600 text-white
                                                       px-4 py-2 text-xs font-bold
                                                       active:scale-[0.97] transition-transform"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            Start practicing
                                            <ChevronRight className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    recentAttempts.map((attempt, index) => (
                                        <AttemptRow
                                            key={attempt.question_id || index}
                                            attempt={attempt}
                                            onView={(qid) => {
                                                tap();
                                                navigate(`/nursing/quiz/${qid}`);
                                            }}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Weak areas */}
                    <section className="px-4 pt-3">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                            <div className="px-4 pt-4 pb-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingDown className="h-4 w-4 text-rose-500" />
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Areas to improve
                                    </h2>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Questions with low accuracy
                                </p>
                            </div>
                            <div className="px-2 py-2">
                                {weakAreas.length === 0 ? (
                                    <div className="text-center py-6">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            No weak areas
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Keep up the great work 🎉
                                        </p>
                                    </div>
                                ) : (
                                    weakAreas.map((area, index) => (
                                        <WeakAreaRow
                                            key={area.question_id || index}
                                            area={area}
                                            index={index}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Mastery summary */}
                    <section className="px-4 pt-3">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Mastery summary
                                </h2>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-400/10 p-3 text-center">
                                    <p className="text-xl font-black tabular-nums text-emerald-700 dark:text-emerald-300 leading-none">
                                        {summary?.questions_mastered || 0}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mt-1.5">
                                        Mastered
                                    </p>
                                    <p className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70">
                                        80%+
                                    </p>
                                </div>
                                <div className="rounded-xl bg-amber-50 dark:bg-amber-400/10 p-3 text-center">
                                    <p className="text-xl font-black tabular-nums text-amber-700 dark:text-amber-300 leading-none">
                                        {summary?.questions_needing_review || 0}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-300 mt-1.5">
                                        Review
                                    </p>
                                    <p className="text-[9px] text-amber-600/70 dark:text-amber-400/70">
                                        50–79%
                                    </p>
                                </div>
                                <div className="rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3 text-center">
                                    <p className="text-xl font-black tabular-nums text-rose-700 dark:text-rose-300 leading-none">
                                        {needsPractice}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-rose-700 dark:text-rose-300 mt-1.5">
                                        Practice
                                    </p>
                                    <p className="text-[9px] text-rose-600/70 dark:text-rose-400/70">
                                        &lt; 50%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}