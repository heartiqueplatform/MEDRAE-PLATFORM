// src/pages/assessment/AssessmentHistory.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Calendar, ArrowLeft, Clock, Award, RefreshCw, Search, X } from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { AssessmentAttempt } from '@/types/assessmentTypes';
import { HistoryCard, LoadingSkeleton, ErrorState, EmptyState } from '@/components/assessment';
import { useAuth } from '@/context/AuthProvider';

// Cache configuration - 5 minutes for history
const CACHE_CONFIG = {
    TTL: 5 * 60 * 1000, // 5 minutes
    STALE_WHILE_REVALIDATE: true,
};

// Simple in-memory cache
class DataCache {
    private cache: Map<string, { data: any; timestamp: number }> = new Map();

    set(key: string, data: any) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
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

// Singleton cache instance
const cache = new DataCache();

// Cache key generator
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

    // Apply filters whenever attempts, filter, or searchQuery changes
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

        // If we have cached data and not forcing refresh, use it
        if (!forceRefresh && cachedData && !cache.isStale(cacheKey, CACHE_CONFIG.TTL)) {
            console.log('✅ Using cached history data');
            setAttempts(cachedData);
            setLoading(false);
            initialLoadDoneRef.current = true;
            return;
        }

        // Set loading state only if we don't have cached data
        if (!cachedData) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        setError(null);
        isLoadingRef.current = true;

        try {
            console.log('🟡 Loading history data...', forceRefresh ? '(force refresh)' : '');
            const data = await assessmentService.getAttempts(user.id);
            console.log('✅ History loaded:', data.length);

            setAttempts(data);
            cache.set(cacheKey, data);
            initialLoadDoneRef.current = true;

        } catch (err) {
            console.error('❌ Failed to load history:', err);
            if (!cache.get(cacheKey)) {
                setError(err instanceof Error ? err.message : 'Failed to load history');
            }
        } finally {
            setLoading(!cache.get(cacheKey) && !initialLoadDoneRef.current);
            setRefreshing(false);
            isLoadingRef.current = false;
        }
    }, [user]);

    // Initial load with cache check
    useEffect(() => {
        if (user) {
            const cacheKey = getCacheKey(user.id);
            const cachedData = cache.get(cacheKey);

            if (cachedData && !cache.isStale(cacheKey, CACHE_CONFIG.TTL)) {
                console.log('📦 Loading history from cache');
                setAttempts(cachedData);
                setLoading(false);
                initialLoadDoneRef.current = true;
            } else {
                console.log('🔄 No cache or stale, loading fresh');
                loadHistory(true);
            }
        }
    }, [user, loadHistory]);

    // Handle visibility change (user comes back to tab)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && user) {
                const cacheKey = getCacheKey(user.id);
                const isStale = cache.isStale(cacheKey, CACHE_CONFIG.TTL);
                if (isStale) {
                    console.log('👁️ Page visible, cache stale, refreshing...');
                    loadHistory(true);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user, loadHistory]);

    // Handle pageshow (user navigates back)
    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted && user) {
                const cacheKey = getCacheKey(user.id);
                const isStale = cache.isStale(cacheKey, CACHE_CONFIG.TTL);
                if (isStale) {
                    console.log('🔄 Page restored from bfcache, refreshing...');
                    loadHistory(true);
                }
            }
        };

        window.addEventListener('pageshow', handlePageShow);
        return () => {
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, [user, loadHistory]);

    const refreshHistory = async () => {
        if (!user) return;
        await loadHistory(true);
    };

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

    const handleBack = () => {
        navigate('/assessments');
    };

    const clearSearch = () => {
        setSearchQuery('');
    };

    // Calculate stats
    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(a => a.status === 'completed').length;
    const inProgressAttempts = attempts.filter(a => a.status === 'in_progress').length;
    const abandonedAttempts = attempts.filter(a => a.status === 'abandoned').length;

    const completedScores = attempts.filter(a => a.status === 'completed' && a.score > 0);
    const averageScore = completedScores.length > 0
        ? completedScores.reduce((sum, a) => sum + a.score, 0) / completedScores.length
        : 0;

    const bestScore = completedScores.length > 0
        ? Math.max(...completedScores.map(a => a.score))
        : 0;

    const totalTimeSpent = attempts.reduce((sum, a) => sum + a.time_spent_seconds, 0);
    const totalMinutes = Math.round(totalTimeSpent / 60);

    // Show skeleton on first load with no cache
    if (loading && !cache.get(getCacheKey(user?.id || ''))) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-muted/30 w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8">
                <LoadingSkeleton count={3} type="card" />
            </div>
        );
    }

    // Background refresh indicator
    const showRefreshIndicator = refreshing && cache.get(getCacheKey(user?.id || ''));

    if (error && !cache.get(getCacheKey(user?.id || ''))) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-muted/30 w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8">
                <ErrorState
                    message={error}
                    onRetry={() => {
                        console.log('🔄 Retrying load...');
                        const cacheKey = getCacheKey(user?.id || '');
                        cache.clear();
                        loadHistory(true);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-muted/30 w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
            {/* Background refresh indicator */}
            {showRefreshIndicator && (
                <div className="fixed top-0 right-0 m-4 z-50">
                    <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow-lg animate-pulse">
                        Refreshing...
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assessment History</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {totalAttempts} total {totalAttempts === 1 ? 'attempt' : 'attempts'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={refreshHistory}
                        disabled={refreshing}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>

                    <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                        <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                            className="text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
                        >
                            <option value="all">All</option>
                            <option value="completed">Completed</option>
                            <option value="in_progress">In Progress</option>
                            <option value="abandoned">Abandoned</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by assessment title or category..."
                        className="w-full pl-10 pr-10 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            {/* Stats Summary - Full width on desktop */}
            {totalAttempts > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl p-3 md:p-4 shadow-sm border-0">
                        <div className="flex items-center gap-1.5 md:gap-2 text-gray-500 dark:text-gray-400 text-xs md:text-sm mb-0.5 md:mb-1">
                            <Award className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
                            <span>Completed</span>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{completedAttempts}</div>
                    </div>
                    <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl p-3 md:p-4 shadow-sm border-0">
                        <div className="flex items-center gap-1.5 md:gap-2 text-gray-500 dark:text-gray-400 text-xs md:text-sm mb-0.5 md:mb-1">
                            <Clock className="w-3 h-3 md:w-4 md:h-4 text-purple-500" />
                            <span>In Progress</span>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{inProgressAttempts}</div>
                    </div>
                    <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl p-3 md:p-4 shadow-sm border-0">
                        <div className="flex items-center gap-1.5 md:gap-2 text-gray-500 dark:text-gray-400 text-xs md:text-sm mb-0.5 md:mb-1">
                            <Award className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                            <span>Avg Score</span>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                            {completedAttempts > 0 ? Math.round(averageScore) + '%' : 'N/A'}
                        </div>
                    </div>
                    <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl p-3 md:p-4 shadow-sm border-0">
                        <div className="flex items-center gap-1.5 md:gap-2 text-gray-500 dark:text-gray-400 text-xs md:text-sm mb-0.5 md:mb-1">
                            <Clock className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />
                            <span>Total Time</span>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                            {totalMinutes > 0 ? `${totalMinutes}m` : 'N/A'}
                        </div>
                    </div>
                </div>
            )}

            {/* Content - Full width grid */}
            {filtered.length === 0 ? (
                <EmptyState
                    title={searchQuery ? "No matching assessments" : "No assessments found"}
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
                            label: 'Clear Search',
                            onClick: clearSearch
                        } : filter !== 'all' ? {
                            label: 'View all assessments',
                            onClick: () => setFilter('all')
                        } : {
                            label: 'Browse Assessments',
                            onClick: () => navigate('/assessments')
                        }
                    }
                />
            ) : (
                <div className="space-y-3 md:space-y-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {filtered.length} of {attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </div>

                    {/* Grid layout for history cards - 2 columns on desktop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
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