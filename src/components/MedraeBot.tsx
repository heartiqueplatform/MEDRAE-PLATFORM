// src/components/MedraeBot.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    X,
    MessageCircle,
    Sparkles,
    Lightbulb,
    Lock,
    Crown,
    ArrowRight,
    BookOpen,
    Brain,
    Home,
    Heart,
    Phone,
} from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";
import MedraeSocialFooter from "@/components/MedraeSocialFooter";
import { getCachedPremium, resolveSubscription } from "@/lib/subscription";

// ============================================
// 🎛️ OVERRIDE BUMP SECTION
// ============================================
const SHOW_BOT_FOR_PREMIUM = false;
const BUMP_VERSION = "v1";
// ============================================

// ============================================
// 🧪 TESTING OVERRIDE — DELETE THIS LINE TO RESTORE NORMAL BEHAVIOR
// ============================================
const FORCE_SHOW_ON_REFRESH = false;
// ============================================

// ============================================
// 🔒 LOCKOUT SETTINGS
// ============================================
const LOCKOUT_SECONDS = 7;
// ============================================

// ─── Support number (shown on the card) ───
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
    if (hour >= 5 && hour < 12) return "Good morning!";
    if (hour >= 12 && hour < 17) return "Good afternoon!";
    if (hour >= 17 && hour < 21) return "Good evening!";
    return "Good night!";
};

const MedraeBot = () => {
    const navigate = useNavigate();
    const session = useSession();

    // ─── Premium status — shared cache, offline-safe, synchronous ───
    const [isPremium, setIsPremium] = useState<boolean>(
        () => getCachedPremium(session?.user?.id) ?? false
    );
    const [premiumResolved, setPremiumResolved] = useState<boolean>(
        () => getCachedPremium(session?.user?.id) !== null
    );

    const [isVisible, setIsVisible] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(LOCKOUT_SECONDS);
    const [isMounted, setIsMounted] = useState(false);

    // ─── Time-aware greeting, computed once on mount ───
    const [greeting] = useState<string>(() => getTimeGreeting());

    // ─── Premium: seed from cache when auth hydrates ───
    useEffect(() => {
        if (!session?.user?.id) return;
        const cached = getCachedPremium(session.user.id);
        if (cached !== null) {
            setIsPremium(cached);
            setPremiumResolved(true);
        }
    }, [session?.user?.id]);

    // ─── Premium: single background refresh, sets resolved flag ───
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

    // ─── Track a fresh app open ───
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (FORCE_SHOW_ON_REFRESH) return;

        const alreadyOpened = sessionStorage.getItem(BOT_SESSION_FLAG);
        if (alreadyOpened) return;

        sessionStorage.setItem(BOT_SESSION_FLAG, "true");

        try {
            const today = new Date().toDateString();
            const storedDate = localStorage.getItem(BOT_OPEN_DATE_KEY);

            let count = 0;

            if (storedDate === today) {
                count = parseInt(localStorage.getItem(BOT_OPEN_COUNT_KEY) || "0", 10);
            } else {
                count = 0;
                localStorage.setItem(BOT_OPEN_DATE_KEY, today);
            }

            count += 1;
            localStorage.setItem(BOT_OPEN_COUNT_KEY, count.toString());
        } catch {
            // ignore
        }
    }, []);

    // ─── Decide whether to show the bot ───
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

            if (seenBump !== BUMP_VERSION) {
                setIsVisible(true);
                setHasChecked(true);
                return;
            }

            if (storedDate === today && openCount > MAX_SHOWS_PER_DAY) {
                setHasChecked(true);
                return;
            }

            if (sessionStorage.getItem(BOT_DISMISSED_THIS_OPEN)) {
                setHasChecked(true);
                return;
            }

            setIsVisible(true);
            setHasChecked(true);
        } catch {
            setHasChecked(true);
        }
    }, [session, isPremium, hasChecked, premiumResolved]);

    // ─── Trigger overlay mount animation (fade + glide in) ───
    useEffect(() => {
        if (!isVisible) {
            setIsMounted(false);
            return;
        }

        let raf2: number | null = null;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => setIsMounted(true));
        });

        return () => {
            cancelAnimationFrame(raf1);
            if (raf2 !== null) cancelAnimationFrame(raf2);
        };
    }, [isVisible]);

    // ─── Countdown timer (lockout) ───
    useEffect(() => {
        if (!isVisible) return;
        if (secondsLeft <= 0) return;

        const timer = setTimeout(() => {
            setSecondsLeft((s) => Math.max(0, s - 1));
        }, 1000);

        return () => clearTimeout(timer);
    }, [isVisible, secondsLeft]);

    const isLocked = secondsLeft > 0;

    const markDismissed = useCallback(() => {
        try {
            sessionStorage.setItem(BOT_DISMISSED_THIS_OPEN, "true");
            localStorage.setItem(BOT_STORAGE_KEY, Date.now().toString());
            localStorage.setItem(BOT_BUMP_KEY, BUMP_VERSION);
        } catch {
            // ignore
        }
    }, []);

    const closeAndThen = useCallback((action?: () => void) => {
        if (isLocked) return;

        markDismissed();
        setIsDismissing(true);

        setTimeout(() => {
            setIsVisible(false);
            setIsDismissing(false);
            setIsMounted(false);
            if (action) action();
        }, 500);
    }, [isLocked, markDismissed]);

    const handleDismiss = useCallback(() => closeAndThen(), [closeAndThen]);
    const handleUpgrade = useCallback(() => closeAndThen(() => navigate("/subscription")), [closeAndThen, navigate]);
    const handleSuggestion = useCallback(() => closeAndThen(() => navigate("/feedback")), [closeAndThen, navigate]);

    // ─── If premium resolves mid-session, hide the bot gracefully ───
    useEffect(() => {
        if (!isPremium || SHOW_BOT_FOR_PREMIUM) return;
        if (!isVisible) return;

        setIsVisible(false);
        setIsDismissing(false);
        setIsMounted(false);
        setSecondsLeft(LOCKOUT_SECONDS);
    }, [isPremium, isVisible]);

    // ─── Escape key ───
    useEffect(() => {
        if (!isVisible) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isLocked) handleDismiss();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isVisible, isLocked, handleDismiss]);

    if (!isVisible && !isDismissing) return null;
    if (isPremium && !SHOW_BOT_FOR_PREMIUM) return null;

    const LockoutRing = () => (
        <span
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
                background: `conic-gradient(rgba(255,255,255,0.9) ${((LOCKOUT_SECONDS - secondsLeft) / LOCKOUT_SECONDS) * 360
                    }deg, transparent 0deg)`,
                mask: "radial-gradient(circle, transparent 60%, black 62%)",
                WebkitMask: "radial-gradient(circle, transparent 60%, black 62%)",
            }}
        />
    );

    // ─── Top 3 Features ───
    const TopFeatures = ({ accent }: { accent: "emerald" | "blue" }) => {
        const features = [
            {
                icon: <BookOpen size={16} />,
                title: "Full KRCHN Curriculum",
                desc: "Every unit, semester, and topic mapped to NCK — organized so you study exactly what matters.",
                path: "/nursing",
            },
            {
                icon: <Brain size={16} />,
                title: "Medrae Question Bank",
                desc: "6,000+ verified NCK-style questions arranged by unit and condition. Practice smarter, not harder.",
                path: "/Medrae-quizzes",
            },
            {
                icon: <Home size={16} />,
                title: "Survival Hub",
                desc: "Find exam buddies, housing, hospitals, placements, and exam centers. Everything a nursing student needs.",
                path: "/survival-hub",
            },
        ];

        const iconBg = accent === "emerald"
            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
            : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300";

        const cardBg = accent === "emerald"
            ? "hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            : "hover:bg-blue-50 dark:hover:bg-blue-950/20";

        const titleColor = accent === "emerald"
            ? "text-emerald-800 dark:text-emerald-300"
            : "text-blue-800 dark:text-blue-300";

        return (
            <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className={titleColor} />
                    <p className={`text-[11px] font-bold tracking-wider ${titleColor}`}>
                        Top 3 Features For You
                    </p>
                </div>
                {features.map((f, i) => (
                    <button
                        key={i}
                        onClick={() => !isLocked && closeAndThen(() => navigate(f.path))}
                        disabled={isLocked}
                        className={`w-full text-left flex items-start gap-2.5 rounded-2xl p-3 transition-colors ${cardBg} ${isLocked ? "opacity-50 cursor-not-allowed" : "active:scale-[0.99]"
                            }`}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                            {f.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                {f.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                                {f.desc}
                            </p>
                        </div>
                        <ArrowRight size={14} className="text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0" />
                    </button>
                ))}
            </div>
        );
    };

    // ─── Listen / Support block ───
    const ListenBlock = ({ accent }: { accent: "emerald" | "blue" }) => {
        const wrapperBg = "bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20";
        const iconColor = "text-rose-600 dark:text-rose-400";
        const titleColor = "text-rose-800 dark:text-rose-300";
        const textColor = "text-rose-700 dark:text-rose-400";

        const waLink = `https://wa.me/${SUPPORT_WHATSAPP}`;

        return (
            <div className={`rounded-2xl p-3 ${wrapperBg}`}>
                <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 mt-0.5">
                        <Heart size={16} className={iconColor} />
                    </div>
                    <div className="flex-1">
                        <p className={`text-sm font-bold ${titleColor}`}>
                            Medrae is here to listen 🤍
                        </p>
                        <p className={`text-xs mt-1 leading-relaxed ${textColor}`}>
                            Not just for support ~ talk to us. Need someone to lean on, a question researched, or help finding your way? Our WhatsApp helpline is open for you.
                        </p>
                        <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => isLocked && e.preventDefault()}
                            className={`mt-2.5 inline-flex items-center gap-2 font-bold text-xs py-2 px-3 rounded-xl transition-all ${isLocked
                                ? "bg-rose-200 dark:bg-rose-900/40 cursor-not-allowed text-white/70"
                                : "bg-rose-600 hover:bg-rose-700 text-white active:scale-[0.98]"
                                }`}
                        >
                            <Phone size={14} />
                            Talk to Us · {SUPPORT_PHONE_DISPLAY}
                        </a>
                    </div>
                </div>
            </div>
        );
    };

    // ─── PREMIUM USER VIEW ───
    if (isPremium) {
        return (
            <div
                className={`fixed inset-0 z-[9998] flex items-center justify-center p-4 transition-opacity duration-500 ${isDismissing ? "opacity-0" : "opacity-100"
                    }`}
            >
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={() => !isLocked && handleDismiss()}
                />

                <div
                    className={`relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl shadow-emerald-500/20 overflow-hidden max-w-md w-full max-h-[90vh] flex flex-col transition-all duration-500 ease-out ${isMounted && !isDismissing
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-[0.92] translate-y-4"
                        }`}
                >
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-5 flex-shrink-0">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-base leading-tight">{greeting} Medraen</p>
                                    <p className="text-white/80 text-xs">I'm Medrae, your assistant</p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                disabled={isLocked}
                                className={`relative text-white p-1.5 rounded-full transition-all flex items-center justify-center h-9 w-9 ${isLocked
                                    ? "opacity-60 cursor-not-allowed"
                                    : "opacity-90 hover:opacity-100 hover:bg-white/10"
                                    }`}
                                aria-label={isLocked ? `Close in ${secondsLeft}s` : "Close"}
                            >
                                {isLocked ? (
                                    <>
                                        <span className="text-sm font-bold">{secondsLeft}</span>
                                        <LockoutRing />
                                    </>
                                ) : (
                                    <X size={20} />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="p-5 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            Hey! Just checking in. If you ever have trouble loading pages, try{" "}
                            <strong className="text-emerald-600 dark:text-emerald-400">logging out and logging back in</strong>{" "}
                            — it fixes most issues instantly.
                        </p>

                        <TopFeatures accent="emerald" />

                        <ListenBlock accent="emerald" />

                        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-3">
                            <div className="flex items-start gap-2.5">
                                <Lightbulb className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                                        Have an idea for us?
                                    </p>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
                                        Suggest a special question batch, share a weak area you'd love us to focus on, or tell us what would help you pass.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSuggestion}
                            disabled={isLocked}
                            className={`w-full font-bold text-sm py-3 rounded-2xl transition-all flex items-center justify-center gap-2 ${isLocked
                                ? "bg-emerald-400 cursor-not-allowed text-white/70"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]"
                                }`}
                        >
                            <MessageCircle size={18} />
                            Share Your Idea
                        </button>

                        <MedraeSocialFooter onNavigate={handleDismiss} />
                    </div>
                </div>
            </div>
        );
    }

    // ─── FREE USER VIEW ───
    return (
        <div
            className={`fixed inset-0 z-[9998] flex items-center justify-center p-4 transition-opacity duration-500 ${isDismissing ? "opacity-0" : "opacity-100"
                }`}
        >
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => !isLocked && handleDismiss()}
            />

            <div
                className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-none overflow-hidden max-w-md w-full max-h-[90vh] flex flex-col transition-all duration-500 ease-out ${isMounted && !isDismissing
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-[0.92] translate-y-4"
                    }`}
            >
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-5 flex-shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-base leading-tight">{greeting}</p>
                                <p className="text-white/80 text-xs">I'm Medrae, your assistant</p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            disabled={isLocked}
                            className={`relative text-white p-1.5 rounded-full transition-all flex items-center justify-center h-9 w-9 ${isLocked
                                ? "opacity-60 cursor-not-allowed"
                                : "opacity-90 hover:opacity-100 hover:bg-white/10"
                                }`}
                            aria-label={isLocked ? `Close in ${secondsLeft}s` : "Close"}
                        >
                            {isLocked ? (
                                <>
                                    <span className="text-sm font-bold">{secondsLeft}</span>
                                    <LockoutRing />
                                </>
                            ) : (
                                <X size={20} />
                            )}
                        </button>
                    </div>
                </div>

                <div className="p-5 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        Hey! Just checking in. If you ever have trouble loading pages, try{" "}
                        <strong className="text-blue-600 dark:text-blue-400">logging out and logging back in</strong>{" "}
                        — it fixes most issues instantly.
                    </p>

                    <TopFeatures accent="blue" />

                    <ListenBlock accent="blue" />

                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-3">
                        <div className="flex items-start gap-2.5">
                            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
                                    Have an idea for us?
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5 leading-relaxed">
                                    Suggest a special question batch, share a weak area you'd love us to focus on, or tell us what would help you pass.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl p-3">
                        <div className="flex items-start gap-2.5">
                            <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                    Go Premium · Hide this forever
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                                    Get unlimited questions, full analytics, and never see this card again.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={handleSuggestion}
                            disabled={isLocked}
                            className={`w-full font-bold text-sm py-3 rounded-2xl transition-all flex items-center justify-center gap-2 ${isLocked
                                ? "bg-blue-400 cursor-not-allowed text-white/70"
                                : "bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]"
                                }`}
                        >
                            <MessageCircle size={18} />
                            Share Your Idea
                        </button>

                        <button
                            onClick={handleUpgrade}
                            disabled={isLocked}
                            className={`w-full font-bold text-sm py-3 rounded-2xl transition-all flex items-center justify-center gap-2 ${isLocked
                                ? "bg-amber-300 cursor-not-allowed text-white/70"
                                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white active:scale-[0.98]"
                                }`}
                        >
                            <Lock size={18} />
                            I don't want to see this
                            <ArrowRight size={16} />
                        </button>
                    </div>

                    <MedraeSocialFooter onNavigate={handleDismiss} />
                </div>
            </div>
        </div>
    );
};

export default MedraeBot;