// src/pages/assessment/AssessmentHome.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Award, TrendingUp, Clock, BookOpen, Search,
    Star, Sparkles, ArrowRight, Play, RotateCcw,
    MessageSquare, Brain, Shield,
    BarChart3
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

    const handleStartAssessment = (assessment: Assessment) => {
        // Prefer the DB-provided url, fall back to internal slug route
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

    const handleViewAll = () => navigate('/assessments');
    const handleBrowseAll = () => navigate('/assessments');

    const handleRetry = () => {
        cache.clear();
        setError(null);
        loadHomeData(true);
    };
    if (loading && !cache.get('assessments')) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-transparent w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
                {/* Hero skeleton */}
                <div className="px-4 md:px-0">
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl px-4 py-5 shadow-sm animate-pulse">
                        <div className="h-6 w-40 bg-gray-100 dark:bg-[#21262d] rounded-full mb-3" />
                        <div className="h-6 w-72 bg-gray-200 dark:bg-[#30363d] rounded mb-2" />
                        <div className="h-4 w-full max-w-xl bg-gray-100 dark:bg-[#30363d] rounded mb-1.5" />
                        <div className="h-4 w-2/3 bg-gray-100 dark:bg-[#30363d] rounded mb-4" />
                        <div className="flex flex-wrap gap-2">
                            <div className="h-7 w-28 bg-gray-100 dark:bg-[#21262d] rounded-xl" />
                            <div className="h-7 w-24 bg-gray-100 dark:bg-[#21262d] rounded-xl" />
                            <div className="h-7 w-32 bg-gray-100 dark:bg-[#21262d] rounded-xl" />
                        </div>
                    </div>
                </div>

                {/* Stats skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white dark:bg-[#161b22] rounded-2xl p-4 shadow-sm animate-pulse">
                            <div className="h-3 bg-gray-100 dark:bg-[#21262d] rounded w-1/2 mb-2" />
                            <div className="h-5 bg-gray-200 dark:bg-[#30363d] rounded w-1/3" />
                        </div>
                    ))}
                </div>

                {/* Search skeleton */}
                <div className="px-4 md:px-0">
                    <div className="h-12 w-full bg-white dark:bg-[#161b22] rounded-2xl shadow-sm animate-pulse" />
                </div>

                {/* Card grid skeleton */}
                <div className="px-4 md:px-0">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="h-5 w-48 bg-gray-200 dark:bg-[#30363d] rounded animate-pulse" />
                        <div className="h-4 w-16 bg-gray-100 dark:bg-[#30363d] rounded animate-pulse" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <LoadingSkeleton key={i} count={1} type="card" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    if (error && !cache.get('assessments')) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8">
                <ErrorState message={error} onRetry={handleRetry} />
            </div>
        );
    }

    const showLoadingIndicator = loading && cache.get('assessments');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-transparent w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8 space-y-4 md:space-y-6">

            {showLoadingIndicator && (
                <div className="fixed top-0 right-0 m-4 z-50">
                    <div className="bg-gray-800 dark:bg-[#21262d] text-white text-xs px-3 py-1 rounded-full shadow-lg animate-pulse">
                        Refreshing…
                    </div>
                </div>
            )}
            {/* Floating History Button — story-style */}
            <button
                onClick={() => navigate('/assessments/history')}
                className="fixed bottom-6 right-6 z-40 group flex items-center gap-2 bg-gray-800 dark:bg-[#21262d] hover:bg-gray-900 dark:hover:bg-[#30363d] text-white rounded-full pl-3 pr-4 py-2.5 shadow-lg transition-all active:scale-[0.96]"
                aria-label="Assessment history"
            >
                <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                    <BarChart3 className="w-4 h-4" />
                </span>
                <span className="text-sm font-semibold hidden sm:inline">History</span>
            </button>
            {/* Hero — muted, uniform, no gradients */}
            <div className="px-4 md:px-0">
                <div className="bg-white dark:bg-[#161b22] rounded-2xl px-4 py-5 shadow-sm">
                    <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-[#21262d] px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        <Sparkles className="h-3.5 w-3.5" />
                        Clinical Assessment Suite
                    </div>

                    <h1 className="font-bold text-gray-800 dark:text-gray-200 text-lg md:text-2xl">
                        Test your clinical knowledge
                    </h1>
                    <p className="text-base text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed max-w-2xl">
                        Practice real clinical scenarios with your AI nursing tutor. Get instant feedback and improve your clinical reasoning skills.
                    </p>

                    <div className="flex flex-wrap gap-2 mt-4">
                        <div className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-[#21262d] rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                            <Brain className="w-3.5 h-3.5" />
                            Clinical Cases
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-[#21262d] rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                            <MessageSquare className="w-3.5 h-3.5" />
                            AI Tutor
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-[#21262d] rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                            <Shield className="w-3.5 h-3.5" />
                            Patient Safety
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0">
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                            <Award className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                            <span>Completed</span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">
                            {stats.completed_count || 0}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                            <TrendingUp className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                            <span>Avg score</span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">
                            {Math.round(stats.average_score || 0)}%
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                            <Clock className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                            <span>Total time</span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">
                            {Math.round((stats.total_time_spent || 0) / 60)}m
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                            <Star className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                            <span>Best score</span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">
                            {Math.round(stats.best_score || 0)}%
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0 opacity-50">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white dark:bg-[#161b22] rounded-2xl p-4 shadow-sm">
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                        </div>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="px-4 md:px-0">
                <SearchBar
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search assessments by title, category, or difficulty…"
                />
            </div>

            {/* All Assessments */}
            {assessments.length > 0 && (
                <div className="px-4 md:px-0">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-gray-500 dark:text-gray-400" />
                            <h2 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200">
                                Available assessments
                                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                    ({assessments.length})
                                </span>
                            </h2>
                        </div>
                        <button
                            onClick={handleViewAll}
                            className="text-xs md:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                        >
                            View all →
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-5">
                        {assessments.slice(0, 8).map((assessment) => (
                            <AssessmentCard
                                key={assessment.id}
                                assessment={assessment}
                                onStart={handleStartAssessment}
                            />
                        ))}
                    </div>
                    {assessments.length > 8 && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={handleViewAll}
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                            >
                                View all {assessments.length} assessments →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Categories */}
            {categories.length > 0 && (
                <div className="px-4 md:px-0">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <h2 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200">
                            Categories
                        </h2>
                        <button
                            onClick={handleViewAll}
                            className="text-xs md:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                        >
                            View all →
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
                        {categories.map((category) => (
                            <CategoryCard
                                key={category.id}
                                category={category}
                                assessmentCount={category.assessment_count || 0}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Continue Assessment */}
            {stats?.recent_attempts?.some(a => a.status === 'in_progress') && (
                <div className="px-4 md:px-0">
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 md:p-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-[#21262d] rounded-xl">
                                    <Play className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm md:text-base">
                                        Continue assessment
                                    </h3>
                                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                        You have an ongoing assessment that needs your attention
                                    </p>
                                </div>
                            </div>
                            <Link
                                to="/assessments/history"
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-white rounded-xl transition-all flex items-center gap-2 font-medium text-xs md:text-sm w-full sm:w-auto justify-center"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Continue
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {assessments.length === 0 && categories.length === 0 && !loading && (
                <div className="px-4 md:px-0">
                    <EmptyState
                        title="No assessments available"
                        description="There are currently no assessments to display. Check back later or create your first assessment."
                        icon={<BookOpen className="w-12 h-12 md:w-16 md:h-16 text-gray-300 dark:text-gray-600" />}
                    />
                </div>
            )}
        </div>
    );
};