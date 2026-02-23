"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageCircle, Trophy, Stethoscope, Book, Eye } from "lucide-react";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/soundManager";
import { useNavigate } from "react-router-dom";
import { UserProfileModal } from "@/components/UserProfileModal";

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
    completedAt?: string | null; // ✅ new field
    timeUsed?: number | null;
}
export const DailyTriviaCard = () => {
    const navigate = useNavigate();

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
    const [completedAt, setCompletedAt] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const formatTimeReadable = (sec: number) => {
        const minutes = Math.floor(sec / 60);
        const seconds = sec % 60;
        const minText = minutes > 0 ? `${minutes} minute${minutes > 1 ? "s" : ""}` : "";
        const secText = seconds > 0 ? `${seconds} second${seconds > 1 ? "s" : ""}` : "";
        return [minText, secText].filter(Boolean).join(" and ");
    };

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
                setCompletedAt(attempts[0].created_at); // ✅ use created_at as completion time
            }

        }
        checkAttempt();
    }, [selfUserId, today]);
    // Fetch top 10 students
    useEffect(() => {
        async function fetchTop() {
            const { data: results } = await supabase
                .from("daily_trivia_results")
                .select("user_id, score,  time_used, created_at")
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
                    completedAt: r.created_at, // ✅ add created_at here
                    timeUsed: r.time_used,
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
            `I just completed today's Medrae Daily MindRush! 🧠🎉\nStop Guessing. Start Passing.\nCheck out Medrae here: ${appUrl}`
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
        <div className="relative select-none">



            <Card className="rounded-md overflow-hidden border-0 relative
                 bg-gray-100 dark:bg-gray-900 shadow-md mt-2">

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
                <CardContent className="p-1">
                    {loading ? (
                        <p className="text-center text-sm text-muted-foreground">Loading trivia…</p>
                    ) : questions.length === 0 ? (
                        <p>No questions available.</p>
                    ) : (
                        <div className="w-full min-h-[200px]">
                            <motion.div>
                                <div className="w-full bg-gray-50 bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)] 0 text-black dark:text-white rounded-3xl">

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
                    {/* Students attempted info */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-8 mb-3 px-0">
                        <Eye className="w-4 h-4" />
                        {topStudents.length} students attempted today
                    </div>
                    {/* Daily Top Students Heading */}
                    <div className="flex items-center gap-2 mb-2 px-0">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <span className="font-semibold">Daily Top Students</span>
                    </div>
                    {/* Scrollable Top Students Cards */}
                    <div className="w-full overflow-x-auto flex gap-4 py-2 custom-scrollbar">
                        {topStudents.length === 0 ? (
                            <div className="flex gap-4 animate-pulse">
                                {Array.from({ length: 4 }).map((_, idx) => (
                                    <div
                                        key={idx}
                                        className="flex-shrink-0 w-36 sm:w-40 p-3 rounded-md bg-gray-200 dark:bg-gray-700"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 mb-2"></div>
                                        <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                                        <div className="h-3 w-20 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                                        <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            topStudents.map((s, idx) => (
                                <motion.div
                                    key={s.user_id}
                                    className={`flex-shrink-0 w-36 sm:w-40 p-3 rounded-md ${idx === 0 ? "bg-yellow-100 dark:bg-yellow-800"
                                        : idx === 1 ? "bg-gray-100 dark:bg-gray-700"
                                            : idx === 2 ? "bg-orange-100 dark:bg-orange-800"
                                                : "bg-gray-100 dark:bg-gray-800"
                                        }`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05, type: "spring", stiffness: 120 }}
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => setSelectedUserId(s.user_id)}

                                >
                                    <div className="flex flex-col items-center text-center">
                                        {/* Top 3 Icon */}
                                        {idx <= 2 && (
                                            <Stethoscope
                                                className={`w-5 h-5 mb-1 animate-bounce ${idx === 0 ? "text-yellow-500"
                                                    : idx === 1 ? "text-gray-500"
                                                        : "text-orange-500"
                                                    }`}
                                            />
                                        )}

                                        <img
                                            src={s.avatar_url || "/UsersAvatar.jpg"}
                                            alt={s.name || s.username}
                                            className="w-12 h-12 rounded-full mb-2 object-cover"
                                        />

                                        <div className="font-semibold text-sm text-gray-800 dark:text-white break-words">
                                            {s.name || s.username}
                                        </div>

                                        <div className="text-xs text-gray-500 dark:text-gray-300 truncate">
                                            {s.institution || "No Institution"}
                                        </div>

                                        <div className="mt-2 font-bold text-blue-600 dark:text-blue-400">
                                            {s.score} pts
                                        </div>
                                        {s.completedAt && (
                                            <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                                                Done at {new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </div>
                                        )}
                                        {s.timeUsed !== undefined && (
                                            <div className="text-xs text-gray-500 dark:text-gray-300">
                                                Spent {formatTimeReadable(s.timeUsed)}
                                            </div>
                                        )}


                                        {/* Top 3 badges */}
                                        <div className="mt-1">
                                            {idx === 0 && <Badge variant="destructive">🥇</Badge>}
                                            {idx === 1 && <Badge variant="secondary">🥈</Badge>}
                                            {idx === 2 && <Badge variant="warning">🥉</Badge>}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                    {
                        !started && !completed && (
                            <Button
                                className="w-full mt-4"
                                disabled={loading || attemptedToday || !selfUserId}
                                onClick={() => {
                                    // Play tap sound
                                    playSound("start");

                                    // Strong vibration (200ms)
                                    if (navigator.vibrate) {
                                        navigator.vibrate(200);
                                    }

                                    // Call the original start function
                                    startTrivia();
                                }}
                            >
                                Start Daily Trivia
                            </Button>
                        )
                    }
                    {
                        started && !completed && (
                            <Button className="w-full mt-4" disabled>
                                Trivia in Progress
                            </Button>
                        )
                    }
                    {
                        completed && (
                            <div className="mt-4 p-2 bg-transparent dark:bg-transparent text-left font-semibold animate-fade-in">
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
                                        <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-4">
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
                                            ></div>
                                        </div>
                                        <div className="flex items-center justify-between w-full mt-1">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Correct answers</span>
                                            {savedScore && (
                                                <span className="text-xs text-gray-700 dark:text-gray-200 font-medium">
                                                    {savedScore.correct_answers}/{savedScore.total_questions}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Time used bar */}
                                    <div className="flex flex-col items-start">
                                        <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-4">
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
                                            ></div>
                                        </div>
                                        <div className="flex items-center justify-between w-full mt-1">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Time used</span>
                                            {timeUsedToday !== null && (
                                                <span className="text-xs text-gray-700 dark:text-gray-200 font-medium">
                                                    {Math.floor(timeUsedToday / 60).toString().padStart(2, "0")}:
                                                    {(timeUsedToday % 60).toString().padStart(2, "0")} min
                                                </span>
                                            )}
                                        </div>
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
                                <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                                    Every day, our trivia questions are carefully selected from different units across the app, giving you a mix of topics to challenge your knowledge.
                                    Here on the <span className="text-blue-600 underline font-medium cursor-pointer" onClick={() => navigate("/Medrae-quizzes")}>
                                        Medrae Quizzes page
                                    </span>, you'll find all units fully organized with similar questions.
                                    It’s like a showcase of the learning product explore, practice, and strengthen your skills at your own pace!
                                </p>

                                <span className="mt-3 text-sm text-gray-700 dark:text-gray-300 italic">
                                    Remember: Medrae helps you <strong>Stop Guessing. Start Passing.</strong>
                                </span>

                                <br />
                                Come back tomorrow for a new challenge!
                            </div>
                        )
                    }

                    <div className="flex justify-center">
                        <Button
                            variant="ghost"
                            className="
        flex items-center justify-center
        gap-2 px-3 py-2 mt-4
        rounded-full
        transition-transform duration-300 ease-in-out
        hover:scale-105
        hover:bg-transparent
    "
                            onClick={shareOnWhatsApp}
                            title="Share on WhatsApp"
                        >
                            <svg
                                role="img"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                                style={{ width: "32px", height: "32px" }} // ✅ pixel control
                            >
                                <title>WhatsApp</title>
                                <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            <span>Share to groups</span>
                        </Button>

                    </div>

                </CardContent >
            </Card >
            <UserProfileModal
                userId={selectedUserId}
                onClose={() => setSelectedUserId(null)}
            />

        </div >
    );
};
