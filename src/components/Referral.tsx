"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, UserPlus, Star } from "lucide-react"; // <-- add Star for coin

import { motion } from "framer-motion";

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
    const [userId, setUserId] = useState<string | null>(null);
    const [tokens, setTokens] = useState<number>(0);
    const [tokensToday, setTokensToday] = useState<number>(0);

    const WHATSAPP_TOKENS = 5;
    const TELEGRAM_TOKENS = 10;
    const today = new Date().toDateString();
    const Coin = () => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 inline-block"
            fill="gold"
            viewBox="0 0 24 24"
            stroke="none"
        >
            <circle cx="12" cy="12" r="10" stroke="goldenrod" strokeWidth="2" fill="gold" />
            <text
                x="12"
                y="16"
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill="white"
                fontFamily="Arial, Helvetica, sans-serif"
            >
                $
            </text>
        </svg>
    );

    // Load user and tokens, and determine if popup should show today
    useEffect(() => {
        const loadUser = async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            const id = sessionData?.session?.user?.id;
            if (!id) return;
            setUserId(id);

            const { data: profile, error } = await supabase
                .from("profiles")
                .select("tokens")
                .eq("user_id", id)
                .single();
            if (error) console.error("Error fetching tokens:", error);
            else setTokens(profile?.tokens ?? 0);

            // Show popup only if not already shown today
            const lastShown = localStorage.getItem(`referral_popup_${id}`);
            if (lastShown !== today) setShowPopup(true);
        };
        loadUser();
    }, []);

    // Fetch a random scenario
    useEffect(() => {
        const fetchScenario = async () => {
            const { data, error } = await supabase
                .from<Scenario>("referral_scenarios")
                .select("*");
            if (error) console.error("Error fetching scenarios:", error);
            else if (data && data.length > 0) {
                const random = Math.floor(Math.random() * data.length);
                setScenario(data[random]);
            }
        };
        fetchScenario();
    }, []);

    const referralLink = `${window.location.origin}/signup?ref=${userId}`;

    const giveInviteTokens = async (amount: number, vibrationStrong = false) => {
        if (!userId) return;

        const newTokens = tokens + amount;
        const newTokensToday = tokensToday + amount;

        const { error } = await supabase
            .from("profiles")
            .update({ tokens: newTokens })
            .eq("user_id", userId);

        if (error) console.error("Error adding tokens:", error);
        else {
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
        const message = encodeURIComponent(
            `I found this cool medical study challenge! Earn tokens and challenge your friends: ${referralLink}`
        );
        openAndReward(`https://wa.me/?text=${message}`, WHATSAPP_TOKENS, false);
    };

    const shareOnTelegram = () => {
        const message = encodeURIComponent(
            `I found this cool medical study challenge! Earn tokens and challenge your friends: ${referralLink}`
        );
        openAndReward(`https://t.me/share/url?url=${referralLink}&text=${message}`, TELEGRAM_TOKENS, true);
    };

    const handleScenarioAnswer = (answerIndex: number) => {
        setSelectedAnswer(answerIndex);

        if (scenario && answerIndex === scenario.correct_option) {
            setScenarioAnswered(true);
        } else {
            alert("Incorrect! You cannot proceed until tomorrow.");
        }
    };

    const closePopup = () => {
        setShowPopup(false);
        if (userId) localStorage.setItem(`referral_popup_${userId}`, today);
    };

    // FULL SCREEN LOCKER STYLE
    return (
        <>
            {showPopup && userId && scenario && (
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-2 sm:p-4"
                >
                    <Card className="w-full max-w-full rounded-none shadow-lg overflow-hidden">
                        <CardHeader className="bg-blue-50 dark:bg-blue-900/30">
                            <div className="flex items-center gap-2">
                                <Gift className="w-6 h-6 text-blue-600" />
                                <CardTitle>Daily Medical Scenario</CardTitle>
                            </div>
                            <CardDescription>
                                {scenarioAnswered ? (
                                    <span className="flex items-center gap-1">
                                        Great! You have earned {tokensToday} <Coin /> today.
                                        Total tokens: {tokens} <Coin />.
                                    </span>
                                ) : (
                                    "You have a patient scenario today. Choose the correct referral:"
                                )}
                            </CardDescription>

                        </CardHeader>
                        <CardContent>
                            {!scenarioAnswered ? (
                                <div className="flex flex-col gap-3">
                                    <p className="font-semibold">{scenario.question}</p>
                                    {[scenario.option_1, scenario.option_2, scenario.option_3, scenario.option_4].map(
                                        (opt, idx) => (
                                            <Button
                                                key={idx}
                                                variant="outline"
                                                className="w-full text-left"
                                                onClick={() => handleScenarioAnswer(idx + 1)}
                                            >
                                                {opt}
                                            </Button>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm">
                                        😉 You answered correctly! Challenge a friend today and earn more tokens:
                                    </p>
                                    <div className="flex flex-col gap-2 mt-2">
                                        <Button
                                            className="flex-1 bg-green-500 text-white hover:bg-green-600"
                                            onClick={shareOnWhatsApp}
                                        >
                                            <UserPlus className="w-4 h-4 mr-2" /> Invite via WhatsApp (+5 tokens)
                                        </Button>
                                        <Button
                                            className="flex-1 bg-blue-500 text-white hover:bg-blue-600"
                                            onClick={shareOnTelegram}
                                        >
                                            <UserPlus className="w-4 h-4 mr-2" /> Invite via Telegram (+10 tokens)
                                        </Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className="mt-2 text-sm text-gray-500"
                                        onClick={closePopup}
                                    >
                                        Mybe Tommorow
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="mt-2 text-sm text-gray-500"
                                        onClick={closePopup}
                                    >
                                        Done
                                    </Button>

                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </>
    );
};

export default Referral;
