import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    BookOpenCheck,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Layers,
    Search,
    Sparkles,
} from "lucide-react";
import { getSemesters } from "@/lib/nursingQueries";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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
/*  Skeletons                                                          */
/* ------------------------------------------------------------------ */

function SemesterCardSkeleton() {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#161b22] p-4">
            <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                <div className="h-4 w-4 mt-1 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
            </div>
            <div className="h-5 w-28 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse mb-1.5" />
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse mb-3" />
            <div className="h-3 w-40 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
        </div>
    );
}

function StatsSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-2">
            {[1, 2].map((i) => (
                <div
                    key={i}
                    className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center animate-pulse"
                >
                    <div className="mx-auto mb-1 h-4 w-4 rounded bg-slate-200 dark:bg-white/[0.06]" />
                    <div className="mx-auto h-2.5 w-12 rounded bg-slate-200 dark:bg-white/[0.06]" />
                </div>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function NursingSemester() {
    const { yearId } = useParams();
    const navigate = useNavigate();
    const [semesters, setSemesters] = useState<any[]>([]);
    const [yearName, setYearName] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!yearId) return;

        supabase
            .from("academic_years")
            .select("year_name")
            .eq("id", yearId)
            .single()
            .then(({ data }) => {
                if (data) setYearName(data.year_name);
            });

        getSemesters(yearId)
            .then((data) => {
                setSemesters(data || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [yearId]);

    const totalQuestions = semesters.reduce(
        (sum, s) => sum + (s.total_questions || 0),
        0
    );

    /* 🍼 Back goes to the PREVIOUS page. If there's no history (deep link),
       fall back to /nursing. Android-native behavior. */
    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/nursing", { replace: true });
        }
    }, [navigate]);

    const openSemester = useCallback(
        (semId: string) => {
            tap();
            navigate(`/nursing/${yearId}/${semId}`);
        },
        [navigate, yearId]
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
                        {yearName || "Year"}
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {loading
                            ? "Loading semesters…"
                            : `${semesters.length} semester${semesters.length === 1 ? "" : "s"} · ${formatNumberWithImpact(totalQuestions)} Qs`}
                    </p>
                </div>
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
                    {/* Hero — unique to semesters */}
                    <section className="px-4 pt-5 pb-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                                <CalendarDays className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    {yearName || "Year"} · Curriculum
                                </p>
                                <h2 className="text-lg font-bold leading-tight">
                                    Choose semester
                                </h2>
                            </div>
                        </div>
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                            Pick a semester to open its units, notes, and clinical topics.
                        </p>
                    </section>

                    {/* Stats strip — 2 cells (this page has 2 relevant numbers) */}
                    <section className="px-4 mb-5">
                        {loading ? (
                            <StatsSkeleton />
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <CalendarDays className="mx-auto mb-1 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                        {semesters.length}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Semesters
                                    </p>
                                </div>
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <BookOpenCheck className="mx-auto mb-1 h-4 w-4 text-cyan-600 dark:text-cyan-400" />
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

                    {/* Semester list */}
                    <section className="px-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Semesters
                            </h3>
                            <div className="inline-flex items-center gap-1 rounded-full
                                            bg-emerald-100 dark:bg-emerald-400/10 px-2 py-0.5">
                                <Sparkles className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                                    Continue
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2">
                            {loading ? (
                                <>
                                    <SemesterCardSkeleton />
                                    <SemesterCardSkeleton />
                                    <SemesterCardSkeleton />
                                    <SemesterCardSkeleton />
                                </>
                            ) : (
                                semesters.map((sem, index) => (
                                    <button
                                        key={sem.id}
                                        onClick={() => openSemester(sem.id)}
                                        className="group relative rounded-2xl bg-white dark:bg-[#161b22]
                                                   p-4 text-left active:scale-[0.98] transition-transform
                                                   overflow-hidden"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl
                                                            bg-emerald-600 text-white font-bold text-sm shrink-0">
                                                {index + 1}
                                            </div>
                                            <ChevronRight className="h-4 w-4 mt-1
                                                                     text-slate-300 dark:text-slate-600
                                                                     group-active:text-slate-500 transition-colors" />
                                        </div>

                                        <h4 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                            {sem.semester_name}
                                        </h4>

                                        <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                            {formatNumberWithImpact(sem.total_questions || 0)} questions
                                        </p>

                                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-snug">
                                            Units, notes, clinical topics, and revision materials.
                                        </p>

                                        <div className="mt-3 flex items-center gap-1.5
                                                        text-[11px] font-bold uppercase tracking-wider
                                                        text-slate-500 dark:text-slate-400">
                                            <Sparkles className="h-3 w-3" />
                                            Continue learning
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {!loading && semesters.length === 0 && (
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                                <CalendarDays className="mx-auto mb-2 h-7 w-7 text-slate-400" />
                                <p className="font-semibold text-sm">
                                    No semesters available
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