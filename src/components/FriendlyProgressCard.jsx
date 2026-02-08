import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

function FriendlyProgressCard({ userTheme, name }) {
    const navigate = useNavigate();
    const [warning, setWarning] = useState(false);
    const [message, setMessage] = useState(
        "View your progress, track your quizzes, and keep improving."
    );

    const [latestScore, setLatestScore] = useState(null); // for progress bar
    const [targetScore, setTargetScore] = useState(50); // user's actual target

    useEffect(() => {
        async function checkScores() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch profile to get the actual target_score
            const { data: profile } = await supabase
                .from("profiles")
                .select("target_score")
                .eq("user_id", user.id)
                .single();

            const userTarget = profile?.target_score ?? 50;
            setTargetScore(userTarget);

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
            setLatestScore(latest);

            // Check against actual target
            if ((latestSim !== null && latestSim < userTarget) || (latestTrivia !== null && latestTrivia < userTarget)) {
                setWarning(true);
                setMessage(`Hi ${name || "there"}! Your latest score is below your target of ${userTarget}. Focus and try again!`);
            }
        }

        checkScores();
    }, [name]);

    // ⭐ Progress Bar Component
    const ProgressBar = ({ value }) => {
        const width = 200; // total width of the bar
        const height = 20; // bar height
        const safeValue = typeof value === "number" && !isNaN(value) ? value : 0;
        const fgColor = warning ? "#ff4d4f" : userTheme.iconColor;
        const bgColor = userTheme.iconBg || (userTheme.isDark ? "#2d2d2d" : "#e5e7eb");

        // filled width in pixels
        const fillWidth = (safeValue / 100) * width;

        return (
            <svg width={width} height={height}>
                {/* Background bar */}
                <rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    rx={10} // rounded corners
                    ry={10}
                    fill={bgColor}
                />
                {/* Foreground bar */}
                <rect
                    x={0}
                    y={0}
                    width={fillWidth}
                    height={height}
                    rx={10} // rounded corners
                    ry={10}
                    fill={fgColor}
                    style={{ transition: "width 1s ease" }}
                />
                {/* Percentage text */}
                <text
                    x={width / 2}
                    y={height / 2 + 5} // slightly adjusted vertical
                    dominantBaseline="middle"
                    textAnchor="middle"
                    className="text-sm font-bold"
                    style={{ fill: warning ? "#ff4d4f" : userTheme.textColor }}
                >
                    {safeValue}%
                </text>
            </svg>
        );
    };

    return (
        <div
            onClick={() => navigate("/progress")}
            className={`
        rounded-2xl p-4
        bg-gray-100 dark:bg-gray-900
        shadow-md hover:shadow-lg
        cursor-pointer transition-all active:scale-[0.97] select-none
        flex flex-col items-center justify-center gap-5 mt-4
      `}
        >
            <div
                onClick={() => navigate("/progress")}
                className={`flex flex-col items-center gap-4 mt-4 p-2 rounded-none bg-[${userTheme.background}] cursor-pointer`}
            >
                {/* Progress Bar */}
                <div className="w-full p-2 bg-[${userTheme.iconBg}] rounded-xl shadow-md flex items-center justify-center">
                    <ProgressBar value={latestScore} />
                </div>

                {/* Greeting & Message */}
                <div className="text-center">
                    <h2 className={`text-xl md:text-xl font-bold ${userTheme.textColor}`}>
                        {name ? `Hi ${name}!` : "Hello!"}
                    </h2>
                    <p className={`mt-2 text-xl md:text-base ${warning ? "animate-blink" : userTheme.textColorSecondary}`}
                        style={{ color: warning ? "#ff4d4f" : userTheme.textColorSecondary }}>
                        {message}
                    </p>
                </div>

                {/* Action Button */}
                <span className={`px-5 py-2 rounded-2xl font-semibold text-xl md:text-base bg-[${userTheme.buttonBg}] ${userTheme.buttonTextColor} text-center`}>
                    View Progress
                </span>
            </div>

            {/* Blinking animation */}
            <style>
                {`
          @keyframes blink {
            0%, 50%, 100% { opacity: 1; }
            25%, 75% { opacity: 0; }
          }
          .animate-blink {
            animation: blink 1.5s infinite;
          }
        `}
            </style>
        </div>
    );
}

export default FriendlyProgressCard;
