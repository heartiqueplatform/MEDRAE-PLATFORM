"use client";
import { useNavigate } from "react-router-dom";
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
import { playSound } from "@/lib/soundManager";

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
    mistake_reason?: string;
}

export default function MyMistakes() {
    const navigate = useNavigate();

    // 🌟 Load cached mistakes from localStorage first
    const loadCachedMistakes = (): Mistake[] => {
        const cached = localStorage.getItem("mistakes");
        if (!cached) return [];
        try {
            const parsed = JSON.parse(cached);
            return parsed.filter((m: Mistake) => m.questions && Object.keys(m.questions).length > 0);
        } catch (e) {
            console.error("Failed to parse cached mistakes:", e);
            return [];
        }
    };


    const [mistakes, setMistakes] = useState<Mistake[]>(() => loadCachedMistakes());
    const [loading, setLoading] = useState(mistakes.length === 0); // Only show loader if nothing cached
    const [mistakeCount, setMistakeCount] = useState(mistakes.length);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        const syncOfflineQueue = async () => {
            const queue = getOfflineQueue();
            if (!queue.length) return;

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                for (const questionId of queue) {
                    const { error } = await supabase
                        .from("user_mistakes")
                        .update({ resolved: true })
                        .eq("user_id", user.id)
                        .eq("question_id", questionId);

                    if (!error) {
                        // Remove from queue
                        const updatedQueue = getOfflineQueue().filter(id => id !== questionId);
                        localStorage.setItem("offlineResolved", JSON.stringify(updatedQueue));
                    } else {
                        console.error("Failed to sync question:", questionId, error);
                    }
                }
            } catch (err) {
                console.error("Sync offline queue failed:", err);
            }
        };

        // Sync immediately if online
        if (navigator.onLine) syncOfflineQueue();

        // Listen for coming back online
        window.addEventListener("online", syncOfflineQueue);

        return () => {
            window.removeEventListener("online", syncOfflineQueue);
        };
    }, []);

    // 🌟 Fetch mistakes from Supabase in background
    useEffect(() => {
        let isMounted = true;

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

            if (error) {
                console.error(error);
            }
            if (isMounted) {
                const userMistakes = (data || []).filter((m) => m.questions && Object.keys(m.questions).length > 0);
                setMistakes(userMistakes);
                setMistakeCount(userMistakes.length);
                localStorage.setItem("mistakes", JSON.stringify(userMistakes));
                localStorage.setItem("mistakeCount", String(userMistakes.length));
                setLoading(false); // ← Always stop loading, even if no mistakes
            }

        };

        fetchMistakes();

        const channel = supabase
            .channel('public:user_mistakes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_mistakes' }, () => {
                fetchMistakes();
            })
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, []);
    const vibrateTap = (duration = 40) => {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate(duration);
        }
    };

    // Get offline queue from localStorage
    const getOfflineQueue = (): string[] => {
        const stored = localStorage.getItem("offlineResolved");
        if (!stored) return [];
        try {
            return JSON.parse(stored) as string[];
        } catch (err) {
            console.error("Failed to parse offline queue:", err);
            return [];
        }
    };

    // Save a questionId to offline queue
    const saveToOfflineQueue = (questionId: string) => {
        const queue = getOfflineQueue();
        if (!queue.includes(questionId)) {
            queue.push(questionId);
            localStorage.setItem("offlineResolved", JSON.stringify(queue));
        }
    };

    const syncOfflineQueue = async () => {
        const queue = getOfflineQueue();
        if (!queue.length) return;

        setSyncing(true); // Start syncing

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            for (const questionId of queue) {
                const { error } = await supabase
                    .from("user_mistakes")
                    .update({ resolved: true })
                    .eq("user_id", user.id)
                    .eq("question_id", questionId);

                if (!error) {
                    const updatedQueue = getOfflineQueue().filter(id => id !== questionId);
                    localStorage.setItem("offlineResolved", JSON.stringify(updatedQueue));
                } else {
                    console.error("Failed to sync question:", questionId, error);
                }
            }
        } catch (err) {
            console.error("Sync offline queue failed:", err);
        } finally {
            setSyncing(false); // Done syncing
        }
    };

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

    const markAsResolved = (questionId: string) => {
        const updateMistakes = async () => {
            // Optimistic update
            const updated = mistakes.filter((m) => m.questions.id !== questionId);
            setMistakes(updated);
            setMistakeCount(updated.length);
            localStorage.setItem("mistakes", JSON.stringify(updated));
            localStorage.setItem("mistakeCount", String(updated.length));

            // Play tap sound
            // Play tap sound
            playSound("tap-correct", false);

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("No user");

                if (!navigator.onLine) {
                    // Offline → save to local queue
                    saveToOfflineQueue(questionId);
                    console.log("Offline, saved to queue:", questionId);
                    return;
                }

                // Online → update Supabase
                const { error } = await supabase
                    .from("user_mistakes")
                    .update({ resolved: true })
                    .eq("user_id", user.id)
                    .eq("question_id", questionId);

                if (error) {
                    // If error, queue for later
                    saveToOfflineQueue(questionId);
                    console.error("Supabase error, queued:", questionId);
                }
            } catch (err) {
                // On any error, queue for later
                saveToOfflineQueue(questionId);
                console.error("Error, queued:", questionId, err);
            }
        };
        updateMistakes();
    };

    const getOptionClass = (letter: string, mistake: Mistake) => {
        const correct = mistake.questions?.correct_answer;

        const selected = mistake.user_selected;

        if (letter === correct && letter === selected)
            return "bg-green-300 dark:bg-green-700 border-green-600";
        if (letter === correct)
            return "bg-green-200 dark:bg-green-800 border-green-500";
        if (letter === selected)
            return "bg-red-200 dark:bg-red-800 border-red-500";
        return "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600";
    };

    if (loading)
        return (
            <div className="flex justify-center items-center h-screen">
                <GlobalLoader />
            </div>
        );

    if (!mistakes.length)
        return (
            <div className="flex justify-center items-center min-h-[60vh] p-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md p-6 text-center max-w-md">
                    <h2 className="text-xl font-bold text-green-700 dark:text-green-300">
                        Congratulations! You have no mistakes!
                    </h2>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        Great job! Keep your streak going by practicing more quizzes.
                    </p>
                    <button
                        onClick={() => navigate("/Medrae-quizzes")}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Go to Quizzes
                    </button>
                </div>
            </div>
        );

    return (


        <div className="p-3 max-w-4xl mx-auto">
            {syncing && (
                <div className="fixed top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-lg shadow-md text-sm z-50">
                    Syncing changes...
                </div>
            )}

            <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold mb-2">My Mistakes</h1>
                <p className="text-gray-600 dark:text-gray-300">
                    Review questions you answered incorrectly. Green highlights the correct
                    answer, answers with "your choice" shows what you chose. Mark as “understood” when you’ve mastered it.
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
                        <Card className="overflow-visible bg-transparent border-0 shadow-none rounded-none">

                            <CardHeader className="p-0">

                                <CardTitle className="text-base sm:text-lg">
                                    Q{i + 1}: {m.questions?.question_text ?? "Question unavailable"}

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

                            <CardContent className="space-y-2 p-3 text-sm sm:text-base">
                                {["A", "B", "C", "D"].map((letter) => {
                                    const optionText =
                                        m.questions?.[`option_${letter.toLowerCase()}` as keyof Question] ?? "—";
                                    const isCorrect = letter === m.questions?.correct_answer;

                                    const isUserChoice = letter === m.user_selected;

                                    return (
                                        <div
                                            key={letter}
                                            className="flex justify-between items-center py-2"
                                        >

                                            <span className={isCorrect ? "font-semibold text-green-700 dark:text-green-400" : isUserChoice ? "font-semibold text-red-700 dark:text-red-400" : ""}>
                                                <strong>{letter}.</strong> {optionText}
                                            </span>

                                            {isUserChoice && !isCorrect && (
                                                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 rounded-full">
                                                    Your Choice
                                                </span>
                                            )}
                                            {isCorrect && (
                                                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-200 rounded-full">
                                                    Correct Answer
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}


                                {m.mistake_reason && (
                                    <div className={`mt-2 px-3 py-2 rounded-md border ${getReasonClass(m.mistake_reason)} text-black dark:text-white`}>
                                        <strong>Reason for mistake:</strong> {m.mistake_reason}
                                    </div>
                                )}

                                <p>
                                    <strong>Explanation:</strong>{" "}
                                    {m.questions?.explanation ?? "No explanation available."}
                                </p>

                                <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
                                    <Button
                                        onClick={() => {
                                            vibrateTap(40);
                                            if (m.questions?.id) {
                                                markAsResolved(m.questions.id);
                                            }

                                        }}
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
