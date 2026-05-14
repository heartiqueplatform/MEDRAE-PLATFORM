"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Zap, Eye, Trophy, Star, Cpu, ClipboardCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalLoader } from "@/components/GlobalLoader";
import { createPortal } from "react-dom";
interface Props {
    userId: string | null;
    onClose: () => void;
}

// Extended profile type
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
    last_seen: string | null; // add this  last_seen: string | null; // add this
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

export const UserProfileModal = ({ userId, onClose }: Props) => {
    const [profile, setProfile] = useState<Profile | null>(null);

    const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
    const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([]);
    const [triviaResults, setTriviaResults] = useState<TriviaResult[]>([]);
    const [totalFeedSeen, setTotalFeedSeen] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [currentStreak, setCurrentStreak] = useState<number>(0);
    const [bestStreak, setBestStreak] = useState<number>(0);
    const [isAvatarOpen, setIsAvatarOpen] = useState(false);

    // ✅ Fetch streaks from login_activity
    const fetchStreaks = async () => {
        if (!userId) return;

        try {
            const { data, error } = await supabase
                .from("login_activity")
                .select("streak")
                .eq("user_id", userId)
                .order("login_date", { ascending: false });

            if (error) {
                console.error("Error fetching streaks:", error.message);
                setCurrentStreak(0);
                setBestStreak(0);
                return;
            }

            if (data && data.length > 0) {
                // Latest streak
                const latest = data[0].streak || 0;
                setCurrentStreak(latest);

                // Best streak
                const maxStreak = Math.max(...data.map((r) => r.streak || 0));
                setBestStreak(maxStreak);
            } else {
                setCurrentStreak(0);
                setBestStreak(0);
            }
        } catch (err) {
            console.error("Unexpected error fetching streaks:", err);
            setCurrentStreak(0);
            setBestStreak(0);
        }
    };
    useEffect(() => {
        if (!userId) return;

        async function loadData() {
            setLoading(true);

            try {
                // ✅ Run independent fetches in parallel (profile, quiz, trivia, feed count, streaks)
                const [
                    { data: profileData },
                    { data: quizData },
                    { data: simResults },
                    { data: triviaData },
                    { count: feedCount },
                    streaks
                ] = await Promise.all([
                    // 1️⃣ Profile
                    supabase
                        .from("profiles")
                        .select("*")
                        .eq("user_id", userId)
                        .single(),

                    // 2️⃣ Quiz results (last 10)
                    supabase
                        .from("quiz_results")
                        .select("*")
                        .eq("user_id", userId)
                        .order("submitted_at", { ascending: false })
                        .limit(10),

                    // 3️⃣ Simulation results (last 10)
                    supabase
                        .from("simulation_results")
                        .select("*")
                        .eq("user_id", userId)
                        .order("submitted_at", { ascending: false })
                        .limit(10),

                    // 4️⃣ Daily trivia (last 10)
                    supabase
                        .from("daily_trivia_results")
                        .select("*")
                        .eq("user_id", userId)
                        .order("attempt_date", { ascending: false })
                        .limit(10),

                    // 5️⃣ Total feed seen
                    supabase
                        .from("qfeed_seen")
                        .select("*", { count: "exact", head: true })
                        .eq("user_id", userId),

                    // 6️⃣ Streaks
                    (async () => {
                        const { data, error } = await supabase
                            .from("login_activity")
                            .select("streak")
                            .eq("user_id", userId)
                            .order("login_date", { ascending: false });
                        return data || [];
                    })()
                ]);

                // 1️⃣ Profile
                setProfile(profileData);

                // 2️⃣ Quiz results
                setQuizResults(quizData || []);

                // 3️⃣ Simulation results (show immediately)
                const simResultsInitial = simResults?.map(r => ({
                    ...r,
                    paper_name: "Loading..." // placeholder
                })) || [];
                setSimulationResults(simResultsInitial);

                // 🔹 Fetch paper titles asynchronously (non-blocking)
                const paperIds = simResults?.map(r => r.paper_id).filter(Boolean) || [];
                if (paperIds.length > 0) {
                    supabase
                        .from("simulation_papers")
                        .select("id, title")
                        .in("id", paperIds)
                        .then(({ data: papers }) => {
                            if (papers) {
                                const updatedSimResults = simResultsInitial.map(r => ({
                                    ...r,
                                    paper_name: papers.find(p => p.id === r.paper_id)?.title || "Paper"
                                }));
                                setSimulationResults(updatedSimResults);
                            }
                        })
                        .catch(err => console.error("Error fetching simulation paper titles:", err));
                }

                // 4️⃣ Trivia results
                setTriviaResults(triviaData || []);

                // 5️⃣ Feed count
                setTotalFeedSeen(feedCount || 0);

                // 6️⃣ Streaks
                if (streaks.length > 0) {
                    const latest = streaks[0].streak || 0;
                    setCurrentStreak(latest);
                    setBestStreak(Math.max(...streaks.map(r => r.streak || 0)));
                } else {
                    setCurrentStreak(0);
                    setBestStreak(0);
                }

            } catch (err) {
                console.error("Error loading user activity:", err);
            }

            setLoading(false);
        }

        loadData();
    }, [userId]);
    if (!userId) {
        return null;
    }
    return createPortal(
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="bg-white dark:bg-slate-900 w-full sm:max-w-lg sm:rounded-[2.5rem] rounded-t-[2.5rem] overflow-hidden relative shadow-2xl max-h-[92vh] flex flex-col"
                    initial={{ y: 400 }}
                    animate={{ y: 0 }}
                    exit={{ y: 400 }}
                    transition={{ type: "spring", stiffness: 120 }}
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* ================= HEADER (FIXED VISUAL LAYER) ================= */}
                    <div className="relative h-36 flex flex-col justify-end">

                        {/* Gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" />

                        {/* Close button */}
                        <div className="absolute top-0 right-0 p-6 z-20">
                            <button
                                onClick={onClose}
                                className="p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Avatar (now properly anchored in header) */}
                        <div className="relative flex justify-center translate-y-1/2 z-30">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-white dark:bg-slate-900 rounded-full scale-105 shadow-xl" />

                                <img
                                    src={profile?.avatar_url || "/UsersAvatar.jpg"}
                                    onClick={() => setIsAvatarOpen(true)}
                                    className="relative cursor-pointer w-28 h-28 rounded-full object-cover border-4 border-white dark:border-slate-900 group-hover:scale-[1.02] transition-transform duration-300 shadow-2xl"
                                />

                                {profile?.is_online && (
                                    <span className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full shadow-lg" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ================= SCROLLABLE CONTENT ================= */}
                    <div className="relative flex-1 overflow-y-auto custom-scrollbar pt-16 px-6 pb-24 z-10">

                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[70vh] space-y-4">
                                <GlobalLoader />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[3px] animate-pulse">
                                    Syncing Profile...
                                </p>
                            </div>
                        ) : profile ? (
                            <div className="flex flex-col">

                                {/* Profile Identity */}
                                <div className="flex flex-col items-center text-center mb-6">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                                        {profile.name || "Student"}
                                    </h2>

                                    <div className="flex items-center justify-center gap-2 mt-1">
                                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                            @{profile.username || "user"}
                                        </span>

                                        {profile.is_online !== null && (
                                            <>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${profile.is_online ? "text-emerald-500" : "text-slate-400"}`}>
                                                    {profile.is_online ? "Active Now" : "Offline"}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* ===== REST OF YOUR CONTENT (UNCHANGED STRUCTURE) ===== */}

                                {/* Achievement Streak Card */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3 flex items-center gap-3">
                                        <div className="p-2 bg-orange-500 rounded-xl text-white shadow-lg shadow-orange-500/30">
                                            <Zap className="w-5 h-5 fill-current" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase leading-none mb-1">
                                                Current
                                            </p>
                                            <p className="text-sm font-bold dark:text-white">
                                                {currentStreak} Days
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3 flex items-center gap-3">
                                        <div className="p-2 bg-yellow-500 rounded-xl text-white shadow-lg shadow-yellow-500/30">
                                            <Trophy className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-yellow-600 dark:text-yellow-500 uppercase leading-none mb-1">
                                                Best
                                            </p>
                                            <p className="text-sm font-bold dark:text-white">
                                                {bestStreak} Days
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Dashboard Grid */}
                                <div className="grid grid-cols-4 gap-2 mb-8">
                                    {[
                                        { val: totalFeedSeen, lab: "Seen", color: "text-blue-600", icon: Eye },
                                        { val: quizResults.length, lab: "Quizzes", color: "text-emerald-600", icon: ClipboardCheck },
                                        { val: simulationResults.length, lab: "Sims", color: "text-purple-600", icon: Cpu },
                                        { val: triviaResults.length, lab: "Trivia", color: "text-orange-600", icon: Star }
                                    ].map((stat, i) => (
                                        <div key={i} className="flex flex-col items-center p-3 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/5">
                                            <stat.icon className={`w-4 h-4 mb-2 ${stat.color}`} />
                                            <p className="text-lg font-bold dark:text-white leading-none">{stat.val}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{stat.lab}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Academic Info */}
                                <div className="p-5 bg-slate-50 dark:bg-white/[0.03] rounded-[2rem] border border-slate-100 dark:border-white/5 mb-8">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mb-4">
                                        Academic Details
                                    </p>

                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Institution</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-200">{profile.institution || "-"}</span>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Course / Block</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-200">
                                                {profile.course || "-"} / {profile.block || "-"}
                                            </span>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-bold uppercase text-[10px]">County</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-200">{profile.county || "-"}</span>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Specialization</span>
                                            <span className="font-bold text-blue-500">{profile.specialization || "-"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Performance History stays unchanged */}
                                <div className="space-y-6">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-[2px] flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                                        Performance History
                                    </h4>

                                    {/* KEEP YOUR EXISTING LISTS HERE (UNCHANGED) */}
                                </div>

                                <div className="mt-8 text-center">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[3px]">
                                        Student Since {profile.joined_date || "2024"}
                                    </p>
                                </div>
                            </div>

                        ) : (
                            <div className="text-center py-20">
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                                    No profile discovered
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Avatar Modal (UNCHANGED) */}
                {isAvatarOpen && (
                    <motion.div
                        className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[100] p-4 backdrop-blur-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => { e.stopPropagation(); setIsAvatarOpen(false); }}
                    >
                        <motion.img
                            src={profile?.avatar_url || "/UsersAvatar.jpg"}
                            className="max-h-[80vh] max-w-full rounded-3xl shadow-2xl border-4 border-white/10"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};
