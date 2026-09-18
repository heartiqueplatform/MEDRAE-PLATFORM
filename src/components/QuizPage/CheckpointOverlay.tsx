"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    Trophy,
    ArrowRight,
    TrendingUp,
    Zap,
    Award,
    Clock,
    Star,
} from "lucide-react";
import confetti from "canvas-confetti";

type CheckpointOverlayProps = {
    checkpointOverlay: {
        visible: boolean;
        reached: number;
        total: number;
        percentCompleted: number;
    } | null;
    quizId: string | null;
    userId: string | null;
    unit: string;
    lastCheckpoint: number;
    answers: Record<string, any>;
    questions: any[];
    supabase: any;
    setCheckpointOverlay: (v: any) => void;
    playSound: (name: string) => void;
    isDarkMode?: boolean;
};

const springTransition = { type: "spring", stiffness: 300, damping: 30 };

const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

/* ---------------- Toast ---------------- */

const ToastNotification = ({
    stats,
    checkpointOverlay,
    isDark,
}: {
    stats: any;
    checkpointOverlay: any;
    isDark: boolean;
}) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(false), 4000);
        return () => clearTimeout(timer);
    }, []);

    const bg = isDark ? "bg-slate-900" : "bg-white";
    const text = isDark ? "text-white" : "text-slate-900";
    const sub = isDark ? "text-slate-400" : "text-slate-600";
    const track = isDark ? "bg-slate-800" : "bg-slate-200";

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 22 }}
                    className="fixed bottom-4 right-4 z-[150] max-w-xs w-[calc(100%-2rem)] sm:w-auto"
                >
                    <div className={`${bg} rounded-xl p-4 shadow-lg`}>
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-semibold ${text}`}>
                                    Checkpoint Saved
                                </h4>
                                <p className={`text-xs ${sub} mt-0.5`}>
                                    {stats.score}/{checkpointOverlay.total} correct • {stats.probability}%
                                </p>
                            </div>
                        </div>
                        <div className={`mt-3 h-0.5 w-full ${track} rounded-full overflow-hidden`}>
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 4, ease: "linear" }}
                                className="h-full bg-emerald-600"
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

/* ---------------- Main Overlay ---------------- */

export function CheckpointOverlay({
    checkpointOverlay,
    quizId,
    userId,
    unit,
    lastCheckpoint,
    answers,
    questions,
    supabase,
    setCheckpointOverlay,
    playSound,
    isDarkMode: externalIsDarkMode,
}: CheckpointOverlayProps) {
    const [isSyncing, setIsSyncing] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [internalIsDarkMode, setInternalIsDarkMode] = useState(false);

    const isDarkMode =
        externalIsDarkMode !== undefined ? externalIsDarkMode : internalIsDarkMode;

    useEffect(() => {
        if (externalIsDarkMode !== undefined) return;
        const check = () =>
            setInternalIsDarkMode(
                document.documentElement.classList.contains("dark") ||
                window.matchMedia("(prefers-color-scheme: dark)").matches
            );
        check();
        const obs = new MutationObserver(check);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => obs.disconnect();
    }, [externalIsDarkMode]);

    const stats = useMemo(() => {
        if (!checkpointOverlay) return { score: 0, probability: 0 };
        const startIndex = lastCheckpoint - checkpointOverlay.total;
        const qMap = new Map(questions.map((q) => [q.id, q.correct_answer]));
        const ids = Object.keys(answers).slice(startIndex, startIndex + checkpointOverlay.total);
        const correct = ids.reduce(
            (c, qid) => (answers[qid] === qMap.get(qid) ? c + 1 : c),
            0
        );
        return {
            score: correct,
            probability: Math.round((correct / checkpointOverlay.total) * 100),
        };
    }, [checkpointOverlay, answers, questions, lastCheckpoint]);

    /* Lighter confetti — one burst only */
    const triggerCelebration = () => {
        confetti({
            particleCount: 40,
            spread: 70,
            origin: { y: 0.6 },
            startVelocity: 25,
            ticks: 120,
            gravity: 0.9,
            colors: ["#2563eb", "#10b981", "#f59e0b"],
        });
    };

    useEffect(() => {
        if (checkpointOverlay?.visible && quizId && userId) {
            const autoSubmit = async () => {
                setIsSyncing(true);
                triggerHaptic([30, 15, 30]);
                playSound("start");

                try {
                    await supabase.from("quiz_results").insert([
                        {
                            quiz_id: quizId,
                            user_id: userId,
                            unit: unit,
                            score: stats.score,
                            total_questions: checkpointOverlay.total,
                            created_at: new Date().toISOString(),
                        },
                    ]);

                    setTimeout(() => {
                        setIsSyncing(false);
                        setShowToast(true);
                        playSound("success");
                        triggerHaptic([20, 10, 30]);
                        if (stats.probability >= 70) triggerCelebration();
                    }, 600);
                } catch (err) {
                    console.error("Sync error:", err);
                    setIsSyncing(false);
                    triggerHaptic([100, 50, 100]);
                }
            };
            autoSubmit();
        }
    }, [checkpointOverlay?.visible]);

    /* Flat theme — 2 colors + neutrals */
    const backdrop = isDarkMode ? "bg-black/70" : "bg-black/40";
    const surface = isDarkMode ? "bg-slate-900" : "bg-white";
    const surfaceAlt = isDarkMode ? "bg-slate-800" : "bg-slate-100";
    const textMain = isDarkMode ? "text-white" : "text-slate-900";
    const textSub = isDarkMode ? "text-slate-400" : "text-slate-600";
    const accentBg = "bg-blue-600";
    const accentText = isDarkMode ? "text-blue-400" : "text-blue-600";
    const trackBg = isDarkMode ? "bg-slate-800" : "bg-slate-200";

    return (
        <>
            <AnimatePresence mode="wait">
                {checkpointOverlay?.visible && (
                    <div className="fixed inset-0 z-[140] flex items-stretch sm:items-center justify-center w-screen h-[100dvh] sm:p-4">
                        {/* Backdrop — no blur for perf */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`absolute inset-0 ${backdrop}`}
                            onClick={() => {
                                if (!isSyncing) {
                                    setCheckpointOverlay(null);
                                    setShowToast(true);
                                }
                            }}
                        />

                        {/* Card — fullscreen edge-to-edge on mobile, card on desktop */}
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 10 }}
                            transition={springTransition}
                            className={`relative ${surface} w-full h-full sm:h-auto sm:max-w-md sm:rounded-3xl rounded-none overflow-hidden flex flex-col`}
                        >
                            {/* Header — flat blue, no gradient */}
                            <div className={`${accentBg} flex items-center justify-center py-10 sm:py-12 relative`}>
                                <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
                                    <Trophy className="w-8 h-8 text-white" />
                                </div>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 text-center">
                                <h2 className={`text-2xl sm:text-3xl font-bold ${textMain} mb-2`}>
                                    Checkpoint Achieved
                                </h2>
                                <p className={`${textSub} text-sm mb-6 leading-relaxed`}>
                                    Your last {checkpointOverlay.total} answers have been saved.
                                </p>

                                {/* Stats — flat, no borders */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
                                    <div className={`${surfaceAlt} rounded-2xl p-3 sm:p-4`}>
                                        <div className="flex items-center justify-center mb-1">
                                            <Award className={`w-3 h-3 ${accentText} mr-1`} />
                                            <span className={`text-[9px] uppercase tracking-wider ${textSub} font-bold`}>
                                                Score
                                            </span>
                                        </div>
                                        <div className={`text-lg sm:text-2xl font-black ${textMain}`}>
                                            {stats.score}/{checkpointOverlay.total}
                                        </div>
                                    </div>

                                    <div className={`${surfaceAlt} rounded-2xl p-3 sm:p-4`}>
                                        <div className="flex items-center justify-center mb-1">
                                            <Zap className={`w-3 h-3 ${accentText} mr-1`} />
                                            <span className={`text-[9px] uppercase tracking-wider ${textSub} font-bold`}>
                                                Accuracy
                                            </span>
                                        </div>
                                        <div className={`text-lg sm:text-2xl font-black ${textMain}`}>
                                            {stats.probability}%
                                        </div>
                                    </div>

                                    <div className={`${surfaceAlt} rounded-2xl p-3 sm:p-4`}>
                                        <div className="flex items-center justify-center mb-1">
                                            <TrendingUp className={`w-3 h-3 ${accentText} mr-1`} />
                                            <span className={`text-[9px] uppercase tracking-wider ${textSub} font-bold`}>
                                                Status
                                            </span>
                                        </div>
                                        <div
                                            className={`text-lg sm:text-2xl font-black ${stats.probability >= 70
                                                ? "text-emerald-600"
                                                : textMain
                                                }`}
                                        >
                                            {stats.probability >= 70 ? "Pass" : "Review"}
                                        </div>
                                    </div>
                                </div>

                                {/* Progress — flat */}
                                <div className="mb-6">
                                    <div className="flex justify-between text-xs font-bold mb-2">
                                        <span className={`${accentText} uppercase tracking-widest`}>
                                            Progress
                                        </span>
                                        <span className={textMain}>
                                            {checkpointOverlay.percentCompleted}%
                                        </span>
                                    </div>
                                    <div className={`h-2 w-full ${trackBg} rounded-full overflow-hidden`}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${checkpointOverlay.percentCompleted}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                            className={`h-full ${accentBg} rounded-full`}
                                        />
                                    </div>
                                </div>

                                {/* CTA — flat, no borders */}
                                <div className="space-y-3">
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setCheckpointOverlay(null);
                                            setShowToast(true);
                                            triggerHaptic(20);
                                        }}
                                        disabled={isSyncing}
                                        className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center text-sm sm:text-base transition-colors ${isSyncing
                                            ? isDarkMode
                                                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                            : `${accentBg} text-white hover:bg-blue-700`
                                            }`}
                                    >
                                        {isSyncing ? (
                                            <span className="flex items-center">
                                                <svg
                                                    className="animate-spin mr-3 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    />
                                                </svg>
                                                Syncing...
                                            </span>
                                        ) : (
                                            <>
                                                Continue Journey
                                                <ArrowRight className="ml-2 w-4 h-4" />
                                            </>
                                        )}
                                    </motion.button>

                                    {!isSyncing && (
                                        <div
                                            className={`flex items-center justify-center gap-2 text-[11px] font-bold ${textSub}`}
                                        >
                                            <span className="text-emerald-600 flex items-center">
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                Saved
                                            </span>
                                            <span>•</span>
                                            <span className={`${accentText} flex items-center`}>
                                                <Star className="w-3.5 h-3.5 mr-1" />
                                                {stats.probability >= 70 ? "Great work" : "Keep going"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showToast && checkpointOverlay && (
                <ToastNotification
                    stats={stats}
                    checkpointOverlay={checkpointOverlay}
                    isDark={isDarkMode}
                />
            )}
        </>
    );
}