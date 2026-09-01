import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    BookOpenCheck,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    GraduationCap,
    HelpCircle,
    Loader2,
    Medal,
    Sparkles,
    Star,
    Target,
    Search,
    X,
    Filter,
    Zap,
} from "lucide-react";
import { getModuleUnits, getTopics } from "@/lib/nursingQueries";
import SuggestionBox from "@/components/curriculum/SuggestionBox";
import { playSound } from "@/lib/soundManager"; // Import sound manager
import { TermsButton } from "@/components/ui/TermsButton";
const difficultyStyles: Record<string, string> = {
    easy: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    medium:
        "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
    hard: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20",
};

// Vibration helper for tactile feedback
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

function UnitCardSkeleton() {
    return (
        <div className="overflow-hidden md:rounded-2xl md:border-0 bg-white/70 md:shadow-sm backdrop-blur dark:bg-muted/30 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
            <div className="flex w-full items-center justify-between gap-3 md:gap-4 p-4 md:p-5 text-left">
                <div className="flex min-w-0 items-center gap-3 md:gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-xl md:rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="min-w-0">
                        <div className="h-2.5 md:h-3 w-10 md:w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1 md:mb-1.5" />
                        <div className="h-6 md:h-7 w-40 md:w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-1 md:mb-1.5" />
                        <div className="h-3.5 md:h-4 w-20 md:w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                </div>
                <div className="shrink-0 h-8 w-8 md:h-9 md:w-9 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
        </div>
    );
}

function TopicSkeleton() {
    return (
        <div className="md:rounded-2xl md:border-0 bg-white p-3 md:p-4 md:shadow-sm dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3 md:gap-4">
                <div className="min-w-0">
                    <div className="mb-1.5 md:mb-2 flex flex-wrap items-center gap-1.5 md:gap-2">
                        <div className="h-5 md:h-6 w-14 md:w-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                        <div className="h-5 md:h-6 w-20 md:w-24 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                        <div className="h-5 md:h-6 w-10 md:w-12 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                    </div>
                    <div className="h-5 md:h-6 w-40 md:w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
                <div className="h-8 md:h-9 w-16 md:w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse shrink-0" />
            </div>
        </div>
    );
}

function UnitStatsSkeleton() {
    return (
        <div className="grid grid-cols-3 gap-2 md:gap-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg md:rounded-xl md:border-0 bg-white/70 p-2 md:p-3 text-center md:shadow-sm dark:bg-slate-950/40">
                    <div className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-3.5 md:h-4 w-10 md:w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
            ))}
        </div>
    );
}

export default function NursingUnit() {
    const { yearId, semId, moduleId } = useParams();
    const navigate = useNavigate();

    const [units, setUnits] = useState<any[]>([]);
    const [topicsMap, setTopicsMap] = useState<Record<string, any[]>>({});
    const [openUnit, setOpenUnit] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showOnlyExamFavorites, setShowOnlyExamFavorites] = useState(false);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

    useEffect(() => {
        if (!moduleId) return;
        setLoading(true);
        getModuleUnits(moduleId)
            .then((data) => { setUnits(data || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [moduleId]);

    const toggleUnit = async (unitId: string) => {
        tapFeedback("light");
        if (openUnit === unitId) { setOpenUnit(null); return; }
        setOpenUnit(unitId);
        if (!topicsMap[unitId]) {
            const topicData = await getTopics(unitId);
            setTopicsMap((prev) => ({ ...prev, [unitId]: topicData || [] }));
        }
    };

    const totalTopics = Object.values(topicsMap).flat().length;
    const totalQuestions = units.reduce((sum, u) => sum + (u.total_questions || 0), 0);

    const filteredUnits = useMemo(() => {
        if (!searchQuery.trim() && !showOnlyExamFavorites && selectedDifficulty === "all") return units;
        return units.filter(unit => {
            const topics = topicsMap[unit.id] || [];
            const unitMatches = unit.title.toLowerCase().includes(searchQuery.toLowerCase());
            const topicMatches = topics.some((topic: any) => topic.title.toLowerCase().includes(searchQuery.toLowerCase()));
            const hasExamFavorite = showOnlyExamFavorites ? topics.some((topic: any) => topic.is_exam_favorite) : true;
            const matchesDifficulty = selectedDifficulty === "all" ? true : topics.some((topic: any) => topic.difficulty_level?.toLowerCase() === selectedDifficulty);
            return (unitMatches || topicMatches) && hasExamFavorite && matchesDifficulty;
        });
    }, [units, topicsMap, searchQuery, showOnlyExamFavorites, selectedDifficulty]);

    const filteredTopicsMap = useMemo(() => {
        const result: Record<string, any[]> = {};
        filteredUnits.forEach(unit => {
            const topics = topicsMap[unit.id] || [];
            if (!searchQuery.trim() && !showOnlyExamFavorites && selectedDifficulty === "all") {
                result[unit.id] = topics;
            } else {
                result[unit.id] = topics.filter((topic: any) => {
                    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesExamFavorite = showOnlyExamFavorites ? topic.is_exam_favorite : true;
                    const matchesDifficulty = selectedDifficulty === "all" ? true : topic.difficulty_level?.toLowerCase() === selectedDifficulty;
                    return matchesSearch && matchesExamFavorite && matchesDifficulty;
                });
            }
        });
        return result;
    }, [filteredUnits, topicsMap, searchQuery, showOnlyExamFavorites, selectedDifficulty]);

    const filteredStats = useMemo(() => {
        let topics = 0;
        let questions = 0;
        let examFavorites = 0;
        filteredUnits.forEach(unit => {
            const unitTopics = topicsMap[unit.id] || [];
            topics += unitTopics.length;
            questions += unitTopics.reduce((sum: number, t: any) => sum + (t.question_count || 0), 0);
            examFavorites += unitTopics.filter((t: any) => t.is_exam_favorite).length;
        });
        return { topics, questions, examFavorites };
    }, [filteredUnits, topicsMap]);

    return (
        <div className="min-h-screen bg-transparent text-slate-950 dark:text-white pb-20 md:pb-6">
            <section className="mx-auto flex w-full md:max-w-full md:px-4 lg:px-6 flex-col gap-4 md:gap-6 px-0 md:px-4 py-4 md:py-6 lg:px-8">

                {/* Header Card - full width on mobile */}
                <div className="relative overflow-hidden md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-6 md:shadow-xl backdrop-blur-xl dark:bg-muted/30 sm:p-8 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                    <div className="absolute right-0 top-0 h-24 md:h-32 w-24 md:w-32 rounded-bl-full bg-emerald-100/80 dark:bg-emerald-400/10" />
                    <div className="absolute bottom-0 left-0 h-20 md:h-24 w-20 md:w-24 rounded-tr-full bg-cyan-100/80 dark:bg-cyan-400/10" />

                    <div className="relative">
                        <div className="mb-3 md:mb-4 flex items-center justify-between">
                            <button
                                onClick={() => {
                                    tapFeedback("light");
                                    navigate(`/nursing/${yearId}/${semId}`);
                                }}
                                className="inline-flex w-fit items-center gap-1.5 md:gap-2 rounded-full border-0 bg-white/70 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 dark:bg-muted/30 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-emerald-300 dark:focus:ring-emerald-500/20"
                            >
                                <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                Back to modules
                            </button>
                            <div className="inline-flex items-center gap-1 md:gap-2 rounded-full bg-emerald-100 px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                                <GraduationCap className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                Module learning room
                            </div>
                        </div>

                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">
                            Module units
                        </h1>
                        <p className="mt-2 md:mt-3 max-w-2xl text-xs md:text-sm lg:text-base leading-6 text-slate-600 dark:text-slate-300">
                            Open a unit, choose a topic, and jump straight into quiz practice when you are ready.
                        </p>

                        {/* Search Bar */}
                        <div className="mt-3 md:mt-4 space-y-2 md:space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="🔍 Search units, topics, or keywords..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        tapFeedback("light");
                                        setSearchQuery(e.target.value);
                                    }}
                                    className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-white/90 py-2.5 md:py-3 pl-10 md:pl-12 pr-10 md:pr-12 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 shadow-sm backdrop-blur transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800/90 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
                                    autoComplete="off"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            tapFeedback("light");
                                            setSearchQuery("");
                                        }}
                                        className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                                    >
                                        <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Filter chips */}
                            <div className="flex flex-wrap gap-1.5 md:gap-2">
                                <button
                                    onClick={() => {
                                        tapFeedback("success");
                                        setShowOnlyExamFavorites(!showOnlyExamFavorites);
                                    }}
                                    className={`inline-flex items-center gap-1 md:gap-1.5 rounded-full px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium transition ${showOnlyExamFavorites
                                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                        }`}
                                >
                                    <Star className={`h-3 w-3 md:h-3.5 md:w-3.5 ${showOnlyExamFavorites ? "fill-white" : ""}`} />
                                    Exam Favorites
                                </button>
                                <select
                                    value={selectedDifficulty}
                                    onChange={(e) => {
                                        tapFeedback("light");
                                        setSelectedDifficulty(e.target.value);
                                    }}
                                    className="rounded-full border-0 bg-slate-100 px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium text-slate-600 focus:ring-2 focus:ring-emerald-400 dark:bg-slate-800 dark:text-slate-300"
                                >
                                    <option value="all">All Difficulties</option>
                                    <option value="easy">🟢 Easy</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="hard">🔴 Hard</option>
                                </select>
                                {searchQuery && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                                        <Zap className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                        {filteredUnits.length} results
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        {loading ? (
                            <UnitStatsSkeleton />
                        ) : (
                            <div className="mt-4 md:mt-5 grid grid-cols-3 gap-2 md:gap-3">
                                <div className="rounded-lg md:rounded-xl md:border-0 bg-white/70 p-2 md:p-3 text-center md:shadow-sm dark:bg-slate-950/40">
                                    <BookOpenCheck className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 text-emerald-600 dark:text-emerald-300" />
                                    <p className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300">{filteredUnits.length} Units</p>
                                </div>
                                <div className="rounded-lg md:rounded-xl md:border-0 bg-white/70 p-2 md:p-3 text-center md:shadow-sm dark:bg-slate-950/40">
                                    <Target className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 text-cyan-600 dark:text-cyan-300" />
                                    <p className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300">{filteredStats.topics} Topics</p>
                                </div>
                                <div className="rounded-lg md:rounded-xl md:border-0 bg-white/70 p-2 md:p-3 text-center md:shadow-sm dark:bg-slate-950/40">
                                    <Medal className="mx-auto mb-0.5 md:mb-1 h-4 w-4 md:h-5 md:w-5 text-amber-600 dark:text-amber-300" />
                                    <p className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300">{filteredStats.questions} Quizzes</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Units List */}
                {loading ? (
                    <div className="grid gap-0 md:gap-4 px-3 md:px-0">
                        <UnitCardSkeleton />
                        <UnitCardSkeleton />
                        <UnitCardSkeleton />
                        <UnitCardSkeleton />
                    </div>
                ) : filteredUnits.length === 0 ? (
                    <div className="mx-3 md:mx-0 md:rounded-2xl md:border-0 bg-white/70 p-6 md:p-8 text-center md:shadow-sm backdrop-blur dark:bg-muted/30">
                        {searchQuery ? (
                            <>
                                <Search className="mx-auto mb-2 md:mb-3 h-7 w-7 md:h-8 md:w-8 text-slate-400" />
                                <p className="font-semibold text-sm md:text-base">No results found</p>
                                <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">Try adjusting your search or filters</p>
                                <button onClick={() => {
                                    tapFeedback("light");
                                    setSearchQuery("");
                                    setShowOnlyExamFavorites(false);
                                    setSelectedDifficulty("all");
                                }}
                                    className="mt-2 md:mt-3 text-xs md:text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                                    Clear all filters
                                </button>
                            </>
                        ) : (
                            <>
                                <ClipboardList className="mx-auto mb-2 md:mb-3 h-7 w-7 md:h-8 md:w-8 text-slate-400" />
                                <p className="font-semibold text-sm md:text-base">No units found for this module.</p>
                                <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">Units will appear here once they are added.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-0 md:gap-4 px-3 md:px-0">
                        {filteredUnits.map((unit, index) => {
                            const isOpen = openUnit === unit.id;
                            const topics = topicsMap[unit.id];
                            const isLoadingTopics = isOpen && !topics;
                            const filteredTopics = filteredTopicsMap[unit.id] || [];

                            return (
                                <div
                                    key={unit.id}
                                    className="overflow-hidden md:rounded-2xl md:border-0 bg-white/70 md:shadow-sm backdrop-blur transition md:hover:bg-white md:hover:shadow-xl dark:bg-muted/30 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-800 md:border-b-0"
                                >
                                    <button
                                        onClick={() => toggleUnit(unit.id)}
                                        className="flex w-full items-center justify-between gap-3 md:gap-4 p-4 md:p-5 text-left focus:outline-none focus:ring-4 focus:ring-inset focus:ring-emerald-200 dark:focus:ring-emerald-500/20"
                                    >
                                        <div className="flex min-w-0 items-center gap-3 md:gap-4">
                                            <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-600/20">
                                                <span className="text-base md:text-lg font-black">{index + 1}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] md:text-xs font-bold uppercase text-slate-400">Unit {index + 1}</p>
                                                <h2 className="line-clamp-2 text-base md:text-lg font-black text-slate-950 dark:text-white">{unit.title}</h2>
                                                <p className="mt-0.5 md:mt-1 text-[10px] md:text-xs text-slate-500 dark:text-slate-400">
                                                    <HelpCircle className="inline h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                                                    {unit.total_questions || 0} questions
                                                    {searchQuery && (
                                                        <span className="ml-1.5 md:ml-2 text-emerald-600 dark:text-emerald-400">• {filteredTopics.length} matches</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 rounded-full bg-slate-100 p-1.5 md:p-2 text-slate-500 transition dark:bg-slate-800 dark:text-slate-300">
                                            <ChevronDown className={`h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 ${isOpen ? "rotate-180 text-emerald-600" : ""}`} />
                                        </div>
                                    </button>

                                    <div className={`transition-all duration-300 ease-in-out ${isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
                                        <div className="border-t border-slate-200 bg-slate-50/70 p-3 md:p-4 dark:border-slate-800 dark:bg-slate-950/30">
                                            {isLoadingTopics ? (
                                                <div className="grid gap-2 md:gap-3">
                                                    <TopicSkeleton />
                                                    <TopicSkeleton />
                                                    <TopicSkeleton />
                                                </div>
                                            ) : filteredTopics.length === 0 ? (
                                                <div className="rounded-lg md:rounded-xl md:border-0 bg-white/70 p-3 md:p-4 text-xs md:text-sm text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                                                    {searchQuery || showOnlyExamFavorites || selectedDifficulty !== "all" ? "No topics match your filters in this unit." : "No topics yet. Add topics to this unit."}
                                                </div>
                                            ) : (
                                                <div className="grid gap-2 md:gap-3">
                                                    {filteredTopics.map((topic: any) => {
                                                        const difficulty = String(topic.difficulty_level || "").toLowerCase();
                                                        const difficultyClass = difficultyStyles[difficulty] || "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20";

                                                        return (
                                                            <div key={topic.id} className="group rounded-lg md:rounded-2xl md:border-0 bg-white p-3 md:p-4 md:shadow-sm transition md:hover:shadow-md dark:bg-slate-900">
                                                                <div className="flex items-start justify-between gap-3 md:gap-4">
                                                                    <div className="min-w-0">
                                                                        <div className="mb-1.5 md:mb-2 flex flex-wrap items-center gap-1.5 md:gap-2">
                                                                            <span className={`rounded-full px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-bold capitalize ring-1 ${difficultyClass}`}>{topic.difficulty_level || "Standard"}</span>
                                                                            {topic.is_exam_favorite && (
                                                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-bold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20">
                                                                                    <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-current" /> Exam favorite
                                                                                </span>
                                                                            )}
                                                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                                                                                <HelpCircle className="h-3 w-3 md:h-3.5 md:w-3.5" /> {topic.question_count || 0} Qs
                                                                            </span>
                                                                        </div>
                                                                        <h3 className="line-clamp-2 font-bold text-slate-950 dark:text-white text-sm md:text-base">{topic.title}</h3>
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            tapFeedback("success");
                                                                            navigate(`/nursing/quiz/${topic.id}`);
                                                                        }}
                                                                        className="inline-flex shrink-0 items-center gap-1.5 md:gap-2 rounded-full bg-emerald-600 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/20"
                                                                    >
                                                                        Quiz
                                                                        <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
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
                            );
                        })}
                    </div>
                )}

                {/* Bottom encouragement - full width on mobile */}
                <div className="flex items-center justify-center gap-1.5 md:gap-2 md:rounded-2xl md:border-0 bg-emerald-50/80 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-semibold text-emerald-700 md:shadow-sm backdrop-blur dark:bg-emerald-400/10 dark:text-emerald-300 mx-3 md:mx-0 rounded-lg md:rounded-2xl">
                    <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Small steps, strong nurse energy.
                </div>
            </section>
            <TermsButton />
        </div>
    );
}