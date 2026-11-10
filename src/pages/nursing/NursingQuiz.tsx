import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    Brain,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    HelpCircle,
    Loader2,
    SkipForward,
    Sparkles,
    Stethoscope,
    Target,
    Trophy,
    Volume2,
    VolumeX,
    XCircle,
} from "lucide-react";
import { getTopicQuestions } from "@/lib/nursingQueries";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "@/lib/soundManager";
import { useSession } from "@supabase/auth-helpers-react";
import { academicProgress } from "@/lib/academicProgress";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

function renderMarkdown(text: string | null | undefined) {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return (
                <strong key={index} className="font-bold">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
            return (
                <em key={index} className="italic">
                    {part.slice(1, -1)}
                </em>
            );
        }
        return part;
    });
}

/* ------------------------------------------------------------------ */
/*  Skeletons                                                          */
/* ------------------------------------------------------------------ */

function QuizSkeleton() {
    return (
        <div className="w-full max-w-[880px] mx-auto px-4 py-5 space-y-4">
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                <div className="h-4 w-32 bg-slate-200 dark:bg-white/[0.06] rounded animate-pulse mb-3" />
                <div className="h-6 w-3/4 bg-slate-200 dark:bg-white/[0.06] rounded animate-pulse mb-2" />
                <div className="h-6 w-1/2 bg-slate-200 dark:bg-white/[0.06] rounded animate-pulse" />
            </div>
            <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="rounded-2xl bg-white dark:bg-[#161b22] p-4 h-16 animate-pulse"
                    />
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function NursingQuiz() {
    const { topicId } = useParams();
    const navigate = useNavigate();
    const session = useSession();
    const user = session?.user;
    const userId = user?.id;

    const [questions, setQuestions] = useState<any[]>([]);
    const [topicName, setTopicName] = useState<string>("");
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [skipped, setSkipped] = useState<Set<string>>(new Set());
    const [score, setScore] = useState(0);
    const [quizFinished, setQuizFinished] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(
        localStorage.getItem("quizMuted") === "true" ? true : false
    );
    const [progressMap, setProgressMap] = useState<Record<string, any>>({});
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleMute = () => {
        setIsMuted((prev) => {
            localStorage.setItem("quizMuted", (!prev).toString());
            return !prev;
        });
    };

    useEffect(() => {
        if (topicId) loadQuizData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topicId]);

    const loadQuizData = async () => {
        setLoading(true);
        try {
            const [questionsData, topicData] = await Promise.all([
                getTopicQuestions(topicId),
                supabase
                    .from("academic_topics")
                    .select("title")
                    .eq("id", topicId)
                    .single(),
            ]);

            setQuestions(questionsData || []);
            if (topicData.data) setTopicName(topicData.data.title);

            if (userId && questionsData?.length > 0) {
                const answeredQuestions: Record<string, string> = {};
                const progressMapData: Record<string, any> = {};
                let totalScore = 0;

                const progressPromises = questionsData.map((q: any) =>
                    academicProgress.getOrCreateProgress(userId, q.id)
                );
                const progressResults = await Promise.all(progressPromises);

                progressResults.forEach((progressData, index) => {
                    const q = questionsData[index];
                    if (progressData) {
                        progressMapData[q.id] = progressData;
                        if (progressData.answers && progressData.answers[q.id]) {
                            answeredQuestions[q.id] = progressData.answers[q.id];
                            if (progressData.correct_count) {
                                totalScore += progressData.correct_count;
                            }
                        }
                    }
                });

                setProgressMap(progressMapData);
                if (Object.keys(answeredQuestions).length > 0) {
                    setAnswers(answeredQuestions);
                    setScore(totalScore);
                }
            }
        } catch (error) {
            console.error("Error loading quiz data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (
        index: number,
        optionText: string,
        isCorrect: boolean
    ) => {
        if (showAnswer) return;
        setSelected(index);
        setShowAnswer(true);

        if (!isMuted) playSound(isCorrect ? "tap-correct" : "tap-wrong");
        vibrate(isCorrect ? 40 : [80, 40, 80]);

        const question = questions[currentIdx];
        const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);

        setAnswers((prev) => ({ ...prev, [question.id]: optionText }));
        if (isCorrect) setScore((s) => s + 1);

        if (userId) {
            try {
                let questionProgress = progressMap[question.id];
                if (!questionProgress) {
                    questionProgress = await academicProgress.getOrCreateProgress(
                        userId,
                        question.id
                    );
                    if (questionProgress) {
                        setProgressMap((prev) => ({
                            ...prev,
                            [question.id]: questionProgress,
                        }));
                    }
                }

                if (questionProgress) {
                    const newScore = isCorrect
                        ? (questionProgress.current_score || 0) + 1
                        : questionProgress.current_score || 0;
                    const newAttempts = (questionProgress.attempts_count || 0) + 1;

                    const attempt = {
                        user_id: userId,
                        question_id: question.id,
                        progress_id: questionProgress.id,
                        selected_option: optionText,
                        is_correct: isCorrect,
                        is_skipped: false,
                        attempted_at: new Date().toISOString(),
                        time_taken: timeTaken,
                        confidence_level: isCorrect ? "high" : "low",
                        mistake_reason: null,
                    };

                    await academicProgress.saveAttempt(attempt);

                    const updatedProgress = await academicProgress.updateProgress(
                        userId,
                        question.id,
                        {
                            attempts_count: newAttempts,
                            correct_count: isCorrect
                                ? (questionProgress.correct_count || 0) + 1
                                : questionProgress.correct_count || 0,
                            incorrect_count: !isCorrect
                                ? (questionProgress.incorrect_count || 0) + 1
                                : questionProgress.incorrect_count || 0,
                            current_score: newScore,
                            accuracy: (newScore / newAttempts) * 100,
                            answers: { ...answers, [question.id]: optionText },
                            total_time_spent:
                                (questionProgress.total_time_spent || 0) + timeTaken,
                            last_attempted_at: new Date().toISOString(),
                        }
                    );

                    if (updatedProgress) {
                        setProgressMap((prev) => ({
                            ...prev,
                            [question.id]: updatedProgress,
                        }));
                    }
                }
            } catch (error) {
                console.error("Error saving progress:", error);
            }
        }
    };

    const handleSkip = async () => {
        if (!isMuted) playSound("tap-wrong");
        vibrate([40, 30, 40]);

        const question = questions[currentIdx];
        setSkipped((prev) => new Set(prev).add(question.id));
        setSelected(null);
        setShowAnswer(false);

        if (userId) {
            try {
                let questionProgress = progressMap[question.id];
                if (!questionProgress) {
                    questionProgress = await academicProgress.getOrCreateProgress(
                        userId,
                        question.id
                    );
                    if (questionProgress) {
                        setProgressMap((prev) => ({
                            ...prev,
                            [question.id]: questionProgress,
                        }));
                    }
                }

                if (questionProgress) {
                    const attempt = {
                        user_id: userId,
                        question_id: question.id,
                        progress_id: questionProgress.id,
                        selected_option: null,
                        is_correct: false,
                        is_skipped: true,
                        attempted_at: new Date().toISOString(),
                        time_taken: 0,
                        confidence_level: null,
                        mistake_reason: null,
                    };
                    await academicProgress.saveAttempt(attempt);
                    await academicProgress.updateProgress(userId, question.id, {
                        skipped_count: (questionProgress.skipped_count || 0) + 1,
                    });
                }
            } catch (error) {
                console.error("Error saving skip:", error);
            }
        }

        const nextIdx = currentIdx + 1;
        if (nextIdx >= questions.length) {
            const allDone = questions.every(
                (q) => answers[q.id] || skipped.has(q.id)
            );
            if (allDone) {
                setQuizFinished(true);
                if (!isMuted) playSound("notification");
            }
        } else {
            setCurrentIdx(nextIdx);
            setSelected(null);
            setShowAnswer(false);
            setQuestionStartTime(Date.now());
        }
    };

    const prevQuestion = () => {
        if (currentIdx > 0) {
            setCurrentIdx(currentIdx - 1);
            setSelected(null);
            setShowAnswer(false);
            setQuestionStartTime(Date.now());
        }
    };

    const nextQuestion = () => {
        const nextIdx = currentIdx + 1;
        if (nextIdx >= questions.length) {
            const allDone = questions.every(
                (q) => answers[q.id] || skipped.has(q.id)
            );
            if (allDone) {
                setQuizFinished(true);
                if (!isMuted) playSound("notification");
            }
            return;
        }
        setCurrentIdx(nextIdx);
        setSelected(null);
        setShowAnswer(false);
        setQuestionStartTime(Date.now());
    };

    const finishQuiz = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            if (userId) {
                for (const q of questions) {
                    const progressData = progressMap[q.id];
                    if (progressData) {
                        await academicProgress.updateProgress(userId, q.id, {
                            is_completed: true,
                            completed_at: new Date().toISOString(),
                        });
                    }
                }
            }
            setQuizFinished(true);
            if (!isMuted) playSound("notification");
        } catch (error) {
            console.error("Error finishing quiz:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const retryQuiz = () => {
        if (!isMuted) playSound("notification");
        setCurrentIdx(0);
        setScore(0);
        setSelected(null);
        setShowAnswer(false);
        setSkipped(new Set());
        setQuizFinished(false);
        setAnswers({});
        setQuestionStartTime(Date.now());
        loadQuizData();
    };

    const handleBack = useCallback(() => {
        playSound("ui-tap");
        vibrate(15);
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/nursing", { replace: true });
        }
    }, [navigate]);

    const isLastQuestion = currentIdx === questions.length - 1;
    const allQuestionsDone =
        questions.length > 0 &&
        questions.every((q) => answers[q.id] || skipped.has(q.id));

    /* ── Auth guard ── */
    if (!user) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-50 dark:bg-[#0d1117]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    /* ── Loading ── */
    if (loading) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white">
                <header className="shrink-0 h-14 border-b border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-[#0d1117] flex items-center px-2">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                </header>
                <main className="flex-1 overflow-y-auto no-scrollbar">
                    <QuizSkeleton />
                </main>
            </div>
        );
    }

    /* ── No questions ── */
    if (questions.length === 0) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white">
                <header className="shrink-0 h-14 border-b border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-[#0d1117] flex items-center px-2">
                    <button
                        onClick={handleBack}
                        aria-label="Back"
                        className="h-10 w-10 rounded-full flex items-center justify-center active:bg-slate-100 dark:active:bg-white/5"
                        style={{ touchAction: "manipulation" }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <h1 className="text-base font-bold ml-1">Quiz</h1>
                </header>
                <main className="flex-1 overflow-y-auto no-scrollbar">
                    <div className="max-w-[880px] mx-auto px-4 py-8 text-center">
                        <HelpCircle className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                        <p className="font-semibold text-sm">No questions available</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            This topic doesn't have any questions yet.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    const q = questions[currentIdx];
    const progressPercent = Math.round(
        ((currentIdx + 1) / questions.length) * 100
    );
    const isFirstQuestion = currentIdx === 0;
    const answeredCount = Object.keys(answers).length + skipped.size;
    const correctCount = score;
    const isSkipped = skipped.has(q.id);
    const isAnswered = answers[q.id] !== undefined;
    const options = q?.options || [];

    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* ── HEADER ── */}
            <header className="shrink-0 bg-white dark:bg-[#0d1117] border-b border-slate-200/70 dark:border-white/[0.06] z-30">
                <div className="flex items-center gap-2 px-2 h-14">
                    <button
                        onClick={handleBack}
                        aria-label="Back"
                        className="h-10 w-10 rounded-full flex items-center justify-center
                                   active:bg-slate-100 dark:active:bg-white/5 transition-colors"
                        style={{ touchAction: "manipulation" }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">
                            {topicName || "Practice quiz"}
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Question {currentIdx + 1} of {questions.length}
                        </p>
                    </div>

                    <button
                        onClick={toggleMute}
                        aria-label={isMuted ? "Unmute" : "Mute"}
                        className="h-9 w-9 rounded-full flex items-center justify-center
                                   active:bg-slate-100 dark:active:bg-white/5 transition-colors shrink-0"
                        style={{ touchAction: "manipulation" }}
                    >
                        {isMuted ? (
                            <VolumeX className="h-4 w-4 text-slate-500" />
                        ) : (
                            <Volume2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                    </button>
                </div>

                {/* Live progress bar */}
                <div className="h-[3px] w-full bg-slate-200/60 dark:bg-white/[0.06]">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </header>

            {/* ── SCROLLABLE BODY ── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                {!quizFinished ? (
                    <div className="w-full max-w-[880px] mx-auto pb-24">
                        {/* Stats strip */}
                        <section className="px-4 pt-4 pb-3">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <Target className="mx-auto mb-1 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                        {correctCount}/{questions.length}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Score
                                    </p>
                                </div>
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <ClipboardCheck className="mx-auto mb-1 h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                                    <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                        {answeredCount}/{questions.length}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Done
                                    </p>
                                </div>
                                <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                    <SkipForward className="mx-auto mb-1 h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                        {skipped.size}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Skipped
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Question card */}
                        <section className="px-4">
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                                {/* Question stem */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                                        <HelpCircle className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Question {currentIdx + 1}
                                        </p>
                                        <h2 className="mt-0.5 text-base font-bold leading-snug text-slate-900 dark:text-white">
                                            {q?.stem}
                                        </h2>
                                    </div>
                                </div>

                                {/* Tags */}
                                {q?.tags && (q.tags as string[]).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {(q.tags as string[]).map((tag: string) => (
                                            <span
                                                key={tag}
                                                className="rounded-full bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5
                                                           text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Clinical scenario */}
                                {q?.clinical_scenario && (
                                    <div className="rounded-xl bg-cyan-50 dark:bg-cyan-400/10 p-3 mb-3">
                                        <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                                            <Stethoscope className="h-3.5 w-3.5" />
                                            Clinical scenario
                                        </div>
                                        <p className="text-sm leading-6 text-cyan-900 dark:text-cyan-100">
                                            {q.clinical_scenario}
                                        </p>
                                    </div>
                                )}

                                {/* Options */}
                                <div className="space-y-2">
                                    {options.map((opt: any, index: number) => {
                                        const isSelected = selected === index;
                                        const isCorrect = opt.is_correct === true;
                                        const isDisabled = isAnswered || isSkipped;

                                        let optionClass =
                                            "bg-slate-50 dark:bg-white/[0.04] active:bg-slate-100 dark:active:bg-white/[0.08]";
                                        let Icon = ChevronRight;
                                        let iconColor = "text-slate-300 dark:text-slate-600";
                                        let badgeClass =
                                            "bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300";

                                        if (isDisabled) {
                                            if (isCorrect && isAnswered) {
                                                optionClass =
                                                    "bg-emerald-50 dark:bg-emerald-400/10 ring-1 ring-emerald-500/30";
                                                Icon = CheckCircle2;
                                                iconColor = "text-emerald-600 dark:text-emerald-400";
                                                badgeClass =
                                                    "bg-emerald-600 text-white";
                                            } else if (isSelected && !isCorrect && isAnswered) {
                                                optionClass =
                                                    "bg-rose-50 dark:bg-rose-400/10 ring-1 ring-rose-500/30";
                                                Icon = XCircle;
                                                iconColor = "text-rose-600 dark:text-rose-400";
                                                badgeClass = "bg-rose-600 text-white";
                                            } else {
                                                optionClass =
                                                    "bg-slate-50 dark:bg-white/[0.02] opacity-60";
                                            }
                                        }

                                        return (
                                            <button
                                                key={index}
                                                onClick={() =>
                                                    !isDisabled &&
                                                    handleSelect(index, opt.text, isCorrect)
                                                }
                                                disabled={isDisabled}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl
                                                            text-left transition-colors ${optionClass}`}
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                <span
                                                    className={`flex h-8 w-8 shrink-0 items-center justify-center
                                                                rounded-full font-bold text-sm ${badgeClass}`}
                                                >
                                                    {String.fromCharCode(65 + index)}
                                                </span>
                                                <span className="flex-1 text-sm font-medium leading-snug text-slate-900 dark:text-white">
                                                    {opt.text}
                                                </span>
                                                <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        {/* Explanation */}
                        {isAnswered && (
                            <section className="px-4 mt-3">
                                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        {options.find((o: any) => o.is_correct)?.text ===
                                            answers[q.id] ? (
                                            <>
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                                    Correct answer
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                                <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                                                    Review this one
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                            Explanation
                                        </p>
                                        <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                                            {renderMarkdown(q.explanation)}
                                        </p>
                                        {q.simplified_explanation && (
                                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300 italic">
                                                💡 {renderMarkdown(q.simplified_explanation)}
                                            </p>
                                        )}
                                        {q.mnemonic && (
                                            <div className="mt-3 rounded-xl bg-violet-50 dark:bg-violet-400/10 p-3">
                                                <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                                                    <Brain className="h-3.5 w-3.5" />
                                                    Memory hook
                                                </div>
                                                <p className="text-sm leading-6 text-violet-900 dark:text-violet-100">
                                                    {renderMarkdown(q.mnemonic)}
                                                </p>
                                            </div>
                                        )}
                                        {q.clinical_pearl && (
                                            <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-400/10 p-3">
                                                <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    Clinical pearl
                                                </div>
                                                <p className="text-sm leading-6 text-amber-900 dark:text-amber-100">
                                                    {renderMarkdown(q.clinical_pearl)}
                                                </p>
                                            </div>
                                        )}
                                        {q.refs && (q.refs as any[]).length > 0 && (
                                            <div className="mt-2 rounded-xl bg-blue-50 dark:bg-blue-400/10 p-3">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1">
                                                    References
                                                </p>
                                                {(q.refs as any[]).map((ref: any, i: number) => (
                                                    <p
                                                        key={i}
                                                        className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed"
                                                    >
                                                        {ref.title}{" "}
                                                        {ref.url && (
                                                            <a
                                                                href={ref.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="underline"
                                                            >
                                                                ↗
                                                            </a>
                                                        )}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Skipped notice */}
                        {isSkipped && (
                            <section className="px-4 mt-3">
                                <div className="rounded-2xl bg-amber-50 dark:bg-amber-400/10 p-3 text-center">
                                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                        ⏭️ Skipped
                                    </p>
                                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                                        You can come back to this question if you retry the quiz.
                                    </p>
                                </div>
                            </section>
                        )}

                        {/* Bottom action bar — sticky, native */}
                        <div
                            className="fixed bottom-0 inset-x-0 z-40
                                       bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur
                                       border-t border-slate-200/70 dark:border-white/[0.06]
                                       px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
                        >
                            <div className="max-w-[880px] mx-auto flex items-center gap-2">
                                <button
                                    onClick={prevQuestion}
                                    disabled={isFirstQuestion}
                                    className="inline-flex items-center gap-1 h-10 px-3 rounded-xl
                                               bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200
                                               text-sm font-semibold
                                               active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Prev
                                </button>

                                {!isAnswered && !isSkipped && (
                                    <button
                                        onClick={handleSkip}
                                        className="inline-flex items-center gap-1 h-10 px-3 rounded-xl
                                                   bg-amber-50 dark:bg-amber-400/10
                                                   text-amber-700 dark:text-amber-300
                                                   text-sm font-semibold
                                                   active:scale-[0.97] transition"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <SkipForward className="h-4 w-4" />
                                        Skip
                                    </button>
                                )}

                                <div className="flex-1" />

                                {isLastQuestion ? (
                                    <button
                                        onClick={finishQuiz}
                                        disabled={!allQuestionsDone || isSubmitting}
                                        className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-xl
                                                    text-sm font-bold text-white
                                                    active:scale-[0.97] transition
                                                    ${allQuestionsDone && !isSubmitting
                                                ? "bg-emerald-600"
                                                : "bg-slate-300 dark:bg-white/[0.1] text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                            }`}
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trophy className="h-4 w-4" />
                                        )}
                                        Finish
                                    </button>
                                ) : (
                                    <button
                                        onClick={nextQuestion}
                                        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl
                                                   bg-emerald-600 text-white text-sm font-bold
                                                   active:scale-[0.97] transition"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── Finish screen ── */
                    <div className="w-full max-w-[880px] mx-auto px-4 py-6">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                                <Trophy className="h-8 w-8" />
                            </div>

                            <div className="inline-flex items-center gap-1.5 rounded-full
                                            bg-emerald-100 dark:bg-emerald-400/10
                                            px-3 py-1 mb-3">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                    Quiz complete
                                </span>
                            </div>

                            <h2 className="text-xl font-bold mb-4">You finished strong</h2>

                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-400/10 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                        Correct
                                    </p>
                                    <p className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                        {correctCount}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                                        Wrong
                                    </p>
                                    <p className="text-xl font-bold tabular-nums text-rose-700 dark:text-rose-300">
                                        {answeredCount - correctCount}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-amber-50 dark:bg-amber-400/10 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                        Skipped
                                    </p>
                                    <p className="text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
                                        {skipped.size}
                                    </p>
                                </div>
                            </div>

                            <p className="text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mb-1">
                                {score}/{questions.length}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug mb-5">
                                {score === questions.length
                                    ? "🌟 Perfect score. Outstanding work."
                                    : score >= questions.length * 0.7
                                        ? "💪 Great job. Keep reinforcing."
                                        : "📚 Keep practicing. Confidence grows with reps."}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <button
                                    onClick={retryQuiz}
                                    className="inline-flex items-center justify-center gap-1.5
                                               h-11 px-4 rounded-xl bg-emerald-600 text-white
                                               text-sm font-bold active:scale-[0.97] transition"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Retry quiz
                                </button>
                                <button
                                    onClick={handleBack}
                                    className="inline-flex items-center justify-center gap-1.5
                                               h-11 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06]
                                               text-slate-700 dark:text-slate-200 text-sm font-bold
                                               active:scale-[0.97] transition"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Back to topics
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}