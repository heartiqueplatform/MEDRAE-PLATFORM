// src/pages/contribute/components/QuestionsStep.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, Trash2, ChevronDown, ChevronUp, Check, AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { playSound } from "@/lib/soundManager";
import type { DraftQuestion, DraftQuiz } from "../types";

interface Props {
    draft: DraftQuiz;
    onChange: (questions: DraftQuestion[]) => void;
}

function makeBlankQuestion(n: number): DraftQuestion {
    return {
        tempId: `tmp_${Date.now()}_${n}`,
        question_text: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "A",
        explanation: "",
        additional: "",
        difficulty: "medium",
        course_tag: "General",
    };
}

export function QuestionsStep({ draft, onChange }: Props) {
    const [expandedId, setExpandedId] = useState<string | null>(
        draft.questions[0]?.tempId ?? null
    );

    const updateQuestion = (idx: number, patch: Partial<DraftQuestion>) => {
        const next = draft.questions.map((q, i) =>
            i === idx ? { ...q, ...patch } : q
        );
        onChange(next);
    };

    const addQuestion = () => {
        playSound("ui-tap");
        const newQ = makeBlankQuestion(draft.questions.length + 1);
        onChange([...draft.questions, newQ]);
        setExpandedId(newQ.tempId);
    };

    const removeQuestion = (idx: number) => {
        if (draft.questions.length === 1) return;
        playSound("warning" as any);
        onChange(draft.questions.filter((_, i) => i !== idx));
    };

    const isQuestionComplete = (q: DraftQuestion) =>
        q.question_text.trim().length > 0 &&
        q.option_a.trim().length > 0 &&
        q.option_b.trim().length > 0 &&
        q.option_c.trim().length > 0 &&
        q.option_d.trim().length > 0 &&
        q.explanation.trim().length > 0;

    const completedCount = draft.questions.filter(isQuestionComplete).length;

    return (
        <div className="space-y-3">
            {/* Progress banner */}
            <div className="rounded-2xl bg-slate-100 dark:bg-white/[0.06] p-3
                            flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider
                                  text-slate-500 dark:text-slate-400">
                        Progress
                    </p>
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white tabular-nums">
                        {completedCount} of {draft.questions.length} complete
                    </p>
                </div>
                {draft.questions.length >= 50 ? (
                    <div className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-500/10
                                    px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-400
                                    whitespace-nowrap">
                        🏆 50+ milestone!
                    </div>
                ) : (
                    <div className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-500/10
                                    px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:text-blue-400
                                    whitespace-nowrap">
                        +{50 - draft.questions.length} to milestone
                    </div>
                )}
            </div>

            {/* Question list */}
            <div className="space-y-2">
                {draft.questions.map((q, idx) => {
                    const isExpanded = expandedId === q.tempId;
                    const isComplete = isQuestionComplete(q);
                    return (
                        <div
                            key={q.tempId}
                            className={`rounded-2xl overflow-hidden
                                        bg-white dark:bg-[#161b22]
                                        border transition-colors
                                        ${isComplete
                                    ? "border-emerald-200 dark:border-emerald-500/30"
                                    : "border-slate-200 dark:border-white/[0.06]"
                                }`}
                        >
                            {/* Header row */}
                            <button
                                onClick={() => {
                                    playSound("ui-tap");
                                    setExpandedId(isExpanded ? null : q.tempId);
                                }}
                                className="w-full flex items-center gap-2.5 p-3 text-left"
                                style={{ touchAction: "manipulation" }}
                            >
                                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0
                                                 text-[11px] font-bold
                                                 ${isComplete
                                        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                                    }`}>
                                    {isComplete ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">
                                        {q.question_text || `Question ${idx + 1}`}
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                        {q.correct_answer} · {q.difficulty}
                                    </p>
                                </div>
                                {draft.questions.length > 1 && (
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeQuestion(idx);
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600
                                                   hover:bg-rose-50 dark:hover:bg-rose-500/10
                                                   transition-colors cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </span>
                                )}
                                {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                            </button>

                            {/* Expanded editor */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-3 pb-3 space-y-3
                                                        border-t border-slate-100 dark:border-white/[0.04] pt-3">
                                            {/* Question text */}
                                            <Textarea
                                                value={q.question_text}
                                                onChange={(e) =>
                                                    updateQuestion(idx, { question_text: e.target.value })
                                                }
                                                placeholder="Enter the question"
                                                rows={2}
                                                className="rounded-xl border-0 bg-slate-50 dark:bg-[#0d1117]
                                                           text-[12.5px] resize-none
                                                           focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                            />

                                            {/* 4 options */}
                                            <div className="grid grid-cols-1 gap-1.5">
                                                {(["A", "B", "C", "D"] as const).map((letter) => {
                                                    const key = `option_${letter.toLowerCase()}` as keyof DraftQuestion;
                                                    return (
                                                        <div key={letter} className="flex items-center gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    updateQuestion(idx, { correct_answer: letter })
                                                                }
                                                                className={`h-7 w-7 rounded-md flex items-center justify-center
                                                                            shrink-0 text-[11px] font-bold
                                                                            transition-colors active:scale-95
                                                                            ${q.correct_answer === letter
                                                                        ? "bg-emerald-600 text-white"
                                                                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                                                                    }`}
                                                                title={`Mark ${letter} as correct`}
                                                            >
                                                                {letter}
                                                            </button>
                                                            <Input
                                                                value={String(q[key] || "")}
                                                                onChange={(e) =>
                                                                    updateQuestion(idx, { [key]: e.target.value } as any)
                                                                }
                                                                placeholder={`Option ${letter}`}
                                                                className="h-9 rounded-lg border-0 bg-slate-50 dark:bg-[#0d1117]
                                                                           text-[12px]
                                                                           focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
                                                Tap A/B/C/D to mark the correct answer
                                            </p>

                                            {/* Explanation */}
                                            <Textarea
                                                value={q.explanation}
                                                onChange={(e) =>
                                                    updateQuestion(idx, { explanation: e.target.value })
                                                }
                                                placeholder="Why is this the correct answer?"
                                                rows={2}
                                                className="rounded-xl border-0 bg-slate-50 dark:bg-[#0d1117]
                                                           text-[12px] resize-none
                                                           focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                            />

                                            {/* Difficulty */}
                                            <div className="flex gap-1.5">
                                                {(["easy", "medium", "hard"] as const).map((d) => (
                                                    <button
                                                        key={d}
                                                        onClick={() => updateQuestion(idx, { difficulty: d })}
                                                        className={`flex-1 py-1.5 rounded-lg text-[10.5px] font-bold uppercase
                                                                    transition-colors
                                                                    ${q.difficulty === d
                                                                ? d === "easy"
                                                                    ? "bg-emerald-600 text-white"
                                                                    : d === "medium"
                                                                        ? "bg-amber-600 text-white"
                                                                        : "bg-rose-600 text-white"
                                                                : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"
                                                            }`}
                                                    >
                                                        {d}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* Add button */}
            <button
                onClick={addQuestion}
                className="w-full h-11 rounded-xl
                           border-2 border-dashed border-slate-200 dark:border-white/[0.1]
                           bg-transparent
                           flex items-center justify-center gap-1.5
                           text-[12px] font-bold
                           text-slate-600 dark:text-slate-300
                           hover:bg-slate-50 dark:hover:bg-white/[0.03]
                           active:scale-[0.99] transition-all"
                style={{ touchAction: "manipulation" }}
            >
                <Plus className="w-4 h-4" />
                Add another question
            </button>

            {draft.questions.length > 0 && completedCount < draft.questions.length && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 p-2.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10.5px] text-amber-800 dark:text-amber-300 leading-snug">
                        {draft.questions.length - completedCount} question
                        {draft.questions.length - completedCount === 1 ? "" : "s"} still
                        need all options + an explanation before you can publish.
                    </p>
                </div>
            )}
        </div>
    );
}