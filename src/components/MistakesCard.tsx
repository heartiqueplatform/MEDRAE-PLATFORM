"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Users, Loader2, ChevronRight, X, BookOpen,
    Flame, ChevronLeft, BarChart3, Zap, Clock, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const CACHE_KEY = "top_mistakes_rpc_v2";
const CACHE_TTL = 1000 * 60 * 30; // 30 min client cache

const CARD_BACKGROUNDS = [
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=700&fit=crop",
    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=700&fit=crop",
    "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400&h=700&fit=crop",
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=700&fit=crop",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=700&fit=crop",
    "https://images.pexels.com/photos/32418225/pexels-photo-32418225.jpeg?w=400&h=700&fit=crop",
    "https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&h=700&fit=crop",
    "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&h=700&fit=crop",
    "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&h=700&fit=crop",
    "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=400&h=700&fit=crop",
];

// ═══════════════════════════════════════════════════════════════
// UTILS — compact number formatter (999 → 999, 1500 → 1.5K, 1.2M)
// ═══════════════════════════════════════════════════════════════
function formatCompact(n: number): string {
    if (n < 1000) return n.toString();

    if (n < 1_000_000) {
        const k = n / 1000;
        return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")}K`;
    }

    if (n < 1_000_000_000) {
        const m = n / 1_000_000;
        return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "")}M`;
    }

    const b = n / 1_000_000_000;
    return `${b % 1 === 0 ? b.toFixed(0) : b.toFixed(1).replace(/\.0$/, "")}B`;
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
type TopMistake = {
    rank: number;
    question_id: string;
    total_fails: number;
    unique_students: number;
    last_wrong_at: string | null;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    explanation: string | null;
    additional: string | null;
};

type GlobalStats = {
    total_questions: number;
    total_fails: number;
    total_students: number;
};

// ═══════════════════════════════════════════════════════════════
// STORY CARD — quiet, curiosity-driven, no CTAs
// ═══════════════════════════════════════════════════════════════
const StoryCard = ({
    item,
    index,
    onClick,
}: {
    item: TopMistake;
    index: number;
    onClick: () => void;
}) => {
    const bgImage = CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length];
    const rankEmoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 25 }}
            onClick={onClick}
            className="flex-shrink-0 w-[110px] sm:w-[130px] md:w-[150px] snap-start cursor-pointer group"
        >
            <div className="relative rounded-xl overflow-hidden shadow-none transition-all duration-300  h-[190px] md:h-[210px]">
                <img
                    src={bgImage}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                />

                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black" />

                {/* Rank */}
                <div className="absolute top-2 left-2">
                    {rankEmoji ? (
                        <span className="text-2xl drop-shadow-lg">{rankEmoji}</span>
                    ) : (
                        <span className="text-[10px] font-semibold text-white/90 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                            {index + 1}
                        </span>
                    )}
                </div>

                {/* Failure count badge */}
                <div className="absolute top-2 right-2">
                    <span className="text-[10px] font-bold text-white bg-red-500/85 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-lg">
                        {formatCompact(item.total_fails)}×
                    </span>
                </div>

                {/* Bottom content */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-[10px] text-white/75 font-normal line-clamp-2 mb-2 leading-snug">
                        {item.question_text?.slice(0, 60)}…
                    </p>

                    <div className="flex items-center gap-1.5 mb-2">
                        <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-full px-2 py-0.5">
                            <Users size={8} className="text-white/80" />
                            <span className="text-[9px] font-semibold text-white">
                                {formatCompact(item.unique_students)}
                            </span>
                        </div>
                        {item.last_wrong_at && (
                            <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-full px-2 py-0.5">
                                <Clock size={8} className="text-white/80" />
                                <span className="text-[9px] font-semibold text-white">
                                    {formatDistanceToNow(new Date(item.last_wrong_at), { addSuffix: false })}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Quiet arrow — silent affordance */}
                    <div className="flex items-center justify-end">
                        <ChevronRight
                            size={12}
                            className="text-white/60 group-hover:text-white/90 group-hover:translate-x-0.5 transition-all"
                        />
                    </div>
                </div>


            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════
const StorySkeleton = () => (
    <div className="flex-shrink-0 w-[110px] sm:w-[130px] md:w-[150px] snap-start">
        <div className="rounded-2xl bg-gray-200 dark:bg-[#161b22] h-[190px] md:h-[210px] animate-pulse" />
    </div>
);

// ═══════════════════════════════════════════════════════════════
// DETAIL OVERLAY — lesson framing, warm language
// ═══════════════════════════════════════════════════════════════
const DetailOverlay = ({
    item,
    index,
    total,
    onClose,
    onPrev,
    onNext,
    students,
    loadingStudents,
}: {
    item: TopMistake;
    index: number;
    total: number;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    students: any[];
    loadingStudents: boolean;
}) => {
    const avgPerStudent = Math.round(
        item.total_fails / Math.max(item.unique_students, 1)
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-white dark:bg-[#0d1117]"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="h-full overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d1117]/80 backdrop-blur-xl">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button
                            onClick={onClose}
                            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#161b22] transition-colors"
                        >
                            <X size={20} className="text-gray-600 dark:text-gray-400" />
                        </button>

                        <span className="text-xs font-normal text-gray-500 dark:text-gray-500">
                            {index + 1} of {total}
                        </span>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={onPrev}
                                disabled={index === 0}
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#161b22] transition-colors disabled:opacity-30"
                            >
                                <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
                            </button>
                            <button
                                onClick={onNext}
                                disabled={index === total - 1}
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#161b22] transition-colors disabled:opacity-30"
                            >
                                <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto px-4 pb-24">
                    {/* Hero */}
                    <div className="py-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <Sparkles size={14} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                A lesson worth knowing
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="bg-gray-50 dark:bg-[#161b22] rounded-2xl p-4">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatCompact(item.total_fails)}
                                </p>
                                <p className="text-[11px] font-normal text-gray-500 dark:text-gray-500 mt-1">
                                    Attempts that missed
                                </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#161b22] rounded-2xl p-4">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatCompact(item.unique_students)}
                                </p>
                                <p className="text-[11px] font-normal text-gray-500 dark:text-gray-500 mt-1">
                                    Students stumbled here
                                </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#161b22] rounded-2xl p-4">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {avgPerStudent}×
                                </p>
                                <p className="text-[11px] font-normal text-gray-500 dark:text-gray-500 mt-1">
                                    Average repeats
                                </p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/15 dark:to-orange-900/15 rounded-2xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <Flame size={18} className="text-orange-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        A question worth a second look
                                    </p>
                                    <p className="text-xs font-normal text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                                        You're in good company — a lot of students have paused here.
                                        Understanding it once can save you every time it comes back.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Question */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen size={14} className="text-blue-600 dark:text-blue-400" />
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-500">
                                The question
                            </span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
                            {item.question_text}
                        </p>
                    </div>

                    {/* Options */}
                    <div className="space-y-2 mb-8">
                        {[
                            { key: "A", text: item.option_a },
                            { key: "B", text: item.option_b },
                            { key: "C", text: item.option_c },
                            { key: "D", text: item.option_d },
                        ].map(({ key, text }) => {
                            const isCorrect = key === item.correct_answer;
                            return (
                                <div
                                    key={key}
                                    className={`flex items-start gap-3 p-4 rounded-2xl transition-all ${isCorrect
                                        ? "bg-green-50 dark:bg-green-900/20"
                                        : "bg-gray-50 dark:bg-[#161b22]"
                                        }`}
                                >
                                    <div
                                        className={`h-7 w-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${isCorrect
                                            ? "bg-green-500 text-white"
                                            : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                            }`}
                                    >
                                        {key}
                                    </div>
                                    <span
                                        className={`text-sm font-normal leading-relaxed ${isCorrect
                                            ? "text-green-700 dark:text-green-400"
                                            : "text-gray-700 dark:text-gray-300"
                                            }`}
                                    >
                                        {text}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Explanation */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap size={14} className="text-amber-500" />
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-500">
                                Why this answer
                            </span>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5">
                            <p className="text-sm font-normal text-gray-700 dark:text-gray-300 leading-relaxed">
                                {item.explanation || "No explanation available for this question."}
                            </p>
                            {item.additional && (
                                <p className="mt-3 pt-3 border-t border-blue-200/50 dark:border-blue-800/50 text-xs font-normal text-blue-700/70 dark:text-blue-300/70 italic leading-relaxed">
                                    {item.additional}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Students */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-gray-500" />
                                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-500">
                                    Others who paused here
                                </span>
                            </div>
                            <span className="text-xs font-normal text-gray-400">
                                {formatCompact(item.unique_students)}
                            </span>
                        </div>

                        {loadingStudents ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-blue-600" size={24} />
                            </div>
                        ) : students.length > 0 ? (
                            <div className="space-y-2">
                                {students.map((s, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#161b22] rounded-xl"
                                    >
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={s.profile?.avatar_url || "/UsersAvatar.jpg"} />
                                            <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium">
                                                {s.profile?.name?.[0] || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {s.profile?.name || "Anonymous"}
                                            </p>
                                            <p className="text-[11px] font-normal text-gray-500 dark:text-gray-500">
                                                {s.profile?.institution || "Medical Student"}
                                            </p>
                                        </div>
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                                            {formatCompact(s.times_wrong)}×
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center py-8 text-sm font-normal text-gray-400">
                                No student data available
                            </p>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export function MistakesCard() {
    const [top, setTop] = useState<TopMistake[]>([]);
    const [stats, setStats] = useState<GlobalStats>({
        total_questions: 0,
        total_fails: 0,
        total_students: 0,
    });
    const [loading, setLoading] = useState(true);

    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    const isMounted = useRef(true);
    const hasFetched = useRef(false);
    const studentsCache = useRef<Map<string, any[]>>(new Map());

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const fetchData = useCallback(async () => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { top: cachedTop, stats: cachedStats, ts } = JSON.parse(cached);
                if (Date.now() - ts < CACHE_TTL && cachedTop?.length > 0) {
                    setTop(cachedTop);
                    setStats(cachedStats);
                    setLoading(false);
                    return;
                }
            }
        } catch {
            /* ignore */
        }

        try {
            const [topRes, statsRes] = await Promise.all([
                supabase.rpc("get_top_failed_questions"),
                supabase.rpc("get_mistakes_global_stats"),
            ]);

            if (topRes.error) console.error("top_mistakes RPC error:", topRes.error);
            if (statsRes.error) console.error("global_stats RPC error:", statsRes.error);

            const topData: TopMistake[] = topRes.data || [];
            const statsRow = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data;

            const statsData: GlobalStats = {
                total_questions: Number(statsRow?.total_questions ?? 0),
                total_fails: Number(statsRow?.total_fails ?? 0),
                total_students: Number(statsRow?.total_students ?? 0),
            };

            if (isMounted.current) {
                setTop(topData);
                setStats(statsData);
                setLoading(false);

                try {
                    localStorage.setItem(
                        CACHE_KEY,
                        JSON.stringify({ top: topData, stats: statsData, ts: Date.now() })
                    );
                } catch {
                    /* ignore */
                }
            }
        } catch (err) {
            console.error("Error fetching mistakes:", err);
            if (isMounted.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const fetchStudents = useCallback(async (questionId: string) => {
        const cached = studentsCache.current.get(questionId);
        if (cached) {
            setStudents(cached);
            return;
        }

        setLoadingStudents(true);
        setStudents([]);

        try {
            const { data: mistakes, error } = await supabase
                .from("user_mistakes")
                .select(`
          user_id,
          times_wrong,
          profiles (
            name,
            institution,
            avatar_url
          )
        `)
                .eq("question_id", questionId)
                .order("times_wrong", { ascending: false })
                .limit(15);

            if (!error && mistakes && isMounted.current) {
                const mapped = mistakes.map((m: any) => ({
                    ...m,
                    profile: m.profiles,
                }));
                studentsCache.current.set(questionId, mapped);
                setStudents(mapped);
            }
        } catch (err) {
            console.error("Error fetching students:", err);
        } finally {
            if (isMounted.current) setLoadingStudents(false);
        }
    }, []);

    const handleCardClick = (index: number) => {
        setSelectedIndex(index);
        fetchStudents(top[index].question_id);
    };

    const handlePrev = () => {
        if (selectedIndex !== null && selectedIndex > 0) {
            const i = selectedIndex - 1;
            setSelectedIndex(i);
            fetchStudents(top[i].question_id);
        }
    };

    const handleNext = () => {
        if (selectedIndex !== null && selectedIndex < top.length - 1) {
            const i = selectedIndex + 1;
            setSelectedIndex(i);
            fetchStudents(top[i].question_id);
        }
    };

    const handleClose = () => {
        setSelectedIndex(null);
        setStudents([]);
    };

    return (
        <>
            <AnimatePresence>
                {selectedIndex !== null && top[selectedIndex] && (
                    <DetailOverlay
                        item={top[selectedIndex]}
                        index={selectedIndex}
                        total={top.length}
                        onClose={handleClose}
                        onPrev={handlePrev}
                        onNext={handleNext}
                        students={students}
                        loadingStudents={loadingStudents}
                    />
                )}
            </AnimatePresence>

            <Card className="bg-white dark:bg-[#0d1117] border-0 shadow-none rounded-xl md:rounded-xl overflow-hidden">
                <CardContent className="p-4 md:p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Flame size={20} className="text-orange-500" />
                                Questions worth revisiting
                            </h2>

                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#161b22] rounded-full px-3 py-1.5">
                                <BarChart3 size={12} className="text-blue-600" />
                                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                    {formatCompact(stats.total_fails)} attempts
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Story cards row */}
                    <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => <StorySkeleton key={i} />)
                        ) : top.length === 0 ? (
                            <div className="w-full text-center py-12 text-sm font-normal text-gray-400">
                                No data available yet.
                            </div>
                        ) : (
                            top.map((item, i) => (
                                <StoryCard
                                    key={item.question_id}
                                    item={item}
                                    index={i}
                                    onClick={() => handleCardClick(i)}
                                />
                            ))
                        )}
                    </div>

                    {/* Global stats */}
                    {!loading && top.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {formatCompact(stats.total_questions)}
                                    </p>
                                    <p className="text-[11px] font-normal text-gray-500 dark:text-gray-500">
                                        Questions tracked
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {formatCompact(stats.total_fails)}
                                    </p>
                                    <p className="text-[11px] font-normal text-gray-500 dark:text-gray-500">
                                        Attempts that missed
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {formatCompact(stats.total_students)}
                                    </p>
                                    <p className="text-[11px] font-normal text-gray-500 dark:text-gray-500">
                                        Students learning
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}