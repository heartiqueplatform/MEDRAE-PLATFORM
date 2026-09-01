import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    BookOpen,
    ChevronRight,
    GraduationCap,
    HelpCircle,
    Layers,
    Loader2,
    Medal,
    Search,
    Sparkles,
    Star,
    Target,
    X,
    Zap,
} from "lucide-react";
import { getAllTopicsForSearch } from "@/lib/nursingQueries";

// =============================================
// PSYCHOLOGICAL NUMBER FORMATTING
// =============================================
function formatNumberWithImpact(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

const difficultyStyles: Record<string, string> = {
    intro: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    intermediate: "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
    advanced: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20",
};

function TopicCardSkeleton() {
    return (
        <div className="md:rounded-2xl md:border-0 bg-white/70 p-3 md:p-4 md:shadow-sm backdrop-blur dark:bg-muted/30 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
            <div className="flex items-start justify-between gap-3 md:gap-4">
                <div className="min-w-0 flex-1">
                    <div className="mb-1.5 md:mb-2 flex flex-wrap items-center gap-1.5 md:gap-2">
                        <div className="h-5 md:h-6 w-12 md:w-14 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                        <div className="h-5 md:h-6 w-16 md:w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                        <div className="h-5 md:h-6 w-8 md:w-10 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                    </div>
                    <div className="h-5 md:h-6 w-40 md:w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1.5 md:mb-2" />
                    <div className="h-3 md:h-3 w-32 md:w-36 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
                <div className="h-8 md:h-9 w-16 md:w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse shrink-0" />
            </div>
        </div>
    );
}

export default function TopicSearch() {
    const [topics, setTopics] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;
        getAllTopicsForSearch()
            .then(data => { if (mounted) { setTopics(data || []); setLoading(false); } })
            .catch(() => { if (mounted) setLoading(false); });
        setTimeout(() => searchInputRef.current?.focus(), 300);
        return () => { mounted = false; };
    }, []);

    const filteredTopics = useMemo(() => {
        if (!search.trim()) return showAll ? topics : topics.slice(0, 50);
        const q = search.toLowerCase();
        return topics.filter(
            (t) =>
                t.title.toLowerCase().includes(q) ||
                t.unit_title?.toLowerCase().includes(q) ||
                t.module_title?.toLowerCase().includes(q) ||
                t.module_code?.toLowerCase().includes(q) ||
                t.year_name?.toLowerCase().includes(q)
        );
    }, [topics, search, showAll]);

    const totalQuestions = useMemo(() => topics.reduce((sum, t) => sum + (t.question_count || 0), 0), [topics]);
    const displayedTopics = search.trim() ? filteredTopics : filteredTopics;

    return (
        <div className="min-h-screen bg-transparent text-slate-950 dark:text-white pb-20 md:pb-6">
            <section className="mx-auto flex w-full md:max-w-full md:px-4 lg:px-6 flex-col gap-4 md:gap-6 px-0 md:px-4 py-4 md:py-6 lg:px-8">

                {/* Header Card - full width on mobile */}
                <div className="relative overflow-hidden md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-6 md:shadow-xl backdrop-blur-xl dark:bg-muted/30 sm:p-8 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                    <div className="absolute right-0 top-0 h-24 md:h-32 w-24 md:w-32 rounded-bl-full bg-purple-100/80 dark:bg-purple-400/10" />
                    <div className="absolute bottom-0 left-0 h-20 md:h-24 w-20 md:w-24 rounded-tr-full bg-violet-100/80 dark:bg-violet-400/10" />

                    <div className="relative">
                        {/* Back + Badge */}
                        <div className="mb-3 md:mb-4 flex items-center justify-between">
                            <button
                                onClick={() => navigate("/nursing")}
                                className="inline-flex w-fit items-center gap-1.5 md:gap-2 rounded-full border-0 bg-white/70 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-emerald-700 dark:bg-muted/30 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-emerald-300"
                            >
                                <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                Back to Home
                            </button>

                            <div className="inline-flex items-center gap-1 md:gap-2 rounded-full bg-purple-100 px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-semibold text-purple-700 ring-1 ring-purple-200 dark:bg-purple-400/10 dark:text-purple-300 dark:ring-purple-400/20">
                                <Zap className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                Quick Practice
                            </div>
                        </div>

                        {/* Title + Stats */}
                        <div className="flex flex-col gap-4 md:gap-5 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">
                                    Jump to any topic
                                </h1>
                                <p className="mt-2 md:mt-3 max-w-2xl text-xs md:text-sm lg:text-base leading-6 text-slate-600 dark:text-slate-300">
                                    Search across all topics and start practicing your weak areas instantly.
                                </p>
                            </div>

                            {!loading && (
                                <div className="grid grid-cols-3 gap-2 md:gap-3 md:rounded-2xl md:border-0 bg-white/70 p-2 md:p-3 md:shadow-sm backdrop-blur dark:bg-slate-950/40 rounded-lg md:rounded-2xl">
                                    <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-slate-800/70">
                                        <Target className="mx-auto mb-0.5 md:mb-1 h-3.5 w-3.5 md:h-4 md:w-4 text-purple-600 dark:text-purple-300" />
                                        <p className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300">
                                            {formatNumberWithImpact(topics.length)} Topics
                                        </p>
                                    </div>
                                    <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-slate-800/70">
                                        <Medal className="mx-auto mb-0.5 md:mb-1 h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600 dark:text-amber-300" />
                                        <p className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300">
                                            {formatNumberWithImpact(totalQuestions)} Qs
                                        </p>
                                    </div>
                                    <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-slate-800/70">
                                        <Layers className="mx-auto mb-0.5 md:mb-1 h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600 dark:text-emerald-300" />
                                        <p className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300">All Years</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Search Bar - phone optimized */}
                        <div className="relative mt-4 md:mt-5">
                            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder={`Search ${formatNumberWithImpact(topics.length)} topics...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-white/90 py-3 md:py-4 pl-10 md:pl-12 pr-9 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 dark:border-slate-700 dark:bg-slate-800/90 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-purple-500 dark:focus:ring-purple-500/20"
                                autoComplete="off"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                                >
                                    <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                </button>
                            )}
                        </div>
                        {search && (
                            <p className="mt-1.5 md:mt-2 text-[10px] md:text-xs text-slate-500">
                                {filteredTopics.length} of {formatNumberWithImpact(topics.length)} topics found
                            </p>
                        )}
                    </div>
                </div>

                {/* Results - full width on mobile */}
                {loading ? (
                    <div className="grid gap-0 md:gap-3 px-3 md:px-0">
                        <TopicCardSkeleton />
                        <TopicCardSkeleton />
                        <TopicCardSkeleton />
                        <TopicCardSkeleton />
                        <TopicCardSkeleton />
                    </div>
                ) : (
                    <div className="grid gap-0 md:gap-3 px-3 md:px-0">
                        {displayedTopics.length === 0 ? (
                            <div className="md:rounded-2xl md:border-0 bg-white/70 p-6 md:p-8 text-center md:shadow-sm backdrop-blur dark:bg-muted/30">
                                <Search className="mx-auto mb-2 md:mb-3 h-7 w-7 md:h-8 md:w-8 text-slate-400" />
                                <p className="font-semibold text-sm md:text-base">No topics found</p>
                                <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">Try a different search term.</p>
                                <button onClick={() => setSearch("")} className="mt-2 md:mt-3 text-xs md:text-sm font-semibold text-purple-600 hover:text-purple-700">Clear search</button>
                            </div>
                        ) : (
                            <>
                                {displayedTopics.map((topic) => (
                                    <button
                                        key={topic.id}
                                        onClick={() => navigate(`/nursing/quiz/${topic.id}`)}
                                        className="group md:rounded-2xl md:border-0 bg-white/70 p-3 md:p-4 text-left md:shadow-sm backdrop-blur transition md:hover:shadow-md md:hover:-translate-y-0.5 dark:bg-muted/30 border-b border-slate-100 dark:border-slate-800 md:border-b-0"
                                    >
                                        <div className="flex items-start justify-between gap-3 md:gap-4">
                                            <div className="min-w-0 flex-1">
                                                {/* Badges */}
                                                <div className="mb-1.5 md:mb-2 flex flex-wrap items-center gap-1.5 md:gap-2">
                                                    <span className={`rounded-full px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-bold capitalize ring-1 ${difficultyStyles[topic.difficulty_level] || difficultyStyles.intro}`}>
                                                        {topic.difficulty_level || "intro"}
                                                    </span>
                                                    {topic.is_exam_favorite && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-bold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20">
                                                            <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-current" /> Exam favorite
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                                                        <HelpCircle className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                                        {formatNumberWithImpact(topic.question_count || 0)} Qs
                                                    </span>
                                                </div>

                                                {/* Title */}
                                                <h3 className="font-bold text-slate-950 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors text-sm md:text-base">
                                                    {topic.title}
                                                </h3>

                                                {/* Path */}
                                                <p className="mt-0.5 md:mt-1 text-[10px] md:text-xs text-slate-400">
                                                    <GraduationCap className="inline h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                                                    {topic.module_code && `${topic.module_code} · `}
                                                    {topic.unit_title} · {topic.year_name}
                                                </p>
                                            </div>

                                            {/* Quiz Button */}
                                            <div className="flex shrink-0 items-center gap-1.5 md:gap-2 rounded-full bg-purple-600 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold text-white shadow-lg shadow-purple-600/20 transition group-hover:bg-purple-700 group-hover:shadow-xl">
                                                <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                Quiz
                                                <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </>
                        )}

                        {/* Show more / less */}
                        {!search && !loading && topics.length > 50 && (
                            <div className="text-center pt-2">
                                <button
                                    onClick={() => setShowAll(!showAll)}
                                    className="inline-flex items-center gap-1.5 md:gap-2 rounded-full bg-white/70 px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-semibold text-purple-600 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md dark:bg-muted/30 dark:text-purple-300"
                                >
                                    {showAll ? "Show Less" : `Show All ${formatNumberWithImpact(topics.length)} Topics`}
                                    <ChevronRight className={`h-3.5 w-3.5 md:h-4 md:w-4 transition-transform ${showAll ? "rotate-90" : ""}`} />
                                </button>
                            </div>
                        )}

                        {!search && !loading && !showAll && topics.length > 50 && (
                            <p className="text-center text-[10px] md:text-xs text-slate-400">
                                Showing 50 of {formatNumberWithImpact(topics.length)} topics. Search or tap "Show All" to see more.
                            </p>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}