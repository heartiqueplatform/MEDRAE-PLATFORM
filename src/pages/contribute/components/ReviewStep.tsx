// src/pages/contribute/components/ReviewStep.tsx

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, CheckCircle2, Loader2, Send, AlertTriangle } from "lucide-react";
import { playSound } from "@/lib/soundManager";
import type { DraftQuiz } from "../types";

interface Props {
    draft: DraftQuiz;
    submitting: boolean;
    onSubmit: () => Promise<void>;
}

export function ReviewStep({ draft, submitting, onSubmit }: Props) {
    const [previewQuestion, setPreviewQuestion] = useState<number | null>(null);

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2.5">
                <h2 className="text-[13px] font-bold text-slate-900 dark:text-white">
                    Summary
                </h2>
                <Row label="Title" value={draft.title || "—"} />
                <Row label="Course" value={draft.course || "—"} />
                <Row label="Type" value={draft.quiz_type.toUpperCase()} />
                <Row label="Unit" value={draft.unit || "—"} />
                {draft.unit_code && <Row label="Code" value={draft.unit_code} />}
                {draft.topic && <Row label="Topic" value={draft.topic} />}
                <Row
                    label="Questions"
                    value={`${draft.questions.length} ${draft.questions.length === 1 ? "question" : "questions"}`}
                    accent={draft.questions.length >= 50}
                />
                <Row label="Access" value={draft.is_free ? "Free" : "Premium"} />
            </div>

            {/* Milestone callout */}
            {draft.questions.length >= 50 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50
                               dark:from-amber-500/10 dark:to-orange-500/10
                               border border-amber-200 dark:border-amber-500/20 p-3 flex items-start gap-2"
                >
                    <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[11.5px] font-bold text-amber-900 dark:text-amber-200">
                            Milestone bonus unlocked
                        </p>
                        <p className="text-[10.5px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                            Your quiz will pay you <strong>+100 coins</strong> the moment it
                            hits 50 questions, plus recurring earnings from every student interaction.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Preview questions */}
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-[13px] font-bold text-slate-900 dark:text-white">
                        Questions preview
                    </h2>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {draft.questions.length} total
                    </span>
                </div>
                <div className="space-y-1 max-h-80 overflow-y-auto no-scrollbar">
                    {draft.questions.map((q, idx) => {
                        const isPreviewing = previewQuestion === idx;
                        return (
                            <div
                                key={q.tempId}
                                className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-2.5"
                            >
                                <button
                                    onClick={() => {
                                        playSound("ui-tap");
                                        setPreviewQuestion(isPreviewing ? null : idx);
                                    }}
                                    className="w-full flex items-start gap-2 text-left"
                                >
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums shrink-0">
                                        {idx + 1}.
                                    </span>
                                    <p className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200 flex-1 min-w-0 line-clamp-2">
                                        {q.question_text}
                                    </p>
                                    <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                </button>
                                {isPreviewing && (
                                    <div className="mt-2 space-y-1">
                                        {(["A", "B", "C", "D"] as const).map((letter) => {
                                            const key = `option_${letter.toLowerCase()}` as keyof typeof q;
                                            return (
                                                <div key={letter} className="flex items-start gap-1.5 text-[10.5px]">
                                                    <span className={`shrink-0 font-bold w-4 h-4 rounded flex items-center justify-center ${q.correct_answer === letter
                                                        ? "bg-emerald-600 text-white"
                                                        : "bg-slate-200 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                                                        }`}>
                                                        {letter}
                                                    </span>
                                                    <span className="text-slate-700 dark:text-slate-300">
                                                        {String(q[key])}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {q.explanation && (
                                            <p className="text-[10.5px] italic text-slate-500 dark:text-slate-400 mt-1 pt-1 border-t border-slate-200 dark:border-white/[0.04]">
                                                {q.explanation}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Submit */}
            <button
                onClick={() => {
                    playSound("ui-tap");
                    onSubmit();
                }}
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-blue-600 text-white
                           text-sm font-bold
                           flex items-center justify-center gap-2
                           active:scale-[0.97] transition-transform
                           disabled:opacity-50"
                style={{ touchAction: "manipulation" }}
            >
                {submitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Publishing…
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4" />
                        Publish quiz
                    </>
                )}
            </button>
            <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 leading-snug">
                By publishing, you confirm these questions are your original work
                and free of clinical errors.
            </p>
        </div>
    );
}

function Row({
    label,
    value,
    accent = false,
}: {
    label: string;
    value: string;
    accent?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                {label}
            </span>
            <span className={`text-[11.5px] font-bold text-right break-words
                              ${accent ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                {value}
            </span>
        </div>
    );
}