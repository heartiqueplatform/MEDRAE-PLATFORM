// src/pages/assessment/AssessmentHome.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Award, TrendingUp, Clock, BookOpen,
    Star, Play, RotateCcw,
    MessageSquare, Brain, Shield,
    BarChart3, ChevronLeft,
} from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { Assessment, AssessmentCategory, AssessmentStats } from '@/types/assessmentTypes';
import {
    AssessmentCard,
    CategoryCard,
    SearchBar,
    LoadingSkeleton,
    EmptyState,
    ErrorState
} from '@/components/assessment';
import { useAuth } from '@/context/AuthProvider';
import { playSound } from '@/lib/soundManager';

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: 'light' | 'success' = 'light') => {
    try { playSound('ui-tap'); } catch { /* no-op */ }
    if (type === 'success') vibrate([15, 30, 15]);
    else vibrate(15);
};

// Cache configuration
const CACHE_CONFIG = {
    TTL: 5 * 60 * 1000,
    STATS_TTL: 2 * 60 * 1000,
    STALE_WHILE_REVALIDATE: true,
};

class DataCache {
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    set(key: string, data: any) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }
    get(key: string) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        return entry.data;
    }
    getAge(key: string): number {
        const entry = this.cache.get(key);
        if (!entry) return Infinity;
        return Date.now() - entry.timestamp;
    }
    isStale(key: string, ttl: number): boolean {
        return this.getAge(key) > ttl;
    }
    clear() {
        this.cache.clear();
    }
}

const cache = new DataCache();

export const AssessmentHome: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [assessments, setAssessments] = useState<Assessment[]>(() => cache.get('assessments') || []);
    const [categories, setCategories] = useState<AssessmentCategory[]>(() => cache.get('categories') || []);
    const [stats, setStats] = useState<AssessmentStats | null>(() => cache.get('stats') || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(!cache.get('assessments'));
    const [error, setError] = useState<string | null>(null);

    const isLoadingRef = useRef(false);
    const initialLoadDoneRef = useRef(false);

    const loadHomeData = useCallback(async (forceRefresh = false) => {
        if (isLoadingRef.current) return;

        const hasValidAssessments = !cache.isStale('assessments', CACHE_CONFIG.TTL);
        const hasValidCategories = !cache.isStale('categories', CACHE_CONFIG.TTL);
        const hasValidStats = !cache.isStale('stats', CACHE_CONFIG.STATS_TTL);

        if (!forceRefresh && hasValidAssessments && hasValidCategories) {
            const cachedAssessments = cache.get('assessments');
            const cachedCategories = cache.get('categories');
            if (cachedAssessments && assessments.length === 0) setAssessments(cachedAssessments);
            if (cachedCategories && categories.length === 0) setCategories(cachedCategories);
            if (user && hasValidStats) {
                const cachedStats = cache.get('stats');
                if (cachedStats && !stats) setStats(cachedStats);
            }
            setLoading(false);
            initialLoadDoneRef.current = true;
            return;
        }

        if (!cache.get('assessments')) setLoading(true);
        setError(null);
        isLoadingRef.current = true;

        try {
            const needsAssessments = forceRefresh || cache.isStale('assessments', CACHE_CONFIG.TTL);
            const needsCategories = forceRefresh || cache.isStale('categories', CACHE_CONFIG.TTL);
            const needsStats = user && (forceRefresh || cache.isStale('stats', CACHE_CONFIG.STATS_TTL));

            const fetchPromises: Promise<any>[] = [];
            const fetchTypes: string[] = [];

            if (needsAssessments || !cache.get('assessments')) {
                fetchPromises.push(assessmentService.getAssessments());
                fetchTypes.push('assessments');
            }
            if (needsCategories || !cache.get('categories')) {
                fetchPromises.push(assessmentService.getCategories());
                fetchTypes.push('categories');
            }
            if (needsStats && user) {
                fetchPromises.push(assessmentService.getUserStats(user.id));
                fetchTypes.push('stats');
            }

            if (fetchPromises.length === 0) {
                setLoading(false);
                isLoadingRef.current = false;
                return;
            }

            const results = await Promise.allSettled(fetchPromises);
            let resultIndex = 0;

            for (let i = 0; i < fetchTypes.length; i++) {
                const type = fetchTypes[i];
                const result = results[resultIndex];
                resultIndex++;

                if (result.status === 'fulfilled') {
                    const data = result.value;
                    if (type === 'assessments') {
                        cache.set('assessments', data);
                        setAssessments(data);
                    } else if (type === 'categories') {
                        const slicedData = data.slice(0, 6);
                        cache.set('categories', slicedData);
                        setCategories(slicedData);
                    } else if (type === 'stats') {
                        cache.set('stats', data);
                        setStats(data);
                    }
                } else if (type === 'assessments' && !cache.get('assessments')) {
                    setError(result.reason instanceof Error ? result.reason.message : `Failed to load ${type}`);
                }
            }

            if (cache.get('assessments')) setLoading(false);
            initialLoadDoneRef.current = true;
        } catch (err) {
            if (!cache.get('assessments')) {
                setError(err instanceof Error ? err.message : 'Failed to load home data');
            }
        } finally {
            setLoading(!cache.get('assessments') && !initialLoadDoneRef.current);
            isLoadingRef.current = false;
        }
    }, [user, assessments.length, categories.length, stats]);

    useEffect(() => {
        const cachedAssessments = cache.get('assessments');
        if (cachedAssessments) {
            setAssessments(cachedAssessments);
            const cachedCats = cache.get('categories');
            if (cachedCats) setCategories(cachedCats);
            if (cache.isStale('assessments', CACHE_CONFIG.TTL)) {
                loadHomeData(true);
            } else {
                setLoading(false);
            }
        } else {
            loadHomeData();
        }
    }, [user, loadHomeData]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                if (cache.isStale('assessments', CACHE_CONFIG.TTL)) loadHomeData(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [loadHomeData]);

    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted && cache.isStale('assessments', CACHE_CONFIG.TTL)) {
                loadHomeData(true);
            }
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, [loadHomeData]);


    const handleBack = useCallback(() => {
        playSound("ui-tap");
        if (navigator.vibrate) navigator.vibrate(20);
        navigate("/dashboard/student");
    }, [navigate]);

    const handleStartAssessment = (assessment: Assessment) => {
        tap();
        const target = (assessment as any).url || `/assessments/${assessment.slug}`;
        if (target.startsWith('http://') || target.startsWith('https://')) {
            window.location.href = target;
        } else {
            navigate(target);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim()) navigate(`/assessments/search?q=${encodeURIComponent(query)}`);
    };

    const handleViewAll = () => {
        tap();
        navigate('/assessments');
    };

    const handleHistory = () => {
        tap();
        navigate('/assessments/history');
    };

    const handleRetry = () => {
        tap();
        cache.clear();
        setError(null);
        loadHomeData(true);
    };

    /* ─── Loading skeleton ─────────────────────────────────────────── */
    if (loading && !cache.get('assessments')) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                   bg-white dark:bg-[#0d1117]
                                   border-b border-slate-200/70 dark:border-white/[0.06]
                                   safe-top">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                        <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    </div>
                    <div className="h-9 w-24 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-3 pb-24 safe-bottom">
                    <div className="w-full max-w-[880px] mx-auto space-y-3">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2 animate-pulse">
                            <div className="h-5 w-3/4 bg-slate-200 dark:bg-white/[0.1] rounded" />
                            <div className="h-3.5 w-full bg-slate-200 dark:bg-white/[0.1] rounded" />
                            <div className="h-3.5 w-2/3 bg-slate-200 dark:bg-white/[0.1] rounded" />
                            <div className="flex gap-2 pt-1">
                                <div className="h-7 w-24 bg-slate-200 dark:bg-white/[0.1] rounded-xl" />
                                <div className="h-7 w-20 bg-slate-200 dark:bg-white/[0.1] rounded-xl" />
                                <div className="h-7 w-28 bg-slate-200 dark:bg-white/[0.1] rounded-xl" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="rounded-2xl bg-white dark:bg-[#161b22] p-3 animate-pulse">
                                    <div className="h-3 w-1/2 bg-slate-200 dark:bg-white/[0.1] rounded mb-2" />
                                    <div className="h-5 w-1/3 bg-slate-200 dark:bg-white/[0.1] rounded" />
                                </div>
                            ))}
                        </div>
                        <div className="h-10 rounded-xl bg-white dark:bg-[#161b22] animate-pulse" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <LoadingSkeleton key={i} count={1} type="card" />
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    /* ─── Error ────────────────────────────────────────────────────── */
    if (error && !cache.get('assessments')) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                   bg-white dark:bg-[#0d1117]
                                   border-b border-slate-200/70 dark:border-white/[0.06]
                                   safe-top">
                    <button
                        onClick={handleBack}
                        aria-label="Go back"
                        className="h-10 w-10 rounded-full flex items-center justify-center
                                   text-slate-700 dark:text-slate-200
                                   active:bg-slate-100 dark:active:bg-white/5
                                   transition-colors"
                        style={{ touchAction: 'manipulation' }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                            Assessments
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Something went wrong
                        </p>
                    </div>
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-6 safe-bottom">
                    <div className="w-full max-w-[880px] mx-auto">
                        <ErrorState message={error} onRetry={handleRetry} />
                    </div>
                </main>
            </div>
        );
    }

    const showLoadingIndicator = loading && cache.get('assessments');

    /* ─── Real page ───────────────────────────────────────────────── */
    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: 'transparent' }}
        >
            {/* ── HEADER ──────────────────────────────────────────── */}
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
                    style={{ touchAction: 'manipulation' }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                        Assessments
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {assessments.length > 0
                            ? `${assessments.length} available`
                            : 'Clinical practice'}
                    </p>
                </div>
                <button
                    onClick={handleHistory}
                    className="h-9 px-2.5 rounded-full flex items-center justify-center gap-1 shrink-0
                               bg-slate-100 dark:bg-white/[0.06]
                               active:bg-slate-200 dark:active:bg-white/[0.1]
                               transition-colors"
                    style={{ touchAction: 'manipulation' }}
                >
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-semibold">History</span>
                </button>
            </header>

            {/* ── REFRESHING PILL ─────────────────────────────────── */}
            {showLoadingIndicator && (
                <div className="pointer-events-none absolute top-16 right-4 z-50">
                    <div className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider
                                    bg-slate-900 text-white dark:bg-white/[0.1] animate-pulse">
                        Refreshing…
                    </div>
                </div>
            )}

            {/* ── SCROLLING BODY ──────────────────────────────────── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                <div className="w-full max-w-[880px] mx-auto px-4 py-3 pb-24 safe-bottom space-y-3">

                    {/* Hero */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                        <h2 className="text-base font-bold leading-tight text-slate-900 dark:text-white">
                            Test your clinical knowledge
                        </h2>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            Practice real clinical scenarios with your AI nursing tutor.
                            Get instant feedback and improve your clinical reasoning.
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                             text-[10px] font-bold uppercase tracking-wider
                                             bg-slate-100 text-slate-600
                                             dark:bg-white/[0.06] dark:text-slate-300">
                                <Brain className="h-3 w-3" />
                                Clinical cases
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                             text-[10px] font-bold uppercase tracking-wider
                                             bg-slate-100 text-slate-600
                                             dark:bg-white/[0.06] dark:text-slate-300">
                                <MessageSquare className="h-3 w-3" />
                                AI tutor
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                             text-[10px] font-bold uppercase tracking-wider
                                             bg-slate-100 text-slate-600
                                             dark:bg-white/[0.06] dark:text-slate-300">
                                <Shield className="h-3 w-3" />
                                Patient safety
                            </span>
                        </div>
                    </section>

                    {/* Stats */}
                    {stats ? (
                        <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <StatTile icon={Award} label="Completed" value={String(stats.completed_count || 0)} />
                            <StatTile icon={TrendingUp} label="Avg score" value={`${Math.round(stats.average_score || 0)}%`} />
                            <StatTile icon={Clock} label="Total time" value={`${Math.round((stats.total_time_spent || 0) / 60)}m`} />
                            <StatTile icon={Star} label="Best score" value={`${Math.round(stats.best_score || 0)}%`} />
                        </section>
                    ) : (
                        <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="rounded-2xl bg-white dark:bg-[#161b22] p-3 animate-pulse">
                                    <div className="h-3 w-1/2 bg-slate-200 dark:bg-white/[0.1] rounded mb-2" />
                                    <div className="h-5 w-1/3 bg-slate-200 dark:bg-white/[0.1] rounded" />
                                </div>
                            ))}
                        </section>
                    )}

                    {/* Search */}
                    <section>
                        <SearchBar
                            value={searchQuery}
                            onChange={handleSearch}
                            placeholder="Search assessments by title, category, or difficulty…"
                        />
                    </section>

                    {/* All Assessments */}
                    {assessments.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <BookOpen className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                                    <h3 className="text-[11px] font-bold uppercase tracking-wider
                                                   text-slate-500 dark:text-slate-400 truncate">
                                        Available
                                        <span className="ml-1.5 text-slate-400 dark:text-slate-500 normal-case tracking-normal">
                                            ({assessments.length})
                                        </span>
                                    </h3>
                                </div>
                                <button
                                    onClick={handleViewAll}
                                    className="text-[11px] font-bold uppercase tracking-wider
                                               text-slate-500 dark:text-slate-400
                                               active:text-slate-900 dark:active:text-white
                                               transition-colors shrink-0"
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    View all →
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                                {assessments.slice(0, 8).map((assessment) => (
                                    <AssessmentCard
                                        key={assessment.id}
                                        assessment={assessment}
                                        onStart={handleStartAssessment}
                                    />
                                ))}
                            </div>
                            {assessments.length > 8 && (
                                <div className="mt-3 text-center">
                                    <button
                                        onClick={handleViewAll}
                                        className="text-[11px] font-bold uppercase tracking-wider
                                                   text-slate-500 dark:text-slate-400
                                                   active:text-slate-900 dark:active:text-white
                                                   transition-colors"
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        View all {assessments.length} →
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Categories */}
                    {categories.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[11px] font-bold uppercase tracking-wider
                                               text-slate-500 dark:text-slate-400">
                                    Categories
                                </h3>
                                <button
                                    onClick={handleViewAll}
                                    className="text-[11px] font-bold uppercase tracking-wider
                                               text-slate-500 dark:text-slate-400
                                               active:text-slate-900 dark:active:text-white
                                               transition-colors shrink-0"
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    View all →
                                </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {categories.map((category) => (
                                    <CategoryCard
                                        key={category.id}
                                        category={category}
                                        assessmentCount={category.assessment_count || 0}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Continue Assessment */}
                    {stats?.recent_attempts?.some(a => a.status === 'in_progress') && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="h-9 w-9 rounded-lg
                                                    bg-slate-100 dark:bg-white/[0.06]
                                                    flex items-center justify-center shrink-0">
                                        <Play className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">
                                            Continue assessment
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                            You have an ongoing assessment in progress
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    to="/assessments/history"
                                    onClick={() => tap()}
                                    className="shrink-0 h-9 px-3 rounded-xl
                                               bg-slate-100 dark:bg-white/[0.06]
                                               text-slate-700 dark:text-slate-200
                                               text-[11px] font-bold
                                               flex items-center justify-center gap-1.5
                                               active:scale-[0.97] transition-transform
                                               w-full sm:w-auto"
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Continue
                                </Link>
                            </div>
                        </section>
                    )}

                    {/* Empty State */}
                    {assessments.length === 0 && categories.length === 0 && !loading && (
                        <section>
                            <EmptyState
                                title="No assessments available"
                                description="There are currently no assessments to display. Check back later or create your first assessment."
                                icon={<BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600" />}
                            />
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Subcomponent                                                      */
/* ------------------------------------------------------------------ */

function StatTile({
    icon: Icon,
    label,
    value,
}: {
    icon: any;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider
                            text-slate-500 dark:text-slate-400 mb-1">
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{label}</span>
            </div>
            <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white leading-none">
                {value}
            </div>
        </div>
    );
}