"use client";
import { useState, useEffect, useRef } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageCircle, Timer, Award, Stethoscope, ArrowRight, Zap, TrendingUp, Book, Target, Eye, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/soundManager";
import { useNavigate } from "react-router-dom";
import { UserProfileModal } from "@/components/UserProfileModal";

import { useToast } from "@/components/ui/use-toast";
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
    const { toast } = useToast();
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
    // reactions for each student
    const [reactions, setReactions] = useState<Record<string, { like: number; fire: number; clap: number }>>({});
    // instead of string | null, we store array of reactions
    const [myReactions, setMyReactions] = useState<Record<string, string[]>>({});
    const [attemptedToday, setAttemptedToday] = useState(false);
    const [timeUsedToday, setTimeUsedToday] = useState<number | null>(null);
    const [savedScore, setSavedScore] = useState<{ correct_answers: number; total_questions: number } | null>(null);
    const startTimeRef = useRef<number>(0);
    const [completedAt, setCompletedAt] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [topLoading, setTopLoading] = useState(true);
    const currentQuestion = questions[currentIndex];


    const formatTimeReadable = (sec: number) => {
        const minutes = Math.floor(sec / 60);
        const seconds = sec % 60;
        const minText = minutes > 0 ? `${minutes} minute${minutes > 1 ? "s" : ""}` : "";
        const secText = seconds > 0 ? `${seconds} second${seconds > 1 ? "s" : ""}` : "";
        return [minText, secText].filter(Boolean).join(" and ");
    };


    useEffect(() => {
        if (!selfUserId) return;

        const channel = supabase
            .channel("reaction-notifications")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "trivia_reactions",
                    filter: `target_user_id=eq.${selfUserId}`,
                },
                async (payload) => {

                    // prevent notifying yourself
                    if (payload.new.reactor_id === selfUserId) return;

                    const reaction = payload.new.reaction;
                    const reactorId = payload.new.reactor_id;

                    const { data } = await supabase
                        .from("profiles")
                        .select("name")
                        .eq("user_id", reactorId)
                        .single();

                    const reactorName = data?.name || "Someone";

                    const emoji =
                        reaction === "like"
                            ? "👍"
                            : reaction === "fire"
                                ? "🔥"
                                : "👏";

                    toast({
                        title: "New Reaction!",
                        description: `${reactorName} reacted ${emoji} to your trivia result`,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selfUserId]);
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
            setTopLoading(true);
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
            // load reactions
            // Load reactions for today
            const { data: reactionData, error: reactionError } = await supabase
                .from("trivia_reactions")
                .select("reactor_id,target_user_id,reaction")
                .eq("attempt_date", today);

            if (reactionError) {
                console.error("Error fetching reactions:", reactionError);
            }

            if (reactionData) {
                const counts: Record<string, { like: number; fire: number; clap: number }> = {};
                const mine: Record<string, string[]> = {};

                reactionData.forEach((r) => {
                    const targetId = r.target_user_id;
                    const reactionType = r.reaction as "like" | "fire" | "clap";

                    if (!counts[targetId]) counts[targetId] = { like: 0, fire: 0, clap: 0 };

                    // Only count one reaction per user per type
                    const key = `${r.reactor_id}_${reactionType}`;
                    if (!counts[targetId][`_counted_${key}`]) {
                        counts[targetId][reactionType]++;
                        counts[targetId][`_counted_${key}`] = true; // temporary marker
                    }

                    if (r.reactor_id === selfUserId) {
                        if (!mine[targetId]) mine[targetId] = [];
                        if (!mine[targetId].includes(reactionType)) mine[targetId].push(reactionType);
                    }
                });

                // Remove temporary _counted_ keys
                Object.values(counts).forEach((c) => {
                    Object.keys(c).forEach((k) => {
                        if (k.startsWith("_counted_")) delete c[k];
                    });
                });

                console.log("Loaded reaction counts:", counts);
                console.log("Loaded my reactions:", mine);

                // Update state
                setReactions(counts);
                setMyReactions(mine);
            }
        }
        fetchTop();
        setTopLoading(false);
    }, [today, completed]);
    useEffect(() => {
        if (!selfUserId) return;

        const channel = supabase
            .channel("realtime-trivia-reactions")
            .on(
                "postgres_changes",
                {
                    event: "*", // listen to INSERT, UPDATE, DELETE
                    schema: "public",
                    table: "trivia_reactions",
                    filter: `attempt_date=eq.${today}`,
                },
                (payload: any) => {
                    console.log("Realtime reaction event:", payload);
                    if (payload.new?.reactor_id === selfUserId) return;
                    setReactions((prev) => {
                        const targetId = payload.new?.target_user_id || payload.old?.target_user_id;
                        const reactionType = payload.new?.reaction || payload.old?.reaction;

                        if (!targetId || !reactionType) return prev;

                        const current = prev[targetId] || { like: 0, fire: 0, clap: 0 };

                        let updated = { ...current };

                        if (payload.eventType === "INSERT") {
                            updated[reactionType as "like" | "fire" | "clap"] += 1;
                        } else if (payload.eventType === "DELETE") {
                            updated[reactionType as "like" | "fire" | "clap"] = Math.max(0, current[reactionType as "like" | "fire" | "clap"] - 1);
                        }

                        return { ...prev, [targetId]: updated };
                    });

                    // Optionally update myReactions if the current user reacted
                    if (payload.new?.reactor_id === selfUserId || payload.old?.reactor_id === selfUserId) {
                        setMyReactions((prev) => {
                            const targetId = payload.new?.target_user_id || payload.old?.target_user_id;
                            const reactionType = payload.new?.reaction || payload.old?.reaction;
                            if (!targetId || !reactionType) return prev;

                            const current = prev[targetId] || [];
                            if (payload.eventType === "INSERT") {
                                return { ...prev, [targetId]: Array.from(new Set([...current, reactionType])) };
                            } else if (payload.eventType === "DELETE") {
                                return { ...prev, [targetId]: current.filter((r) => r !== reactionType) };
                            }
                            return prev;
                        });
                    }
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [selfUserId, today]);
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
            `I just completed today's Medrae Daily MindRush! 🧠🎉\nAdvancing nursing education and student success.\nCheck out Medrae here: ${appUrl}`
        );
        const whatsappUrl = `https://wa.me/?text=${message}`;
        window.open(whatsappUrl, "_blank");
    };

    const reactionBurst = (emoji: "like" | "fire" | "clap") => {

        playSound("tap");

        const config = {
            like: { emoji: "👍", color: "#3b82f6" },
            fire: { emoji: "🔥", color: "#f97316" },
            clap: { emoji: "👏", color: "#22c55e" },
        };

        const selected = config[emoji];

        // stronger confetti burst
        confetti({
            particleCount: 28,
            spread: 90,
            startVelocity: 28,
            gravity: 1.1,
            scalar: 1,
            ticks: 90,
            origin: { y: 0.85 },
            colors: [selected.color],
        });

        // second burst for richer effect
        setTimeout(() => {
            confetti({
                particleCount: 18,
                spread: 70,
                startVelocity: 22,
                gravity: 1.2,
                scalar: 0.9,
                ticks: 80,
                origin: { y: 0.85 },
                colors: [selected.color],
            });
        }, 120);

        // number of floating emojis
        const emojiCount = 8;

        for (let i = 0; i < emojiCount; i++) {

            const bubble = document.createElement("div");
            bubble.innerText = selected.emoji;

            bubble.style.position = "fixed";
            bubble.style.bottom = "80px";
            bubble.style.left = `${Math.random() * 80 + 10}%`;
            bubble.style.fontSize = `${22 + Math.random() * 10}px`;
            bubble.style.pointerEvents = "none";
            bubble.style.zIndex = "9999";
            bubble.style.opacity = "1";
            bubble.style.transition = "all 1.4s ease-out";

            document.body.appendChild(bubble);

            requestAnimationFrame(() => {
                bubble.style.transform = `translateY(-${120 + Math.random() * 80}px) scale(${1.2 + Math.random()})`;
                bubble.style.opacity = "0";
            });

            setTimeout(() => {
                bubble.remove();
            }, 1400);
        }
    };
    const toggleReaction = async (
        targetUserId: string,
        reaction: "like" | "fire" | "clap"
    ) => {
        if (!selfUserId) return;

        const todayDate = new Date();
        const yyyy = todayDate.getFullYear();
        const mm = String(todayDate.getMonth() + 1).padStart(2, "0");
        const dd = String(todayDate.getDate()).padStart(2, "0");

        const todayString = `${yyyy}-${mm}-${dd}`;

        console.log("Toggling reaction:", {
            targetUserId,
            reaction,
            myReactions,
            todayString,
        });

        const alreadyReacted =
            myReactions[targetUserId]?.includes(reaction) || false;

        console.log("Already reacted?", alreadyReacted);

        if (alreadyReacted) {
            console.log("Removing reaction from Supabase:", {
                reactor_id: selfUserId,
                target_user_id: targetUserId,
                attempt_date: todayString,
                reaction,
            });

            const { data, error } = await supabase
                .from("trivia_reactions")
                .delete()
                .eq("reactor_id", selfUserId)
                .eq("target_user_id", targetUserId)
                .eq("reaction", reaction)
                .eq("attempt_date", todayString);

            console.log("Delete result:", { data, error });

            if (!error) {
                setMyReactions((prev) => ({
                    ...prev,
                    [targetUserId]: (prev[targetUserId] || []).filter(
                        (r) => r !== reaction
                    ),
                }));

                setReactions((prev) => ({
                    ...prev,
                    [targetUserId]: {
                        ...prev[targetUserId],
                        [reaction]: Math.max(
                            (prev[targetUserId]?.[reaction] || 1) - 1,
                            0
                        ),
                    },
                }));
            }

            return;
        }

        console.log("Adding reaction to Supabase:", {
            reactor_id: selfUserId,
            target_user_id: targetUserId,
            attempt_date: todayString,
            reaction,
        });

        const { data: insertData, error: insertError } = await supabase
            .from("trivia_reactions")
            .upsert(
                {
                    reactor_id: selfUserId,
                    target_user_id: targetUserId,
                    attempt_date: todayString,
                    reaction,
                },
                {
                    onConflict: [
                        "reactor_id",
                        "target_user_id",
                        "attempt_date",
                        "reaction",
                    ],
                }
            );

        console.log("Insert result:", { insertData, insertError });

        if (!insertError) {
            setMyReactions((prev) => ({
                ...prev,
                [targetUserId]: [
                    ...new Set([...(prev[targetUserId] || []), reaction]),
                ],
            }));

            setReactions((prev) => ({
                ...prev,
                [targetUserId]: {
                    ...prev[targetUserId],
                    [reaction]: (prev[targetUserId]?.[reaction] || 0) + 1,
                },
            }));
        }
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
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 p-4">
                                        Question {currentIndex + 1} of {questions.length}
                                    </p>

                                    {/* Question text */}
                                    <p className="font-semibold text-lg mb-6 mt-6 p-2">{questions[currentIndex]?.question_text}</p>

                                    {/* Answers */}
                                    <div className="flex flex-col gap-8 p-4">

                                        {(["A", "B", "C", "D"] as const).map((letter) => {
                                            if (!currentQuestion) return null;

                                            const text =
                                                letter === "A"
                                                    ? currentQuestion.option_a
                                                    : letter === "B"
                                                        ? currentQuestion.option_b
                                                        : letter === "C"
                                                            ? currentQuestion.option_c
                                                            : currentQuestion.option_d;

                                            const isSelected = answers[currentQuestion.id] === letter;

                                            const handleClick = () => {
                                                if (!started || completed) return;
                                                if (navigator.vibrate) navigator.vibrate(50);
                                                playSound("tap-correct", false);
                                                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: letter }));
                                                setTimeout(() => {
                                                    if (currentIndex === questions.length - 1) finishTrivia();
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


                    {/* Students attempted info - Refined Header */}
                    <div className="mt-10 mb-6 px-1">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-amber-500" />
                                    <h2 className="text-lg font-bold tracking-tight text-foreground">Daily Leaderboard</h2>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mt-1">
                                    <Eye className="w-3.5 h-3.5" />
                                    {topStudents.length === 0
                                        ? "Be the first to challenge today's trivia"
                                        : `${topStudents.length} medical students competing today`}
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Container with improved visibility */}
                        <div className="w-full overflow-x-auto flex gap-1 pb-4 pt-2 custom-scrollbar mask-fade-right">
                            {topLoading ? (
                                <div className="flex gap-4 animate-pulse">
                                    {Array.from({ length: 4 }).map((_, idx) => (
                                        <div key={idx} className="flex-shrink-0 w-40 h-64 rounded-xl bg-muted/50 border border-border" />
                                    ))}
                                </div>
                            ) : topStudents.length === 0 ? (
                                <div className="w-full py-8 text-center border-2 border-dashed border-muted rounded-xl">
                                    <p className="text-sm text-muted-foreground italic">
                                        The leaderboard is empty. Step up and lead the way!
                                    </p>
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {topStudents.map((s, idx) => (
                                        <motion.div
                                            key={s.user_id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            whileHover={{ y: -4 }}
                                            onClick={() => setSelectedUserId(s.user_id)}
                                            className={`relative flex-shrink-0 w-40 p-4 rounded-2xl border flex flex-col items-center cursor-pointer transition-all
                            ${idx === 0 ? "bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-900/10 dark:to-background border-amber-200 dark:border-amber-800 shadow-md shadow-amber-500/10"
                                                    : "bg-card border-border shadow-sm hover:shadow-md"}`}
                                        >
                                            {/* Rank Badge - Top Left */}
                                            <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border
                            ${idx === 0 ? "bg-amber-500 text-white border-amber-600"
                                                    : idx === 1 ? "bg-slate-400 text-white border-slate-500"
                                                        : idx === 2 ? "bg-orange-500 text-white border-orange-600"
                                                            : "bg-muted text-muted-foreground border-border"}`}>
                                                {idx + 1}
                                            </div>

                                            {/* Avatar Section */}
                                            <div className="relative mb-3">
                                                <img
                                                    src={s.avatar_url || "/UsersAvatar.jpg"}
                                                    alt={s.name}
                                                    className={`w-16 h-16 rounded-full object-cover border-2 p-0.5
                                    ${idx === 0 ? "border-amber-400" : "border-transparent"}`}
                                                />
                                                {idx === 0 && (
                                                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm">
                                                        <Award className="w-4 h-4 text-amber-500" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Student Info */}
                                            <div className="text-center w-full space-y-1 mb-3">
                                                <div className="font-bold text-sm text-foreground truncate w-full px-1">
                                                    {s.name || s.username}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold truncate w-full">
                                                    {s.institution || "Independent"}
                                                </div>
                                            </div>

                                            {/* Stats Pill */}
                                            <div className="flex flex-col items-center gap-1 w-full pt-2 border-t border-border/50">
                                                <div className="text-sm font-bold text-primary">
                                                    {s.score.toLocaleString()} <span className="text-[10px] font-medium opacity-70">PTS</span>
                                                </div>

                                                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                                    <Timer className="w-3 h-3" />
                                                    {s.timeUsed !== undefined ? formatTimeReadable(s.timeUsed) : "--"}
                                                </div>
                                            </div>

                                            {/* Professional Reaction Bar */}
                                            <div className="flex items-center justify-center gap-1 mt-4 w-full bg-muted/30 rounded-full py-1 border border-border/50">
                                                {[
                                                    { type: 'like', emoji: '👍' },
                                                    { type: 'fire', emoji: '🔥' },
                                                    { type: 'clap', emoji: '👏' }
                                                ].map((react) => (
                                                    <motion.button
                                                        key={react.type}
                                                        whileTap={{ scale: 1.4 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            reactionBurst(react.type);
                                                            toggleReaction(s.user_id, react.type);
                                                        }}
                                                        className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-background rounded-full transition-colors"
                                                    >
                                                        <span className="text-xs">{react.emoji}</span>
                                                        <span className="text-[10px] font-bold text-muted-foreground">
                                                            {reactions[s.user_id]?.[react.type] || 0}
                                                        </span>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
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
                    {completed && (
                        <div className="mt-2 w-full max-w-2xl mx-auto animate-fade-in overflow-hidden rounded-xl border-0 bg-white dark:bg-slate-900 shadow-xl">
                            {/* Header Section with background05.jpg */}
                            <div className="relative overflow-hidden p-8 text-center text-white">
                                <div
                                    className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                                    style={{ backgroundImage: "url('/background05.jpg')" }}
                                >
                                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px]"></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                                </div>

                                <div className="relative z-10">
                                    <div className="mb-3 flex justify-center">
                                        <div className="rounded-full bg-white/20 p-4 backdrop-blur-md border border-white/30 shadow-2xl animate-bounce-subtle">
                                            {/* UPDATED: Lucide Trophy */}
                                            <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                                        </div>
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tight uppercase drop-shadow-md">
                                        Congratulations!
                                    </h2>
                                    <p className="text-blue-50 font-medium opacity-95 text-lg mt-1 drop-shadow-sm">
                                        You've successfully completed today's trivia challenge.
                                    </p>
                                </div>
                            </div>

                            <div className="p-2 md:p-2">
                                {/* Quick Stats Grid - Preserving your gap-2 layout */}
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 text-center border border-gray-100 dark:border-gray-700">
                                        <div className="flex justify-center mb-1">
                                            <Target className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Score</p>
                                        <p className="text-2xl font-black text-gray-900 dark:text-white">
                                            {savedScore ? `${savedScore.correct_answers}/${savedScore.total_questions}` : "0/0"}
                                        </p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1 uppercase tracking-tighter">Streak +1 🔥</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 text-center border border-gray-100 dark:border-gray-700">
                                        <div className="flex justify-center mb-1">
                                            <Timer className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Time</p>
                                        <p className="text-2xl font-black text-gray-900 dark:text-white">
                                            {timeUsedToday !== null ? `${timeUsedToday}s` : "0s"}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1 uppercase tracking-tighter text-[10px]">Total Effort</p>
                                    </div>
                                </div>

                                {/* Performance Analysis Section */}
                                <div className="space-y-2 p-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-gray-400" />
                                            <h3 className="text-sm font-bold uppercase text-gray-400 tracking-widest">Performance</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="flex items-center text-[10px] font-bold"><span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span> Elite</span>
                                            <span className="flex items-center text-[10px] font-bold"><span className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></span> Avg</span>
                                            <span className="flex items-center text-[10px] font-bold"><span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span> Review</span>
                                        </div>
                                    </div>

                                    {/* Correct Answers Bar */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-semibold">
                                            <span className="text-gray-700 dark:text-gray-300">Accuracy</span>
                                            <span className="text-blue-600 font-bold">
                                                {savedScore ? Math.round((savedScore.correct_answers / savedScore.total_questions) * 100) : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${savedScore
                                                    ? savedScore.correct_answers < 8
                                                        ? "bg-gradient-to-r from-red-500 to-orange-500"
                                                        : savedScore.correct_answers <= 12
                                                            ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                                                            : "bg-gradient-to-r from-emerald-400 to-green-500"
                                                    : "bg-gray-400"
                                                    }`}
                                                style={{
                                                    width: savedScore
                                                        ? `${(savedScore.correct_answers / savedScore.total_questions) * 100}%`
                                                        : "0%",
                                                }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Time Efficiency Bar */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-semibold">
                                            <span className="text-gray-700 dark:text-gray-300">Speed Efficiency</span>
                                            <span className="text-blue-600 font-bold">
                                                {timeUsedToday !== null && (
                                                    `${Math.floor(timeUsedToday / 60)}m ${timeUsedToday % 60}s`
                                                )}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${timeUsedToday !== null
                                                    ? timeUsedToday < 150
                                                        ? "bg-gradient-to-r from-emerald-400 to-green-500"
                                                        : timeUsedToday <= 210
                                                            ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                                                            : "bg-gradient-to-r from-red-500 to-orange-500"
                                                    : "bg-gray-400"
                                                    }`}
                                                style={{
                                                    width: timeUsedToday
                                                        ? `${Math.min((timeUsedToday / 300) * 100, 100)}%`
                                                        : "0%",
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Motivational Message */}
                                <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-center italic text-blue-800 dark:text-blue-300 font-medium">
                                    {(() => {
                                        const score = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_answer ? 1 : 0), 0);
                                        if (score === questions.length) return "🔥 Incredible! You aced it today! Absolute perfection.";
                                        if (score >= Math.ceil(questions.length * 0.8)) return "💪 Great job! You're getting stronger every day!";
                                        if (score >= Math.ceil(questions.length * 0.5)) return "🙂 Nice work! Keep practicing and you'll improve!";
                                        return "👍 Good effort! Remember, every answer helps you learn more!";
                                    })()}
                                </div>

                                {/* "THE AD" / PROMOTIONAL SECTION */}
                                <div className="mt-8 relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-2xl group transition-all hover:scale-[1.01]">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap className="w-4 h-4 text-blue-400 fill-blue-400" />
                                            <span className="inline-block px-3 py-1 rounded-full bg-blue-600 text-[10px] font-bold uppercase tracking-widest">
                                                Medrae Pro Advantage
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 text-white">Master Your Exams Faster</h3>
                                        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                                            This daily trivia is just a taste. Unlock <strong>thousands of organized questions</strong> and in-depth explanations to guarantee your success.
                                        </p>

                                        <button
                                            onClick={() => navigate("/Medrae-quizzes")}
                                            className="w-full py-4 bg-white text-slate-900 font-black rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-3 shadow-lg"
                                        >
                                            EXPLORE MEDRAE QUIZZES
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </button>

                                        <p className="mt-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Challenge refreshes in 24 hours
                                        </p>
                                    </div>

                                    {/* Decorative background glow for the Ad */}
                                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-600/30 rounded-full blur-[80px]"></div>
                                </div>

                                {/* Slogan Footer */}
                                <div className="mt-6 mb-4 text-center">
                                    <p className="text-gray-400 dark:text-gray-500 text-xs font-bold tracking-widest">
                                        MEDRAE: <span className="text-gray-900 dark:text-gray-200">Advancing nursing education and student success.</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

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
                            <span>Invite a Friend</span>
                        </Button>

                    </div>
                    <UserProfileModal
                        userId={selectedUserId}
                        onClose={() => setSelectedUserId(null)}
                    />
                </CardContent >
            </Card >

        </div >
    );
};
