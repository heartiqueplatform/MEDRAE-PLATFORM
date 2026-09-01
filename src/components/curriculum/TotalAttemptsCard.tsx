import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
    Users,
    TrendingUp,
    Sparkles,
    Activity,
    Zap,
    BookOpen,
    ClipboardCheck,
    Eye,
    BarChart3,
    Award,
    Clock
} from 'lucide-react';
import { academicProgress } from '@/lib/academicProgress';

// =============================================
// FORMAT NUMBER WITH PSYCHOLOGICAL IMPACT
// =============================================
function formatNumberWithImpact(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

// =============================================
// STATIC COUNTER - NO ANIMATION, INSTANT DISPLAY
// =============================================
const StaticCounter = memo(({ target }: { target: number }) => {
    const displayValue = useMemo(() => formatNumberWithImpact(target), [target]);
    const isLarge = useMemo(() => target >= 1000, [target]);

    return (
        <span className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {displayValue}
            {isLarge && (
                <span className="text-sm md:text-base font-semibold text-slate-400 dark:text-slate-500 ml-0.5">
                    {target >= 1000000 ? 'M' : 'K'}
                </span>
            )}
        </span>
    );
});

StaticCounter.displayName = 'StaticCounter';

// =============================================
// MINI STAT - MEMOIZED
// =============================================
const MiniStat = memo(({ label, value, icon, color }: {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'indigo';
}) => {
    const colorClasses = useMemo(() => ({
        emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
        blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30',
        purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30',
        amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
        rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30',
        indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30',
    }), []);

    const displayValue = useMemo(() => formatNumberWithImpact(value), [value]);

    return (
        <div className="flex items-center gap-1.5">
            <div className={`p-1 rounded ${colorClasses[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500">
                    {label}
                </p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {displayValue}
                </p>
            </div>
        </div>
    );
});

MiniStat.displayName = 'MiniStat';

// =============================================
// MAIN CARD - WITH INSTANT CACHE DISPLAY
// =============================================
export const TotalAttemptsCard = memo(() => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [trend, setTrend] = useState<'up' | 'stable'>('stable');
    const [trendPercentage, setTrendPercentage] = useState<number>(0);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [isVisible, setIsVisible] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const isMountedRef = useRef(true);
    const hasFetchedRef = useRef(false);
    const fetchAttemptedRef = useRef(false);

    // ✅ Load cached stats INSTANTLY with validation
    useEffect(() => {
        try {
            const cached = sessionStorage.getItem('totalAttemptsCard_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                // ✅ Validate cache has valid data
                if (parsed.stats && parsed.stats.totalAttempts > 0) {
                    setStats(parsed.stats);
                    setLastUpdated(parsed.lastUpdated || '');
                    setLoading(false);

                    // ✅ Also load trend data from cache
                    if (parsed.trend) {
                        setTrend(parsed.trend);
                        setTrendPercentage(parsed.trendPercentage || 0);
                    }
                } else {
                    // ✅ Invalid cache - remove it
                    sessionStorage.removeItem('totalAttemptsCard_cache');
                }
            }
        } catch (_error) {
            // Silent fail
        }

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ✅ INTERSECTION OBSERVER - Only fetch when visible
    useEffect(() => {
        if (!cardRef.current) return;

        observerRef.current = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && isMountedRef.current && !hasFetchedRef.current && !fetchAttemptedRef.current) {
                    setIsVisible(true);
                    hasFetchedRef.current = true;
                    fetchAttemptedRef.current = true;
                    fetchStats();
                    observerRef.current?.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        observerRef.current.observe(cardRef.current);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
        };
    }, []);

    // ✅ FETCH STATS - With error handling
    const fetchStats = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            const data = await academicProgress.getSummaryStats();

            if (data && isMountedRef.current) {
                // ✅ Validate data
                if (data.totalAttempts === undefined || data.totalAttempts < 0) {
                    console.warn('Invalid stats data received');
                    setLoading(false);
                    return;
                }

                // Calculate trend from cached data
                const cached = sessionStorage.getItem('totalAttemptsCard_cache');
                let prevTotal = 0;
                let newTrend: 'up' | 'stable' = 'stable';
                let newTrendPercentage = 0;

                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        prevTotal = parsed.stats?.totalAttempts || 0;
                    } catch (_error) { /* silent */ }
                }

                if (prevTotal > 0 && data.totalAttempts > prevTotal) {
                    const diff = data.totalAttempts - prevTotal;
                    const percentage = (diff / prevTotal) * 100;
                    newTrendPercentage = Math.min(percentage, 100);
                    newTrend = 'up';
                }

                setStats(data);
                setTrend(newTrend);
                setTrendPercentage(newTrendPercentage);
                setLastUpdated(new Date(data.lastUpdated || Date.now()).toLocaleTimeString());
                setLoading(false);

                // ✅ Cache stats with validation
                try {
                    sessionStorage.setItem('totalAttemptsCard_cache', JSON.stringify({
                        stats: data,
                        lastUpdated: new Date(data.lastUpdated || Date.now()).toLocaleTimeString(),
                        trend: newTrend,
                        trendPercentage: newTrendPercentage,
                        timestamp: Date.now()
                    }));
                } catch (_error) {
                    // Silent fail
                }
            }
        } catch (_error) {
            if (isMountedRef.current) {
                setLoading(false);
                // ✅ If fetch fails and we have no stats, show empty state
                if (!stats) {
                    setStats({ totalAttempts: 0 });
                }
            }
        }
    }, []);

    // ✅ Refresh when tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && hasFetchedRef.current && isMountedRef.current) {
                // Silently refresh in background
                const refreshData = async () => {
                    try {
                        const data = await academicProgress.getSummaryStats();
                        if (data && isMountedRef.current) {
                            // ✅ Only update if data is valid
                            if (data.totalAttempts > 0 && data.totalAttempts !== stats?.totalAttempts) {
                                setStats(data);
                                setLastUpdated(new Date(data.lastUpdated || Date.now()).toLocaleTimeString());

                                // Calculate trend
                                const cached = sessionStorage.getItem('totalAttemptsCard_cache');
                                let prevTotal = 0;
                                if (cached) {
                                    try {
                                        const parsed = JSON.parse(cached);
                                        prevTotal = parsed.stats?.totalAttempts || 0;
                                    } catch (_error) { /* silent */ }
                                }

                                let newTrend: 'up' | 'stable' = 'stable';
                                let newTrendPercentage = 0;
                                if (prevTotal > 0 && data.totalAttempts > prevTotal) {
                                    const diff = data.totalAttempts - prevTotal;
                                    const percentage = (diff / prevTotal) * 100;
                                    newTrendPercentage = Math.min(percentage, 100);
                                    newTrend = 'up';
                                }
                                setTrend(newTrend);
                                setTrendPercentage(newTrendPercentage);

                                sessionStorage.setItem('totalAttemptsCard_cache', JSON.stringify({
                                    stats: data,
                                    lastUpdated: new Date(data.lastUpdated || Date.now()).toLocaleTimeString(),
                                    trend: newTrend,
                                    trendPercentage: newTrendPercentage,
                                    timestamp: Date.now()
                                }));
                            }
                        }
                    } catch (_error) {
                        // Silent fail
                    }
                };
                refreshData();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [stats]);

    // Memoize milestone message
    const getMilestoneMessage = useCallback((total: number) => {
        if (total >= 1000000) return '🚀 1 Million+ attempts! You\'re part of something massive!';
        if (total >= 500000) return '🌟 Half a million attempts! Students are crushing it!';
        if (total >= 100000) return '🔥 100K+ attempts! Your peers are putting in the work!';
        if (total >= 50000) return '💪 50K+ attempts! The community is growing strong!';
        if (total >= 10000) return '🎯 10K+ attempts! You\'re in great company!';
        if (total >= 1000) return '📚 1K+ attempts! Learning is happening!';
        return '🎓 Start your learning journey today!';
    }, []);

    // Memoize formatted values
    const formattedStats = useMemo(() => {
        if (!stats) return null;
        return {
            totalUsers: formatNumberWithImpact(stats.totalUsers || 0),
            academicAttempts: formatNumberWithImpact(stats.academicAttempts || 0),
            quizAttempts: formatNumberWithImpact(stats.quizAttempts || 0),
            qfeedSeen: formatNumberWithImpact(stats.qfeedSeen || 0),
            totalQuestionsAnswered: formatNumberWithImpact(stats.totalQuestionsAnswered || 0)
        };
    }, [stats]);

    // Use cached stats while loading
    const displayStats = stats || (() => {
        try {
            const cached = sessionStorage.getItem('totalAttemptsCard_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.stats && parsed.stats.totalAttempts > 0) {
                    return parsed.stats;
                }
            }
        } catch (_error) { /* silent */ }
        return null;
    })();

    if (loading && !displayStats) {
        return (
            <div ref={cardRef} className="md:rounded-2xl bg-white/70 p-3 md:p-4 md:shadow-sm backdrop-blur dark:bg-muted/30 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                <div className="animate-pulse space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="h-8 w-8 md:h-9 md:w-9 rounded-lg bg-slate-200 dark:bg-slate-700" />
                            <div>
                                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
                                <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
                            </div>
                        </div>
                        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ✅ Show empty state if no data
    if (!loading && !displayStats) {
        return (
            <div ref={cardRef} className="md:rounded-2xl bg-white/70 p-3 md:p-4 md:shadow-sm backdrop-blur dark:bg-muted/30 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                <div className="text-center py-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading stats...</p>
                    <button
                        onClick={() => {
                            fetchAttemptedRef.current = false;
                            hasFetchedRef.current = false;
                            fetchStats();
                        }}
                        className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const safeStats = displayStats || { totalAttempts: 0, totalCorrect: 0, totalIncorrect: 0, totalSkipped: 0, averageAccuracy: 0 };

    return (
        <div ref={cardRef} className="md:rounded-2xl bg-white/70 p-3 md:p-4 md:shadow-sm backdrop-blur transition-all hover:shadow-md dark:bg-muted/30 border-b border-slate-100 dark:border-slate-800 md:border-b-0 group">
            {/* Header - Total with psychological formatting */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 shrink-0">
                        <BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] md:text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                            Total Questions Attempted by
                            Medrae Nursing ❤️ Students
                        </p>
                        <div className="flex items-center gap-1.5 md:gap-2">
                            {/* ✅ INSTANT DISPLAY - No animation */}
                            <StaticCounter target={safeStats.totalAttempts || 0} />
                            {trend === 'up' && trendPercentage > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] md:text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                    +{trendPercentage.toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <p className="text-[8px] md:text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                            {getMilestoneMessage(safeStats.totalAttempts || 0)}
                        </p>
                    </div>
                </div>

                {/* Right side - Live status */}
                <div className="flex flex-col items-end gap-0.5 md:gap-1 shrink-0">
                    <div className="flex items-center gap-1.5 md:gap-2">
                        <div className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[8px] md:text-[10px] font-medium text-slate-400 dark:text-slate-500">Live</span>
                        </div>
                        <span className="text-[8px] md:text-[10px] text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-[8px] md:text-[10px] text-slate-400 dark:text-slate-500">{lastUpdated || 'Just now'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Users className="h-2.5 w-2.5 md:h-3 md:w-3 text-slate-400 dark:text-slate-500" />
                        <span className="text-[8px] md:text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            {formattedStats?.totalUsers || '0'} users
                        </span>
                        <span className="text-[8px] text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-[8px] md:text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            {safeStats.averageAccuracy?.toFixed(1) || '0'}% accuracy
                        </span>
                    </div>
                </div>
            </div>

            {/* Breakdown Grid - 3 columns */}
            <div className="grid grid-cols-3 gap-1.5 md:gap-2 mt-2">
                <div className="rounded-lg bg-slate-50/80 dark:bg-slate-800/50 p-1.5 md:p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                        <BookOpen className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                        <p className="text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500">Academic</p>
                    </div>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {formattedStats?.academicAttempts || '0'}
                    </p>
                </div>

                <div className="rounded-lg bg-slate-50/80 dark:bg-slate-800/50 p-1.5 md:p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                        <ClipboardCheck className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                        <p className="text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500">Quiz</p>
                    </div>
                    <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                        {formattedStats?.quizAttempts || '0'}
                    </p>
                </div>

                <div className="rounded-lg bg-slate-50/80 dark:bg-slate-800/50 p-1.5 md:p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                        <Eye className="h-3 w-3 text-purple-500 dark:text-purple-400" />
                        <p className="text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500">QFeed</p>
                    </div>
                    <p className="text-sm font-black text-purple-600 dark:text-purple-400">
                        {formattedStats?.qfeedSeen || '0'}
                    </p>
                </div>
            </div>

            {/* Mini stats row */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 md:gap-4">
                    <MiniStat
                        label="Correct"
                        value={safeStats.totalCorrect || 0}
                        icon={<Award className="h-3 w-3" />}
                        color="emerald"
                    />
                    <MiniStat
                        label="Incorrect"
                        value={safeStats.totalIncorrect || 0}
                        icon={<Activity className="h-3 w-3" />}
                        color="rose"
                    />
                    <MiniStat
                        label="Skipped"
                        value={safeStats.totalSkipped || 0}
                        icon={<Zap className="h-3 w-3" />}
                        color="amber"
                    />
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                    <span className="text-[8px] text-slate-400 dark:text-slate-500">
                        {formattedStats?.totalQuestionsAnswered || '0'} answered
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-1000"
                    style={{
                        width: `${Math.min(100, ((safeStats.totalAttempts || 0) / 10000) * 100)}%`,
                    }}
                />
            </div>
        </div>
    );
});

TotalAttemptsCard.displayName = 'TotalAttemptsCard';

// =============================================
// COMPACT BADGE VERSION - INSTANT DISPLAY
// =============================================
export const TotalAttemptsBadge = memo(() => {
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const isMountedRef = useRef(true);
    const hasFetchedRef = useRef(false);
    const fetchAttemptedRef = useRef(false);
    const badgeRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // ✅ Load cached value instantly
    useEffect(() => {
        try {
            const cached = sessionStorage.getItem('totalAttemptsBadge_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed > 0) {
                    setTotal(parsed);
                    setLoading(false);
                } else {
                    sessionStorage.removeItem('totalAttemptsBadge_cache');
                }
            }
        } catch (_error) {
            // Silent fail
        }

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ✅ INTERSECTION OBSERVER
    useEffect(() => {
        if (!badgeRef.current) return;

        observerRef.current = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && isMountedRef.current && !hasFetchedRef.current && !fetchAttemptedRef.current) {
                    hasFetchedRef.current = true;
                    fetchAttemptedRef.current = true;
                    fetchTotal();
                    observerRef.current?.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: '50px' }
        );

        observerRef.current.observe(badgeRef.current);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
        };
    }, []);

    const fetchTotal = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            const count = await academicProgress.getTotalAttempts();
            if (isMountedRef.current) {
                if (count > 0) {
                    setTotal(count);
                }
                setLoading(false);
                try {
                    sessionStorage.setItem('totalAttemptsBadge_cache', JSON.stringify(count));
                } catch (_error) {
                    // Silent fail
                }
            }
        } catch (_error) {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    const displayValue = useMemo(() => formatNumberWithImpact(total), [total]);

    if (loading) {
        return (
            <div ref={badgeRef} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/70 dark:bg-muted/30">
                <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
        );
    }

    return (
        <div ref={badgeRef} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 dark:bg-muted/30 border border-slate-100 dark:border-slate-800 backdrop-blur-sm">
            <Zap className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                {displayValue}
            </span>
            <span className="text-[8px] text-slate-400 dark:text-slate-500">attempts</span>
        </div>
    );
});

TotalAttemptsBadge.displayName = 'TotalAttemptsBadge';