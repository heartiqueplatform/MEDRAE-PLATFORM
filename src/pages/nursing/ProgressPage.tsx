// pages/ProgressPage.tsx

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Brain,
    CheckCircle2,
    Clock,
    Target,
    Trophy,
    Award,
    BarChart3,
    BookOpen,
    Sparkles,
    Loader2,
    ChevronRight,
    AlertCircle,
    Wifi,
    WifiOff,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Zap,
    Calendar,
    Check,
    X,
    SkipForward,
    XCircle,
} from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { academicProgress } from "@/lib/academicProgress";
import React from "react";

// =============================================
// TYPES
// =============================================

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

// =============================================
// MEMOIZED STAT CARD COMPONENT
// =============================================

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtitle?: string;
    color: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'indigo';
}

const StatCard = React.memo(({ icon, label, value, subtitle, color }: StatCardProps) => {
    const colorClasses = useMemo(() => ({
        emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
        amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
        rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
        indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300',
    }), []);

    const bgClasses = useMemo(() => ({
        emerald: 'bg-emerald-50 dark:bg-emerald-950/20',
        blue: 'bg-blue-50 dark:bg-blue-950/20',
        purple: 'bg-purple-50 dark:bg-purple-950/20',
        amber: 'bg-amber-50 dark:bg-amber-950/20',
        rose: 'bg-rose-50 dark:bg-rose-950/20',
        indigo: 'bg-indigo-50 dark:bg-indigo-950/20',
    }), []);

    return (
        <div className={`md:rounded-2xl md:border-0 ${bgClasses[color]} p-3 md:p-5 md:shadow-sm backdrop-blur transition md:hover:shadow-md border-b border-slate-100 dark:border-slate-800 md:border-b-0`}>
            <div className="flex items-start justify-between">
                <div className="min-w-0">
                    <p className="text-[9px] md:text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">{label}</p>
                    <p className="mt-0.5 md:mt-1 text-xl md:text-2xl font-black text-slate-900 dark:text-white">{value}</p>
                    {subtitle && (
                        <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
                    )}
                </div>
                <div className={`rounded-lg md:rounded-xl p-2 md:p-2.5 ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
});

StatCard.displayName = 'StatCard';

// =============================================
// MEMOIZED ATTEMPT ROW COMPONENT
// =============================================

interface AttemptRowProps {
    attempt: RecentAttempt;
    index: number;
    onView: (questionId: string) => void;
}

const AttemptRow = React.memo(({ attempt, index, onView }: AttemptRowProps) => {
    const date = useMemo(() => formatDate(attempt.attempted_at), [attempt.attempted_at]);

    const handleClick = useCallback(() => {
        onView(attempt.question_id);
    }, [attempt.question_id, onView]);

    return (
        <div
            className="flex items-center justify-between p-3 md:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer group border-b border-slate-100 dark:border-slate-800"
            onClick={handleClick}
        >
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className={`flex h-8 w-8 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${attempt.is_correct ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {attempt.is_correct ? <Check size={12} className="md:size-14" /> : <X size={12} className="md:size-14" />}
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-xs md:text-sm text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[300px] md:max-w-[400px]">
                        {attempt.question_text || 'Question'}
                    </p>
                    <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-slate-500 dark:text-slate-400">
                        <span className={attempt.is_correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {attempt.is_correct ? 'Correct' : 'Wrong'}
                        </span>
                        <span>•</span>
                        <span>{date}</span>
                        {attempt.time_taken && (
                            <>
                                <span>•</span>
                                <span>{attempt.time_taken}s</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-300 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400 transition shrink-0" />
        </div>
    );
});

AttemptRow.displayName = 'AttemptRow';

// =============================================
// MEMOIZED WEAK AREA ROW COMPONENT
// =============================================

const WeakAreaRow = React.memo(({ area, index }: { area: WeakArea; index: number }) => {
    const accuracy = useMemo(() => Math.round(area.accuracy), [area.accuracy]);

    return (
        <div className="flex items-center justify-between p-2.5 md:p-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition rounded-lg md:rounded-xl">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <span className="text-[10px] md:text-xs font-black text-slate-400 w-4 md:w-5">{index + 1}</span>
                <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[200px] md:max-w-[300px]">
                        {area.question_text || 'Question'}
                    </p>
                    <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400">
                        {area.attempts_count} attempt{area.attempts_count > 1 ? 's' : ''}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <div className="w-16 md:w-20 h-1 md:h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, accuracy)}%` }} />
                </div>
                <span className="text-[10px] md:text-xs font-bold text-rose-600 dark:text-rose-400 min-w-[36px] md:min-w-[40px] text-right">
                    {accuracy}%
                </span>
            </div>
        </div>
    );
});

WeakAreaRow.displayName = 'WeakAreaRow';

// =============================================
// MEMOIZED LOADING SKELETON
// =============================================

const ProgressSkeleton = React.memo(() => {
    return (
        <div className="min-h-screen bg-transparent text-slate-950 dark:text-white">
            <section className="mx-auto flex w-full md:max-w-full md:px-4 lg:px-6 flex-col gap-4 md:gap-6 px-3 md:px-4 py-4 md:py-6 lg:px-8">
                <div className="flex items-center justify-between">
                    <div className="h-8 md:h-10 w-24 md:w-28 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                    <div className="h-8 md:h-10 w-8 md:w-10 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="md:rounded-2xl bg-white/70 p-4 md:p-5 md:shadow-xl backdrop-blur dark:bg-muted/30 animate-pulse border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                            <div className="h-3 md:h-4 w-16 md:w-20 bg-slate-200 dark:bg-slate-700 rounded mb-1.5 md:mb-2" />
                            <div className="h-6 md:h-8 w-12 md:w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                        </div>
                    ))}
                </div>
                <div className="md:rounded-2xl bg-white/70 p-4 md:p-6 md:shadow-xl backdrop-blur dark:bg-muted/30 animate-pulse border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                    <div className="h-5 md:h-6 w-40 md:w-48 bg-slate-200 dark:bg-slate-700 rounded mb-3 md:mb-4" />
                    <div className="space-y-2 md:space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="h-3.5 md:h-4 w-28 md:w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                                <div className="h-3.5 md:h-4 w-14 md:w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
});

ProgressSkeleton.displayName = 'ProgressSkeleton';

// =============================================
// DATE HELPER
// =============================================

function formatDate(dateString: string) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// =============================================
// MAIN PROGRESS PAGE
// =============================================

export default function ProgressPage() {
    const navigate = useNavigate();
    const session = useSession();
    const user = session?.user;
    const userId = user?.id;

    const [summary, setSummary] = useState<ProgressSummary | null>(null);
    const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
    const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasLoadedFromCache, setHasLoadedFromCache] = useState(false);

    const isMountedRef = useRef(true);
    const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isLoadingRef = useRef(false);

    // =============================================
    // MEMOIZED COMPUTED VALUES
    // =============================================

    const totalAnswered = useMemo(() =>
        (summary?.correct_answers || 0) + (summary?.incorrect_answers || 0),
        [summary?.correct_answers, summary?.incorrect_answers]
    );

    const totalQuestions = useMemo(() =>
        totalAnswered + (summary?.skipped_questions || 0),
        [totalAnswered, summary?.skipped_questions]
    );

    const needsPractice = useMemo(() =>
        totalQuestions - (summary?.questions_mastered || 0) - (summary?.questions_needing_review || 0),
        [totalQuestions, summary?.questions_mastered, summary?.questions_needing_review]
    );

    // =============================================
    // CACHE MANAGEMENT
    // =============================================

    // Load cached data on mount
    useEffect(() => {
        try {
            const cached = sessionStorage.getItem('progress_page_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.summary) {
                    setSummary(parsed.summary);
                    setHasLoadedFromCache(true);
                }
                if (parsed.recentAttempts) {
                    setRecentAttempts(parsed.recentAttempts);
                }
                if (parsed.weakAreas) {
                    setWeakAreas(parsed.weakAreas);
                }
                setIsLoading(false);
                console.log('✅ Loaded progress from cache');
            }
        } catch (error) {
            // Silent fail for cache
        }
    }, []);

    // Cache data when it changes
    useEffect(() => {
        if (summary && !isLoading) {
            try {
                sessionStorage.setItem('progress_page_cache', JSON.stringify({
                    summary,
                    recentAttempts,
                    weakAreas,
                    timestamp: Date.now()
                }));
            } catch (error) {
                // Silent fail for cache
            }
        }
    }, [summary, recentAttempts, weakAreas, isLoading]);

    // =============================================
    // NETWORK STATUS
    // =============================================

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // =============================================
    // DATA LOADING
    // =============================================

    const loadProgressData = useCallback(async (forceRefresh = false) => {
        if (!userId) return;

        // Prevent multiple simultaneous loads
        if (isLoadingRef.current && !forceRefresh) return;
        isLoadingRef.current = true;

        try {
            // Only show loading if no cached data or force refresh
            if (!hasLoadedFromCache || forceRefresh) {
                setIsLoading(true);
            }
            setError(null);

            // Load all data in parallel
            const [summaryData, recentData, weakData] = await Promise.all([
                academicProgress.getProgressSummary(userId),
                academicProgress.getRecentAttempts(userId, 15),
                academicProgress.getWeakAreas(userId, 5)
            ]);

            if (isMountedRef.current) {
                // Only update if data changed
                const summaryChanged = JSON.stringify(summaryData) !== JSON.stringify(summary);
                if (summaryChanged || forceRefresh) {
                    setSummary(summaryData);
                }

                const recentChanged = JSON.stringify(recentData) !== JSON.stringify(recentAttempts);
                if (recentChanged || forceRefresh) {
                    setRecentAttempts(recentData);
                }

                const weakChanged = JSON.stringify(weakData) !== JSON.stringify(weakAreas);
                if (weakChanged || forceRefresh) {
                    setWeakAreas(weakData);
                }

                setHasLoadedFromCache(true);
            }
        } catch (err) {
            console.error('Error loading progress data:', err);
            if (isMountedRef.current && !hasLoadedFromCache) {
                setError('Failed to load progress data. Please try again.');
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
                isLoadingRef.current = false;
            }
        }
    }, [userId, hasLoadedFromCache, summary, recentAttempts, weakAreas]);

    // =============================================
    // HANDLERS
    // =============================================

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadProgressData(true);
        setRefreshing(false);
    }, [loadProgressData]);

    const navigateToQuestion = useCallback((questionId: string) => {
        console.log('Navigate to question:', questionId);
        // You can implement navigation to question detail here
    }, []);

    const formatTime = useCallback((seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }, []);

    // =============================================
    // INITIAL LOAD
    // =============================================

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }

        // Debounce initial load
        if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
        }

        loadTimeoutRef.current = setTimeout(() => {
            loadProgressData();
        }, 100);

        // Background refresh every 30 seconds
        const refreshInterval = setInterval(() => {
            if (isMountedRef.current && isOnline) {
                loadProgressData(true);
            }
        }, 30000);

        return () => {
            isMountedRef.current = false;
            if (loadTimeoutRef.current) {
                clearTimeout(loadTimeoutRef.current);
            }
            clearInterval(refreshInterval);
        };
    }, [userId, loadProgressData, isOnline]);

    // =============================================
    // RENDER STATES
    // =============================================

    // User not authenticated
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-emerald-600 mx-auto" />
                    <p className="mt-3 md:mt-4 text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400">Loading your progress...</p>
                </div>
            </div>
        );
    }

    // Show skeleton only during initial load with no cached data
    if (isLoading && !hasLoadedFromCache) {
        return <ProgressSkeleton />;
    }

    // Error state
    if (error && !hasLoadedFromCache) {
        return (
            <div className="min-h-screen bg-transparent text-slate-950 dark:text-white">
                <section className="mx-auto flex w-full md:max-w-full md:px-4 lg:px-6 flex-col gap-4 md:gap-6 px-3 md:px-4 py-4 md:py-6">
                    <div className="md:rounded-2xl md:border-0 bg-white/70 p-6 md:p-8 text-center md:shadow-xl backdrop-blur dark:bg-muted/30">
                        <AlertCircle className="mx-auto h-10 w-10 md:h-12 md:w-12 text-rose-500 mb-3 md:mb-4" />
                        <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-1.5 md:mb-2">Failed to Load Progress</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm">{error}</p>
                        <button onClick={handleRefresh} className="mt-3 md:mt-4 inline-flex items-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl bg-emerald-600 px-5 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700">
                            <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4" /> Try Again
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    // Show cached data even if loading fresh data in background
    if (!summary) {
        return <ProgressSkeleton />;
    }

    // =============================================
    // MAIN RENDER
    // =============================================

    return (
        <div className="min-h-screen bg-transparent text-slate-950 dark:text-white pb-20 md:pb-6">
            <section className="mx-auto flex w-full md:max-w-full md:px-4 lg:px-6 flex-col gap-4 md:gap-6 px-0 md:px-4 py-4 md:py-6 lg:px-8">

                {/* Header Card */}
                <div className="relative overflow-hidden md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-6 md:shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-muted/30 sm:p-8 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                    <div className="absolute right-0 top-0 h-24 md:h-32 w-24 md:w-32 rounded-bl-full bg-emerald-100/80 dark:bg-emerald-400/10" />
                    <div className="absolute bottom-0 left-0 h-20 md:h-24 w-20 md:w-24 rounded-tr-full bg-cyan-100/80 dark:bg-cyan-400/10" />

                    <div className="relative">
                        <div className="flex items-center justify-between flex-wrap gap-3 md:gap-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 md:gap-2 rounded-full border border-slate-200 bg-white/70 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-emerald-300 hover:bg-white hover:text-emerald-700 dark:border-slate-800 dark:bg-muted/30 dark:text-slate-200 dark:hover:border-emerald-500/60 dark:hover:bg-slate-900 dark:hover:text-emerald-300">
                                    <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" /> Back
                                </button>
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="p-1.5 md:p-2 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg md:rounded-xl shadow-lg shadow-emerald-500/20">
                                        <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-white" />
                                    </div>
                                    <h1 className="text-xl md:text-2xl lg:text-3xl font-black tracking-tight">Progress Dashboard</h1>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 md:gap-3">
                                <div className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold ${isOnline ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                    }`}>
                                    {isOnline ? <><Wifi className="h-2.5 w-2.5 md:h-3 md:w-3" /> Online</> : <><WifiOff className="h-2.5 w-2.5 md:h-3 md:w-3" /> Offline</>}
                                </div>
                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="inline-flex items-center gap-1.5 md:gap-2 rounded-full border border-slate-200 bg-white/70 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-emerald-300 hover:bg-white hover:text-emerald-700 dark:border-slate-800 dark:bg-muted/30 dark:text-slate-200 dark:hover:border-emerald-500/60 dark:hover:bg-slate-900 dark:hover:text-emerald-300 disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 md:h-4 md:w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                                </button>
                            </div>
                        </div>
                        <p className="mt-2 md:mt-3 text-xs md:text-sm leading-6 text-slate-600 dark:text-slate-300">
                            Track your nursing exam progress, identify strengths, and focus on areas that need improvement.
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 md:gap-4">
                    <StatCard
                        icon={<Trophy className="h-4 w-4 md:h-5 md:w-5" />}
                        label="Questions Answered"
                        value={totalQuestions}
                        subtitle={`${totalAnswered} attempted`}
                        color="emerald"
                    />
                    <StatCard
                        icon={<Target className="h-4 w-4 md:h-5 md:w-5" />}
                        label="Accuracy"
                        value={`${Math.round(summary?.overall_accuracy || 0)}%`}
                        subtitle={`${summary?.correct_answers || 0} correct`}
                        color="blue"
                    />
                    <StatCard
                        icon={<Brain className="h-4 w-4 md:h-5 md:w-5" />}
                        label="Mastered"
                        value={summary?.questions_mastered || 0}
                        subtitle="80%+ accuracy"
                        color="purple"
                    />
                    <StatCard
                        icon={<Clock className="h-4 w-4 md:h-5 md:w-5" />}
                        label="Time Spent"
                        value={formatTime(summary?.total_time_spent || 0)}
                        color="amber"
                    />
                </div>

                {/* Breakdown Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-4">
                    <div className="md:rounded-2xl md:border-0 bg-white/70 p-3 md:p-5 md:shadow-xl backdrop-blur dark:bg-muted/30 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                        <div>
                            <p className="text-[10px] md:text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Correct</p>
                            <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-300">{summary?.correct_answers || 0}</p>
                        </div>
                        <CheckCircle2 className="h-6 w-6 md:h-8 md:w-8 text-emerald-500" />
                    </div>
                    <div className="md:rounded-2xl md:border-0 bg-white/70 p-3 md:p-5 md:shadow-xl backdrop-blur dark:bg-muted/30 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                        <div>
                            <p className="text-[10px] md:text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Incorrect</p>
                            <p className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-300">{summary?.incorrect_answers || 0}</p>
                        </div>
                        <XCircle className="h-6 w-6 md:h-8 md:w-8 text-rose-500" />
                    </div>
                    <div className="md:rounded-2xl md:border-0 bg-white/70 p-3 md:p-5 md:shadow-xl backdrop-blur dark:bg-muted/30 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] md:text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Skipped</p>
                            <p className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-300">{summary?.skipped_questions || 0}</p>
                        </div>
                        <SkipForward className="h-6 w-6 md:h-8 md:w-8 text-amber-500" />
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 md:gap-6">
                    {/* Recent Attempts */}
                    <div className="lg:col-span-2 md:rounded-2xl md:border-0 bg-white/70 md:shadow-xl backdrop-blur dark:bg-muted/30 overflow-hidden border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                                    <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h2>
                                </div>
                                <span className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{recentAttempts.length} attempts</span>
                            </div>
                        </div>
                        <div className="max-h-[350px] md:max-h-[400px] overflow-y-auto hide-scrollbar">
                            {recentAttempts.length === 0 ? (
                                <div className="p-6 md:p-8 text-center">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">No questions attempted yet. Start practicing to see your progress!</p>
                                    <button onClick={() => navigate('/nursing')} className="mt-3 md:mt-4 inline-flex items-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl bg-emerald-600 px-5 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700">
                                        Start Practicing <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    </button>
                                </div>
                            ) : (
                                recentAttempts.map((attempt, index) => (
                                    <AttemptRow
                                        key={attempt.question_id || index}
                                        attempt={attempt}
                                        index={index}
                                        onView={navigateToQuestion}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Weak Areas */}
                    <div className="md:rounded-2xl md:border-0 bg-white/70 md:shadow-xl backdrop-blur dark:bg-muted/30 overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 md:gap-3">
                                <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-rose-400" />
                                <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">Areas to Improve</h2>
                            </div>
                            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-0.5 md:mt-1">Questions with low accuracy</p>
                        </div>
                        <div className="p-3 md:p-4">
                            {weakAreas.length === 0 ? (
                                <div className="text-center py-6 md:py-8">
                                    <CheckCircle2 className="h-8 w-8 md:h-10 md:w-10 text-emerald-500 mx-auto mb-2 md:mb-3" />
                                    <p className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">No weak areas!</p>
                                    <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-0.5 md:mt-1">Keep up the great work! 🎉</p>
                                </div>
                            ) : (
                                weakAreas.map((area, index) => (
                                    <WeakAreaRow key={area.question_id || index} area={area} index={index} />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Mastery Summary */}
                <div className="md:rounded-2xl md:border-0 bg-white/70 md:shadow-xl backdrop-blur dark:bg-muted/30 p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                    <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                        <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
                        <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">Mastery Summary</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                        <div className="rounded-lg md:rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 text-center">
                            <p className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-300">{summary?.questions_mastered || 0}</p>
                            <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 md:mt-1">Mastered (80%+)</p>
                        </div>
                        <div className="rounded-lg md:rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 text-center">
                            <p className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-300">{summary?.questions_needing_review || 0}</p>
                            <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 md:mt-1">Needs Review (50-79%)</p>
                        </div>
                        <div className="rounded-lg md:rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 text-center">
                            <p className="text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-300">{needsPractice}</p>
                            <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 md:mt-1">Needs Practice (&lt;50%)</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}