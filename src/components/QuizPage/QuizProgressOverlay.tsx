"use client";

import { useCallback, useMemo } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helpers — same as TutorsList                                  */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (type === "success") vibrate([20, 30, 20]);
    else if (type === "warning") vibrate(60);
    else vibrate(15);
};

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type QuizProgressOverlayProps = {
    progressOpen: boolean;
    setProgressOpen: (v: boolean) => void;
    answers: Record<string, any>;
    questions: any[];
    circleRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    setCurrentQuestionIndex: (index: number) => void;
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function QuizProgressOverlay({
    progressOpen,
    setProgressOpen,
    answers,
    questions,
    circleRefs,
    setCurrentQuestionIndex,
}: QuizProgressOverlayProps) {
    const { answeredCount, progressPercentage, correctCount } = useMemo(() => {
        const answered = Object.keys(answers).length;
        const correct = questions.filter(
            (q) => answers[q.id] !== undefined && answers[q.id] === q.correct_answer
        ).length;
        const percentage = questions.length
            ? Math.round((answered / questions.length) * 100)
            : 0;
        return {
            answeredCount: answered,
            progressPercentage: percentage,
            correctCount: correct,
        };
    }, [answers, questions]);

    const handleClose = useCallback(() => {
        tap();
        setProgressOpen(false);
    }, [setProgressOpen]);

    const handleQuestionClick = useCallback(
        (index: number) => {
            tap();
            setCurrentQuestionIndex(index);
            requestAnimationFrame(() => {
                const el = circleRefs.current[index];
                if (el) {
                    el.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                        inline: "center",
                    });
                }
                setTimeout(() => setProgressOpen(false), 120);
            });
        },
        [setCurrentQuestionIndex, setProgressOpen, circleRefs]
    );

    if (!progressOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
                style={{ touchAction: "manipulation" }}
            />

            {/* Modal shell — flex-col with pinned header/footer, scrollable body */}
            <div
                className="relative w-full sm:max-w-md
                           bg-white dark:bg-[#161b22]
                           rounded-t-2xl sm:rounded-2xl
                           shadow-sm
                           flex flex-col
                           max-h-[92dvh] sm:max-h-[85vh]
                           overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="quiz-progress-title"
            >
                {/* ── Header (pinned) ───────────────────────────── */}
                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                   border-b border-slate-200/70 dark:border-white/[0.06]">
                    <button
                        onClick={handleClose}
                        className="h-10 w-10 rounded-full flex items-center justify-center
                                   text-slate-700 dark:text-slate-200
                                   active:bg-slate-100 dark:active:bg-white/5"
                        style={{ touchAction: "manipulation" }}
                        aria-label="Close progress"
                    >
                        <X className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1
                            id="quiz-progress-title"
                            className="text-base font-bold leading-tight truncate"
                        >
                            Quiz progress
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate tabular-nums">
                            {answeredCount} of {questions.length} answered
                        </p>
                    </div>
                </header>

                {/* ── Stats (pinned) ────────────────────────────── */}
                <div className="shrink-0 px-4 pt-3 pb-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-blue-50 dark:bg-blue-400/10 p-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                            Progress
                        </p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                            {progressPercentage}%
                        </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-400/10 p-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                            Answered
                        </p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                            {answeredCount}
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                /{questions.length}
                            </span>
                        </p>
                    </div>
                    <div className="rounded-xl bg-violet-50 dark:bg-violet-400/10 p-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                            Correct
                        </p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                            {correctCount}
                        </p>
                    </div>
                </div>

                {/* ── Scrollable grid body ──────────────────────── */}
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pb-4">
                    <div className="flex items-center justify-between px-1 mb-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Questions
                        </h4>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                            {questions.length} total
                        </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                        {questions.map((q, index) => {
                            const userAnswer = answers[q.id];
                            const isAnswered = userAnswer !== undefined;
                            const isCorrect =
                                isAnswered && userAnswer === q.correct_answer;

                            let stateClass = "";
                            if (!isAnswered) {
                                stateClass =
                                    "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400";
                            } else if (isCorrect) {
                                stateClass =
                                    "bg-emerald-600 dark:bg-emerald-400/10 text-white dark:text-emerald-400";
                            } else {
                                stateClass =
                                    "bg-rose-600 dark:bg-rose-400/10 text-white dark:text-rose-400";
                            }

                            return (
                                <button
                                    key={q.id}
                                    ref={(el) => {
                                        circleRefs.current[index] = el;
                                    }}
                                    onClick={() => handleQuestionClick(index)}
                                    className={`relative aspect-square flex items-center justify-center
                                                rounded-xl text-[13px] font-bold tabular-nums
                                                active:scale-[0.97] transition-transform
                                                ${stateClass}`}
                                    style={{ touchAction: "manipulation" }}
                                    aria-label={`Question ${index + 1}`}
                                >
                                    <span className="relative z-10">{index + 1}</span>
                                    {isAnswered && (
                                        <span className="absolute -top-1 -right-1">
                                            {isCorrect ? (
                                                <CheckCircle
                                                    className="h-3 w-3 text-emerald-500"
                                                    strokeWidth={3}
                                                />
                                            ) : (
                                                <XCircle
                                                    className="h-3 w-3 text-rose-500"
                                                    strokeWidth={3}
                                                />
                                            )}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend lives at the end of scroll content */}
                    <div className="flex items-center justify-center gap-4 mt-4 pt-3
                                    border-t border-slate-100 dark:border-white/[0.04]">
                        <LegendDot tone="emerald" label="Correct" />
                        <LegendDot tone="rose" label="Incorrect" />
                        <LegendDot tone="neutral" label="Unanswered" />
                    </div>
                </main>

                {/* ── Footer (pinned) ───────────────────────────── */}
                <footer className="shrink-0 px-4 py-3 flex gap-2
                                   border-t border-slate-200/70 dark:border-white/[0.06]
                                   bg-white dark:bg-[#161b22]">
                    <button
                        onClick={handleClose}
                        className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]
                                   text-slate-700 dark:text-slate-200
                                   text-sm font-bold
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Close
                    </button>
                    <button
                        onClick={handleClose}
                        className="flex-[2] h-10 rounded-xl bg-blue-600 text-white
                                   text-sm font-bold
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Continue quiz
                    </button>
                </footer>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Legend dot                                                        */
/* ------------------------------------------------------------------ */

type Tone = "emerald" | "rose" | "neutral";

function LegendDot({ tone, label }: { tone: Tone; label: string }) {
    const dot: Record<Tone, string> = {
        emerald: "bg-emerald-500",
        rose: "bg-rose-500",
        neutral: "bg-slate-300 dark:bg-white/[0.15]",
    };
    return (
        <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${dot[tone]}`} aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
            </span>
        </div>
    );
}