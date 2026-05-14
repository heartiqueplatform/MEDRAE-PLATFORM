"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, UserPlus } from "lucide-react";
import { Award, BriefcaseMedical, Share2, MessageCircle, Send, GraduationCap, ChevronRight } from "lucide-react";


import { motion } from "framer-motion";
import { playSound, loadSound } from "@/lib/soundManager";
import { useSession } from "@supabase/auth-helpers-react"; // ✅ add this
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
const Referral: React.FC = () => {
    const [showPopup, setShowPopup] = useState(false);
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [scenarioAnswered, setScenarioAnswered] = useState(false);

    const [tokens, setTokens] = useState<number>(0);
    const [tokensToday, setTokensToday] = useState<number>(0);

    const session = useSession();       // current session
    const user = session?.user || null; // current user object
    const WHATSAPP_TOKENS = 5;
    const TELEGRAM_TOKENS = 10;
    const today = new Date().toDateString();

    const Coin = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline-block" viewBox="0 0 24 24" stroke="none">
            <circle cx="12" cy="12" r="10" stroke="#FFD700" strokeWidth="2" fill="#FFD700" />
            <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="white" fontFamily="Arial, Helvetica, sans-serif">$</text>
        </svg>
    );

    useEffect(() => {
        const loadUser = async () => {
            if (!user) return;

            const todayDate = new Date();
            const dayOfWeek = todayDate.getDay();

            // Weekend check
            if (dayOfWeek !== 6 && dayOfWeek !== 0) return;

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

            const lastShown = localStorage.getItem(`referral_popup_${user.id}`);
            if (lastShown !== today) {
                setShowPopup(true);
            }
        };

        loadUser();
    }, [user]);
    // Fetch random scenario
    useEffect(() => {
        const fetchScenario = async () => {
            const { data, error } = await supabase.from<Scenario>("referral_scenarios").select("*");
            if (error) console.error("Error fetching scenarios:", error);
            else if (data && data.length > 0) setScenario(data[Math.floor(Math.random() * data.length)]);
        };
        fetchScenario();
    }, []);
    const referralLink = `https://medrae.vercel.app/`;
    const giveInviteTokens = async (amount: number, vibrationStrong = false) => {
        if (!user?.id) return; // ✅
        const newTokens = tokens + amount;
        const newTokensToday = tokensToday + amount;
        const { error } = await supabase.from("profiles").update({ tokens: newTokens }).eq("user_id", user?.id);
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
        const message = encodeURIComponent(`I found this cool medical study challenge! Earn tokens and challenge your friends: ${referralLink}`);
        openAndReward(`https://wa.me/?text=${message}`, WHATSAPP_TOKENS, false);
    };
    const shareOnTelegram = () => {
        const message = encodeURIComponent(`I found this cool medical study challenge! Earn tokens and challenge your friends: ${referralLink}`);
        openAndReward(`https://t.me/share/url?url=${referralLink}&text=${message}`, TELEGRAM_TOKENS, true);
    };
    const handleScenarioAnswer = (answerIndex: number) => {
        setSelectedAnswer(answerIndex);
        if (scenario && answerIndex === scenario.correct_option) {
            setScenarioAnswered(true);
            playSound("start"); // play sound on correct
        } else {
            alert("Incorrect! Try again.");
        }
    };

    const closePopup = () => {
        setShowPopup(false);
        if (user?.id) localStorage.setItem(`referral_popup_${user.id}`, today); //
    };

    return (


        <>
            {showPopup && user?.id && scenario && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
                >
                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden bg-white dark:bg-slate-900 border border-white/20"
                    >
                        {/* Header: Medical Excellence Theme */}
                        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-blue-800 p-8 text-white relative overflow-hidden">
                            {/* Decorative Background Pattern (Optional) */}
                            <BriefcaseMedical className="absolute -right-4 -top-4 w-32 h-32 opacity-10 rotate-12" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                                        <Award className="w-6 h-6 text-teal-100" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-teal-100">
                                        Weekend Clinical Challenge
                                    </span>
                                </div>
                                <h2 className="text-2xl font-black tracking-tight">
                                    {scenarioAnswered ? "Challenge Mastered!" : "Clinical Case Study"}
                                </h2>

                                <div className="mt-4">
                                    {scenarioAnswered ? (
                                        <div className="flex items-center gap-2 bg-black/20 w-fit px-4 py-2 rounded-full border border-white/10">
                                            <span className="text-sm font-medium">Balance:</span>
                                            <span className="text-lg font-bold text-yellow-400">{tokens}</span>
                                            <span className="text-[10px] uppercase font-bold text-teal-100">Tokens</span>
                                        </div>
                                    ) : (
                                        <p className="text-teal-50/80 text-sm leading-relaxed max-w-[90%]">
                                            Analyze the scenario below. A correct diagnosis earns you bonus <span className="text-white font-bold underline decoration-yellow-400">Study Tokens</span>.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            {!scenarioAnswered ? (
                                <div className="flex flex-col gap-6">
                                    {/* The Question / Scenario */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-slate-800 dark:text-slate-100 font-semibold text-lg leading-snug">
                                            {scenario.question}
                                        </p>
                                    </div>

                                    {/* Options */}
                                    <div className="grid gap-3">
                                        {[scenario.option_1, scenario.option_2, scenario.option_3, scenario.option_4].map((opt, idx) => (
                                            <motion.button
                                                key={idx}
                                                whileHover={{ x: 5 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => handleScenarioAnswer(idx + 1)}
                                                className="flex items-center justify-between w-full text-left p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-all group"
                                            >
                                                <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                                                    {opt}
                                                </span>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500" />
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="mb-6">
                                        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
                                            <GraduationCap className="w-8 h-8 text-emerald-600" />
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                            Excellent clinical reasoning! You've earned <span className="text-emerald-600 font-bold">{tokensToday} tokens</span>. Now, invite your colleagues to the challenge.
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl font-bold shadow-lg shadow-green-200 dark:shadow-none transition-all"
                                            onClick={shareOnWhatsApp}
                                        >
                                            <MessageCircle className="w-5 h-5" /> Invite via WhatsApp (+5)
                                        </button>

                                        <button
                                            className="flex items-center justify-center gap-3 w-full py-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-2xl font-bold transition-all"
                                            onClick={shareOnTelegram}
                                        >
                                            <Send className="w-5 h-5" /> Share on Telegram (+10)
                                        </button>

                                        <button
                                            variant="ghost"
                                            className="mt-4 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-colors"
                                            onClick={closePopup}
                                        >
                                            Dismiss for now
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </>
    );
};

export default Referral;
