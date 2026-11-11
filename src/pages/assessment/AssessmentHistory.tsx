// src/pages/assessment/AssessmentHistory.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Filter, Calendar, Clock, Award, Search, X, ChevronLeft,
} from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { AssessmentAttempt } from '@/types/assessmentTypes';
import { HistoryCard, ErrorState, EmptyState } from '@/components/assessment';
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

const tap = () => {
    try { playSound('ui-tap'); } catch { /* no-op */ }
    vibrate(15);
};

const CACHE_CONFIG = {
    TTL: 5 * 60 * 1000,
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
const getCacheKey = (userId: string) => `history_${userId}`;

export const AssessmentHistory: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [attempts, setAttempts] = useState<AssessmentAttempt[]>(() => {
        if (user) {
            const cached = cache.get(getCacheKey(user.id));
            return cached || [];
        }
        return [];
    });
    const [filtered, setFiltered] = useState<AssessmentAttempt[]>([]);
    const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress' | 'abandoned'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(!cache.get(getCacheKey(user?.id || '')));
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isLoadingRef = useRef(false);
    const initialLoadDoneRef = useRef(false);

    useEffect(() => {
        applyFilters();
    }, [attempts, filter, searchQuery]);

    const applyFilters = () => {
        let result = [...attempts];

        if (filter !== 'all') {
            result = result.filter(a => a.status === filter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(a => {
                const title = a.assessment?.title?.toLowerCase() || '';
                const category = a.assessment?.category?.name?.toLowerCase() || '';
                return title.includes(query) || category.includes(query);
            });
        }

        setFiltered(result);
    };

    const loadHistory = useCallback(async (forceRefresh = false) => {
        if (!user) return;
        if (isLoadingRef.current) return;

        const cacheKey = getCacheKey(user.id);
        const cachedData = cache.get(cacheKey);

        if (!forceRefresh && cachedData && !cache.isStale(cacheKey, CACHE_CONFIG.TTL)) {
            setAttempts(cachedData);
            setLoading(false);
            initialLoadDoneRef.current = true;
            return;
        }

        if (!cachedData) setLoading(true);
        else setRefreshing(true);

        setError(null);
        isLoadingRef.current = true;

        try {
            const data = await assessmentService.getAttempts(user.id);
            setAttempts(data);
            cache.set(cacheKey, data);
            initialLoadDoneRef.current = true;
        } catch (err) {
            console.error('Failed to load history:', err);
            if (!cache.get(cacheKey)) {
                setError(err instanceof Error ? err.message : 'Failed to load history');
            }
        } finally {
            setLoading(!cache.get(cacheKey) && !initialLoadDoneRef.current);
            setRefreshing(false);
            isLoadingRef.current = false;
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            const cacheKey = getCacheKey(user.id);
            const cachedData = cache.get(cacheKey);

            if (cachedData && !cache.isStale(cacheKey, CACHE_CONFIG.TTL)) {
                setAttempts(cachedData);
                setLoading(false);
                initialLoadDoneRef.current = true;
            } else {
                loadHistory(true);
            }
        }
    }, [user, loadHistory]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && user) {
                const cacheKey = getCacheKey(user.id);
                if (cache.isStale(cacheKey, CACHE_CONFIG.TTL)) loadHistory(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [user, loadHistory]);

    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted && user) {
                const cacheKey = getCacheKey(user.id);
                if (cache.isStale(cacheKey, CACHE_CONFIG.TTL)) loadHistory(true);
            }
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, [user, loadHistory]);

    const handleViewReport = (attempt: AssessmentAttempt) => {
        tap();
        if (attempt.assessment?.slug) {
            navigate(`/assessments/${attempt.assessment.slug}/results/${attempt.id}`);
        }
    };

    const handleResume = (attempt: AssessmentAttempt) => {
        tap();
        if (attempt.assessment?.slug) {
            navigate(`/assessments/${attempt.assessment.slug}`);
        }
    };

    const handleRetake = (attempt: AssessmentAttempt) => {
        tap();
        if (attempt.assessment?.slug) {
            navigate(`/assessments/${attempt.assessment.slug}`);
        }
    };

    const handleBack = () => {
        tap();
        navigate('/assessments');
    };

    const clearSearch = () => {
        tap();
        setSearchQuery('');
    };

    const handleFilterChange = (value: string) => {
        tap();
        setFilter(value as any);
    };

    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(a => a.status === 'completed').length;
    const inProgressAttempts = attempts.filter(a => a.status === 'in_progress').length;

    const completedScores = attempts.filter(a => a.status === 'completed' && a.score > 0);
    const averageScore = completedScores.length > 0
        ? completedScores.reduce((sum, a) => sum + a.score, 0) / completedScores.length
        : 0;

    const totalTimeSpent = attempts.reduce((sum, a) => sum + a.time_spent_seconds, 0);
    const totalMinutes = Math.round(totalTimeSpent / 60);

    /* ─── Loading skeleton ─────────────────────────────────────────── */
    if (loading && !cache.get(getCacheKey(user?.id || ''))) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                   bg-white dark:bg-[#0d1117]
                                   border-b border-slate-200/70 dark:border-white/[0.06]
                                   safe-top">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="h-4 w-40 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                        <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    </div>
                    <div className="h-8 w-24 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-3 pb-24 safe-bottom">
                    <div className="w-full max-w-[880px] mx-auto space-y-3">
                        <div className="h-10 rounded-xl bg-white dark:bg-[#161b22] animate-pulse" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="rounded-2xl bg-white dark:bg-[#161b22] p-3 animate-pulse">
                                    <div className="h-3 w-1/2 bg-slate-200 dark:bg-white/[0.1] rounded mb-2" />
                                    <div className="h-5 w-1/3 bg-slate-200 dark:bg-white/[0.1] rounded" />
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden animate-pulse"
                                >
                                    <div className="h-36 bg-slate-200 dark:bg-white/[0.1] shrink-0" />
                                    <div className="p-3 space-y-2">
                                        <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-white/[0.1] rounded" />
                                        <div className="h-3 w-1/2 bg-slate-200 dark:bg-white/[0.1] rounded" />
                                        <div className="flex gap-1.5 pt-1">
                                            <div className="h-5 w-14 bg-slate-200 dark:bg-white/[0.1] rounded-lg" />
                                            <div className="h-5 w-16 bg-slate-200 dark:bg-white/[0.1] rounded-lg" />
                                        </div>
                                        <div className="h-8 w-full bg-slate-200 dark:bg-white/[0.1] rounded-xl mt-2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const showRefreshIndicator = refreshing && cache.get(getCacheKey(user?.id || ''));

    /* ─── Error ────────────────────────────────────────────────────── */
    if (error && !cache.get(getCacheKey(user?.id || ''))) {
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
                            History
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Something went wrong
                        </p>
                    </div>
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-6 safe-bottom">
                    <div className="w-full max-w-[880px] mx-auto">
                        <ErrorState
                            message={error}
                            onRetry={() => {
                                tap();
                                cache.clear();
                                loadHistory(true);
                            }}
                        />
                    </div>
                </main>
            </div>
        );
    }

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
                        History
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {totalAttempts} {totalAttempts === 1 ? 'attempt' : 'attempts'}
                    </p>
                </div>
                <div className="relative shrink-0">
                    <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3
                                       text-slate-500 dark:text-slate-400 pointer-events-none" />
                    <select
                        value={filter}
                        onChange={(e) => handleFilterChange(e.target.value)}
                        aria-label="Filter attempts"
                        className="h-9 pl-7 pr-7 rounded-full
                                   bg-slate-100 dark:bg-white/[0.06]
                                   text-[11px] font-bold uppercase tracking-wider
                                   text-slate-700 dark:text-slate-200
                                   border-0 outline-none appearance-none
                                   focus:ring-2 focus:ring-blue-500/40
                                   transition-shadow cursor-pointer"
                        style={{ touchAction: 'manipulation' }}
                    >
                        <option value="all">All</option>
                        <option value="completed">Completed</option>
                        <option value="in_progress">In progress</option>
                        <option value="abandoned">Abandoned</option>
                    </select>
                </div>
            </header>

            {/* ── REFRESHING PILL ─────────────────────────────────── */}
            {showRefreshIndicator && (
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

                    {/* Search */}
                    <section>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
                                               text-slate-400 dark:text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by title or category…"
                                className="w-full h-10 pl-9 pr-9 rounded-xl text-sm
                                           bg-white dark:bg-[#161b22]
                                           border-0 outline-none
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-blue-500/40
                                           transition-shadow"
                            />
                            {searchQuery && (
                                <button
                                    onClick={clearSearch}
                                    aria-label="Clear search"
                                    className="absolute right-2 top-1/2 -translate-y-1/2
                                               h-6 w-6 rounded-full flex items-center justify-center
                                               text-slate-400 dark:text-slate-500
                                               active:bg-slate-100 dark:active:bg-white/5
                                               transition-colors"
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </section>

                    {/* Stats summary */}
                    {totalAttempts > 0 && (
                        <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <StatTile icon={Award} label="Completed" value={String(completedAttempts)} />
                            <StatTile icon={Clock} label="In progress" value={String(inProgressAttempts)} />
                            <StatTile
                                icon={Award}
                                label="Avg score"
                                value={completedAttempts > 0 ? `${Math.round(averageScore)}%` : '—'}
                            />
                            <StatTile
                                icon={Clock}
                                label="Total time"
                                value={totalMinutes > 0 ? `${totalMinutes}m` : '—'}
                            />
                        </section>
                    )}

                    {/* Content */}
                    {filtered.length === 0 ? (
                        <section>
                            <EmptyState
                                title={searchQuery ? 'No matching assessments' : 'No assessments found'}
                                description={
                                    searchQuery
                                        ? `No assessments match "${searchQuery}". Try a different search term.`
                                        : filter !== 'all'
                                            ? `You don't have any ${filter} assessments.`
                                            : "You haven't taken any assessments yet. Start your first assessment today!"
                                }
                                icon={<Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600" />}
                                action={
                                    searchQuery ? {
                                        label: 'Clear search',
                                        onClick: clearSearch
                                    } : filter !== 'all' ? {
                                        label: 'View all assessments',
                                        onClick: () => setFilter('all')
                                    } : {
                                        label: 'Browse assessments',
                                        onClick: () => { tap(); navigate('/assessments'); }
                                    }
                                }
                            />
                        </section>
                    ) : (
                        <section>
                            <div className="text-[11px] font-bold uppercase tracking-wider
                                            text-slate-500 dark:text-slate-400 mb-2">
                                Showing {filtered.length} of {attempts.length}
                                {searchQuery && ` matching "${searchQuery}"`}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                {filtered.map((attempt) => (
                                    <HistoryCard
                                        key={attempt.id}
                                        attempt={attempt}
                                        onViewReport={attempt.status === 'completed' ? handleViewReport : undefined}
                                        onResume={attempt.status === 'in_progress' ? handleResume : undefined}
                                        onRetake={attempt.status === 'completed' ? handleRetake : undefined}
                                    />
                                ))}
                            </div>
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