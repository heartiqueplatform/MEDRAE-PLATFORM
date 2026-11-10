import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    HelpCircle,
    Search,
    Sparkles,
    Star,
    X,
    Zap,
} from "lucide-react";
import { getAllTopicsForSearch } from "@/lib/nursingQueries";
import { playSound } from "@/lib/soundManager";
import SuggestionSheet from "@/components/curriculum/SuggestionSheet";
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

const difficultyPill: Record<string, string> = {
    intro: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    intermediate: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    advanced: "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
};
const fallbackPill =
    "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300";

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function TopicCardSkeleton() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex gap-1.5 mb-2">
                        <div className="h-4 w-14 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                        <div className="h-4 w-16 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                        <div className="h-4 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    </div>
                    <div className="h-4 w-40 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse mb-2" />
                    <div className="h-3 w-32 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                </div>
                <div className="h-8 w-16 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse shrink-0" />
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function TopicSearch() {
    const [topics, setTopics] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const [suggestOpen, setSuggestOpen] = useState(false);


    useEffect(() => {
        let mounted = true;
        getAllTopicsForSearch()
            .then((data) => {
                if (mounted) {
                    setTopics(data || []);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (mounted) setLoading(false);
            });
        // Auto-focus search after mount
        const t = setTimeout(() => searchInputRef.current?.focus(), 250);
        return () => {
            mounted = false;
            clearTimeout(t);
        };
    }, []);

    const filteredTopics = useMemo(() => {
        if (!search.trim()) return showAll ? topics : topics.slice(0, 50);
        const q = search.toLowerCase();
        return topics.filter(
            (t) =>
                t.title?.toLowerCase().includes(q) ||
                t.unit_title?.toLowerCase().includes(q) ||
                t.module_title?.toLowerCase().includes(q) ||
                t.module_code?.toLowerCase().includes(q) ||
                t.year_name?.toLowerCase().includes(q)
        );
    }, [topics, search, showAll]);

    const totalQuestions = useMemo(
        () => topics.reduce((sum, t) => sum + (t.question_count || 0), 0),
        [topics]
    );

    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/nursing", { replace: true });
        }
    }, [navigate]);

    const openTopic = useCallback(
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
            <header className="shrink-0 bg-white dark:bg-[#0d1117] border-b border-slate-200/70 dark:border-white/[0.06] z-30">
                {/* Row 1 — back + search input + clear */}
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
                            placeholder={`Search ${formatNumberWithImpact(topics.length)} topics…`}
                            value={search}
                            onChange={(e) => {
                                tap();
                                setSearch(e.target.value);
                            }}
                            className="w-full rounded-full border-0 bg-slate-100 dark:bg-white/[0.06]
                                       h-10 pl-9 pr-9 text-sm
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus:outline-none focus:ring-2 focus:ring-purple-500/40"
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
                            ? "Loading topics…"
                            : search
                                ? `${filteredTopics.length} result${filteredTopics.length === 1 ? "" : "s"}`
                                : `${topics.length} topics · ${formatNumberWithImpact(totalQuestions)} questions`}
                    </p>
                    <div className="inline-flex items-center gap-1 rounded-full
                                    bg-purple-100 dark:bg-purple-400/10 px-2 py-0.5 shrink-0 ml-2">
                        <Sparkles className="h-3 w-3 text-purple-700 dark:text-purple-300" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                            Quick practice
                        </span>
                    </div>
                </div>
            </header>

            {/* ── SCROLLABLE BODY ── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto pb-16">
                    {loading ? (
                        <section className="px-4 pt-4 grid gap-2">
                            <TopicCardSkeleton />
                            <TopicCardSkeleton />
                            <TopicCardSkeleton />
                            <TopicCardSkeleton />
                            <TopicCardSkeleton />
                        </section>
                    ) : filteredTopics.length === 0 ? (
                        <section className="px-4 pt-10">
                            <div className="text-center">
                                <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center">
                                    <Search className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="font-semibold text-sm">
                                    No topics for "{search}"
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-[260px] mx-auto">
                                    Can't find it? Suggest it and peers can endorse it.
                                </p>
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => {
                                            tap();
                                            setSearch("");
                                        }}
                                        className="inline-flex items-center gap-1.5
                           rounded-xl bg-slate-100 dark:bg-white/[0.06]
                           text-slate-700 dark:text-slate-200
                           px-4 py-2 text-xs font-bold
                           active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                        Clear
                                    </button>
                                    <button
                                        onClick={() => {
                                            tap("success");
                                            setSuggestOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1.5
                           rounded-xl bg-purple-600 text-white
                           px-4 py-2 text-xs font-bold
                           active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Suggest it
                                    </button>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <>
                            <section className="px-4 pt-4 grid gap-2">
                                {filteredTopics.map((topic) => {
                                    const difficulty = String(
                                        topic.difficulty_level || ""
                                    ).toLowerCase();
                                    const pillClass =
                                        difficultyPill[difficulty] || fallbackPill;

                                    return (
                                        <button
                                            key={topic.id}
                                            onClick={() => openTopic(topic.id)}
                                            className="group text-left rounded-2xl bg-white dark:bg-[#161b22]
                                                       p-3 active:scale-[0.99] transition-transform"
                                            style={{ touchAction: "manipulation" }}
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
                                                            {topic.difficulty_level || "intro"}
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
                                                                         bg-slate-100 text-slate-500
                                                                         dark:bg-white/[0.06] dark:text-slate-400">
                                                            <HelpCircle className="h-2.5 w-2.5" />
                                                            {formatNumberWithImpact(topic.question_count || 0)} Qs
                                                        </span>
                                                    </div>

                                                    {/* Title */}
                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                                                        {topic.title}
                                                    </h3>

                                                    {/* Path */}
                                                    <p className="mt-1 text-[11px] text-slate-400 leading-snug line-clamp-1">
                                                        <GraduationCap className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                                                        {topic.module_code && `${topic.module_code} · `}
                                                        {topic.unit_title} · {topic.year_name}
                                                    </p>
                                                </div>

                                                {/* Quiz button */}
                                                <div
                                                    className="shrink-0 inline-flex items-center gap-1
                                                               rounded-full bg-purple-600 text-white
                                                               px-2.5 py-1.5
                                                               text-[11px] font-bold
                                                               group-active:bg-purple-700 transition-colors"
                                                >
                                                    <Zap className="h-3 w-3" />
                                                    Quiz
                                                    <ChevronRight className="h-3 w-3" />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </section>

                            {/* Show more / less */}
                            {!search && topics.length > 50 && (
                                <section className="px-4 mt-4 text-center">
                                    <button
                                        onClick={() => {
                                            tap();
                                            setShowAll(!showAll);
                                        }}
                                        className="inline-flex items-center gap-1.5
                                                   rounded-xl bg-white dark:bg-[#161b22]
                                                   px-4 py-2
                                                   text-xs font-semibold
                                                   text-purple-600 dark:text-purple-300
                                                   active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {showAll
                                            ? "Show less"
                                            : `Show all ${formatNumberWithImpact(topics.length)} topics`}
                                        <ChevronRight
                                            className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-90" : ""
                                                }`}
                                        />
                                    </button>
                                    {!showAll && (
                                        <p className="mt-2 text-[10px] text-slate-400">
                                            Showing 50 of {formatNumberWithImpact(topics.length)}
                                        </p>
                                    )}
                                </section>
                            )}
                        </>
                    )}
                </div>
            </main>
            <SuggestionSheet
                open={suggestOpen}
                onClose={() => setSuggestOpen(false)}
                prefillName={search}
                prefillDescription={`I searched for "${search}" but couldn't find it in the curriculum.`}
            />
        </div>
    );
}