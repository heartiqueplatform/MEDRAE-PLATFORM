"use client";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageCircle, Timer, Award, Stethoscope, ArrowRight, Zap, TrendingUp, Book, Target, Eye, Trophy, ThumbsUp, Flame, Clap, AlertCircle } from "lucide-react";
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

// Cache helpers with TTL
const questionCache = new Map();
const topStudentsCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REACTION_DEBOUNCE = 500;

// Memoized leaderboard item for reduced re-renders
const LeaderboardItem = memo(({
    student,
    idx,
    reactions,
    myReactions,
    toggleReaction,
    reactionBurst,
    formatTimeReadable,
    onSelect
}: {
    student: TopStudent;
    idx: number;
    reactions: Record<string, { like: number; fire: number; clap: number }>;
    myReactions: Record<string, string[]>;
    toggleReaction: (userId: string, reaction: "like" | "fire" | "clap") => Promise<void>;
    reactionBurst: (emoji: "like" | "fire" | "clap") => void;
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
        className={`relative flex-shrink-0 w-40 p-4 rounded-2xl border flex flex-col items-center cursor-pointer transition-all will-change-transform
            ${idx === 0 ? "bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-900/10 dark:to-background border-amber-200 dark:border-amber-800 shadow-md shadow-amber-500/10"
                : "bg-card border-border shadow-sm hover:shadow-md"}`}
    >
        <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border
            ${idx === 0 ? "bg-amber-500 text-white border-amber-600"
                : idx === 1 ? "bg-slate-400 text-white border-slate-500"
                    : idx === 2 ? "bg-orange-500 text-white border-orange-600"
                        : "bg-muted text-muted-foreground border-border"}`}>
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

        <div className="flex flex-col items-center gap-1 w-full pt-2 border-t border-border/50">
            <div className="text-sm font-bold text-primary">
                {student.score.toLocaleString()} <span className="text-[10px] font-medium opacity-70">PTS</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Timer className="w-3 h-3" />
                {student.timeUsed !== undefined ? formatTimeReadable(student.timeUsed) : "--"}
            </div>
        </div>

        <div className="flex items-center justify-center gap-1 mt-4 w-full bg-muted/30 rounded-full py-1 border border-border/50">
            <ReactionButton
                type="like"
                emoji="👍"
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
                emoji="🔥"
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
                emoji="👏"
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

// Memoized reaction button for reduced re-renders
const ReactionButton = memo(({
    type,
    emoji,
    count,
    isActive,
    onClick
}: {
    type: string;
    emoji: string;
    count: number;
    isActive: boolean;
    onClick: (e: React.MouseEvent) => void;
}) => (
    <motion.button
        whileTap={{ scale: 1.3 }}
        onClick={onClick}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-all duration-150
            ${isActive ? "bg-primary/20 ring-1 ring-primary/40" : "hover:bg-background"}`}
    >
        <span className="text-xs">{emoji}</span>
        <span className={`text-[10px] font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
            {count}
        </span>
    </motion.button>
));

ReactionButton.displayName = "ReactionButton";

// Memoized question option for reduced re-renders
const QuestionOption = memo(({
    letter,
    text,
    isSelected,
    isDisabled,
    onClick
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

// Time Warning Component
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

    const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [started, setStarted] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [timer, setTimer] = useState(5 * 60);
    const [loading, setLoading] = useState(true);
    const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
    const [reactions, setReactions] = useState<Record<string, { like: number; fire: number; clap: number }>>({});
    const [myReactions, setMyReactions] = useState<Record<string, string[]>>({});
    const [attemptedToday, setAttemptedToday] = useState(false);
    const [timeUsedToday, setTimeUsedToday] = useState<number | null>(null);
    const [savedScore, setSavedScore] = useState<{ correct_answers: number; total_questions: number } | null>(null);
    const startTimeRef = useRef<number>(0);
    const [completedAt, setCompletedAt] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [topLoading, setTopLoading] = useState(true);
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
    // FIXED: Load questions with "Always Show Cache First" strategy
    // ============================================
    useEffect(() => {
        async function loadQuestions() {
            if (isFetchingQuestions.current) return;
            isFetchingQuestions.current = true;

            const cacheKey = `trivia_questions_${today}`;
            let hasCache = false;

            // 1. ALWAYS show cached questions immediately (if available)
            const stored = localStorage.getItem(cacheKey);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.data && parsed.data.length > 0) {
                        hasCache = true;
                        if (isMounted.current) {
                            setQuestions(parsed.data);
                            setLoading(false);
                            console.log("✅ Questions loaded from cache");
                        }
                    }
                } catch (e) {
                    localStorage.removeItem(cacheKey);
                }
            }

            // 2. If no cache, show loading state
            if (!hasCache && isMounted.current) {
                setLoading(true);
            }

            // 3. ALWAYS try to fetch fresh questions in background
            try {
                const { data, error } = await supabase.rpc("get_random_quiz_questions", {
                    limit_count: 15,
                });

                if (!error && data && data.length > 0 && isMounted.current) {
                    // Update with fresh data
                    setQuestions(data);
                    setLoading(false);

                    // Update cache with timestamp
                    const cacheData = { data, timestamp: Date.now() };
                    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                    console.log("✅ Fresh questions fetched and cached");
                } else if (!hasCache) {
                    // If no cache AND fetch failed, show empty state
                    if (isMounted.current) {
                        setQuestions([]);
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error("❌ Trivia fetch failed:", err);
                // If we have cache, we already showed it, so just keep it
                if (!hasCache && isMounted.current) {
                    setQuestions([]);
                    setLoading(false);
                }
            } finally {
                if (isMounted.current) {
                    setLoading(false);
                }
                isFetchingQuestions.current = false;
            }
        }
        loadQuestions();
    }, [today]);

    // ============================================
    // FIXED: Fetch top students with "Always Show Cache First" strategy
    // ============================================
    const fetchTop = useCallback(async () => {
        if (!isMounted.current || isFetchingTop.current) return;

        const cacheKey = `trivia_top_${today}`;
        const stored = localStorage.getItem(cacheKey);
        let hasCache = false;

        // 1. ALWAYS show cached leaderboard immediately (if available)
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.data && parsed.data.length > 0) {
                    hasCache = true;
                    if (isMounted.current) {
                        setTopStudents(parsed.data);
                        setTopLoading(false);
                        console.log("✅ Leaderboard loaded from cache");
                    }
                }
            } catch (e) {
                localStorage.removeItem(cacheKey);
            }
        }

        // 2. ALWAYS try to fetch fresh data in background
        if (!isFetchingTop.current) {
            isFetchingTop.current = true;
            try {
                const { data: results } = await supabase
                    .from("daily_trivia_results")
                    .select("user_id, score, time_used, created_at")
                    .eq("attempt_date", today)
                    .order("score", { ascending: false })
                    .limit(10);

                if (results && results.length > 0) {
                    const ids = results.map((r) => r.user_id);
                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("user_id, name, avatar_url, institution")
                        .in("user_id", ids);

                    const profileMap = new Map();
                    profiles?.forEach(p => profileMap.set(p.user_id, p));

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

                    if (isMounted.current) {
                        setTopStudents(leaderboardData);
                        // Cache with timestamp
                        localStorage.setItem(cacheKey, JSON.stringify({
                            data: leaderboardData,
                            timestamp: Date.now()
                        }));
                        console.log("✅ Fresh leaderboard fetched and cached");
                    }
                } else if (!hasCache) {
                    // If no results AND no cache, show empty state
                    if (isMounted.current) {
                        setTopStudents([]);
                    }
                }
            } catch (err) {
                console.error("❌ Leaderboard fetch failed:", err);
                // If we have cache, keep showing it
                if (!hasCache && isMounted.current) {
                    setTopStudents([]);
                }
            } finally {
                isFetchingTop.current = false;
                if (isMounted.current) {
                    setTopLoading(false);
                }
            }
        }

        // 3. ALWAYS FETCH REACTIONS (non-critical, try but don't fail)
        try {
            const { data: reactionData } = await supabase
                .from("trivia_reactions")
                .select("reactor_id, target_user_id, reaction")
                .eq("attempt_date", today);

            if (reactionData && isMounted.current) {
                const counts: Record<string, { like: number; fire: number; clap: number }> = {};
                const mine: Record<string, string[]> = {};

                reactionData.forEach((r) => {
                    const targetId = r.target_user_id;
                    const type = r.reaction as "like" | "fire" | "clap";

                    if (!counts[targetId]) {
                        counts[targetId] = { like: 0, fire: 0, clap: 0 };
                    }
                    counts[targetId][type] = (counts[targetId][type] || 0) + 1;

                    if (selfUserId && r.reactor_id === selfUserId) {
                        if (!mine[targetId]) mine[targetId] = [];
                        if (!mine[targetId].includes(type)) mine[targetId].push(type);
                    }
                });

                setReactions(counts);
                setMyReactions(mine);
            }
        } catch (err) {
            console.error("❌ Reactions fetch failed (non-critical):", err);
            // Don't show error - reactions are non-critical
        }

        if (isMounted.current) setTopLoading(false);
    }, [today, selfUserId]);

    // ============================================
    // FIXED: Retry loading when connection returns
    // ============================================
    useEffect(() => {
        const handleOnline = () => {
            console.log("🌐 Connection restored - retrying data fetch");

            // Retry questions if empty or loading
            if (questions.length === 0 && !isFetchingQuestions.current) {
                // Force reload questions by re-triggering the effect
                setLoading(true);
                const cacheKey = `trivia_questions_${today}`;
                localStorage.removeItem(cacheKey);
                // The useEffect will re-run due to today dependency
            }

            // Retry leaderboard
            fetchTop();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [questions.length, fetchTop, today]);

    useEffect(() => {
        // Cache Janitor: Cleans up old trivia data from previous days
        const cleanOldCache = () => {
            const todayKey = new Date().toISOString().slice(0, 10);
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                // If the key is a trivia key but NOT today's key, delete it
                if (key?.startsWith('trivia_') && !key.includes(todayKey)) {
                    localStorage.removeItem(key);
                }
            }
        };
        cleanOldCache();
    }, []);

    useEffect(() => {
        fetchTop();

        // We only want to refresh on focus if the user has been away for a long time
        const handleFocus = () => {
            fetchTop(); // Our new fetchTop handles the timing check internally now!
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [fetchTop]);

    // Optimized timer with cleanup and auto-submit logic
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

                // Show warning at 60 seconds
                if (newTime === 60 && !timeWarningShownRef.current) {
                    timeWarningShownRef.current = true;
                    setShowTimeWarning(true);
                    playSound("notification");
                }

                // Auto-submit at 10 seconds
                if (newTime === 10) {
                    if (autoSubmitTimeoutRef.current) {
                        clearTimeout(autoSubmitTimeoutRef.current);
                    }
                    // Show countdown
                    setAutoSubmitCountdown(10);
                    autoSubmitTimeoutRef.current = setTimeout(() => {
                        if (isMounted.current && !completed) {
                            // Show final warning toast
                            toast({
                                title: "⏰ Time's Up!",
                                description: "Auto-submitting your answers. Work on your speed to get better and come back tomorrow!",
                                variant: "destructive",
                            });
                            finishTrivia();
                        }
                    }, 10000);
                }

                // Update countdown display
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

    const reactionBurst = useCallback((emoji: "like" | "fire" | "clap") => {
        playSound("ui-tap");

        const config = {
            like: { emoji: "👍", color: "#3b82f6" },
            fire: { emoji: "🔥", color: "#f97316" },
            clap: { emoji: "👏", color: "#22c55e" },
        };

        const selected = config[emoji];

        // Optimized confetti with requestAnimationFrame
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

    // Optimized: Debounced reaction toggle
    const toggleReaction = useCallback(async (
        targetUserId: string,
        reaction: "like" | "fire" | "clap"
    ) => {
        if (!selfUserId) return;

        // Rate limiting
        const now = Date.now();
        if (now - lastReactionTime.current < REACTION_DEBOUNCE) return;
        lastReactionTime.current = now;

        const todayString = today;
        const alreadyReacted = myReactions[targetUserId]?.includes(reaction) || false;

        // Optimistic update with batched state
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
                await supabase
                    .from("trivia_reactions")
                    .delete()
                    .eq("reactor_id", selfUserId)
                    .eq("target_user_id", targetUserId)
                    .eq("reaction", reaction)
                    .eq("attempt_date", todayString);
            } else {
                await supabase
                    .from("trivia_reactions")
                    .upsert({
                        reactor_id: selfUserId,
                        target_user_id: targetUserId,
                        attempt_date: todayString,
                        reaction,
                    }, {
                        onConflict: ["reactor_id", "target_user_id", "attempt_date", "reaction"],
                    });
            }
        } catch (error) {
            // Rollback on error
            console.error("Reaction failed:", error);
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

        // 1. Save results to the database
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

        // 2. SILENT REFRESH: Immediately fetch the new leaderboard
        // without reloading the browser window.
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

            // Celebration confetti (unchanged)
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
    }, [selfUserId, questions, answers, QUIZ_ID, today, fetchTop]); // Added fetchTop to dependencies

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
            <Card className="rounded-md overflow-hidden border-0 relative bg-gray-100 dark:bg-muted/70 shadow-md mt-2">
                <CardHeader className="bg-blue-50 dark:bg-muted/30">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <Brain className="w-6 h-6 text-blue-600 flex-shrink-0" />
                            <CardTitle className="text-base sm:text-lg">Daily 15Teen MindRush Challenge</CardTitle>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0">{questions.length} Questions</Badge>
                    </div>

                    <CardDescription className="flex justify-between items-center flex-wrap gap-2">
                        {started ? (
                            <span className="font-mono flex items-center gap-2">
                                <Timer className="w-4 h-4" />
                                Time left: {fmt(timer)}
                                {autoSubmitCountdown !== null && autoSubmitCountdown > 0 && (
                                    <span className="text-red-600 dark:text-red-400 font-bold animate-pulse">
                                        ⚠️ {autoSubmitCountdown}s
                                    </span>
                                )}
                            </span>
                        ) : (
                            <span className="text-sm">Ready for today's challenge? Sharpen your mind and earn your bragging rights!</span>
                        )}

                        {started && !completed && (
                            <span className="text-sm text-muted-foreground">
                                Q{currentIndex + 1}/{questions.length}
                            </span>
                        )}
                    </CardDescription>
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
                                <div className="w-full bg-gray-50 dark:bg-muted/80 rounded-3xl">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 p-4">
                                        Question {currentIndex + 1} of {questions.length}
                                    </p>
                                    <p className="font-semibold text-lg mb-6 mt-6 p-2 leading-relaxed">{currentQuestion?.question_text}</p>
                                    <div className="flex flex-col gap-6 p-4">
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

                    {/* Leaderboard Section with optimized scrolling */}
                    <div className="mt-10 mb-6 px-1">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
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
                                <div className="flex gap-4 animate-pulse">
                                    {Array.from({ length: 4 }).map((_, idx) => (
                                        <div key={idx} className="flex-shrink-0 w-40 h-64 rounded-xl bg-muted/50 border border-border" />
                                    ))}
                                </div>
                            ) : topStudents.length === 0 ? (
                                <div className="w-full py-8 text-center border-2 border-dashed border-muted rounded-xl">
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
                            className="w-full mt-4"
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
                                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase drop-shadow-md">
                                        Congratulations!
                                    </h2>
                                    <p className="text-blue-50 font-medium opacity-95 text-base sm:text-lg mt-1 drop-shadow-sm">
                                        You've successfully completed today's trivia challenge.
                                    </p>
                                </div>
                            </div>

                            <div className="p-2 sm:p-4">
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 text-center border border-gray-100 dark:border-gray-700">
                                        <div className="flex justify-center mb-1">
                                            <Target className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Score</p>
                                        <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                                            {savedScore.correct_answers}/{savedScore.total_questions}
                                        </p>
                                        <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-bold mt-1 uppercase tracking-tighter">Streak +1 🔥</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 text-center border border-gray-100 dark:border-gray-700">
                                        <div className="flex justify-center mb-1">
                                            <Timer className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Time</p>
                                        <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
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
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700">
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
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700">
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

                                <div className="mt-4 p-3 sm:p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-center italic text-blue-800 dark:text-blue-300 font-medium text-sm sm:text-base">
                                    {motivationalMessage}
                                </div>

                                <div className="mt-6 sm:mt-8 relative overflow-hidden rounded-2xl bg-slate-900 p-4 sm:p-6 text-white shadow-2xl group transition-all hover:scale-[1.01]">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap className="w-4 h-4 text-blue-400 fill-blue-400" />
                                            <span className="inline-block px-3 py-1 rounded-full bg-blue-600 text-[10px] font-bold uppercase tracking-widest">
                                                Medrae Pro Advantage
                                            </span>
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Master Your Exams Faster</h3>
                                        <p className="text-slate-300 text-xs sm:text-sm mb-6 leading-relaxed">
                                            This daily trivia is just a taste. Unlock <strong>thousands of organized questions</strong> and in-depth explanations to guarantee your success.
                                        </p>

                                        <button
                                            onClick={() => navigate("/Medrae-quizzes")}
                                            className="w-full py-3 sm:py-4 bg-white dark:bg-muted/50 text-slate-900 dark:text-white font-black rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-3 shadow-lg text-sm sm:text-base"
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