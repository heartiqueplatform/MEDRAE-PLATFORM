import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Brain,
    CheckCircle2,
    ChevronLeft,
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
// Add this after your imports, before the QuestionSkeleton function
function renderMarkdown(text) {
    if (!text) return null;

    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={index} className="italic">{part.slice(1, -1)}</em>;
        }
        return part;
    });
}
// Question skeleton
function QuestionSkeleton() {
    return (
        <div className="md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-5 md:shadow-xl backdrop-blur dark:bg-muted/30 sm:p-6 border-b border-slate-100 dark:border-slate-800 md:border-b-0 animate-pulse">
            {/* Question stem - centered icon + left-aligned text */}
            <div className="mb-4 md:mb-5">
                {/* Centered icon */}
                <div className="flex justify-center mb-2 md:mb-3">
                    <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-xl md:rounded-2xl bg-slate-200 dark:bg-slate-700" />
                </div>

                {/* Left-aligned question stem */}
                <div>
                    <div className="h-2.5 md:h-3 w-20 md:w-24 bg-slate-200 dark:bg-slate-700 rounded mb-1.5 md:mb-2" />
                    <div className="space-y-1.5 md:space-y-2">
                        <div className="h-5 md:h-6 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-5 md:h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                    <div className="mt-1.5 md:mt-2 flex gap-1">
                        <div className="h-3.5 md:h-4 w-10 md:w-12 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        <div className="h-3.5 md:h-4 w-14 md:w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Explanation box */}
            <div className="mb-4 md:mb-5 rounded-xl md:rounded-2xl border-0 bg-cyan-50/80 p-3 md:p-4 shadow-sm dark:bg-cyan-400/10">
                <div className="mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2">
                    <div className="h-3.5 w-3.5 md:h-4 md:w-4 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3.5 md:h-4 w-28 md:w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                    <div className="h-3.5 md:h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3.5 md:h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
            </div>

            {/* Options */}
            <div className="grid gap-2 md:gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex w-full items-start justify-between gap-3 md:gap-4 rounded-xl md:rounded-2xl bg-slate-50 p-3 md:p-4 shadow-sm dark:bg-slate-800/50">
                        <div className="flex min-w-0 gap-2 md:gap-3">
                            <div className="h-7 w-7 md:h-8 md:w-8 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
                            <div className="flex-1 pt-0.5 md:pt-1">
                                <div className="h-3.5 md:h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                            </div>
                        </div>
                        <div className="h-4 w-4 md:h-5 md:w-5 shrink-0 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                ))}
            </div>

            {/* Footer buttons */}
            <div className="mt-4 md:mt-5 flex items-center gap-2 md:gap-3">
                <div className="h-9 md:h-10 w-16 md:w-20 bg-slate-200 dark:bg-slate-700 rounded-lg md:rounded-xl" />
                <div className="h-9 md:h-10 w-16 md:w-20 bg-slate-200 dark:bg-slate-700 rounded-lg md:rounded-xl" />
                <div className="flex-1" />
                <div className="h-9 md:h-10 w-20 md:w-24 bg-slate-200 dark:bg-slate-700 rounded-lg md:rounded-xl" />
            </div>
        </div>
    );
}

// Stats skeleton
function QuizStatsSkeleton() {
    return (
        <div className="grid grid-cols-3 gap-1.5 md:gap-2 md:rounded-2xl md:border-0 bg-white/70 p-2 md:p-3 md:shadow-sm backdrop-blur dark:bg-muted/30">
            {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-slate-800/70">
                    <div className="mx-auto mb-0.5 md:mb-1 h-3.5 w-3.5 md:h-4 md:w-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-2.5 md:h-3 w-10 md:w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-0.5 md:mb-1" />
                    <div className="h-3.5 md:h-4 w-6 md:w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
            ))}
        </div>
    );
}

// Progress bar skeleton
function ProgressSkeleton() {
    return (
        <div className="mt-4 md:mt-5">
            <div className="mb-1.5 md:mb-2 flex items-center justify-between">
                <div className="h-3.5 md:h-4 w-28 md:w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-3.5 md:h-4 w-10 md:w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
            <div className="h-1.5 md:h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 w-0" />
            </div>
        </div>
    );
}

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
        setIsMuted(prev => {
            localStorage.setItem("quizMuted", (!prev).toString());
            return !prev;
        });
    };

    useEffect(() => {
        if (topicId) {
            loadQuizData();
        }
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
                    .single()
            ]);

            setQuestions(questionsData || []);
            if (topicData.data) setTopicName(topicData.data.title);

            if (userId && questionsData?.length > 0) {
                const answeredQuestions: Record<string, string> = {};
                const progressMapData: Record<string, any> = {};
                let totalScore = 0;

                const progressPromises = questionsData.map(q =>
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
            console.error('Error loading quiz data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (index: number, optionText: string, isCorrect: boolean) => {
        if (showAnswer) return;
        setSelected(index);
        setShowAnswer(true);

        if (!isMuted) {
            playSound(isCorrect ? "tap-correct" : "tap-wrong");
        }

        if (navigator.vibrate) {
            navigator.vibrate(isCorrect ? 50 : [100, 50, 100]);
        }

        const question = questions[currentIdx];
        const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);

        setAnswers(prev => ({ ...prev, [question.id]: optionText }));
        if (isCorrect) {
            setScore((s) => s + 1);
        }

        if (userId) {
            try {
                let questionProgress = progressMap[question.id];
                if (!questionProgress) {
                    questionProgress = await academicProgress.getOrCreateProgress(userId, question.id);
                    if (questionProgress) {
                        setProgressMap(prev => ({ ...prev, [question.id]: questionProgress }));
                    }
                }

                if (questionProgress) {
                    const newScore = isCorrect ? (questionProgress.current_score || 0) + 1 : (questionProgress.current_score || 0);
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
                        confidence_level: isCorrect ? 'high' : 'low',
                        mistake_reason: null,
                    };

                    await academicProgress.saveAttempt(attempt);

                    const updatedProgress = await academicProgress.updateProgress(userId, question.id, {
                        attempts_count: newAttempts,
                        correct_count: isCorrect ? (questionProgress.correct_count || 0) + 1 : (questionProgress.correct_count || 0),
                        incorrect_count: !isCorrect ? (questionProgress.incorrect_count || 0) + 1 : (questionProgress.incorrect_count || 0),
                        current_score: newScore,
                        accuracy: (newScore / newAttempts) * 100,
                        answers: { ...answers, [question.id]: optionText },
                        total_time_spent: (questionProgress.total_time_spent || 0) + timeTaken,
                        last_attempted_at: new Date().toISOString(),
                    });

                    if (updatedProgress) {
                        setProgressMap(prev => ({ ...prev, [question.id]: updatedProgress }));
                    }
                }
            } catch (error) {
                console.error('Error saving progress:', error);
            }
        }
    };

    const handleSkip = async () => {
        if (!isMuted) {
            playSound("tap-wrong");
        }

        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }

        const question = questions[currentIdx];
        setSkipped(prev => new Set(prev).add(question.id));
        setSelected(null);
        setShowAnswer(false);

        if (userId) {
            try {
                let questionProgress = progressMap[question.id];
                if (!questionProgress) {
                    questionProgress = await academicProgress.getOrCreateProgress(userId, question.id);
                    if (questionProgress) {
                        setProgressMap(prev => ({ ...prev, [question.id]: questionProgress }));
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
                console.error('Error saving skip:', error);
            }
        }

        const nextIdx = currentIdx + 1;
        if (nextIdx >= questions.length) {
            const allDone = questions.every(q => answers[q.id] || skipped.has(q.id));
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
            const allDone = questions.every(q => answers[q.id] || skipped.has(q.id));
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
            console.error('Error finishing quiz:', error);
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

    const isLastQuestion = currentIdx === questions.length - 1;
    const allQuestionsDone = questions.length > 0 &&
        questions.every(q => answers[q.id] || skipped.has(q.id));

    if (!user) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent text-slate-950 dark:text-white">
                <section className="mx-auto flex w-full max-w-none flex-col gap-4 md:gap-6 px-0 md:px-4 py-4 md:py-6 lg:px-8">
                    <div className="px-3 md:px-0">
                        <button
                            onClick={() => navigate(-1)}
                            className="inline-flex w-fit items-center gap-1.5 md:gap-2 rounded-full border border-slate-200 bg-white/70 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-emerald-300 hover:bg-white hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-emerald-500/60 dark:hover:bg-slate-900 dark:hover:text-emerald-300"
                        >
                            <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            Back
                        </button>
                    </div>
                    <div className="relative overflow-hidden md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-6 md:shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-muted/30 sm:p-8 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                        <div className="absolute right-0 top-0 h-24 md:h-32 w-24 md:w-32 rounded-bl-full bg-emerald-100/80 dark:bg-emerald-400/10" />
                        <div className="absolute bottom-0 left-0 h-20 md:h-24 w-20 md:w-24 rounded-tr-full bg-cyan-100/80 dark:bg-cyan-400/10" />
                        <div className="relative">
                            <div className="mb-3 md:mb-4 flex items-center justify-between">
                                <div className="h-8 md:h-10 w-24 md:w-28 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                                <div className="h-6 md:h-8 w-28 md:w-32 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                            </div>
                            <div className="flex flex-col gap-4 md:gap-5 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <div className="h-7 md:h-9 w-40 md:w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2 md:mb-3" />
                                    <div className="space-y-1.5 md:space-y-2">
                                        <div className="h-3.5 md:h-4 w-56 md:w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                        <div className="h-3.5 md:h-4 w-48 md:w-56 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                    </div>
                                </div>
                                <QuizStatsSkeleton />
                            </div>
                            <ProgressSkeleton />
                        </div>
                    </div>
                    <QuestionSkeleton />
                </section>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-transparent text-slate-950 dark:text-white">
                <section className="mx-auto flex w-full max-w-none flex-col gap-4 md:gap-6 px-3 md:px-4 py-4 md:py-6 lg:px-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex w-fit items-center gap-1.5 md:gap-2 rounded-full border border-slate-200 bg-white/70 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-emerald-300 hover:bg-white hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-emerald-500/60 dark:hover:bg-slate-900 dark:hover:text-emerald-300"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        Back
                    </button>
                    <div className="md:rounded-2xl md:border-0 bg-white/70 p-6 md:p-8 text-center md:shadow-sm backdrop-blur dark:bg-muted/30">
                        <HelpCircle className="mx-auto mb-2 md:mb-3 h-7 w-7 md:h-8 md:w-8 text-slate-400" />
                        <p className="font-semibold text-sm md:text-base">No questions available</p>
                        <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                            This topic doesn't have any questions yet.
                        </p>
                    </div>
                </section>
            </div>
        );
    }

    const q = questions[currentIdx];
    const progressPercent = Math.round(((currentIdx + 1) / questions.length) * 100);
    const isFirstQuestion = currentIdx === 0;
    const answeredCount = Object.keys(answers).length + skipped.size;
    const correctCount = score;
    const isSkipped = skipped.has(q.id);
    const isAnswered = answers[q.id] !== undefined;
    const options = q?.options || [];

    return (
        <div className="min-h-screen w-full bg-transparent text-slate-950 dark:text-white">
            <section className="mx-auto flex w-full max-w-none flex-col gap-4 md:gap-6 px-0 md:px-4 py-4 md:py-6 lg:px-8">

                {/* Header Card - full width on mobile */}
                <div className="relative overflow-hidden md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-6 md:shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-muted/30 sm:p-8 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                    <div className="absolute right-0 top-0 h-24 md:h-32 w-24 md:w-32 rounded-bl-full bg-emerald-100/80 dark:bg-emerald-400/10" />
                    <div className="absolute bottom-0 left-0 h-20 md:h-24 w-20 md:w-24 rounded-tr-full bg-cyan-100/80 dark:bg-cyan-400/10" />

                    <div className="relative">
                        <div className="mb-3 md:mb-4 flex items-center justify-between">
                            <button
                                onClick={() => navigate(-1)}
                                className="inline-flex items-center gap-1.5 md:gap-2 rounded-full border border-slate-200 bg-white/70 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-emerald-300 hover:bg-white hover:text-emerald-700 dark:border-slate-800 dark:bg-muted/30 dark:text-slate-200 dark:hover:border-emerald-500/60 dark:hover:bg-slate-900 dark:hover:text-emerald-300"
                            >
                                <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                Back
                            </button>
                            <div className="flex items-center gap-1.5 md:gap-2">
                                <button
                                    onClick={toggleMute}
                                    className="inline-flex items-center gap-1.5 md:gap-2 rounded-full border border-slate-200 bg-white/70 px-2.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-emerald-300 hover:bg-white hover:text-emerald-700 dark:border-slate-800 dark:bg-muted/30 dark:text-slate-200 dark:hover:border-emerald-500/60 dark:hover:bg-slate-900 dark:hover:text-emerald-300"
                                >
                                    {isMuted ? <VolumeX className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Volume2 className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                                </button>
                                <div className="inline-flex items-center gap-1 md:gap-2 rounded-full bg-emerald-100 px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                                    <Stethoscope className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    {topicName || "Quiz"}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 md:gap-5 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">
                                    Practice question
                                </h1>
                                <p className="mt-2 md:mt-3 max-w-xl text-xs md:text-sm lg:text-base leading-6 text-slate-600 dark:text-slate-300">
                                    Answer carefully, review the rationale, and build exam-ready confidence.
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 md:gap-2 md:rounded-2xl md:border-0 bg-white/70 p-2 md:p-3 md:shadow-sm backdrop-blur dark:bg-muted/30">
                                <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-slate-800/70">
                                    <Target className="mx-auto mb-0.5 md:mb-1 h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600 dark:text-emerald-300" />
                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400">Score</p>
                                    <p className="text-xs font-black">{correctCount}/{questions.length}</p>
                                </div>
                                <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-slate-800/70">
                                    <ClipboardCheck className="mx-auto mb-0.5 md:mb-1 h-3.5 w-3.5 md:h-4 md:w-4 text-cyan-600 dark:text-cyan-300" />
                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400">Done</p>
                                    <p className="text-xs font-black">{answeredCount}/{questions.length}</p>
                                </div>
                                <div className="rounded-lg md:rounded-xl bg-slate-50 p-1.5 md:p-2 text-center dark:bg-slate-800/70">
                                    <SkipForward className="mx-auto mb-0.5 md:mb-1 h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600 dark:text-amber-300" />
                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400">Skipped</p>
                                    <p className="text-xs font-black">{skipped.size}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 md:mt-5">
                            <div className="mb-1.5 md:mb-2 flex items-center justify-between text-xs md:text-sm font-semibold">
                                <span className="text-slate-500 dark:text-slate-400">
                                    Question {currentIdx + 1} of {questions.length}
                                </span>
                                <span className="text-emerald-700 dark:text-emerald-300">{progressPercent}%</span>
                            </div>
                            <div className="h-1.5 md:h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quiz Content - full width on mobile */}
                {!quizFinished ? (
                    <div className="md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-5 md:shadow-xl backdrop-blur dark:bg-muted/30 sm:p-6 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                        {/* Question stem */}
                        <div className="mb-4 md:mb-5">
                            {/* Centered icon only */}
                            <div className="flex justify-center mb-2 md:mb-3">
                                <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-600/20">
                                    <HelpCircle className="h-5 w-5 md:h-6 md:w-6" />
                                </div>
                            </div>

                            {/* Left-aligned question stem */}
                            <div>
                                <p className="text-[10px] md:text-xs font-bold uppercase text-slate-400">Question stem</p>
                                <h2 className="mt-0.5 md:mt-1 text-base md:text-lg lg:text-xl font-black leading-7 text-slate-950 dark:text-white text-left">
                                    {q?.stem}
                                </h2>
                            </div>

                            {/* Left-aligned tags */}
                            {q?.tags && (
                                <div className="mt-1.5 md:mt-2 flex flex-wrap gap-1">
                                    {(q.tags as string[]).map((tag: string) => (
                                        <span key={tag} className="rounded-full bg-slate-100 px-1.5 md:px-2 py-0.5 text-[9px] md:text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Clinical scenario */}
                        {q?.clinical_scenario && (
                            <div className="mb-4 md:mb-5 rounded-xl md:rounded-2xl border-0 bg-cyan-50/80 p-3 md:p-4 text-xs md:text-sm leading-6 text-cyan-950 shadow-sm dark:bg-cyan-400/10 dark:text-cyan-100">
                                <div className="mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2 font-bold text-cyan-700 dark:text-cyan-300">
                                    <Stethoscope className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    Clinical scenario
                                </div>
                                <p>{q.clinical_scenario}</p>
                            </div>
                        )}

                        {/* Options */}
                        <div className="grid gap-2 md:gap-3">
                            {options.map((opt: any, index: number) => {
                                const isSelected = selected === index;
                                const isCorrect = opt.is_correct === true;
                                const isAnswered = answers[q.id] !== undefined;
                                const isSkipped = skipped.has(q.id);
                                const isDisabled = isAnswered || isSkipped;

                                let optionClass =
                                    "border-0 bg-slate-50 text-slate-800 hover:bg-emerald-50/60 dark:bg-slate-800/50 dark:text-slate-100 dark:hover:bg-emerald-400/10";
                                let Icon = ChevronRight;

                                if (isAnswered || isSkipped) {
                                    if (isCorrect && isAnswered) {
                                        optionClass =
                                            "border-0 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-100 dark:ring-emerald-400/30";
                                        Icon = CheckCircle2;
                                    } else if (isSelected && !isCorrect && isAnswered) {
                                        optionClass =
                                            "border-0 bg-rose-50 text-rose-900 ring-2 ring-rose-300 dark:bg-rose-400/10 dark:text-rose-100 dark:ring-rose-400/30";
                                        Icon = XCircle;
                                    } else {
                                        optionClass =
                                            "border-0 bg-slate-50 text-slate-400 opacity-60 dark:bg-slate-800/30 dark:text-slate-500";
                                    }
                                }

                                return (
                                    <button
                                        key={index}
                                        onClick={() => !isDisabled && handleSelect(index, opt.text, isCorrect)}
                                        disabled={isDisabled}
                                        className={`group flex w-full items-start justify-between gap-3 md:gap-4 rounded-xl md:rounded-2xl p-3 md:p-4 text-left shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-default dark:focus:ring-emerald-500/20 ${optionClass}`}
                                    >
                                        <div className="flex min-w-0 gap-2 md:gap-3">
                                            <span className={`flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full text-xs md:text-sm font-black transition ${isAnswered && isCorrect ? "bg-emerald-600 text-white" : isAnswered && isSelected && !isCorrect ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-600 group-hover:bg-emerald-600 group-hover:text-white dark:bg-slate-700 dark:text-slate-300"}`}>
                                                {String.fromCharCode(65 + index)}
                                            </span>
                                            <span className="pt-0.5 md:pt-1 text-xs md:text-sm lg:text-base font-semibold leading-6">
                                                {opt.text}
                                            </span>
                                        </div>
                                        <Icon className={`mt-0.5 md:mt-1 h-4 w-4 md:h-5 md:w-5 shrink-0 ${isAnswered && isCorrect ? "text-emerald-600" : isAnswered && isSelected && !isCorrect ? "text-rose-600" : "text-slate-300"}`} />
                                    </button>
                                );
                            })}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="mt-4 md:mt-5 flex items-center gap-2 md:gap-3">
                            <button
                                onClick={prevQuestion}
                                disabled={isFirstQuestion}
                                className="inline-flex items-center gap-1 rounded-lg md:rounded-xl border-0 bg-white px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 disabled:opacity-40 dark:bg-muted/30 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                Prev
                            </button>

                            {!answers[q.id] && !skipped.has(q.id) && (
                                <button
                                    onClick={handleSkip}
                                    className="inline-flex items-center gap-1 rounded-lg md:rounded-xl border-0 bg-amber-50 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20"
                                >
                                    <SkipForward className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    Skip
                                </button>
                            )}

                            <div className="flex-1" />

                            {isLastQuestion ? (
                                <button
                                    onClick={finishQuiz}
                                    disabled={!allQuestionsDone || isSubmitting}
                                    className={`inline-flex items-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-black text-white shadow-lg transition ${allQuestionsDone && !isSubmitting
                                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                                        : "bg-slate-400 cursor-not-allowed opacity-50"
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                                    ) : (
                                        <Trophy className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    )}
                                    Finish
                                </button>
                            ) : (
                                <button
                                    onClick={nextQuestion}
                                    className="inline-flex items-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl bg-emerald-600 px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                                >
                                    Next
                                    <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                </button>
                            )}
                        </div>

                        {/* Explanation */}
                        {isAnswered && (
                            <div className="mt-4 md:mt-5 rounded-xl md:rounded-2xl border-0 bg-slate-50/80 p-3 md:p-4 shadow-sm dark:bg-muted/30">
                                <div className="mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
                                    {options.find((o: any) => o.is_correct)?.text === answers[q.id] ? (
                                        <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-emerald-600 dark:text-emerald-300" />
                                    ) : (
                                        <XCircle className="h-4 w-4 md:h-5 md:w-5 text-rose-600 dark:text-rose-300" />
                                    )}
                                    <p className={`text-sm md:text-base font-black ${options.find((o: any) => o.is_correct)?.text === answers[q.id] ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                                        {options.find((o: any) => o.is_correct)?.text === answers[q.id] ? "✅ Correct answer" : "❌ Review this one"}
                                    </p>
                                </div>
                                <div className="rounded-lg md:rounded-xl bg-white/70 p-3 md:p-4 dark:bg-slate-900/70">
                                    <p className="mb-0.5 md:mb-1 text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400">Explanation</p>
                                    <p className="text-xs md:text-sm leading-6 text-slate-700 dark:text-slate-200">{renderMarkdown(q.explanation)}</p>
                                    {q.simplified_explanation && (
                                        <p className="mt-1.5 md:mt-2 text-xs md:text-sm leading-6 text-slate-600 dark:text-slate-300 italic">
                                            💡 {renderMarkdown(q.simplified_explanation)}
                                        </p>
                                    )}
                                    {q.mnemonic && (
                                        <div className="mt-3 md:mt-4 rounded-lg md:rounded-xl border-0 bg-violet-50 p-2.5 md:p-3 text-xs md:text-sm leading-6 text-violet-800 dark:bg-violet-400/10 dark:text-violet-200">
                                            <div className="mb-0.5 md:mb-1 flex items-center gap-1.5 md:gap-2 font-bold">
                                                <Brain className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                Memory hook
                                            </div>
                                            <p>{renderMarkdown(q.mnemonic)}</p>
                                        </div>
                                    )}
                                    {q.clinical_pearl && (
                                        <div className="mt-2 md:mt-3 rounded-lg md:rounded-xl border-0 bg-amber-50 p-2.5 md:p-3 text-xs md:text-sm leading-6 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
                                            <div className="mb-0.5 md:mb-1 flex items-center gap-1.5 md:gap-2 font-bold">
                                                <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                Clinical pearl
                                            </div>
                                            <p>{renderMarkdown(q.clinical_pearl)}</p>
                                        </div>
                                    )}
                                    {q.refs && (q.refs as any[]).length > 0 && (
                                        <div className="mt-2 md:mt-3 rounded-lg md:rounded-xl border-0 bg-blue-50 p-2.5 md:p-3 text-xs md:text-sm dark:bg-blue-400/10">
                                            <p className="mb-0.5 md:mb-1 font-bold text-blue-700 dark:text-blue-300">References</p>
                                            {(q.refs as any[]).map((ref: any, i: number) => (
                                                <p key={i} className="text-[10px] md:text-xs text-blue-600 dark:text-blue-400">
                                                    {ref.title} {ref.url && <a href={ref.url} target="_blank" className="underline">↗</a>}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {isSkipped && (
                            <div className="mt-4 md:mt-5 rounded-xl md:rounded-2xl border-0 bg-amber-50/80 p-3 md:p-4 text-center shadow-sm dark:bg-amber-400/10">
                                <p className="text-xs md:text-sm font-semibold text-amber-700 dark:text-amber-300">
                                    ⏭️ This question was skipped
                                </p>
                                <p className="text-[10px] md:text-xs text-amber-600 dark:text-amber-400 mt-0.5 md:mt-1">
                                    You can come back to it if you retry the quiz
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Finish Screen - full width on mobile */
                    <div className="md:rounded-2xl md:border-0 bg-white/70 p-6 md:p-8 text-center md:shadow-xl backdrop-blur dark:bg-muted/30">
                        <div className="mx-auto mb-3 md:mb-4 flex h-14 h-16 md:h-16 w-14 md:w-16 items-center justify-center rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-600/20">
                            <Trophy className="h-7 w-7 md:h-8 md:w-8" />
                        </div>
                        <div className="mb-2 md:mb-3 inline-flex items-center gap-1.5 md:gap-2 rounded-full bg-emerald-100 px-2.5 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                            <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            Quiz complete
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight">You finished strong!</h2>
                        <div className="mt-3 md:mt-4 grid grid-cols-3 gap-3 md:gap-4 max-w-xs mx-auto">
                            <div className="rounded-lg md:rounded-xl bg-slate-50 p-2.5 md:p-3 dark:bg-slate-800/70">
                                <p className="text-[10px] md:text-xs text-slate-500">Correct</p>
                                <p className="text-lg md:text-xl font-black text-emerald-600">{correctCount}</p>
                            </div>
                            <div className="rounded-lg md:rounded-xl bg-slate-50 p-2.5 md:p-3 dark:bg-slate-800/70">
                                <p className="text-[10px] md:text-xs text-slate-500">Wrong</p>
                                <p className="text-lg md:text-xl font-black text-rose-600">{answeredCount - correctCount}</p>
                            </div>
                            <div className="rounded-lg md:rounded-xl bg-slate-50 p-2.5 md:p-3 dark:bg-slate-800/70">
                                <p className="text-[10px] md:text-xs text-slate-500">Skipped</p>
                                <p className="text-lg md:text-xl font-black text-amber-600">{skipped.size}</p>
                            </div>
                        </div>
                        <p className="mt-3 md:mt-4 text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-300">
                            {score}/{questions.length}
                        </p>
                        <p className="mt-1.5 md:mt-2 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {score === questions.length
                                ? "🌟 Perfect score! Outstanding work!"
                                : score >= questions.length * 0.7
                                    ? "💪 Great job! Keep reinforcing your knowledge."
                                    : "📚 Keep practicing the weak spots and your exam confidence will keep climbing."
                            }
                        </p>
                        <div className="mt-5 md:mt-6 flex flex-col gap-2 md:gap-3 sm:flex-row sm:justify-center">
                            <button
                                onClick={retryQuiz}
                                className="inline-flex items-center justify-center gap-1.5 md:gap-2 rounded-xl md:rounded-2xl bg-emerald-600 px-4 md:px-5 py-2.5 md:py-3 text-xs md:text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                            >
                                <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                Retry quiz
                            </button>
                            <button
                                onClick={() => navigate(-1)}
                                className="inline-flex items-center justify-center gap-1.5 md:gap-2 rounded-xl md:rounded-2xl border-0 bg-white/70 px-4 md:px-5 py-2.5 md:py-3 text-xs md:text-sm font-bold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white dark:bg-muted/30 dark:text-slate-200 dark:hover:bg-slate-900"
                            >
                                <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                Back to topics
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}