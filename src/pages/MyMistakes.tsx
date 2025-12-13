"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlobalLoader } from "@/components/GlobalLoader";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    explanation: string;
    user_selected?: string;
}

interface Mistake {
    id: string;
    times_wrong: number;
    first_wrong_at: string;
    last_wrong_at: string;
    resolved: boolean;
    quiz_id: string;
    questions: Question;
    mistake_reason?: string; // add inside interface Mistake

}

export default function MyMistakes() {
    const [mistakes, setMistakes] = useState<Mistake[]>([]);
    const [loading, setLoading] = useState(true);
    const [mistakeCount, setMistakeCount] = useState(0);

    // ✅ Fetch mistakes on mount
    useEffect(() => {
        const fetchMistakes = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("user_mistakes")
                .select(`
                    id,
                    times_wrong,
                    first_wrong_at,
                    last_wrong_at,
                    resolved,
                    quiz_id,
                    user_selected,
                    mistake_reason,
                    questions:question_id (
                        id,
                        question_text,
                        option_a,
                        option_b,
                        option_c,
                        option_d,
                        correct_answer,
                        explanation
                    )
                `)
                .eq("user_id", user.id)
                .eq("resolved", false)
                .order("last_wrong_at", { ascending: false });

            if (error) console.error(error);
            else {
                const userMistakes = (data || []).filter((m) => m.questions);
                setMistakes(userMistakes);
                setMistakeCount(userMistakes.length);
                localStorage.setItem("mistakeCount", String(userMistakes.length));
            }

            setLoading(false);
        };

        fetchMistakes();

        // ✅ Set up real-time subscription
        const channel = supabase
            .channel('public:user_mistakes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_mistakes' }, () => {
                fetchMistakes();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);


    const getReasonClass = (reason?: string) => {
        switch (reason) {
            case "Misread question":
                return "bg-red-100 dark:bg-red-800 border-red-300 dark:border-red-700";
            case "Concept gap":
                return "bg-blue-100 dark:bg-blue-800 border-blue-300 dark:border-blue-700";
            case "Rushed":
                return "bg-yellow-100 dark:bg-yellow-800 border-yellow-300 dark:border-yellow-700";
            case "Guess":
                return "bg-green-100 dark:bg-green-800 border-green-300 dark:border-green-700";
            default:
                return "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600";
        }
    };

    // ✅ Mark a mistake as resolved (optimistic update + silent Supabase update)
    const markAsResolved = (questionId: string) => {
        const updateMistakes = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1️⃣ Optimistically update local state immediately
            const updated = mistakes.filter((m) => m.questions.id !== questionId);
            setMistakes(updated);
            setMistakeCount(updated.length);
            localStorage.setItem("mistakeCount", String(updated.length));

            // 2️⃣ Play tap sound instantly
            const audio = new Audio("/sounds/tap1.mp3");
            audio.play().catch((err) => console.error("Audio play error:", err));

            // 3️⃣ Update Supabase in background
            supabase
                .from("user_mistakes")
                .update({ resolved: true })
                .eq("user_id", user.id)
                .eq("question_id", questionId)
                .then(({ error }) => {
                    if (error) console.error("Error updating Supabase:", error);
                });
        };

        updateMistakes();
    };

    if (loading)
        return (
            <div className="flex justify-center items-center h-screen">
                <GlobalLoader />
            </div>
        );

    if (!mistakes.length)
        return <p className="text-center mt-8">You have no mistakes yet! 🎉</p>;

    const getOptionClass = (letter: string, mistake: Mistake) => {
        const correct = mistake.questions.correct_answer;
        const selected = mistake.user_selected;

        if (letter === correct && letter === selected)
            return "bg-green-300 dark:bg-green-700 border-green-600"; // picked correct
        if (letter === correct)
            return "bg-green-200 dark:bg-green-800 border-green-500"; // correct answer
        if (letter === selected)
            return "bg-red-200 dark:bg-red-800 border-red-500"; // user-selected wrong
        return "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"; // normal
    };

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold mb-2">My Mistakes</h1>
                <p className="text-gray-600 dark:text-gray-300">
                    Review questions you answered incorrectly. Green highlights the correct
                    answer, red shows what you chose. Mark as “understood” when you’ve mastered it.
                </p>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    You have {mistakeCount} unresolved {mistakeCount === 1 ? "mistake" : "mistakes"}.
                </p>
            </div>

            <AnimatePresence>
                {mistakes.map((m, i) => (
                    <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -300, transition: { duration: 0.4, type: "spring", stiffness: 150 } }}
                        layout
                    >
                        <Card className="overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-base sm:text-lg">
                                    Q{i + 1}: {m.questions.question_text}
                                </CardTitle>
                                <CardDescription className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                                    <span>
                                        Wrong {m.times_wrong} {m.times_wrong === 1 ? "time" : "times"}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Last Attempt: {dayjs(m.last_wrong_at).format("DD MMM YYYY, h:mm A")}
                                    </span>
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-2 text-sm sm:text-base">
                                {["A", "B", "C", "D"].map((letter) => {
                                    const optionText =
                                        m.questions[`option_${letter.toLowerCase()}` as keyof Question];
                                    return (
                                        <div
                                            key={letter}
                                            className={`px-3 py-2 rounded-md border ${getOptionClass(letter, m)}`}
                                        >
                                            <strong>{letter}.</strong> {optionText}
                                        </div>
                                    );
                                })}
                                {m.mistake_reason ? (
                                    <div className={`mt-2 px-3 py-2 rounded-md border ${getReasonClass(m.mistake_reason)} text-black dark:text-white`}>
                                        <strong>Reason for mistake:</strong> {m.mistake_reason}
                                    </div>
                                ) : null}


                                <p>
                                    <strong>Explanation:</strong> {m.questions.explanation}
                                </p>

                                <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
                                    <Button
                                        onClick={() => markAsResolved(m.questions.id)}
                                        className="w-full sm:w-auto"
                                    >
                                        Mark as Understood
                                    </Button>
                                </motion.div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
