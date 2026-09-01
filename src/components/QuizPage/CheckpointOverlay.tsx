"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    Trophy,
    ArrowRight,
    TrendingUp,
    Zap,
    Sparkles,
    Award,
    Clock,
    Star
} from "lucide-react";
import confetti from 'canvas-confetti';

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
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

const ToastNotification = ({ stats, checkpointOverlay, isDark }: { stats: any; checkpointOverlay: any; isDark: boolean }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    const bgClass = isDark
        ? 'bg-gray-900/95 border-white/10 shadow-indigo-500/20'
        : 'bg-white/95 border-gray-200 shadow-indigo-500/10';

    const textClass = isDark ? 'text-white' : 'text-gray-900';
    const subTextClass = isDark ? 'text-gray-300' : 'text-gray-700';
    const borderClass = isDark ? 'bg-gray-700' : 'bg-gray-300';

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ x: 100, opacity: 0, y: 20 }}
                    animate={{ x: 0, opacity: 1, y: 0 }}
                    exit={{ x: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 20 }}
                    className="fixed bottom-6 right-6 z-[150] max-w-sm w-[calc(100%-2rem)] sm:w-auto"
                >
                    <div className={`${bgClass} backdrop-blur-xl border rounded-2xl p-4 shadow-2xl`}>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                    <CheckCircle2 className="w-5 h-5 text-white" />
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className={`text-sm font-semibold ${textClass}`}>Checkpoint Saved!</h4>
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 0.5, repeat: Infinity }}
                                    >
                                        <Sparkles className="w-3 h-3 text-yellow-400" />
                                    </motion.div>
                                </div>

                                <div className="space-y-1">
                                    <p className={`text-xs ${subTextClass}`}>
                                        Batch {checkpointOverlay.total} answers synced
                                    </p>
                                    <div className="flex items-center gap-4 text-xs">
                                        <span className={`flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                            <Award className="w-3 h-3" />
                                            {stats.score}/{checkpointOverlay.total}
                                        </span>
                                        <span className={`flex items-center gap-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                            <Clock className="w-3 h-3" />
                                            {stats.probability}% accuracy
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsVisible(false)}
                                className={`flex-shrink-0 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
                            >
                                <span className="sr-only">Close</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className={`mt-3 h-0.5 w-full ${borderClass} rounded-full overflow-hidden`}>
                            <motion.div
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: 5, ease: "linear" }}
                                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

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

    // Use external if provided, otherwise detect internally
    const isDarkMode = externalIsDarkMode !== undefined
        ? externalIsDarkMode
        : internalIsDarkMode;

    // Only detect internally if external isn't provided
    useEffect(() => {
        if (externalIsDarkMode !== undefined) return;

        const checkDarkMode = () => {
            const isDark = document.documentElement.classList.contains('dark') ||
                window.matchMedia('(prefers-color-scheme: dark)').matches;
            setInternalIsDarkMode(isDark);
        };

        checkDarkMode();

        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, [externalIsDarkMode]);

    const stats = useMemo(() => {
        if (!checkpointOverlay) return { score: 0, probability: 0 };

        const startIndex = lastCheckpoint - checkpointOverlay.total;
        const questionMap = new Map(questions.map(q => [q.id, q.correct_answer]));
        const checkpointQuestionIds = Object.keys(answers).slice(startIndex, startIndex + checkpointOverlay.total);

        const correctInCheckpoint = checkpointQuestionIds.reduce((count, qid) => {
            return answers[qid] === questionMap.get(qid) ? count + 1 : count;
        }, 0);

        const passProbability = Math.round((correctInCheckpoint / checkpointOverlay.total) * 100);

        return {
            score: correctInCheckpoint,
            probability: passProbability
        };
    }, [checkpointOverlay, answers, questions, lastCheckpoint]);

    const triggerCelebration = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min;
        }

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    };

    useEffect(() => {
        if (checkpointOverlay?.visible && quizId && userId) {
            const autoSubmit = async () => {
                setIsSyncing(true);
                triggerHaptic([30, 15, 30, 15, 50]);
                playSound("start");

                try {
                    await supabase.from("quiz_results").insert([{
                        quiz_id: quizId,
                        user_id: userId,
                        unit: unit,
                        score: stats.score,
                        total_questions: checkpointOverlay.total,
                        created_at: new Date().toISOString(),
                    }]);

                    setTimeout(() => {
                        setIsSyncing(false);
                        setShowToast(true);
                        playSound("success");
                        triggerHaptic([20, 10, 30]);

                        if (stats.probability >= 70) {
                            triggerCelebration();
                            setTimeout(() => triggerHaptic([50, 20, 50, 20, 80]), 500);
                        }
                    }, 800);
                } catch (error) {
                    console.error("Sync error:", error);
                    setIsSyncing(false);
                    triggerHaptic([100, 50, 100]);
                }
            };

            autoSubmit();
        }
    }, [checkpointOverlay?.visible]);

    // Theme-based styles
    const backdropClass = isDarkMode
        ? 'bg-black/60 backdrop-blur-sm'
        : 'bg-black/20 backdrop-blur-sm';

    // Dark mode: bg-muted/30, Light mode: bg-white
    const modalBgClass = isDarkMode
        ? 'bg-muted/90'
        : 'bg-white';

    const textClass = isDarkMode ? 'text-gray-300' : 'text-gray-800';
    const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';
    const statBgClass = isDarkMode
        ? 'bg-gray-800/80 border-gray-700'
        : 'bg-gray-50/80 border-gray-200';
    const statTextClass = isDarkMode ? 'text-white' : 'text-gray-900';
    const progressBgClass = isDarkMode ? 'bg-gray-700' : 'bg-gray-200';
    const borderClass = isDarkMode
        ? 'border-gray-700/50'
        : 'border-gray-200';

    const buttonBgClass = isDarkMode
        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]'
        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]';

    const headerGradient = isDarkMode
        ? 'from-indigo-600 via-purple-600 to-pink-600'
        : 'from-indigo-500 via-purple-500 to-pink-500';

    const titleClass = isDarkMode
        ? 'from-white to-gray-300'
        : 'from-gray-900 to-gray-700';

    const particleClass = isDarkMode ? 'bg-white/20' : 'bg-gray-400/30';

    return (
        <>
            <AnimatePresence mode="wait">
                {checkpointOverlay?.visible && (
                    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 overflow-hidden w-screen h-screen h-[100dvh]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`absolute inset-0 ${backdropClass}`}
                            onClick={() => {
                                if (!isSyncing) {
                                    setCheckpointOverlay(null);
                                    setShowToast(true);
                                }
                            }}
                        />

                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className={`absolute w-1 h-1 ${particleClass} rounded-full`}
                                    initial={{
                                        x: Math.random() * window.innerWidth,
                                        y: Math.random() * window.innerHeight,
                                    }}
                                    animate={{
                                        y: [null, -100],
                                        opacity: [0, 1, 0],
                                    }}
                                    transition={{
                                        duration: Math.random() * 5 + 5,
                                        repeat: Infinity,
                                        delay: Math.random() * 5,
                                    }}
                                />
                            ))}
                        </div>

                        {/* REMOVED GlowingBorder wrapper - just the card directly */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 10 }}
                            transition={springTransition}
                            className={`relative ${modalBgClass} w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border ${borderClass}`}
                        >
                            <div className={`h-36 bg-gradient-to-br ${headerGradient} flex items-center justify-center relative overflow-hidden`}>
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [0.3, 0.5, 0.3],
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${isDarkMode ? 'from-white/20' : 'from-white/40'} via-transparent to-transparent`}
                                />

                                {[...Array(3)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            y: [0, -10, 0],
                                            rotate: [0, 10, -10, 0],
                                        }}
                                        transition={{
                                            duration: 2 + i,
                                            repeat: Infinity,
                                            delay: i * 0.5,
                                        }}
                                        className="absolute opacity-40"
                                        style={{
                                            left: `${20 + i * 30}%`,
                                            top: `${20 + (i % 2) * 30}%`,
                                        }}
                                    >
                                        <Sparkles className="w-8 h-8 text-white/70" />
                                    </motion.div>
                                ))}

                                <div className="relative">
                                    <motion.div
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className={`${isDarkMode ? 'bg-white/20 border-white/30' : 'bg-white/40 border-white/60'} p-4 rounded-3xl backdrop-blur-xl border shadow-2xl`}
                                    >
                                        <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-lg" />
                                    </motion.div>
                                </div>
                            </div>

                            <div className="p-6 sm:p-8 text-center">
                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${titleClass} bg-clip-text text-transparent mb-2`}
                                >
                                    Checkpoint Achieved! 🎯
                                </motion.h2>

                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className={`${subTextClass} text-sm mb-6 sm:mb-8 leading-relaxed`}
                                >
                                    Your last {checkpointOverlay.total} answers have been recorded.
                                    You're making incredible progress!
                                </motion.p>

                                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                        className={`${statBgClass} rounded-2xl p-3 sm:p-4 border transition-all group`}
                                    >
                                        <div className="flex items-center justify-center mb-1 sm:mb-2">
                                            <Award className={`w-3 h-3 sm:w-4 sm:h-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} mr-1`} />
                                            <span className={`text-[8px] sm:text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-bold`}>Score</span>
                                        </div>
                                        <div className={`text-lg sm:text-2xl font-black ${statTextClass}`}>
                                            {stats.score}/{checkpointOverlay.total}
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className={`${statBgClass} rounded-2xl p-3 sm:p-4 border transition-all group`}
                                    >
                                        <div className="flex items-center justify-center mb-1 sm:mb-2">
                                            <Zap className={`w-3 h-3 sm:w-4 sm:h-4 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'} mr-1`} />
                                            <span className={`text-[8px] sm:text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-bold`}>Accuracy</span>
                                        </div>
                                        <div className={`text-lg sm:text-2xl font-black ${statTextClass}`}>{stats.probability}%</div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className={`${statBgClass} rounded-2xl p-3 sm:p-4 border transition-all group`}
                                    >
                                        <div className="flex items-center justify-center mb-1 sm:mb-2">
                                            <TrendingUp className={`w-3 h-3 sm:w-4 sm:h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} mr-1`} />
                                            <span className={`text-[8px] sm:text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-bold`}>Status</span>
                                        </div>
                                        <div className={`text-lg sm:text-2xl font-black ${statTextClass}`}>
                                            {stats.probability >= 70 ? (
                                                <span className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>🌟 Pass</span>
                                            ) : (
                                                <span className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>📚 Review</span>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>

                                <div className="mb-6 sm:mb-8">
                                    <div className="flex justify-between text-xs font-bold mb-2">
                                        <span className={`${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-widest`}>Mastery Progress</span>
                                        <span className={statTextClass}>{checkpointOverlay.percentCompleted}%</span>
                                    </div>
                                    <div className={`h-2 w-full ${progressBgClass} rounded-full overflow-hidden`}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${checkpointOverlay.percentCompleted}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                                            style={{
                                                boxShadow: isDarkMode ? '0 0 20px rgba(99, 102, 241, 0.5)' : '0 0 20px rgba(99, 102, 241, 0.2)'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 sm:space-y-4">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setCheckpointOverlay(null);
                                            setShowToast(true);
                                            triggerHaptic(20);
                                        }}
                                        disabled={isSyncing}
                                        className={`w-full py-3 sm:py-4 rounded-2xl font-bold flex items-center justify-center transition-all text-sm sm:text-base ${isSyncing
                                            ? `${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-400'} cursor-not-allowed`
                                            : buttonBgClass
                                            }`}
                                    >
                                        {isSyncing ? (
                                            <span className="flex items-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Syncing...
                                            </span>
                                        ) : (
                                            <>
                                                Continue Journey
                                                <motion.div
                                                    animate={{ x: [0, 5, 0] }}
                                                    transition={{ duration: 1, repeat: Infinity }}
                                                >
                                                    <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                                                </motion.div>
                                            </>
                                        )}
                                    </motion.button>

                                    {!isSyncing && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className={`flex items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-bold flex-wrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                                        >
                                            <span className={`${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} flex items-center`}>
                                                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                                Securely Saved
                                            </span>
                                            <span className={isDarkMode ? 'text-gray-600' : 'text-gray-300'}>•</span>
                                            <span className={`${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} flex items-center`}>
                                                <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                                {stats.probability >= 70 ? 'Excellent Work!' : 'Keep Going!'}
                                            </span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showToast && checkpointOverlay && (
                <ToastNotification stats={stats} checkpointOverlay={checkpointOverlay} isDark={isDarkMode} />
            )}
        </>
    );
}