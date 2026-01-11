"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy, Stethoscope } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    const [loading, setLoading] = useState(true);
    const [rankChangedUser, setRankChangedUser] = useState<string | null>(null);

    const prevTopStudents = useRef<TopStudent[]>([]);

    const fetchTop10 = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from("qfeed_seen")
                .select(`user_id, profiles(username, name, avatar_url, institution)`);

            if (error) throw error;
            if (!data) return;

            // Count seen per user
            const seenCounts: Record<string, number> = {};
            data.forEach(row => {
                seenCounts[row.user_id] = (seenCounts[row.user_id] || 0) + 1;
            });

            // Merge unique users
            const uniqueUsers: TopStudent[] = Array.from(
                new Map(
                    data.map(row => [row.user_id, {
                        user_id: row.user_id,
                        username: row.profiles?.username || "",
                        name: row.profiles?.name || "",
                        avatar_url: row.profiles?.avatar_url || "",
                        institution: row.profiles?.institution || "",
                        seen_count: seenCounts[row.user_id] || 0
                    }])
                ).values()
            );

            // Sort descending
            uniqueUsers.sort((a, b) => b.seen_count - a.seen_count);
            const top10 = uniqueUsers.slice(0, 10);

            // Check for rank changes
            top10.forEach((user, idx) => {
                const prevIdx = prevTopStudents.current.findIndex(u => u.user_id === user.user_id);
                if (prevIdx !== -1 && prevIdx !== idx) {
                    // rank changed
                    setRankChangedUser(user.user_id);
                    setTimeout(() => setRankChangedUser(null), 2000);
                }
            });

            setTopStudents(top10);
            prevTopStudents.current = top10;

            // Save locally
            localStorage.setItem("topStudents", JSON.stringify(top10));
        } catch (err) {
            console.error("Error fetching top 10 feedseen students:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Load from localStorage first
        const cached = localStorage.getItem("topStudents");
        if (cached) setTopStudents(JSON.parse(cached));

        // Fetch fresh data in background
        fetchTop10();
    }, []);

    return (
        <Card className="rounded-none sm:rounded-md shadow-none w-full max-w-full overflow-hidden bg-white dark:bg-gray-900 border-0">
            <CardHeader className="p-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Top 10 FeedSeen
                </CardTitle>
                <CardDescription>Students who have seen the most questions.</CardDescription>
            </CardHeader>

            <CardContent>
                <div className="relative w-full h-60 sm:h-64 md:h-56 lg:h-60">
                    <div className="absolute inset-0 overflow-x-auto overflow-y-auto flex gap-4 p-2 custom-scrollbar">
                        {loading ? (
                            <div className="flex gap-4 animate-pulse">
                                {Array.from({ length: 4 }).map((_, idx) => (
                                    <div
                                        key={idx}
                                        className="flex-shrink-0 w-36 sm:w-40 p-3 rounded-md bg-gray-200 dark:bg-gray-700"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 mb-2"></div>
                                        <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                                        <div className="h-3 w-20 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                                        <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            topStudents.map((s, idx) => (
                                <motion.div
                                    key={s.user_id}
                                    className={`flex-shrink-0 w-36 sm:w-40 p-3 rounded-md ${idx === 0 ? "bg-yellow-100 dark:bg-yellow-800" :
                                        idx === 1 ? "bg-gray-100 dark:bg-gray-700" :
                                            idx === 2 ? "bg-orange-100 dark:bg-orange-800" :
                                                "bg-gray-100 dark:bg-gray-800"
                                        }`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{
                                        opacity: 1,
                                        y: rankChangedUser === s.user_id ? [0, -10, 0] : 0
                                    }}
                                    transition={{
                                        delay: idx * 0.05,
                                        type: "spring",
                                        stiffness: 120,
                                        duration: rankChangedUser === s.user_id ? 0.5 : 0.3
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <div className="flex flex-col items-center text-center">
                                        {/* Top 3 Stethoscope banner */}
                                        {idx <= 2 && (
                                            <Stethoscope
                                                className={`w-5 h-5 mb-1 animate-bounce ${idx === 0 ? "text-yellow-500" :
                                                    idx === 1 ? "text-gray-500" :
                                                        "text-orange-500"
                                                    }`}
                                            />
                                        )}

                                        <img
                                            src={s.avatar_url || "/UsersAvatar.jpg"}
                                            alt={s.name || s.username}
                                            className="w-12 h-12 rounded-full mb-2 object-cover"
                                        />

                                        <div className="font-semibold text-sm text-gray-800 dark:text-white break-words text-center">
                                            {s.name || s.username}
                                        </div>

                                        <div className="text-xs text-gray-500 dark:text-gray-300 truncate">
                                            {s.institution || "No Institution"}
                                        </div>

                                        <div className="mt-2 font-bold text-yellow-600 dark:text-yellow-400">
                                            Done {s.seen_count} Questions in Feed Page
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Rank change popup */}
                    <AnimatePresence>
                        {rankChangedUser && (
                            <motion.div
                                className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-4 py-2 rounded-md font-semibold shadow-lg z-50"
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -50, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 120 }}
                            >
                                🎉 Your rank just changed!
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </CardContent>
        </Card>
    );
}
