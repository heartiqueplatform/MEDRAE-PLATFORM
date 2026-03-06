import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

function FriendlyProgressCard({ userTheme, name }) {
    const navigate = useNavigate();
    const [message, setMessage] = useState(
        "View your progress, track your quizzes, and keep improving."
    );

    useEffect(() => {
        async function fetchUserData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch profile for target_score
            const { data: profile } = await supabase
                .from("profiles")
                .select("target_score")
                .eq("user_id", user.id)
                .single();

            const userTarget = profile?.target_score ?? 50;

            // Fetch latest simulation
            const { data: sim } = await supabase
                .from("simulation_results")
                .select("score, total_questions, submitted_at")
                .eq("user_id", user.id)
                .order("submitted_at", { ascending: false })
                .limit(1);

            // Fetch latest trivia
            const { data: trivia } = await supabase
                .from("daily_trivia_results")
                .select("score, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1);

            const latestSim = sim?.[0] ? Math.round((sim[0].score / sim[0].total_questions) * 100) : null;
            const TOTAL_TRIVIA_QUESTIONS = 15;
            const latestTrivia = trivia?.[0] ? Math.round((trivia[0].score / TOTAL_TRIVIA_QUESTIONS) * 100) : null;

            const latest = Math.max(latestSim ?? 0, latestTrivia ?? 0);

            // Set message depending on score vs target
            if ((latestSim !== null && latestSim < userTarget) || (latestTrivia !== null && latestTrivia < userTarget)) {
                setMessage(
                    `Hi ${name || "there"}! Your latest score  is below your target of ${userTarget}%. Keep focusing and try again to reach your goal!`
                );
            } else {
                setMessage(
                    `Hi ${name || "there"}! Great job! Your latest score is meeting or exceeding your target of ${userTarget}%. Keep up the good work!`
                );
            }
        }

        fetchUserData();
    }, [name]);

    return (
        <div
            onClick={() => navigate("/progress")}
            className="flex flex-col md:flex-row bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-transform hover:scale-[0.98] mt-4"
        >
            {/* Text section */}
            <div className="flex-1 p-6 flex flex-col justify-center gap-4">

                <p className="text-gray-700 dark:text-gray-300 text-base md:text-lg">
                    {message}
                </p>
                <span
                    className={`mt-2 px-6 py-2 rounded-full font-medium text-white ${userTheme.buttonBg || "bg-blue-600"}`}
                >
                    View Progress
                </span>
            </div>

            {/* Image section */}
            <div className="flex-1">
                <img
                    src="/high1.png"
                    alt="Illustration"
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
    );
}

export default FriendlyProgressCard;
