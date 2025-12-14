"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

type Mistake = {
    id: string;
    mistake_reason: string | null;
    times_wrong: number;
    resolved: boolean;
};

export default function MistakeCard() {
    const navigate = useNavigate();
    const [mistakeCount, setMistakeCount] = useState<number>(() => {
        const stored = localStorage.getItem("mistakeCount");
        return stored ? parseInt(stored, 10) : 0;
    });

    const [mistakes, setMistakes] = useState<Mistake[]>([]);
    const [loading, setLoading] = useState(true);
    const [animate, setAnimate] = useState(false);
    const prevCountRef = useRef<number>(mistakeCount);

    // Rich, friendly insight sentences
    const getInsightSentence = (m: Mistake) => {
        if (!m.mistake_reason) {
            return "Kindly select a reason for each mistake  this helps you learn faster and gives clear guidance.";
        }

        const { mistake_reason, times_wrong } = m;
        switch (mistake_reason) {
            case "Rushed":
                return times_wrong >= 2
                    ? "You've rushed similar questions a few times  slow down a bit and focus on each detail, you got this!"
                    : "Looks like you went a bit fast on this one  take a breath and read carefully next time.";
            case "Concept gap":
                return times_wrong >= 2
                    ? "You’ve struggled with this concept multiple times  spend a bit more time on this topic, it will really pay off!"
                    : "This one seems tricky  reviewing related notes can help clarify the concept.";
            case "Misread question":
                return times_wrong >= 2
                    ? "You keep misreading similar questions  slow down and underline key points; attention to detail matters."
                    : "Easy to miss small details read each question carefully, you’ll get it!";
            case "Guess":
                return times_wrong >= 2
                    ? "You guessed again  don’t worry! Try breaking the question down logically; it helps a lot."
                    : "It seems like you guessed here  try reasoning through your answer next time.";
            default:
                return "Reflect on this mistake to improve next time you’re learning!";
        }
    };
    const getProgressSignal = (m: Mistake) => {
        if (m.resolved) return "Resolved quickly";
        if (m.times_wrong >= 2) return "Repeated mistake";
        return "Needs review";
    };

    useEffect(() => {
        const fetchMistakes = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("user_mistakes")
                .select("id, mistake_reason, times_wrong, resolved")
                .eq("user_id", user.id)
                .eq("resolved", false)
                .order("last_wrong_at", { ascending: false });

            if (error) console.error("Error fetching mistakes:", error);
            else {
                const count = data?.length || 0;
                if (count !== prevCountRef.current) setAnimate(true);
                prevCountRef.current = count;
                setMistakeCount(count);
                setMistakes(data || []);
                localStorage.setItem("mistakeCount", String(count));
            }

            setLoading(false);
        };

        fetchMistakes();

        const channel = supabase
            .channel("public:user_mistakes")
            .on("postgres_changes", { event: "*", schema: "public", table: "user_mistakes" }, () => {
                fetchMistakes();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const baseCardClass =
        "cursor-pointer rounded-xl p-4 shadow-md border flex flex-col sm:flex-row items-start sm:items-center justify-between hover:shadow-lg transition-all select-none";
    const themedCardClass = `${baseCardClass} bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700`;

    const handleAnimationEnd = () => setAnimate(false);

    return (
        <div
            onClick={() => navigate("/my-mistakes")}
            className={themedCardClass}
        >
            <div className="flex-1">
                {mistakeCount === 0 ? (
                    <>
                        <h2 className="text-lg font-bold text-green-700 dark:text-green-300">
                            No unresolved mistakes 🎉
                        </h2>
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Keep up the good work!
                        </p>
                    </>
                ) : (
                    <>
                        <h2
                            className={`text-lg font-bold text-red-700 dark:text-red-300 animate-pulse-sentence ${animate ? "animate-number-pop" : ""
                                }`}
                            onAnimationEnd={handleAnimationEnd}
                        >
                            You have {mistakeCount} unresolved {mistakeCount === 1 ? "mistake" : "mistakes"}
                        </h2>
                        <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">
                            Tap to review and learn from your mistakes.
                        </p>

                        <div className="mt-3 space-y-1">
                            {mistakes.slice(0, 3).map((m) => (
                                <div key={m.id} className="text-sm text-gray-800 dark:text-gray-300">
                                    <span className="font-semibold">{getProgressSignal(m)}:</span>{" "}
                                    {getInsightSentence(m)}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
            <div className="ml-4 mt-2 sm:mt-0 text-gray-700 dark:text-gray-300 font-bold text-xl">➔</div>

            <style>
                {`
          @keyframes pulse-sentence {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
          }
          .animate-pulse-sentence {
              display: inline-block;
              animation: pulse-sentence 1.2s ease-in-out infinite;
          }

          @keyframes number-pop {
              0% { transform: scale(1); }
              50% { transform: scale(1.3); color: #f87171; }
              100% { transform: scale(1); color: inherit; }
          }
          .animate-number-pop {
              animation: number-pop 0.6s ease-in-out;
              display: inline-block;
          }
        `}
            </style>
        </div>
    );
}
