"use client";

import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Stethoscope, BookOpen, Crown } from "lucide-react";

// ============================================================
// CONSTANTS
// ============================================================
const FEED_TOP_LIMIT = 20;               // ⬅️ Top 20
const FEED_CACHE_TTL = 60 * 1000;        // ⬅️ 60 seconds
const FEED_POLL_INTERVAL = 60 * 1000;    // ⬅️ 60 seconds
const FEED_SELECT_COLS =
    "user_id, username, name, avatar_url, institution, seen_count";

// ============================================================
// TYPES
// ============================================================
interface TopStudent {
    user_id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
    institution: string | null;
    seen_count: number;
}

// ============================================================
// TOP STUDENT CARD (memoized with custom comparator)
// ============================================================
const TopStudentCard = memo(
    ({
        student,
        idx,
        isRankChanged,
        onSelect,
    }: {
        student: TopStudent;
        idx: number;
        isRankChanged: boolean;
        onSelect: (userId: string) => void;
    }) => {
        return (
            <motion.div
                onClick={() => onSelect(student.user_id)}
                initial={{ opacity: 0, y: 15 }}
                animate={{
                    opacity: 1,
                    y: isRankChanged ? [0, -8, 0] : 0,
                    scale: isRankChanged ? [1, 1.05, 1] : 1,
                }}
                transition={{
                    delay: Math.min(idx, 10) * 0.03, // cap delay so #20 isn't slow
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    duration: 0.2,
                }}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.97 }}
                className={`relative flex-shrink-0 w-40 p-4 rounded-xl border-0 transition-all cursor-pointer group active:scale-98
                    ${idx === 0
                        ? "bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-card border-0 shadow-none"
                        : "bg-card border-0"}`}
                style={{ touchAction: "manipulation", willChange: "transform" }}
            >
                {/* Rank Indicator Badge */}
                <div
                    className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-0 shadow-sm
                        ${idx === 0
                            ? "bg-amber-500 text-white border-0"
                            : idx === 1
                                ? "bg-slate-400 text-white border-0"
                                : idx === 2
                                    ? "bg-orange-500 text-white border-0"
                                    : "bg-muted text-muted-foreground border-0"}`}
                >
                    {idx + 1}
                </div>

                <div className="flex flex-col items-center">
                    {/* Special Icon for Top 3 */}
                    <div className="h-6 mb-1">
                        {idx === 0 ? (
                            <Crown className="w-5 h-5 text-amber-500" />
                        ) : idx <= 2 ? (
                            <Stethoscope
                                className={`w-4 h-4 ${idx === 1 ? "text-slate-400" : "text-orange-400"}`}
                            />
                        ) : null}
                    </div>

                    <div className="relative mb-3">
                        <img
                            src={student.avatar_url || "/UsersAvatar.jpg"}
                            alt={student.name || student.username || "Student"}
                            className={`w-14 h-14 rounded-full object-cover border-0 p-0.5 transition-transform group-hover:scale-105
        ${idx === 0 ? "border-amber-400" : "border-border"}`}
                            loading="lazy"
                            onError={(e) => {
                                const target = e.currentTarget;
                                // Prevent infinite loop if the fallback itself fails
                                if (target.src.endsWith("/UsersAvatar.jpg")) return;
                                target.src = "/UsersAvatar.jpg";
                            }}
                        />
                    </div>

                    <div className="text-center space-y-1 w-full mb-3">
                        <p className="font-bold text-sm text-foreground truncate px-1">
                            {student.name || student.username || "Student"}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground truncate uppercase tracking-tighter opacity-80">
                            {student.institution || "Global Learner"}
                        </p>
                    </div>

                    {/* Metric Pill */}
                    <div
                        className={`w-full py-2 px-1 rounded-xl border-0 flex flex-col items-center gap-0.5
                            ${idx === 0
                                ? "bg-amber-100/50 dark:bg-amber-900/20 border-0"
                                : "bg-muted/50 border-transparent"}`}
                    >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                            <BookOpen className="w-3 h-3 flex-shrink-0" />
                            {student.seen_count ?? 0}
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">
                            Questions
                        </span>
                    </div>
                </div>
            </motion.div>
        );
    },
    // ⬇️ Custom comparator — only re-render if these actually change
    (prev, next) =>
        prev.student.user_id === next.student.user_id &&
        prev.student.seen_count === next.student.seen_count &&
        prev.student.name === next.student.name &&
        prev.student.username === next.student.username &&
        prev.student.avatar_url === next.student.avatar_url &&
        prev.student.institution === next.student.institution &&
        prev.idx === next.idx &&
        prev.isRankChanged === next.isRankChanged &&
        prev.onSelect === next.onSelect
);

TopStudentCard.displayName = "TopStudentCard";

// ============================================================
// SKELETON
// ============================================================
const SkeletonCard = () => (
    <div className="flex-shrink-0 w-40 p-4 rounded-xl bg-muted/50 border border-border animate-pulse">
        <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-muted-foreground/20 mb-3" />
            <div className="w-20 h-4 bg-muted-foreground/20 rounded-full mb-2" />
            <div className="w-16 h-3 bg-muted-foreground/20 rounded-full mb-3" />
            <div className="w-full h-12 bg-muted-foreground/10 rounded-xl" />
        </div>
    </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function FeedSeenTop10() {
    const todayKey = new Date().toISOString().slice(0, 10);
    const cacheKey = `feedseen_top20_${todayKey}`; // ⬅️ renamed so old top10 cache doesn't collide

    // ---- 1. INSTANT INITIALIZATION from cache (TTL-aware) ----
    const [topStudents, setTopStudents] = useState<TopStudent[]>(() => {
        if (typeof window === "undefined") return [];
        const saved = localStorage.getItem(cacheKey);
        if (!saved) return [];
        try {
            const parsed = JSON.parse(saved);
            const ts = parsed?.timestamp ?? 0;
            if (Date.now() - ts > FEED_CACHE_TTL) return []; // stale
            return Array.isArray(parsed?.data) ? parsed.data : [];
        } catch {
            return [];
        }
    });

    // Track previous #1 so we don't need topStudents in fetch deps
    const previousTopIdRef = useRef<string | null>(
        topStudents.length > 0 ? topStudents[0].user_id : null
    );
    const isMountedRef = useRef(true);
    const rankTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [loading, setLoading] = useState(topStudents.length === 0);
    const [rankChangedUser, setRankChangedUser] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // ---- 2. FETCH — stable, no topStudents dep ----
    const fetchTop20 = useCallback(
        async (isSilent = false) => {
            if (!isSilent) setLoading(true);

            try {
                const { data, error } = await supabase
                    .from("qfeed_seen_leaderboard")
                    .select(FEED_SELECT_COLS)
                    .order("seen_count", { ascending: false })
                    .limit(FEED_TOP_LIMIT);

                if (error) throw error;
                if (!isMountedRef.current) return;
                if (!data || data.length === 0) return;

                // Detect #1 change safely
                const newTopId = data[0]?.user_id ?? null;
                const oldTopId = previousTopIdRef.current;

                if (oldTopId && newTopId && oldTopId !== newTopId) {
                    setRankChangedUser(newTopId);
                    if (rankTimeoutRef.current) clearTimeout(rankTimeoutRef.current);
                    rankTimeoutRef.current = setTimeout(() => {
                        if (isMountedRef.current) setRankChangedUser(null);
                    }, 3000);
                }
                previousTopIdRef.current = newTopId;

                setTopStudents(data);

                // Update cache
                try {
                    localStorage.setItem(
                        cacheKey,
                        JSON.stringify({ data, timestamp: Date.now() })
                    );
                } catch { }
            } catch (err) {
                console.error("Feed leaderboard fetch failed:", err);
            } finally {
                if (isMountedRef.current) setLoading(false);
            }
        },
        [cacheKey]
    );

    // ---- 3. LIFECYCLE: mount + focus + 60s poll ----
    useEffect(() => {
        isMountedRef.current = true;

        // Initial load (silent if we already have cached data)
        fetchTop20(topStudents.length > 0);

        const onFocus = () => {
            if (!document.hidden) fetchTop20(true);
        };
        window.addEventListener("focus", onFocus);

        const onVisible = () => {
            if (!document.hidden) fetchTop20(true);
        };
        document.addEventListener("visibilitychange", onVisible);

        const intervalId = setInterval(() => {
            if (!document.hidden) fetchTop20(true);
        }, FEED_POLL_INTERVAL);

        return () => {
            isMountedRef.current = false;
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVisible);
            clearInterval(intervalId);
            if (rankTimeoutRef.current) clearTimeout(rankTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchTop20]);

    // ---- Handlers ----
    const handleStudentSelect = useCallback(
        (userId: string) => setSelectedUserId(userId),
        []
    );
    const handleModalClose = useCallback(() => setSelectedUserId(null), []);

    // ---- Skeleton (memoized) ----
    const skeletonItems = useMemo(
        () => Array.from({ length: 6 }).map((_, idx) => <SkeletonCard key={idx} />),
        []
    );

    // ---- Render ----
    return (
        <Card className="rounded-xl border-0 bg-card shadow-sm w-full max-w-full overflow-hidden mt-1">
            <CardHeader className="pb-3 px-4 pt-5">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            Feed Mastery
                        </CardTitle>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-6">
                <div className="relative w-full">
                    <div
                        className="flex gap-3 overflow-x-auto pb-4 pt-2 hide-scrollbar"
                        style={{ WebkitOverflowScrolling: "touch" }}
                    >
                        {loading && topStudents.length === 0 ? (
                            skeletonItems
                        ) : topStudents.length > 0 ? (
                            topStudents.map((student, idx) => (
                                <TopStudentCard
                                    key={student.user_id}
                                    student={student}
                                    idx={idx}
                                    isRankChanged={rankChangedUser === student.user_id}
                                    onSelect={handleStudentSelect}
                                />
                            ))
                        ) : (
                            <div className="w-full py-8 text-center text-muted-foreground text-sm">
                                No activity recorded yet .
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>

            <UserProfileModal userId={selectedUserId} onClose={handleModalClose} />
        </Card>
    );
}