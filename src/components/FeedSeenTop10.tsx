"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy, Stethoscope } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserProfileModal } from "@/components/UserProfileModal";


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

        <Card className="rounded-none sm:rounded-md shadow-none w-full max-w-full overflow-hidden
                 bg-gray-100 dark:bg-gray-900 border-0 mt-4">

            <CardHeader className="p-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Top 10 FeedSeen
                </CardTitle>
                <CardDescription>Students who have seen the most questions.</CardDescription>
            </CardHeader>

            <CardContent className="px-0">
                <div className="relative w-full h-60 sm:h-64 md:h-56 lg:h-60">
                    <div className="absolute inset-0 overflow-x-auto overflow-y-auto flex gap-4 p-1 custom-scrollbar">
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
                                    className={`flex-shrink-0 w-36 sm:w-40 p-3 rounded-md
    ${idx === 0 ? "bg-yellow-100 dark:bg-yellow-800" :
                                            idx === 1 ? "bg-gray-100 dark:bg-gray-700" :
                                                idx === 2 ? "bg-orange-100 dark:bg-orange-800" :
                                                    "bg-gray-100 dark:bg-gray-800"
                                        }
    transform transition-transform duration-300 ease-in-out
    hover:shadow-xl`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{
                                        opacity: 1,
                                        y: rankChangedUser === s.user_id ? [0, -10, 0] : 0 // wave/bounce for rank changes
                                    }}
                                    transition={{
                                        delay: idx * 0.05,
                                        type: "spring",
                                        stiffness: 120,
                                        duration: rankChangedUser === s.user_id ? 0.5 : 0.3
                                    }}
                                    whileHover={{ scale: 1.05 }} // zoom on hover
                                    whileTap={{ scale: 0.95 }}   // tap feedback on mobile
                                    onClick={() => setSelectedUserId(s.user_id)}

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
                                            Done {s.seen_count ?? 0} Questions in Feed Page
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
            <UserProfileModal
                userId={selectedUserId}
                onClose={() => setSelectedUserId(null)}
            />

        </Card >
    );
}
