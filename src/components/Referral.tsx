"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, UserPlus } from "lucide-react";
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
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-0 sm:p-4
"
                >
                    <motion.div
                        initial={{ scale: 0, rotateY: -45, rotateX: 30 }}
                        animate={{ scale: 1, rotateY: 0, rotateX: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden bg-gray-900 text-white"
                    >
                        <Card className="bg-transparent shadow-none">
                            <CardHeader className="bg-blue-800/70">
                                <div className="flex items-center gap-2">
                                    <Gift className="w-6 h-6 text-white" />
                                    <CardTitle className="text-white"> Referral Weekend Challenge</CardTitle>

                                </div>
                                <CardDescription className="text-gray-300 text-sm">
                                    {scenarioAnswered ? (
                                        <div className="text-sm leading-snug">
                                            {/* Line 1 */}
                                            <div className="flex items-center gap-1 break-words">
                                                Great! You have earned {tokensToday} <Coin />Study Tokens today.
                                            </div>

                                            {/* Line 2 */}
                                            <div className="flex items-center gap-1 break-words">
                                                Total tokens: {tokens} <Coin /> Study Tokens.
                                            </div>
                                        </div>


                                    ) : (
                                        <span className="text-gray-300 font-medium">
                                            It’s Referral Weekend! Answer correctly and earn bonus tokens:

                                        </span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!scenarioAnswered ? (
                                    <div className="flex flex-col gap-3">
                                        <p className="font-semibold text-white text-lg">{scenario.question}</p>

                                        {[scenario.option_1, scenario.option_2, scenario.option_3, scenario.option_4].map((opt, idx) => (
                                            <motion.div
                                                key={idx}
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => handleScenarioAnswer(idx + 1)}
                                                className="cursor-pointer border-b border-gray-600 py-2 px-3 rounded-md hover:bg-blue-700 text-white transition"
                                            >
                                                {opt}
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-gray-300 text-sm">😉 You answered correctly! Challenge a friend today and earn more tokens:</p>
                                        <div className="flex flex-col gap-2 mt-2">
                                            <Button className="flex-1 bg-green-500 text-white hover:bg-green-600" onClick={shareOnWhatsApp}>
                                                <UserPlus className="w-4 h-4 mr-2" /> Invite via WhatsApp (+5 tokens)
                                            </Button>
                                            <Button className="flex-1 bg-blue-500 text-white hover:bg-blue-600" onClick={shareOnTelegram}>
                                                <UserPlus className="w-4 h-4 mr-2" /> Invite via Telegram (+10 tokens)
                                            </Button>
                                        </div>
                                        <Button variant="ghost" className="mt-2 text-sm text-gray-300" onClick={closePopup}>Maybe Tomorrow</Button>
                                        <Button variant="ghost" className="mt-2 text-sm text-gray-300" onClick={closePopup}>All Done</Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </>
    );
};

export default Referral;
