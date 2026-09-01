import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    BookOpen,
    GraduationCap,
    HeartPulse,
    ChevronRight,
    Sparkles,
    Stethoscope,
    Zap,
    BarChart3,
    TrendingUp,
    Trophy,
    Clock,
    Target,
} from "lucide-react";
import { getYears } from "@/lib/nursingQueries";
import { useSession } from "@supabase/auth-helpers-react";
import { academicProgress } from "@/lib/academicProgress";
import { playSound } from "@/lib/soundManager"; // Import sound manager
import { TermsButton } from "@/components/ui/TermsButton";


const vibrate = (pattern: number | number[] = 35) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

// Tap feedback with sound + vibration
const tapFeedback = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (type === "success") {
        vibrate([30, 40, 30]);
    } else if (type === "warning") {
        vibrate(100);
    } else {
        vibrate(35);
    }
};

function YearCardSkeleton() {
    return (
        <div className="relative overflow-hidden md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-5 text-left md:shadow-sm backdrop-blur dark:bg-muted/30 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
            <div className="absolute right-0 top-0 h-20 md:h-24 w-20 md:w-24 rounded-bl-full bg-slate-100 dark:bg-slate-800" />
            <div className="relative flex items-start justify-between gap-3 md:gap-4">
                <div>
                    <div className="mb-3 md:mb-4 h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-6 md:h-7 w-28 md:w-32 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-1.5 md:mb-2" />
                    <div className="space-y-1.5 md:space-y-2">
                        <div className="h-3.5 md:h-4 w-36 md:w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="h-3.5 md:h-4 w-44 md:w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                </div>
                <div className="mt-1 h-8 w-8 md:h-9 md:w-9 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className="relative mt-4 md:mt-5 h-1.5 md:h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse" style={{ width: "60%" }} />
            </div>
        </div>
    );
}

function StatsSkeleton() {
    return (
        <div className="flex items-center gap-1 md:gap-1.5 bg-white/70 p-1 md:p-1.5 rounded-lg md:rounded-2xl backdrop-blur dark:bg-white/5">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-1 md:gap-1.5 rounded-lg bg-slate-50/80 px-1.5 md:px-2 py-0.5 md:py-1 dark:bg-white/5">
                    <div className="h-2.5 w-2.5 md:h-3 md:w-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-2 w-6 md:h-2.5 md:w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
            ))}
        </div>
    );
}

function formatNumberWithImpact(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

function ProgressCard() {
    const navigate = useNavigate();
    const session = useSession();
    const userId = session?.user?.id;
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) { loadProgressSummary(); } else { setLoading(false); }
    }, [userId]);

    const loadProgressSummary = async () => {
        try {
            const data = await academicProgress.getProgressSummary(userId);
            setSummary(data);
        } catch (error) { console.error("Error loading progress:", error); }
        finally { setLoading(false); }
    };

    if (!loading && !summary) return null;

    const totalAttempted = (summary?.correct_answers || 0) + (summary?.incorrect_answers || 0) + (summary?.skipped_questions || 0);
    const accuracy = summary?.overall_accuracy || 0;
    const mastered = summary?.questions_mastered || 0;

    return (
        <button
            onClick={() => {
                tapFeedback("success");
                navigate("/nursing/progress");
            }}
            className="group relative w-full overflow-hidden md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-5 text-left md:shadow-sm backdrop-blur transition duration-200 md:hover:-translate-y-1 md:hover:border-2 md:hover:border-emerald-300 md:hover:bg-white md:hover:shadow-xl border-b border-slate-100 dark:border-slate-800 md:border-b-0 dark:bg-muted/30 dark:hover:border-emerald-500/60 dark:hover:bg-slate-900"
        >
            <div className="absolute right-0 top-0 h-20 md:h-24 w-20 md:w-24 rounded-bl-full bg-emerald-50 transition group-hover:bg-emerald-100 dark:bg-emerald-400/10 dark:group-hover:bg-emerald-400/20" />

            <div className="relative">
                <div className="mb-2 md:mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg md:rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                            <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <div>
                            <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Progress Dashboard</h3>
                            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400">
                                {loading ? "Loading..." : totalAttempted > 0 ? `${formatNumberWithImpact(totalAttempted)} questions answered` : "Start your journey"}
                            </p>
                        </div>
                    </div>
                    <div className="rounded-full bg-slate-100 p-1.5 md:p-2 text-slate-500 transition group-hover:bg-emerald-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300">
                        <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                </div>

                <div className="mt-3 md:mt-4">
                    {loading ? (
                        <div className="space-y-2 md:space-y-3">
                            <div className="h-5 md:h-6 w-44 md:w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            <div className="h-3.5 md:h-4 w-56 md:w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            <div className="h-1.5 md:h-2 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        </div>
                    ) : totalAttempted > 0 ? (
                        <>
                            <div className="grid grid-cols-3 gap-2 md:gap-3">
                                <div className="rounded-lg md:rounded-xl bg-slate-50 p-2 md:p-3 text-center dark:bg-slate-800/50">
                                    <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatNumberWithImpact(summary?.correct_answers || 0)}</p>
                                    <p className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400">Correct</p>
                                </div>
                                <div className="rounded-lg md:rounded-xl bg-slate-50 p-2 md:p-3 text-center dark:bg-slate-800/50">
                                    <p className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400">{formatNumberWithImpact(summary?.incorrect_answers || 0)}</p>
                                    <p className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400">Incorrect</p>
                                </div>
                                <div className="rounded-lg md:rounded-xl bg-slate-50 p-2 md:p-3 text-center dark:bg-slate-800/50">
                                    <p className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400">{formatNumberWithImpact(summary?.skipped_questions || 0)}</p>
                                    <p className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400">Skipped</p>
                                </div>
                            </div>
                            <div className="mt-2 md:mt-3 flex items-center justify-between text-xs md:text-sm">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <span className="text-slate-600 dark:text-slate-300">Accuracy: <span className="font-bold text-slate-900 dark:text-white">{Math.round(accuracy)}%</span></span>
                                    <span className="text-slate-600 dark:text-slate-300">Mastered: <span className="font-bold text-slate-900 dark:text-white">{formatNumberWithImpact(mastered)}</span></span>
                                </div>
                                <span className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500">{Math.min(100, Math.round((totalAttempted / 100) * 100))}%</span>
                            </div>
                            <div className="relative mt-1.5 md:mt-2 h-1.5 md:h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000" style={{ width: `${Math.min(100, Math.round((totalAttempted / 100) * 100))}%` }} />
                            </div>
                        </>
                    ) : (
                        <div className="py-4 md:py-6 text-center">
                            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">No questions attempted yet</p>
                            <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-medium text-emerald-600 dark:text-emerald-400">Start practicing to track your progress →</p>
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}

export default function NursingHome() {
    const [years, setYears] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        getYears().then(data => { setYears(data); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const totalQuestions = years.reduce((sum, y) => sum + (y.total_questions || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-transparent dark:text-white pb-20 md:pb-6">
            <section className="mx-auto flex w-full md:max-w-full md:px-4 lg:px-6 flex-col gap-4 md:gap-8 px-0 md:px-4 py-4 md:py-6 lg:px-8">

                {/* Hero Section - full width on mobile */}
                <div className="relative overflow-hidden md:rounded-2xl p-5 md:p-6 text-white md:shadow-xl sm:p-8 rounded-none">
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/high3.png')" }} />
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-emerald-950/55 to-cyan-900/45" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />

                    <div className="relative flex flex-col gap-4 md:gap-6 md:flex-row md:items-end md:justify-between">
                        <div className="max-w-2xl">
                            <div className="mb-3 md:mb-4 inline-flex items-center gap-1.5 md:gap-2 rounded-full bg-white/15 px-2.5 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-medium ring-1 ring-white/20 backdrop-blur">
                                <HeartPulse className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                KRCHN Nursing Curriculum
                            </div>

                            <h1 className="text-2xl md:text-3xl lg:text-5xl font-black tracking-tight">
                                Choose your nursing year
                            </h1>

                            <p className="mt-2 md:mt-3 max-w-xl text-xs md:text-sm lg:text-base leading-6 text-emerald-50">
                                Study smarter, move through the curriculum with confidence, and keep every unit feeling clear, organized, and achievable.
                            </p>
                        </div>

                        {loading ? (
                            <StatsSkeleton />
                        ) : (
                            <div className="grid grid-cols-3 gap-2 md:gap-3 md:rounded-2xl md:border-0 bg-white/70 p-2 md:p-3 md:shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5 rounded-lg md:rounded-2xl">
                                <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-white/5">
                                    <BookOpen className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 text-sky-600 dark:text-sky-300" />
                                    <p className="text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-300">{formatNumberWithImpact(years.length)} Years</p>
                                </div>
                                <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-white/5">
                                    <Stethoscope className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 text-rose-600 dark:text-rose-300" />
                                    <p className="text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-300">80 Units</p>
                                </div>
                                <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-white/5">
                                    <GraduationCap className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 text-emerald-600 dark:text-emerald-300" />
                                    <p className="text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-300">{formatNumberWithImpact(totalQuestions)} Qs</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>



                {/* Progress Card */}
                <div className="px-3 md:px-0">
                    <ProgressCard />
                </div>

                {/* Quick Practice Button */}
                {!loading && (
                    <div className="px-3 md:px-0 flex justify-center">
                        <button
                            onClick={() => {
                                tapFeedback("success");
                                navigate("/nursing/search");
                            }}
                            className="inline-flex items-center gap-1.5 md:gap-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-bold text-white shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-105 transition-all dark:shadow-purple-900/30"
                        >
                            <Zap className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            Quick Practice — Jump to Any Topic in Any Year
                        </button>
                    </div>
                )}

                {/* Year Cards Section */}
                <div>
                    <div className="mb-3 md:mb-4 flex items-center justify-between gap-2 md:gap-3 px-3 md:px-0">
                        <div>
                            <h2 className="text-lg md:text-xl font-bold">Your learning path</h2>
                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Pick a year to view its units and learning materials.</p>
                        </div>
                        <div className="hidden items-center gap-1.5 md:gap-2 rounded-full bg-emerald-100 px-2.5 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300 sm:flex">
                            <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            Keep going
                        </div>
                    </div>

                    <div className="grid gap-0 md:gap-4 sm:grid-cols-3 px-3 md:px-0">
                        {loading ? (
                            <><YearCardSkeleton /><YearCardSkeleton /><YearCardSkeleton /><YearCardSkeleton /></>
                        ) : (
                            years.map((year, index) => (
                                <button
                                    key={year.id}
                                    onClick={() => {
                                        tapFeedback("light");
                                        navigate(`/nursing/${year.id}`);
                                    }}
                                    className="group relative overflow-hidden md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-5 text-left md:shadow-sm backdrop-blur transition duration-200 md:hover:-translate-y-1 md:hover:border-2 md:hover:border-emerald-300 md:hover:bg-white md:hover:shadow-xl border-b border-slate-100 dark:border-slate-800 md:border-b-0 dark:bg-muted/30 dark:hover:border-emerald-500/60 dark:hover:bg-slate-900"
                                >
                                    <div className="absolute right-0 top-0 h-20 md:h-24 w-20 md:w-24 rounded-bl-full bg-emerald-50 transition group-hover:bg-emerald-100 dark:bg-emerald-400/10 dark:group-hover:bg-emerald-400/20" />

                                    <div className="relative flex items-start justify-between gap-3 md:gap-4">
                                        <div>
                                            <div className="mb-3 md:mb-4 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl md:rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                                                <span className="text-base md:text-lg font-black">{index + 1}</span>
                                            </div>

                                            <h3 className="text-base md:text-lg font-black text-slate-950 dark:text-white">{year.year_name}</h3>

                                            <p className="mt-1.5 md:mt-2 text-xs md:text-sm leading-6 text-slate-500 dark:text-slate-400">
                                                {formatNumberWithImpact(year.total_questions || 0)} questions · Open units, notes, clinical topics, and revision content for this stage.
                                            </p>
                                        </div>

                                        <div className="mt-1 rounded-full bg-slate-100 p-1.5 md:p-2 text-slate-500 transition group-hover:bg-emerald-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300">
                                            <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                                        </div>
                                    </div>

                                    <div className="relative mt-4 md:mt-5 h-1.5 md:h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${Math.min(35 + index * 18, 95)}%` }} />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {!loading && years.length === 0 && (
                        <div className="mx-3 md:mx-0 md:rounded-2xl md:border md:border-dashed md:border-slate-300 bg-white p-6 md:p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                            <BookOpen className="mx-auto mb-2 md:mb-3 h-7 w-7 md:h-8 md:w-8 text-slate-400" />
                            <p className="font-semibold text-sm md:text-base">No curriculum years available</p>
                            <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-slate-500">Please check back later.</p>
                        </div>
                    )}
                </div>
            </section>

            <TermsButton />

        </div>



    );
}