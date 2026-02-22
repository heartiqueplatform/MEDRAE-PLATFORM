"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalLoader } from "@/components/GlobalLoader";
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
                // 1️⃣ Profile
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("user_id", userId)
                    .single();
                setProfile(profileData);

                // Fetch streaks
                await fetchStreaks();

                // 2️⃣ Last 10 quiz results
                const { data: quizData } = await supabase
                    .from("quiz_results")
                    .select("*")
                    .eq("user_id", userId)
                    .order("submitted_at", { ascending: false })
                    .limit(10);
                setQuizResults(quizData || []);

                // 3️⃣ Last 10 simulation results
                // 1️⃣ Fetch last 10 simulation results
                const { data: simResults } = await supabase
                    .from("simulation_results")
                    .select("*")
                    .eq("user_id", userId)
                    .order("submitted_at", { ascending: false })
                    .limit(10);

                // 2️⃣ Fetch paper info for these results
                const paperIds = simResults?.map(r => r.paper_id).filter(Boolean) || [];
                const { data: papers } = await supabase
                    .from("simulation_papers")
                    .select("id, title")
                    .in("id", paperIds);

                // 3️⃣ Merge paper titles into results
                const simResultsWithTitles = simResults?.map(r => ({
                    ...r,
                    paper_name: papers?.find(p => p.id === r.paper_id)?.title || "Paper"
                }));
                setSimulationResults(simResultsWithTitles);



                // 4️⃣ Last 10 daily trivia results
                const { data: triviaData } = await supabase
                    .from("daily_trivia_results")
                    .select("*")
                    .eq("user_id", userId)
                    .order("attempt_date", { ascending: false })
                    .limit(10);
                setTriviaResults(triviaData || []);

                // 5️⃣ Total feed seen
                const { count } = await supabase
                    .from("qfeed_seen")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId);
                setTotalFeedSeen(count || 0);

            } catch (err) {
                console.error("Error loading user activity:", err);
            }

            setLoading(false);
        }

        loadData();
    }, [userId]);

    if (!userId) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose} // <-- add this
            >
                <motion.div
                    className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar pb-24"
                    initial={{ y: 400 }}
                    animate={{ y: 0 }}
                    exit={{ y: 400 }}
                    transition={{ type: "spring", stiffness: 120 }}
                    onClick={(e) => e.stopPropagation()} // ✅ stop clicks inside modal from closing
                >
                    <div className="flex justify-end">
                        <X className="cursor-pointer" onClick={onClose} />
                    </div>

                    {loading ? (
                        <div className="flex justify-center mt-6">
                            <GlobalLoader />
                        </div>
                    ) : profile ? (
                        <div className="flex flex-col items-center text-center">
                            <img
                                src={profile.avatar_url || "/UsersAvatar.jpg"}
                                onClick={() => setIsAvatarOpen(true)}
                                className="cursor-pointer w-20 h-20 rounded-full object-cover mb-3"
                            />
                            <h2 className="text-lg font-bold">{profile.name || "Student"}</h2>
                            {profile.username && <p className="text-sm text-gray-500">@{profile.username}</p>}
                            {profile.is_online !== null && (
                                <p className={`text-xs mt-1 ${profile.is_online ? "text-green-500" : "text-gray-400"}`}>
                                    {profile.is_online ? "Online" : "Offline"}
                                </p>
                            )}
                            {profile.last_seen && !profile.is_online && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Last seen: {new Date(profile.last_seen).toLocaleString()}
                                </p>
                            )}

                            {/* Profile Info */}
                            <div className="mt-4 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                <p><strong>Institution:</strong> {profile.institution || "-"}</p>
                                <p><strong>Course / Block:</strong> {profile.course || "-"} / {profile.block || "-"}</p>
                                <p><strong>County:</strong> {profile.county || "-"}</p>
                                <p><strong>Specialization:</strong> {profile.specialization || "-"}</p>
                                {profile.bio && <p><strong>Bio:</strong> {profile.bio}</p>}
                                {profile.joined_date && <p><strong>Joined:</strong> {profile.joined_date}</p>}
                            </div>
                            {/* Streaks */}
                            <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                <p className="mt-2 font-semibold text-yellow-400">
                                    Current Streak: {currentStreak} day{currentStreak !== 1 ? "s" : ""}
                                </p>
                                <p className="mt-1 font-semibold text-yellow-400">
                                    🏆 Best Streak: {bestStreak} day{bestStreak !== 1 ? "s" : ""}
                                </p>
                            </div>
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4 mt-4 text-center w-full">
                                <div>
                                    <p className="font-bold text-blue-600">{totalFeedSeen}</p>
                                    <p className="text-xs">Questions Seen</p>
                                </div>
                                <div>
                                    <p className="font-bold text-green-600">{quizResults.length}</p>
                                    <p className="text-xs">Quiz Attempts</p>
                                </div>
                                <div>
                                    <p className="font-bold text-purple-600">{simulationResults.length}</p>
                                    <p className="text-xs">Simulations</p>
                                </div>
                                <div>
                                    <p className="font-bold text-yellow-600">{triviaResults.length}</p>
                                    <p className="text-xs">Trivia Attempts</p>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="mt-6 w-full space-y-4 text-left">
                                {quizResults.length > 0 && (
                                    <>
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">Recent Quiz Results</h4>
                                        <ul className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar text-sm">
                                            {quizResults.map(q => (
                                                <li key={q.id} className="flex justify-between">
                                                    <span>{q.unit || "Unit"}</span>
                                                    <span>{q.score}/{q.total_questions}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}

                                {simulationResults.length > 0 && (
                                    <>
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">Recent Simulation Results</h4>
                                        <ul className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar text-sm">
                                            {simulationResults.map(s => (
                                                <li key={s.id} className="flex justify-between">
                                                    <span>{s.paper_name}</span>
                                                    <span>{s.score}/{s.total_questions}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}

                                {triviaResults.length > 0 && (
                                    <>
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">Recent Daily Trivia</h4>
                                        <ul className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar text-sm">
                                            {triviaResults.map(t => (
                                                <li key={t.id} className="flex justify-between">
                                                    <span>{t.attempt_date}</span>
                                                    <span>{t.score}/{t.total_questions}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 mt-6">No profile found</p>
                    )}
                </motion.div>
                {isAvatarOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black/90 flex items-center justify-center z-60 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => {
                            e.stopPropagation(); // ✅ prevent click from bubbling to parent modal
                            setIsAvatarOpen(false); // close avatar modal
                        }}
                    >
                        <motion.img
                            src={profile.avatar_url || "/UsersAvatar.jpg"}
                            className="max-h-full max-w-full rounded-lg shadow-lg"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            onClick={(e) => e.stopPropagation()} // ✅ prevent clicking image from closing anything
                        />
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};
