import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@supabase/auth-helpers-react";
import { Trophy, Target, TrendingUp, Sparkles, ArrowUpRight, Flame } from "lucide-react";

function FriendlyProgressCard({ userTheme, name }) {
    const navigate = useNavigate();
    const session = useSession();
    const user = session?.user || null;

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ latest: 0, target: 50 });
    const [message, setMessage] = useState("Your learning journey...");

    useEffect(() => {
        if (!user) return;

        async function fetchUserData() {
            try {
                setLoading(true);

                // 1. Fetch Target Score
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("target_score")
                    .eq("user_id", user.id)
                    .single();

                const userTarget = profile?.target_score ?? 50;

                // 2. Fetch Latest Results
                const { data: sim } = await supabase
                    .from("simulation_results")
                    .select("score, total_questions")
                    .eq("user_id", user.id)
                    .order("submitted_at", { ascending: false })
                    .limit(1);

                const { data: trivia } = await supabase
                    .from("daily_trivia_results")
                    .select("score")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(1);

                // 3. Safe Calculation Logic
                let latestSim = 0;
                if (sim?.[0] && sim[0].total_questions > 0) {
                    latestSim = Math.round((Number(sim[0].score || 0) / Number(sim[0].total_questions)) * 100);
                }

                let latestTrivia = 0;
                if (trivia?.[0]) {
                    latestTrivia = Math.round((Number(trivia[0].score || 0) / 15) * 100);
                }

                const latest = Math.max(latestSim, latestTrivia);

                // 4. Update Stats State
                setStats({
                    latest: isNaN(latest) ? 0 : latest,
                    target: userTarget
                });

                // 5. Update Message
                if (latest >= userTarget) {
                    setMessage(`Amazing ${name || "Champion"}! You've surpassed your ${userTarget}% goal. You're a pro!`);
                } else {
                    setMessage(`Hi ${name || "there"}! You're at ${latest}%. Just a little more hard work to reach ${userTarget}%!`);
                }

            } catch (error) {
                console.error("Error fetching user progress:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchUserData();
    }, [user, name]);

    const hasReachedTarget = stats.latest >= stats.target;

    return (
        <div
            onClick={() => navigate("/progress")}
            className="group relative w-full min-h-[280px] md:min-h-[320px] md:rounded-xl overflow-hidden cursor-pointer md:shadow-xl transition-all duration-500 md:hover:shadow-2xl mt-0 md:mt-2 md:border-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 md:border-b-0"
        >
            {/* 1. BACKGROUND IMAGE LAYER */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/high1.png"
                    alt="Student Success"
                    className="w-full h-full object-cover object-right opacity-40 dark:opacity-30 grayscale-[30%]"
                />
                {/* Soft Muted Gradient Mask */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/95 to-transparent dark:from-slate-950 dark:via-slate-950/90 dark:to-transparent" />
            </div>

            {/* 2. CONTENT LAYER */}
            <div className="relative z-10 flex flex-col justify-between h-full min-h-[280px] md:min-h-[320px] p-5 md:p-8 lg:p-10">

                {/* TOP: Badges and Header */}
                <div className="max-w-[90%] md:max-w-[75%] space-y-3 md:space-y-4">
                    <div className="flex items-center gap-2 md:gap-3">
                        {hasReachedTarget ? (
                            <div className="flex items-center gap-1.5 md:gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 md:px-4 py-1 md:py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 animate-pulse">
                                <Trophy className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Target Unlocked</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 md:gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 md:px-4 py-1 md:py-1.5 rounded-full border border-amber-200 dark:border-amber-800 shadow-sm">
                                <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 animate-bounce" />
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Keep Climbing</span>
                            </div>
                        )}
                    </div>

                    <h2 className="text-lg md:text-2xl lg:text-3xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                        {loading ? "Checking your scores..." : message}
                    </h2>

                    {!hasReachedTarget && !loading && (
                        <p className="text-[10px] md:text-xs font-bold text-slate-500 flex items-center gap-1 opacity-80">
                            <Flame className="h-2.5 w-2.5 md:h-3 md:w-3 text-orange-500" /> Focus on your weak spots to improve!
                        </p>
                    )}
                </div>

                {/* BOTTOM LEFT: Progress Details */}
                <div className="w-full max-w-sm space-y-1.5 md:space-y-2 mt-4 md:mt-0">
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Performance</span>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-4xl md:text-5xl font-black tracking-tighter ${hasReachedTarget ? 'text-emerald-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                    {stats.latest}%
                                </span>
                                <span className="text-slate-400 font-bold text-sm md:text-base">/ {stats.target}%</span>
                            </div>
                        </div>

                        {/* Achievement Stamp */}
                        {hasReachedTarget && (
                            <div className="bg-white dark:bg-slate-800 p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 rotate-12 -translate-y-3 md:-translate-y-4">
                                <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-amber-500" />
                            </div>
                        )}
                    </div>

                    {/* Progress Bar Container */}
                    <div className="space-y-2 md:space-y-3">
                        <div className="h-2.5 md:h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300/30 dark:border-slate-700">
                            <div
                                className={`h-full rounded-full transition-all duration-[1.5s] ease-out ${hasReachedTarget ? 'bg-emerald-500' : userTheme?.buttonBg || 'bg-indigo-600'}`}
                                style={{ width: `${Math.min(stats.latest, 100)}%` }}
                            >
                                {/* Subtle shine animation on the bar */}
                                <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                            </div>
                        </div>

                        <button className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition-colors">
                            Full Score Breakdown <ArrowUpRight className="h-2.5 w-2.5 md:h-3 md:w-3" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FriendlyProgressCard;