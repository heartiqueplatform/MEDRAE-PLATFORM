// src/components/QuizPage/LeaveQuizModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { motion } from "framer-motion";
import {
    Timer,
    Star,
    Gift,
    Check,
    ThumbsUp,
    Flame,
    Heart,
} from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { playSound } from "@/lib/soundManager";
import { useReferral } from "./useReferral";
import { useQuizEngagement, type ReactionType } from "@/hooks/useQuizEngagement";

interface LeaveQuizModalProps {
    open: boolean;
    onClose: () => void;
    answeredCount: number;
    leaving: boolean;
    onConfirmLeave: () => void;
    onStay: () => void;
    /** UUID of the quiz — required for real persistence */
    quizId?: string | null;
    /** Optional — for display only */
    unitCode?: string;
}

/* ═════════════════════════════════════════════════════════════
   Brand icons (unchanged)
   ═════════════════════════════════════════════════════════════ */
const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
);
const TelegramIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
);
const XIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);
const FacebookIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
);

/* ═════════════════════════════════════════════════════════════ */

export function LeaveQuizModal({
    open,
    onClose,
    answeredCount,
    leaving,
    onConfirmLeave,
    onStay,
    quizId,
    unitCode,
}: LeaveQuizModalProps) {
    const user = useUser();
    const { referralLink, shareToWhatsApp, shareToTelegram } = useReferral();

    // ═══ Real persistence — same hook the quiz cards use ═════
    const {
        version,
        hydrateStats,
        hydrateUserState,
        hydrateReactions,
        rateQuiz,
        toggleReaction,
        reportShare,
        getUserState,
        getReactions,
    } = useQuizEngagement();

    const [stars, setStars] = useState(0);
    const [reaction, setReaction] = useState<ReactionType | null>(null);
    const [voted, setVoted] = useState(false);

    // ── Hydrate this quiz's engagement when modal opens ────
    useEffect(() => {
        if (!open || !quizId) return;
        hydrateStats([quizId]);
        hydrateUserState([quizId]);
        hydrateReactions([quizId]);
    }, [open, quizId, hydrateStats, hydrateUserState, hydrateReactions]);

    // ── Read real server state whenever version bumps ───────
    useEffect(() => {
        if (!quizId) return;

        const state = getUserState(quizId);
        if (typeof state.rating === "number") setStars(state.rating);

        const rx = getReactions(quizId);
        if (rx.myReaction) setReaction(rx.myReaction);

        if (state.rating || rx.myReaction) {
            setVoted(true);
        }
    }, [quizId, getUserState, getReactions, version]);

    // ── Star rating (real write) ────────────────────────────
    const handleStar = async (n: number) => {
        if (!quizId) return;
        const current = stars ?? 0;
        const next = current === n ? 0 : n;   // tap again to clear
        setStars(next);
        setVoted(true);
        playSound("ui-tap");
        if (navigator.vibrate) navigator.vibrate(15);
        try {
            await rateQuiz(quizId, next);
        } catch (err) {
            console.warn("[LeaveQuizModal] rateQuiz failed:", err);
        }
    };

    // ── Reaction (real write, optimistic, rollback-safe) ────
    const handleReaction = async (r: ReactionType) => {
        if (!quizId) return;
        // Optimistic UI — hook will rollback if server rejects
        setReaction((prev) => (prev === r ? null : r));
        setVoted(true);
        playSound("ui-tap");
        if (navigator.vibrate) navigator.vibrate(15);
        try {
            await toggleReaction(quizId, r);
        } catch (err) {
            console.warn("[LeaveQuizModal] toggleReaction failed:", err);
        }
    };

    /* ── Share helpers ───────────────────────────────────── */
    const shareToX = () => {
        const text = "Studying smarter with Medrae — nursing quizzes, past papers, and full NCK curriculum.";
        playSound("ui-tap");
        if (navigator.vibrate) navigator.vibrate(15);
        window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`,
            "_blank"
        );
        if (quizId) reportShare(quizId);
    };

    const shareToFacebook = () => {
        playSound("ui-tap");
        if (navigator.vibrate) navigator.vibrate(15);
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
            "_blank"
        );
        if (quizId) reportShare(quizId);
    };

    const wrappedWhatsApp = () => {
        shareToWhatsApp();
        if (quizId) reportShare(quizId);
    };
    const wrappedTelegram = () => {
        shareToTelegram();
        if (quizId) reportShare(quizId);
    };

    return (
        <CenteredModal
            open={open}
            onClose={onClose}
            title="Leaving so soon?"
            maxWidthClass="max-w-sm"
        >
            <div className="px-4 pb-4 pt-1 space-y-4">
                {/* ── Header ─────────────────────────────────────── */}
                <div className="text-center space-y-2">
                    <div className="h-14 w-14 rounded-full bg-teal-50 dark:bg-teal-400/10
                                    flex items-center justify-center mx-auto">
                        <Timer className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                    </div>
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                        Serious nurses finish what they start.
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        You've answered {answeredCount} this batch. Finish all 10 to save your streak.
                    </p>
                </div>

                {/* ── Rating stars ───────────────────────────────── */}
                <div className="rounded-xl bg-slate-50 dark:bg-white/[0.04] px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 text-center">
                        {stars > 0 ? `You rated ${stars} ${stars === 1 ? "star" : "stars"}` : "How was this quiz?"}
                    </p>
                    <div className="flex items-center justify-center gap-0">
                        {[1, 2, 3, 4, 5].map((n) => {
                            const filled = stars >= n;
                            return (
                                <button
                                    key={n}
                                    onClick={() => handleStar(n)}
                                    disabled={!quizId}
                                    className="relative flex items-center justify-center h-11 w-11 rounded-md
                                               active:scale-[0.90] transition-transform touch-manipulation
                                               disabled:opacity-50"
                                    style={{ touchAction: "manipulation" }}
                                    aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                                >
                                    <Star
                                        size={26}
                                        fill={filled ? "currentColor" : "none"}
                                        strokeWidth={1.75}
                                        className={`transition-colors ${filled
                                            ? "text-amber-500"
                                            : "text-slate-300 dark:text-slate-600"
                                            }`}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Reaction picker ────────────────────────────── */}
                <div className="flex items-center gap-2">
                    {([
                        { key: "like" as const, icon: ThumbsUp, label: "Like", fill: "bg-blue-500", fg: "text-white" },
                        { key: "fire" as const, icon: Flame, label: "Fire", fill: "bg-orange-500", fg: "text-white" },
                        { key: "love" as const, icon: Heart, label: "Love", fill: "bg-rose-500", fg: "text-white" },
                    ]).map(({ key, icon: Icon, label, fill, fg }) => {
                        const active = reaction === key;
                        return (
                            <button
                                key={key}
                                onClick={() => handleReaction(key)}
                                disabled={!quizId}
                                className={`flex-1 flex flex-col items-center justify-center gap-1
                                            h-16 rounded-2xl text-[10px] font-bold
                                            transition-all active:scale-[0.95] touch-manipulation
                                            disabled:opacity-50
                                            ${active
                                        ? `${fill} ${fg}`
                                        : "bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400"
                                    }`}
                                style={{ touchAction: "manipulation" }}
                                aria-pressed={active}
                                aria-label={`React with ${label}`}
                            >
                                <Icon
                                    size={20}
                                    fill={active ? "currentColor" : "none"}
                                    strokeWidth={active ? 0 : 2}
                                />
                                <span>{label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Share grid ─────────────────────────────────── */}
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-400/[0.08] px-3 py-3">
                    <div className="flex items-start gap-2 mb-3">
                        <Gift className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 leading-snug">
                            Share Medrae with a nursing friend — get{" "}
                            <span className="font-bold">+2 days Premium</span> when they join.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={wrappedWhatsApp}
                            className="flex items-center justify-center gap-1.5 h-10 rounded-lg
                                       bg-[#25D366] hover:bg-[#20bd5a] text-white
                                       text-[11px] font-bold active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <WhatsAppIcon className="w-4 h-4" />
                            WhatsApp
                        </button>
                        <button
                            onClick={wrappedTelegram}
                            className="flex items-center justify-center gap-1.5 h-10 rounded-lg
                                       bg-[#0088cc] hover:bg-[#0077b5] text-white
                                       text-[11px] font-bold active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <TelegramIcon className="w-4 h-4" />
                            Telegram
                        </button>
                        <button
                            onClick={shareToX}
                            className="flex items-center justify-center gap-1.5 h-10 rounded-lg
                                       bg-black hover:bg-slate-800 text-white
                                       text-[11px] font-bold active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <XIcon className="w-3.5 h-3.5" />
                            X (Twitter)
                        </button>
                        <button
                            onClick={shareToFacebook}
                            className="flex items-center justify-center gap-1.5 h-10 rounded-lg
                                       bg-[#1877F2] hover:bg-[#0e63d1] text-white
                                       text-[11px] font-bold active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <FacebookIcon className="w-4 h-4" />
                            Facebook
                        </button>
                    </div>

                    <p className="mt-2 text-[9px] text-emerald-700/70 dark:text-emerald-400/60 text-center">
                        Premium credited when your friend actually signs up
                    </p>
                </div>

                {/* ── Feedback thanks ────────────────────────────── */}
                {voted && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400"
                    >
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                        <p className="text-[11px] font-semibold">Thanks for the feedback</p>
                    </motion.div>
                )}

                {/* ── Primary actions ────────────────────────────── */}
                <div className="space-y-2">
                    <button
                        onClick={() => {
                            onStay();
                            playSound("tap");
                            if (navigator.vibrate) navigator.vibrate(20);
                        }}
                        className="w-full h-11 rounded-xl bg-blue-600 text-white text-[13px] font-bold
                                   flex items-center justify-center active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Stay and finish
                    </button>
                    <button
                        onClick={onConfirmLeave}
                        disabled={leaving}
                        className="w-full h-10 rounded-xl bg-rose-50 dark:bg-rose-400/10
                                   text-rose-700 dark:text-rose-400 text-[13px] font-bold
                                   flex items-center justify-center gap-1.5
                                   active:scale-[0.97] transition-transform disabled:opacity-70"
                        style={{ touchAction: "manipulation" }}
                    >
                        {leaving ? (
                            <>
                                <span className="h-3.5 w-3.5 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                                Going…
                            </>
                        ) : (
                            "Not today"
                        )}
                    </button>
                </div>
            </div>
        </CenteredModal>
    );
}