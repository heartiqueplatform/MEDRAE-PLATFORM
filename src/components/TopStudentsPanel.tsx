"use client";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageCircle, Timer, Award, Stethoscope, ArrowRight, Zap, TrendingUp, Book, Target, Eye, Trophy, ThumbsUp, Flame, Clap, AlertCircle, Swords } from "lucide-react";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/soundManager";
import { useNavigate } from "react-router-dom";
import { UserProfileModal } from "@/components/UserProfileModal";
import { useToast } from "@/components/ui/use-toast";

interface TriviaQuestion {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: "A" | "B" | "C" | "D";
}

interface TopStudent {
    user_id: string;
    name: string;
    score: number;
    avatar_url?: string | null;
    institution?: string | null;
    completedAt?: string | null;
    timeUsed?: number | null;
}

type ReactionType = "like" | "fire" | "clap";

// Cache helpers with TTL
const questionCache = new Map();
const topStudentsCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REACTION_DEBOUNCE = 300;
// ✅ Paint-from-disk helper — ignores TTL. TTL only decides
// whether to *refetch*, never whether to *render*.
const readCacheAny = <T,>(key: string): T | null => {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw).data as T;
    } catch {
        return null;
    }
};
// ============================================================
// SVG ICONS — outline when inactive, filled when active
// ============================================================
const LikeIcon = ({ filled, className }: { filled: boolean; className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        {filled ? (
            <path
                fill="currentColor"
                d="M2 21h4V9H2v12zM23 10c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.58 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"
            />
        ) : (
            <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
            />
        )}
    </svg>
);

const FireIcon = ({ filled, className }: { filled: boolean; className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        {filled ? (
            <path
                fill="currentColor"
                d="M13.5 0.67s0.74 2.65 0.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l0.03-0.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"
            />
        ) : (
            <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2c1 3 4 5 4 9a4 4 0 0 1-8 0c0-1.5.5-3 1.5-4.5C10 8 11 9.5 12 9.5c0-2 .5-4 0-7.5zm0 20a7 7 0 0 0 7-7c0-4-3-6-7-13-4 7-7 9-7 13a7 7 0 0 0 7 7z"
            />
        )}
    </svg>
);

const ClapIcon = ({ filled, className }: { filled: boolean; className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        {filled ? (
            <path
                fill="currentColor"
                d="M12 2a2 2 0 0 0-2 2v6.5a.5.5 0 0 1-1 0V3a2 2 0 1 0-4 0v8.5a.5.5 0 0 1-1 0V6a2 2 0 1 0-4 0v11a6 6 0 0 0 6 6h6a6 6 0 0 0 6-6v-5a2 2 0 1 0-4 0v3.5a.5.5 0 0 1-1 0V4a2 2 0 0 0-2-2z"
            />
        ) : (
            <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 11V5a2 2 0 1 1 4 0v8m0-2.5a1.5 1.5 0 1 1 3 0V15m0-2a1.5 1.5 0 1 1 3 0v3a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6v-5a1.5 1.5 0 0 1 3 0m0 0V6a1.5 1.5 0 0 1 3 0v5"
            />
        )}
    </svg>
);

// ============================================================
// REACTION BUTTON — SVG pill, no border, tinted when active
// ============================================================
const ReactionButton = memo(({
    type,
    count,
    isActive,
    onClick,
}: {
    type: ReactionType;
    count: number;
    isActive: boolean;
    onClick: (e: React.MouseEvent) => void;
}) => {
    const palette = {
        like: {
            active: "text-blue-500",
            bg: "bg-blue-500/10",
            ring: "ring-blue-500/30",
            hover: "hover:bg-blue-500/10 hover:text-blue-500",
            Icon: LikeIcon,
            label: "Like",
        },
        fire: {
            active: "text-orange-500",
            bg: "bg-orange-500/10",
            ring: "ring-orange-500/30",
            hover: "hover:bg-orange-500/10 hover:text-orange-500",
            Icon: FireIcon,
            label: "Fire",
        },
        clap: {
            active: "text-emerald-500",
            bg: "bg-emerald-500/10",
            ring: "ring-emerald-500/30",
            hover: "hover:bg-emerald-500/10 hover:text-emerald-500",
            Icon: ClapIcon,
            label: "Clap",
        },
    }[type];

    const { Icon } = palette;

    return (
        <motion.button
            whileTap={{ scale: 1.25 }}
            whileHover={{ scale: 1.08 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            onClick={onClick}
            aria-label={`${palette.label} (${count})`}
            aria-pressed={isActive}
            className={`group/rxn relative flex items-center gap-1 px-2 py-1 rounded-full
                        transition-colors duration-150 border-0 outline-none select-none
                        ${isActive
                    ? `${palette.bg} ${palette.active} ${palette.ring} ring-1`
                    : `text-muted-foreground ${palette.hover}`}`}
        >
            <Icon
                filled={isActive}
                className={`w-4 h-4 transition-transform duration-200
                            ${isActive ? "scale-110" : "group-hover/rxn:scale-110"}`}
            />
            <span className={`text-[10px] font-bold tabular-nums
                              ${isActive ? palette.active : "text-muted-foreground"}`}>
                {count}
            </span>
        </motion.button>
    );
});

ReactionButton.displayName = "ReactionButton";

// ============================================================
// LEADERBOARD ITEM
// ============================================================
const LeaderboardItem = memo(({
    student,
    idx,
    reactions,
    myReactions,
    toggleReaction,
    reactionBurst,
    formatTimeReadable,
    onSelect,
}: {
    student: TopStudent;
    idx: number;
    reactions: Record<string, { like: number; fire: number; clap: number }>;
    myReactions: Record<string, string[]>;
    toggleReaction: (userId: string, reaction: ReactionType) => Promise<void>;
    reactionBurst: (emoji: ReactionType) => void;
    formatTimeReadable: (sec: number) => string;
    onSelect: (userId: string) => void;
}) => (
    <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: idx * 0.05, duration: 0.2 }}
        whileHover={{ y: -4 }}
        onClick={() => onSelect(student.user_id)}
        className={`relative flex-shrink-0 w-40 p-4 rounded-2xl border-0 flex flex-col items-center cursor-pointer transition-all will-change-transform
            ${idx === 0
                ? "bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-900/10 dark:to-background border-0 shadow-none"
                : "bg-card border-border shadow-none"}`}
    >
        <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-none border-0
            ${idx === 0 ? "bg-amber-500 text-white border-0"
                : idx === 1 ? "bg-slate-400 text-white border-0"
                    : idx === 2 ? "bg-orange-500 text-white border-0"
                        : "bg-muted text-muted-foreground border-0"}`}>
            {idx + 1}
        </div>

        <div className="relative mb-3">
            <img
                src={student.avatar_url || "/UsersAvatar.jpg"}
                alt={student.name}
                className={`w-16 h-16 rounded-full object-cover border-2 p-0.5 will-change-transform
                    ${idx === 0 ? "border-amber-400" : "border-transparent"}`}
                loading="lazy"
            />
            {idx === 0 && (
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-950 rounded-full p-1 shadow-sm">
                    <Award className="w-4 h-4 text-amber-500" />
                </div>
            )}
        </div>

        <div className="text-center w-full space-y-1 mb-3">
            <div className="font-bold text-sm text-foreground truncate w-full px-1">
                {student.name}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold truncate w-full">
                {student.institution || "Independent"}
            </div>
        </div>

        <div className="flex flex-col items-center gap-1 w-full pt-2 border-0">
            <div className="text-sm font-bold text-primary">
                {student.score.toLocaleString()} <span className="text-[10px] font-medium opacity-70">PTS</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Timer className="w-3 h-3" />
                {student.timeUsed !== undefined ? formatTimeReadable(student.timeUsed) : "--"}
            </div>
        </div>

        {/* Reaction row — no wrapper pill, each button owns its state */}
        <div className="flex items-center justify-center gap-1 mt-4 w-full border-0">
            <ReactionButton
                type="like"
                count={reactions[student.user_id]?.like || 0}
                isActive={myReactions[student.user_id]?.includes("like") || false}
                onClick={(e) => {
                    e.stopPropagation();
                    reactionBurst("like");
                    toggleReaction(student.user_id, "like");
                }}
            />
            <ReactionButton
                type="fire"
                count={reactions[student.user_id]?.fire || 0}
                isActive={myReactions[student.user_id]?.includes("fire") || false}
                onClick={(e) => {
                    e.stopPropagation();
                    reactionBurst("fire");
                    toggleReaction(student.user_id, "fire");
                }}
            />
            <ReactionButton
                type="clap"
                count={reactions[student.user_id]?.clap || 0}
                isActive={myReactions[student.user_id]?.includes("clap") || false}
                onClick={(e) => {
                    e.stopPropagation();
                    reactionBurst("clap");
                    toggleReaction(student.user_id, "clap");
                }}
            />
        </div>
    </motion.div>
));

LeaderboardItem.displayName = "LeaderboardItem";

// ============================================================
// QUESTION OPTION
// ============================================================
const QuestionOption = memo(({
    letter,
    text,
    isSelected,
    isDisabled,
    onClick,
}: {
    letter: string;
    text: string;
    isSelected: boolean;
    isDisabled: boolean;
    onClick: () => void;
}) => (
    <motion.div
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className={`flex items-start gap-4 cursor-pointer p-2 rounded-lg transition-colors ${!isDisabled ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : ''}`}
        onClick={onClick}
    >
        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-150
            ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-400 bg-white dark:bg-gray-800"}`}
        >
            {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
        </div>
        <p className="text-sm break-words leading-relaxed">{text}</p>
    </motion.div>
));

QuestionOption.displayName = "QuestionOption";

// ============================================================
// TIME WARNING
// ============================================================
const TimeWarning = memo(({ timeLeft, onDismiss }: { timeLeft: number; onDismiss: () => void }) => {
    const [show, setShow] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShow(false);
            onDismiss();
        }, 8000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    if (!show) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/30 border-0 rounded-xl"
        >
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                        Time is running out!
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        {timeLeft <= 30 ? (
                            <span className="font-bold text-red-600 dark:text-red-400">
                                Less than {timeLeft} seconds remaining! Auto-submitting soon...
                            </span>
                        ) : (
                            <span>
                                You have {Math.floor(timeLeft / 60)} minute{Math.floor(timeLeft / 60) !== 1 ? 's' : ''} left.
                                Work on your speed to get better and come back tomorrow for more practice!
                            </span>
                        )}
                    </p>
                    <div className="mt-2 w-full bg-amber-200 dark:bg-amber-800/50 rounded-full h-1.5">
                        <div
                            className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-1000"
                            style={{ width: `${(timeLeft / 300) * 100}%` }}
                        />
                    </div>
                </div>
                <button
                    onClick={() => {
                        setShow(false);
                        onDismiss();
                    }}
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
                >
                    ✕
                </button>
            </div>
        </motion.div>
    );
});

TimeWarning.displayName = "TimeWarning";

// ============================================================
// MAIN COMPONENT
// ============================================================
export const DailyTriviaCard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [selfUserId, setSelfUserId] = useState<string | null>(null);

    // Refs for performance
    const isMounted = useRef(true);
    const isFetchingQuestions = useRef(false);
    const isFetchingTop = useRef(false);
    const lastReactionTime = useRef<number>(0);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const confettiIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const timeWarningShownRef = useRef(false);

    const today = new Date().toISOString().slice(0, 10);
    const QUIZ_ID = today;

    const [questions, setQuestions] = useState<TriviaQuestion[]>(() =>
        readCacheAny<TriviaQuestion[]>(`trivia_questions_${today}`) ?? []
    );
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [started, setStarted] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [timer, setTimer] = useState(5 * 60);
    const [loading, setLoading] = useState(
        () => (readCacheAny<TriviaQuestion[]>(`trivia_questions_${today}`)?.length ?? 0) === 0
    );
    const [topStudents, setTopStudents] = useState<TopStudent[]>(() =>
        readCacheAny<TopStudent[]>(`trivia_top_${today}`) ?? []
    );
    const [reactions, setReactions] = useState<Record<string, { like: number; fire: number; clap: number }>>({});
    const [myReactions, setMyReactions] = useState<Record<string, string[]>>({});
    const [attemptedToday, setAttemptedToday] = useState(false);
    const [timeUsedToday, setTimeUsedToday] = useState<number | null>(null);
    const [savedScore, setSavedScore] = useState<{ correct_answers: number; total_questions: number } | null>(null);
    const startTimeRef = useRef<number>(0);
    const [completedAt, setCompletedAt] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    // Skeleton only if we've never cached the top list today.
    // Show the skeleton if we've never fetched the leaderboard today.
    // A cached empty array (nobody's played yet) counts as "fetched" —
    // so we don't flash the skeleton on repeat visits. But a *stale*
    // empty cache should still be treated as "checking" — hence the
    // TTL check inside the initializer.
    const [topLoading, setTopLoading] = useState(() => {
        if (typeof window === "undefined") return true;
        const raw = localStorage.getItem(`trivia_top_${today}`);
        if (!raw) return true;                    // no cache at all → skeleton
        try {
            const parsed = JSON.parse(raw);
            const age = Date.now() - (parsed.timestamp ?? 0);
            if (age > CACHE_DURATION) {
                // stale — if it's empty, we don't know yet, show skeleton
                return Array.isArray(parsed.data) ? parsed.data.length === 0 : true;
            }
            return false;                          // fresh cache → no skeleton
        } catch {
            return true;
        }
    });
    const [showTimeWarning, setShowTimeWarning] = useState(false);
    const [autoSubmitCountdown, setAutoSubmitCountdown] = useState<number | null>(null);

    const currentQuestion = questions[currentIndex];

    // Memoized computed values
    const scorePercentage = useMemo(() =>
        savedScore ? Math.round((savedScore.correct_answers / savedScore.total_questions) * 100) : 0,
        [savedScore]
    );

    const timePercentage = useMemo(() =>
        timeUsedToday ? Math.min((timeUsedToday / 300) * 100, 100) : 0,
        [timeUsedToday]
    );

    const motivationalMessage = useMemo(() => {
        if (scorePercentage === 100) return "🔥 Incredible! You aced it today! Absolute perfection.";
        if (scorePercentage >= 80) return "💪 Great job! You're getting stronger every day!";
        if (scorePercentage >= 50) return "🙂 Nice work! Keep practicing and you'll improve!";
        if (scorePercentage < 50 && scorePercentage > 0) return "👍 Good effort! Remember, every answer helps you learn more!";
        return "";
    }, [scorePercentage]);

    // ============================================
    // Auth bootstrap — MUST run before reactions fetch
    // ============================================
    useEffect(() => {
        isMounted.current = true;
        supabase.auth.getSession().then(({ data }) => {
            const id = data?.session?.user?.id;
            if (id && isMounted.current) setSelfUserId(id);
        });
        return () => {
            isMounted.current = false;
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (confettiIntervalRef.current) clearInterval(confettiIntervalRef.current);
            if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
        };
    }, []);

    const formatTimeReadable = useCallback((sec: number) => {
        const minutes = Math.floor(sec / 60);
        const seconds = sec % 60;
        const minText = minutes > 0 ? `${minutes} minute${minutes > 1 ? "s" : ""}` : "";
        const secText = seconds > 0 ? `${seconds} second${seconds > 1 ? "s" : ""}` : "";
        return [minText, secText].filter(Boolean).join(" and ");
    }, []);

    // ============================================
    // Load questions — cache first, network second
    // ============================================
    useEffect(() => {
        async function loadQuestions() {
            if (isFetchingQuestions.current) return;
            isFetchingQuestions.current = true;

            const cacheKey = `trivia_questions_${today}`;

            // ✅ WhatsApp-style: paint cache instantly (any age), then refresh
            // silently in the background only if stale.
            const cached = readCacheAny<TriviaQuestion[]>(cacheKey);
            if (cached && cached.length > 0) {
                if (isMounted.current) {
                    setQuestions(cached);
                    setLoading(false);
                }
            }

            // Check TTL to decide whether a refetch is even needed.
            let needsRefetch = true;
            const stored = localStorage.getItem(cacheKey);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed.data) && parsed.data.length > 0 &&
                        Date.now() - (parsed.timestamp ?? 0) < CACHE_DURATION) {
                        needsRefetch = false;
                    }
                } catch { /* ignore */ }
            }

            if (!needsRefetch) {
                isFetchingQuestions.current = false;
                return;
            }

            if (isMounted.current && !cached) setLoading(true);

            try {
                const { data, error } = await supabase.rpc("get_daily_trivia_questions", {
                    p_date: today,
                    p_limit: 15,
                });

                if (!error && data && data.length > 0 && isMounted.current) {
                    setQuestions(data);
                    localStorage.setItem(
                        cacheKey,
                        JSON.stringify({ data, timestamp: Date.now(), date: today })
                    );
                } else if (isMounted.current) {
                    setQuestions([]);
                }
            } catch (err) {
                console.error("❌ Trivia fetch failed:", err);
                if (isMounted.current) setQuestions([]);
            } finally {
                if (isMounted.current) setLoading(false);
                isFetchingQuestions.current = false;
            }
        }
        loadQuestions();
    }, [today]);

    // ============================================
    // Fetch leaderboard (students) — cache first, network second
    // ============================================
    const fetchTop = useCallback(async () => {
        if (!isMounted.current || isFetchingTop.current) return;

        const cacheKey = `trivia_top_${today}`;

        // ── 1. Paint from disk instantly (any age) ──────────────────
        const cached = readCacheAny<TopStudent[]>(cacheKey);
        if (Array.isArray(cached)) {
            if (isMounted.current) {
                setTopStudents(cached);
                // Only hide the skeleton if we have rows OR the cache is fresh.
                const storedForFreshness = localStorage.getItem(cacheKey);
                let isFresh = false;
                if (storedForFreshness) {
                    try {
                        const p = JSON.parse(storedForFreshness);
                        isFresh = Date.now() - (p.timestamp ?? 0) < CACHE_DURATION;
                    } catch { /* ignore */ }
                }
                if (cached.length > 0 || isFresh) {
                    setTopLoading(false);
                }
            }
        }

        // ── 2. Check TTL — skip network if still fresh ──────────────
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed.data) &&
                    Date.now() - (parsed.timestamp ?? 0) < CACHE_DURATION) {
                    isFetchingTop.current = false;
                    return; // fresh → no network, no skeleton
                }
            } catch { /* ignore */ }
        }

        isFetchingTop.current = true;

        try {
            const { data: results } = await supabase
                .from("daily_trivia_results")
                .select("user_id, score, time_used, created_at")
                .eq("attempt_date", today)
                .order("score", { ascending: false })
                .limit(10);

            if (!isMounted.current) return;

            // ── 3. Empty result → cache empty so next mount is instant ─
            if (!results || results.length === 0) {
                setTopStudents([]);
                localStorage.setItem(cacheKey, JSON.stringify({
                    data: [],
                    timestamp: Date.now(),
                }));
                return;
            }

            // ── 4. Fetch profiles for the top 10 ────────────────────
            const ids = results.map((r) => r.user_id);
            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, name, avatar_url, institution")
                .in("user_id", ids);

            if (!isMounted.current) return;

            const profileMap = new Map<string, any>();
            profiles?.forEach((p) => profileMap.set(p.user_id, p));

            const leaderboardData = results.map((r) => {
                const profile = profileMap.get(r.user_id);
                return {
                    user_id: r.user_id,
                    score: r.score,
                    name: profile?.name || "Student",
                    avatar_url: profile?.avatar_url || null,
                    institution: profile?.institution || null,
                    completedAt: r.created_at,
                    timeUsed: r.time_used,
                };
            });

            setTopStudents(leaderboardData);
            localStorage.setItem(cacheKey, JSON.stringify({
                data: leaderboardData,
                timestamp: Date.now(),
            }));
        } catch (err) {
            console.error("❌ Leaderboard fetch failed:", err);
            // Keep whatever's on screen
        } finally {
            isFetchingTop.current = false;
            if (isMounted.current) setTopLoading(false);
        }
    }, [today]);

    // ============================================
    // Fetch reactions — separate, runs when selfUserId resolves
    // ============================================
    const fetchReactions = useCallback(async () => {
        if (!isMounted.current) return;
        if (!selfUserId) return; // can't know which are "mine" until auth resolves

        try {
            const { data: reactionData, error } = await supabase
                .from("trivia_reactions")
                .select("reactor_id, target_user_id, reaction")
                .eq("attempt_date", today);

            if (error) {
                console.error("❌ Reactions query error:", error);
                return;
            }

            if (!isMounted.current) return;

            const counts: Record<string, { like: number; fire: number; clap: number }> = {};
            const mine: Record<string, string[]> = {};

            (reactionData ?? []).forEach((r) => {
                const targetId = r.target_user_id;
                const type = r.reaction as ReactionType;

                if (!counts[targetId]) counts[targetId] = { like: 0, fire: 0, clap: 0 };
                counts[targetId][type] = (counts[targetId][type] || 0) + 1;

                if (r.reactor_id === selfUserId) {
                    if (!mine[targetId]) mine[targetId] = [];
                    if (!mine[targetId].includes(type)) mine[targetId].push(type);
                }
            });

            setReactions(counts);
            setMyReactions(mine);
        } catch (err) {
            console.error("❌ Reactions fetch failed (non-critical):", err);
        }
    }, [today, selfUserId]);

    // Leaderboard fetch on mount + on focus
    useEffect(() => {
        fetchTop();
        const handleFocus = () => fetchTop();
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [fetchTop]);

    // Reactions fetch — re-runs when selfUserId resolves OR date changes
    useEffect(() => {
        fetchReactions();
    }, [fetchReactions]);

    // ============================================
    // Retry loading when connection returns
    // ============================================
    useEffect(() => {
        const handleOnline = () => {
            console.log("🌐 Connection restored - retrying data fetch");
            fetchTop();
            fetchReactions();

            if (questions.length === 0 && !isFetchingQuestions.current) {
                setLoading(true);
                (async () => {
                    try {
                        const { data, error } = await supabase.rpc("get_daily_trivia_questions", {
                            p_date: today,
                            p_limit: 15,
                        });
                        if (!error && data?.length && isMounted.current) {
                            setQuestions(data);
                            localStorage.setItem(
                                `trivia_questions_${today}`,
                                JSON.stringify({ data, timestamp: Date.now(), date: today })
                            );
                        }
                    } finally {
                        if (isMounted.current) setLoading(false);
                    }
                })();
            }
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [questions.length, fetchTop, fetchReactions, today]);

    // Cache janitor — removes yesterday's trivia keys
    useEffect(() => {
        const cleanOldCache = () => {
            const todayKey = new Date().toISOString().slice(0, 10);
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('trivia_') && !key.includes(todayKey)) {
                    localStorage.removeItem(key);
                }
            }
        };
        cleanOldCache();
    }, []);

    // ============================================
    // Timer + auto-submit
    // ============================================
    useEffect(() => {
        if (!started || completed) {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            if (autoSubmitTimeoutRef.current) {
                clearTimeout(autoSubmitTimeoutRef.current);
                autoSubmitTimeoutRef.current = null;
            }
            return;
        }

        timerIntervalRef.current = setInterval(() => {
            setTimer((t) => {
                const newTime = t - 1;

                if (newTime === 60 && !timeWarningShownRef.current) {
                    timeWarningShownRef.current = true;
                    setShowTimeWarning(true);
                    playSound("notification");
                }

                if (newTime === 10) {
                    if (autoSubmitTimeoutRef.current) {
                        clearTimeout(autoSubmitTimeoutRef.current);
                    }
                    setAutoSubmitCountdown(10);
                    autoSubmitTimeoutRef.current = setTimeout(() => {
                        if (isMounted.current && !completed) {
                            toast({
                                title: "⏰ Time's Up!",
                                description: "Auto-submitting your answers. Work on your speed to get better and come back tomorrow!",
                                variant: "destructive",
                            });
                            finishTrivia();
                        }
                    }, 10000);
                }

                if (newTime < 10 && newTime > 0 && autoSubmitCountdown !== null) {
                    setAutoSubmitCountdown(newTime);
                }

                if (newTime <= 0) {
                    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                    if (!completed) {
                        finishTrivia();
                    }
                    return 0;
                }
                return newTime;
            });
        }, 1000);

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            if (autoSubmitTimeoutRef.current) {
                clearTimeout(autoSubmitTimeoutRef.current);
                autoSubmitTimeoutRef.current = null;
            }
        };
    }, [started, completed, toast]);

    const shareOnWhatsApp = useCallback(() => {
        const appUrl = window.location.origin;
        const message = encodeURIComponent(
            `I just completed today's Medrae Daily MindRush! 🧠🎉\nAdvancing nursing education and student success.\nCheck out Medrae here: ${appUrl}`
        );
        window.open(`https://wa.me/?text=${message}`, "_blank");
    }, []);

    // ============================================
    // Confetti burst per reaction type
    // ============================================
    const reactionBurst = useCallback((emoji: ReactionType) => {
        playSound("ui-tap");

        const config = {
            like: { color: "#3b82f6" },
            fire: { color: "#f97316" },
            clap: { color: "#22c55e" },
        };

        const selected = config[emoji];

        requestAnimationFrame(() => {
            confetti({
                particleCount: 28,
                spread: 90,
                startVelocity: 28,
                gravity: 1.1,
                scalar: 1,
                ticks: 90,
                origin: { y: 0.85 },
                colors: [selected.color],
            });
        });

        setTimeout(() => {
            requestAnimationFrame(() => {
                confetti({
                    particleCount: 18,
                    spread: 70,
                    startVelocity: 22,
                    gravity: 1.2,
                    scalar: 0.9,
                    ticks: 80,
                    origin: { y: 0.85 },
                    colors: [selected.color],
                });
            });
        }, 120);
    }, []);

    // ============================================
    // Toggle reaction — optimistic + persistent
    // ============================================
    const toggleReaction = useCallback(async (
        targetUserId: string,
        reaction: ReactionType
    ) => {
        if (!selfUserId) return;

        const now = Date.now();
        if (now - lastReactionTime.current < REACTION_DEBOUNCE) return;
        lastReactionTime.current = now;

        const todayString = today;
        const alreadyReacted = myReactions[targetUserId]?.includes(reaction) || false;

        // Optimistic update
        setMyReactions((prev) => {
            const current = prev[targetUserId] || [];
            if (alreadyReacted) {
                return { ...prev, [targetUserId]: current.filter(r => r !== reaction) };
            }
            return { ...prev, [targetUserId]: [...new Set([...current, reaction])] };
        });

        setReactions((prev) => {
            const current = prev[targetUserId] || { like: 0, fire: 0, clap: 0 };
            const delta = alreadyReacted ? -1 : 1;
            return {
                ...prev,
                [targetUserId]: {
                    ...current,
                    [reaction]: Math.max((current[reaction] || 0) + delta, 0)
                }
            };
        });

        try {
            if (alreadyReacted) {
                const { error } = await supabase
                    .from("trivia_reactions")
                    .delete()
                    .eq("reactor_id", selfUserId)
                    .eq("target_user_id", targetUserId)
                    .eq("reaction", reaction)
                    .eq("attempt_date", todayString);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("trivia_reactions")
                    .upsert({
                        reactor_id: selfUserId,
                        target_user_id: targetUserId,
                        attempt_date: todayString,
                        reaction,
                    }, {
                        // ✅ Matches the 4-column unique constraint.
                        // If your DB only has a 3-column unique (one reaction
                        // per target per day), change this to:
                        //   onConflict: "reactor_id,target_user_id,attempt_date"
                        onConflict: "reactor_id,target_user_id,attempt_date,reaction",
                    });
                if (error) throw error;
            }
        } catch (error) {
            console.error("Reaction failed:", error);
            // Roll back optimistic update
            setMyReactions((prev) => {
                const current = prev[targetUserId] || [];
                if (alreadyReacted) {
                    return { ...prev, [targetUserId]: [...current, reaction] };
                }
                return { ...prev, [targetUserId]: current.filter(r => r !== reaction) };
            });
            setReactions((prev) => {
                const current = prev[targetUserId] || { like: 0, fire: 0, clap: 0 };
                const delta = alreadyReacted ? 1 : -1;
                return {
                    ...prev,
                    [targetUserId]: {
                        ...current,
                        [reaction]: Math.max((current[reaction] || 0) + delta, 0)
                    }
                };
            });
        }
    }, [selfUserId, today, myReactions]);

    const answerQuestion = useCallback((questionId: string, letter: string) => {
        if (!started || completed) return;
        setAnswers(prev => ({ ...prev, [questionId]: letter }));

        if (currentIndex === questions.length - 1) {
            finishTrivia();
        } else {
            setCurrentIndex(i => i + 1);
        }
    }, [started, completed, currentIndex, questions.length]);

    const finishTrivia = useCallback(async () => {
        if (!selfUserId || questions.length === 0) return;

        const correctCount = questions.reduce(
            (acc, q) => acc + (answers[q.id] === q.correct_answer ? 1 : 0),
            0
        );

        const timeUsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

        const { error } = await supabase
            .from("daily_trivia_results")
            .upsert({
                user_id: selfUserId,
                quiz_id: QUIZ_ID,
                total_questions: questions.length,
                correct_answers: correctCount,
                score: correctCount,
                time_used: timeUsed,
                attempt_date: today,
            }, { onConflict: ["user_id", "attempt_date"] });

        if (!error) {
            fetchTop();
        }

        if (isMounted.current) {
            setSavedScore({ correct_answers: correctCount, total_questions: questions.length });
            setTimeUsedToday(timeUsed);
            setCompleted(true);
            setStarted(false);
            setAttemptedToday(true);
            setShowTimeWarning(false);
            setAutoSubmitCountdown(null);

            playSound("trivia-finish", false);

            setTimeout(() => {
                const duration = 3000;
                const animationEnd = Date.now() + duration;
                if (confettiIntervalRef.current) clearInterval(confettiIntervalRef.current);
                confettiIntervalRef.current = setInterval(() => {
                    if (Date.now() >= animationEnd) {
                        if (confettiIntervalRef.current) clearInterval(confettiIntervalRef.current);
                        return;
                    }
                    requestAnimationFrame(() => {
                        confetti({
                            particleCount: 15,
                            spread: 600,
                            startVelocity: 20,
                            ticks: 120,
                            origin: { x: Math.random(), y: Math.random() * 0.3 },
                        });
                    });
                }, 100);
            }, 100);
        }
    }, [selfUserId, questions, answers, QUIZ_ID, today, fetchTop]);

    const startTrivia = useCallback(() => {
        timeWarningShownRef.current = false;
        setStarted(true);
        setCompleted(false);
        setCurrentIndex(0);
        setAnswers({});
        setTimer(5 * 60);
        setShowTimeWarning(false);
        setAutoSubmitCountdown(null);
        startTimeRef.current = Date.now();
        playSound("start");
        if (navigator.vibrate) navigator.vibrate(200);
    }, []);

    const fmt = useCallback((sec: number) =>
        `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`,
        []);

    return (
        <div className="relative select-none overflow-x-hidden">
            <Card className="rounded-md overflow-hidden border-0 relative bg-gray-100 dark:bg-muted/30 shadow-md mt-0">
                <CardHeader className="bg-blue-50 dark:bg-muted/30 pb-3">
                    {started ? (
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-mono flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                                <Timer className="w-4 h-4 text-blue-600" />
                                {fmt(timer)}
                                {autoSubmitCountdown !== null && autoSubmitCountdown > 0 && (
                                    <span className="text-red-600 dark:text-red-400 font-bold animate-pulse">
                                        ⚠️ {autoSubmitCountdown}s
                                    </span>
                                )}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Q{currentIndex + 1} / {questions.length}
                            </span>
                        </div>
                    ) : completed ? (
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-emerald-600" />
                            <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                Today's attempt recorded
                            </CardTitle>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 flex-1 min-w-0">
                                <span className="align-middle">Ready for today's MindRush?</span>
                            </p>
                            <Badge variant="secondary" className="flex-shrink-0 h-6">
                                {questions.length} Questions
                            </Badge>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="p-1">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : questions.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">No questions available.</p>
                    ) : !completed ? (
                        <div className="w-full min-h-[200px]">
                            {showTimeWarning && started && (
                                <TimeWarning
                                    timeLeft={timer}
                                    onDismiss={() => setShowTimeWarning(false)}
                                />
                            )}
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="w-full bg-gray-50 dark:bg-muted/40 rounded-xl">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-0 p-4">
                                        Question {currentIndex + 1} of {questions.length}
                                    </p>
                                    <p className="font-semibold text-lg mb-6 mt-0 p-2 leading-relaxed">{currentQuestion?.question_text}</p>
                                    <div className="flex flex-col gap-3 p-4">
                                        {(["A", "B", "C", "D"] as const).map((letter) => {
                                            if (!currentQuestion) return null;
                                            const text = currentQuestion[`option_${letter.toLowerCase()}` as keyof TriviaQuestion] as string;
                                            const isSelected = answers[currentQuestion.id] === letter;
                                            const isDisabled = !started || completed;

                                            return (
                                                <QuestionOption
                                                    key={letter}
                                                    letter={letter}
                                                    text={text}
                                                    isSelected={isSelected}
                                                    isDisabled={isDisabled}
                                                    onClick={() => answerQuestion(currentQuestion.id, letter)}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    ) : null}

                    {/* Leaderboard */}
                    <div className="mt-10 mb-6 px-1">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold tracking-tight text-foreground">Daily Leaderboard</h2>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mt-1">
                                    <Eye className="w-3.5 h-3.5" />
                                    {topStudents.length === 0
                                        ? "Be the first to challenge today's trivia"
                                        : `${topStudents.length} medical students competing today`}
                                </div>
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto overflow-y-hidden pb-4 pt-2 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                            {topLoading && topStudents.length === 0 ? (
                                <div className="flex gap-3">
                                    {Array.from({ length: 4 }).map((_, idx) => (
                                        <div
                                            key={idx}
                                            className="flex-shrink-0 w-40 p-4 rounded-2xl border-0 bg-muted/30 shadow-none animate-pulse"
                                            aria-hidden="true"
                                        >
                                            <div className="flex flex-col items-center">
                                                <div className="w-16 h-16 rounded-full bg-muted-foreground/10 mb-3" />
                                                <div className="w-20 h-4 rounded-full bg-muted-foreground/10 mb-2" />
                                                <div className="w-16 h-3 rounded-full bg-muted-foreground/10 mb-3" />
                                                <div className="w-14 h-3 rounded-full bg-muted-foreground/10 mb-1" />
                                                <div className="w-20 h-3 rounded-full bg-muted-foreground/10 mb-4" />
                                                <div className="w-full h-6 rounded-full bg-muted-foreground/10" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : topStudents.length === 0 ? (
                                <div className="w-full py-8 text-center border-0 rounded-xl">
                                    <p className="text-sm text-muted-foreground italic">
                                        The leaderboard is empty. Step up and lead the way!
                                    </p>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    {topStudents.map((student, idx) => (
                                        <LeaderboardItem
                                            key={student.user_id}
                                            student={student}
                                            idx={idx}
                                            reactions={reactions}
                                            myReactions={myReactions}
                                            toggleReaction={toggleReaction}
                                            reactionBurst={reactionBurst}
                                            formatTimeReadable={formatTimeReadable}
                                            onSelect={setSelectedUserId}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {!started && !completed && (
                        <Button
                            className="mt-4 px-8 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm mx-auto block"
                            disabled={loading || attemptedToday || !selfUserId}
                            onClick={startTrivia}
                        >
                            {attemptedToday ? "Already Completed Today" : "Start Daily Trivia"}
                        </Button>
                    )}

                    {started && !completed && (
                        <Button className="w-full mt-4" disabled variant="outline">
                            Trivia in Progress...
                        </Button>
                    )}

                    {completed && savedScore && (
                        <div className="mt-2 w-full max-w-2xl mx-auto animate-fade-in overflow-hidden rounded-xl border-0 bg-white dark:bg-muted/70 shadow-xl">
                            <div className="relative overflow-hidden p-6 sm:p-8 text-center text-white">
                                <div
                                    className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                                    style={{ backgroundImage: "url('/background05.jpg')" }}
                                >
                                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px]"></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                                </div>

                                <div className="relative z-10">
                                    <div className="mb-3 flex justify-center">
                                        <div className="rounded-full bg-white/20 p-4 backdrop-blur-md border border-white/30 shadow-2xl">
                                            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                                        </div>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl   tracking-tight uppercase drop-shadow-md">
                                        Congratulations!
                                    </h2>
                                    <p className="text-blue-50 font-medium opacity-95 text-base sm:text-lg mt-1 drop-shadow-sm">
                                        You've successfully completed today's trivia challenge.
                                    </p>
                                </div>
                            </div>

                            <div className="p-2 sm:p-4">
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 text-center border-0">
                                        <div className="flex justify-center mb-1">
                                            <Target className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wider">Score</p>
                                        <p className="text-xl sm:text-2xl   text-gray-900 dark:text-white">
                                            {savedScore.correct_answers}/{savedScore.total_questions}
                                        </p>
                                        <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-bold mt-1 uppercase tracking-tighter">Streak +1 🔥</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 text-center border-0">
                                        <div className="flex justify-center mb-1">
                                            <Timer className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wider">Time</p>
                                        <p className="text-xl sm:text-2xl   text-gray-900 dark:text-white">
                                            {timeUsedToday !== null ? `${timeUsedToday}s` : "0s"}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">Total Effort</p>
                                    </div>
                                </div>

                                <div className="space-y-2 p-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-gray-400" />
                                            <h3 className="text-xs sm:text-sm font-bold uppercase text-gray-400 tracking-widest">Performance</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="flex items-center text-[8px] sm:text-[10px] font-bold"><span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span> Elite</span>
                                            <span className="flex items-center text-[8px] sm:text-[10px] font-bold"><span className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></span> Avg</span>
                                            <span className="flex items-center text-[8px] sm:text-[10px] font-bold"><span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span> Review</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-semibold">
                                            <span className="text-gray-700 dark:text-gray-300">Accuracy</span>
                                            <span className="text-blue-600 font-bold">{scorePercentage}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden shadow-none border-0">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${scorePercentage >= 80
                                                    ? "bg-gradient-to-r from-emerald-400 to-green-500"
                                                    : scorePercentage >= 60
                                                        ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                                                        : "bg-gradient-to-r from-red-500 to-orange-500"
                                                    }`}
                                                style={{ width: `${scorePercentage}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-semibold">
                                            <span className="text-gray-700 dark:text-gray-300">Speed Efficiency</span>
                                            <span className="text-blue-600 font-bold">
                                                {timeUsedToday !== null && `${Math.floor(timeUsedToday / 60)}m ${timeUsedToday % 60}s`}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden shadow-none border-0">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${timePercentage <= 50
                                                    ? "bg-gradient-to-r from-emerald-400 to-green-500"
                                                    : timePercentage <= 70
                                                        ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                                                        : "bg-gradient-to-r from-red-500 to-orange-500"
                                                    }`}
                                                style={{ width: `${timePercentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 sm:p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-0 text-center italic text-blue-800 dark:text-blue-300 font-medium text-sm sm:text-base">
                                    {motivationalMessage}
                                </div>

                                <div className="mt-6 sm:mt-8 relative overflow-hidden rounded-2xl bg-slate-900 p-4 sm:p-6 text-white shadow-none group transition-all hover:scale-[1.01]">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="inline-block px-3 py-1 rounded-xl bg-blue-600 text-[10px] font-bold tracking-widest">
                                                Medrae Pro Advantage
                                            </span>
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Master Your Exams Faster</h3>
                                        <p className="text-slate-300 text-xs sm:text-sm mb-6 leading-relaxed">
                                            This daily trivia is just a taste. Unlock <strong>thousands of organized questions</strong> and in-depth explanations to guarantee your success.
                                        </p>

                                        <button
                                            onClick={() => navigate("/Medrae-quizzes")}
                                            className="w-full py-3 sm:py-4 bg-white dark:bg-muted/50 text-slate-900 dark:text-white   rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-3 shadow-lg text-sm sm:text-base"
                                        >
                                            EXPLORE MEDRAE QUIZZES
                                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                                        </button>

                                        <p className="mt-4 text-center text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Challenge refreshes in 24 hours
                                        </p>
                                    </div>

                                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-600/30 rounded-full blur-[80px]"></div>
                                </div>

                                <div className="mt-4 sm:mt-6 mb-4 text-center">
                                    <p className="text-gray-400 dark:text-gray-500 text-[10px] sm:text-xs font-bold tracking-widest">
                                        MEDRAE: <span className="text-gray-900 dark:text-gray-200">Advancing nursing education and student success.</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-center">
                        <Button
                            variant="ghost"
                            className="flex items-center justify-center gap-2 px-3 py-2 mt-4 rounded-full transition-transform duration-300 ease-in-out hover:scale-105 hover:bg-transparent"
                            onClick={shareOnWhatsApp}
                            title="Share on WhatsApp"
                        >
                            <svg
                                role="img"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                                style={{ width: "28px", height: "28px" }}
                            >
                                <title>WhatsApp</title>
                                <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            <span className="text-sm">Invite a Friend</span>
                        </Button>
                    </div>
                    <UserProfileModal
                        userId={selectedUserId}
                        onClose={() => setSelectedUserId(null)}
                    />
                </CardContent>
            </Card>
        </div>
    );
};