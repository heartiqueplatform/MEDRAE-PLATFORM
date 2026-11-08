"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Award,
    BriefcaseMedical,
    MessageCircle,
    Send,
    GraduationCap,
    ChevronRight,
    Sparkles,
    Trophy,
    Users,
    Zap,
    X,
    Gift,
    Clock,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { playSound, loadSound } from "@/lib/soundManager";
import { useSession } from "@supabase/auth-helpers-react";
import {
    getMyReferralCode,
    buildReferralLink,
    buildWhatsAppMessage,
} from "@/lib/referrals";

loadSound("start", "/sounds/start.mp3");

/* ═══════════════════════════════════════════════════════════════
   DEV PREVIEW SWITCH
   true  → popup shows every refresh, any day of the week
   false → weekend-only (production behavior)
   ═══════════════════════════════════════════════════════════════ */
const FORCE_SHOW_IN_DEV = false;
/* ═══════════════════════════════════════════════════════════════ */

interface Scenario {
    id: number;
    question: string;
    option_1: string;
    option_2: string;
    option_3: string;
    option_4: string;
    correct_option: number;
}

const backgroundImages = ["high1.png", "high2.png", "high3.png", "high4.png", "high5.png", "high6.png"];

const WHATSAPP_TOKENS = 5;
const TELEGRAM_TOKENS = 10;

const Referral: React.FC = () => {
    const [showPopup, setShowPopup] = useState(false);
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [scenarioAnswered, setScenarioAnswered] = useState(false);
    const [tokens, setTokens] = useState<number>(0);
    const [tokensToday, setTokensToday] = useState<number>(0);
    const [bgIndex, setBgIndex] = useState(0);
    const [referralCode, setReferralCode] = useState<string | null>(null);

    const session = useSession();
    const user = session?.user || null;
    const reduceMotion = useReducedMotion();

    const today = new Date().toDateString();

    useEffect(() => {
        if (!showPopup) return;
        const interval = setInterval(() => {
            setBgIndex((prev) => (prev + 1) % backgroundImages.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [showPopup]);

    useEffect(() => {
        const loadUser = async () => {
            if (!user) return;

            const dayOfWeek = new Date().getDay();
            const isWeekend = FORCE_SHOW_IN_DEV || dayOfWeek === 6 || dayOfWeek === 0;
            if (!isWeekend) return;

            const { data: profile, error } = await supabase
                .from("profiles")
                .select("tokens")
                .eq("user_id", user.id)
                .single();

            if (error) {
                console.error("Error fetching tokens:", error);
                return;
            }

            setTokens(profile?.tokens ?? 0);
            getMyReferralCode(user.id).then((code) => setReferralCode(code));

            const lastShown = localStorage.getItem(`referral_popup_${user.id}`);
            const today = new Date().toDateString();

            if (FORCE_SHOW_IN_DEV || lastShown !== today) {
                setShowPopup(true);
            }
        };
        loadUser();
    }, [user]);

    useEffect(() => {
        const fetchScenario = async () => {
            const { data, error } = await supabase.from<Scenario>("referral_scenarios").select("*");
            if (error) console.error("Error fetching scenarios:", error);
            else if (data && data.length > 0) {
                setScenario(data[Math.floor(Math.random() * data.length)]);
            }
        };
        fetchScenario();
    }, []);

    const referralLink = referralCode
        ? buildReferralLink(referralCode)
        : "https://medrae.vercel.app/";

    const giveInviteTokens = async (amount: number, vibrationStrong = false) => {
        if (!user?.id) return;
        const newTokens = tokens + amount;
        const newTokensToday = tokensToday + amount;
        const { error } = await supabase
            .from("profiles")
            .update({ tokens: newTokens })
            .eq("user_id", user.id);
        if (!error) {
            setTokens(newTokens);
            setTokensToday(newTokensToday);
        }
        if (navigator.vibrate) navigator.vibrate(vibrationStrong ? 200 : 50);
    };

    const openAndReward = (url: string, amount: number, vibrationStrong = false) => {
        const win = window.open(url, "_blank");
        if (!win) return;
        const handleFocus = () => {
            giveInviteTokens(amount, vibrationStrong);
            window.removeEventListener("focus", handleFocus);
        };
        window.addEventListener("focus", handleFocus);
    };

    const shareOnWhatsApp = () => {
        const message = referralCode
            ? buildWhatsAppMessage(referralCode)
            : `Join me on Medrae — the nursing study platform. ${referralLink}`;
        openAndReward(`https://wa.me/?text=${encodeURIComponent(message)}`, WHATSAPP_TOKENS, false);
    };

    const shareOnTelegram = () => {
        const text = referralCode
            ? `Join me on Medrae — nursing quizzes, past papers, and a full NCK curriculum. You get 1 day of Premium when you sign up:`
            : `Ready to level up your nursing knowledge? Join Medrae.`;
        openAndReward(
            `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`,
            TELEGRAM_TOKENS,
            true
        );
    };

    const handleScenarioAnswer = (answerIndex: number) => {
        setSelectedAnswer(answerIndex);
        if (scenario && answerIndex === scenario.correct_option) {
            setScenarioAnswered(true);
            playSound("start");
        } else {
            alert("Not quite. Give it another shot — you've got this.");
        }
    };

    const closePopup = () => {
        setShowPopup(false);
        setScenarioAnswered(false);
        setSelectedAnswer(null);
        if (user?.id) localStorage.setItem(`referral_popup_${user.id}`, today);
    };
    // 📣 Broadcast popup visibility so the global Footer can hide
    useEffect(() => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(
            new CustomEvent("referral-popup-visibility", {
                detail: { open: showPopup },
            })
        );
        return () => {
            window.dispatchEvent(
                new CustomEvent("referral-popup-visibility", {
                    detail: { open: false },
                })
            );
        };
    }, [showPopup]);
    if (!showPopup || !user?.id) return null;

    /* ─── Motion presets ────────────────────────────────────────── */
    const popupMotion = reduceMotion
        ? { initial: {}, animate: {}, exit: {} }
        : {
            initial: { opacity: 0, scale: 0.98 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.98 },
        };

    const headerMotion = reduceMotion
        ? { initial: {}, animate: {} }
        : {
            initial: { opacity: 0, y: -10 },
            animate: { opacity: 1, y: 0 },
        };

    return (
        <AnimatePresence>
            <motion.div
                {...popupMotion}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className="fixed inset-0 z-[9999] flex flex-col md:flex-row bg-white dark:bg-[#0d1117]"
            >
                {/* ═══════ LEFT — Background (desktop only) ═══════ */}
                <div className="hidden md:block md:w-1/2 relative overflow-hidden h-screen">
                    {backgroundImages.map((img, index) => (
                        <div
                            key={index}
                            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === bgIndex ? "opacity-100" : "opacity-0"
                                }`}
                            style={{ backgroundImage: `url(/${img})` }}
                        />
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/30">
                        <motion.div
                            initial={reduceMotion ? {} : { opacity: 0, y: 12 }}
                            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="absolute bottom-14 left-10 right-10 text-white space-y-3"
                        >
                            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500" />
                                </span>
                                Weekend Challenge
                            </div>
                            <h1 className="text-4xl font-bold leading-tight tracking-tight">
                                {scenarioAnswered ? "Challenge Complete" : "Clinical Case Challenge"}
                            </h1>
                            <p className="text-white/70 text-base max-w-md leading-relaxed">
                                {scenarioAnswered
                                    ? "Share your success and earn rewards."
                                    : "Test your clinical reasoning and earn bonus tokens."}
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* ═══════ RIGHT — Content ═══════ */}
                <div className="w-full md:w-1/2 flex flex-col h-screen overflow-hidden bg-white dark:bg-[#0d1117]">
                    {/* Header */}
                    <motion.div
                        {...headerMotion}
                        transition={{ duration: 0.24, delay: 0.06 }}
                        className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-blue-800 text-white shrink-0"
                    >
                        <BriefcaseMedical className="absolute -right-8 -top-8 w-32 h-32 opacity-10 rotate-12 pointer-events-none" />

                        <button
                            onClick={closePopup}
                            aria-label="Close"
                            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white/80 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="relative z-10 px-5 sm:px-6 pt-5 pb-6">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                                    <Award className="w-4 h-4 text-teal-100" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-100">
                                    Weekend Challenge
                                </span>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
                                {scenarioAnswered ? "Challenge Mastered" : "Clinical Case Challenge"}
                            </h2>

                            <p className="text-teal-50/85 text-[13px] leading-relaxed mt-1.5 max-w-md">
                                {scenarioAnswered
                                    ? "Brilliant work. Now share the knowledge and earn even more."
                                    : "Correct diagnosis earns you bonus tokens. Ready to prove your skills?"}
                            </p>
                        </div>
                    </motion.div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
                        <div className="px-4 sm:px-6 py-5">
                            {scenario && !scenarioAnswered ? (
                                <QuestionSection
                                    scenario={scenario}
                                    onAnswer={handleScenarioAnswer}
                                    reduceMotion={!!reduceMotion}
                                />
                            ) : scenarioAnswered ? (
                                <SuccessSection
                                    tokensToday={tokensToday}
                                    tokens={tokens}
                                    onWhatsAppShare={shareOnWhatsApp}
                                    onTelegramShare={shareOnTelegram}
                                    onClose={closePopup}
                                    reduceMotion={!!reduceMotion}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-center">
                                        <div className="w-11 h-11 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                                            Loading challenge…
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer — question state only */}
                    {!scenarioAnswered && scenario && (
                        <div
                            className="px-5 py-3 bg-white dark:bg-[#0d1117] shrink-0 flex items-center justify-center gap-1.5"
                            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
                        >
                            <Sparkles className="w-3 h-3 text-teal-500" />
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Test your clinical reasoning
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

/* ═══════ Question Section ═══════ */
const QuestionSection: React.FC<{
    scenario: Scenario;
    onAnswer: (index: number) => void;
    reduceMotion: boolean;
}> = ({ scenario, onAnswer, reduceMotion }) => {
    const options = [scenario.option_1, scenario.option_2, scenario.option_3, scenario.option_4];

    return (
        <div className="flex flex-col gap-4">
            <motion.div
                initial={reduceMotion ? {} : { opacity: 0, y: 8 }}
                animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ duration: 0.26, delay: 0.08 }}
                className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] p-4 sm:p-5"
            >
                <p className="text-slate-800 dark:text-slate-100 font-semibold text-[14.5px] leading-relaxed break-words">
                    {scenario.question}
                </p>
            </motion.div>

            <div className="flex flex-col gap-2">
                {options.map((opt, idx) => (
                    <motion.button
                        key={idx}
                        initial={reduceMotion ? {} : { opacity: 0, x: -8 }}
                        animate={reduceMotion ? {} : { opacity: 1, x: 0 }}
                        transition={{ duration: 0.22, delay: 0.14 + idx * 0.04 }}
                        whileTap={reduceMotion ? {} : { scale: 0.98 }}
                        onClick={() => onAnswer(idx + 1)}
                        className="flex items-center gap-3 w-full text-left p-3.5 rounded-xl
                                   bg-slate-50 dark:bg-white/[0.03]
                                   hover:bg-slate-100 dark:hover:bg-white/[0.06]
                                   active:bg-slate-200/70 dark:active:bg-white/[0.09]
                                   transition-colors group"
                    >
                        <span className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[11px] font-bold bg-white dark:bg-white/[0.08] text-slate-500 dark:text-slate-400 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                            {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-slate-700 dark:text-slate-200 text-[13px] font-medium leading-snug break-words flex-1">
                            {opt}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-teal-500 shrink-0 transition-colors" />
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

/* ═══════ Success Section ═══════ */
const SuccessSection: React.FC<{
    tokensToday: number;
    tokens: number;
    onWhatsAppShare: () => void;
    onTelegramShare: () => void;
    onClose: () => void;
    reduceMotion: boolean;
}> = ({ tokensToday, tokens, onWhatsAppShare, onTelegramShare, onClose, reduceMotion }) => {
    return (
        <div className="flex flex-col">
            {/* Stats — plain rows, no colors */}
            <motion.div
                initial={reduceMotion ? {} : { opacity: 0, y: 8 }}
                animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.06 }}
                className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] overflow-hidden mb-4"
            >
                <div className="flex items-center justify-between px-4 py-3">
                    <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                        <Trophy className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        Tokens earned
                    </span>
                    <span className="text-[15px] font-bold tabular-nums text-slate-900 dark:text-white">
                        +{tokensToday || 0}
                    </span>
                </div>
                <div className="h-px bg-slate-200/70 dark:bg-white/[0.06] mx-4" />
                <div className="flex items-center justify-between px-4 py-3">
                    <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                        <Award className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        Total tokens
                    </span>
                    <span className="text-[15px] font-bold tabular-nums text-slate-900 dark:text-white">
                        {tokens || 0}
                    </span>
                </div>
            </motion.div>

            {/* Rewards — plain text rows, no colored cards */}
            <motion.div
                initial={reduceMotion ? {} : { opacity: 0, y: 8 }}
                animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.12 }}
                className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] p-4 mb-4"
            >
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2.5">
                    Rewards
                </p>
                <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                        <Zap className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                                Instant tokens
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                +5 for WhatsApp, +10 for Telegram
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <Gift className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                                +2 days Premium
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                When your friend creates a real account
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Title */}
            <motion.div
                initial={reduceMotion ? {} : { opacity: 0, y: 8 }}
                animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.18 }}
                className="text-center mb-5"
            >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-white/[0.06] mb-2.5">
                    <GraduationCap className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                </div>
                <h3 className="text-[16px] font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
                    You're on fire
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-[12px] leading-relaxed max-w-sm mx-auto">
                    Share with a nursing friend. Every real signup earns you 2 days of Premium — the more you share, the longer you stay Premium free.
                </p>
            </motion.div>

            {/* Buttons — flat, no shadows */}
            <div className="flex flex-col gap-2">
                <motion.button
                    initial={reduceMotion ? {} : { opacity: 0, y: 6 }}
                    animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.24 }}
                    whileTap={reduceMotion ? {} : { scale: 0.98 }}
                    onClick={onWhatsAppShare}
                    className="w-full flex flex-col items-center justify-center gap-0.5 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold transition-colors"
                >
                    <span className="flex items-center gap-2 text-sm">
                        <MessageCircle className="w-4 h-4" />
                        Share on WhatsApp
                    </span>
                    <span className="text-[10px] font-medium opacity-90">
                        +5 tokens now, +2 days Premium when they join
                    </span>
                </motion.button>

                <motion.button
                    initial={reduceMotion ? {} : { opacity: 0, y: 6 }}
                    animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.28 }}
                    whileTap={reduceMotion ? {} : { scale: 0.98 }}
                    onClick={onTelegramShare}
                    className="w-full flex flex-col items-center justify-center gap-0.5 py-3.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold transition-colors"
                >
                    <span className="flex items-center gap-2 text-sm">
                        <Send className="w-4 h-4" />
                        Share on Telegram
                    </span>
                    <span className="text-[10px] font-medium opacity-90">
                        +10 tokens now, +2 days Premium when they join
                    </span>
                </motion.button>

                <motion.button
                    initial={reduceMotion ? {} : { opacity: 0 }}
                    animate={reduceMotion ? {} : { opacity: 1 }}
                    transition={{ duration: 0.22, delay: 0.34 }}
                    onClick={onClose}
                    className="mt-1 w-full h-11 rounded-xl text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] active:scale-[0.98] transition-all"
                >
                    Continue Learning
                </motion.button>
            </div>

            {/* Footer */}
            <motion.div
                initial={reduceMotion ? {} : { opacity: 0 }}
                animate={reduceMotion ? {} : { opacity: 1 }}
                transition={{ duration: 0.22, delay: 0.38 }}
                className="mt-4 flex items-center justify-center gap-1.5"
            >
                <Clock className="w-3 h-3 text-slate-400" />
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Rewards unlock when they actually sign up
                </p>
            </motion.div>
        </div>
    );
};

export default Referral;