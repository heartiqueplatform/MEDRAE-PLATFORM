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
    Zap,
    X,
    Gift,
    Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound, loadSound } from "@/lib/soundManager";
import { useSession } from "@supabase/auth-helpers-react";
import {
    getMyReferralCode,
    buildReferralLink,
    buildWhatsAppMessage,
} from "@/lib/referrals";

loadSound("start", "/sounds/start.mp3");

/* ═══════════════════════════════════════════════════════════════
   ✏️  TEXT SYSTEM — edit any string below, refresh, see it live
   ═══════════════════════════════════════════════════════════════ */
const TEXT = {
    // Header (question state)
    headerBadge: "Weekend Challenge",
    headerTitle: "Clinical Case Challenge",
    headerSubtitle: "Correct diagnosis earns you bonus tokens. Ready to prove your skills?",

    // Header (success state)
    headerTitleAfterWin: "Challenge Mastered!",
    headerSubtitleAfterWin: "Brilliant work! Now share the knowledge and earn even more.",

    // Success section
    successTitle: "You're on Fire!",
    successSubtitle:
        "Share with a nursing friend. Every real signup earns you 2 days of Premium — the more you share, the longer you stay Premium free.",

    // Rewards card
    rewardsCardTitle: "Share now · Earn twice",
    reward1Title: "Instant tokens",
    reward1Sub: "+5 WhatsApp · +10 Telegram",
    reward2Title: "+2 days Premium",
    reward2Sub: "When your friend creates a real account",

    // Stats labels
    statTokensEarned: "Tokens Earned",
    statTotalTokens: "Total Tokens",

    // Buttons
    whatsappBtn: "Share on WhatsApp",
    whatsappBtnSub: "+5 tokens now · +2 days Premium when they join",
    telegramBtn: "Share on Telegram",
    telegramBtnSub: "+10 tokens now · +2 days Premium when they join",
    closeBtn: "Continue Learning",

    // Footer
    footerText: "Rewards unlock when they actually sign up",
    questionFooterText: "Test your clinical reasoning",

    // Empty / loading
    loadingText: "Loading challenge…",
    wrongAnswerToast: "Not quite! Give it another shot, you've got this! 💪",
};
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

            const todayDate = new Date();
            const dayOfWeek = todayDate.getDay();
            const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;
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
            if (lastShown !== today) setShowPopup(true);
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

    const referralLink = referralCode ? buildReferralLink(referralCode) : "https://medrae.vercel.app/";

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
            : ` Join me on Medrae — the ultimate nursing study platform! ${referralLink}`;
        openAndReward(`https://wa.me/?text=${encodeURIComponent(message)}`, WHATSAPP_TOKENS, false);
    };

    const shareOnTelegram = () => {
        const text = referralCode
            ? `🧠 Join me on Medrae — nursing quizzes, past papers, and a full NCK curriculum. You get 1 day of Premium when you sign up:`
            : `🧠 Ready to level up your nursing knowledge? Join Medrae!`;
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
            alert(TEXT.wrongAnswerToast);
        }
    };

    const closePopup = () => {
        setShowPopup(false);
        setScenarioAnswered(false);
        setSelectedAnswer(null);
        if (user?.id) localStorage.setItem(`referral_popup_${user.id}`, today);
    };

    if (!showPopup || !user?.id) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex flex-col md:flex-row bg-white dark:bg-[#0d1117]"
            >
                {/* ═══════════ LEFT: CONTENT (full-bleed on phone) ═══════════ */}
                <div className="w-full md:w-1/2 flex flex-col h-screen overflow-hidden">
                    {/* Header — gradient, safe-area top, edge-to-edge */}
                    <div
                        className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-blue-800 text-white shrink-0"
                        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
                    >
                        <BriefcaseMedical className="absolute -right-8 -top-8 w-32 h-32 opacity-10 rotate-12 pointer-events-none" />

                        <button
                            onClick={closePopup}
                            aria-label="Close"
                            className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white flex items-center justify-center"
                            style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="relative z-10 px-5 pt-4 pb-5">
                            <div className="flex items-center gap-2.5 mb-2.5">
                                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                                    <Award className="w-4 h-4 text-teal-100" />
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-teal-100">
                                    {TEXT.headerBadge}
                                </span>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
                                {scenarioAnswered ? TEXT.headerTitleAfterWin : TEXT.headerTitle}
                            </h2>

                            <p className="text-teal-50/85 text-[13px] leading-relaxed mt-1.5 max-w-md">
                                {scenarioAnswered ? TEXT.headerSubtitleAfterWin : TEXT.headerSubtitle}
                            </p>
                        </div>
                    </div>

                    {/* Body — scrollable, edge-to-edge content */}
                    <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
                        <div className="px-4 sm:px-5 py-5">
                            {scenario && !scenarioAnswered ? (
                                <QuestionSection scenario={scenario} onAnswer={handleScenarioAnswer} />
                            ) : scenarioAnswered ? (
                                <SuccessSection
                                    tokensToday={tokensToday}
                                    tokens={tokens}
                                    onWhatsAppShare={shareOnWhatsApp}
                                    onTelegramShare={shareOnTelegram}
                                    onClose={closePopup}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-center">
                                        <div className="w-11 h-11 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                                            {TEXT.loadingText}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer — only in question state */}
                    {!scenarioAnswered && scenario && (
                        <div
                            className="px-5 py-3 bg-white dark:bg-[#0d1117] shrink-0 flex items-center justify-center gap-1.5"
                            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
                        >
                            <Sparkles className="w-3 h-3 text-teal-500" />
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {TEXT.questionFooterText}
                            </p>
                        </div>
                    )}
                </div>

                {/* ═══════════ RIGHT: IMAGE SLIDESHOW (desktop only) ═══════════ */}
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
                        <div className="absolute bottom-14 left-10 right-10 text-white space-y-3">
                            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500" />
                                </span>
                                {TEXT.headerBadge}
                            </div>
                            <h1 className="text-4xl font-bold leading-tight">
                                {scenarioAnswered ? TEXT.headerTitleAfterWin : TEXT.headerTitle}
                            </h1>
                            <p className="text-white/70 text-base max-w-md leading-relaxed">
                                {scenarioAnswered ? TEXT.headerSubtitleAfterWin : TEXT.headerSubtitle}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

/* ─── Question Section — full-bleed options on phone ─── */
const QuestionSection: React.FC<{
    scenario: Scenario;
    onAnswer: (index: number) => void;
}> = ({ scenario, onAnswer }) => {
    const options = [scenario.option_1, scenario.option_2, scenario.option_3, scenario.option_4];

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-slate-100/80 dark:bg-white/[0.04] rounded-2xl p-4 sm:p-5">
                <p className="text-slate-800 dark:text-slate-100 font-semibold text-[15px] leading-relaxed break-words">
                    {scenario.question}
                </p>
            </div>

            <div className="flex flex-col gap-2">
                {options.map((opt, idx) => (
                    <motion.button
                        key={idx}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onAnswer(idx + 1)}
                        className="flex items-center gap-3 w-full text-left p-3.5 rounded-xl
                                   bg-slate-100/70 dark:bg-white/[0.04]
                                   hover:bg-teal-50 dark:hover:bg-teal-500/10
                                   active:bg-teal-100/70 dark:active:bg-teal-500/20
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

/* ─── Success Section — clean "table" rows, edge-to-edge buttons ─── */
const SuccessSection: React.FC<{
    tokensToday: number;
    tokens: number;
    onWhatsAppShare: () => void;
    onTelegramShare: () => void;
    onClose: () => void;
}> = ({ tokensToday, tokens, onWhatsAppShare, onTelegramShare, onClose }) => {
    return (
        <div className="flex flex-col">
            {/* Stats — flat table rows */}
            <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] overflow-hidden mb-4">
                <div className="flex items-center justify-between px-4 py-3">
                    <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                        <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        {TEXT.statTokensEarned}
                    </span>
                    <span className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        +{tokensToday || 5}
                    </span>
                </div>
                <div className="h-px bg-slate-200/70 dark:bg-white/[0.06] mx-4" />
                <div className="flex items-center justify-between px-4 py-3">
                    <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                        <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        {TEXT.statTotalTokens}
                    </span>
                    <span className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
                        {tokens || 0}
                    </span>
                </div>
            </div>

            {/* Reward explainer */}
            <div className="rounded-2xl p-4 mb-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/25 dark:to-purple-950/25">
                <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-300">
                        {TEXT.rewardsCardTitle}
                    </p>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-3 bg-white/70 dark:bg-slate-900/40 rounded-xl p-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                            <Zap size={15} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                {TEXT.reward1Title}
                            </p>
                            <p className="text-[10.5px] text-emerald-700 dark:text-emerald-400 leading-tight">
                                {TEXT.reward1Sub}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white/70 dark:bg-slate-900/40 rounded-xl p-2.5">
                        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                            <Gift size={15} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-violet-900 dark:text-violet-200">
                                {TEXT.reward2Title}
                            </p>
                            <p className="text-[10.5px] text-violet-700 dark:text-violet-400 leading-tight">
                                {TEXT.reward2Sub}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Title + subtitle */}
            <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 dark:bg-emerald-500/15 rounded-full mb-2.5">
                    <GraduationCap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                    {TEXT.successTitle}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-[12px] leading-relaxed max-w-sm mx-auto">
                    {TEXT.successSubtitle}
                </p>
            </div>

            {/* Edge-to-edge action buttons */}
            <div className="flex flex-col gap-2">
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={onWhatsAppShare}
                    className="w-full flex flex-col items-center justify-center gap-0.5 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold transition-colors"
                >
                    <span className="flex items-center gap-2 text-sm">
                        <MessageCircle className="w-4 h-4" />
                        {TEXT.whatsappBtn}
                    </span>
                    <span className="text-[10px] font-medium opacity-90">
                        {TEXT.whatsappBtnSub}
                    </span>
                </motion.button>

                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={onTelegramShare}
                    className="w-full flex flex-col items-center justify-center gap-0.5 py-3.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold transition-colors"
                >
                    <span className="flex items-center gap-2 text-sm">
                        <Send className="w-4 h-4" />
                        {TEXT.telegramBtn}
                    </span>
                    <span className="text-[10px] font-medium opacity-90">
                        {TEXT.telegramBtnSub}
                    </span>
                </motion.button>

                <button
                    onClick={onClose}
                    className="mt-2 w-full h-11 rounded-xl text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] active:scale-[0.98] transition-all"
                >
                    {TEXT.closeBtn} →
                </button>
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {TEXT.footerText}
                </p>
            </div>
        </div>
    );
};

export default Referral;