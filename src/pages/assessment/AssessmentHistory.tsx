// src/pages/assessment/AssessmentHistory.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Calendar, ArrowLeft, Clock, Award, Search, X } from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { AssessmentAttempt } from '@/types/assessmentTypes';
import { HistoryCard, ErrorState, EmptyState } from '@/components/assessment';
import { useAuth } from '@/context/AuthProvider';

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
        if (attempt.assessment?.slug) {
            navigate(`/assessments/${attempt.assessment.slug}/results/${attempt.id}`);
        }
    };

    const handleResume = (attempt: AssessmentAttempt) => {
        if (attempt.assessment?.slug) {
            navigate(`/assessments/${attempt.assessment.slug}`);
        }
    };

    const handleRetake = (attempt: AssessmentAttempt) => {
        if (attempt.assessment?.slug) {
            navigate(`/assessments/${attempt.assessment.slug}`);
        }
    };

    const handleBack = () => navigate('/assessments');
    const clearSearch = () => setSearchQuery('');

    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(a => a.status === 'completed').length;
    const inProgressAttempts = attempts.filter(a => a.status === 'in_progress').length;

    const completedScores = attempts.filter(a => a.status === 'completed' && a.score > 0);
    const averageScore = completedScores.length > 0
        ? completedScores.reduce((sum, a) => sum + a.score, 0) / completedScores.length
        : 0;

    const totalTimeSpent = attempts.reduce((sum, a) => sum + a.time_spent_seconds, 0);
    const totalMinutes = Math.round(totalTimeSpent / 60);

    // ─── Loading skeleton — mirrors real page structure exactly ───
    if (loading && !cache.get(getCacheKey(user?.id || ''))) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8 space-y-4 md:space-y-6">

                {/* Header skeleton */}
                <div className="px-4 md:px-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 animate-pulse">
                            <div className="h-8 w-8 bg-gray-100 dark:bg-[#21262d] rounded-xl" />
                            <div>
                                <div className="h-6 w-48 bg-gray-200 dark:bg-[#21262d] rounded mb-1.5" />
                                <div className="h-3 w-28 bg-gray-100 dark:bg-[#21262d] rounded" />
                            </div>
                        </div>
                        <div className="h-9 w-32 bg-gray-200 dark:bg-[#21262d] rounded-xl animate-pulse" />
                    </div>
                </div>

                {/* Search skeleton */}
                <div className="px-4 md:px-0">
                    <div className="h-12 w-full bg-white dark:bg-[#161b22] rounded-2xl shadow-sm animate-pulse" />
                </div>

                {/* Stats skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white dark:bg-[#161b22] rounded-2xl p-4 shadow-sm animate-pulse">
                            <div className="h-3 w-1/2 bg-gray-100 dark:bg-[#21262d] rounded mb-2" />
                            <div className="h-5 w-1/3 bg-gray-200 dark:bg-[#30363d] rounded" />
                        </div>
                    ))}
                </div>

                {/* Cards grid skeleton — same grid + same card shape (with image) */}
                <div className="px-4 md:px-0 space-y-3 md:space-y-4">
                    <div className="h-4 w-56 bg-gray-100 dark:bg-[#21262d] rounded animate-pulse" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-[#161b22] rounded-2xl shadow-sm overflow-hidden flex flex-col h-full animate-pulse"
                            >
                                {/* Cover image — exact same height as real HistoryCard */}
                                <div className="h-40 md:h-44 bg-gray-200 dark:bg-[#21262d] shrink-0" />

                                <div className="p-4 flex flex-col flex-1">
                                    {/* Title + status pill */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3.5 w-full bg-gray-200 dark:bg-[#30363d] rounded" />
                                            <div className="h-3.5 w-2/3 bg-gray-200 dark:bg-[#30363d] rounded" />
                                        </div>
                                        <div className="h-4 w-14 bg-gray-100 dark:bg-[#30363d] rounded-full shrink-0" />
                                    </div>

                                    {/* Date row */}
                                    <div className="mt-2">
                                        <div className="h-3 w-32 bg-gray-100 dark:bg-[#30363d] rounded" />
                                    </div>

                                    {/* Stats pills */}
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        <div className="h-5 w-12 bg-gray-50 dark:bg-[#30363d] rounded-lg" />
                                        <div className="h-5 w-16 bg-gray-50 dark:bg-[#30363d] rounded-lg" />
                                        <div className="h-5 w-20 bg-gray-50 dark:bg-[#30363d] rounded-lg" />
                                    </div>

                                    {/* Actions row */}
                                    <div className="flex items-center gap-2 mt-auto pt-3">
                                        <div className="flex-1 h-8 bg-gray-100 dark:bg-[#30363d] rounded-xl" />
                                        <div className="h-8 w-10 bg-gray-50 dark:bg-[#30363d] rounded-xl" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const showRefreshIndicator = refreshing && cache.get(getCacheKey(user?.id || ''));

    if (error && !cache.get(getCacheKey(user?.id || ''))) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] w-full max-w-full mx-auto px-4 md:px-4 lg:px-6 py-4 md:py-8">
                <ErrorState
                    message={error}
                    onRetry={() => {
                        cache.clear();
                        loadHistory(true);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8 space-y-4 md:space-y-6">

            {showRefreshIndicator && (
                <div className="fixed top-0 right-0 m-4 z-50">
                    <div className="bg-gray-800 dark:bg-[#21262d] text-white text-xs px-3 py-1 rounded-full animate-pulse">
                        Refreshing…
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="px-4 md:px-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBack}
                            className="h-8 w-8 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] text-gray-600 dark:text-gray-400 flex items-center justify-center -ml-1 transition-colors"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg md:text-2xl font-bold text-gray-800 dark:text-gray-200">
                                Assessment history
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {totalAttempts} total {totalAttempts === 1 ? 'attempt' : 'attempts'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                            className="text-sm bg-white dark:bg-[#161b22] text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#30363d] w-full sm:w-auto transition-all"
                        >
                            <option value="all">All</option>
                            <option value="completed">Completed</option>
                            <option value="in_progress">In progress</option>
                            <option value="abandoned">Abandoned</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="px-4 md:px-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by assessment title or category…"
                        className="w-full pl-10 pr-10 py-3 border-0 bg-white dark:bg-[#161b22] text-gray-800 dark:text-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#30363d] shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Stats summary */}
            {totalAttempts > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0">
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                            <Award className="w-3.5 h-3.5" />
                            <span>Completed</span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                            {completedAttempts}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>In progress</span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                            {inProgressAttempts}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                            <Award className="w-3.5 h-3.5" />
                            <span>Avg score</span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                            {completedAttempts > 0 ? Math.round(averageScore) + '%' : '—'}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Total time</span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                            {totalMinutes > 0 ? `${totalMinutes}m` : '—'}
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            {filtered.length === 0 ? (
                <div className="px-4 md:px-0">
                    <EmptyState
                        title={searchQuery ? 'No matching assessments' : 'No assessments found'}
                        description={
                            searchQuery
                                ? `No assessments match "${searchQuery}". Try a different search term.`
                                : filter !== 'all'
                                    ? `You don't have any ${filter} assessments.`
                                    : "You haven't taken any assessments yet. Start your first assessment today!"
                        }
                        icon={<Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600" />}
                        action={
                            searchQuery ? {
                                label: 'Clear search',
                                onClick: clearSearch
                            } : filter !== 'all' ? {
                                label: 'View all assessments',
                                onClick: () => setFilter('all')
                            } : {
                                label: 'Browse assessments',
                                onClick: () => navigate('/assessments')
                            }
                        }
                    />
                </div>
            ) : (
                <div className="px-4 md:px-0 space-y-3 md:space-y-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {filtered.length} of {attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
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
                </div>
            )}
        </div>
    );
};