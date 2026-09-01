"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, X, Send, Zap } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@supabase/auth-helpers-react";
import { playSound } from "@/lib/soundManager";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

// Constants for logic
const DAILY_LIMIT = 3;
const PROMO_STORAGE_KEY = "medrae_nd_promo_stats";
const INITIAL_DELAY = 5 * 60 * 1000; // 5 Minutes until first show
const RECURRING_DELAY = 30 * 60 * 1000; // Repeat every 30 Minutes

const backgroundImages = [
    "high1.png",
    "high2.png",
    "high3.png",
    "high4.png",
    "high5.png",
    "high6.png",
];

export function GlobalDuelManager() {
    const session = useSession();
    const user = session?.user;
    const navigate = useNavigate();
    const location = useLocation();

    const [incomingDuel, setIncomingDuel] = useState<any>(null);
    const [showPromo, setShowPromo] = useState(false);
    const [bgIndex, setBgIndex] = useState(0);

    // Timer refs to prevent overlaps and memory leaks
    const timersRef = useRef<{ initial?: NodeJS.Timeout; recurring?: NodeJS.Timeout }>({});

    // Background image slideshow
    useEffect(() => {
        if (!showPromo && !incomingDuel) return;

        const interval = setInterval(() => {
            setBgIndex((prev) => (prev + 1) % backgroundImages.length);
        }, 6000);

        return () => clearInterval(interval);
    }, [showPromo, incomingDuel]);

    // --- 1. INCOMING DUEL CHECK ---
    const checkIncomingDuels = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await supabase
                .from('challenges')
                .select(`*, sender:from_user_id (name, avatar_url)`)
                .eq('to_user_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                const duel = data[0];
                const seenKey = `seen_duel_popup_${duel.id}`;
                if (!sessionStorage.getItem(seenKey)) {
                    setIncomingDuel(duel);
                    playSound("medrae");
                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                    sessionStorage.setItem(seenKey, "true");
                }
            }
        } catch (err) { console.error("Duel check failed:", err); }
    }, [user]);

    useEffect(() => {
        checkIncomingDuels();
        window.addEventListener("focus", checkIncomingDuels);
        return () => window.removeEventListener("focus", checkIncomingDuels);
    }, [checkIncomingDuels]);


    // --- 2. SMART PROMO LOGIC (Original timing restored) ---
    useEffect(() => {
        // Only show on dashboard/home
        const isDashboard = location.pathname.includes('dashboard') || location.pathname === '/';
        if (!user || !isDashboard) {
            clearTimeout(timersRef.current.initial);
            clearInterval(timersRef.current.recurring);
            return;
        }

        const triggerPromo = () => {
            // Check Daily Limit
            const today = new Date().toISOString().split('T')[0];
            const statsRaw = localStorage.getItem(PROMO_STORAGE_KEY);
            let stats = statsRaw ? JSON.parse(statsRaw) : { date: today, count: 0 };
            if (stats.date !== today) stats = { date: today, count: 0 };

            // Only trigger if under limit AND no incoming duel is currently blocking the screen
            if (stats.count < DAILY_LIMIT && !incomingDuel) {
                setShowPromo(true);
                playSound("medrae");

                stats.count += 1;
                localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(stats));
            }
        };

        // Start the 5-minute initial wait
        timersRef.current.initial = setTimeout(() => {
            triggerPromo();

            // After the first one, set up the 30-minute interval
            timersRef.current.recurring = setInterval(() => {
                triggerPromo();
            }, RECURRING_DELAY);

        }, INITIAL_DELAY);

        return () => {
            clearTimeout(timersRef.current.initial);
            clearInterval(timersRef.current.recurring);
        };
    }, [user, location.pathname, incomingDuel]);


    const handleAccept = () => {
        setIncomingDuel(null);
        navigate("/challenge");
    };

    if (!user) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[99999]">
            <AnimatePresence>
                {/* --- INCOMING DUEL OVERLAY (Split-screen Desktop, Fullscreen Mobile) --- */}
                {incomingDuel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-auto fixed inset-0 flex flex-col md:flex-row bg-muted/100 dark:bg-muted/100"
                    >
                        {/* LEFT SIDE - Background Images (Desktop Only) */}
                        <div className="hidden md:block md:w-1/2 relative overflow-hidden h-screen sticky top-0">
                            {backgroundImages.map((img, index) => (
                                <div
                                    key={index}
                                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === bgIndex ? "opacity-100 scale-105" : "opacity-0 scale-100"
                                        }`}
                                    style={{
                                        backgroundImage: `url(/${img})`,
                                        transition: 'opacity 1s ease-in-out, transform 10s linear'
                                    }}
                                />
                            ))}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40">
                                <div className="absolute bottom-16 left-12 right-12 text-white space-y-4">
                                    <div className="inline-flex items-center gap-2 bg-blue-600/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                        </span>
                                        Duel Request
                                    </div>
                                    <h1 className="text-5xl font-bold leading-tight">
                                        Battle Ready! ⚔️
                                    </h1>
                                    <p className="text-gray-300 text-lg max-w-md">
                                        {incomingDuel.sender?.name || "A peer"} wants to challenge you!
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDE - Content (Full width on mobile) */}
                        <div className="w-full md:w-1/2 flex flex-col h-screen overflow-hidden bg-muted/100 dark:bg-muted/100">
                            <div className="flex-1 flex items-center justify-center p-6">
                                <motion.div
                                    initial={{ y: 50, scale: 0.95 }}
                                    animate={{ y: 0, scale: 1 }}
                                    className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.3)]"
                                >
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full animate-pulse" />

                                    <button
                                        onClick={() => setIncomingDuel(null)}
                                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-20"
                                    >
                                        <X size={20} />
                                    </button>

                                    <div className="relative z-10 flex flex-col items-center text-center">
                                        <div className="bg-blue-500 p-3 rounded-2xl mb-4 shadow-lg shadow-blue-500/40">
                                            <Swords size={32} className="text-white animate-bounce" />
                                        </div>
                                        <h3 className="text-slate-900 dark:text-white font-black text-xl uppercase tracking-tighter italic leading-none">Duel Request!</h3>
                                        <p className="text-slate-600 dark:text-blue-200 text-sm mt-2">
                                            <span className="font-bold text-slate-900 dark:text-white">{incomingDuel.sender?.name || "A peer"}</span> just sent you an <span className="text-blue-500 dark:text-blue-400 font-black">N.D.</span>
                                        </p>
                                        <div className="mt-6 flex gap-3 w-full">
                                            <Button
                                                variant="outline"
                                                onClick={() => setIncomingDuel(null)}
                                                className="flex-1 bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                                            >
                                                Ignore
                                            </Button>
                                            <Button
                                                onClick={handleAccept}
                                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 rounded-xl"
                                            >
                                                Accept Duel
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* --- PROMOTIONAL NUDGE OVERLAY (Split-screen Desktop, Fullscreen Mobile) --- */}
                {showPromo && !incomingDuel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-auto fixed inset-0 flex flex-col md:flex-row bg-muted/100 dark:bg-muted/100"
                    >
                        {/* LEFT SIDE - Background Images (Desktop Only) */}
                        <div className="hidden md:block md:w-1/2 relative overflow-hidden h-screen sticky top-0">
                            {backgroundImages.map((img, index) => (
                                <div
                                    key={index}
                                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === bgIndex ? "opacity-100 scale-105" : "opacity-0 scale-100"
                                        }`}
                                    style={{
                                        backgroundImage: `url(/${img})`,
                                        transition: 'opacity 1s ease-in-out, transform 10s linear'
                                    }}
                                />
                            ))}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40">
                                <div className="absolute bottom-16 left-12 right-12 text-white space-y-4">
                                    <div className="inline-flex items-center gap-2 bg-indigo-600/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                        </span>
                                        Challenge Accepted
                                    </div>
                                    <h1 className="text-5xl font-bold leading-tight">
                                        Rise to the Challenge 🚀
                                    </h1>
                                    <p className="text-gray-300 text-lg max-w-md">
                                        Send an N.D. and prove your clinical expertise!
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDE - Content (Full width on mobile) */}
                        <div className="w-full md:w-1/2 flex flex-col h-screen overflow-hidden bg-muted/100 dark:bg-muted/100">
                            <div className="flex-1 flex items-center justify-center p-6">
                                <motion.div
                                    initial={{ y: 50, scale: 0.95 }}
                                    animate={{ y: 0, scale: 1 }}
                                    className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.3)]"
                                >
                                    <button
                                        onClick={() => setShowPromo(false)}
                                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-20"
                                    >
                                        <X size={20} />
                                    </button>

                                    <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl rotate-3">
                                            <Zap size={40} className="text-white fill-current" />
                                        </div>
                                        <div className="space-y-2">
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                                                Prove Them Wrong.
                                            </h2>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                                Don't just study solo. Send an <span className="font-black text-indigo-500 dark:text-indigo-400 underline underline-offset-4 uppercase">N.D. (Nurse Duel)</span> to a peer and see if they can beat your clinical score!
                                            </p>
                                        </div>
                                        <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl w-full flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold shrink-0">
                                                VS
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">
                                                    Community Battle
                                                </p>
                                                <p className="text-xs font-bold dark:text-white">
                                                    N.D. Your Friends in the DMs
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => { setShowPromo(false); navigate("/challenge"); }}
                                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-lg shadow-xl shadow-indigo-500/40 group active:scale-95 transition-all"
                                        >
                                            SEND AN N.D.
                                            <Send size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
                                            HUMBLE YOUR FRIENDS TODAY
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}