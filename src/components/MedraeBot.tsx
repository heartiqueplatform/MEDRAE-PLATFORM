// src/components/MedraeBot.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    X,
    Sparkles,
    Lock,
    Crown,
    ArrowRight,
    Heart,
    Phone,
    Gift,
    Share2,
    Send,
    Copy,
    Check,
    Flame,
    Users,
    Clock,
} from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";
import MedraeSocialFooter from "@/components/MedraeSocialFooter";
import { getCachedPremium, resolveSubscription } from "@/lib/subscription";
import {
    getMyReferralCode,
    getMyReferralStats,
    type ReferralStats,
} from "@/lib/referrals";

// ============================================
// 🎛️ OVERRIDE BUMP SECTION
// ============================================
const SHOW_BOT_FOR_PREMIUM = true;   // 🧪 TEST
const BUMP_VERSION = "v2";
// ============================================

// ============================================
// 🧪 TESTING OVERRIDE
// ============================================
const FORCE_SHOW_ON_REFRESH = true;
// ============================================

// ============================================
// 🕐 X BUTTON APPEARS AFTER THIS MANY SECONDS
// ============================================
const X_APPEAR_AFTER_SECONDS = 5;
// ============================================

// ─── Support ───
const SUPPORT_WHATSAPP = "254704473503";
const SUPPORT_PHONE_DISPLAY = "0704 473 503";

const BOT_STORAGE_KEY = "medrae_bot_dismissed";
const BOT_BUMP_KEY = "medrae_bot_bump_version";
const BOT_OPEN_COUNT_KEY = "medrae_bot_open_count";
const BOT_OPEN_DATE_KEY = "medrae_bot_open_date";
const BOT_SESSION_FLAG = "medrae_bot_session_started";
const BOT_DISMISSED_THIS_OPEN = "medrae_bot_dismissed_this_open";

const MAX_SHOWS_PER_DAY = 3;

// ─── Time-aware greeting ───
const getTimeGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 21) return "Good evening";
    return "Good night";
};

// ─── Build share message ───
const buildShareMessage = (code: string): string => {
    return (
        `🎓 I'm studying smarter with *Medrae* — an AI tutor for students.\n\n` +
        `Use my link and we BOTH get FREE Premium:\n` +
        `👉 https://medrae.app/?ref=${code}\n\n` +
        `You get 1 day free. I get 2. Everyone wins 💚`
    );
};

const MedraeBot = () => {
    const navigate = useNavigate();
    const session = useSession();

    const [isPremium, setIsPremium] = useState<boolean>(
        () => getCachedPremium(session?.user?.id) ?? false
    );
    const [premiumResolved, setPremiumResolved] = useState<boolean>(
        () => getCachedPremium(session?.user?.id) !== null
    );

    const [isVisible, setIsVisible] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [showX, setShowX] = useState(false);

    const [greeting] = useState<string>(() => getTimeGreeting());

    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [referralStats, setReferralStats] = useState<ReferralStats>({
        invites: 0,
        pending: 0,
        daysEarned: 0,
    });
    const [copied, setCopied] = useState(false);

    // ─── Premium from cache ───
    useEffect(() => {
        if (!session?.user?.id) return;
        const cached = getCachedPremium(session.user.id);
        if (cached !== null) {
            setIsPremium(cached);
            setPremiumResolved(true);
        }
    }, [session?.user?.id]);

    // ─── Premium background refresh ───
    useEffect(() => {
        if (!session?.user?.id) return;
        let cancelled = false;
        resolveSubscription(session.user.id)
            .then((snap) => {
                if (cancelled) return;
                setIsPremium(snap.isPremium);
                setPremiumResolved(true);
            })
            .catch(() => {
                if (!cancelled) setPremiumResolved(true);
            });
        return () => { cancelled = true; };
    }, [session?.user?.id]);

    // ─── Referral data ───
    useEffect(() => {
        if (!session?.user?.id) return;
        let cancelled = false;
        (async () => {
            const [code, stats] = await Promise.all([
                getMyReferralCode(session.user.id),
                getMyReferralStats(session.user.id),
            ]);
            if (cancelled) return;
            setReferralCode(code);
            setReferralStats(stats);
        })();
        return () => { cancelled = true; };
    }, [session?.user?.id]);

    // ─── Track app open ───
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (FORCE_SHOW_ON_REFRESH) return;
        if (sessionStorage.getItem(BOT_SESSION_FLAG)) return;
        sessionStorage.setItem(BOT_SESSION_FLAG, "true");
        try {
            const today = new Date().toDateString();
            const storedDate = localStorage.getItem(BOT_OPEN_DATE_KEY);
            let count = storedDate === today
                ? parseInt(localStorage.getItem(BOT_OPEN_COUNT_KEY) || "0", 10)
                : 0;
            if (storedDate !== today) localStorage.setItem(BOT_OPEN_DATE_KEY, today);
            count += 1;
            localStorage.setItem(BOT_OPEN_COUNT_KEY, count.toString());
        } catch { /* ignore */ }
    }, []);

    // ─── Decide visibility ───
    useEffect(() => {
        if (!session?.user) return;
        if (hasChecked) return;
        if (!premiumResolved) return;

        if (FORCE_SHOW_ON_REFRESH) {
            setIsVisible(true);
            setHasChecked(true);
            return;
        }

        try {
            if (isPremium && !SHOW_BOT_FOR_PREMIUM) {
                setHasChecked(true);
                return;
            }
            const today = new Date().toDateString();
            const storedDate = localStorage.getItem(BOT_OPEN_DATE_KEY);
            const openCount = parseInt(localStorage.getItem(BOT_OPEN_COUNT_KEY) || "0", 10);
            const seenBump = localStorage.getItem(BOT_BUMP_KEY);

            if (seenBump !== BUMP_VERSION) { setIsVisible(true); setHasChecked(true); return; }
            if (storedDate === today && openCount > MAX_SHOWS_PER_DAY) { setHasChecked(true); return; }
            if (sessionStorage.getItem(BOT_DISMISSED_THIS_OPEN)) { setHasChecked(true); return; }
            setIsVisible(true);
            setHasChecked(true);
        } catch {
            setHasChecked(true);
        }
    }, [session, isPremium, hasChecked, premiumResolved]);

    // ─── Mount animation ───
    useEffect(() => {
        if (!isVisible) { setIsMounted(false); return; }
        let raf2: number | null = null;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => setIsMounted(true));
        });
        return () => {
            cancelAnimationFrame(raf1);
            if (raf2 !== null) cancelAnimationFrame(raf2);
        };
    }, [isVisible]);

    // ─── Reveal X after N seconds ───
    useEffect(() => {
        if (!isVisible) { setShowX(false); return; }
        setShowX(false);
        const t = setTimeout(() => setShowX(true), X_APPEAR_AFTER_SECONDS * 1000);
        return () => clearTimeout(t);
    }, [isVisible]);

    const markDismissed = useCallback(() => {
        try {
            sessionStorage.setItem(BOT_DISMISSED_THIS_OPEN, "true");
            localStorage.setItem(BOT_STORAGE_KEY, Date.now().toString());
            localStorage.setItem(BOT_BUMP_KEY, BUMP_VERSION);
        } catch { /* ignore */ }
    }, []);

    const closeAndThen = useCallback((action?: () => void) => {
        markDismissed();
        setIsDismissing(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsDismissing(false);
            setIsMounted(false);
            if (action) action();
        }, 500);
    }, [markDismissed]);

    const handleDismiss = useCallback(() => closeAndThen(), [closeAndThen]);
    const handleUpgrade = useCallback(() => closeAndThen(() => navigate("/subscription")), [closeAndThen, navigate]);
    const handleFeedback = useCallback(() => closeAndThen(() => navigate("/feedback")), [closeAndThen, navigate]);

    // ─── Share handlers ───
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
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Medrae — free AI tutor for students",
                    text: "🎓 Use my link and we BOTH get FREE Premium:",
                    url: shareUrl,
                });
            } catch { /* user cancelled */ }
        } else {
            handleCopy();
        }
    }, [referralCode, shareUrl]);

    const handleCopy = useCallback(async () => {
        if (!referralCode) return;
        try {
            await navigator.clipboard.writeText(shareMessage);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
    }, [referralCode, shareMessage]);

    // ─── Hide if premium resolves mid-session ───
    useEffect(() => {
        if (!isPremium || SHOW_BOT_FOR_PREMIUM) return;
        if (!isVisible) return;
        setIsVisible(false);
        setIsDismissing(false);
        setIsMounted(false);
    }, [isPremium, isVisible]);

    // ─── Escape key ───
    useEffect(() => {
        if (!isVisible) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && showX) handleDismiss();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isVisible, showX, handleDismiss]);

    if (!isVisible && !isDismissing) return null;
    if (isPremium && !SHOW_BOT_FOR_PREMIUM) return null;

    // ═══════════════════════════════════════════════════════
    // 🎁 HERO REFERRAL CARD
    // ═══════════════════════════════════════════════════════
    const ReferralHero = () => {
        if (!referralCode) {
            return (
                <div className="rounded-xl p-4 bg-violet-50 dark:bg-violet-950/30 text-center">
                    <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                        Loading your invite link…
                    </p>
                </div>
            );
        }

        const hasInvites = referralStats.invites > 0;

        return (
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600">
                {/* Glow decoration */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-10 w-44 h-44 bg-fuchsia-400/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative p-5 text-white">
                    {/* Eyebrow */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur px-2 py-1 rounded-xl">
                            <Flame size={11} /> Limited reward
                        </span>
                    </div>

                    {/* Headline */}
                    <h3 className="text-2xl font-black leading-tight mb-1">
                        Get <span className="text-yellow-300">FREE Premium</span>
                        <br />for every friend you invite
                    </h3>

                    {/* Reward math */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
                            <p className="text-3xl font-black text-yellow-300 leading-none">+2</p>
                            <p className="text-[10px] font-bold uppercase tracking-wide mt-1 opacity-90">
                                Days for you
                            </p>
                        </div>
                        <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
                            <p className="text-3xl font-black text-emerald-300 leading-none">+1</p>
                            <p className="text-[10px] font-bold uppercase tracking-wide mt-1 opacity-90">
                                Day for them
                            </p>
                        </div>
                    </div>

                    {/* Why it matters */}
                    <div className="mt-4 space-y-2">
                        <div className="flex items-start gap-2">
                            <Clock size={14} className="text-yellow-300 flex-shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold opacity-95">
                                Premium <strong>stacks</strong> — 5 friends = 10 days free
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <Users size={14} className="text-yellow-300 flex-shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold opacity-95">
                                Your friend unlocks Premium <strong>instantly</strong> — no card needed
                            </p>
                        </div>
                    </div>

                    {/* ── PRIMARY CTA: WhatsApp ── */}
                    <button
                        onClick={handleShareWhatsApp}
                        className="mt-5 w-full py-3.5 rounded-xl bg-white text-violet-700 font-black text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                    >
                        <Share2 size={18} />
                        Share on WhatsApp
                    </button>

                    {/* ── Secondary row ── */}
                    <div className="mt-2 grid grid-cols-3 gap-2">
                        <button
                            onClick={handleShareTelegram}
                            className="h-11 rounded-xl bg-white/15 backdrop-blur text-white font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] transition-transform"
                        >
                            <Send size={15} />
                            Telegram
                        </button>
                        <button
                            onClick={handleShareNative}
                            className="h-11 rounded-xl bg-white/15 backdrop-blur text-white font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] transition-transform"
                        >
                            <Sparkles size={15} />
                            More
                        </button>
                        <button
                            onClick={handleCopy}
                            className="h-11 rounded-xl bg-white/15 backdrop-blur text-white font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] transition-transform"
                        >
                            {copied ? <Check size={15} /> : <Copy size={15} />}
                            {copied ? "Copied" : "Copy"}
                        </button>
                    </div>

                    {/* Live stats */}
                    {hasInvites && (
                        <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-center gap-4 text-[11px] font-bold">
                            <span className="flex items-center gap-1">
                                <Users size={12} className="text-emerald-300" />
                                {referralStats.invites} joined
                            </span>
                            <span className="w-1 h-1 bg-white/40 rounded-full" />
                            <span className="flex items-center gap-1">
                                <Gift size={12} className="text-yellow-300" />
                                {referralStats.daysEarned} days earned
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ─── Body content ───
    const CardBody = ({ accent }: { accent: "emerald" | "blue" }) => {
        const isEmerald = accent === "emerald";

        const linkColor = isEmerald
            ? "text-emerald-600 dark:text-emerald-400 hover:underline"
            : "text-blue-600 dark:text-blue-400 hover:underline";

        const crownBg = isEmerald
            ? "from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20"
            : "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20";

        const crownIcon = isEmerald
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-amber-600 dark:text-amber-400";

        const crownTitle = isEmerald
            ? "text-emerald-800 dark:text-emerald-300"
            : "text-amber-800 dark:text-amber-300";

        const crownText = isEmerald
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-amber-700 dark:text-amber-400";

        const crownBtn = isEmerald
            ? "bg-emerald-600 hover:bg-emerald-700"
            : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600";

        const heartBg = isEmerald
            ? "from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20"
            : "from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20";

        const heartIcon = isEmerald
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400";

        const heartTitle = isEmerald
            ? "text-emerald-800 dark:text-emerald-300"
            : "text-rose-800 dark:text-rose-300";

        const heartText = isEmerald
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-rose-700 dark:text-rose-400";

        return (
            <>
                {/* 1. Hero referral card */}
                <ReferralHero />

                {/* 2. Quick tip */}
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed text-center px-2">
                    💡 Pages loading slow? Just{" "}
                    <strong className={isEmerald ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}>
                        log out and back in
                    </strong>
                    {" "}— fixes it every time.
                </p>

                {/* 3. Support — compact */}
                <div className={`rounded-xl p-3 bg-gradient-to-r ${heartBg}`}>
                    <div className="flex items-start gap-2.5">
                        <Heart size={16} className={`${heartIcon} flex-shrink-0 mt-0.5`} />
                        <div className="flex-1">
                            <p className={`text-sm font-bold ${heartTitle}`}>We're here 🤍</p>
                            <p className={`text-xs mt-0.5 leading-relaxed ${heartText}`}>
                                Stuck or stressed? We reply on WhatsApp.
                            </p>
                            <a
                                href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`mt-2 inline-flex items-center gap-1.5 font-bold text-[11px] py-1.5 px-2.5 rounded-xl transition-all bg-rose-600 hover:bg-rose-700 text-white active:scale-[0.98]`}
                            >
                                <Phone size={12} />
                                {SUPPORT_PHONE_DISPLAY}
                            </a>
                        </div>
                    </div>
                </div>

                {/* 4. Upgrade nudge */}
                {!isEmerald && (
                    <>
                        <div className={`rounded-xl p-3 bg-gradient-to-r ${crownBg}`}>
                            <div className="flex items-start gap-2.5">
                                <Crown size={16} className={`${crownIcon} flex-shrink-0 mt-0.5`} />
                                <div className="flex-1">
                                    <p className={`text-sm font-bold ${crownTitle}`}>Or skip the wait</p>
                                    <p className={`text-xs mt-0.5 leading-relaxed ${crownText}`}>
                                        Unlimited questions. Full analytics. No pop-ups.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleUpgrade}
                            className={`w-full font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${crownBtn} text-white active:scale-[0.98]`}
                        >
                            <Lock size={16} />
                            Go Premium now
                            <ArrowRight size={14} />
                        </button>
                    </>
                )}

                {/* 5. Feedback link */}
                <button
                    onClick={handleFeedback}
                    className={`w-full text-center text-[11px] font-bold py-1 transition-colors ${linkColor}`}
                >
                    Have an idea? Tell us →
                </button>

                {/* 6. Social footer */}
                <MedraeSocialFooter onNavigate={handleDismiss} />
            </>
        );
    };

    // ─── Header accent ───
    const headerGradient = isPremium
        ? "from-emerald-500 to-teal-500"
        : "from-blue-500 to-indigo-500";

    return (
        <div
            className={`fixed inset-0 z-[9998] flex items-center justify-center p-4 transition-opacity duration-500 ${isDismissing ? "opacity-0" : "opacity-100"}`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => showX && handleDismiss()}
            />

            <div
                className={`relative bg-white dark:bg-gray-900 rounded-xl overflow-hidden max-w-md w-full max-h-[90vh] flex flex-col transition-all duration-500 ease-out ${isMounted && !isDismissing
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-[0.92] translate-y-4"
                    }`}
            >
                {/* ─── Header ─── */}
                <div className={`bg-gradient-to-r ${headerGradient} p-4 flex-shrink-0`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm leading-tight">
                                    {greeting}{isPremium ? ", Medraen" : ""}
                                </p>
                                <p className="text-white/80 text-[11px]">
                                    I'm Medrae Bot here's something for you
                                </p>
                            </div>
                        </div>

                        {/* X button */}
                        <button
                            onClick={handleDismiss}
                            className={`text-white p-1.5 rounded-xl transition-all flex items-center justify-center h-9 w-9 ${showX
                                ? "opacity-90 hover:opacity-100 hover:bg-white/10"
                                : "opacity-0 pointer-events-none"
                                }`}
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* ─── Scrollable body ─── */}
                <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                    <CardBody accent={isPremium ? "emerald" : "blue"} />
                </div>
            </div>
        </div>
    );
};

export default MedraeBot;