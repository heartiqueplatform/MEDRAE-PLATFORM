"use client";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@supabase/auth-helpers-react";
import { Flame, Trophy, Share2, Send, Copy, Check, ArrowLeft, Sparkles, Users } from "lucide-react";
import { getMyReferralCode, getMyReferralStats, type ReferralStats } from "@/lib/referrals";
import { supabase } from "@/lib/supabaseClient";

export default function StreakRestore() {
    const user = useUser();
    const navigate = useNavigate();
    const [code, setCode] = useState<string | null>(null);
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [streak, setStreak] = useState({ current: 0, best: 0 });
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            const [c, s, sum] = await Promise.all([
                getMyReferralCode(user.id),
                getMyReferralStats(user.id),
                supabase.from("user_streak_summary")
                    .select("current_streak, best_streak")
                    .eq("user_id", user.id).maybeSingle(),
            ]);
            if (cancelled) return;
            setCode(c);
            setStats(s);
            setStreak({
                current: sum.data?.current_streak ?? 0,
                best: sum.data?.best_streak ?? 0,
            });
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    const shareUrl = code ? `https://medrae.vercel.app/?ref=${code}` : "";
    const message = code
        ? `I'm one friend away from restoring my ${streak.best}-day study streak on *Medrae Nursing*.\n\nJoin with my link and we BOTH get free Premium + I get my streak back:\n${shareUrl}`
        : "";

    const onWhatsApp = useCallback(() => {
        if (!message) return;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    }, [message]);

    const onTelegram = useCallback(() => {
        if (!shareUrl) return;
        window.open(
            `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
                "Restore my streak — join Medrae:"
            )}`,
            "_blank"
        );
    }, [shareUrl]);

    const onCopy = useCallback(async () => {
        if (!message) return;
        try {
            await navigator.clipboard.writeText(message);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
    }, [message]);

    const onNative = useCallback(async () => {
        if (!message) return;
        if (navigator.share) {
            try {
                await navigator.share({ title: "Medrae", text: message, url: shareUrl });
                return;
            } catch { /* cancelled */ }
        }
        onCopy();
    }, [message, shareUrl, onCopy]);

    if (!user) return null;

    const gap = Math.max(0, streak.best - streak.current);

    return (
        <div className="min-h-screen bg-transparent dark:bg-transparent">
            <div className="mx-auto max-w-2xl px-4 py-6 md:py-10 space-y-5">

                {/* Back */}
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1.5 text-xs md:text-sm font-medium
                               text-slate-500 dark:text-slate-400
                               hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                {loading ? (
                    <div className="rounded-3xl bg-white dark:bg-[#161b22] p-8 space-y-4
                                    shadow-sm shadow-slate-900/5 dark:shadow-black/30 animate-pulse">
                        <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-200 dark:bg-[#21262d]" />
                        <div className="h-4 w-32 mx-auto rounded bg-slate-200 dark:bg-[#21262d]" />
                        <div className="h-10 w-24 mx-auto rounded bg-slate-200 dark:bg-[#21262d]" />
                        <div className="h-12 w-full rounded-2xl bg-slate-200 dark:bg-[#21262d]" />
                    </div>
                ) : (
                    <>
                        {/* HERO — streak summary */}
                        <div className="relative overflow-hidden rounded-3xl
                                        bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500
                                        p-6 md:p-8 text-white
                                        shadow-lg shadow-amber-500/20 dark:shadow-amber-500/10">
                            <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-20 -left-10 w-52 h-52 bg-rose-300/20 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative">
                                <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider
                                                bg-white/20 backdrop-blur px-2.5 py-1 rounded-xl mb-4">
                                    <Sparkles size={11} />
                                    Restore reward
                                </div>

                                <div className="flex items-end gap-3 mb-2">
                                    <Flame className="w-8 h-8 text-yellow-200 drop-shadow" strokeWidth={2.4} />
                                    <span className="text-5xl md:text-6xl font-black tracking-tight leading-none tabular-nums">
                                        {streak.current}
                                    </span>
                                    <span className="text-sm font-semibold opacity-80 mb-2">days</span>
                                </div>

                                <p className="text-sm opacity-95">
                                    You were at <strong>{streak.best} days</strong> — one friend away from getting back there.
                                </p>

                                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                                bg-white/20 backdrop-blur text-[11px] font-bold">
                                    <Trophy size={12} className="text-yellow-200" />
                                    Best: {streak.best} days
                                </div>
                            </div>
                        </div>

                        {/* RESTORE MECHANIC */}
                        <div className="rounded-3xl bg-white dark:bg-[#161b22] p-6 md:p-7 space-y-4
                                        shadow-sm shadow-slate-900/5 dark:shadow-black/30">
                            <div className="text-center space-y-1.5">
                                <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                                    Restore {gap} lost {gap === 1 ? "day" : "days"}
                                </h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Share your invite link with one friend. When they finish signing up, your streak
                                    jumps back to <strong className="text-slate-900 dark:text-white">{streak.best}</strong> — and you both get Premium.
                                </p>
                            </div>

                            {/* Primary CTA */}
                            <button
                                onClick={onWhatsApp}
                                disabled={!code}
                                className="w-full py-3.5 rounded-2xl
                                           bg-emerald-600 hover:bg-emerald-700
                                           text-white font-bold text-sm md:text-base
                                           flex items-center justify-center gap-2
                                           shadow-sm shadow-emerald-500/20
                                           active:scale-[0.98] transition-all disabled:opacity-40"
                            >
                                <Share2 size={18} />
                                Share on WhatsApp
                            </button>

                            {/* Secondary row */}
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={onTelegram}
                                    disabled={!code}
                                    className="h-12 rounded-2xl
                                               bg-slate-50 dark:bg-[#21262d]
                                               text-slate-900 dark:text-white
                                               font-bold text-xs flex flex-col items-center justify-center gap-0.5
                                               active:scale-[0.97] transition-transform disabled:opacity-40"
                                >
                                    <Send size={15} />
                                    Telegram
                                </button>
                                <button
                                    onClick={onNative}
                                    disabled={!code}
                                    className="h-12 rounded-2xl
                                               bg-slate-50 dark:bg-[#21262d]
                                               text-slate-900 dark:text-white
                                               font-bold text-xs flex flex-col items-center justify-center gap-0.5
                                               active:scale-[0.97] transition-transform disabled:opacity-40"
                                >
                                    <Sparkles size={15} />
                                    More
                                </button>
                                <button
                                    onClick={onCopy}
                                    disabled={!code}
                                    className="h-12 rounded-2xl
                                               bg-slate-50 dark:bg-[#21262d]
                                               text-slate-900 dark:text-white
                                               font-bold text-xs flex flex-col items-center justify-center gap-0.5
                                               active:scale-[0.97] transition-transform disabled:opacity-40"
                                >
                                    {copied ? <Check size={15} /> : <Copy size={15} />}
                                    {copied ? "Copied" : "Copy"}
                                </button>
                            </div>

                            {/* Live referral stats */}
                            {stats && stats.invites > 0 && (
                                <div className="rounded-2xl bg-slate-50 dark:bg-[#21262d] p-3
                                                flex items-center justify-center gap-4
                                                text-[11px] font-bold text-slate-900 dark:text-white">
                                    <span className="flex items-center gap-1.5">
                                        <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        {stats.invites} joined
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <span className="flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                                        {stats.daysEarned} days earned
                                    </span>
                                </div>
                            )}

                            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 leading-relaxed pt-1">
                                Your streak restores automatically the moment your friend finishes signup.
                                You'll get a notification.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}