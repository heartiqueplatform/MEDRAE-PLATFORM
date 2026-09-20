"use client";

import { useState } from "react";
import { ChevronDown, Brain, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MedraeFace, type MedraeFaceName } from "@/components/MedraeFace";

type QuestionInsightsProps = {
    confidenceLevel?: string;
    showReasonBox: boolean;
    selectedReason?: string;
    reasonOptions: string[];
    onReasonSelect: (reason: string) => void;
};

const CONFIDENCE_META: Record<string, {
    label: string;
    phrase: string;
    hint: string;
    tint: string;
    text: string;
    face: MedraeFaceName;
    percent: number;
    percentLabel: string;
}> = {
    High: {
        label: "In the zone",
        phrase: "You trusted your instinct — and it paid off.",
        hint: "Lock this pattern in. It's becoming automatic.",
        tint: "bg-emerald-500/10",
        text: "text-emerald-700 dark:text-emerald-400",
        face: "confident",
        percent: 100,
        percentLabel: "Accuracy",
    },
    Medium: {
        label: "Getting there",
        phrase: "Some hesitation, but you landed on the right idea.",
        hint: "Slow down next time — read twice, answer once.",
        tint: "bg-amber-500/10",
        text: "text-amber-700 dark:text-amber-400",
        face: "thinking",
        percent: 72,
        percentLabel: "Accuracy",
    },
    Low: {
        label: "Worth a second look",
        phrase: "This one needs a bit more time. That's fine.",
        hint: "Revisit the concept before moving on — small gap, big win.",
        tint: "bg-rose-500/10",
        text: "text-rose-700 dark:text-rose-400",
        face: "unsure",
        percent: 38,
        percentLabel: "Accuracy",
    },
    Overconfident: {
        label: "Fast and wrong",
        phrase: "You were quick — and quick cost you this one.",
        hint: "Speed is a gift. Discipline makes it a weapon.",
        tint: "bg-orange-500/10",
        text: "text-orange-700 dark:text-orange-400",
        face: "overconfident",
        percent: 22,
        percentLabel: "Accuracy",
    },
};

const REASON_META: Record<string, { face: MedraeFaceName; note: string }> = {
    "Misread question": { face: "eye", note: "Reading pace noted. Try highlighting key words." },
    "Concept gap": { face: "book", note: "This is a content gap — worth revisiting theory." },
    "Rushed": { face: "clock", note: "Slow is smooth. Smooth is fast. Take your time." },
    "Guess": { face: "target", note: "Honest answer. Next time, eliminate first." },
};

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
                height: { duration: 0.28, ease: "easeOut" },
                opacity: { duration: 0.18, delay: 0.06 },
            },
        },
        exit: {
            height: 0,
            opacity: 0,
            transition: {
                height: { duration: 0.2, ease: "easeIn" },
                opacity: { duration: 0.1 },
            },
        },
    };

    const confidenceKey = confidenceLevel?.split(" ")[0] || "";
    const meta = CONFIDENCE_META[confidenceKey];

    const barColor =
        confidenceKey === "High" ? "bg-emerald-500"
            : confidenceKey === "Medium" ? "bg-amber-400"
                : confidenceKey === "Low" ? "bg-rose-400"
                    : "bg-orange-400";

    return (
        <div className="mt-3 space-y-2">
            {/* ─── CONFIDENCE PANEL ─── */}
            {confidenceLevel && meta && (
                <div className={`rounded-xl overflow-hidden ${meta.tint}`}>
                    <button
                        onClick={() => setConfidenceOpen(!confidenceOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 active:scale-[0.995] transition-transform"
                        aria-expanded={confidenceOpen}
                    >
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="flex flex-col items-start leading-tight min-w-0">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${meta.text}`}>
                                    {meta.label}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    How you answered
                                </span>
                            </div>
                            <MedraeFace name={meta.face} size={28} className={`${meta.text} shrink-0 mt-0.5`} />
                        </div>
                        <ChevronDown
                            className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${confidenceOpen ? "rotate-180" : ""}`}
                        />
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
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                                            {meta.percentLabel}
                                        </span>
                                        <span className={`text-2xl font-black tabular-nums leading-none ${meta.text}`}>
                                            {meta.percent}%
                                        </span>
                                    </div>

                                    <div className="w-full h-1.5 rounded-full bg-white/60 dark:bg-slate-900/40 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${meta.percent}%` }}
                                            transition={{ duration: 0.6, ease: "easeOut" }}
                                            className={`h-full ${barColor}`}
                                        />
                                    </div>

                                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 leading-relaxed mt-3">
                                        {meta.phrase}
                                    </p>
                                    <div className="mt-2 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                                        <Sparkles className="w-3.5 h-3.5 mt-[2px] shrink-0 opacity-70" />
                                        <span className="italic leading-snug">{meta.hint}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* ─── REFLECTION PANEL ─── */}
            {showReasonBox && (
                <div className="rounded-xl overflow-hidden bg-blue-500/8 dark:bg-blue-500/50">
                    {!selectedReason ? (
                        <>
                            <button
                                onClick={() => setReflectionOpen(!reflectionOpen)}
                                className="w-full flex items-center justify-between px-4 py-3 active:scale-[0.995] transition-transform"
                                aria-expanded={reflectionOpen}
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="flex flex-col items-start leading-tight min-w-0">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                                            Learn from this one
                                        </span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Honest reflection, faster growth
                                        </span>
                                    </div>
                                    <MedraeFace name="thinking" size={28} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                </div>
                                <ChevronDown
                                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${reflectionOpen ? "rotate-180" : ""}`}
                                />
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
                                            <p className="text-[12px] text-slate-600 dark:text-slate-300 mb-3 leading-snug">
                                                What got in the way? Tap the closest one.
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {reasonOptions.map((reason) => {
                                                    const rm = REASON_META[reason];
                                                    return (
                                                        <button
                                                            key={reason}
                                                            onClick={() => onReasonSelect(reason)}
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium rounded-full bg-white/80 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all active:scale-95"
                                                        >
                                                            {reason}
                                                            <MedraeFace name={rm?.face ?? "neutral"} size={18} className="shrink-0" />
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
                            transition={{ duration: 0.3 }}
                            className="px-4 py-3.5"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                                        Noted
                                    </p>
                                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                                        {selectedReason}
                                    </p>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 italic leading-snug">
                                        {REASON_META[selectedReason]?.note ?? "Awareness is the first step. Keep going."}
                                    </p>
                                </div>
                                <MedraeFace
                                    name={REASON_META[selectedReason]?.face ?? "neutral"}
                                    size={32}
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