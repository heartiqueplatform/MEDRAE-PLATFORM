import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    BookOpen,
    CheckCircle2,
    ChevronRight,
    Crown,
    FlaskConical,
    GraduationCap,
    HeartPulse,
    Lock,
    Search,
    Sparkles,
    Stethoscope,
    Unlock,
    ChevronLeft,
    X,
} from "lucide-react";
import { getModules } from "@/lib/nursingQueries";
import { supabase } from "@/lib/supabaseClient";
import SuggestionBox from "@/components/curriculum/SuggestionBox";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (type === "success") vibrate([20, 30, 20]);
    else if (type === "warning") vibrate(60);
    else vibrate(15);
};

function formatNumberWithImpact(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num.toString();
}

/* Small color maps — keep the accent inside the icon, not the card. */
const moduleStyles: Record<
    string,
    { label: string; iconBg: string; icon: React.ElementType }
> = {
    theory: { label: "Theory", iconBg: "bg-sky-600", icon: BookOpen },
    practicum: { label: "Practicum", iconBg: "bg-emerald-600", icon: FlaskConical },
    clinical: { label: "Clinical", iconBg: "bg-rose-600", icon: Stethoscope },
    visit: { label: "Visit", iconBg: "bg-amber-600", icon: GraduationCap },
};
const fallbackStyle = {
    label: "Module",
    iconBg: "bg-slate-600",
    icon: BookOpen,
};

/* ------------------------------------------------------------------ */
/*  Skeletons                                                          */
/* ------------------------------------------------------------------ */

function ModuleCardSkeleton() {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#161b22] p-4">
            <div className="flex items-start justify-between mb-3">
                <div className="h-11 w-11 rounded-2xl bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                <div className="h-4 w-4 mt-1 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
            </div>
            <div className="flex gap-1.5 mb-2">
                <div className="h-4 w-14 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                <div className="h-4 w-12 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
            </div>
            <div className="h-5 w-40 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse mb-2" />
            <div className="h-3 w-full rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse mb-1" />
            <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
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
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function NursingModule() {
    const { yearId, semId } = useParams();
    const navigate = useNavigate();

    const [modules, setModules] = useState<any[]>([]);
    const [yearName, setYearName] = useState<string>("");
    const [semName, setSemName] = useState<string>("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session?.user) {
                supabase
                    .from("subscriptions")
                    .select("plan_type")
                    .eq("user_id", data.session.user.id)
                    .single()
                    .then(({ data: sub }) => {
                        setIsPremium(sub?.plan_type === "premium");
                    });
            }
        });

        if (yearId) {
            supabase
                .from("academic_years")
                .select("year_name")
                .eq("id", yearId)
                .single()
                .then(({ data }) => {
                    if (data) setYearName(data.year_name);
                });
        }

        if (semId) {
            supabase
                .from("academic_semesters")
                .select("semester_name")
                .eq("id", semId)
                .single()
                .then(({ data }) => {
                    if (data) setSemName(data.semester_name);
                });

            getModules(semId)
                .then((data) => {
                    setModules(data || []);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [yearId, semId]);

    const filteredModules = useMemo(() => {
        if (!search.trim()) return modules;
        const q = search.toLowerCase();
        return modules.filter(
            (mod) =>
                mod.title?.toLowerCase().includes(q) ||
                mod.module_code?.toLowerCase().includes(q) ||
                mod.module_type?.toLowerCase().includes(q)
        );
    }, [modules, search]);

    const counts = useMemo(() => {
        const c: Record<string, number> = {
            theory: 0,
            clinical: 0,
            practicum: 0,
            visit: 0,
        };
        modules.forEach((m) => {
            if (c[m.module_type] !== undefined) c[m.module_type]++;
        });
        return c;
    }, [modules]);

    const totalQuestions = modules.reduce(
        (sum, m) => sum + (m.total_questions || 0),
        0
    );

    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate(`/nursing/${yearId}`, { replace: true });
        }
    }, [navigate, yearId]);

    const openModule = useCallback(
        (mod: any) => {
            if (mod.is_locked && !isPremium) {
                tap("warning");
                navigate("/subscription");
            } else {
                tap("success");
                navigate(`/nursing/${yearId}/${semId}/${mod.id}`);
            }
        },
        [navigate, isPremium, yearId, semId]
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
                    aria-label="Back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>

                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate">
                        {semName || "Semester"}
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {yearName || "Year"} ·{" "}
                        {loading
                            ? "Loading modules…"
                            : `${modules.length} module${modules.length === 1 ? "" : "s"}`}
                    </p>
                </div>

                {/* Pro chip — only when premium. It's real info, not a label. */}
                {isPremium && (
                    <div className="inline-flex items-center gap-1 rounded-full
                    bg-gradient-to-r from-amber-400 to-amber-500
                    px-2 py-1 shadow-sm shrink-0">
                        <Crown className="h-3 w-3 text-white" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                            Pro
                        </span>
                    </div>
                )}

                <button
                    onClick={() => {
                        tap();
                        navigate("/nursing/unit-search");
                    }}
                    aria-label="Search units"
                    className="h-9 px-2.5 rounded-full flex items-center justify-center gap-1 shrink-0
               bg-slate-100 dark:bg-white/[0.06]
               active:bg-slate-200 dark:active:bg-white/[0.1]
               transition-colors"
                    style={{ touchAction: "manipulation" }}
                >
                    <Search className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-semibold">Search</span>
                </button>
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
                                <GraduationCap className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    {yearName || "Year"} · {semName || "Semester"}
                                </p>
                                <h2 className="text-lg font-bold leading-tight">
                                    Choose module
                                </h2>
                            </div>
                        </div>
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                            {isPremium
                                ? "You have full access. Every module is unlocked."
                                : "First 4 modules are free. Unlock premium for all."}
                        </p>
                    </section>

                    {/* Stats strip — 3 cells */}
                    <section className="px-4 mb-3">
                        {loading ? (
                            <StatsSkeleton />
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <BookOpen className="mx-auto mb-1 h-4 w-4 text-sky-600 dark:text-sky-400" />
                                    <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                        {formatNumberWithImpact(counts.theory)}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Theory
                                    </p>
                                </div>
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <Stethoscope className="mx-auto mb-1 h-4 w-4 text-rose-600 dark:text-rose-400" />
                                    <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                        {formatNumberWithImpact(counts.clinical)}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Clinical
                                    </p>
                                </div>
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <FlaskConical className="mx-auto mb-1 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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

                    {/* Premium / Access banner */}
                    {!loading && (
                        <section className="px-4 mb-3">
                            {!isPremium ? (
                                <button
                                    onClick={() => {
                                        tap("warning");
                                        navigate("/subscription");
                                    }}
                                    className="w-full flex items-center justify-between gap-3
                                               rounded-2xl bg-gradient-to-r from-amber-400/15 to-amber-500/10
                                               dark:from-amber-400/10 dark:to-amber-500/5
                                               p-3 active:scale-[0.99] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                                            <Crown className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                Unlock all 80 modules
                                            </p>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                                399 KSh · 2 months · less than 6 KSh/day
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-amber-600 shrink-0" />
                                </button>
                            ) : (
                                <div className="w-full flex items-center gap-3
                                                rounded-2xl bg-emerald-50 dark:bg-emerald-400/10 p-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                                            Full access unlocked
                                        </p>
                                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate">
                                            All 80 modules · 15.4k+ questions · AI practice
                                        </p>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Search */}
                    <section className="px-4 mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder={`Search ${formatNumberWithImpact(modules.length)} modules…`}
                                value={search}
                                onChange={(e) => {
                                    tap();
                                    setSearch(e.target.value);
                                }}
                                className="w-full rounded-xl border-0 bg-white dark:bg-[#161b22]
                                           py-2.5 pl-9 pr-9 text-sm
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                autoComplete="off"
                                style={{ touchAction: "manipulation" }}
                            />
                            {search && (
                                <button
                                    onClick={() => {
                                        tap();
                                        setSearch("");
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1
                                               text-slate-400 active:bg-slate-100 dark:active:bg-white/5"
                                    aria-label="Clear search"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        {search && !loading && (
                            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                {filteredModules.length} of {modules.length} modules
                            </p>
                        )}
                    </section>

                    {/* Module grid */}
                    <section className="px-4">
                        <div className="grid gap-2.5 sm:grid-cols-2">
                            {loading ? (
                                <>
                                    <ModuleCardSkeleton />
                                    <ModuleCardSkeleton />
                                    <ModuleCardSkeleton />
                                    <ModuleCardSkeleton />
                                </>
                            ) : (
                                filteredModules.map((mod, index) => {
                                    const style =
                                        moduleStyles[mod.module_type] || fallbackStyle;
                                    const Icon = style.icon;
                                    const isLocked = mod.is_locked && !isPremium;
                                    const isUnlockedNow = mod.is_locked && isPremium;

                                    return (
                                        <button
                                            key={mod.id}
                                            onClick={() => openModule(mod)}
                                            className="group relative rounded-2xl bg-white dark:bg-[#161b22]
                                                       p-4 text-left active:scale-[0.98] transition-transform
                                                       overflow-hidden"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            {/* Icon + chevron row */}
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div
                                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white ${isLocked
                                                        ? "bg-amber-500"
                                                        : isUnlockedNow
                                                            ? "bg-emerald-600"
                                                            : style.iconBg
                                                        }`}
                                                >
                                                    {isLocked ? (
                                                        <Lock className="h-5 w-5" />
                                                    ) : isUnlockedNow ? (
                                                        <Unlock className="h-5 w-5" />
                                                    ) : (
                                                        <Icon className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <ChevronRight
                                                    className="h-4 w-4 mt-1 text-slate-300 dark:text-slate-600
                                                               group-active:text-slate-500 transition-colors"
                                                />
                                            </div>

                                            {/* Pill row — module code + type/lock */}
                                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                                <span
                                                    className="rounded-full px-2 py-0.5
                                                               text-[10px] font-bold uppercase tracking-wider
                                                               bg-slate-100 text-slate-600
                                                               dark:bg-white/[0.06] dark:text-slate-300"
                                                >
                                                    {mod.module_code || `Module ${index + 1}`}
                                                </span>
                                                {isLocked ? (
                                                    <span className="rounded-full px-2 py-0.5
                                                                     text-[10px] font-bold uppercase tracking-wider
                                                                     bg-amber-100 text-amber-700
                                                                     dark:bg-amber-400/10 dark:text-amber-300">
                                                        Premium
                                                    </span>
                                                ) : isUnlockedNow ? (
                                                    <span className="rounded-full px-2 py-0.5
                                                                     text-[10px] font-bold uppercase tracking-wider
                                                                     bg-emerald-100 text-emerald-700
                                                                     dark:bg-emerald-400/10 dark:text-emerald-300">
                                                        Unlocked
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full px-2 py-0.5
                                                                     text-[10px] font-bold uppercase tracking-wider
                                                                     bg-slate-100 text-slate-600
                                                                     dark:bg-white/[0.06] dark:text-slate-300">
                                                        {style.label}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                                                {mod.title}
                                            </h3>

                                            {/* Questions count */}
                                            <p
                                                className={`mt-1 text-xs font-semibold ${isLocked
                                                    ? "text-amber-600 dark:text-amber-400"
                                                    : "text-emerald-600 dark:text-emerald-400"
                                                    }`}
                                            >
                                                {formatNumberWithImpact(mod.total_questions || 0)} questions
                                            </p>

                                            {/* Footer line */}
                                            <div
                                                className={`mt-3 flex items-center gap-1.5
                                                            text-[11px] font-bold uppercase tracking-wider
                                                            ${isLocked
                                                        ? "text-amber-600 dark:text-amber-400"
                                                        : "text-slate-500 dark:text-slate-400"
                                                    }`}
                                            >
                                                {isLocked ? (
                                                    <>
                                                        <Crown className="h-3 w-3" />
                                                        Unlock · 399 KSh
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="h-3 w-3" />
                                                        Start module
                                                    </>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Empty states */}
                        {!loading && filteredModules.length === 0 && !search && (
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                                <HeartPulse className="mx-auto mb-2 h-7 w-7 text-slate-400" />
                                <p className="font-semibold text-sm">No modules available</p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    Please check back later.
                                </p>
                            </div>
                        )}
                        {!loading && filteredModules.length === 0 && search && (
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                                <Search className="mx-auto mb-2 h-7 w-7 text-slate-400" />
                                <p className="font-semibold text-sm">No modules found</p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    Try a different search term.
                                </p>
                                <button
                                    onClick={() => {
                                        tap();
                                        setSearch("");
                                    }}
                                    className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                                >
                                    Clear search
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Suggestion box — bounded so it doesn't dominate */}
                    <section className="px-4 mt-6">
                        <SuggestionBox />
                    </section>
                </div>
            </main>
        </div>
    );
}