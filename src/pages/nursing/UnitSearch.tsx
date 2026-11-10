// src/pages/nursing/UnitSearch.tsx
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    ChevronRight,
    Search,
    X,
    GraduationCap,
    BookOpen,
    HelpCircle,
    Sparkles,
    Loader2,
} from "lucide-react";
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
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UnitRow {
    id: string;
    title: string;
    total_questions: number | null;
    module_id: string;
    module_title: string | null;
    module_code: string | null;
    semester_id: string;
    semester_name: string | null;
    year_id: string;
    year_name: string | null;
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function UnitCardSkeleton() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse mb-2" />
                    <div className="h-4 w-40 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse mb-2" />
                    <div className="h-3 w-32 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse shrink-0" />
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function UnitSearch() {
    const navigate = useNavigate();
    const [units, setUnits] = useState<UnitRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [error, setError] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    /* ── Load all units once ── */
    useEffect(() => {
        let cancelled = false;

        const loadUnits = async () => {
            try {
                // 🍼 Real schema: academic_module_units → academic_modules
                //    → academic_semesters → academic_years
                //    Same join shape as getAllTopicsForSearch / getModuleUnits.
                const { data, error } = await supabase
                    .from("academic_module_units")
                    .select(
                        `
                        id,
                        title,
                        academic_topics(question_count),
                        academic_modules!inner(
                            id,
                            title,
                            module_code,
                            semester_id,
                            academic_semesters!inner(
                                id,
                                semester_name,
                                academic_year_id,
                                academic_years!inner(
                                    id,
                                    year_name
                                )
                            )
                        )
                        `
                    )
                    .order("display_order", { ascending: true });

                if (error) throw error;
                if (cancelled) return;

                const flattened: UnitRow[] = (data || []).map((row: any) => {
                    const mod = row.academic_modules || {};
                    const sem = mod.academic_semesters || {};
                    const yr = sem.academic_years || {};

                    // Sum topic question counts for this unit
                    const totalQuestions = (row.academic_topics || []).reduce(
                        (sum: number, t: any) => sum + (t.question_count || 0),
                        0
                    );

                    return {
                        id: row.id,
                        title: row.title || "Untitled unit",
                        total_questions: totalQuestions,
                        module_id: mod.id ?? "",
                        module_title: mod.title ?? null,
                        module_code: mod.module_code ?? null,
                        semester_id: sem.id ?? "",
                        semester_name: sem.semester_name ?? null,
                        year_id: yr.id ?? "",
                        year_name: yr.year_name ?? null,
                    };
                });

                setUnits(flattened);
            } catch (err: any) {
                console.warn("[UnitSearch] load failed:", err);
                setError("Couldn't load units. Check your connection.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadUnits();

        // Auto-focus search
        const t = setTimeout(() => searchInputRef.current?.focus(), 250);

        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, []);

    /* ── Filter ── */
    const filteredUnits = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return units.slice(0, 40);
        return units.filter((u) => {
            return (
                u.title?.toLowerCase().includes(q) ||
                u.module_title?.toLowerCase().includes(q) ||
                u.module_code?.toLowerCase().includes(q) ||
                u.semester_name?.toLowerCase().includes(q) ||
                u.year_name?.toLowerCase().includes(q)
            );
        });
    }, [units, search]);

    /* ── Back ── */
    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/nursing", { replace: true });
        }
    }, [navigate]);

    /* ── Open unit ── */
    const openUnit = useCallback(
        (unit: UnitRow) => {
            tap("success");
            // Jump to that module's page with the unit pre-opened.
            navigate(
                `/nursing/${unit.year_id}/${unit.semester_id}/${unit.module_id}?openUnit=${unit.id}`
            );
        },
        [navigate]
    );

    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* ── HEADER ── */}
            <header className="shrink-0 bg-white dark:bg-[#0d1117] border-b border-slate-200/70 dark:border-white/[0.06] z-30">
                {/* Row 1 — back + search + clear */}
                <div className="flex items-center gap-1.5 px-2 h-14">
                    <button
                        onClick={handleBack}
                        aria-label="Back"
                        className="h-10 w-10 rounded-full flex items-center justify-center
                                   active:bg-slate-100 dark:active:bg-white/5 transition-colors shrink-0"
                        style={{ touchAction: "manipulation" }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>

                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search units, modules, semesters…"
                            value={search}
                            onChange={(e) => {
                                tap();
                                setSearch(e.target.value);
                            }}
                            className="w-full rounded-full border-0 bg-slate-100 dark:bg-white/[0.06]
                                       h-10 pl-9 pr-9 text-sm
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
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full
                                           h-7 w-7 flex items-center justify-center
                                           text-slate-400 active:bg-slate-200 dark:active:bg-white/10"
                                aria-label="Clear search"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Row 2 — context strip */}
                <div className="flex items-center justify-between px-4 pb-2 text-[11px]">
                    <p className="text-slate-500 dark:text-slate-400 truncate">
                        {loading
                            ? "Loading units…"
                            : search
                                ? `${filteredUnits.length} result${filteredUnits.length === 1 ? "" : "s"}`
                                : `${units.length} units across the curriculum`}
                    </p>
                    <div className="inline-flex items-center gap-1 rounded-full
                                    bg-emerald-100 dark:bg-emerald-400/10 px-2 py-0.5 shrink-0 ml-2">
                        <GraduationCap className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                            Units
                        </span>
                    </div>
                </div>
            </header>

            {/* ── BODY ── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto pb-16">
                    {/* Loading */}
                    {loading && (
                        <section className="px-4 pt-4 grid gap-2">
                            <UnitCardSkeleton />
                            <UnitCardSkeleton />
                            <UnitCardSkeleton />
                            <UnitCardSkeleton />
                            <UnitCardSkeleton />
                        </section>
                    )}

                    {/* Error */}
                    {!loading && error && (
                        <section className="px-4 pt-8">
                            <div className="text-center">
                                <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-rose-100 dark:bg-rose-400/10 flex items-center justify-center">
                                    <X className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                                </div>
                                <p className="font-semibold text-sm">{error}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-3 inline-flex items-center gap-1.5
                                               rounded-xl bg-emerald-600 text-white
                                               px-4 py-2 text-xs font-bold
                                               active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    Try again
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Empty (no results) */}
                    {!loading && !error && filteredUnits.length === 0 && (
                        <section className="px-4 pt-10">
                            <div className="text-center">
                                <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center">
                                    <Search className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="font-semibold text-sm">
                                    {search ? `No units for "${search}"` : "No units available"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-[260px] mx-auto">
                                    {search
                                        ? "Try a different search, or search topics instead."
                                        : "Units will appear here once they're added."}
                                </p>
                                {search && (
                                    <button
                                        onClick={() => {
                                            tap();
                                            setSearch("");
                                        }}
                                        className="mt-3 inline-flex items-center gap-1.5
                                                   rounded-xl bg-slate-100 dark:bg-white/[0.06]
                                                   text-slate-700 dark:text-slate-200
                                                   px-4 py-2 text-xs font-bold
                                                   active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        Clear search
                                    </button>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Results */}
                    {!loading && !error && filteredUnits.length > 0 && (
                        <>
                            <section className="px-4 pt-4 grid gap-2">
                                {filteredUnits.map((unit) => (
                                    <button
                                        key={unit.id}
                                        onClick={() => openUnit(unit)}
                                        className="text-left rounded-2xl bg-white dark:bg-[#161b22]
                                                   p-3 active:scale-[0.99] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                {/* Path */}
                                                <div className="flex flex-wrap items-center gap-1 mb-1.5">
                                                    {unit.year_name && (
                                                        <span className="rounded-full px-2 py-0.5
                                                                         text-[10px] font-bold
                                                                         bg-slate-100 text-slate-600
                                                                         dark:bg-white/[0.06] dark:text-slate-300">
                                                            {unit.year_name}
                                                        </span>
                                                    )}
                                                    {unit.semester_name && (
                                                        <span className="text-[10px] text-slate-400">
                                                            · {unit.semester_name}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Title */}
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                                                    {unit.title}
                                                </h3>

                                                {/* Module line */}
                                                {unit.module_title && (
                                                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                                        <BookOpen className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                                                        {unit.module_code && `${unit.module_code} · `}
                                                        {unit.module_title}
                                                    </p>
                                                )}

                                                {/* Questions pill */}
                                                <span className="inline-flex items-center gap-1 mt-1.5
                                                                 rounded-full px-2 py-0.5
                                                                 text-[10px] font-bold
                                                                 bg-slate-100 text-slate-500
                                                                 dark:bg-white/[0.06] dark:text-slate-400">
                                                    <HelpCircle className="h-2.5 w-2.5" />
                                                    {formatNumberWithImpact(unit.total_questions || 0)} questions
                                                </span>
                                            </div>

                                            <div className="shrink-0 h-8 w-8 rounded-full
                                                            bg-emerald-100 dark:bg-emerald-400/10
                                                            flex items-center justify-center
                                                            mt-1">
                                                <ChevronRight className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </section>

                            {!search && units.length > 40 && (
                                <p className="text-center text-[10px] text-slate-400 mt-4">
                                    Showing 40 of {formatNumberWithImpact(units.length)}. Search to narrow.
                                </p>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}