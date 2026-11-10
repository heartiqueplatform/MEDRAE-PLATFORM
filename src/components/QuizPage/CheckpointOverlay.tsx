"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2, Trophy, ArrowRight, TrendingUp, Zap, Award,
    Clock, Share2, Send, Copy, Check, Gift, Users, Flame, BookOpen, X,
} from "lucide-react";
import confetti from "canvas-confetti";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const triggerHaptic = (pattern: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" = "light") => {
    playSound("ui-tap");
    if (type === "success") triggerHaptic([20, 30, 20]);
    else triggerHaptic(12);
};

/* ------------------------------------------------------------------ */
/*  Share helpers                                                     */
/* ------------------------------------------------------------------ */

const SHARE_IMAGE_PATH = "/medraeshare.jpeg";

const buildShareMessage = (code: string): string =>
    `🎓 I'm studying smarter with *Medrae* — an AI tutor for students.\n\n` +
    `Use my link and we BOTH get FREE Premium:\n` +
    `👉 https://medrae.app/?ref=${code}\n\n` +
    `You get 1 day free. I get 2. Everyone wins 💚`;

const loadShareImageFile = async (): Promise<File | null> => {
    try {
        const res = await fetch(SHARE_IMAGE_PATH);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new File([blob], "medrae.jpeg", { type: blob.type || "image/jpeg" });
    } catch {
        return null;
    }
};

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

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
    referralCode?: string | null;
    referralStats?: { invites: number; pending: number; daysEarned: number } | null;
};

const springTransition = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
};

/* ------------------------------------------------------------------ */
/*  Toast (bottom-right) — flat, token palette                        */
/* ------------------------------------------------------------------ */

function ToastNotification({
    stats,
    checkpointOverlay,
}: {
    stats: any;
    checkpointOverlay: any;
}) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setIsVisible(false), 4000);
        return () => clearTimeout(t);
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 22 }}
                    className="fixed bottom-4 right-4 z-[9995] max-w-xs w-[calc(100%-2rem)] sm:w-auto pointer-events-none"
                >
                    <div className="rounded-2xl p-4 shadow-sm
                                    bg-white dark:bg-[#161b22]
                                    pointer-events-auto">
                        <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-xl bg-emerald-600
                                            flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Checkpoint saved
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                                    {stats.score}/{checkpointOverlay.total} correct · {stats.probability}%
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 h-0.5 w-full rounded-full overflow-hidden
                                        bg-slate-100 dark:bg-white/[0.06]">
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 4, ease: "linear" }}
                                className="h-full bg-emerald-600 dark:bg-emerald-400"
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

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
    playSound: _playSound,
    referralCode = null,
    referralStats = null,
}: CheckpointOverlayProps) {
    const [isSyncing, setIsSyncing] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [showShareCard, setShowShareCard] = useState(false);
    const [copied, setCopied] = useState(false);

    const stats = useMemo(() => {
        if (!checkpointOverlay) return { score: 0, probability: 0 };
        const startIndex = lastCheckpoint - checkpointOverlay.total;
        const qMap = new Map(questions.map((q) => [q.id, q.correct_answer]));
        const ids = Object.keys(answers).slice(
            startIndex,
            startIndex + checkpointOverlay.total
        );
        const correct = ids.reduce(
            (c, qid) => (answers[qid] === qMap.get(qid) ? c + 1 : c),
            0
        );
        return {
            score: correct,
            probability: Math.round((correct / checkpointOverlay.total) * 100),
        };
    }, [checkpointOverlay, answers, questions, lastCheckpoint]);

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

    /* Auto-submit on open */
    useEffect(() => {
        if (!checkpointOverlay?.visible || !quizId || !userId) return;

        setShowShareCard(false);
        setCopied(false);

        const autoSubmit = async () => {
            setIsSyncing(true);
            triggerHaptic([30, 15, 30]);
            playSound("start");

            try {
                await supabase.from("quiz_results").insert([
                    {
                        quiz_id: quizId,
                        user_id: userId,
                        unit,
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
    }, [checkpointOverlay?.visible]);

    /* Share handlers */
    const shareUrl = referralCode
        ? `https://medrae.app/?ref=${referralCode}`
        : "";
    const shareMessage = referralCode ? buildShareMessage(referralCode) : "";

    const handleShareWhatsApp = useCallback(() => {
        if (!referralCode) return;
        tap("success");
        window.open(
            `https://wa.me/?text=${encodeURIComponent(shareMessage)}`,
            "_blank"
        );
    }, [referralCode, shareMessage]);

    const handleShareTelegram = useCallback(() => {
        if (!referralCode) return;
        tap();
        window.open(
            `https://t.me/share/url?url=${encodeURIComponent(
                shareUrl
            )}&text=${encodeURIComponent(
                "🎓 Free AI tutor for students — use my link and we both get Premium:"
            )}`,
            "_blank"
        );
    }, [referralCode, shareUrl]);

    const handleCopy = useCallback(async () => {
        if (!referralCode) return;
        tap("success");
        try {
            await navigator.clipboard.writeText(shareMessage);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    }, [referralCode, shareMessage]);

    const handleShareNative = useCallback(async () => {
        if (!referralCode) return;
        tap();
        const text = "🎓 Use my link and we BOTH get FREE Premium:";
        if (navigator.canShare) {
            const file = await loadShareImageFile();
            if (file && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: "Medrae — free AI tutor for students",
                        text: `${text}\n${shareUrl}`,
                    });
                    return;
                } catch {
                    /* cancelled */
                }
            }
        }
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Medrae — free AI tutor for students",
                    text,
                    url: shareUrl,
                });
                return;
            } catch {
                /* cancelled */
            }
        }
        handleCopy();
    }, [referralCode, shareUrl, handleCopy]);

    const handleContinue = useCallback(() => {
        tap("success");
        if (referralCode) {
            setShowShareCard(true);
        } else {
            setCheckpointOverlay(null);
            setShowToast(true);
        }
    }, [referralCode, setCheckpointOverlay]);

    const handleFinish = useCallback(() => {
        tap();
        setCheckpointOverlay(null);
        setShowToast(true);
    }, [setCheckpointOverlay]);

    const dismiss = useCallback(() => {
        if (isSyncing) return;
        tap();
        setCheckpointOverlay(null);
        setShowToast(true);
    }, [isSyncing, setCheckpointOverlay]);

    return (
        <>
            <AnimatePresence mode="wait">
                {checkpointOverlay?.visible && (
                    <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center
                                    w-screen h-[100dvh] sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60"
                            onClick={dismiss}
                            style={{ touchAction: "manipulation" }}
                        />

                        <AnimatePresence mode="wait">
                            {!showShareCard ? (
                                /* ───────── CHECKPOINT CARD ───────── */
                                <motion.div
                                    key="checkpoint"
                                    initial={{ scale: 0.96, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.96, opacity: 0, y: -20 }}
                                    transition={springTransition}
                                    className="relative w-full sm:max-w-md
                                               bg-white dark:bg-[#161b22]
                                               rounded-t-2xl sm:rounded-2xl
                                               shadow-sm
                                               flex flex-col
                                               max-h-[92dvh] sm:max-h-[85vh]
                                               overflow-hidden"
                                    role="dialog"
                                    aria-modal="true"
                                >
                                    {/* Pinned header — flat blue, no gradient */}
                                    <header className="shrink-0 px-4 h-14
                                                       flex items-center gap-2
                                                       bg-blue-600 text-white">
                                        <div className="h-9 w-9 rounded-xl bg-white/[0.15]
                                                        flex items-center justify-center shrink-0">
                                            <Trophy className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-white/80 leading-none mb-1">
                                                Milestone
                                            </p>
                                            <h2 className="text-sm font-bold leading-tight truncate">
                                                Checkpoint achieved
                                            </h2>
                                        </div>
                                        {!isSyncing && (
                                            <button
                                                onClick={dismiss}
                                                className="h-9 w-9 rounded-full flex items-center justify-center
                                                           active:bg-white/[0.15]"
                                                style={{ touchAction: "manipulation" }}
                                                aria-label="Close"
                                            >
                                                <X className="h-4 w-4" strokeWidth={2.5} />
                                            </button>
                                        )}
                                    </header>

                                    {/* Scrollable body */}
                                    <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar
                                                     px-4 py-4">
                                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4 text-center">
                                            Your last {checkpointOverlay.total} answers have been saved.
                                        </p>

                                        {/* Stats — 3 tiles, your token palette */}
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            <StatTile
                                                icon={<Award className="h-3 w-3" />}
                                                label="Score"
                                                value={`${stats.score}/${checkpointOverlay.total}`}
                                                tone="blue"
                                            />
                                            <StatTile
                                                icon={<Zap className="h-3 w-3" />}
                                                label="Accuracy"
                                                value={`${stats.probability}%`}
                                                tone="blue"
                                            />
                                            <StatTile
                                                icon={<TrendingUp className="h-3 w-3" />}
                                                label="Status"
                                                value={stats.probability >= 70 ? "Pass" : "Review"}
                                                tone={stats.probability >= 70 ? "emerald" : "neutral"}
                                            />
                                        </div>

                                        {/* Progress */}
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider
                                                                 text-blue-600 dark:text-blue-400">
                                                    Progress
                                                </span>
                                                <span className="text-[11px] font-bold tabular-nums
                                                                 text-slate-900 dark:text-white">
                                                    {checkpointOverlay.percentCompleted}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full overflow-hidden
                                                            bg-slate-100 dark:bg-white/[0.06]">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{
                                                        width: `${checkpointOverlay.percentCompleted}%`,
                                                    }}
                                                    transition={{ duration: 0.7, ease: "easeOut" }}
                                                    className="h-full rounded-full
                                                               bg-blue-600 dark:bg-blue-400"
                                                />
                                            </div>
                                        </div>

                                        {!isSyncing && (
                                            <div className="flex items-center justify-center gap-2
                                                            text-[11px] font-bold
                                                            text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Saved
                                                </span>
                                                <span aria-hidden>·</span>
                                                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                    {stats.probability >= 70 ? "Great work" : "Keep going"}
                                                </span>
                                            </div>
                                        )}
                                    </main>

                                    {/* Pinned footer — solid CTA */}
                                    <footer className="shrink-0 px-4 py-3
                                                       border-t border-slate-200/70 dark:border-white/[0.06]">
                                        <button
                                            onClick={handleContinue}
                                            disabled={isSyncing}
                                            className={`w-full h-11 rounded-xl
                                                       text-sm font-bold
                                                       flex items-center justify-center gap-2
                                                       transition-transform
                                                       ${isSyncing
                                                    ? "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                                    : "bg-blue-600 text-white active:scale-[0.97]"
                                                }`}
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            {isSyncing ? (
                                                <>
                                                    <svg
                                                        className="animate-spin h-4 w-4"
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
                                                    Syncing…
                                                </>
                                            ) : (
                                                <>
                                                    Continue journey
                                                    <ArrowRight className="h-4 w-4" />
                                                </>
                                            )}
                                        </button>
                                    </footer>
                                </motion.div>
                            ) : (
                                /* ───────── SHARE CARD ───────── */
                                <motion.div
                                    key="share"
                                    initial={{ scale: 0.96, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.96, opacity: 0, y: 10 }}
                                    transition={springTransition}
                                    className="relative w-full sm:max-w-md
                                               bg-white dark:bg-[#161b22]
                                               rounded-t-2xl sm:rounded-2xl
                                               shadow-sm
                                               flex flex-col
                                               max-h-[92dvh] sm:max-h-[85vh]
                                               overflow-hidden"
                                    role="dialog"
                                    aria-modal="true"
                                >
                                    {/* Pinned header — flat violet, no gradient */}
                                    <header className="shrink-0 px-4 h-14
                                                       flex items-center gap-2
                                                       bg-violet-600 text-white">
                                        <div className="h-9 w-9 rounded-xl bg-white/[0.15]
                                                        flex items-center justify-center shrink-0">
                                            <Gift className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-white/80 leading-none mb-1">
                                                Limited reward
                                            </p>
                                            <h2 className="text-sm font-bold leading-tight truncate">
                                                Want more questions?
                                            </h2>
                                        </div>
                                        <button
                                            onClick={handleFinish}
                                            className="h-9 w-9 rounded-full flex items-center justify-center
                                                       active:bg-white/[0.15]"
                                            style={{ touchAction: "manipulation" }}
                                            aria-label="Close"
                                        >
                                            <X className="h-4 w-4" strokeWidth={2.5} />
                                        </button>
                                    </header>

                                    {/* Scrollable body */}
                                    <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar
                                                     px-4 py-4 space-y-3">
                                        <p className="text-xs text-slate-600 dark:text-slate-400
                                                      leading-relaxed text-center">
                                            Every friend you invite unlocks{" "}
                                            <strong className="text-slate-900 dark:text-white">
                                                +2 days of Premium for you
                                            </strong>{" "}
                                            and{" "}
                                            <strong className="text-slate-900 dark:text-white">
                                                +1 day for them
                                            </strong>
                                            . No card, no cost.
                                        </p>

                                        {/* Reward math */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="rounded-xl p-3 text-center
                                                            bg-violet-50 dark:bg-violet-400/10">
                                                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 leading-none tabular-nums">
                                                    +2
                                                </p>
                                                <p className="text-[10px] font-bold uppercase tracking-wider
                                                              text-slate-500 dark:text-slate-400 mt-1">
                                                    Days for you
                                                </p>
                                            </div>
                                            <div className="rounded-xl p-3 text-center
                                                            bg-violet-50 dark:bg-violet-400/10">
                                                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 leading-none tabular-nums">
                                                    +1
                                                </p>
                                                <p className="text-[10px] font-bold uppercase tracking-wider
                                                              text-slate-500 dark:text-slate-400 mt-1">
                                                    Day for them
                                                </p>
                                            </div>
                                        </div>

                                        {/* Why */}
                                        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2">
                                            <WhyRow
                                                icon={<Clock className="h-3.5 w-3.5" />}
                                                text="Premium stacks — 5 friends = 10 days free"
                                            />
                                            <WhyRow
                                                icon={<BookOpen className="h-3.5 w-3.5" />}
                                                text="More days = more practice questions & analytics"
                                            />
                                            <WhyRow
                                                icon={<Users className="h-3.5 w-3.5" />}
                                                text="Your friend unlocks Premium instantly"
                                            />
                                        </div>

                                        {/* Live stats */}
                                        {referralStats && referralStats.invites > 0 && (
                                            <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3
                                                            flex items-center justify-center gap-3
                                                            text-[11px] font-bold
                                                            text-slate-700 dark:text-slate-200">
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                                    {referralStats.invites} joined
                                                </span>
                                                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/20" />
                                                <span className="flex items-center gap-1">
                                                    <Gift className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                                                    {referralStats.daysEarned} days earned
                                                </span>
                                            </div>
                                        )}
                                    </main>

                                    {/* Pinned footer */}
                                    <footer className="shrink-0 px-4 py-3 space-y-2
                                                       border-t border-slate-200/70 dark:border-white/[0.06]">
                                        <button
                                            onClick={handleShareWhatsApp}
                                            className="w-full h-11 rounded-xl bg-emerald-600 text-white
                                                       text-sm font-bold
                                                       flex items-center justify-center gap-2
                                                       active:scale-[0.97] transition-transform"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <Share2 className="h-4 w-4" />
                                            Share on WhatsApp
                                        </button>

                                        <div className="grid grid-cols-3 gap-2">
                                            <SecondaryBtn
                                                onClick={handleShareTelegram}
                                                icon={<Send className="h-4 w-4" />}
                                                label="Telegram"
                                            />
                                            <SecondaryBtn
                                                onClick={handleShareNative}
                                                icon={<Flame className="h-4 w-4" />}
                                                label="More"
                                            />
                                            <SecondaryBtn
                                                onClick={handleCopy}
                                                icon={
                                                    copied ? (
                                                        <Check className="h-4 w-4" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )
                                                }
                                                label={copied ? "Copied" : "Copy"}
                                                success={copied}
                                            />
                                        </div>

                                        <button
                                            onClick={handleFinish}
                                            className="w-full h-10 rounded-xl
                                                       text-slate-500 dark:text-slate-400
                                                       text-xs font-bold uppercase tracking-wider
                                                       active:bg-slate-100 dark:active:bg-white/5
                                                       transition-colors"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            Maybe later
                                        </button>
                                    </footer>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </AnimatePresence>

            {showToast && checkpointOverlay && (
                <ToastNotification
                    stats={stats}
                    checkpointOverlay={checkpointOverlay}
                />
            )}
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                     */
/* ------------------------------------------------------------------ */

type TileTone = "blue" | "emerald" | "neutral";

function StatTile({
    icon,
    label,
    value,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone: TileTone;
}) {
    const toneClass: Record<TileTone, string> = {
        blue: "bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400",
        emerald: "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
        neutral: "bg-slate-50 dark:bg-[#0d1117] text-slate-600 dark:text-slate-300",
    };
    return (
        <div className={`rounded-xl p-2.5 text-center ${toneClass[tone]}`}>
            <div className="flex items-center justify-center gap-1 mb-1">
                {icon}
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                    {label}
                </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums leading-none">
                {value}
            </p>
        </div>
    );
}

function WhyRow({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex items-start gap-2">
            <span className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
                {icon}
            </span>
            <p className="text-[11px] font-semibold text-slate-900 dark:text-white leading-snug">
                {text}
            </p>
        </div>
    );
}

function SecondaryBtn({
    onClick,
    icon,
    label,
    success,
}: {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    success?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`h-12 rounded-xl text-[11px] font-bold
                       flex flex-col items-center justify-center gap-0.5
                       active:scale-[0.97] transition-transform
                       ${success
                    ? "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200"
                }`}
            style={{ touchAction: "manipulation" }}
        >
            {icon}
            {label}
        </button>
    );
}