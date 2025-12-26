import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

function FriendlyProgressCard({ userTheme, name }) {
    const navigate = useNavigate();
    const [warning, setWarning] = useState(false);
    const [message, setMessage] = useState(
        `Take a moment to check your progress page
Track your quiz history, achievements, and see how close you are to mastering your topics!
Keep practicing to improve your scores and reach your best results!`
    );
    const [latestScore, setLatestScore] = useState(null); // for progress ring
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

    // ⭐ Progress Ring Component
    const ProgressRing = ({ value }) => {
        const radius = 40;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (value / 100) * circumference;
        const bgColor = userTheme.iconBg || (userTheme.isDark ? "#2d2d2d" : "#e5e7eb");
        const fgColor = warning ? "#ff4d4f" : userTheme.iconColor;

        return (
            <svg width="100" height="100">
                <circle
                    stroke={bgColor}
                    fill="transparent"
                    strokeWidth="10"
                    r={radius}
                    cx="50"
                    cy="50"
                />
                <circle
                    stroke={fgColor}
                    fill="transparent"
                    strokeWidth="10"
                    r={radius}
                    cx="50"
                    cy="50"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s ease" }}
                />
                <text
                    x="50%"
                    y="52%"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    className="text-xl font-bold"
                    style={{ fill: "currentColor" }}
                >
                    {value}%
                </text>
            </svg>
        );
    };

    return (
        <div
            onClick={() => navigate("/progress")}
            className={`
    rounded-none p-2 shadow-none border-0
    cursor-pointer hover:shadow-none transition-all active:scale-[0.97] select-none
    flex flex-col md:flex-row items-start md:items-center gap-5 mt-4
    bg-[${userTheme.background}]
  `}
        >

            {/* Icon + Progress Ring */}
            <div className="flex-shrink-0 relative">
                <div className={`p-4 bg-[${userTheme.iconBg}] rounded-full shadow-md flex items-center justify-center`}>
                    <ProgressRing value={latestScore} />
                </div>
            </div>

            {/* Greeting & Message */}
            <div className="flex-1">
                <h2 className={`text-lg md:text-xl font-bold ${userTheme.textColor}`}>
                    {name ? `Hi ${name}!` : "Hello!"}
                </h2>
                <p
                    className={`mt-2 text-sm md:text-base ${warning ? "animate-blink" : userTheme.textColorSecondary}`}
                    style={{ whiteSpace: "pre-line", color: warning ? "#ff4d4f" : userTheme.textColorSecondary }}
                >
                    {message}
                </p>
            </div>

            {/* Action Label */}
            <div className="mt-3 md:mt-0 md:ml-auto">
                <span className={`px-5 py-2 rounded-2xl font-semibold text-sm md:text-base bg-[${userTheme.buttonBg}] ${userTheme.buttonTextColor}`}>
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
