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

// ⚡ TEST MODE — set to true to show the promo on every refresh (bypasses timer + daily limit)
const TEST_MODE_SHOW_ON_REFRESH = false;

// ═══════════════════════════════════════════════════════════════
// 🖥️ DESKTOP IMAGES — local files from /public (high quality)
// ═══════════════════════════════════════════════════════════════
const desktopImages = [
    "/high1.png",
    "/high2.png",
    "/high3.png",
    "/high4.png",
    "/high5.png",
    "/high6.png",
];

// ═══════════════════════════════════════════════════════════════
// 📱 MOBILE IMAGES — remote iStock URLs (portrait-friendly)
// ═══════════════════════════════════════════════════════════════
const mobileImages = [
    "https://media.istockphoto.com/id/2233499062/photo/happy-young-nurse-celebrating-outside-hospital-after-work.webp?a=1&b=1&s=612x612&w=0&k=20&c=nqc1WBRmF9162fHe9F9l-Ad6T8xyEqLVHsw2ttKsaTQ=",
    "https://media.istockphoto.com/id/1324292384/photo/shot-of-a-set-of-hands-high-fiving-in-victory.webp?a=1&b=1&s=612x612&w=0&k=20&c=cj-xKiNoV4HtxIsAxdyetr89tIHNexHFbpkSBRkRZf8=",
    "https://media.istockphoto.com/id/1270569606/photo/modern-medical-practitioner-woman-rejoicing.webp?a=1&b=1&s=612x612&w=0&k=20&c=Th8HlNzz6En6KiEGtieeY5KqcMAGNdbDxg68v5A4Olw=",
];

// Preload every image once so the first slide never flickers.
const preloadImages = () => {
    if (typeof window === "undefined") return;
    [...desktopImages, ...mobileImages].forEach((src) => {
        const img = new Image();
        img.src = src;
    });
};

export function GlobalDuelManager() {
    const session = useSession();
    const user = session?.user;
    const navigate = useNavigate();
    const location = useLocation();

    const [incomingDuel, setIncomingDuel] = useState<any>(null);
    const [showPromo, setShowPromo] = useState(false);
    const [desktopBgIndex, setDesktopBgIndex] = useState(0);
    const [mobileBgIndex, setMobileBgIndex] = useState(0);

    const timersRef = useRef<{ initial?: NodeJS.Timeout; recurring?: NodeJS.Timeout }>({});

    useEffect(() => {
        preloadImages();
    }, []);

    // Desktop slideshow — cycles local /public images
    useEffect(() => {
        if (!showPromo && !incomingDuel) return;

        const interval = setInterval(() => {
            setDesktopBgIndex((prev) => (prev + 1) % desktopImages.length);
        }, 6000);

        return () => clearInterval(interval);
    }, [showPromo, incomingDuel]);

    // Mobile slideshow — cycles remote iStock images
    useEffect(() => {
        if (!showPromo && !incomingDuel) return;

        const interval = setInterval(() => {
            setMobileBgIndex((prev) => (prev + 1) % mobileImages.length);
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


    // --- 2. SMART PROMO LOGIC ---
    useEffect(() => {
        const isDashboard = location.pathname.includes('dashboard') || location.pathname === '/';
        if (!user || !isDashboard) {
            clearTimeout(timersRef.current.initial);
            clearInterval(timersRef.current.recurring);
            return;
        }

        const triggerPromo = () => {
            const today = new Date().toISOString().split('T')[0];
            const statsRaw = localStorage.getItem(PROMO_STORAGE_KEY);
            let stats = statsRaw ? JSON.parse(statsRaw) : { date: today, count: 0 };
            if (stats.date !== today) stats = { date: today, count: 0 };

            if ((TEST_MODE_SHOW_ON_REFRESH || stats.count < DAILY_LIMIT) && !incomingDuel) {
                setShowPromo(true);
                playSound("medrae");

                if (!TEST_MODE_SHOW_ON_REFRESH) {
                    stats.count += 1;
                    localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(stats));
                }
            }
        };

        if (TEST_MODE_SHOW_ON_REFRESH) {
            timersRef.current.initial = setTimeout(triggerPromo, 1200);
        } else {
            timersRef.current.initial = setTimeout(() => {
                triggerPromo();

                timersRef.current.recurring = setInterval(() => {
                    triggerPromo();
                }, RECURRING_DELAY);

            }, INITIAL_DELAY);
        }

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
                {/* ═══════════════════════════════════════════════════
                    INCOMING DUEL OVERLAY
                   ═══════════════════════════════════════════════════ */}
                {incomingDuel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-auto fixed inset-0 flex flex-col md:flex-row bg-background"
                    >
                        {/* LEFT SIDE — Desktop only */}
                        <div className="hidden md:block md:w-1/2 relative overflow-hidden h-screen">
                            {desktopImages.map((img, index) => (
                                <div
                                    key={index}
                                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === desktopBgIndex ? "opacity-100 scale-105" : "opacity-0 scale-100"
                                        }`}
                                    style={{
                                        backgroundImage: `url(${img})`,
                                        transition: 'opacity 1s ease-in-out, transform 10s linear'
                                    }}
                                />
                            ))}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50">
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

                        {/* RIGHT SIDE — Content */}
                        <div className="w-full md:w-1/2 flex flex-col h-screen overflow-hidden bg-background">
                            {/* 📱 MOBILE-ONLY HERO */}
                            <div className="md:hidden relative w-full h-[38vh] overflow-hidden">
                                {mobileImages.map((img, index) => (
                                    <div
                                        key={index}
                                        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === mobileBgIndex ? "opacity-100 scale-105" : "opacity-0 scale-100"
                                            }`}
                                        style={{
                                            backgroundImage: `url(${img})`,
                                            transition: 'opacity 1s ease-in-out, transform 10s linear'
                                        }}
                                    />
                                ))}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
                                <div className="absolute bottom-4 left-5 right-5 text-white space-y-1.5">
                                    <div className="inline-flex items-center gap-2 bg-blue-600/40 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                                        </span>
                                        Duel Request
                                    </div>
                                    <h1 className="text-2xl font-black leading-tight italic">
                                        Battle Ready! ⚔️
                                    </h1>
                                </div>
                            </div>

                            {/* CONTENT — tightened spacing, no scroll on phones */}
                            <div className="flex-1 flex flex-col items-center justify-center px-5 py-4 relative">
                                <button
                                    onClick={() => setIncomingDuel(null)}
                                    className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground transition-colors z-20"
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="w-full max-w-md flex flex-col items-center text-center"
                                >
                                    <div className="bg-blue-500 p-3 rounded-2xl mb-3">
                                        <Swords size={30} className="text-white animate-bounce" />
                                    </div>

                                    <h3 className="text-foreground font-black text-xl uppercase tracking-tighter italic leading-none">
                                        Duel Request!
                                    </h3>

                                    <p className="text-muted-foreground text-sm mt-2 max-w-xs">
                                        <span className="font-bold text-foreground">
                                            {incomingDuel.sender?.name || "A peer"}
                                        </span>{" "}
                                        just sent you an{" "}
                                        <span className="text-blue-500 font-black">N.D.</span>
                                    </p>

                                    <div className="mt-5 flex flex-col sm:flex-row gap-2.5 w-full">
                                        <Button
                                            variant="outline"
                                            onClick={() => setIncomingDuel(null)}
                                            className="flex-1 h-11 rounded-2xl"
                                        >
                                            Ignore
                                        </Button>
                                        <Button
                                            onClick={handleAccept}
                                            className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl"
                                        >
                                            Accept Duel
                                        </Button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════
                    PROMOTIONAL NUDGE OVERLAY
                   ═══════════════════════════════════════════════════ */}
                {showPromo && !incomingDuel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-auto fixed inset-0 flex flex-col md:flex-row bg-background"
                    >
                        {/* LEFT SIDE — Desktop only */}
                        <div className="hidden md:block md:w-1/2 relative overflow-hidden h-screen">
                            {desktopImages.map((img, index) => (
                                <div
                                    key={index}
                                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === desktopBgIndex ? "opacity-100 scale-105" : "opacity-0 scale-100"
                                        }`}
                                    style={{
                                        backgroundImage: `url(${img})`,
                                        transition: 'opacity 1s ease-in-out, transform 10s linear'
                                    }}
                                />
                            ))}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50">
                                <div className="absolute bottom-16 left-12 right-12 text-white space-y-4">
                                    <h1 className="text-5xl font-bold leading-tight">
                                        Rise to the Challenge
                                    </h1>
                                    <p className="text-gray-300 text-lg max-w-md">
                                        Challenge a Friend and prove your clinical expertise!
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDE — Content */}
                        <div className="w-full md:w-1/2 flex flex-col h-screen overflow-hidden bg-background">
                            {/* 📱 MOBILE-ONLY HERO */}
                            <div className="md:hidden relative w-full h-[38vh] overflow-hidden">
                                {mobileImages.map((img, index) => (
                                    <div
                                        key={index}
                                        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === mobileBgIndex ? "opacity-100 scale-105" : "opacity-0 scale-100"
                                            }`}
                                        style={{
                                            backgroundImage: `url(${img})`,
                                            transition: 'opacity 1s ease-in-out, transform 10s linear'
                                        }}
                                    />
                                ))}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
                                <div className="absolute bottom-4 left-5 right-5 text-white">
                                    <h1 className="text-2xl font-black leading-tight italic">
                                        Rise to the Challenge
                                    </h1>
                                </div>
                            </div>

                            {/* CONTENT — tightened spacing, no scroll on phones */}
                            <div className="flex-1 flex flex-col items-center justify-center px-5 py-4 relative">
                                <button
                                    onClick={() => setShowPromo(false)}
                                    className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground transition-colors z-20"
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="w-full max-w-sm flex flex-col items-center text-center space-y-3"
                                >
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[1.25rem] flex items-center justify-center rotate-3">
                                        <Zap size={32} className="text-white fill-current" />
                                    </div>

                                    <div className="space-y-1.5">
                                        <h2 className="text-xl font-black text-foreground tracking-tight italic">
                                            Prove Them Wrong.
                                        </h2>
                                        <p className="text-[13px] text-muted-foreground leading-snug">
                                            Don't just study solo. Send an{" "}
                                            <span className="font-black text-indigo-500 underline underline-offset-4 uppercase">
                                                N.D. (Nurse Duel)
                                            </span>{" "}
                                            to a peer and beat their clinical score!
                                        </p>
                                    </div>

                                    <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-2xl w-full flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold shrink-0 text-sm">
                                            VS
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">
                                                Community Battle
                                            </p>
                                            <p className="text-xs font-bold text-foreground">
                                                N.D. Your Friends in the DMs
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => { setShowPromo(false); navigate("/challenge"); }}
                                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-base group active:scale-95 transition-all"
                                    >
                                        Challenge a Friend
                                        <Send size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>

                                    <p className="text-[10px] font-bold text-muted-foreground tracking-widest animate-pulse">
                                        Humble your friends today
                                    </p>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}