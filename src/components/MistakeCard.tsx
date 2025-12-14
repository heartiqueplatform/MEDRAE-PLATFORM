"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function MistakeCard() {
    const navigate = useNavigate();
    const [mistakeCount, setMistakeCount] = useState<number>(() => {
        const stored = localStorage.getItem("mistakeCount");
        return stored ? parseInt(stored, 10) : 0;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMistakes = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("user_mistakes")
                .select("id")
                .eq("user_id", user.id)
                .eq("resolved", false);

            if (error) console.error("Error fetching mistakes:", error);
            else {
                const count = data?.length || 0;
                setMistakeCount(count);
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

    if (loading) return null;

    const baseCardClass =
        "cursor-pointer rounded-xl p-4 shadow-md border flex items-center justify-between hover:shadow-lg transition-all select-none";

    const themedCardClass = `${baseCardClass} bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700`;

    return (
        <div
            onClick={() => navigate("/my-mistakes")}
            className={themedCardClass}
        >
            <div>
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
                        {/* Only this sentence is red and bouncing */}
                        <h2 className="text-lg font-bold text-red-700 dark:text-red-300 animate-pulse-sentence">
                            You have {mistakeCount} unresolved {mistakeCount === 1 ? "mistake" : "mistakes"}
                        </h2>
                        <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">
                            Tap to review and learn from your mistakes.
                        </p>
                    </>
                )}
            </div>
            <div className="ml-4 text-gray-700 dark:text-gray-300 font-bold text-xl">➔</div>

            {/* Keyframes for sentence pulse */}
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
                `}
            </style>
        </div>
    );
}
