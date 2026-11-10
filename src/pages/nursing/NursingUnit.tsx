import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
    ChevronLeft,
    BookOpenCheck,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    GraduationCap,
    HelpCircle,
    Medal,
    Sparkles,
    Star,
    Target,
    Search,
    X,
    Zap,
} from "lucide-react";
import { getModuleUnits, getTopics } from "@/lib/nursingQueries";
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

const difficultyPill: Record<string, string> = {
    easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    hard: "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
};
const fallbackPill =
    "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300";

/* ------------------------------------------------------------------ */
/*  Skeletons                                                          */
/* ------------------------------------------------------------------ */

function UnitCardSkeleton() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                <div className="min-w-0 flex-1">
                    <div className="h-3 w-10 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse mb-1.5" />
                    <div className="h-5 w-40 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse mb-1.5" />
                    <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
            </div>
        </div>
    );
}

function TopicSkeleton() {
    return (
        <div className="rounded-xl bg-white dark:bg-[#0d1117] p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex gap-1.5 mb-2">
                        <div className="h-4 w-14 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                        <div className="h-4 w-20 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                        <div className="h-4 w-12 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    </div>
                    <div className="h-4 w-40 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                </div>
                <div className="h-8 w-16 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse shrink-0" />
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
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function NursingUnit() {
    const { yearId, semId, moduleId } = useParams();
    const navigate = useNavigate();

    const [units, setUnits] = useState<any[]>([]);
    const [topicsMap, setTopicsMap] = useState<Record<string, any[]>>({});
    const [openUnit, setOpenUnit] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    const openUnitParam = searchParams.get("openUnit");
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showOnlyExamFavorites, setShowOnlyExamFavorites] = useState(false);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

    useEffect(() => {
        if (!moduleId) return;
        setLoading(true);
        getModuleUnits(moduleId)
            .then((data) => {
                setUnits(data || []);
                setLoading(false);

                // 🍼 Auto-open the unit if ?openUnit= was provided
                if (openUnitParam) {
                    setOpenUnit(openUnitParam);
                    getTopics(openUnitParam)
                        .then((topicData) => {
                            setTopicsMap((prev) => ({
                                ...prev,
                                [openUnitParam]: topicData || [],
                            }));
                        })
                        .catch(() => { });
                }
            })
            .catch(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [moduleId, openUnitParam]);
    const toggleUnit = useCallback(
        async (unitId: string) => {
            tap();
            if (openUnit === unitId) {
                setOpenUnit(null);
                return;
            }
            setOpenUnit(unitId);
            if (!topicsMap[unitId]) {
                const topicData = await getTopics(unitId);
                setTopicsMap((prev) => ({ ...prev, [unitId]: topicData || [] }));
            }
        },
        [openUnit, topicsMap]
    );

    const totalQuestions = units.reduce(
        (sum, u) => sum + (u.total_questions || 0),
        0
    );

    const filteredUnits = useMemo(() => {
        if (
            !searchQuery.trim() &&
            !showOnlyExamFavorites &&
            selectedDifficulty === "all"
        ) {
            return units;
        }
        return units.filter((unit) => {
            const topics = topicsMap[unit.id] || [];
            const unitMatches = unit.title
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            const topicMatches = topics.some((topic: any) =>
                topic.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
            const hasExamFavorite = showOnlyExamFavorites
                ? topics.some((topic: any) => topic.is_exam_favorite)
                : true;
            const matchesDifficulty =
                selectedDifficulty === "all"
                    ? true
                    : topics.some(
                        (topic: any) =>
                            topic.difficulty_level?.toLowerCase() === selectedDifficulty
                    );
            return (unitMatches || topicMatches) && hasExamFavorite && matchesDifficulty;
        });
    }, [units, topicsMap, searchQuery, showOnlyExamFavorites, selectedDifficulty]);

    const filteredTopicsMap = useMemo(() => {
        const result: Record<string, any[]> = {};
        filteredUnits.forEach((unit) => {
            const topics = topicsMap[unit.id] || [];
            if (
                !searchQuery.trim() &&
                !showOnlyExamFavorites &&
                selectedDifficulty === "all"
            ) {
                result[unit.id] = topics;
            } else {
                result[unit.id] = topics.filter((topic: any) => {
                    const matchesSearch = topic.title
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase());
                    const matchesExamFavorite = showOnlyExamFavorites
                        ? topic.is_exam_favorite
                        : true;
                    const matchesDifficulty =
                        selectedDifficulty === "all"
                            ? true
                            : topic.difficulty_level?.toLowerCase() === selectedDifficulty;
                    return matchesSearch && matchesExamFavorite && matchesDifficulty;
                });
            }
        });
        return result;
    }, [filteredUnits, topicsMap, searchQuery, showOnlyExamFavorites, selectedDifficulty]);

    const filteredStats = useMemo(() => {
        let topics = 0;
        let questions = 0;
        filteredUnits.forEach((unit) => {
            const unitTopics = topicsMap[unit.id] || [];
            topics += unitTopics.length;
            questions += unitTopics.reduce(
                (sum: number, t: any) => sum + (t.question_count || 0),
                0
            );
        });
        return { topics, questions };
    }, [filteredUnits, topicsMap]);

    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate(`/nursing/${yearId}/${semId}`, { replace: true });
        }
    }, [navigate, yearId, semId]);

    const openQuiz = useCallback(
        (topicId: string) => {
            tap("success");
            navigate(`/nursing/quiz/${topicId}`);
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
                        Module units
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {loading
                            ? "Loading units…"
                            : `${filteredUnits.length} unit${filteredUnits.length === 1 ? "" : "s"} · ${filteredStats.topics} topics`}
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
                    {/* Hero */}
                    <section className="px-4 pt-5 pb-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                                <BookOpenCheck className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    Module learning room
                                </p>
                                <h2 className="text-lg font-bold leading-tight">
                                    Units & topics
                                </h2>
                            </div>
                        </div>
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                            Tap a unit to reveal its topics, then jump straight into a quiz.
                        </p>
                    </section>

                    {/* Stats strip */}
                    <section className="px-4 mb-3">
                        {loading ? (
                            <StatsSkeleton />
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <BookOpenCheck className="mx-auto mb-1 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                        {filteredUnits.length}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Units
                                    </p>
                                </div>
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <Target className="mx-auto mb-1 h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                                    <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                        {filteredStats.topics}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Topics
                                    </p>
                                </div>
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <Medal className="mx-auto mb-1 h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                        {formatNumberWithImpact(filteredStats.questions || totalQuestions)}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Quizzes
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Search + filters */}
                    <section className="px-4 mb-4">
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Units, topics, or keywords…"
                                value={searchQuery}
                                onChange={(e) => {
                                    tap();
                                    setSearchQuery(e.target.value);
                                }}
                                className="w-full rounded-xl border-0 bg-white dark:bg-[#161b22]
                                           py-2.5 pl-9 pr-9 text-sm
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                autoComplete="off"
                                style={{ touchAction: "manipulation" }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => {
                                        tap();
                                        setSearchQuery("");
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1
                                               text-slate-400 active:bg-slate-100 dark:active:bg-white/5"
                                    aria-label="Clear search"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Filter chips */}
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => {
                                    tap("success");
                                    setShowOnlyExamFavorites(!showOnlyExamFavorites);
                                }}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1
                                            text-[11px] font-semibold transition-colors
                                            ${showOnlyExamFavorites
                                        ? "bg-amber-500 text-white"
                                        : "bg-white text-slate-700 dark:bg-[#161b22] dark:text-slate-300"
                                    }`}
                                style={{ touchAction: "manipulation" }}
                            >
                                <Star
                                    className={`h-3 w-3 ${showOnlyExamFavorites ? "fill-white" : ""}`}
                                />
                                Exam Favorites
                            </button>

                            <select
                                value={selectedDifficulty}
                                onChange={(e) => {
                                    tap();
                                    setSelectedDifficulty(e.target.value);
                                }}
                                className="rounded-full border-0 bg-white dark:bg-[#161b22]
                                           px-2.5 py-1 text-[11px] font-semibold
                                           text-slate-700 dark:text-slate-300
                                           focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                style={{ touchAction: "manipulation" }}
                            >
                                <option value="all">All difficulties</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>

                            {searchQuery && (
                                <span className="inline-flex items-center gap-1 rounded-full
                                                 bg-emerald-100 dark:bg-emerald-400/10
                                                 px-2.5 py-1 text-[11px] font-semibold
                                                 text-emerald-700 dark:text-emerald-300">
                                    <Zap className="h-3 w-3" />
                                    {filteredUnits.length} results
                                </span>
                            )}
                        </div>
                    </section>

                    {/* Units list — accordion */}
                    {loading ? (
                        <section className="px-4 grid gap-2.5">
                            <UnitCardSkeleton />
                            <UnitCardSkeleton />
                            <UnitCardSkeleton />
                            <UnitCardSkeleton />
                        </section>
                    ) : filteredUnits.length === 0 ? (
                        <section className="px-4">
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                                {searchQuery ? (
                                    <>
                                        <Search className="mx-auto mb-2 h-7 w-7 text-slate-400" />
                                        <p className="font-semibold text-sm">
                                            No results found
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                            Try adjusting your search or filters
                                        </p>
                                        <button
                                            onClick={() => {
                                                tap();
                                                setSearchQuery("");
                                                setShowOnlyExamFavorites(false);
                                                setSelectedDifficulty("all");
                                            }}
                                            className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                                        >
                                            Clear all filters
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <ClipboardList className="mx-auto mb-2 h-7 w-7 text-slate-400" />
                                        <p className="font-semibold text-sm">
                                            No units found for this module
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                            Units will appear here once added.
                                        </p>
                                    </>
                                )}
                            </div>
                        </section>
                    ) : (
                        <section className="px-4 grid gap-2.5">
                            {filteredUnits.map((unit, index) => {
                                const isOpen = openUnit === unit.id;
                                const topics = topicsMap[unit.id];
                                const isLoadingTopics = isOpen && !topics;
                                const filteredTopics = filteredTopicsMap[unit.id] || [];

                                return (
                                    <div
                                        key={unit.id}
                                        className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden"
                                    >
                                        {/* Unit header row */}
                                        <button
                                            onClick={() => toggleUnit(unit.id)}
                                            className="w-full flex items-center gap-3 p-4 text-left
                                                       active:bg-slate-50 dark:active:bg-white/[0.03]
                                                       transition-colors"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                                                            bg-emerald-600 text-white font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    Unit {index + 1}
                                                </p>
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                                                    {unit.title}
                                                </h3>
                                                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                    {unit.total_questions || 0} questions
                                                    {searchQuery && (
                                                        <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">
                                                            · {filteredTopics.length} matches
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div
                                                className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center
                                                            ${isOpen
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                                                        : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
                                                    }`}
                                            >
                                                <ChevronDown
                                                    className={`h-4 w-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""
                                                        }`}
                                                />
                                            </div>
                                        </button>

                                        {/* Accordion body — CSS grid trick for smooth height */}
                                        <div
                                            className="grid transition-[grid-template-rows] duration-300 ease-out"
                                            style={{
                                                gridTemplateRows: isOpen ? "1fr" : "0fr",
                                            }}
                                        >
                                            <div className="overflow-hidden">
                                                <div className="p-3 pt-0">
                                                    {isLoadingTopics ? (
                                                        <div className="grid gap-2">
                                                            <TopicSkeleton />
                                                            <TopicSkeleton />
                                                            <TopicSkeleton />
                                                        </div>
                                                    ) : filteredTopics.length === 0 ? (
                                                        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3
                                                                        text-xs text-slate-500 dark:text-slate-400">
                                                            {searchQuery ||
                                                                showOnlyExamFavorites ||
                                                                selectedDifficulty !== "all"
                                                                ? "No topics match your filters in this unit."
                                                                : "No topics yet."}
                                                        </div>
                                                    ) : (
                                                        <div className="grid gap-2">
                                                            {filteredTopics.map((topic: any) => {
                                                                const difficulty = String(
                                                                    topic.difficulty_level || ""
                                                                ).toLowerCase();
                                                                const pillClass =
                                                                    difficultyPill[difficulty] || fallbackPill;

                                                                return (
                                                                    <div
                                                                        key={topic.id}
                                                                        className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3"
                                                                    >
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div className="min-w-0 flex-1">
                                                                                {/* Pills */}
                                                                                <div className="flex flex-wrap items-center gap-1 mb-1.5">
                                                                                    <span
                                                                                        className={`rounded-full px-2 py-0.5
                                                                                                    text-[10px] font-bold capitalize
                                                                                                    ${pillClass}`}
                                                                                    >
                                                                                        {topic.difficulty_level || "Standard"}
                                                                                    </span>
                                                                                    {topic.is_exam_favorite && (
                                                                                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                                                                                         text-[10px] font-bold
                                                                                                         bg-amber-100 text-amber-700
                                                                                                         dark:bg-amber-400/10 dark:text-amber-300">
                                                                                            <Star className="h-2.5 w-2.5 fill-current" />
                                                                                            Favorite
                                                                                        </span>
                                                                                    )}
                                                                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                                                                                     text-[10px] font-bold
                                                                                                     bg-white text-slate-500
                                                                                                     dark:bg-white/[0.06] dark:text-slate-400">
                                                                                        <HelpCircle className="h-2.5 w-2.5" />
                                                                                        {topic.question_count || 0} Qs
                                                                                    </span>
                                                                                </div>
                                                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                                                                                    {topic.title}
                                                                                </h4>
                                                                            </div>

                                                                            <button
                                                                                onClick={() => openQuiz(topic.id)}
                                                                                className="shrink-0 inline-flex items-center gap-1
                                                                                           rounded-full bg-emerald-600 text-white
                                                                                           px-3 py-1.5
                                                                                           text-[11px] font-bold
                                                                                           active:scale-[0.96] transition-transform"
                                                                                style={{ touchAction: "manipulation" }}
                                                                                aria-label={`Start quiz for ${topic.title}`}
                                                                            >
                                                                                Quiz
                                                                                <ChevronRight className="h-3 w-3" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </section>
                    )}

                    {/* Motivation strip — lighter, native */}
                    <section className="px-4 mt-6">
                        <div className="flex items-center justify-center gap-1.5
                                        rounded-xl bg-emerald-50 dark:bg-emerald-400/[0.06]
                                        px-3 py-2.5
                                        text-[11px] font-semibold
                                        text-emerald-700 dark:text-emerald-300">
                            <Sparkles className="h-3.5 w-3.5" />
                            Small steps, strong nurse energy.
                        </div>
                    </section>

                    {/* Suggestion box */}
                    <section className="px-4 mt-6">
                        <SuggestionBox />
                    </section>
                </div>
            </main>
        </div>
    );
}

/* Local formatter (kept inside this file so it stays self-contained) */
function formatNumberWithImpact(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num.toString();
}