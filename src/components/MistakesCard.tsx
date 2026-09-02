"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, AlertTriangle, Loader2, ChevronRight, CheckCircle, ArchiveRestore, X, BookOpen, UserX, TrendingUp, Clock, Eye, PlusCircle, ChevronLeft, Flame, Zap, BarChart3, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { GlobalLoader } from "@/components/GlobalLoader";

// Skeleton Loader for the small cards - Add this after your imports
const CardSkeleton = () => (
    <div className="flex-shrink-0 w-[120px] sm:w-[140px] md:w-[160px] snap-start">
        <div className="rounded-xl border-0  bg-white dark:bg-gray-900 shadow-md p-2 h-[180px] md:h-[200px] flex flex-col animate-pulse">
            {/* Rank Badge Skeleton */}
            <div className="flex items-center justify-between mb-0.5">
                <div className="h-5 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Question Number Skeleton */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
            </div>

            {/* Stats Skeleton */}
            <div className="space-y-1 mt-auto">
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-md px-1.5 py-1">
                    <div className="flex items-center gap-1">
                        <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                    <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-md px-1.5 py-1">
                    <div className="flex items-center gap-1">
                        <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                    <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>

            {/* Footer Skeleton */}
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                <div className="h-2 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex items-center gap-0.5">
                    <div className="h-2 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
        </div>
    </div>
);
const PAGE_SIZE = 20;

// Cache keys with versioning
const MISTAKES_CACHE_KEY = "mistakesData_v6";
const MISTAKES_VERSION_KEY = "mistakesDataVersion_v6";
const HIDDEN_IDS_KEY = "hiddenMistakeQuestions_v6";
const STUDENT_COUNTS_KEY = "studentCounts_v6";

// Helper to check if data has changed
async function checkForChanges(): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from("user_mistakes")
            .select("last_wrong_at")
            .order("last_wrong_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) return false;

        const currentVersion = data?.last_wrong_at || "no_data";
        const cachedVersion = localStorage.getItem(MISTAKES_VERSION_KEY);

        if (cachedVersion !== currentVersion) {
            localStorage.setItem(MISTAKES_VERSION_KEY, currentVersion);
            return true;
        }
        return false;
    } catch (err) { return false; }
}

// Cache helpers
const getCachedData = (key: string) => {
    try {
        const cached = localStorage.getItem(key);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (e) { }
    return null;
};

const setCachedData = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) { }
};

// Full-screen overlay component - edge to edge on mobile
const FullScreenOverlay = ({
    item,
    onClose,
    selectedStudents,
    loadingStudents,
    openDetails,
    currentIndex,
    totalItems,
    onPrevious,
    onNext,
    onLoadMore,
    hasMore,
    loadingMore
}: {
    item: any;
    onClose: () => void;
    selectedStudents: any[];
    loadingStudents: boolean;
    openDetails: (id: string) => void;
    currentIndex: number;
    totalItems: number;
    onPrevious: () => void;
    onNext: () => void;
    onLoadMore: () => void;
    hasMore: boolean;
    loadingMore: boolean;
}) => {
    const q = item?.quiz_questions;
    if (!q) return null;

    const isAtEnd = currentIndex === totalItems - 1;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 flex items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative bg-white dark:bg-gray-900 w-full h-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button - Fixed position */}
                <button
                    onClick={onClose}
                    className="fixed top-4 right-4 z-[99999] p-2.5 bg-gray-100/90 dark:bg-gray-800/90 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors shadow-lg backdrop-blur-sm"
                >
                    <X size={22} className="text-gray-700 dark:text-gray-300" />
                </button>

                {/* Navigation Buttons - Fixed position */}
                <div className="fixed left-4 top-1/2 -translate-y-1/2 z-[99999]">
                    <button
                        onClick={(e) => { e.stopPropagation(); onPrevious(); }}
                        disabled={currentIndex === 0}
                        className={`p-3 rounded-full shadow-lg backdrop-blur-sm transition-all ${currentIndex === 0
                            ? 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100/90 dark:bg-gray-800/90 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                    >
                        <ChevronLeft size={24} />
                    </button>
                </div>

                <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[99999]">
                    {isAtEnd && hasMore ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); onLoadMore(); }}
                            disabled={loadingMore}
                            className="p-3 rounded-full shadow-lg backdrop-blur-sm transition-all bg-blue-500 hover:bg-blue-600 text-white"
                        >
                            {loadingMore ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <PlusCircle size={24} />
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onNext(); }}
                            disabled={currentIndex === totalItems - 1 && !hasMore}
                            className={`p-3 rounded-full shadow-lg backdrop-blur-sm transition-all ${currentIndex === totalItems - 1 && !hasMore
                                ? 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100/90 dark:bg-gray-800/90 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}
                </div>

                {/* Counter / Load More Status */}
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[99999] bg-gray-900/80 dark:bg-gray-800/90 text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm flex items-center gap-3">
                    <span>{currentIndex + 1} / {totalItems}</span>
                    {isAtEnd && hasMore && !loadingMore && (
                        <span className="text-blue-400 text-xs animate-pulse">• Load more available</span>
                    )}
                    {loadingMore && (
                        <span className="text-blue-400 text-xs animate-pulse">• Loading more...</span>
                    )}
                    {!hasMore && totalItems > 0 && (
                        <span className="text-green-400 text-xs">✓ All loaded</span>
                    )}
                </div>

                {/* Desktop: Three-column layout */}
                <div className="hidden lg:grid grid-cols-12 h-full">
                    {/* Left Panel: Question with Answers */}
                    <div className="col-span-4 border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-6 bg-white dark:bg-gray-900 hide-scrollbar">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-orange-500" />
                                <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">Question</h3>
                            </div>

                            <p className="text-lg font-bold text-gray-900 dark:text-white leading-relaxed">
                                {q.question_text}
                            </p>

                            <div className="space-y-2 mt-4">
                                {["A", "B", "C", "D"].map((key) => {
                                    const isCorrect = key === q.correct_answer;
                                    return (
                                        <div
                                            key={key}
                                            className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${isCorrect
                                                ? "bg-green-50 dark:bg-green-900/20 border-green-500"
                                                : "bg-gray-50 dark:bg-gray-800/40 border-transparent"
                                                }`}
                                        >
                                            <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${isCorrect ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                                                }`}>
                                                {key}
                                            </div>
                                            <span className={`text-sm font-medium ${isCorrect ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"}`}>
                                                {q[`option_${key.toLowerCase()}`]}
                                            </span>
                                            {isCorrect && <CheckCircle size={16} className="ml-auto text-green-500 shrink-0" />}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                                <p className="text-[10px] text-gray-400">
                                    Last attempted: {item.lastWrong ? formatDistanceToNow(new Date(item.lastWrong)) + " ago" : "N/A"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Center Panel: Explanation */}
                    <div className="col-span-5 p-6 overflow-y-auto bg-white dark:bg-gray-900 hide-scrollbar">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <BookOpen size={16} className="text-blue-600" />
                                <span className="font-bold">Explanation & Rationale</span>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/50">
                                <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                                    {q.explanation || "No explanation available for this question."}
                                </p>
                                {q.additional && (
                                    <div className="mt-3 pt-3 border-t border-blue-200/50 dark:border-blue-800/50">
                                        <p className="text-blue-800/70 dark:text-blue-300/70 text-xs italic">
                                            <strong>Additional Context:</strong> {q.additional}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-500">Total Failures</p>
                                    <p className="text-lg font-black text-red-600">{item.totalFails || 0}×</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-500">Unique Students</p>
                                    <p className="text-lg font-black text-blue-600">{item.uniqueStudents || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Failed Students */}
                    <div className="col-span-3 border-l border-gray-200 dark:border-gray-800 overflow-y-auto p-4 bg-gray-50/50 dark:bg-gray-800/20 hide-scrollbar">
                        <div className="flex items-center gap-2 mb-4 sticky top-0 bg-gray-50/50 dark:bg-gray-800/20 py-2 z-10">
                            <UserX size={16} className="text-red-500" />
                            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">Students Who Failed</h3>
                            <span className="ml-auto text-xs text-gray-400">{selectedStudents.length}</span>
                        </div>
                        <div className="space-y-2">
                            {loadingStudents ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="animate-spin text-blue-600" size={24} />
                                </div>
                            ) : selectedStudents.length > 0 ? (
                                selectedStudents.slice(0, 15).map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-red-200 transition-all">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={s.profile?.avatar_url || "/UsersAvatar.jpg"} />
                                            <AvatarFallback className="bg-red-50 text-red-600 text-xs">
                                                {s.profile?.name?.[0] || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate">{s.profile?.name || "Anonymous"}</p>
                                            <p className="text-[9px] text-gray-400">{s.times_wrong}× Failed</p>
                                        </div>
                                        <Badge className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[9px] px-1.5">
                                            {s.times_wrong}×
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    <Users size={24} className="mx-auto mb-2 opacity-50" />
                                    <p>No student data</p>
                                </div>
                            )}
                            {selectedStudents.length > 15 && (
                                <button
                                    onClick={() => openDetails(item.question_id)}
                                    className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-2 hover:underline w-full text-center"
                                >
                                    View all {selectedStudents.length} students →
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile: Vertical scrolling layout */}
                <div className="lg:hidden h-full overflow-y-auto hide-scrollbar">
                    <div className="p-4 space-y-4 pb-24">
                        {/* Question Section */}
                        <div className="bg-white dark:bg-gray-800/30 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp size={16} className="text-orange-500" />
                                <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">Question</h3>
                            </div>
                            <p className="text-base font-bold text-gray-900 dark:text-white leading-relaxed">
                                {q.question_text}
                            </p>

                            {/* Answers - All 4 options */}
                            <div className="mt-3 space-y-1.5">
                                {["A", "B", "C", "D"].map((key) => {
                                    const isCorrect = key === q.correct_answer;
                                    return (
                                        <div
                                            key={key}
                                            className={`flex items-start gap-2.5 p-2 rounded-lg border ${isCorrect
                                                ? "bg-green-50 dark:bg-green-900/20 border-green-400"
                                                : "bg-gray-50 dark:bg-gray-800/40 border-transparent"
                                                }`}
                                        >
                                            <div className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${isCorrect ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                                                }`}>
                                                {key}
                                            </div>
                                            <span className={`text-xs font-medium ${isCorrect ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"}`}>
                                                {q[`option_${key.toLowerCase()}`]}
                                            </span>
                                            {isCorrect && <CheckCircle size={14} className="ml-auto text-green-500 shrink-0" />}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Stats mini */}
                            <div className="grid grid-cols-2 gap-2 mt-3">
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                                    <p className="text-[8px] text-gray-500">Failures</p>
                                    <p className="text-sm font-black text-red-600">{item.totalFails || 0}×</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                                    <p className="text-[8px] text-gray-500">Students</p>
                                    <p className="text-sm font-black text-blue-600">{item.uniqueStudents || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Explanation Section */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50">
                            <div className="flex items-center gap-2 mb-2">
                                <BookOpen size={14} className="text-blue-600" />
                                <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400">Explanation</h4>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {q.explanation || "No explanation available."}
                            </p>
                            {q.additional && (
                                <p className="mt-2 text-xs text-blue-800/70 dark:text-blue-300/70 italic">
                                    <strong>Note:</strong> {q.additional}
                                </p>
                            )}
                        </div>

                        {/* Attempted Students Section */}
                        <div className="bg-white dark:bg-gray-800/30 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-2 mb-3">
                                <UserX size={14} className="text-red-500" />
                                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Students Who Failed</h4>
                                <span className="ml-auto text-xs text-gray-400">{selectedStudents.length}</span>
                            </div>
                            <div className="space-y-2">
                                {loadingStudents ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="animate-spin text-blue-600" size={20} />
                                    </div>
                                ) : selectedStudents.length > 0 ? (
                                    selectedStudents.slice(0, 5).map((s, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={s.profile?.avatar_url || "/UsersAvatar.jpg"} />
                                                <AvatarFallback className="bg-red-50 text-red-600 text-[10px]">
                                                    {s.profile?.name?.[0] || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{s.profile?.name || "Anonymous"}</p>
                                                <p className="text-[8px] text-gray-400">{s.times_wrong}× Failed</p>
                                            </div>
                                            <Badge className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[8px] px-1.5">
                                                {s.times_wrong}×
                                            </Badge>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center py-4 text-gray-400 text-xs">No students have failed this question</p>
                                )}
                                {selectedStudents.length > 5 && (
                                    <button
                                        onClick={() => openDetails(item.question_id)}
                                        className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline w-full text-center mt-2"
                                    >
                                        View all {selectedStudents.length} students →
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export function MistakesCard() {
    const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
        if (typeof window === "undefined") return [];
        const saved = localStorage.getItem(HIDDEN_IDS_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const [data, setData] = useState<any[]>(() => {
        if (typeof window !== "undefined") {
            return getCachedData(MISTAKES_CACHE_KEY) || [];
        }
        return [];
    });
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [openStudentsDialog, setOpenStudentsDialog] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const fetchInProgress = useRef(false);
    const lastFetchTime = useRef(0);
    const MIN_FETCH_INTERVAL = 43200000; // 12 hours
    const [studentCounts, setStudentCounts] = useState<Record<string, number>>(() => {
        if (typeof window !== "undefined") {
            return getCachedData(STUDENT_COUNTS_KEY) || {};
        }
        return {};
    });
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [totalFailedAttempts, setTotalFailedAttempts] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Calculate totals
    useEffect(() => {
        let total = 0;
        let attempts = 0;
        data.forEach(item => {
            total += 1;
            attempts += item.totalFails || 0;
        });
        setTotalQuestions(total);
        setTotalFailedAttempts(attempts);
    }, [data]);

    // Fetch mistakes function
    const fetchMistakes = useCallback(async (forceRefresh = false, isLoadMore = false) => {
        if (!isMounted.current) return;

        const now = Date.now();
        if (!forceRefresh && !isLoadMore && now - lastFetchTime.current < MIN_FETCH_INTERVAL && page === 0) {
            return;
        }

        if (fetchInProgress.current) return;

        fetchInProgress.current = true;
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const from = 0;
            const to = 9999;
            const { data: mistakes, error } = await supabase
                .from("user_mistakes")
                .select(`
        user_id,
        question_id,
        times_wrong,
        last_wrong_at,
        quiz_questions (
            id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer,
            explanation,
            additional
        )
    `);

            if (error || !mistakes) {
                if (isMounted.current) setHasMore(false);
                return;
            }
            if (mistakes.length === 0) {
                if (isMounted.current) setHasMore(false);
                return;
            }

            // Aggregate mistakes by question
            const questionMap = {};
            const newStudentCounts = {};

            for (const m of mistakes) {
                if (!questionMap[m.question_id]) {
                    questionMap[m.question_id] = {
                        totalFails: 0,
                        uniqueStudentIds: new Set(),
                        lastWrong: m.last_wrong_at,
                        quiz_questions: m.quiz_questions,
                    };
                }
                // ✅ Ensure we're adding unique user IDs correctly
                if (m.user_id) {
                    questionMap[m.question_id].uniqueStudentIds.add(m.user_id);
                }
                questionMap[m.question_id].totalFails += m.times_wrong || 1;
                if (new Date(m.last_wrong_at) > new Date(questionMap[m.question_id].lastWrong)) {
                    questionMap[m.question_id].lastWrong = m.last_wrong_at;
                }
            }
            const merged = Object.entries(questionMap).map(([question_id, val]) => {
                newStudentCounts[question_id] = val.uniqueStudentIds.size;
                return {
                    question_id,
                    totalFails: val.totalFails,
                    uniqueStudents: val.uniqueStudentIds.size,
                    lastWrong: val.lastWrong,
                    quiz_questions: val.quiz_questions,
                };
            });
            merged.sort((a, b) => {
                if (b.uniqueStudents !== a.uniqueStudents) {
                    return b.uniqueStudents - a.uniqueStudents;
                }

                // If same number of students, use total failures only as a tie-breaker
                return b.totalFails - a.totalFails;
            });
            if (isMounted.current) {
                setStudentCounts(prev => {
                    const updated = { ...prev, ...newStudentCounts };
                    setCachedData(STUDENT_COUNTS_KEY, updated);
                    return updated;
                });

                setData(prev => {
                    const existingIds = new Set(prev.map(item => item.question_id));
                    const newItems = merged.filter(item => !existingIds.has(item.question_id));
                    let updatedData = merged;
                    if (updatedData.length > 200) updatedData = updatedData.slice(0, 200);
                    setCachedData(MISTAKES_CACHE_KEY, updatedData);
                    return updatedData;
                });
                setHasMore(false);
                lastFetchTime.current = now;
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            if (isMounted.current) {
                if (isLoadMore) {
                    setLoadingMore(false);
                } else {
                    setLoading(false);
                    setIsRefreshing(false);
                }
            }
            fetchInProgress.current = false;
        }
    }, [page]);

    // Open details function
    const openDetails = useCallback(async (questionId: string) => {
        if (!isMounted.current) return;

        setLoadingStudents(true);

        try {
            const cachedKey = `student_details_v5_${questionId}`;
            const cached = getCachedData(cachedKey);
            if (cached) {
                setSelectedStudents(cached);
                setOpenStudentsDialog(true);
                setLoadingStudents(false);
                return;
            }

            const { data: mistakes, error } = await supabase
                .from("user_mistakes")
                .select(`
                    user_id,
                    times_wrong,
                    last_wrong_at,
                    profiles (
                        name,
                        institution,
                        avatar_url
                    )
                `)
                .eq("question_id", questionId)
                .order("last_wrong_at", { ascending: false })
                .limit(20);

            if (error || !mistakes) {
                setSelectedStudents([]);
                setOpenStudentsDialog(true);
                return;
            }

            const userIds = mistakes.map((m) => m.user_id);

            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, name, institution, avatar_url")
                .in("user_id", userIds)
                .limit(20);

            const merged = mistakes.map((m) => ({
                ...m,
                profile: profiles?.find((p) => p.user_id === m.user_id),
            }));

            if (isMounted.current) {
                setSelectedStudents(merged);
                setOpenStudentsDialog(true);
                setCachedData(cachedKey, merged);

                setStudentCounts((prev) => {
                    const uniqueStudentCount = new Set(
                        merged.map((student) => student.user_id).filter(Boolean)
                    ).size;

                    const updated = {
                        ...prev,
                        [questionId]: uniqueStudentCount
                    };

                    setCachedData(STUDENT_COUNTS_KEY, updated);
                    return updated;
                });
            }
        } catch (err) {
            console.error("Error fetching student details:", err);
        } finally {
            if (isMounted.current) {
                setLoadingStudents(false);
            }
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchMistakes();
    }, [fetchMistakes]);

    // Smart refresh when tab becomes visible
    useEffect(() => {
        let visibilityTimeout: NodeJS.Timeout;
        const handleVisibilityChange = async () => {
            if (document.hidden || !isMounted.current || isRefreshing) return;

            const lastCheck = localStorage.getItem("last_mistakes_sync_v5");
            const now = Date.now();

            if (lastCheck && (now - parseInt(lastCheck)) < 43200000) return;

            const hasChanges = await checkForChanges();
            if (hasChanges) {
                setIsRefreshing(true);
                fetchMistakes(true);
            }
            localStorage.setItem("last_mistakes_sync_v5", now.toString());
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (visibilityTimeout) clearTimeout(visibilityTimeout);
        };
    }, [fetchMistakes, isRefreshing]);

    const visibleData = data.filter((item) => !hiddenIds.includes(item.question_id));

    // Handle card click - open full screen overlay
    const handleCardClick = async (item: any, index: number) => {
        setSelectedItem(item);
        setCurrentIndex(index);
        setShowOverlay(true);

        // Fetch students for this question
        if (item.question_id) {
            const cachedKey = `student_details_v5_${item.question_id}`;
            const cached = getCachedData(cachedKey);
            if (cached) {
                setSelectedStudents(cached);
            } else {
                setLoadingStudents(true);
                try {
                    const { data: mistakes, error } = await supabase
                        .from("user_mistakes")
                        .select(`
                            user_id,
                            times_wrong,
                            last_wrong_at,
                            profiles (
                                name,
                                institution,
                                avatar_url
                            )
                        `)
                        .eq("question_id", item.question_id)
                        .order("last_wrong_at", { ascending: false })
                        .limit(20);

                    if (!error && mistakes) {
                        const userIds = mistakes.map((m) => m.user_id);
                        const { data: profiles } = await supabase
                            .from("profiles")
                            .select("user_id, name, institution, avatar_url")
                            .in("user_id", userIds)
                            .limit(20);

                        const merged = mistakes.map((m) => ({
                            ...m,
                            profile: profiles?.find((p) => p.user_id === m.user_id),
                        }));
                        setSelectedStudents(merged);
                        setCachedData(cachedKey, merged);
                    }
                } catch (err) {
                    console.error("Error fetching students:", err);
                } finally {
                    setLoadingStudents(false);
                }
            }
        }
    };

    // Navigation handlers
    const handlePrevious = () => {
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setCurrentIndex(newIndex);
            setSelectedItem(visibleData[newIndex]);
            // Fetch students for new item
            const item = visibleData[newIndex];
            if (item?.question_id) {
                const cachedKey = `student_details_v5_${item.question_id}`;
                const cached = getCachedData(cachedKey);
                if (cached) {
                    setSelectedStudents(cached);
                } else {
                    setLoadingStudents(true);
                    (async () => {
                        try {
                            const { data: mistakes, error } = await supabase
                                .from("user_mistakes")
                                .select(`
                                    user_id,
                                    times_wrong,
                                    last_wrong_at,
                                    profiles (
                                        name,
                                        institution,
                                        avatar_url
                                    )
                                `)
                                .eq("question_id", item.question_id)
                                .order("last_wrong_at", { ascending: false })
                                .limit(20);

                            if (!error && mistakes) {
                                const userIds = mistakes.map((m) => m.user_id);
                                const { data: profiles } = await supabase
                                    .from("profiles")
                                    .select("user_id, name, institution, avatar_url")
                                    .in("user_id", userIds)
                                    .limit(20);

                                const merged = mistakes.map((m) => ({
                                    ...m,
                                    profile: profiles?.find((p) => p.user_id === m.user_id),
                                }));
                                setSelectedStudents(merged);
                                setCachedData(cachedKey, merged);
                            }
                        } catch (err) {
                            console.error("Error fetching students:", err);
                        } finally {
                            setLoadingStudents(false);
                        }
                    })();
                }
            }
        }
    };

    const handleNext = () => {
        if (currentIndex < visibleData.length - 1) {
            const newIndex = currentIndex + 1;
            setCurrentIndex(newIndex);
            setSelectedItem(visibleData[newIndex]);
            // Fetch students for new item
            const item = visibleData[newIndex];
            if (item?.question_id) {
                const cachedKey = `student_details_v5_${item.question_id}`;
                const cached = getCachedData(cachedKey);
                if (cached) {
                    setSelectedStudents(cached);
                } else {
                    setLoadingStudents(true);
                    (async () => {
                        try {
                            const { data: mistakes, error } = await supabase
                                .from("user_mistakes")
                                .select(`
                                    user_id,
                                    times_wrong,
                                    last_wrong_at,
                                    profiles (
                                        name,
                                        institution,
                                        avatar_url
                                    )
                                `)
                                .eq("question_id", item.question_id)
                                .order("last_wrong_at", { ascending: false })
                                .limit(20);

                            if (!error && mistakes) {
                                const userIds = mistakes.map((m) => m.user_id);
                                const { data: profiles } = await supabase
                                    .from("profiles")
                                    .select("user_id, name, institution, avatar_url")
                                    .in("user_id", userIds)
                                    .limit(20);

                                const merged = mistakes.map((m) => ({
                                    ...m,
                                    profile: profiles?.find((p) => p.user_id === m.user_id),
                                }));
                                setSelectedStudents(merged);
                                setCachedData(cachedKey, merged);
                            }
                        } catch (err) {
                            console.error("Error fetching students:", err);
                        } finally {
                            setLoadingStudents(false);
                        }
                    })();
                }
            }
        }
    };

    // Load more handler
    const handleLoadMore = async () => {
        return;
    };
    const handleLoadMoreFromOverlay = async () => {
        if (!loadingMore && hasMore) {
            await handleLoadMore();
        }
    };

    // Manual refresh handler
    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await fetchMistakes(true);
    };


    {/* Full Screen Overlay */ }
    return (
        <>
            {/* Full Screen Overlay */}
            <AnimatePresence>
                {showOverlay && selectedItem && (
                    <FullScreenOverlay
                        item={selectedItem}
                        onClose={() => setShowOverlay(false)}
                        selectedStudents={selectedStudents}
                        loadingStudents={loadingStudents}
                        openDetails={openDetails}
                        currentIndex={currentIndex}
                        totalItems={visibleData.length}
                        onPrevious={handlePrevious}
                        onNext={handleNext}
                        onLoadMore={handleLoadMoreFromOverlay}
                        hasMore={hasMore}
                        loadingMore={loadingMore}
                    />
                )}
            </AnimatePresence>

            {/* Refresh indicator */}
            <AnimatePresence>
                {isRefreshing && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-16 right-4 z-50 bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg"
                    >
                        <Loader2 className="inline mr-2 animate-spin" size={12} />
                        Syncing updates...
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Card */}
            <Card className="bg-white dark:bg-gray-900/50 border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                                    <BarChart3 size={22} />
                                </div>
                                Question Failure Analysis
                            </CardTitle>

                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {hiddenIds.length > 0 && (
                                <button
                                    onClick={() => {
                                        setData((prev) => {
                                            const allHidden = hiddenIds.map((id) => {
                                                const savedData = getCachedData(MISTAKES_CACHE_KEY) || [];
                                                return savedData.find((q: any) => q.question_id === id);
                                            }).filter(Boolean);
                                            return [...prev, ...allHidden];
                                        });
                                        setHiddenIds([]);
                                        localStorage.removeItem(HIDDEN_IDS_KEY);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all active:scale-95 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300"
                                >
                                    <ArchiveRestore size={14} />
                                    Restore {hiddenIds.length}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Total Questions</p>
                            <p className="text-xl font-black text-gray-900 dark:text-white">
                                {totalQuestions >= 1000
                                    ? (totalQuestions / 1000).toFixed(1) + 'K'
                                    : totalQuestions}
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Failed Attempts</p>
                            <p className="text-xl font-black text-red-600 dark:text-red-400">
                                {totalFailedAttempts >= 1000
                                    ? (totalFailedAttempts / 1000).toFixed(1) + 'K'
                                    : totalFailedAttempts}
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Avg Failure Rate</p>
                            <p className="text-xl font-black text-orange-600 dark:text-orange-400">
                                {totalQuestions > 0 ? Math.round(totalFailedAttempts / totalQuestions) : 0}×
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Students Affected</p>
                            <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                                {(() => {
                                    const total = Object.values(studentCounts).reduce((a, b) => a + b, 0) || 0;
                                    return total >= 1000
                                        ? (total / 1000).toFixed(1) + 'K'
                                        : total;
                                })()}
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 md:p-6">
                    {/* Horizontal Scroll - Facebook Story Size Cards */}
                    <div
                        ref={scrollContainerRef}
                        className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory"
                        style={{ scrollSnapType: 'x mandatory' }}
                    >
                        {/* ✅ Show skeleton loaders while loading */}
                        {loading && (
                            <>
                                <CardSkeleton />
                                <CardSkeleton />
                                <CardSkeleton />
                                <CardSkeleton />
                                <CardSkeleton />
                            </>
                        )}

                        {/* Actual cards */}
                        {!loading && visibleData.map((item, i) => {
                            const q = item.quiz_questions;
                            if (!q) return null;

                            const getCardStyle = (index: number) => {
                                if (index === 0) return {
                                    bg: "bg-gradient-to-br from-red-500 to-red-700",
                                    border: "border-0",
                                    text: "text-white",
                                    rank: "🥇",
                                    rankColor: "text-yellow-300",
                                    textShadow: "drop-shadow-lg"
                                };
                                if (index === 1) return {
                                    bg: "bg-gradient-to-br from-orange-500 to-orange-700",
                                    border: "border-0",
                                    text: "text-white",
                                    rank: "🥈",
                                    rankColor: "text-gray-300",
                                    textShadow: "drop-shadow-lg"
                                };
                                if (index === 2) return {
                                    bg: "bg-gradient-to-br from-amber-500 to-amber-700",
                                    border: "border-0",
                                    text: "text-white",
                                    rank: "🥉",
                                    rankColor: "text-amber-300",
                                    textShadow: "drop-shadow-lg"
                                };
                                return {
                                    bg: "bg-white dark:bg-gray-900",
                                    border: "border-0 dark:border-0",
                                    text: "text-gray-900 dark:text-white",
                                    rank: `#${index + 1}`,
                                    rankColor: "text-gray-700 dark:text-gray-300",
                                    textShadow: ""
                                };
                            };

                            const style = getCardStyle(i);

                            return (
                                <motion.div
                                    key={item.question_id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => handleCardClick(item, i)}
                                    className="flex-shrink-0 w-[120px] sm:w-[140px] md:w-[160px] snap-start cursor-pointer group"
                                >
                                    <div className={`relative rounded-xl border-2 ${style.border} ${style.bg} shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] p-2 h-[180px] md:h-[200px] flex flex-col`}>
                                        {/* Rank Badge - Smaller */}
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`text-lg font-black ${style.rankColor} ${style.textShadow}`}>
                                                {style.rank}
                                            </span>
                                            <Badge className={`${i < 3 ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'} border-0 font-bold text-[6px] px-1 py-0.5`}>
                                                {item.totalFails}×
                                            </Badge>
                                        </div>

                                        {/* Question Number - Smaller */}
                                        <div className="flex-1 flex flex-col items-center justify-center">
                                            <div className={`text-3xl font-black ${i < 3 ? 'text-white/90 drop-shadow-lg' : 'text-gray-800 dark:text-white'}`}>
                                                #{i + 1}
                                            </div>
                                            <p className={`text-[8px] font-medium ${i < 3 ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'} mt-0.5 text-center`}>
                                                Most Failed
                                            </p>
                                        </div>

                                        {/* Stats - Smaller */}
                                        <div className="space-y-1 mt-auto">
                                            <div className={`flex items-center justify-between ${i < 3 ? 'bg-white/10 text-white' : 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'} rounded-md px-1.5 py-1`}>
                                                <div className="flex items-center gap-1">
                                                    <Users size={8} className={i < 3 ? 'text-white/70' : 'text-gray-400'} />
                                                    <span className="text-[8px] font-bold">{item.uniqueStudents}</span>
                                                </div>
                                                <span className={`text-[6px] ${i < 3 ? 'text-white/60' : 'text-gray-400'}`}>Students</span>
                                            </div>
                                            <div className={`flex items-center justify-between ${i < 3 ? 'bg-white/10 text-white' : 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'} rounded-md px-1.5 py-1`}>
                                                <div className="flex items-center gap-1">
                                                    <Clock size={8} className={i < 3 ? 'text-white/70' : 'text-gray-400'} />
                                                    <span className="text-[6px] font-medium truncate max-w-[40px]">
                                                        {item.lastWrong ? formatDistanceToNow(new Date(item.lastWrong)) : "N/A"}
                                                    </span>
                                                </div>
                                                <span className={`text-[6px] ${i < 3 ? 'text-white/60' : 'text-gray-400'}`}>Last</span>
                                            </div>
                                        </div>

                                        {/* Footer - Smaller */}
                                        <div className={`flex items-center justify-between mt-1 pt-1 border-t ${i < 3 ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'}`}>
                                            <span className={`text-[6px] ${i < 3 ? 'text-white/60' : 'text-gray-400'}`}>
                                                {item.uniqueStudents}
                                            </span>
                                            <div className={`flex items-center gap-0.5 ${i < 3 ? 'text-white/80' : 'text-blue-600 dark:text-blue-400'} group-hover:gap-1 transition-all`}>
                                                <span className="text-[6px] font-bold">Details</span>
                                                <ChevronRight size={8} />
                                            </div>
                                        </div>

                                        {/* Hide button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setHiddenIds((prev) => {
                                                    const updated = [...prev, item.question_id];
                                                    localStorage.setItem(HIDDEN_IDS_KEY, JSON.stringify(updated));
                                                    return updated;
                                                });
                                                setData((prev) => prev.filter((q) => q.question_id !== item.question_id));
                                            }}
                                            className={`absolute top-2 right-2 p-1 rounded-full ${i < 3 ? 'bg-white/20 hover:bg-white/30 text-white/60 hover:text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600'} transition-colors`}
                                        >
                                            <CheckCircle size={12} />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Scroll Indicator */}
                    {visibleData.length > 3 && (
                        <div className="flex justify-center mt-2">
                            <div className="flex gap-1.5">
                                {visibleData.slice(0, 5).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all ${i === 0 ? "w-6 bg-blue-500" : "w-1.5 bg-gray-300 dark:bg-gray-700"
                                            }`}
                                    />
                                ))}
                                {visibleData.length > 5 && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Student Details Dialog */}
            {openStudentsDialog && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpenStudentsDialog(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <Users size={20} className="text-blue-600" />
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Students Who Failed</h3>
                                <span className="text-sm text-gray-400 ml-2">{selectedStudents.length}</span>
                            </div>
                            <button
                                onClick={() => setOpenStudentsDialog(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[60vh] hide-scrollbar space-y-2">
                            {loadingStudents ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="animate-spin text-blue-600" size={24} />
                                </div>
                            ) : selectedStudents.length > 0 ? (
                                selectedStudents.map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={s.profile?.avatar_url || "/UsersAvatar.jpg"} />
                                            <AvatarFallback className="bg-red-50 text-red-600 text-sm">
                                                {s.profile?.name?.[0] || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{s.profile?.name || "Anonymous"}</p>
                                            <p className="text-xs text-gray-400">{s.profile?.institution || "Medical Student"}</p>
                                        </div>
                                        <Badge className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 font-bold px-3 py-1">
                                            {s.times_wrong}× Failed
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-8 text-gray-400">No student data available</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}