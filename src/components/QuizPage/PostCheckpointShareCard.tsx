// src/components/PostCheckpointShareCard.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Gift, Share2, Send, Copy, Check, Users, Clock, BookOpen, Flame,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" = "light") => {
    playSound("ui-tap");
    if (type === "success") vibrate([15, 30, 15]);
    else vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Share message builders                                            */
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
        return new File([blob], "medrae.jpeg", {
            type: blob.type || "image/jpeg",
        });
    } catch {
        return null;
    }
};

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type Props = {
    visible: boolean;
    onClose: () => void;
    referralCode: string | null;
    referralStats?: { invites: number; pending: number; daysEarned: number } | null;
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function PostCheckpointShareCard({
    visible,
    onClose,
    referralCode,
    referralStats,
}: Props) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (visible) setCopied(false);
    }, [visible]);

    const shareUrl = referralCode ? `https://medrae.app/?ref=${referralCode}` : "";
    const shareMessage = referralCode ? buildShareMessage(referralCode) : "";

    const handleClose = useCallback(() => {
        tap();
        onClose();
    }, [onClose]);

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
        try {
            await navigator.clipboard.writeText(shareMessage);
            tap("success");
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
                        title: "Medrae — free AI tutor",
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
                await navigator.share({ title: "Medrae", text, url: shareUrl });
                return;
            } catch {
                /* cancelled */
            }
        }
        handleCopy();
    }, [referralCode, shareUrl, handleCopy]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 26, stiffness: 320 }}
                    className="fixed inset-x-0 bottom-0 z-[9995] flex justify-center
                               p-3 sm:p-6 pointer-events-none"
                >
                    <div
                        className="w-full max-w-md rounded-2xl pointer-events-auto overflow-hidden
                                   bg-white dark:bg-[#161b22]
                                   shadow-sm"
                    >
                        {/* ── Header ───────────────────────────── */}
                        <header className="flex items-center gap-3 px-4 py-3
                                           border-b border-slate-200/70 dark:border-white/[0.06]">
                            <div className="h-9 w-9 rounded-xl bg-violet-400/10
                                            flex items-center justify-center shrink-0">
                                <Gift className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-violet-600 dark:text-violet-400 leading-none mb-1">
                                    Earn Premium
                                </p>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                                    Want more questions?
                                </h3>
                            </div>
                            <button
                                onClick={handleClose}
                                className="h-9 w-9 rounded-full flex items-center justify-center
                                           text-slate-700 dark:text-slate-200 shrink-0
                                           active:bg-slate-100 dark:active:bg-white/5"
                                style={{ touchAction: "manipulation" }}
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" strokeWidth={2.5} />
                            </button>
                        </header>

                        {/* ── Body ─────────────────────────────── */}
                        <div className="p-4 space-y-3">
                            {/* Reward math */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-violet-50 dark:bg-violet-400/10 p-2.5 text-center">
                                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 leading-none tabular-nums">
                                        +2
                                    </p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                                        Days for you
                                    </p>
                                </div>
                                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-400/10 p-2.5 text-center">
                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-none tabular-nums">
                                        +1
                                    </p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                                        Day for them
                                    </p>
                                </div>
                            </div>

                            {/* Why */}
                            <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <p className="text-[11px] font-semibold text-slate-900 dark:text-white">
                                        Stacks — 5 friends = 10 days
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <p className="text-[11px] font-semibold text-slate-900 dark:text-white">
                                        More days = more practice questions
                                    </p>
                                </div>
                            </div>

                            {/* Primary CTA */}
                            <button
                                onClick={handleShareWhatsApp}
                                className="w-full h-11 rounded-xl bg-emerald-600 text-white
                                           text-sm font-bold
                                           active:scale-[0.97] transition-transform
                                           flex items-center justify-center gap-2"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Share2 className="h-4 w-4" />
                                Share on WhatsApp
                            </button>

                            {/* Secondary actions */}
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={handleShareTelegram}
                                    className="h-12 rounded-xl
                                               bg-slate-100 dark:bg-white/[0.06]
                                               text-slate-700 dark:text-slate-200
                                               text-[11px] font-bold
                                               flex flex-col items-center justify-center gap-0.5
                                               active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Send className="h-4 w-4" />
                                    Telegram
                                </button>
                                <button
                                    onClick={handleShareNative}
                                    className="h-12 rounded-xl
                                               bg-slate-100 dark:bg-white/[0.06]
                                               text-slate-700 dark:text-slate-200
                                               text-[11px] font-bold
                                               flex flex-col items-center justify-center gap-0.5
                                               active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Flame className="h-4 w-4" />
                                    More
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className={`h-12 rounded-xl
                                               text-[11px] font-bold
                                               flex flex-col items-center justify-center gap-0.5
                                               active:scale-[0.97] transition-transform
                                               ${copied
                                            ? "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400"
                                            : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200"
                                        }`}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                    {copied ? "Copied" : "Copy"}
                                </button>
                            </div>

                            {/* Stats */}
                            {referralStats && referralStats.invites > 0 && (
                                <div className="flex items-center justify-center gap-3 pt-1
                                                text-[10px] font-bold uppercase tracking-wider
                                                text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                        {referralStats.invites} joined
                                    </span>
                                    <span aria-hidden>·</span>
                                    <span className="flex items-center gap-1">
                                        <Gift className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                                        {referralStats.daysEarned} days earned
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}