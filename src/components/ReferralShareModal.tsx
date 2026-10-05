// src/components/ReferralShareModal.tsx
"use client";

import { useState, useCallback, useEffect, memo } from "react";
import { X, Share2, Send, Copy, Check, Gift, Users, Clock, BookOpen, Flame } from "lucide-react";

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
    isOpen: boolean;
    onClose: () => void;
    referralCode: string | null;
    referralStats?: { invites: number; pending: number; daysEarned: number } | null;
    isDarkMode?: boolean;
};

const ReferralShareModal = memo(({
    isOpen,
    onClose,
    referralCode,
    referralStats,
    isDarkMode = false,
}: Props) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) setCopied(false);
    }, [isOpen]);

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
                        title: "Medrae — free AI tutor for students",
                        text: `${text}\n${shareUrl}`,
                    });
                    return;
                } catch { /* cancelled */ }
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

    if (!isOpen) return null;

    const surface = isDarkMode ? "bg-slate-900" : "bg-white";
    const surfaceAlt = isDarkMode ? "bg-slate-800" : "bg-slate-50";
    const textMain = isDarkMode ? "text-white" : "text-slate-900";
    const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";

    return (
        <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div
                className={`relative w-full sm:max-w-md ${surface} rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-300`}
            >
                {/* Header — violet gradient, matches hero card in MedraeBot */}
                <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-5 relative">
                    <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute top-3 right-3 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>

                    <div className="relative">
                        {/* Eyebrow */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur px-2 py-1 rounded-xl text-white mb-3">
                            <Flame size={11} /> Limited reward
                        </span>

                        <h3 className="text-xl font-black text-white leading-tight">
                            Get <span className="text-yellow-300">FREE Premium</span>{" "}
                            for every friend
                        </h3>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {/* Reward math */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className={`rounded-xl ${surfaceAlt} p-3 text-center`}>
                            <p className="text-3xl font-black text-violet-600 dark:text-violet-400 leading-none">+2</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${textSub}`}>
                                Days for you
                            </p>
                        </div>
                        <div className={`rounded-xl ${surfaceAlt} p-3 text-center`}>
                            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none">+1</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${textSub}`}>
                                Day for them
                            </p>
                        </div>
                    </div>

                    {/* Why it stacks */}
                    <div className={`rounded-xl ${surfaceAlt} p-3 space-y-2`}>
                        <div className="flex items-start gap-2">
                            <Clock className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                            <p className={`text-xs font-semibold ${textMain}`}>
                                Premium <strong>stacks</strong> — 5 friends = 10 days free
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                            <p className={`text-xs font-semibold ${textMain}`}>
                                More days = more practice questions & analytics
                            </p>
                        </div>
                    </div>

                    {/* Live stats */}
                    {referralStats && referralStats.invites > 0 && (
                        <div className={`rounded-xl ${surfaceAlt} p-3 flex items-center justify-center gap-4 text-[11px] font-bold ${textMain}`}>
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-emerald-600" />
                                {referralStats.invites} joined
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span className="flex items-center gap-1">
                                <Gift className="w-3 h-3 text-violet-600" />
                                {referralStats.daysEarned} days earned
                            </span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-5 pt-3 space-y-2">
                    <button
                        onClick={handleShareWhatsApp}
                        disabled={!referralCode}
                        className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
                    >
                        <Share2 size={16} />
                        Share on WhatsApp
                    </button>

                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={handleShareTelegram}
                            disabled={!referralCode}
                            className={`h-11 rounded-2xl ${surfaceAlt} ${textMain} font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] transition-transform disabled:opacity-40`}
                        >
                            <Send size={14} />
                            Telegram
                        </button>
                        <button
                            onClick={handleShareNative}
                            disabled={!referralCode}
                            className={`h-11 rounded-2xl ${surfaceAlt} ${textMain} font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] transition-transform disabled:opacity-40`}
                        >
                            <Flame size={14} />
                            More
                        </button>
                        <button
                            onClick={handleCopy}
                            disabled={!referralCode}
                            className={`h-11 rounded-2xl ${surfaceAlt} ${textMain} font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] transition-transform disabled:opacity-40`}
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? "Copied" : "Copy"}
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className={`w-full text-center text-[11px] font-bold text-slate-400 py-1`}
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
});

ReferralShareModal.displayName = "ReferralShareModal";

export default ReferralShareModal;