"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle, Trophy, History, Sparkles } from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
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

type QuizResultsPanelProps = {
    quizFinished: boolean;
    finalScore: number;
    questions: any[];
    attempts: any[];
    playSound: (name: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function QuizResultsPanel({
    quizFinished,
    finalScore,
    questions,
    attempts,
}: QuizResultsPanelProps) {
    const [showResultModal, setShowResultModal] = useState(false);

    const { total, percentage, verdict, verdictTone } = useMemo(() => {
        const t = questions.length || 0;
        const pct = t ? Math.round((finalScore / t) * 100) : 0;
        if (pct === 100) {
            return {
                total: t,
                percentage: pct,
                verdict: "Perfect score",
                verdictTone: "emerald" as const,
            };
        }
        if (pct > 50) {
            return {
                total: t,
                percentage: pct,
                verdict: "Above average",
                verdictTone: "emerald" as const,
            };
        }
        return {
            total: t,
            percentage: pct,
            verdict: "Keep going",
            verdictTone: "amber" as const,
        };
    }, [finalScore, questions.length]);

    const openResult = useCallback(() => {
        tap("success");
        setShowResultModal(true);
    }, []);

    const closeResult = useCallback(() => {
        tap();
        setShowResultModal(false);
    }, []);

    if (!quizFinished) return null;

    const toneBox =
        verdictTone === "emerald"
            ? "bg-emerald-50 dark:bg-emerald-400/10"
            : "bg-amber-50 dark:bg-amber-400/10";
    const toneIcon =
        verdictTone === "emerald"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-amber-600 dark:text-amber-400";

    return (
        <>
            {/* ============ FINAL RESULT ============ */}
            <div className="mt-6 rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                    <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center text-white ${verdictTone === "emerald"
                            ? "bg-emerald-600"
                            : "bg-amber-500"
                            }`}
                    >
                        <CheckCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Completed
                        </p>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Your result
                        </h3>
                    </div>
                </div>

                {/* Score card */}
                <div className={`mx-3 mb-3 rounded-xl p-4 ${toneBox}`}>
                    <div className="flex items-baseline justify-between">
                        <p
                            className={`text-[10px] font-bold uppercase tracking-wider ${toneIcon}`}
                        >
                            Score
                        </p>
                        <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${toneIcon}`}
                        >
                            {verdict}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                            {finalScore}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                            / {total}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
                        {percentage}% correct
                    </p>
                </div>

                <p className="px-4 pb-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Well done. Keep practicing to strengthen your understanding
                    and improve your score.
                </p>

                <div className="px-4 pb-4">
                    <button
                        onClick={openResult}
                        className="w-full h-10 rounded-xl bg-indigo-600 text-white
                                   text-sm font-bold
                                   active:scale-[0.97] transition-transform
                                   flex items-center justify-center gap-1.5"
                        style={{ touchAction: "manipulation" }}
                    >
                        <Sparkles className="h-4 w-4" />
                        View your result
                    </button>
                </div>
            </div>

            {/* ============ PAST ATTEMPTS ============ */}
            {attempts.length > 0 && (
                <div className="mt-3 rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-600 dark:text-slate-300">
                                <History className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    History
                                </p>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Past attempts
                                </h3>
                            </div>
                        </div>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                            {attempts.length} total
                        </span>
                    </div>

                    <div className="px-3 pb-3 space-y-2">
                        {attempts.map((attempt) => (
                            <div
                                key={attempt.id}
                                className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Attempt
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-900 dark:text-white tabular-nums">
                                        {attempt.score} pts
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {new Date(attempt.submitted_at).toLocaleString(
                                        "en-US",
                                        {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        }
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ============ RESULT MODAL — CenteredModal ============ */}
            <CenteredModal
                open={showResultModal}
                onClose={closeResult}
                title="Result summary"
                maxWidthClass="max-w-md"
                maxHeight="85vh"
            >
                <div className="px-4 pb-3 space-y-3">
                    <div className={`rounded-xl p-4 ${toneBox}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <Trophy className={`h-4 w-4 ${toneIcon}`} />
                            <p
                                className={`text-[10px] font-bold uppercase tracking-wider ${toneIcon}`}
                            >
                                {verdict}
                            </p>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                                {finalScore}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                                / {total}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
                            {percentage}% correct
                        </p>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {percentage === 100
                            ? "Perfect score. You've shown outstanding focus and knowledge. Keep this energy going — you're clearly on the path to mastery."
                            : percentage > 50
                                ? "Well done. That's a strong performance above average. Each quiz is another step forward — keep sharpening your mind."
                                : "Don't be discouraged. Every great achiever starts somewhere, and each question makes you stronger. Stay consistent and keep practicing."}
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Remember: progress is about growth, not perfection.
                        Showing up and trying already puts you ahead.
                    </p>
                </div>

                <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-slate-100 dark:border-white/[0.06]">
                    <button
                        onClick={closeResult}
                        className="w-full h-10 rounded-xl bg-indigo-600 text-white
                                   text-sm font-bold
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Done
                    </button>
                </div>
            </CenteredModal>
        </>
    );
}