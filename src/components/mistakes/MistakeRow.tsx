// src/components/mistakes/MistakeRow.tsx
"use client";

import React from "react";
import dayjs from "dayjs";
import { motion, useMotionValue, useTransform } from "framer-motion";
import {
    CheckCircle2,
    RotateCcw,
    BookMarked,
    Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MistakesMode, MistakesCopy } from "@/lib/mistakes/roleCopy";

/* ────────────────────────────────────────────────────────────── */
/*  Types                                                          */
/* ────────────────────────────────────────────────────────────── */

export interface Question {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    explanation: string;
    additional?: string;
    topic?: string;
    difficulty?: string;
    user_selected?: string;
}

export interface Mistake {
    id: string;
    times_wrong: number;
    first_wrong_at: string;
    last_wrong_at: string;
    resolved: boolean;
    quiz_id: string;
    user_id?: string;
    user_selected?: string;
    questions: Question;
    mistake_reason?: string;
}

export type Tab = "needs-work" | "understood";

const SWIPE_THRESHOLD = 120;
const SWIPE_VELOCITY = 500;

const vibrate = (p: number | number[] = 40) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};

/* ────────────────────────────────────────────────────────────── */
/*  Insight block                                                  */
/* ────────────────────────────────────────────────────────────── */

function InsightBlock({
    tone = "neutral",
    icon: Icon,
    label,
    children,
}: {
    tone?: "neutral" | "emerald" | "blue";
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    children: React.ReactNode;
}) {
    const toneMap = {
        neutral: {
            surface: "bg-slate-50 dark:bg-[#0d1117]",
            icon: "text-slate-400 dark:text-slate-500",
            label: "text-slate-500 dark:text-slate-400",
        },
        emerald: {
            surface: "bg-emerald-50 dark:bg-emerald-400/10",
            icon: "text-emerald-600 dark:text-emerald-400",
            label: "text-emerald-700 dark:text-emerald-400",
        },
        blue: {
            surface: "bg-blue-50 dark:bg-blue-400/10",
            icon: "text-blue-600 dark:text-blue-400",
            label: "text-blue-700 dark:text-blue-400",
        },
    }[tone];

    return (
        <div className={cn("rounded-xl p-3", toneMap.surface)}>
            <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className={cn("h-3.5 w-3.5", toneMap.icon)} />
                <span
                    className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        toneMap.label
                    )}
                >
                    {label}
                </span>
            </div>
            <div className="text-[12px] leading-relaxed text-slate-700 dark:text-slate-300">
                {children}
            </div>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────── */
/*  Swipe reveal                                                   */
/* ────────────────────────────────────────────────────────────── */

function SwipeReveal({
    direction,
    x,
}: {
    direction: Tab;
    x: ReturnType<typeof useMotionValue<number>>;
}) {
    const leftOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
    const rightOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
    const isNeedsWork = direction === "needs-work";

    return (
        <>
            <motion.div
                style={{ opacity: isNeedsWork ? leftOpacity : rightOpacity }}
                className={cn(
                    "absolute inset-0 rounded-2xl flex items-center px-5 pointer-events-none",
                    isNeedsWork
                        ? "justify-start bg-emerald-50 dark:bg-emerald-400/10"
                        : "justify-start bg-rose-50 dark:bg-rose-400/10"
                )}
            >
                {isNeedsWork ? (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm">Understood</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
                        <RotateCcw className="h-5 w-5" />
                        <span className="text-sm">Needs Work</span>
                    </div>
                )}
            </motion.div>

            <motion.div
                style={{ opacity: isNeedsWork ? rightOpacity : leftOpacity }}
                className={cn(
                    "absolute inset-0 rounded-2xl flex items-center justify-end px-5 pointer-events-none",
                    isNeedsWork
                        ? "bg-rose-50 dark:bg-rose-400/10"
                        : "bg-emerald-50 dark:bg-emerald-400/10"
                )}
            >
                {isNeedsWork ? (
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
                        <RotateCcw className="h-5 w-5" />
                        <span className="text-sm">Needs Work</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm">Understood</span>
                    </div>
                )}
            </motion.div>
        </>
    );
}

/* ────────────────────────────────────────────────────────────── */
/*  Main row                                                       */
/* ────────────────────────────────────────────────────────────── */

export function MistakeRow({
    mistake: m,
    index: i,
    copy,
    mode,
    activeTab,
    exitDirection,
    movingIds,
    onMarkUnderstood,
    onReopen,
}: {
    mistake: Mistake;
    index: number;
    copy: MistakesCopy;
    mode: MistakesMode;
    activeTab: Tab;
    exitDirection: "left" | "right";
    movingIds: Set<string>;
    onMarkUnderstood: (qid: string) => void;
    onReopen: (qid: string) => void;
}) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-300, 0, 300], [-4, 0, 4]);
    const isNeedsWork = activeTab === "needs-work";

    const handleDragEnd = (_: any, info: any) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        const shouldTrigger =
            Math.abs(offset) > SWIPE_THRESHOLD || Math.abs(velocity) > SWIPE_VELOCITY;
        if (!shouldTrigger) return;

        if (isNeedsWork) {
            // Swipe right → mark understood
            if (offset > 0 || velocity > 0) {
                vibrate(40);
                if (m.questions?.id) onMarkUnderstood(m.questions.id);
            }
        } else {
            // Swipe left → reopen
            if (offset < 0 || velocity < 0) {
                vibrate(40);
                if (m.questions?.id) onReopen(m.questions.id);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{
                opacity: 0,
                x: exitDirection === "right" ? 320 : -320,
                scale: 0.96,
                rotate: exitDirection === "right" ? 3 : -3,
            }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="relative mb-2"
        >
            <SwipeReveal direction={activeTab} x={x} />

            <motion.div
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                dragSnapToOrigin
                onDragEnd={handleDragEnd}
                style={{ x, rotate }}
                className="relative cursor-grab active:cursor-grabbing touch-pan-y"
            >
                <article className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2.5">
                    <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            {!isNeedsWork && (
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            )}
                            <p
                                className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider leading-none",
                                    isNeedsWork
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-emerald-700 dark:text-emerald-400"
                                )}
                            >
                                {isNeedsWork
                                    ? copy.wrongTimes(m.times_wrong)
                                    : `${copy.markedAt} · ${dayjs(m.last_wrong_at).format(
                                        "DD MMM YYYY, h:mm A"
                                    )}`}
                            </p>
                        </div>
                        <h3 className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug">
                            Q{i + 1}: {m.questions?.question_text ?? "Question unavailable"}
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            {isNeedsWork ? "Last attempt" : "Marked"} ·{" "}
                            {dayjs(m.last_wrong_at).format("DD MMM YYYY, h:mm A")}
                        </p>
                        {mode === "tutor" && m.user_id && (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Student · {m.user_id.slice(0, 8)}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        {["A", "B", "C", "D"].map((letter) => {
                            const optionText =
                                (m.questions?.[
                                    `option_${letter.toLowerCase()}` as keyof Question
                                ] as string | undefined) ?? "—";
                            const isCorrect = letter === m.questions?.correct_answer;
                            const isUserChoice = letter === m.user_selected;

                            return (
                                <div
                                    key={letter}
                                    className={cn(
                                        "flex items-start justify-between gap-2 rounded-xl px-2.5 py-2",
                                        isCorrect
                                            ? "bg-emerald-50 dark:bg-emerald-400/10"
                                            : isUserChoice
                                                ? "bg-rose-50 dark:bg-rose-400/10"
                                                : "bg-slate-50 dark:bg-[#0d1117]"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "text-[12px] leading-snug break-words",
                                            isCorrect
                                                ? "font-bold text-emerald-700 dark:text-emerald-400"
                                                : isUserChoice
                                                    ? "font-bold text-rose-700 dark:text-rose-400"
                                                    : "text-slate-700 dark:text-slate-300"
                                        )}
                                    >
                                        <strong>{letter}.</strong> {optionText}
                                    </span>
                                    {isCorrect && (
                                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                            {copy.correctChoiceLabel}
                                        </span>
                                    )}
                                    {isUserChoice && !isCorrect && (
                                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                                            {copy.studentChoiceLabel}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {m.mistake_reason && (
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-400/10 p-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
                                {copy.whyMissed}
                            </p>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                                {m.mistake_reason}
                            </p>
                        </div>
                    )}

                    <InsightBlock tone="neutral" icon={BookMarked} label="Explanation">
                        {m.questions?.explanation ?? "No explanation available."}
                    </InsightBlock>

                    {m.questions?.additional && (
                        <InsightBlock tone="blue" icon={Lightbulb} label="Pro tip">
                            {m.questions.additional}
                        </InsightBlock>
                    )}

                    {mode === "student" && (
                        <button
                            disabled={movingIds.has(m.questions.id)}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => {
                                vibrate(40);
                                if (!m.questions?.id) return;
                                if (isNeedsWork) onMarkUnderstood(m.questions.id);
                                else onReopen(m.questions.id);
                            }}
                            className={cn(
                                "w-full h-10 rounded-xl text-[12px] font-bold",
                                "flex items-center justify-center gap-1.5",
                                "active:scale-[0.97] transition-transform",
                                "disabled:opacity-60 disabled:cursor-wait",
                                isNeedsWork
                                    ? "bg-emerald-600 text-white"
                                    : "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400"
                            )}
                            style={{ touchAction: "manipulation" }}
                        >
                            {isNeedsWork ? (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {copy.markUnderstood}
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    {movingIds.has(m.questions.id) ? "Moving…" : copy.moveBack}
                                </>
                            )}
                        </button>
                    )}
                </article>
            </motion.div>
        </motion.div>
    );
}