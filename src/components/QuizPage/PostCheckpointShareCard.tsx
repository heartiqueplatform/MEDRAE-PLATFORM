// src/components/PostCheckpointShareCard.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Gift, Share2, Send, Copy, Check, Users, Clock, BookOpen, Flame,
} from "lucide-react";

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

type Props = {
    visible: boolean;
    onClose: () => void;
    referralCode: string | null;
    referralStats?: { invites: number; pending: number; daysEarned: number } | null;
    isDarkMode?: boolean;
};

export default function PostCheckpointShareCard({
    visible,
    onClose,
    referralCode,
    referralStats,
    isDarkMode = false,
}: Props) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (visible) setCopied(false);
    }, [visible]);

    const shareUrl = referralCode ? `https://medrae.app/?ref=${referralCode}` : "";
    const shareMessage = referralCode ? buildShareMessage(referralCode) : "";

    const handleShareWhatsApp = useCallback(() => {
        if (!referralCode) return;
        window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, "_blank");
    }, [referralCode, shareMessage]);

    const handleShareTelegram = useCallback(() => {
        if (!referralCode) return;
        window.open(
            `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
                "🎓 Free AI tutor for students — use my link and we both get Premium:"
            )}`,
            "_blank"
        );
    }, [referralCode, shareUrl]);

    const handleShareNative = useCallback(async () => {
        if (!referralCode) return;
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
                } catch { /* cancelled */ }
            }
        }
        if (navigator.share) {
            try {
                await navigator.share({ title: "Medrae", text, url: shareUrl });
                return;
            } catch { /* cancelled */ }
        }
        handleCopy();
    }, [referralCode, shareUrl]);

    const handleCopy = useCallback(async () => {
        if (!referralCode) return;
        try {
            await navigator.clipboard.writeText(shareMessage);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
    }, [referralCode, shareMessage]);

    const surface = isDarkMode ? "bg-slate-900" : "bg-white";
    const surfaceAlt = isDarkMode ? "bg-slate-800" : "bg-slate-100";
    const textMain = isDarkMode ? "text-white" : "text-slate-900";
    const textSub = isDarkMode ? "text-slate-400" : "text-slate-600";

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 24 }}
                    className="fixed inset-x-0 bottom-0 z-[9995] flex justify-center p-4 sm:p-6 pointer-events-none"
                >
                    <div className={`w-full max-w-md rounded-xl ${surface} pointer-events-auto overflow-hidden`}>
                        {/* Header */}
                        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Gift className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Want more questions?</p>
                                    <p className="text-white/80 text-[11px]">Share with friends, earn Premium</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white/90 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 space-y-3">
                            {/* Reward math */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 p-2.5 text-center">
                                    <p className="text-2xl font-black text-violet-600 dark:text-violet-400 leading-none">+2</p>
                                    <p className={`text-[10px] font-bold uppercase ${textSub} mt-1`}>Days for you</p>
                                </div>
                                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-center">
                                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">+1</p>
                                    <p className={`text-[10px] font-bold uppercase ${textSub} mt-1`}>Day for them</p>
                                </div>
                            </div>

                            {/* Why */}
                            <div className={`rounded-xl ${surfaceAlt} p-3 space-y-1.5`}>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                    <p className={`text-[11px] font-semibold ${textMain}`}>Stacks — 5 friends = 10 days</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                    <p className={`text-[11px] font-semibold ${textMain}`}>More days = more practice questions</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <button
                                onClick={handleShareWhatsApp}
                                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                            >
                                <Share2 size={16} />
                                Share on WhatsApp
                            </button>

                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={handleShareTelegram}
                                    className={`h-10 rounded-xl ${surfaceAlt} ${textMain} font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 active:scale-[0.97]`}
                                >
                                    <Send size={14} />
                                    Telegram
                                </button>
                                <button
                                    onClick={handleShareNative}
                                    className={`h-10 rounded-xl ${surfaceAlt} ${textMain} font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 active:scale-[0.97]`}
                                >
                                    <Flame size={14} />
                                    More
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className={`h-10 rounded-xl ${surfaceAlt} ${textMain} font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 active:scale-[0.97]`}
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    {copied ? "Copied" : "Copy"}
                                </button>
                            </div>

                            {referralStats && referralStats.invites > 0 && (
                                <div className={`text-center text-[10px] font-bold ${textSub} pt-1 flex items-center justify-center gap-3`}>
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3 text-emerald-600" />
                                        {referralStats.invites} joined
                                    </span>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                        <Gift className="w-3 h-3 text-violet-600" />
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