"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Trophy, Stethoscope, BookOpen, Crown, Star, } from "lucide-react";
interface TopStudent {
    user_id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
    institution: string | null;
    seen_count: number;
}

export default function FeedSeenTop10() {
    const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
    const [loading, setLoading] = useState(false);
    const [rankChangedUser, setRankChangedUser] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const cachedTopStudents = useRef<TopStudent[] | null>(null);
    const prevTopStudents = useRef<TopStudent[]>([]);
    const fetchTop10 = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from("qfeed_seen_leaderboard")
                .select("*")
                .order("seen_count", { ascending: false })
                .limit(10);

            if (error) throw error;
            if (!data) return;

            // Check for rank changes
            data.forEach((user, idx) => {
                const prevIdx = prevTopStudents.current.findIndex(u => u.user_id === user.user_id);
                if (prevIdx !== -1 && prevIdx !== idx) {
                    setRankChangedUser(user.user_id);
                    setTimeout(() => setRankChangedUser(null), 2000);
                }
            });

            setTopStudents(data);
            prevTopStudents.current = data;

        } catch (err) {
            console.error("Error fetching top 10 feedseen students:", err);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        // Subscribe to real-time changes in qfeed_seen_leaderboard
        const channel = supabase
            .channel('realtime-feedseen-top10')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'qfeed_seen_leaderboard' },
                () => {
                    fetchTop10(); // refetch top 10 whenever table changes
                }
            )
            .subscribe();

        // Initial fetch
        fetchTop10();

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (

        <Card className="rounded-xl border-0 bg-card shadow-sm w-full max-w-full overflow-hidden mt-2">
            <CardHeader className="pb-4 px-6 pt-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <Trophy className="h-5 w-5 text-amber-600" />
                            </div>
                            Feed Mastery
                        </CardTitle>
                        <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                            Top 10 Students by Content Engagement
                        </CardDescription>
                    </div>

                    {/* Rank Change Indicator (Integrated into Header) */}
                    <AnimatePresence>
                        {rankChangedUser && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-full text-xs font-bold"
                            >
                                <Star className="w-3 h-3 fill-current" />
                                Leaderboard Updated
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </CardHeader>

            <CardContent className="px-6 pb-6">
                {/* Horizontal Scroll Container */}
                <div className="relative w-full">
                    <div className="flex gap-1 overflow-x-auto pb-4 pt-2 custom-scrollbar">
                        {loading ? (
                            <div className="flex gap-1 animate-pulse">
                                {Array.from({ length: 5 }).map((_, idx) => (
                                    <div key={idx} className="flex-shrink-0 w-40 h-52 rounded-2xl bg-muted/50 border border-border" />
                                ))}
                            </div>
                        ) : (
                            topStudents.map((s, idx) => (
                                <motion.div
                                    key={s.user_id}
                                    onClick={() => setSelectedUserId(s.user_id)}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{
                                        opacity: 1,
                                        y: rankChangedUser === s.user_id ? [0, -8, 0] : 0,
                                        scale: rankChangedUser === s.user_id ? [1, 1.05, 1] : 1
                                    }}
                                    transition={{
                                        delay: idx * 0.04,
                                        type: "spring",
                                        stiffness: 200,
                                        damping: 15
                                    }}
                                    whileHover={{ y: -5 }}
                                    whileTap={{ scale: 0.97 }}
                                    className={`relative flex-shrink-0 w-40 p-4 rounded-xl border transition-all cursor-pointer group
                                ${idx === 0 ? "bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-card border-amber-200 dark:border-amber-800/50 shadow-md shadow-amber-500/5" :
                                            idx === 1 ? "bg-card border-slate-200 dark:border-slate-800" :
                                                idx === 2 ? "bg-card border-orange-100 dark:border-orange-900/30" :
                                                    "bg-card border-border hover:border-primary/30"}`}
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
                                            {idx === 0 ? <Crown className="w-5 h-5 text-amber-500 animate-pulse" /> :
                                                idx <= 2 ? <Stethoscope className={`w-4 h-4 ${idx === 1 ? 'text-slate-400' : 'text-orange-400'}`} /> : null}
                                        </div>

                                        <div className="relative mb-3">
                                            <img
                                                src={s.avatar_url || "/UsersAvatar.jpg"}
                                                alt={s.name}
                                                className={`w-14 h-14 rounded-full object-cover border-2 p-0.5 transition-transform group-hover:scale-105
                                            ${idx === 0 ? "border-amber-400" : "border-border"}`}
                                            />
                                        </div>

                                        <div className="text-center space-y-1 w-full mb-3">
                                            <p className="font-bold text-sm text-foreground truncate px-1">
                                                {s.name || s.username}
                                            </p>
                                            <p className="text-[10px] font-medium text-muted-foreground truncate uppercase tracking-tighter opacity-80">
                                                {s.institution || "Global Learner"}
                                            </p>
                                        </div>

                                        {/* Metric Pill */}
                                        <div className={`w-full py-2 px-1 rounded-xl border flex flex-col items-center gap-0.5
                                    ${idx === 0 ? "bg-amber-100/50 dark:bg-amber-900/20 border-amber-200/50" : "bg-muted/50 border-transparent"}`}>
                                            <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                                                <BookOpen className="w-3 h-3" />
                                                {s.seen_count ?? 0}
                                            </div>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Questions</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Mobile Rank Change Notification */}
                <AnimatePresence>
                    {rankChangedUser && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="md:hidden mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-center text-xs font-bold shadow-lg"
                        >
                            🎉 Your rank has moved! Keep up the pace.
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
            <UserProfileModal
                userId={selectedUserId}
                onClose={() => setSelectedUserId(null)}
            />

        </Card >
    );
}
