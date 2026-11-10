"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MedraeFace, type MedraeFaceName } from "@/components/MedraeFace";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = () => {
    playSound("ui-tap");
    vibrate(15);
};

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type QuestionInsightsProps = {
    confidenceLevel?: string;
    showReasonBox: boolean;
    selectedReason?: string;
    reasonOptions: string[];
    onReasonSelect: (reason: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Meta                                                              */
/* ------------------------------------------------------------------ */

const CONFIDENCE_META: Record<
    string,
    {
        label: string;
        phrase: string;
        hint: string;
        chip: string;   // chip background, light / dark
        text: string;   // accent text
        bar: string;    // progress bar fill
        face: MedraeFaceName;
        percent: number;
        percentLabel: string;
    }
> = {
    High: {
        label: "In the zone",
        phrase: "You trusted your instinct — and it paid off.",
        hint: "Lock this pattern in. It's becoming automatic.",
        chip: "bg-emerald-50 dark:bg-emerald-400/10",
        text: "text-emerald-700 dark:text-emerald-400",
        bar: "bg-emerald-600 dark:bg-emerald-400",
        face: "confident",
        percent: 100,
        percentLabel: "Accuracy",
    },
    Medium: {
        label: "Getting there",
        phrase: "Some hesitation, but you landed on the right idea.",
        hint: "Slow down next time — read twice, answer once.",
        chip: "bg-amber-50 dark:bg-amber-400/10",
        text: "text-amber-700 dark:text-amber-400",
        bar: "bg-amber-500 dark:bg-amber-400",
        face: "thinking",
        percent: 72,
        percentLabel: "Accuracy",
    },
    Low: {
        label: "Worth a second look",
        phrase: "This one needs a bit more time. That's fine.",
        hint: "Revisit the concept before moving on — small gap, big win.",
        chip: "bg-rose-50 dark:bg-rose-400/10",
        text: "text-rose-700 dark:text-rose-400",
        bar: "bg-rose-600 dark:bg-rose-400",
        face: "unsure",
        percent: 38,
        percentLabel: "Accuracy",
    },
    Overconfident: {
        label: "Fast and wrong",
        phrase: "You were quick — and quick cost you this one.",
        hint: "Speed is a gift. Discipline makes it a weapon.",
        chip: "bg-orange-50 dark:bg-orange-400/10",
        text: "text-orange-700 dark:text-orange-400",
        bar: "bg-orange-600 dark:bg-orange-400",
        face: "overconfident",
        percent: 22,
        percentLabel: "Accuracy",
    },
};

const REASON_META: Record<string, { face: MedraeFaceName; note: string }> = {
    "Misread question": {
        face: "eye",
        note: "Reading pace noted. Try highlighting key words.",
    },
    "Concept gap": {
        face: "book",
        note: "This is a content gap — worth revisiting theory.",
    },
    Rushed: {
        face: "clock",
        note: "Slow is smooth. Smooth is fast. Take your time.",
    },
    Guess: {
        face: "target",
        note: "Honest answer. Next time, eliminate first.",
    },
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function QuestionInsights({
    confidenceLevel,
    showReasonBox,
    selectedReason,
    reasonOptions,
    onReasonSelect,
}: QuestionInsightsProps) {
    const [confidenceOpen, setConfidenceOpen] = useState(true);
    const [reflectionOpen, setReflectionOpen] = useState(true);

    const drawerVariants = {
        hidden: { height: 0, opacity: 0, marginTop: 0 },
        visible: {
            height: "auto",
            opacity: 1,
            marginTop: 4,
            transition: {
                height: { duration: 0.24, ease: "easeOut" as const },
                opacity: { duration: 0.16, delay: 0.05 },
            },
        },
        exit: {
            height: 0,
            opacity: 0,
            transition: {
                height: { duration: 0.18, ease: "easeIn" as const },
                opacity: { duration: 0.1 },
            },
        },
    };

    const confidenceKey = confidenceLevel?.split(" ")[0] || "";
    const meta = CONFIDENCE_META[confidenceKey];

    const toggleConfidence = () => {
        tap();
        setConfidenceOpen((v) => !v);
    };

    const toggleReflection = () => {
        tap();
        setReflectionOpen((v) => !v);
    };

    const handleSelectReason = (reason: string) => {
        tap();
        onReasonSelect(reason);
    };

    return (
        <div className="mt-3 space-y-2">
            {/* ─────────── CONFIDENCE PANEL ─────────── */}
            {confidenceLevel && meta && (
                <div className={`rounded-2xl overflow-hidden ${meta.chip}`}>
                    <button
                        onClick={toggleConfidence}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3
                                   active:scale-[0.995] transition-transform"
                        style={{ touchAction: "manipulation" }}
                        aria-expanded={confidenceOpen}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex flex-col items-start leading-tight min-w-0">
                                <span
                                    className={`text-[11px] font-bold uppercase tracking-wider ${meta.text}`}
                                >
                                    {meta.label}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    How you answered
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <MedraeFace
                                name={meta.face}
                                size={24}
                                className={meta.text}
                            />
                            <ChevronDown
                                className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${confidenceOpen ? "rotate-180" : ""
                                    }`}
                            />
                        </div>
                    </button>

                    <AnimatePresence initial={false}>
                        {confidenceOpen && (
                            <motion.div
                                variants={drawerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4 pt-1">
                                    <div className="flex items-baseline justify-between mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            {meta.percentLabel}
                                        </span>
                                        <span
                                            className={`text-xl font-bold tabular-nums leading-none ${meta.text}`}
                                        >
                                            {meta.percent}%
                                        </span>
                                    </div>

                                    {/* Bar track uses your token palette — no bluish overlays */}
                                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${meta.percent}%` }}
                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                            className={`h-full rounded-full ${meta.bar}`}
                                        />
                                    </div>

                                    <p className="text-[13px] font-medium text-slate-900 dark:text-white leading-relaxed mt-3">
                                        {meta.phrase}
                                    </p>
                                    <div className="mt-2 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                                        <Sparkles className="w-3.5 h-3.5 mt-[2px] shrink-0 opacity-70" />
                                        <span className="italic leading-snug">
                                            {meta.hint}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* ─────────── REFLECTION PANEL ─────────── */}
            {showReasonBox && (
                <div className="rounded-2xl overflow-hidden bg-blue-50 dark:bg-blue-400/10">
                    {!selectedReason ? (
                        <>
                            <button
                                onClick={toggleReflection}
                                className="w-full flex items-center justify-between gap-3 px-4 py-3
                                           active:scale-[0.995] transition-transform"
                                style={{ touchAction: "manipulation" }}
                                aria-expanded={reflectionOpen}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex flex-col items-start leading-tight min-w-0">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                                            Learn from this one
                                        </span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Honest reflection, faster growth
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <MedraeFace
                                        name="thinking"
                                        size={24}
                                        className="text-blue-600 dark:text-blue-400"
                                    />
                                    <ChevronDown
                                        className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${reflectionOpen ? "rotate-180" : ""
                                            }`}
                                    />
                                </div>
                            </button>

                            <AnimatePresence initial={false}>
                                {reflectionOpen && (
                                    <motion.div
                                        variants={drawerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="overflow-hidden"
                                    >
                                        <div className="px-4 pb-4 pt-1">
                                            <p className="text-[12px] text-slate-700 dark:text-slate-300 mb-3 leading-snug">
                                                What got in the way? Tap the closest one.
                                            </p>

                                            <div className="flex flex-wrap gap-1.5">
                                                {reasonOptions.map((reason) => {
                                                    const rm = REASON_META[reason];
                                                    return (
                                                        <button
                                                            key={reason}
                                                            onClick={() => handleSelectReason(reason)}
                                                            className="inline-flex items-center gap-1.5
                                                                       h-8 px-3 rounded-full
                                                                       bg-white dark:bg-white/[0.06]
                                                                       text-slate-700 dark:text-slate-200
                                                                       text-[11px] font-bold
                                                                       active:scale-[0.96] transition-transform"
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            {reason}
                                                            <MedraeFace
                                                                name={rm?.face ?? "neutral"}
                                                                size={16}
                                                                className="shrink-0 text-slate-500 dark:text-slate-400"
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="px-4 py-3"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                                        Noted
                                    </p>
                                    <p className="text-[13px] font-bold text-slate-900 dark:text-white mt-0.5">
                                        {selectedReason}
                                    </p>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 italic leading-snug">
                                        {REASON_META[selectedReason]?.note ??
                                            "Awareness is the first step. Keep going."}
                                    </p>
                                </div>
                                <MedraeFace
                                    name={REASON_META[selectedReason]?.face ?? "neutral"}
                                    size={28}
                                    className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
                                />
                            </div>
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    );
}