// src/pages/assessment/AssessmentHome.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Award, TrendingUp, Clock, BookOpen, Search,
    Star, Sparkles, ArrowRight, Play, RotateCcw,
    MessageSquare, Brain, Shield, Heart
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

export const AssessmentHome: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [assessments, setAssessments] = useState<Assessment[]>(() => {
        return cache.get('assessments') || [];
    });
    const [categories, setCategories] = useState<AssessmentCategory[]>(() => {
        return cache.get('categories') || [];
    });
    const [stats, setStats] = useState<AssessmentStats | null>(() => {
        return cache.get('stats') || null;
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(!cache.get('assessments'));
    const [error, setError] = useState<string | null>(null);

    const isLoadingRef = useRef(false);
    const initialLoadDoneRef = useRef(false);

    console.log('🔵 AssessmentHome rendered');
    console.log('🔵 User:', user);
    console.log('📦 Cache hit:', {
        assessments: !!cache.get('assessments'),
        categories: !!cache.get('categories'),
        stats: !!cache.get('stats')
    });

    const loadHomeData = useCallback(async (forceRefresh = false) => {
        if (isLoadingRef.current) {
            console.log('⏳ Already loading, skipping...');
            return;
        }

        const hasValidAssessments = !cache.isStale('assessments', CACHE_CONFIG.TTL);
        const hasValidCategories = !cache.isStale('categories', CACHE_CONFIG.TTL);
        const hasValidStats = !cache.isStale('stats', CACHE_CONFIG.STATS_TTL);

        if (!forceRefresh && hasValidAssessments && hasValidCategories) {
            console.log('✅ Using cached data (fresh)');

            const cachedAssessments = cache.get('assessments');
            const cachedCategories = cache.get('categories');

            if (cachedAssessments && assessments.length === 0) {
                setAssessments(cachedAssessments);
            }
            if (cachedCategories && categories.length === 0) {
                setCategories(cachedCategories);
            }

            if (user && hasValidStats) {
                const cachedStats = cache.get('stats');
                if (cachedStats && !stats) {
                    setStats(cachedStats);
                }
            }

            setLoading(false);
            initialLoadDoneRef.current = true;
            return;
        }

        if (!cache.get('assessments')) {
            setLoading(true);
        }

        setError(null);
        isLoadingRef.current = true;

        try {
            console.log('🟡 Loading home data...', forceRefresh ? '(force refresh)' : '');

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
                console.log('📦 All data fresh in cache');
                setLoading(false);
                isLoadingRef.current = false;
                return;
            }

            console.log('🔄 Fetching:', fetchTypes.join(', '));
            const results = await Promise.allSettled(fetchPromises);

            let resultIndex = 0;
            for (let i = 0; i < fetchTypes.length; i++) {
                const type = fetchTypes[i];
                const result = results[resultIndex];
                resultIndex++;

                if (result.status === 'fulfilled') {
                    const data = result.value;
                    console.log(`✅ ${type} loaded:`, Array.isArray(data) ? data.length : 'single');

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
                } else {
                    console.error(`❌ Failed to load ${type}:`, result.reason);
                    if (type === 'assessments' && !cache.get('assessments')) {
                        setError(result.reason instanceof Error ? result.reason.message : `Failed to load ${type}`);
                    }
                }
            }

            if (cache.get('assessments')) {
                setLoading(false);
            }

            initialLoadDoneRef.current = true;

        } catch (err) {
            console.error('❌ Error loading home data:', err);

            if (!cache.get('assessments')) {
                setError(err instanceof Error ? err.message : 'Failed to load home data');
            }
        } finally {
            setLoading(!cache.get('assessments') && !initialLoadDoneRef.current);
            isLoadingRef.current = false;
            console.log('🔴 Loading state set to false');
        }
    }, [user, assessments.length, categories.length, stats]);

    // Initial load and refresh on user change
    useEffect(() => {
        console.log('🟢 useEffect triggered - user:', user);
        const cachedAssessments = cache.get('assessments');

        if (cachedAssessments) {
            console.log('📦 Showing cached data immediately');
            setAssessments(cachedAssessments);
            const cachedCats = cache.get('categories');
            if (cachedCats) setCategories(cachedCats);

            const isStale = cache.isStale('assessments', CACHE_CONFIG.TTL);
            if (isStale) {
                console.log('🔄 Cache is stale, refreshing in background...');
                loadHomeData(true);
            } else {
                setLoading(false);
            }
        } else {
            loadHomeData();
        }
    }, [user, loadHomeData]);

    // Prefetch data on page visibility change
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('👁️ Page became visible, checking cache...');
                const isStale = cache.isStale('assessments', CACHE_CONFIG.TTL);
                if (isStale) {
                    console.log('🔄 Cache stale, refreshing in background...');
                    loadHomeData(true);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [loadHomeData]);

    // Prefetch data when user comes back from navigation
    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                console.log('🔄 Page restored from bfcache, checking cache...');
                const isStale = cache.isStale('assessments', CACHE_CONFIG.TTL);
                if (isStale) {
                    console.log('🔄 Cache stale, refreshing in background...');
                    loadHomeData(true);
                }
            }
        };

        window.addEventListener('pageshow', handlePageShow);
        return () => {
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, [loadHomeData]);

    const handleStartAssessment = (assessment: Assessment) => {
        console.log('🚀 Starting assessment:', assessment);
        navigate(`/assessments/${assessment.slug}`);
    };

    const handleSearch = (query: string) => {
        console.log('🔍 Search query:', query);
        setSearchQuery(query);
        if (query.trim()) {
            navigate(`/assessments/search?q=${encodeURIComponent(query)}`);
        }
    };

    const handleViewAll = () => {
        navigate('/assessments');
    };

    const handleBrowseAll = () => {
        navigate('/assessments');
    };

    const handleRetry = () => {
        console.log('🔄 Retrying load...');
        cache.clear();
        setError(null);
        loadHomeData(true);
    };

    // Show loading only on first visit with no cache
    if (loading && !cache.get('assessments')) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-muted/30 w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8">
                <LoadingSkeleton count={3} type="card" />
            </div>
        );
    }

    if (error && !cache.get('assessments')) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-muted/30 w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8">
                <ErrorState message={error} onRetry={handleRetry} />
            </div>
        );
    }

    // Show cached data even if loading (stale-while-revalidate)
    const showLoadingIndicator = loading && cache.get('assessments');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-muted/30 w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
            {/* Background refresh indicator */}
            {showLoadingIndicator && (
                <div className="fixed top-0 right-0 m-4 z-50">
                    <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow-lg animate-pulse">
                        Refreshing...
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-none md:rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-500 dark:via-purple-500 dark:to-indigo-500 p-4 md:p-8 shadow-xl">
                <div className="absolute inset-0 bg-black/10 dark:bg-black/20"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1 md:mb-2">
                            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-yellow-300 animate-pulse" />
                            <span className="text-[10px] md:text-xs font-semibold text-yellow-200 uppercase tracking-wider">
                                Clinical Assessment Suite
                            </span>
                        </div>
                        <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-white mb-1 md:mb-2">
                            Test Your Clinical Knowledge
                        </h1>
                        <p className="text-blue-100 max-w-2xl text-xs md:text-sm lg:text-base">
                            Practice real clinical scenarios with your AI nursing tutor. Get instant feedback and improve your clinical reasoning skills.
                        </p>
                        <div className="flex flex-wrap gap-2 md:gap-3 mt-2 md:mt-4">
                            <div className="flex items-center gap-1 text-blue-100 text-[10px] md:text-xs">
                                <Brain className="w-3 h-3 md:w-4 md:h-4" />
                                <span>Clinical Cases</span>
                            </div>
                            <div className="flex items-center gap-1 text-blue-100 text-[10px] md:text-xs">
                                <MessageSquare className="w-3 h-3 md:w-4 md:h-4" />
                                <span>AI Tutor</span>
                            </div>
                            <div className="flex items-center gap-1 text-blue-100 text-[10px] md:text-xs">
                                <Shield className="w-3 h-3 md:w-4 md:h-4" />
                                <span>Patient Safety</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-white/5 rounded-full blur-3xl -mr-16 md:-mr-32 -mt-16 md:-mt-32"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 md:w-48 md:h-48 bg-white/5 rounded-full blur-3xl -ml-12 md:-ml-24 -mb-12 md:-mb-24"></div>
            </div>

            {/* Stats */}
            {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl p-3 md:p-4 shadow-sm border-0">
                        <div className="flex items-center gap-1.5 md:gap-2 text-gray-500 dark:text-gray-400 text-xs md:text-sm mb-0.5 md:mb-1">
                            <Award className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
                            <span>Completed</span>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stats.completed_count || 0}</div>
                    </div>
                    <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl p-3 md:p-4 shadow-sm border-0">
                        <div className="flex items-center gap-1.5 md:gap-2 text-gray-500 dark:text-gray-400 text-xs md:text-sm mb-0.5 md:mb-1">
                            <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                            <span>Avg Score</span>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{Math.round(stats.average_score || 0)}%</div>
                    </div>
                    <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl p-3 md:p-4 shadow-sm border-0">
                        <div className="flex items-center gap-1.5 md:gap-2 text-gray-500 dark:text-gray-400 text-xs md:text-sm mb-0.5 md:mb-1">
                            <Clock className="w-3 h-3 md:w-4 md:h-4 text-purple-500" />
                            <span>Total Time</span>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                            {Math.round((stats.total_time_spent || 0) / 60)}m
                        </div>
                    </div>
                    <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl p-3 md:p-4 shadow-sm border-0">
                        <div className="flex items-center gap-1.5 md:gap-2 text-gray-500 dark:text-gray-400 text-xs md:text-sm mb-0.5 md:mb-1">
                            <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" />
                            <span>Best Score</span>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{Math.round(stats.best_score || 0)}%</div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 opacity-50">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl p-3 md:p-4 shadow-sm border-0">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                        </div>
                    ))}
                </div>
            )}

            {/* Search */}
            <div>
                <SearchBar
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search assessments by title, category, or difficulty..."
                />
            </div>

            {/* All Assessments - Main Section */}
            {assessments.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-blue-500 dark:text-blue-400" />
                            <h2 className="text-base md:text-xl font-semibold text-gray-900 dark:text-white">
                                Available Assessments
                                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                    ({assessments.length})
                                </span>
                            </h2>
                        </div>
                        <button
                            onClick={handleViewAll}
                            className="text-xs md:text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                            View all →
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
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
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                                View all {assessments.length} assessments →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Categories */}
            {categories.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <h2 className="text-base md:text-xl font-semibold text-gray-900 dark:text-white">Categories</h2>
                        <button
                            onClick={handleViewAll}
                            className="text-xs md:text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
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
                <div className="bg-white/40 dark:bg-muted/30 backdrop-blur-md rounded-xl shadow-sm p-4 md:p-6 border-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Play className="w-4 h-4 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Continue Assessment</h3>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                    You have an ongoing assessment that needs your attention
                                </p>
                            </div>
                        </div>
                        <Link
                            to={`/assessments/history`}
                            className="px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 flex items-center gap-1.5 md:gap-2 font-medium text-xs md:text-sm w-full sm:w-auto justify-center"
                        >
                            <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
                            Continue
                        </Link>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {assessments.length === 0 && categories.length === 0 && !loading && (
                <EmptyState
                    title="No assessments available"
                    description="There are currently no assessments to display. Check back later or create your first assessment."
                    icon={<BookOpen className="w-12 h-12 md:w-16 md:h-16 text-gray-300 dark:text-gray-600" />}
                />
            )}
        </div>
    );
};