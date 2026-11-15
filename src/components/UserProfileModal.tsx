// src/components/UserProfileModal.tsx
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
    CheckCircle2,
    BookOpen,
    ShieldCheck,
    Building2,
    GraduationCap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { useFollow } from "@/hooks/useFollow";
import { FollowButton } from "@/components/FollowButton";
import { useAuth } from "@/context/AuthProvider";

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
    role: string | null;
    specialization: string | null;
    joined_date: string | null;
    is_online: boolean | null;
    last_seen: string | null;

    // 🆕 trust + contributor fields
    is_verified_contributor: boolean | null;
    contributor_tier: string | null;
    contributor_bio: string | null;
    nck_license_verified: boolean | null;
    employer_verified: boolean | null;
    nck_number: string | null;
    profile_type: string | null;
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

interface DuelStats {
    wins: number;
    losses: number;
    total: number;
}

interface AuthoredQuiz {
    id: string;
    unit_code: string | null;
    title: string;
    image_url: string | null;
    is_free: boolean;
    question_count: number;
    created_at: string;
}

interface UserDataState {
    profile: Profile | null;
    quizResults: QuizResult[];
    simulationResults: SimulationResult[];
    triviaResults: TriviaResult[];
    authoredQuizzes: AuthoredQuiz[];
    totalFeedSeen: number;
    currentStreak: number;
    bestStreak: number;
    duelStats: DuelStats;
    isLoading: boolean;
    isPaperTitlesLoaded: boolean;
}

const INITIAL_USER_DATA: UserDataState = {
    profile: null,
    quizResults: [],
    simulationResults: [],
    triviaResults: [],
    authoredQuizzes: [],
    totalFeedSeen: 0,
    currentStreak: 0,
    bestStreak: 0,
    duelStats: { wins: 0, losses: 0, total: 0 },
    isLoading: true,
    isPaperTitlesLoaded: false,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const getRoleLabel = (role?: string | null) => {
    switch (role) {
        case "tutor":
            return "Tutor";
        case "staff":
            return "Staff";
        default:
            return "Student";
    }
};

const getTierLabel = (tier?: string | null) => {
    if (!tier) return null;
    const t = tier.toLowerCase();
    if (t === "gold" || t === "silver" || t === "bronze") return t;
    return null;
};

const TIER_STYLES: Record<string, string> = {
    gold: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    silver: "bg-slate-200 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300",
    bronze: "bg-orange-100 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300",
};

/* ------------------------------------------------------------------ */
/*  Skeletons                                                         */
/* ------------------------------------------------------------------ */

const SkeletonStatCard = memo(() => (
    <div className="flex flex-col items-center p-3 bg-slate-100 dark:bg-white/[0.06] rounded-2xl animate-pulse">
        <div className="w-4 h-4 mb-2 rounded-full bg-slate-200 dark:bg-white/[0.1]" />
        <div className="w-8 h-5 bg-slate-200 dark:bg-white/[0.1] rounded mb-1" />
        <div className="w-12 h-2 bg-slate-200 dark:bg-white/[0.1] rounded" />
    </div>
));
SkeletonStatCard.displayName = "SkeletonStatCard";

const SkeletonStreakCard = memo(() => (
    <div className="bg-slate-100 dark:bg-white/[0.06] rounded-2xl p-3 flex items-center gap-3 animate-pulse">
        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-white/[0.1]" />
        <div className="flex-1">
            <div className="w-12 h-2 bg-slate-200 dark:bg-white/[0.1] rounded mb-2" />
            <div className="w-16 h-4 bg-slate-200 dark:bg-white/[0.1] rounded" />
        </div>
    </div>
));
SkeletonStreakCard.displayName = "SkeletonStreakCard";

const SkeletonHistoryItem = memo(() => (
    <div className="flex justify-between items-center p-2 bg-slate-100 dark:bg-white/[0.06] rounded-xl animate-pulse">
        <div className="w-32 h-3 bg-slate-200 dark:bg-white/[0.1] rounded" />
        <div className="w-10 h-3 bg-slate-200 dark:bg-white/[0.1] rounded" />
    </div>
));
SkeletonHistoryItem.displayName = "SkeletonHistoryItem";

const SkeletonAcademicDetail = memo(() => (
    <div className="flex justify-between flex-wrap gap-2 animate-pulse">
        <div className="w-20 h-3 bg-slate-200 dark:bg-white/[0.1] rounded" />
        <div className="w-24 h-3 bg-slate-200 dark:bg-white/[0.1] rounded" />
    </div>
));
SkeletonAcademicDetail.displayName = "SkeletonAcademicDetail";

/* ------------------------------------------------------------------ */
/*  Stat card                                                         */
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
            className="flex flex-col items-center p-3 bg-slate-100 dark:bg-white/[0.06] rounded-2xl active:scale-[0.97] transition-transform"
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
    const [userData, setUserData] = useState<UserDataState>(INITIAL_USER_DATA);

    const [isAvatarOpen, setIsAvatarOpen] = useState(false);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const isMounted = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);
    const paperTitlesLoadedRef = useRef(false);
    const [, startTransition] = useTransition();

    const { status: followStatus } = useFollow(userId);
    const { user } = useAuth();
    const isSelf = !!user?.id && user.id === userData.profile?.user_id;

    /* ---------------- Fetch ---------------- */

    const fetchUserData = useCallback(
        async () => {
            if (!userId) return;

            if (abortControllerRef.current) abortControllerRef.current.abort();
            abortControllerRef.current = new AbortController();

            setIsRefreshing(true);

            try {
                const [
                    profileResult,
                    activityResult,
                    feedResult,
                    streaksResult,
                    duelResult,
                    authoredResult,
                ] = await Promise.all([
                    supabase
                        .from("profiles")
                        .select(
                            `user_id, name, username, avatar_url, institution, course, block, county,
                             bio, role, specialization, joined_date, is_online, last_seen,
                             is_verified_contributor, contributor_tier, contributor_bio,
                             nck_license_verified, employer_verified, nck_number, profile_type`
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
                    supabase
                        .rpc("get_user_duel_stats", { p_user_id: userId })
                        .maybeSingle(),
                    // 🆕 Quizzes authored by this user
                    supabase
                        .from("quizzes")
                        .select(
                            "id, unit_code, title, image_url, is_free, question_count, created_at"
                        )
                        .eq("created_by", userId)
                        .eq("is_active", true)
                        .order("created_at", { ascending: false })
                        .limit(8),
                ]);

                const profileData = profileResult.data as Profile | null;
                const [quizData, simData, triviaData] = activityResult;
                const quizList = (quizData?.data || []) as QuizResult[];
                const simList = (simData?.data || []) as SimulationResult[];
                const triviaList = (triviaData?.data || []) as TriviaResult[];
                const authoredList = (authoredResult?.data || []) as AuthoredQuiz[];
                const streakData = streaksResult.data || [];
                const latestStreak =
                    streakData.length > 0 ? streakData[0].streak || 0 : 0;
                const maxStreak =
                    streakData.length > 0
                        ? Math.max(...streakData.map((r: any) => r.streak || 0))
                        : 0;

                const duelStats: DuelStats = {
                    wins: (duelResult?.data as any)?.wins ?? 0,
                    losses: (duelResult?.data as any)?.losses ?? 0,
                    total: (duelResult?.data as any)?.total ?? 0,
                };

                startTransition(() => {
                    setUserData((prev) => ({
                        ...prev,
                        profile: profileData,
                        quizResults: quizList,
                        simulationResults: simList,
                        triviaResults: triviaList,
                        authoredQuizzes: authoredList,
                        totalFeedSeen: feedResult.count || 0,
                        currentStreak: latestStreak,
                        bestStreak: maxStreak,
                        duelStats,
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
        [userId]
    );

    const handleRefresh = useCallback(() => {
        if (!isRefreshing) {
            paperTitlesLoadedRef.current = false;
            fetchUserData();
        }
    }, [fetchUserData, isRefreshing]);

    /* ---------------- Effects ---------------- */

    useEffect(() => {
        isMounted.current = true;
        paperTitlesLoadedRef.current = false;
        setUserData(INITIAL_USER_DATA);

        return () => {
            isMounted.current = false;
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [userId]);

    useEffect(() => {
        if (userId) fetchUserData();
    }, [userId, fetchUserData]);

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

    const tierLabel = useMemo(
        () => getTierLabel(userData.profile?.contributor_tier),
        [userData.profile?.contributor_tier]
    );

    /* ---------------- Handlers ---------------- */

    const handleClose = useCallback(() => onClose(), [onClose]);

    const handleAvatarOpen = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsAvatarOpen(true);
    }, []);

    const handleAvatarClose = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsAvatarOpen(false);
    }, []);

    if (!userId) return null;

    /* ---------------- Render ---------------- */

    return (
        <>
            <CenteredModal
                open={!!userId}
                onClose={handleClose}
                hideHeader
                noScrollBody
                maxWidthClass="max-w-lg"
                maxHeight="92vh"
                bodyClassName="relative"
            >
                <div className="relative flex flex-col flex-1 min-h-0">
                    {/* ── HEADER ROW ────────────────────────────────── */}
                    <div className="shrink-0 flex items-center gap-2 px-3 h-12
                border-b border-slate-200/70 dark:border-white/[0.06]">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-bold leading-tight truncate text-slate-900 dark:text-white">
                                {userData.profile?.name || "Profile"}
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                                {userData.profile
                                    ? `@${userData.profile.username || "user"}`
                                    : "Loading…"}
                            </p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="h-8 px-3 rounded-full shrink-0
                   bg-slate-100 dark:bg-white/[0.06]
                   text-slate-600 dark:text-slate-300
                   text-[10px] font-bold uppercase tracking-wider
                   active:scale-[0.95] transition-transform
                   disabled:opacity-50 disabled:active:scale-100"
                            style={{ touchAction: "manipulation" }}
                            aria-label="Refresh data"
                        >
                            {isRefreshing ? "Loading…" : "Refresh"}
                        </button>
                        <button
                            onClick={handleClose}
                            aria-label="Close"
                            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0
                   text-slate-700 dark:text-slate-200
                   active:bg-slate-100 dark:active:bg-white/5
                   transition-colors"
                            style={{ touchAction: "manipulation" }}
                        >
                            <X className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                    </div>
                    {/* ── BODY ──────────────────────────────────────── */}
                    <div
                        className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain
                                   px-4 pt-4 pb-6"
                        style={{ WebkitOverflowScrolling: "touch" }}
                    >
                        {userData.isLoading ? (
                            <div className="flex flex-col">
                                <div className="flex flex-col items-center text-center mb-6">
                                    <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-white/[0.1] animate-pulse" />
                                    <div className="w-32 h-5 bg-slate-200 dark:bg-white/[0.1] rounded-full animate-pulse mt-3" />
                                    <div className="w-24 h-3 bg-slate-200 dark:bg-white/[0.1] rounded-full animate-pulse mt-2" />
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

                                <div className="p-5 bg-slate-100 dark:bg-white/[0.04] rounded-3xl mb-8">
                                    <div className="w-32 h-3 bg-slate-200 dark:bg-white/[0.1] rounded animate-pulse mb-4" />
                                    <div className="space-y-3">
                                        {[...Array(4)].map((_, i) => (
                                            <SkeletonAcademicDetail key={i} />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="w-48 h-4 bg-slate-200 dark:bg-white/[0.1] rounded animate-pulse" />
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="w-32 h-3 bg-slate-200 dark:bg-white/[0.1] rounded animate-pulse" />
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
                                    <div className="relative">
                                        <img
                                            src={userData.profile.avatar_url || "/UsersAvatar.jpg"}
                                            onClick={handleAvatarOpen}
                                            className="cursor-pointer w-20 h-20 rounded-full object-cover
                                                       bg-slate-100 dark:bg-white/[0.06]
                                                       active:scale-[0.97] transition-transform"
                                            style={{ touchAction: "manipulation" }}
                                            loading="eager"
                                            alt="User avatar"
                                        />
                                        {userData.profile.is_online && (
                                            <span className="absolute bottom-0.5 right-0.5 w-4 h-4
                                                             bg-emerald-500 rounded-full
                                                             ring-2 ring-white dark:ring-[#161b22]" />
                                        )}
                                    </div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight mt-3">
                                        {userData.profile.name || "Student"}
                                    </h2>
                                    <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                                        <span className="text-[12px] font-bold text-blue-600 dark:text-blue-400">
                                            @{userData.profile.username || "user"}
                                        </span>

                                        {/* 🆕 Role badge */}
                                        {userData.profile.role && (
                                            <>
                                                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                                <span
                                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${userData.profile.role === "tutor"
                                                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300"
                                                        : userData.profile.role === "staff"
                                                            ? "bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"
                                                            : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                                                        }`}
                                                >
                                                    {getRoleLabel(userData.profile.role)}
                                                </span>
                                            </>
                                        )}

                                        {userData.profile.is_online !== null && (
                                            <>
                                                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                                <span
                                                    className={`text-[10px] font-bold uppercase tracking-wider ${userData.profile.is_online
                                                        ? "text-emerald-500"
                                                        : "text-slate-500 dark:text-slate-400"
                                                        }`}
                                                >
                                                    {userData.profile.is_online
                                                        ? "Active now"
                                                        : "Offline"}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* 🆕 Trust pills */}
                                    {(tierLabel ||
                                        userData.profile.is_verified_contributor ||
                                        userData.profile.nck_license_verified) && (
                                            <div className="flex items-center justify-center gap-1 mt-2 flex-wrap">
                                                {tierLabel && (
                                                    <span
                                                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${TIER_STYLES[tierLabel]}`}
                                                    >
                                                        {tierLabel}
                                                    </span>
                                                )}
                                                {userData.profile.nck_license_verified && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">
                                                        <ShieldCheck size={10} />
                                                        NCK ✓
                                                    </span>
                                                )}
                                                {userData.profile.is_verified_contributor && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                                                        <CheckCircle2 size={10} />
                                                        Verified
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                    <div className="mt-3 flex justify-center [&_button]:h-10 [&_button]:px-5 [&_button]:text-[12px] [&_button]:font-bold [&_button]:gap-1.5 [&_button]:rounded-xl">
                                        <FollowButton
                                            targetUserId={userData.profile.user_id}
                                            size="md"
                                        />
                                    </div>

                                    {userData.duelStats.wins > 0 && (
                                        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                                                        bg-amber-50 dark:bg-amber-400/10
                                                        text-amber-600 dark:text-amber-400">
                                            <Trophy size={11} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                                {userData.duelStats.wins}{" "}
                                                {userData.duelStats.wins === 1
                                                    ? "duel won"
                                                    : "duels won"}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {followStatus.iFollow || isSelf ? (
                                    <>
                                        {/* Streaks */}
                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <div className="rounded-2xl bg-slate-100 dark:bg-white/[0.06] p-3 flex items-center gap-3">
                                                <div className="p-2 bg-amber-500 rounded-xl text-white">
                                                    <Zap className="w-4 h-4 fill-current" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase leading-none mb-1 text-slate-500 dark:text-slate-400">
                                                        Current
                                                    </p>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {userData.currentStreak} days
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="rounded-2xl bg-slate-100 dark:bg-white/[0.06] p-3 flex items-center gap-3">
                                                <div className="p-2 bg-amber-500 rounded-xl text-white">
                                                    <Trophy className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase leading-none mb-1 text-slate-500 dark:text-slate-400">
                                                        Best
                                                    </p>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {userData.bestStreak} days
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-4 gap-2 mb-6">
                                            {statsData.map((stat, i) => (
                                                <StatCard key={i} {...stat} />
                                            ))}
                                        </div>

                                        {/* 🆕 Authored quizzes */}
                                        {userData.authoredQuizzes.length > 0 && (
                                            <div className="rounded-3xl bg-slate-100 dark:bg-white/[0.04] p-4 mb-6">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                                                    <BookOpen size={12} />
                                                    Quizzes by {userData.profile.name?.split(" ")[0] || "this user"}
                                                </p>
                                                <div className="space-y-1.5">
                                                    {userData.authoredQuizzes.map((quiz) => (
                                                        <div
                                                            key={quiz.id}
                                                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-white/[0.03]"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">
                                                                    {quiz.title}
                                                                </p>
                                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                                    {quiz.unit_code || "—"} ·{" "}
                                                                    {quiz.question_count} questions ·{" "}
                                                                    {quiz.is_free ? "Free" : "Premium"}
                                                                </p>
                                                            </div>
                                                            <a
                                                                href={`/quiz?unit=${encodeURIComponent(quiz.title)}`}
                                                                className="shrink-0 h-7 px-2.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center active:scale-95 transition-transform"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                Open
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Academic info */}
                                        <div className="rounded-3xl bg-slate-100 dark:bg-white/[0.04] p-4 mb-6">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                                                Academic details
                                            </p>
                                            <div className="space-y-2.5 text-sm">
                                                <AcademicRow
                                                    label="Institution"
                                                    value={userData.profile.institution}
                                                />
                                                <AcademicRow
                                                    label="Course / Block"
                                                    value={`${userData.profile.course || "-"} / ${userData.profile.block || "-"}`}
                                                />
                                                <AcademicRow
                                                    label="County"
                                                    value={userData.profile.county}
                                                />
                                                <div className="flex justify-between flex-wrap gap-2">
                                                    <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                                                        Specialization
                                                    </span>
                                                    <span className="text-[12px] font-bold text-blue-600 dark:text-blue-400 text-right">
                                                        {userData.profile.specialization || "-"}
                                                    </span>
                                                </div>

                                                {/* 🆕 NCK number — tutors/staff */}
                                                {userData.profile.nck_number && (
                                                    <AcademicRow
                                                        label="NCK No."
                                                        value={userData.profile.nck_number}
                                                    />
                                                )}

                                                {/* 🆕 Employer — tutors/staff */}
                                                {userData.profile.employer_verified !== null && (
                                                    <div className="flex justify-between flex-wrap gap-2 items-center">
                                                        <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                            <Building2 size={10} />
                                                            Employer
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${userData.profile.employer_verified
                                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                                                                : "bg-slate-200 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                                                                }`}
                                                        >
                                                            {userData.profile.employer_verified
                                                                ? "Verified"
                                                                : "Unverified"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 🆕 Contributor bio */}
                                        {userData.profile.contributor_bio && (
                                            <div className="rounded-3xl bg-slate-100 dark:bg-white/[0.04] p-4 mb-6">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                                                    <GraduationCap size={12} />
                                                    About as contributor
                                                </p>
                                                <p className="text-[12px] leading-relaxed text-slate-700 dark:text-slate-300">
                                                    {userData.profile.contributor_bio}
                                                </p>
                                            </div>
                                        )}

                                        {/* Performance history */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                <span className="w-1 h-3.5 bg-blue-600 rounded-full" />
                                                Performance history
                                            </h4>

                                            {userData.quizResults.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                                        Recent quizzes
                                                    </p>
                                                    {userData.quizResults.slice(0, 3).map((quiz) => (
                                                        <div
                                                            key={quiz.id}
                                                            className="flex justify-between items-center p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04]"
                                                        >
                                                            <span className="text-[11px] font-medium truncate max-w-[150px] text-slate-900 dark:text-white">
                                                                {quiz.unit || "Quiz"}
                                                            </span>
                                                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                                {Math.round(
                                                                    (quiz.score / quiz.total_questions) * 100
                                                                )}
                                                                %
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {userData.simulationResults.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                        Recent simulations
                                                    </p>
                                                    {userData.simulationResults.slice(0, 3).map((sim) => (
                                                        <div
                                                            key={sim.id}
                                                            className="flex justify-between items-center p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04]"
                                                        >
                                                            <span className="text-[11px] font-medium truncate max-w-[150px] text-slate-900 dark:text-white">
                                                                {sim.paper_name || "Simulation"}
                                                            </span>
                                                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                                                {Math.round(
                                                                    (sim.score / sim.total_questions) * 100
                                                                )}
                                                                %
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {userData.triviaResults.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                                        Daily trivia
                                                    </p>
                                                    {userData.triviaResults.slice(0, 3).map((trivia) => (
                                                        <div
                                                            key={trivia.id}
                                                            className="flex justify-between items-center p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04]"
                                                        >
                                                            <span className="text-[11px] font-medium text-slate-900 dark:text-white">
                                                                {new Date(trivia.attempt_date).toLocaleDateString()}
                                                            </span>
                                                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                                                {Math.round(
                                                                    (trivia.score / trivia.total_questions) * 100
                                                                )}
                                                                %
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-6 text-center">
                                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                Member since{" "}
                                                {userData.profile.joined_date
                                                    ? new Date(userData.profile.joined_date).getFullYear()
                                                    : "2024"}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center text-center py-10 px-4">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                            Activity hidden
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[260px] leading-relaxed">
                                            Follow this user to see their streaks, stats, and performance history.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    No profile discovered
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </CenteredModal>

            {/* Avatar zoom — unchanged behavior, GitHub palette */}
            <AnimatePresence>
                {isAvatarOpen && (
                    <motion.div
                        className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/90"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleAvatarClose}
                    >
                        <motion.img
                            src={userData.profile?.avatar_url || "/UsersAvatar.jpg"}
                            className="max-h-[80vh] max-w-full rounded-2xl"
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
        </>
    );
};

/* ------------------------------------------------------------------ */
/*  Row helper                                                        */
/* ------------------------------------------------------------------ */

function AcademicRow({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="flex justify-between flex-wrap gap-2">
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                {label}
            </span>
            <span className="text-[12px] font-bold text-slate-900 dark:text-white text-right">
                {value || "-"}
            </span>
        </div>
    );
}