"use client";

import {
    useEffect,
    useState,
    useCallback,
    useMemo,
    useRef,
    memo,
    useTransition,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    X,
    Zap,
    Eye,
    Trophy,
    Star,
    Cpu,
    ClipboardCheck,
    RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Props {
    userId: string | null;
    onClose: () => void;
}

interface Profile {
    user_id: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
    institution: string | null;
    course: string | null;
    block: string | null;
    county: string | null;
    bio: string | null;
    role: string;
    specialization: string | null;
    joined_date: string | null;
    is_online: boolean | null;
    last_seen: string | null;
}

interface QuizResult {
    id: string;
    unit: string | null;
    score: number;
    total_questions: number;
    submitted_at: string;
}

interface SimulationResult {
    id: string;
    paper_id: string | null;
    paper_name?: string | null;
    score: number;
    total_questions: number;
    submitted_at: string;
}

interface TriviaResult {
    id: string;
    score: number;
    total_questions: number;
    attempt_date: string;
}

interface UserDataState {
    profile: Profile | null;
    quizResults: QuizResult[];
    simulationResults: SimulationResult[];
    triviaResults: TriviaResult[];
    totalFeedSeen: number;
    currentStreak: number;
    bestStreak: number;
    isLoading: boolean;
    isPaperTitlesLoaded: boolean;
}

/* ------------------------------------------------------------------ */
/*  Skeletons — flat, no borders                                      */
/* ------------------------------------------------------------------ */

const SkeletonStatCard = memo(() => (
    <div className="flex flex-col items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse">
        <div className="w-4 h-4 mb-2 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="w-8 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
        <div className="w-12 h-2 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
));
SkeletonStatCard.displayName = "SkeletonStatCard";

const SkeletonStreakCard = memo(() => (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 flex items-center gap-3 animate-pulse">
        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1">
            <div className="w-12 h-2 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
            <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
    </div>
));
SkeletonStreakCard.displayName = "SkeletonStreakCard";

const SkeletonHistoryItem = memo(() => (
    <div className="flex justify-between items-center p-2 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse">
        <div className="w-32 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="w-10 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
));
SkeletonHistoryItem.displayName = "SkeletonHistoryItem";

const SkeletonAcademicDetail = memo(() => (
    <div className="flex justify-between flex-wrap gap-2 animate-pulse">
        <div className="w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
));
SkeletonAcademicDetail.displayName = "SkeletonAcademicDetail";

/* ------------------------------------------------------------------ */
/*  Stat card — flat, no borders                                      */
/* ------------------------------------------------------------------ */

const StatCard = memo(
    ({
        val,
        lab,
        color,
        icon: Icon,
    }: {
        val: number;
        lab: string;
        color: string;
        icon: any;
    }) => (
        <div
            className="flex flex-col items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl active:scale-95 transition-transform"
            style={{ touchAction: "manipulation" }}
        >
            <Icon className={`w-4 h-4 mb-2 ${color}`} />
            <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                {val}
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                {lab}
            </p>
        </div>
    )
);
StatCard.displayName = "StatCard";

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export const UserProfileModal = ({ userId, onClose }: Props) => {
    const [userData, setUserData] = useState<UserDataState>({
        profile: null,
        quizResults: [],
        simulationResults: [],
        triviaResults: [],
        totalFeedSeen: 0,
        currentStreak: 0,
        bestStreak: 0,
        isLoading: true,
        isPaperTitlesLoaded: false,
    });

    const [isAvatarOpen, setIsAvatarOpen] = useState(false);
    const [hasAnimationCompleted, setHasAnimationCompleted] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const isMounted = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);
    const paperTitlesLoadedRef = useRef(false);
    const [, startTransition] = useTransition();

    /* ---------------- Fetch ---------------- */

    const fetchUserData = useCallback(
        async (forceRefresh = false) => {
            if (!userId) return;
            if (!hasAnimationCompleted && !forceRefresh) return;

            if (abortControllerRef.current) abortControllerRef.current.abort();
            abortControllerRef.current = new AbortController();

            setIsRefreshing(true);

            try {
                const [profileResult, activityResult, feedResult, streaksResult] =
                    await Promise.all([
                        supabase
                            .from("profiles")
                            .select(
                                "user_id, name, username, avatar_url, institution, course, block, county, bio, role, specialization, joined_date, is_online, last_seen"
                            )
                            .eq("user_id", userId)
                            .single(),
                        Promise.all([
                            supabase
                                .from("quiz_results")
                                .select("id, unit, score, total_questions, submitted_at")
                                .eq("user_id", userId)
                                .order("submitted_at", { ascending: false })
                                .limit(10),
                            supabase
                                .from("simulation_results")
                                .select("id, paper_id, score, total_questions, submitted_at")
                                .eq("user_id", userId)
                                .order("submitted_at", { ascending: false })
                                .limit(10),
                            supabase
                                .from("daily_trivia_results")
                                .select("id, score, total_questions, attempt_date")
                                .eq("user_id", userId)
                                .order("attempt_date", { ascending: false })
                                .limit(10),
                        ]),
                        supabase
                            .from("qfeed_seen")
                            .select("*", { count: "exact", head: true })
                            .eq("user_id", userId),
                        supabase
                            .from("login_activity")
                            .select("streak")
                            .eq("user_id", userId)
                            .order("login_date", { ascending: false }),
                    ]);

                const profileData = profileResult.data as Profile | null;
                const [quizData, simData, triviaData] = activityResult;
                const quizList = (quizData?.data || []) as QuizResult[];
                const simList = (simData?.data || []) as SimulationResult[];
                const triviaList = (triviaData?.data || []) as TriviaResult[];
                const streakData = streaksResult.data || [];
                const latestStreak =
                    streakData.length > 0 ? streakData[0].streak || 0 : 0;
                const maxStreak =
                    streakData.length > 0
                        ? Math.max(...streakData.map((r: any) => r.streak || 0))
                        : 0;

                startTransition(() => {
                    setUserData((prev) => ({
                        ...prev,
                        profile: profileData,
                        quizResults: quizList,
                        simulationResults: simList,
                        triviaResults: triviaList,
                        totalFeedSeen: feedResult.count || 0,
                        currentStreak: latestStreak,
                        bestStreak: maxStreak,
                        isLoading: false,
                    }));
                });

                if (simList.length > 0 && !paperTitlesLoadedRef.current) {
                    const paperIds = simList.map((r) => r.paper_id).filter(Boolean);
                    if (paperIds.length > 0) {
                        const { data: papers } = await supabase
                            .from("simulation_papers")
                            .select("id, title")
                            .in("id", paperIds as string[]);

                        if (papers && isMounted.current) {
                            paperTitlesLoadedRef.current = true;
                            setUserData((prev) => ({
                                ...prev,
                                simulationResults: prev.simulationResults.map((r) => ({
                                    ...r,
                                    paper_name:
                                        papers.find((p) => p.id === r.paper_id)?.title ||
                                        "Paper",
                                })),
                                isPaperTitlesLoaded: true,
                            }));
                        }
                    } else {
                        paperTitlesLoadedRef.current = true;
                    }
                }
            } catch (err) {
                if (!(err instanceof DOMException && err.name === "AbortError")) {
                    console.error("Error loading user activity:", err);
                }
                if (isMounted.current) {
                    setUserData((prev) => ({ ...prev, isLoading: false }));
                }
            } finally {
                abortControllerRef.current = null;
                setIsRefreshing(false);
            }
        },
        [userId, hasAnimationCompleted]
    );

    const handleRefresh = useCallback(() => {
        if (!isRefreshing) {
            paperTitlesLoadedRef.current = false;
            fetchUserData(true);
        }
    }, [fetchUserData, isRefreshing]);

    useEffect(() => {
        if (hasAnimationCompleted && userId) fetchUserData();
    }, [hasAnimationCompleted, userId, fetchUserData]);

    useEffect(() => {
        isMounted.current = true;
        document.body.style.overflow = "hidden";
        paperTitlesLoadedRef.current = false;
        setHasAnimationCompleted(false);

        return () => {
            isMounted.current = false;
            document.body.style.overflow = "";
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [userId]);

    /* ---------------- Memo ---------------- */

    const statsData = useMemo(
        () => [
            {
                val: userData.totalFeedSeen,
                lab: "Seen",
                color: "text-blue-600",
                icon: Eye,
            },
            {
                val: userData.quizResults.length,
                lab: "Quizzes",
                color: "text-emerald-600",
                icon: ClipboardCheck,
            },
            {
                val: userData.simulationResults.length,
                lab: "Sims",
                color: "text-blue-600",
                icon: Cpu,
            },
            {
                val: userData.triviaResults.length,
                lab: "Trivia",
                color: "text-amber-600",
                icon: Star,
            },
        ],
        [
            userData.totalFeedSeen,
            userData.quizResults.length,
            userData.simulationResults.length,
            userData.triviaResults.length,
        ]
    );

    /* ---------------- Handlers ---------------- */

    const handleClose = useCallback(
        (e?: React.MouseEvent) => {
            e?.stopPropagation();
            onClose();
        },
        [onClose]
    );

    const handleAvatarOpen = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsAvatarOpen(true);
    }, []);

    const handleAvatarClose = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsAvatarOpen(false);
    }, []);

    if (!userId) return null;

    /* ---------------- Theme tokens ---------------- */

    const surface = "bg-white dark:bg-slate-900";
    const surfaceAlt = "bg-slate-100 dark:bg-slate-800";
    const textMain = "text-slate-900 dark:text-white";
    const textSub = "text-slate-500 dark:text-slate-400";
    const accentBg = "bg-blue-600";
    const accentText = "text-blue-600 dark:text-blue-400";

    return createPortal(
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
            >
                <motion.div
                    className={`${surface} w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl overflow-hidden relative max-h-[92vh] flex flex-col`}
                    initial={{ y: 400 }}
                    animate={{ y: 0 }}
                    exit={{ y: 400 }}
                    transition={{ type: "tween", duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                    onAnimationComplete={() => setHasAnimationCompleted(true)}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ---------------- Header — flat blue ---------------- */}
                    <div className="relative h-36 flex flex-col flex-shrink-0">
                        <div className={`absolute inset-0 ${accentBg}`} />

                        <div className="absolute top-0 right-0 p-4 sm:p-6 z-20 flex gap-2">
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className={`p-2 bg-white/15 rounded-full text-white active:scale-95 transition-transform ${isRefreshing ? "opacity-50" : ""
                                    }`}
                                style={{ touchAction: "manipulation" }}
                                aria-label="Refresh data"
                            >
                                <RefreshCw
                                    className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
                                />
                            </button>
                            <button
                                onClick={handleClose}
                                className="p-2 bg-white/15 rounded-full text-white active:scale-95 transition-transform"
                                style={{ touchAction: "manipulation" }}
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="relative flex justify-center translate-y-1/2 z-30">
                            <div className="relative group">
                                <img
                                    src={userData.profile?.avatar_url || "/UsersAvatar.jpg"}
                                    onClick={handleAvatarOpen}
                                    className="relative cursor-pointer w-28 h-28 rounded-full object-cover active:scale-95 transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                    loading="eager"
                                    alt="User avatar"
                                />
                                {userData.profile?.is_online && (
                                    <span className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ---------------- Scrollable content ---------------- */}
                    <div
                        className="relative flex-1 overflow-y-auto hide-scrollbar pt-16 px-6 pb-24 z-10"
                        style={{ contain: "content" }}
                    >
                        {userData.isLoading || !hasAnimationCompleted ? (
                            <div className="flex flex-col">
                                <div className="flex flex-col items-center text-center mb-6">
                                    <div className="w-32 h-7 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse mb-2" />
                                    <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <SkeletonStreakCard />
                                    <SkeletonStreakCard />
                                </div>

                                <div className="grid grid-cols-4 gap-2 mb-8">
                                    {[...Array(4)].map((_, i) => (
                                        <SkeletonStatCard key={i} />
                                    ))}
                                </div>

                                <div className="p-5 bg-slate-100 dark:bg-slate-800 rounded-3xl mb-8">
                                    <div className="w-32 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
                                    <div className="space-y-3">
                                        {[...Array(4)].map((_, i) => (
                                            <SkeletonAcademicDetail key={i} />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="w-48 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="w-32 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                            {[...Array(3)].map((_, j) => (
                                                <SkeletonHistoryItem key={j} />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : userData.profile ? (
                            <div className="flex flex-col">
                                {/* Identity */}
                                <div className="flex flex-col items-center text-center mb-6">
                                    <h2 className={`text-2xl font-bold ${textMain} tracking-tight leading-tight`}>
                                        {userData.profile.name || "Student"}
                                    </h2>
                                    <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                                        <span className={`text-sm font-bold ${accentText}`}>
                                            @{userData.profile.username || "user"}
                                        </span>
                                        {userData.profile.is_online !== null && (
                                            <>
                                                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                                <span
                                                    className={`text-[10px] font-bold uppercase tracking-widest ${userData.profile.is_online
                                                        ? "text-emerald-500"
                                                        : textSub
                                                        }`}
                                                >
                                                    {userData.profile.is_online
                                                        ? "Active Now"
                                                        : "Offline"}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Streaks — flat cards */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className={`${surfaceAlt} rounded-2xl p-3 flex items-center gap-3`}>
                                        <div className="p-2 bg-amber-500 rounded-xl text-white">
                                            <Zap className="w-5 h-5 fill-current" />
                                        </div>
                                        <div>
                                            <p className={`text-[9px] font-bold uppercase leading-none mb-1 ${textSub}`}>
                                                Current
                                            </p>
                                            <p className={`text-sm font-bold ${textMain}`}>
                                                {userData.currentStreak} Days
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`${surfaceAlt} rounded-2xl p-3 flex items-center gap-3`}>
                                        <div className="p-2 bg-amber-500 rounded-xl text-white">
                                            <Trophy className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className={`text-[9px] font-bold uppercase leading-none mb-1 ${textSub}`}>
                                                Best
                                            </p>
                                            <p className={`text-sm font-bold ${textMain}`}>
                                                {userData.bestStreak} Days
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-4 gap-2 mb-8">
                                    {statsData.map((stat, i) => (
                                        <StatCard key={i} {...stat} />
                                    ))}
                                </div>

                                {/* Academic info — flat */}
                                <div className={`${surfaceAlt} p-5 rounded-3xl mb-8`}>
                                    <p className={`text-[10px] font-bold ${textSub} uppercase tracking-[2px] mb-4`}>
                                        Academic Details
                                    </p>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between flex-wrap gap-2">
                                            <span className={`${textSub} font-bold uppercase text-[10px]`}>
                                                Institution
                                            </span>
                                            <span className={`font-bold ${textMain} text-right`}>
                                                {userData.profile.institution || "-"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between flex-wrap gap-2">
                                            <span className={`${textSub} font-bold uppercase text-[10px]`}>
                                                Course / Block
                                            </span>
                                            <span className={`font-bold ${textMain} text-right`}>
                                                {userData.profile.course || "-"} /{" "}
                                                {userData.profile.block || "-"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between flex-wrap gap-2">
                                            <span className={`${textSub} font-bold uppercase text-[10px]`}>
                                                County
                                            </span>
                                            <span className={`font-bold ${textMain} text-right`}>
                                                {userData.profile.county || "-"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between flex-wrap gap-2">
                                            <span className={`${textSub} font-bold uppercase text-[10px]`}>
                                                Specialization
                                            </span>
                                            <span className={`font-bold ${accentText} text-right`}>
                                                {userData.profile.specialization || "-"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Performance History — flat */}
                                <div className="space-y-6">
                                    <h4 className={`text-xs font-bold ${textMain} uppercase tracking-[2px] flex items-center gap-2`}>
                                        <div className={`w-1.5 h-4 ${accentBg} rounded-full`} />
                                        Performance History
                                    </h4>

                                    {userData.quizResults.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                                Recent Quizzes
                                            </p>
                                            <div className="space-y-2">
                                                {userData.quizResults.slice(0, 3).map((quiz) => (
                                                    <div
                                                        key={quiz.id}
                                                        className={`flex justify-between items-center p-2 ${surfaceAlt} rounded-xl`}
                                                    >
                                                        <span className={`text-xs font-medium truncate max-w-[150px] ${textMain}`}>
                                                            {quiz.unit || "Quiz"}
                                                        </span>
                                                        <span className="text-xs font-bold text-emerald-600">
                                                            {Math.round(
                                                                (quiz.score / quiz.total_questions) * 100
                                                            )}
                                                            %
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {userData.simulationResults.length > 0 && (
                                        <div className="space-y-2">
                                            <p className={`text-[10px] font-bold ${accentText} uppercase tracking-wider`}>
                                                Recent Simulations
                                            </p>
                                            <div className="space-y-2">
                                                {userData.simulationResults.slice(0, 3).map((sim) => (
                                                    <div
                                                        key={sim.id}
                                                        className={`flex justify-between items-center p-2 ${surfaceAlt} rounded-xl`}
                                                    >
                                                        <span className={`text-xs font-medium truncate max-w-[150px] ${textMain}`}>
                                                            {sim.paper_name || "Simulation"}
                                                        </span>
                                                        <span className={`text-xs font-bold ${accentText}`}>
                                                            {Math.round(
                                                                (sim.score / sim.total_questions) * 100
                                                            )}
                                                            %
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {userData.triviaResults.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                                                Daily Trivia
                                            </p>
                                            <div className="space-y-2">
                                                {userData.triviaResults.slice(0, 3).map((trivia) => (
                                                    <div
                                                        key={trivia.id}
                                                        className={`flex justify-between items-center p-2 ${surfaceAlt} rounded-xl`}
                                                    >
                                                        <span className={`text-xs font-medium ${textMain}`}>
                                                            {new Date(trivia.attempt_date).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-xs font-bold text-amber-600">
                                                            {Math.round(
                                                                (trivia.score / trivia.total_questions) * 100
                                                            )}
                                                            %
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 text-center">
                                    <p className={`text-[9px] font-bold ${textSub} uppercase tracking-[3px]`}>
                                        Student Since{" "}
                                        {userData.profile.joined_date
                                            ? new Date(userData.profile.joined_date).getFullYear()
                                            : "2024"}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <p className={`${textSub} font-bold uppercase tracking-widest text-xs`}>
                                    No profile discovered
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* ---------------- Avatar zoom ---------------- */}
                <AnimatePresence>
                    {isAvatarOpen && (
                        <motion.div
                            className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleAvatarClose}
                        >
                            <motion.img
                                src={userData.profile?.avatar_url || "/UsersAvatar.jpg"}
                                className="max-h-[80vh] max-w-full rounded-3xl"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.9 }}
                                transition={{ type: "tween", duration: 0.2 }}
                                onClick={(e) => e.stopPropagation()}
                                alt="User avatar enlarged"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};