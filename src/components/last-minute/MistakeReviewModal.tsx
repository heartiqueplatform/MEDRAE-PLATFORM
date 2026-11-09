"use client";

import { useEffect, useState } from "react";
import {
    Loader2, AlertCircle, GraduationCap, X as XIcon, BookOpen, Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { CenteredModal } from "@/components/ui/CenteredModal";

type Q = {
    id: string;
    question_order: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    topic: string | null;
    difficulty: string | null;
    correct_answer: string;
    explanation: string | null;
};

type Props = {
    open: boolean;
    paperId: string | null;
    onClose: () => void;
};

export default function MistakeReviewModal({ open, paperId, onClose }: Props) {
    const [questions, setQuestions] = useState<Q[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !paperId) return;
        let live = true;
        setLoading(true);
        setErr(null);
        setQuestions([]);
        setAnswers({});

        (async () => {
            // 1. Latest result → answers snapshot
            const { data: result, error: resultErr } = await supabase.rpc(
                "lm_get_my_results",
                { p_paper_id: paperId }
            );

            if (!live) return;
            if (resultErr) {
                setErr(resultErr.message);
                setLoading(false);
                return;
            }
            if (!result) {
                setErr("No saved result yet for this paper.");
                setLoading(false);
                return;
            }

            const answersJson: Record<string, string> =
                ((result as any).answers_json ?? {}) as Record<string, string>;
            setAnswers(answersJson);

            // 2. All questions — via RPC (bypasses RLS, checks access)
            const { data: qs, error: qErr } = await supabase.rpc(
                "lm_get_review_questions",
                { p_paper_id: paperId }
            );

            if (!live) return;
            if (qErr) {
                setErr(qErr.message);
                setLoading(false);
                return;
            }

            // 3. Keep only wrong ones (missing answers count as wrong)
            const wrong = ((qs ?? []) as Q[]).filter((q) => {
                const picked = answersJson[q.id];
                const correct = String(q.correct_answer ?? "").toUpperCase();
                if (!picked) return true;
                return String(picked).toUpperCase() !== correct;
            });

            setQuestions(wrong);
            setLoading(false);
        })();

        return () => { live = false; };
    }, [open, paperId]);

    const wrongCount = questions.length;

    return (
        <CenteredModal
            open={open}
            onClose={onClose}
            title="Review mistakes"
            subtitle={
                loading
                    ? "Loading…"
                    : wrongCount === 0
                        ? "Nothing to review"
                        : `${wrongCount} question${wrongCount === 1 ? "" : "s"} you missed`
            }
            maxWidthClass="max-w-2xl"
            maxHeight="92dvh"
        >
            <div className="px-4 sm:px-5 pb-6 pt-1">
                {loading ? (
                    <div className="py-16 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        <p className="mt-3 text-sm text-muted-foreground">
                            Gathering your mistakes…
                        </p>
                    </div>
                ) : err ? (
                    <div className="py-12 text-center">
                        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
                        <p className="text-sm text-rose-600 dark:text-rose-400">{err}</p>
                        <button
                            onClick={onClose}
                            className="mt-4 h-10 px-5 rounded-xl bg-muted text-sm font-semibold"
                        >
                            Close
                        </button>
                    </div>
                ) : wrongCount === 0 ? (
                    <div className="py-12 text-center">
                        <Sparkles className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm font-semibold">You didn't miss any questions!</p>
                        <p className="text-[12px] text-muted-foreground mt-1">
                            Great job on this paper.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {questions.map((q, i) => (
                            <MistakeCard
                                key={q.id}
                                q={q}
                                index={i + 1}
                                picked={answers[q.id]}
                            />
                        ))}
                    </div>
                )}
            </div>
        </CenteredModal>
    );
}

function MistakeCard({
    q,
    index,
    picked,
}: {
    q: Q;
    index: number;
    picked?: string;
}) {
    return (
        <div className="rounded-2xl bg-white dark:bg-muted/40 p-4">
            <div className="flex items-center gap-2 mb-2 text-[10px] md:text-[11px] font-bold uppercase tracking-wider flex-wrap">
                <span className="text-rose-600 dark:text-rose-400">Mistake {index}</span>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span className="text-muted-foreground">Q{q.question_order}</span>
                {q.topic && (
                    <>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className="text-muted-foreground">{q.topic}</span>
                    </>
                )}
                {q.difficulty && (
                    <>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className="text-muted-foreground">{q.difficulty}</span>
                    </>
                )}
            </div>

            <p className="font-bold leading-relaxed text-sm md:text-base mb-3">
                {q.question_text}
            </p>

            <div className="space-y-1.5 md:space-y-2">
                {(["A", "B", "C", "D"] as const).map((letter) => {
                    const text = q[`option_${letter.toLowerCase() as "a" | "b" | "c" | "d"}`];
                    const isCorrect = String(q.correct_answer).toUpperCase() === letter;
                    const isPicked = picked && String(picked).toUpperCase() === letter;
                    return (
                        <div
                            key={letter}
                            className={cn(
                                "flex justify-between items-center gap-2 min-h-[44px] py-2 px-3 rounded-lg",
                                isCorrect
                                    ? "bg-emerald-500/10 dark:bg-emerald-500/15"
                                    : isPicked
                                        ? "bg-rose-500/10 dark:bg-rose-500/15"
                                        : "bg-white dark:bg-slate-800",
                                !isCorrect && !isPicked ? "opacity-60" : "opacity-100"
                            )}
                        >
                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                <span
                                    className={cn(
                                        "shrink-0 text-xs font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-md",
                                        isCorrect
                                            ? "bg-emerald-500 text-white"
                                            : isPicked
                                                ? "bg-rose-500 text-white"
                                                : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                                    )}
                                >
                                    {letter}
                                </span>
                                <span className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-200 break-words">
                                    {text}
                                </span>
                            </div>
                            <div className="flex items-center shrink-0">
                                {isCorrect && (
                                    <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-tight font-bold">
                                        Correct
                                        <GraduationCap className="w-4 h-4 md:w-5 md:h-5" />
                                    </span>
                                )}
                                {isPicked && !isCorrect && (
                                    <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] text-rose-600 dark:text-rose-400 uppercase tracking-tight font-bold">
                                        Your pick
                                        <XIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {q.explanation && (
                <div className="mt-3 rounded-xl bg-primary/8 dark:bg-primary/10 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                        <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                            Explanation
                        </p>
                    </div>
                    <p className="text-[12px] md:text-[13px] text-foreground/90 leading-relaxed whitespace-pre-line">
                        {q.explanation}
                    </p>
                </div>
            )}
        </div>
    );
}