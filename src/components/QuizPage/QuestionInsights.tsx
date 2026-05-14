"use client";

import { useState } from "react";
import { ChevronDown, Brain, Gauge } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type QuestionInsightsProps = {
    confidenceLevel?: string;
    showReasonBox: boolean;
    selectedReason?: string;
    reasonOptions: string[];
    onReasonSelect: (reason: string) => void;
};

export function QuestionInsights({
    confidenceLevel,
    showReasonBox,
    selectedReason,
    reasonOptions,
    onReasonSelect,
}: QuestionInsightsProps) {
    const [confidenceOpen, setConfidenceOpen] = useState(false);
    const [reflectionOpen, setReflectionOpen] = useState(true);

    // Animation settings for the drawer
    const drawerVariants = {
        hidden: { height: 0, opacity: 0, marginTop: 0 },
        visible: {
            height: "auto",
            opacity: 1,
            marginTop: 4,
            transition: { height: { duration: 0.3, ease: "easeOut" }, opacity: { duration: 0.2, delay: 0.1 } }
        },
        exit: {
            height: 0,
            opacity: 0,
            transition: { height: { duration: 0.2, ease: "easeIn" }, opacity: { duration: 0.1 } }
        }
    };

    return (
        <div className="mt-4 space-y-2">
            {/* CONFIDENCE PANEL */}
            {confidenceLevel && (
                <div className="rounded-lg border-0 overflow-hidden bg-white/50 dark:bg-slate-900/30 transition-colors">
                    <button
                        onClick={() => setConfidenceOpen(!confidenceOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                                Performance Confidence
                            </span>
                        </div>

                        <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${confidenceOpen ? "rotate-180" : ""
                                }`}
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
                                <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-800">
                                    <div className="mt-2.5 flex items-center justify-between text-[11px]">
                                        <span className="text-slate-500 dark:text-slate-500">Confidence Level</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{confidenceLevel}</span>
                                    </div>

                                    <div className="mt-2 w-full h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{
                                                width: confidenceLevel.startsWith("High") ? "100%" :
                                                    confidenceLevel.startsWith("Medium") ? "66%" : "33%"
                                            }}
                                            className={`h-full transition-all duration-500 ${confidenceLevel.startsWith("High") ? "bg-emerald-500" :
                                                confidenceLevel.startsWith("Medium") ? "bg-amber-400" : "bg-rose-400"
                                                }`}
                                        />
                                    </div>

                                    <div className="mt-1.5 text-[10px] text-right text-slate-400 italic">
                                        {confidenceLevel.startsWith("High") ? "Estimated Accuracy: 100%" :
                                            confidenceLevel.startsWith("Medium") ? "Estimated Accuracy: 60–80%" :
                                                "Estimated Accuracy: 20–50%"}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* REFLECTION PANEL */}
            {showReasonBox && !selectedReason && (
                <div className="rounded-lg border-0 overflow-hidden bg-white/50 dark:bg-slate-900/30 transition-colors">
                    <button
                        onClick={() => setReflectionOpen(!reflectionOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Brain className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                                Mistake Reflection
                            </span>
                        </div>

                        <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${reflectionOpen ? "rotate-180" : ""
                                }`}
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
                                <div className="px-3 pb-3 border-0">
                                    <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-2 mb-2">
                                        What most likely contributed to the incorrect answer?
                                    </p>

                                    <div className="flex flex-wrap gap-1.5">
                                        {reasonOptions.map((reason) => (
                                            <button
                                                key={reason}
                                                onClick={() => onReasonSelect(reason)}
                                                className="px-2.5 py-1 text-[11px] rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                                            >
                                                {reason}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}