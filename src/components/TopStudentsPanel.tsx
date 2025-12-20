"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageCircle, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/soundManager";

interface TriviaQuestion {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: "A" | "B" | "C" | "D";
}
interface TopStudent {
    user_id: string;
    name: string;
    score: number;
    avatar_url?: string | null;
    institution?: string | null;
}
export const DailyTriviaCard = () => {
    const [selfUserId, setSelfUserId] = useState<string | null>(null);
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            const id = data?.session?.user?.id;
            if (id) setSelfUserId(id);
        });
    }, []);
    const today = new Date().toISOString().slice(0, 10);
    const QUIZ_ID = today;
    const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [started, setStarted] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [timer, setTimer] = useState(5 * 60);
    const [loading, setLoading] = useState(true);
    const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
    const [attemptedToday, setAttemptedToday] = useState(false);
    const [timeUsedToday, setTimeUsedToday] = useState<number | null>(null);
    const [savedScore, setSavedScore] = useState<{ correct_answers: number; total_questions: number } | null>(null);
    const startTimeRef = useRef<number>(0);
    // Load questions
    useEffect(() => {
        async function loadQuestions() {
            setLoading(true);
            const stored = localStorage.getItem(`trivia_questions_${today}`);
            if (stored) {
                setQuestions(JSON.parse(stored));
                setLoading(false);
                return;
            }
            const { data, error } = await supabase.rpc("get_random_quiz_questions", {
                limit_count: 15,
            });

            if (!error && data) {
                setQuestions(data);
                localStorage.setItem(`trivia_questions_${today}`, JSON.stringify(data));
            }
            setLoading(false);
        }
        loadQuestions();
    }, [today]);

    // Check if user attempted today
    useEffect(() => {
        if (!selfUserId) return;
        async function checkAttempt() {
            const { data: attempts } = await supabase
                .from("daily_trivia_results")
                .select("id, time_used, correct_answers, total_questions")
                .eq("user_id", selfUserId)
                .eq("attempt_date", today);

            if (attempts?.length) {
                setAttemptedToday(true);
                setCompleted(true);
                setTimeUsedToday(attempts[0].time_used);  // saved time
                setSavedScore({
                    correct_answers: attempts[0].correct_answers,
                    total_questions: attempts[0].total_questions
                });
            }

        }
        checkAttempt();
    }, [selfUserId, today]);
    // Fetch top 10 students
    useEffect(() => {
        async function fetchTop() {
            const { data: results } = await supabase
                .from("daily_trivia_results")
                .select("user_id, score")
                .eq("attempt_date", today)
                .order("score", { ascending: false })
                .limit(10);

            if (!results?.length) return setTopStudents([]);

            const ids = results.map((r) => r.user_id);
            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, name, avatar_url, institution")
                .in("user_id", ids);

            const mapped = results.map((r) => {
                const profile = profiles?.find((p) => p.user_id === r.user_id);
                return {
                    user_id: r.user_id,
                    score: r.score,
                    name: profile?.name || "Student",
                    avatar_url: profile?.avatar_url || null,
                    institution: profile?.institution || null,
                };
            });
            setTopStudents(mapped);
        }
        fetchTop();
    }, [today, completed]);

    // Timer
    useEffect(() => {
        if (!started || completed) return;
        const interval = setInterval(() => {
            setTimer((t) => {
                if (t <= 1) {
                    clearInterval(interval);
                    finishTrivia();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [started, completed]);

    const shareOnWhatsApp = () => {
        const appUrl = window.location.origin; // Automatically gets your app URL
        const message = encodeURIComponent(
            `I just completed today's Medrae Daily MindRush! 🧠🎉\nOrganized Learning. Confident Exams.\nCheck out Medrae here: ${appUrl}`
        );
        const whatsappUrl = `https://wa.me/?text=${message}`;
        window.open(whatsappUrl, "_blank");
    };


    const answerQuestion = (questionId: string, letter: string) => {
        const updatedAnswers = { ...answers, [String(questionId)]: letter };
        setAnswers(updatedAnswers);

        if (currentIndex === questions.length - 1) finishTrivia();
        else setCurrentIndex((i) => i + 1);
    };

    const finishTrivia = async () => {
        if (!selfUserId || questions.length === 0) return;

        const normalizedQuestions = questions.map((q) => ({ ...q, id: String(q.id) }));
        const correctCount = normalizedQuestions.reduce(
            (acc, q) => acc + (answers[q.id] === q.correct_answer ? 1 : 0),
            0
        );

        const timeUsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

        // Save result to Supabase
        await supabase
            .from("daily_trivia_results")
            .upsert({
                user_id: selfUserId,
                quiz_id: QUIZ_ID,
                total_questions: normalizedQuestions.length,
                correct_answers: correctCount,
                score: correctCount,
                time_used: timeUsed,
                attempt_date: today,
            }, { onConflict: ["user_id", "attempt_date"] });

        setSavedScore({ correct_answers: correctCount, total_questions: normalizedQuestions.length });
        setTimeUsedToday(timeUsed);

        setCompleted(true);
        setStarted(false);
        setAttemptedToday(true);

        // Play the last question sound AFTER showing the completed message
        setTimeout(() => {
            playSound("trivia-finish", false);

            const duration = 3000; // 3 seconds
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 20, spread: 600, ticks: 120, zIndex: 999 }; // slower, wider, longer

            function randomInRange(min: number, max: number) {
                return Math.random() * (max - min) + min;
            }

            // Determine score bar color
            let scoreColor = 'bg-gray-400';
            if (savedScore) {
                scoreColor =
                    savedScore.correct_answers < 8 ? '#f87171' :   // red
                        savedScore.correct_answers <= 12 ? '#facc15' : // yellow
                            '#4ade80';                                     // green
            }

            // Determine time bar color
            let timeColor = 'bg-gray-400';
            if (timeUsedToday !== null) {
                timeColor =
                    timeUsedToday < 150 ? '#4ade80' :              // green
                        timeUsedToday <= 210 ? '#facc15' :             // yellow
                            '#f87171';                                     // red
            }

            const interval = setInterval(() => {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) {
                    clearInterval(interval);
                    return;
                }

                const particleCount = 15 + Math.floor(randomInRange(0, 10)); // more particles
                const screenWidth = window.innerWidth;
                const originY = screenWidth < 768 ? randomInRange(0, 0.6) : randomInRange(0, 0.25);

                // Randomly pick score or time color for each burst
                const colors = Math.random() < 0.5 ? [scoreColor] : [timeColor];

                confetti(Object.assign({}, defaults, {
                    particleCount,
                    origin: { x: Math.random(), y: originY },
                    colors: colors,
                }));
            }, 100); // even faster bursts for fuller effect
        }, 100);
    };

    const startTrivia = () => {
        setStarted(true);
        setCompleted(false);
        setCurrentIndex(0);
        setAnswers({});
        setTimer(5 * 60);
        startTimeRef.current = Date.now();
    };

    const fmt = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;

    return (
        <div className="relative">


            <Card className="rounded-none overflow-hidden border-0 relative bg-white dark:bg-gray-900 shadow-none">

                <CardHeader className="bg-blue-50 dark:bg-blue-900/40">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Brain className="w-6 h-6 text-blue-600" />
                            <CardTitle>Daily 15Teen MindRush Challenge</CardTitle>
                        </div>
                        <Badge variant="secondary">{questions.length} Questions</Badge>
                    </div>

                    <CardDescription className="flex justify-between items-center">
                        {started ? (
                            <span>
                                Time left: {fmt(timer)}
                            </span>
                        ) : (
                            "Ready for today’s challenge? Sharpen your mind and earn your bragging rights!"
                        )}

                        {started && !completed && (
                            <span className="text-sm text-muted-foreground">
                                Question {currentIndex + 1} of {questions.length}
                            </span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                    {loading ? (
                        <p className="text-center text-sm text-muted-foreground">Loading trivia…</p>
                    ) : questions.length === 0 ? (
                        <p>No questions available.</p>
                    ) : (
                        <div className="w-full min-h-[200px]">
                            <motion.div>
                                <div className="w-full bg-gray-50 dark:bg-gray-900 text-black dark:text-white rounded-3xl">

                                    {/* Question number */}
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                        Question {currentIndex + 1} of {questions.length}
                                    </p>

                                    {/* Question text */}
                                    <p className="font-semibold text-lg mb-6">{questions[currentIndex]?.question_text}</p>

                                    {/* Answers */}
                                    <div className="flex flex-col gap-4">
                                        {(["A", "B", "C", "D"] as const).map((letter) => {
                                            const text =
                                                letter === "A"
                                                    ? questions[currentIndex].option_a
                                                    : letter === "B"
                                                        ? questions[currentIndex].option_b
                                                        : letter === "C"
                                                            ? questions[currentIndex].option_c
                                                            : questions[currentIndex].option_d;

                                            const isSelected = answers[questions[currentIndex].id] === letter;

                                            const handleClick = () => {
                                                if (!started || completed) return;
                                                if (navigator.vibrate) navigator.vibrate(50);
                                                playSound("tap-correct", false);
                                                setAnswers((prev) => ({ ...prev, [questions[currentIndex].id]: letter }));
                                                setTimeout(() => {
                                                    if (currentIndex === questions.length - 1) finishTrivia({ ...answers, [questions[currentIndex].id]: letter });
                                                    else setCurrentIndex((i) => i + 1);
                                                }, 300);
                                            };

                                            return (
                                                <motion.div
                                                    key={letter}
                                                    whileTap={{ scale: 1.2 }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                                    className="flex items-start gap-4 cursor-pointer"
                                                    onClick={handleClick}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
              ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-400 bg-white dark:bg-gray-800"}`}
                                                    >
                                                        {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                    </div>
                                                    <p className="text-sm break-words">{text}</p>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>


                        </div>
                    )}
                    <div className="flex flex-col md:flex-row justify-between items-start mt-4">
                        {/* Students attempted info */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 md:mb-0">
                            <MessageCircle className="w-4 h-4" />
                            {topStudents.length} students attempted today
                        </div>

                        {/* Top students */}
                        <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                Daily Top Students
                            </div>

                            <div className="ml-1 mt-1 text-sm w-full md:w-auto">
                                {topStudents.map((s, idx) => (
                                    <div key={s.user_id} className="flex justify-between items-center gap-2 py-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <img
                                                src={s.avatar_url || "/UsersAvatar.jpg"}
                                                alt={s.name}
                                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                            />
                                            <div className="flex flex-col text-sm truncate min-w-0">
                                                <span className="font-medium truncate">{s.name}</span>
                                                {s.institution && (
                                                    <span className="text-xs text-muted-foreground truncate">{s.institution}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 text-sm flex-shrink-0 text-right">
                                            <span className="whitespace-nowrap">{s.score} pts</span>
                                            {idx === 0 && <Badge variant="destructive">🥇</Badge>}
                                            {idx === 1 && <Badge variant="secondary">🥈</Badge>}
                                            {idx === 2 && <Badge variant="warning">🥉</Badge>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {!started && !completed && (
                        <Button
                            className="w-full mt-4"
                            disabled={loading || attemptedToday || !selfUserId}
                            onClick={startTrivia}
                        >
                            Start Daily Trivia
                        </Button>
                    )}
                    {started && !completed && (
                        <Button className="w-full mt-4" disabled>
                            Trivia in Progress
                        </Button>
                    )}
                    {completed && (
                        <div className="mt-4 p-4 bg-transparent dark:bg-transparent text-center font-semibold animate-fade-in">

                            <span className="text-lg font-bold">Congratulations! You finished today's trivia!</span>
                            <br />

                            {/* Score display */}
                            {savedScore
                                ? `${savedScore.correct_answers}/${savedScore.total_questions} correct! 🌟`
                                : "0/0 correct! 🌟"}
                            <br />

                            {/* Time spent display */}
                            {timeUsedToday !== null ? `${timeUsedToday}s spent ⏱` : "0s spent ⏱"}
                            <br /><br />

                            {/* Description for bars */}
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                Bars show your performance: <strong>green</strong> is good, <strong>yellow</strong> is average, <strong>red</strong> is below expectations.
                                <br />
                                Correct answers bar: how many questions you got right. <br />
                                Time used bar: how fast you completed the quiz.
                            </div>

                            {/* Progress bars */}
                            <div className="mt-2 space-y-4">

                                {/* Correct answers bar */}
                                <div className="flex flex-col items-start">
                                    <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-4 relative">
                                        <div
                                            className={`h-4 rounded-full transition-all duration-500 ${savedScore
                                                ? savedScore.correct_answers < 8
                                                    ? "bg-red-500"
                                                    : savedScore.correct_answers <= 12
                                                        ? "bg-yellow-400"
                                                        : "bg-green-500"
                                                : "bg-gray-400"
                                                }`}
                                            style={{
                                                width: savedScore
                                                    ? `${(savedScore.correct_answers / savedScore.total_questions) * 100}%`
                                                    : "0%",
                                            }}
                                        >
                                            {/* Tooltip with exact value */}
                                            {savedScore && (
                                                <span className="absolute right-1 top-[-1.5rem] text-xs text-gray-700 dark:text-gray-200 font-medium">
                                                    {savedScore.correct_answers}/{savedScore.total_questions}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                        Correct answers
                                    </span>
                                </div>

                                {/* Time used bar */}
                                <div className="flex flex-col items-start">
                                    <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-4 relative">
                                        <div
                                            className={`h-4 rounded-full transition-all duration-500 ${timeUsedToday !== null
                                                ? timeUsedToday < 150
                                                    ? "bg-green-500"
                                                    : timeUsedToday <= 210
                                                        ? "bg-yellow-400"
                                                        : "bg-red-500"
                                                : "bg-gray-400"
                                                }`}
                                            style={{
                                                width: timeUsedToday
                                                    ? `${Math.min((timeUsedToday / 300) * 100, 100)}%`
                                                    : "0%",
                                            }}
                                        >
                                            {/* Tooltip with formatted time */}
                                            {timeUsedToday !== null && (
                                                <span className="absolute right-1 top-[-1.5rem] text-xs text-gray-700 dark:text-gray-200 font-medium">
                                                    {Math.floor(timeUsedToday / 60)
                                                        .toString()
                                                        .padStart(2, "0")}:
                                                    {(timeUsedToday % 60).toString().padStart(2, "0")} min
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                        Time used
                                    </span>
                                </div>
                            </div>
                            <br />
                            {(() => {
                                const score = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_answer ? 1 : 0), 0);
                                if (score === questions.length) return "🔥 Incredible! You aced it today!";
                                if (score >= Math.ceil(questions.length * 0.8)) return "💪 Great job! You're getting stronger every day!";
                                if (score >= Math.ceil(questions.length * 0.5)) return "🙂 Nice work! Keep practicing and you'll improve!";
                                return "👍 Good effort! Remember, every answer helps you learn more!";
                            })()}

                            <br /><br />
                            <span className="text-sm text-gray-700 dark:text-gray-300 italic">
                                Remember: Medrae helps you <strong>Organized Learning. Confident Exams.</strong>
                            </span>

                            <br />
                            Come back tomorrow for a new challenge!
                        </div>
                    )}

                    <div className="flex justify-center">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="
            flex items-center justify-center
            gap-2 px-3 py-2 mt-4
            rounded-full
            text-green-500
            transition-transform duration-300 ease-in-out
            hover:scale-105
            hover:bg-transparent
            hover:text-green-500
        "
                            onClick={shareOnWhatsApp}
                            title="Share on WhatsApp"
                        >
                            <MessageCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span>Share to groups</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
