"use client";

import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Trophy, Stethoscope, BookOpen, Crown, Star } from "lucide-react";


interface TopStudent {
    user_id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
    institution: string | null;
    seen_count: number;
}

// Memoized Top Student Card Component
const TopStudentCard = memo(({
    student,
    idx,
    isRankChanged,
    onSelect
}: {
    student: TopStudent;
    idx: number;
    isRankChanged: boolean;
    onSelect: (userId: string) => void;
}) => {
    const rankChangedUser = isRankChanged ? student.user_id : null;

    return (
        <motion.div
            onClick={() => onSelect(student.user_id)}
            initial={{ opacity: 0, y: 15 }}
            animate={{
                opacity: 1,
                y: rankChangedUser === student.user_id ? [0, -8, 0] : 0,
                scale: rankChangedUser === student.user_id ? [1, 1.05, 1] : 1
            }}
            transition={{
                delay: idx * 0.04,
                type: "spring",
                stiffness: 200,
                damping: 15,
                duration: 0.2
            }}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.97 }}
            className={`relative flex-shrink-0 w-40 p-4 rounded-xl border transition-all cursor-pointer group active:scale-98
                ${idx === 0 ? "bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-card border-amber-200 dark:border-amber-800/50 shadow-md shadow-amber-500/5" :
                    idx === 1 ? "bg-card border-slate-200 dark:border-slate-800" :
                        idx === 2 ? "bg-card border-orange-100 dark:border-orange-900/30" :
                            "bg-card border-border hover:border-primary/30"}`}
            style={{ touchAction: 'manipulation', willChange: 'transform' }}
        >
            {/* Rank Indicator Badge */}
            <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shadow-sm
                ${idx === 0 ? "bg-amber-500 text-white border-white dark:border-slate-900" :
                    idx === 1 ? "bg-slate-400 text-white border-white dark:border-slate-900" :
                        idx === 2 ? "bg-orange-500 text-white border-white dark:border-slate-900" :
                            "bg-muted text-muted-foreground border-white dark:border-slate-900"}`}>
                {idx + 1}
            </div>

            <div className="flex flex-col items-center">
                {/* Special Icon for Top 3 */}
                <div className="h-6 mb-1">
                    {idx === 0 ? <Crown className="w-5 h-5 text-amber-500" /> :
                        idx <= 2 ? <Stethoscope className={`w-4 h-4 ${idx === 1 ? 'text-slate-400' : 'text-orange-400'}`} /> : null}
                </div>

                <div className="relative mb-3">
                    <img
                        src={student.avatar_url || "/UsersAvatar.jpg"}
                        alt={student.name || student.username || "Student"}
                        className={`w-14 h-14 rounded-full object-cover border-2 p-0.5 transition-transform group-hover:scale-105
                            ${idx === 0 ? "border-amber-400" : "border-border"}`}
                        loading="lazy"
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
                <div className={`w-full py-2 px-1 rounded-xl border flex flex-col items-center gap-0.5
                    ${idx === 0 ? "bg-amber-100/50 dark:bg-amber-900/20 border-amber-200/50" : "bg-muted/50 border-transparent"}`}>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                        <BookOpen className="w-3 h-3 flex-shrink-0" />
                        {student.seen_count ?? 0}
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Questions</span>
                </div>
            </div>
        </motion.div>
    );
});

TopStudentCard.displayName = "TopStudentCard";

// Skeleton Loader Component
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

export default function FeedSeenTop10() {
    const todayKey = new Date().toISOString().slice(0, 10);
    const cacheKey = `feedseen_top10_${todayKey}`;

    // 1. INSTANT INITIALIZATION: Read cache directly into state
    const [topStudents, setTopStudents] = useState<TopStudent[]>(() => {
        if (typeof window === "undefined") return [];
        const saved = localStorage.getItem(cacheKey);
        try {
            return saved ? JSON.parse(saved).data : [];
        } catch { return []; }
    });

    // Only show loader if we have absolutely NO data
    const [loading, setLoading] = useState(topStudents.length === 0);
    const [rankChangedUser, setRankChangedUser] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // 2. SIMPLE, FAST FETCH
    const fetchTop10 = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);

        try {
            const { data, error } = await supabase
                .from("qfeed_seen_leaderboard")
                .select("*")
                .order("seen_count", { ascending: false })
                .limit(10);

            if (error) throw error;
            if (!data) return;

            // Detect if rank #1 changed for the animation
            if (topStudents.length > 0 && topStudents[0].user_id !== data[0].user_id) {
                setRankChangedUser(data[0].user_id);
                setTimeout(() => setRankChangedUser(null), 3000);
            }

            setTopStudents(data);

            // Update Cache
            localStorage.setItem(cacheKey, JSON.stringify({
                data: data,
                timestamp: Date.now()
            }));
        } catch (err) {
            console.error("Leaderboard fetch failed:", err);
        } finally {
            setLoading(false);
        }
    }, [cacheKey, topStudents]);

    // 3. MOUNT LOGIC: Always check fresh data once on load
    useEffect(() => {
        fetchTop10(topStudents.length > 0); // silent if we have cache
    }, []);



    const handleStudentSelect = useCallback((userId: string) => setSelectedUserId(userId), []);
    const handleModalClose = useCallback(() => setSelectedUserId(null), []);

    const skeletonItems = useMemo(() =>
        Array.from({ length: 5 }).map((_, idx) => <SkeletonCard key={idx} />),
        []);

    return (
        <Card className="rounded-xl border-0 bg-card shadow-sm w-full max-w-full overflow-hidden mt-2">
            <CardHeader className="pb-3 px-4 pt-5">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-lg font-bold">
                            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <Trophy className="h-5 w-5 text-amber-600" />
                            </div>
                            Feed Mastery
                        </CardTitle>
                        <CardDescription className="text-[10px] font-medium uppercase tracking-widest">
                            Live Top 10 Leaderboard
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-6">
                <div className="relative w-full">
                    <div className="flex gap-3 overflow-x-auto pb-4 pt-2 hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                                No activity recorded yet today.
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>

            <UserProfileModal userId={selectedUserId} onClose={handleModalClose} />
        </Card>
    );
}