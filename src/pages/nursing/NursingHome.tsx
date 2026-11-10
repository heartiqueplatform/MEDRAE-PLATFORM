import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    BookOpen,
    GraduationCap,
    HeartPulse,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Stethoscope,
    Zap,
    BarChart3,
    Search,
} from "lucide-react";
import { getYears, getUserYearProgress, UserYearProgress } from "@/lib/nursingQueries";
import { useSession } from "@supabase/auth-helpers-react";
import { academicProgress } from "@/lib/academicProgress";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  GitHub dark palette constants                                      */
/* ------------------------------------------------------------------ */
const GH_PAGE = "#0d1117";
const GH_CARD = "#161b22";
const GH_BORDER = "rgba(255,255,255,0.06)";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" = "light") => {
    playSound("ui-tap");
    vibrate(type === "success" ? [20, 30, 20] : 15);
};

function formatNumberWithImpact(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num.toString();
}

/* ------------------------------------------------------------------ */
/*  MiniPie — real progress donut                                      */
/*  Fills as user answers questions in that year.                      */
/* ------------------------------------------------------------------ */

function MiniPie({
    answered,
    total,
    size = 44,
    stroke = 5,
}: {
    answered: number;
    total: number;
    size?: number;
    stroke?: number;
}) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    const safeTotal = total > 0 ? total : 1;
    const pct = Math.min(1, Math.max(0, answered / safeTotal));
    const dash = pct * circumference;

    const label =
        answered >= 1000000
            ? `${(answered / 1000000).toFixed(0)}M`
            : answered >= 1000
                ? `${(answered / 1000).toFixed(0)}k`
                : `${answered}`;

    const ringColorClass =
        answered === 0
            ? "stroke-slate-300 dark:stroke-white/[0.15]"
            : "stroke-emerald-500";

    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="-rotate-90"
                aria-hidden="true"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={stroke}
                    className="stroke-slate-200 dark:stroke-white/[0.08]"
                />
                {answered > 0 && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${circumference}`}
                        className={`${ringColorClass} transition-[stroke-dasharray] duration-500`}
                    />
                )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span
                    className={`text-[9px] font-bold tabular-nums leading-none ${answered === 0
                        ? "text-slate-400 dark:text-slate-500"
                        : "text-slate-900 dark:text-white"
                        }`}
                >
                    {label}
                </span>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Skeletons                                                          */
/* ------------------------------------------------------------------ */

function YearCardSkeleton() {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#161b22] p-4">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-slate-200 dark:bg-white/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    <div className="h-3 w-32 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                </div>
                <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse shrink-0" />
            </div>
        </div>
    );
}

function StatsSkeleton() {
    return (
        <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center animate-pulse"
                >
                    <div className="mx-auto mb-1 h-4 w-4 rounded bg-slate-200 dark:bg-white/[0.06]" />
                    <div className="mx-auto h-2.5 w-10 rounded bg-slate-200 dark:bg-white/[0.06]" />
                </div>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Progress Card                                                      */
/* ------------------------------------------------------------------ */

function ProgressCard() {
    const navigate = useNavigate();
    const session = useSession();
    const userId = session?.user?.id;
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(true);
    const lastFetchRef = useRef(0);
    const CACHE_KEY = `progress_summary_${userId}`;

    useEffect(() => {
        const cached = localStorage.getItem(CACHE_KEY);
        let paintedFromCache = false;

        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (parsed?.data) {
                    if (isMounted.current) {
                        setSummary(parsed.data);
                        setLoading(false);
                    }
                    paintedFromCache = true;
                }
            } catch {
                localStorage.removeItem(CACHE_KEY);
            }
        }

        if (userId) {
            loadProgressSummary(paintedFromCache);
        } else if (!paintedFromCache) {
            if (isMounted.current) setLoading(false);
        }

        return () => {
            isMounted.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const loadProgressSummary = async (silent = false) => {
        if (!userId || !isMounted.current) return;
        const now = Date.now();
        if (now - lastFetchRef.current < 10000) return;
        lastFetchRef.current = now;
        if (!silent) setLoading(true);
        try {
            const data = await withTimeout(
                academicProgress.getProgressSummary(userId),
                12000
            );
            if (isMounted.current) {
                if (data) {
                    setSummary(data);
                    localStorage.setItem(
                        CACHE_KEY,
                        JSON.stringify({ data, timestamp: Date.now() })
                    );
                }
                setLoading(false);
            }
        } catch {
            if (isMounted.current) setLoading(false);
        }
    };

    if (!loading && !summary) return null;

    const totalAttempted =
        (summary?.correct_answers || 0) +
        (summary?.incorrect_answers || 0) +
        (summary?.skipped_questions || 0);
    const accuracy = summary?.overall_accuracy || 0;

    return (
        <button
            onClick={() => {
                tap("success");
                navigate("/nursing/progress");
            }}
            className="w-full text-left rounded-2xl bg-white dark:bg-[#161b22]
                       p-4 active:scale-[0.99] transition-transform"
            style={{ touchAction: "manipulation" }}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                        <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Your Progress
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {loading
                                ? "Loading..."
                                : totalAttempted > 0
                                    ? `${totalAttempted} answered · ${Math.round(accuracy)}% accuracy`
                                    : "Start your journey"}
                        </p>
                    </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>

            {loading ? (
                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full w-1/2 bg-slate-300 dark:bg-white/[0.12] animate-pulse" />
                </div>
            ) : totalAttempted > 0 ? (
                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round(accuracy))}%` }}
                    />
                </div>
            ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                    Take a quiz to start tracking.
                </p>
            )}
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function NursingHome() {
    const session = useSession();
    const userId = session?.user?.id;
    const [years, setYears] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [yearProgress, setYearProgress] = useState<Record<string, UserYearProgress>>({});
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        const cached = localStorage.getItem("nursing_years_cache");
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (parsed?.data?.length) {
                    setYears(parsed.data);
                    setLoading(false);
                }
            } catch { /* ignore */ }
        }

        withTimeout(getYears(), 12000)
            .then((data) => {
                if (cancelled) return;
                if (Array.isArray(data) && data.length > 0) {
                    setYears(data);
                    localStorage.setItem(
                        "nursing_years_cache",
                        JSON.stringify({ data, timestamp: Date.now() })
                    );
                }
                setLoading(false);
            })
            .catch(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    /* 🍼 Load real per-year progress when we have a user */
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        getUserYearProgress(userId)
            .then((progressMap) => {
                if (!cancelled) setYearProgress(progressMap);
            })
            .catch(() => { });

        return () => {
            cancelled = true;
        };
    }, [userId]);

    const totalQuestions = years.reduce(
        (sum, y) => sum + (y.total_questions || 0),
        0
    );

    const handleBack = useCallback(() => {
        tap();
        navigate("/dashboard/student", { replace: false });
    }, [navigate]);

    const openYear = useCallback(
        (yearId: string) => {
            tap();
            navigate(`/nursing/${yearId}`);
        },
        [navigate]
    );

    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* ── HEADER ── */}
            <header
                className="shrink-0 flex items-center gap-2 px-2 h-14
                           bg-white dark:bg-[#0d1117]
                           border-b border-slate-200/70 dark:border-white/[0.06]
                           z-30"
            >
                <button
                    onClick={handleBack}
                    aria-label="Back to dashboard"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>

                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate">
                        Nursing Curriculum
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        KRCHN · {years.length} year{years.length === 1 ? "" : "s"}
                    </p>
                </div>

                <button
                    onClick={() => {
                        tap();
                        navigate("/nursing/unit-search");
                    }}
                    aria-label="Search units"
                    className="h-9 w-9 rounded-full flex items-center justify-center shrink-0
                               active:bg-slate-100 dark:active:bg-white/5 transition-colors"
                    style={{ touchAction: "manipulation" }}
                >
                    <Search className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1 shrink-0 pr-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full
                                    bg-emerald-100 text-emerald-700
                                    dark:bg-emerald-400/10 dark:text-emerald-300">
                        {loading ? "…" : formatNumberWithImpact(totalQuestions)} Qs
                    </div>
                </div>
            </header>

            {/* ── SCROLLABLE BODY ── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto pb-16">
                    {/* Hero */}
                    <section className="px-4 pt-5 pb-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                                <HeartPulse className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    KRCHN Curriculum
                                </p>
                                <h2 className="text-lg font-bold leading-tight">
                                    Choose your year
                                </h2>
                            </div>
                        </div>
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                            Study smarter. Move through the curriculum one unit at a time.
                        </p>
                    </section>

                    {/* Stats strip */}
                    <section className="px-4 mb-5">
                        {loading ? (
                            <StatsSkeleton />
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <BookOpen className="mx-auto mb-1 h-4 w-4 text-sky-600 dark:text-sky-400" />
                                    <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                        {years.length}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Years
                                    </p>
                                </div>
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <Stethoscope className="mx-auto mb-1 h-4 w-4 text-rose-600 dark:text-rose-400" />
                                    <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                        80
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Units
                                    </p>
                                </div>
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <GraduationCap className="mx-auto mb-1 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                        {formatNumberWithImpact(totalQuestions)}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Questions
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Progress */}
                    <section className="px-4 mb-6">
                        <ProgressCard />
                    </section>

                    {/* Quick actions */}
                    {!loading && (
                        <section className="px-4 mb-6">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                Quick actions
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        tap("success");
                                        navigate("/nursing/search");
                                    }}
                                    className="rounded-2xl bg-white dark:bg-[#161b22] p-4 text-left
                                               active:scale-[0.98] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <div className="h-9 w-9 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-2">
                                        <Zap className="h-4 w-4" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                        Quick Practice
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                        Jump to any topic
                                    </p>
                                </button>

                                <button
                                    onClick={() => {
                                        tap("success");
                                        navigate("/nursing/progress");
                                    }}
                                    className="rounded-2xl bg-white dark:bg-[#161b22] p-4 text-left
                                               active:scale-[0.98] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2">
                                        <BarChart3 className="h-4 w-4" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                        Full Progress
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                        Deep analytics
                                    </p>
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Year list */}
                    <section className="px-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Your learning path
                            </h3>
                            <div className="inline-flex items-center gap-1 rounded-full
                                            bg-emerald-100 dark:bg-emerald-400/10 px-2 py-0.5">
                                <Sparkles className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                                    Keep going
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2">
                            {loading ? (
                                <>
                                    <YearCardSkeleton />
                                    <YearCardSkeleton />
                                    <YearCardSkeleton />
                                </>
                            ) : (
                                years.map((year, index) => {
                                    const qTotal = year.total_questions || 0;
                                    const prog = yearProgress[year.id];
                                    const answered = prog?.answered_questions || 0;

                                    return (
                                        <button
                                            key={year.id}
                                            onClick={() => openYear(year.id)}
                                            className="group relative rounded-2xl bg-white dark:bg-[#161b22]
                                                       p-4 text-left active:scale-[0.98] transition-transform
                                                       overflow-hidden flex items-center gap-3"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            {/* Left: number badge */}
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl
                                                            bg-emerald-600 text-white font-bold text-sm shrink-0">
                                                {index + 1}
                                            </div>

                                            {/* Middle: title + subtitle */}
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                                                    {year.year_name}
                                                </h4>
                                                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug truncate">
                                                    {answered > 0
                                                        ? `${formatNumberWithImpact(answered)} / ${formatNumberWithImpact(qTotal)} answered`
                                                        : `${formatNumberWithImpact(qTotal)} questions`}
                                                </p>
                                            </div>

                                            {/* Right: real progress donut */}
                                            <MiniPie answered={answered} total={qTotal} />
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {!loading && years.length === 0 && (
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                                <BookOpen className="mx-auto mb-2 h-7 w-7 text-slate-400" />
                                <p className="font-semibold text-sm">
                                    No curriculum years available
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    Please check back later.
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}