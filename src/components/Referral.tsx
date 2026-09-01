"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
    Award,
    BriefcaseMedical,
    MessageCircle,
    Send,
    GraduationCap,
    ChevronRight,
    Sparkles,
    Users,
    Trophy,
    Zap,
    X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound, loadSound } from "@/lib/soundManager";
import { useSession } from "@supabase/auth-helpers-react";

loadSound("start", "/sounds/start.mp3");

interface Scenario {
    id: number;
    question: string;
    option_1: string;
    option_2: string;
    option_3: string;
    option_4: string;
    correct_option: number;
}

const backgroundImages = [
    "high1.png",
    "high2.png",
    "high3.png",
    "high4.png",
    "high5.png",
    "high6.png",
];
// Add these at the very top of the file, after the imports
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

    const session = useSession();
    const user = session?.user || null;

    const today = new Date().toDateString();

    // Background image slideshow
    useEffect(() => {
        if (!showPopup) return;

        const interval = setInterval(() => {
            setBgIndex((prev) => (prev + 1) % backgroundImages.length);
        }, 6000);

        return () => clearInterval(interval);
    }, [showPopup]);

    // Load user data on mount
    useEffect(() => {
        const loadUser = async () => {
            if (!user) return;

            const todayDate = new Date();
            const dayOfWeek = todayDate.getDay();
            // Check if it's weekend (Saturday = 6, Sunday = 0)
            const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;

            // Only proceed if it's weekend
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

            // Check if we've already shown the popup today
            const lastShown = localStorage.getItem(`referral_popup_${user.id}`);
            const today = new Date().toDateString();

            if (lastShown !== today) {
                setShowPopup(true);
            }
        };

        loadUser();
    }, [user]);

    // Fetch random scenario
    useEffect(() => {
        const fetchScenario = async () => {
            const { data, error } = await supabase
                .from<Scenario>("referral_scenarios")
                .select("*");

            if (error) {
                console.error("Error fetching scenarios:", error);
            } else if (data && data.length > 0) {
                setScenario(data[Math.floor(Math.random() * data.length)]);
            }
        };

        fetchScenario();
    }, []);

    const referralLink = `https://medrae.vercel.app/`;

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

        if (navigator.vibrate) {
            navigator.vibrate(vibrationStrong ? 200 : 50);
        }
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
        const message = encodeURIComponent(
            `🚀 Join me on MedRae - the ultimate medical challenge platform! Test your knowledge, earn tokens, and compete with colleagues. Start your journey: ${referralLink}`
        );
        openAndReward(`https://wa.me/?text=${message}`, WHATSAPP_TOKENS, false);
    };

    const shareOnTelegram = () => {
        const message = encodeURIComponent(
            `🧠 Ready to level up your medical knowledge? Join MedRae and challenge yourself with clinical cases! Earn rewards and become a better clinician. Start here: ${referralLink}`
        );
        openAndReward(
            `https://t.me/share/url?url=${referralLink}&text=${message}`,
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
            alert("Not quite! Give it another shot, you've got this! 💪");
        }
    };

    const closePopup = () => {
        setShowPopup(false);
        setScenarioAnswered(false);
        setSelectedAnswer(null);
        if (user?.id) {
            localStorage.setItem(`referral_popup_${user.id}`, today);
        }
    };

    // Return early if conditions not met
    if (!showPopup || !user?.id) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex flex-col md:flex-row bg-muted/100 dark:bg-muted/100"
            >
                {/* LEFT SIDE - Background Images (Desktop Only) */}
                <div className="hidden md:block md:w-1/2 relative overflow-hidden h-screen sticky top-0">
                    {backgroundImages.map((img, index) => (
                        <div
                            key={index}
                            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === bgIndex ? "opacity-100 scale-105" : "opacity-0 scale-100"
                                }`}
                            style={{
                                backgroundImage: `url(/${img})`,  // ← Changed this line
                                transition: 'opacity 1s ease-in-out, transform 10s linear'
                            }}
                        />
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40">
                        <div className="absolute bottom-16 left-12 right-12 text-white space-y-4">
                            <div className="inline-flex items-center gap-2 bg-teal-600/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-xs font-semibold tracking-wider uppercase">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                                </span>
                                Weekend Challenge
                            </div>
                            <h1 className="text-5xl font-bold leading-tight">
                                {scenarioAnswered ? "🎉 Challenge Complete!" : "Clinical Case Challenge"}
                            </h1>
                            <p className="text-gray-300 text-lg max-w-md">
                                {scenarioAnswered
                                    ? "Share your success and earn rewards!"
                                    : "Test your clinical reasoning and earn bonus tokens."
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE - Content (Full width on mobile) */}
                <div className="w-full md:w-1/2 flex flex-col h-screen overflow-hidden bg-muted/100 dark:bg-muted/100">
                    {/* Header - Full width gradient with close button */}
                    <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-blue-800 text-white relative shrink-0">
                        <BriefcaseMedical className="absolute -right-8 -top-8 w-32 h-32 opacity-10 rotate-12" />

                        <button
                            onClick={closePopup}
                            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="relative z-10 px-6 py-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                                    <Award className="w-5 h-5 text-teal-100" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-teal-100">
                                    Weekend Challenge
                                </span>
                            </div>

                            <h2 className="text-2xl font-bold tracking-tight font-serif">
                                {scenarioAnswered ? "🎉 Challenge Mastered!" : "Clinical Case Challenge"}
                            </h2>

                            {!scenarioAnswered && scenario && (
                                <p className="text-teal-50/80 text-sm mt-2 font-medium">
                                    Correct diagnosis earns you bonus tokens. Ready to prove your skills?
                                </p>
                            )}

                            {scenarioAnswered && (
                                <p className="text-teal-50/80 text-sm mt-2 font-medium">
                                    Brilliant work! Now share the knowledge and earn even more tokens.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Content - Scrollable - Only show if scenario exists */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-muted/100 dark:bg-muted/100">
                        <div className="px-6 py-6">
                            {scenario && !scenarioAnswered ? (
                                <QuestionSection
                                    scenario={scenario}
                                    onAnswer={handleScenarioAnswer}
                                />
                            ) : scenarioAnswered ? (
                                <SuccessSection
                                    tokensToday={tokensToday}
                                    tokens={tokens}
                                    onWhatsAppShare={shareOnWhatsApp}
                                    onTelegramShare={shareOnTelegram}
                                    onClose={closePopup}
                                />
                            ) : (
                                // Loading state
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-center">
                                        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-slate-500 dark:text-slate-400">Loading challenge...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer - Edge to edge - Only show if not answered */}
                    {!scenarioAnswered && scenario && (
                        <div className="px-6 py-4 bg-muted/100 dark:bg-muted/100 border-t border-slate-200/50 dark:border-slate-800/50 shrink-0">
                            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                                <Sparkles className="w-3 h-3 inline mr-1" />
                                Test your clinical reasoning
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

// Question Section Component - No borders
const QuestionSection: React.FC<{
    scenario: Scenario;
    onAnswer: (index: number) => void;
}> = ({ scenario, onAnswer }) => {
    const options = [
        scenario.option_1,
        scenario.option_2,
        scenario.option_3,
        scenario.option_4,
    ];

    return (
        <div className="flex flex-col gap-6">
            {/* Question - No border, just subtle bg */}
            <div className="bg-slate-100/80 dark:bg-slate-800/50 p-6 rounded-2xl">
                <p className="text-slate-800 dark:text-slate-100 font-semibold text-base leading-relaxed break-words font-serif">
                    {scenario.question}
                </p>
            </div>

            {/* Options - No borders */}
            <div className="grid gap-3">
                {options.map((opt, idx) => (
                    <motion.button
                        key={idx}
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onAnswer(idx + 1)}
                        className="flex items-center justify-between w-full text-left p-4 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all group"
                    >
                        <span className="text-slate-700 dark:text-slate-300 text-sm font-medium group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors break-words flex-1 pr-2">
                            {opt}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 flex-shrink-0" />
                    </motion.button>
                ))}
            </div>

            {/* Progress indicator */}
            <div className="flex justify-center gap-1 mt-2">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

// Success Section Component - No borders
const SuccessSection: React.FC<{
    tokensToday: number;
    tokens: number;
    onWhatsAppShare: () => void;
    onTelegramShare: () => void;
    onClose: () => void;
}> = ({ tokensToday, tokens, onWhatsAppShare, onTelegramShare, onClose }) => {
    return (
        <div className="flex flex-col">
            {/* Stats Banner - No borders */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-50/80 dark:bg-emerald-900/20 rounded-2xl p-4 text-center">
                    <Trophy className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-serif">
                        +{tokensToday || 5}
                    </p>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Tokens Earned
                    </p>
                </div>
                <div className="bg-blue-50/80 dark:bg-blue-900/20 rounded-2xl p-4 text-center">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-serif">
                        {tokens || 0}
                    </p>
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        Total Tokens
                    </p>
                </div>
            </div>

            {/* Message */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100/80 dark:bg-emerald-900/30 rounded-full mb-4">
                    <GraduationCap className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 font-serif">
                    You're on Fire! 🔥
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
                    Your clinical skills are sharp! Now spread the word and earn even more rewards.
                    Every referral brings you closer to becoming a MedRae legend.
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onWhatsAppShare}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl font-bold shadow-lg shadow-green-200/50 dark:shadow-none transition-all text-sm"
                >
                    <MessageCircle className="w-5 h-5" />
                    <span>Share on WhatsApp ✨ +{WHATSAPP_TOKENS || 5} tokens</span>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onTelegramShare}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-2xl font-bold transition-all text-sm"
                >
                    <Send className="w-5 h-5" />
                    <span>Share on Telegram 🚀 +{TELEGRAM_TOKENS || 10} tokens</span>
                </motion.button>

                <button
                    onClick={onClose}
                    className="mt-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold text-xs uppercase tracking-wider transition-colors py-2"
                >
                    Continue Learning →
                </button>
            </div>

            {/* Motivational Footer */}
            <div className="mt-6 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                    <Zap className="w-3 h-3 inline mr-1" />
                    Share the knowledge, earn the rewards
                </p>
            </div>
        </div>
    );
};

export default Referral;