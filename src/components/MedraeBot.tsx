// src/components/MedraeBot.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    X,
    MessageCircle,
    Sparkles,
    Lightbulb,
    Lock,
    Crown,
    ArrowRight,
    Volume2,
    VolumeX,
    Play,
    Pause,
    SkipBack,
    SkipForward,
    BookOpen,
    Brain,
    Home,
    Heart,
    Phone,
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useSession } from "@supabase/auth-helpers-react";
import MedraeSocialFooter from "@/components/MedraeSocialFooter";

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
// 🎵 AUDIO + LOCKOUT SETTINGS
// ============================================
const BOT_OPEN_SOUND = "/sounds/medrae-bot-open.mp3";
const BOT_TRACK_TITLE = "Medrae Nursing Theme";
const BOT_TRACK_ARTIST = "Medrae Original";

const LOCKOUT_SECONDS = 7;
const BOT_VOLUME = 0.3; // ← softer, medium background level
const FADE_IN_MS = 1400;
const FADE_OUT_MS = 1000;
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
// Returns a greeting that matches the user's local time of day.
const getTimeGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning!";
    if (hour >= 12 && hour < 17) return "Good afternoon!";
    if (hour >= 17 && hour < 21) return "Good evening!";
    return "Good night!";
};

// ─── Format seconds as mm:ss ───
const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
};

// ─── Tiny animated equalizer bars ───
const EqualizerBars = ({ active }: { active: boolean }) => (
    <div className="flex items-end gap-[2px] h-3">
        <span
            className={`w-[2px] rounded-full bg-current ${active ? "animate-[eq_0.8s_ease-in-out_infinite]" : ""}`}
            style={{ height: active ? "100%" : "20%", animationDelay: "0ms" }}
        />
        <span
            className={`w-[2px] rounded-full bg-current ${active ? "animate-[eq_0.7s_ease-in-out_infinite]" : ""}`}
            style={{ height: active ? "100%" : "35%", animationDelay: "120ms" }}
        />
        <span
            className={`w-[2px] rounded-full bg-current ${active ? "animate-[eq_0.9s_ease-in-out_infinite]" : ""}`}
            style={{ height: active ? "100%" : "25%", animationDelay: "240ms" }}
        />
        <style>{`
            @keyframes eq {
                0%, 100% { height: 25%; }
                50% { height: 100%; }
            }
        `}</style>
    </div>
);

const MedraeBot = () => {
    const navigate = useNavigate();
    const session = useSession();
    const { isPremium } = useSubscription();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(LOCKOUT_SECONDS);
    const [soundPlayed, setSoundPlayed] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fadeIntervalRef = useRef<number | null>(null);
    const tickIntervalRef = useRef<number | null>(null);
    const preMuteVolumeRef = useRef<number>(BOT_VOLUME);
    const raf2Ref = useRef<number | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    // ─── Time-aware greeting, computed once on mount ───
    const [greeting] = useState<string>(() => getTimeGreeting());
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

            const dismissedForThisOpen = sessionStorage.getItem(BOT_DISMISSED_THIS_OPEN);
            if (dismissedForThisOpen) {
                setHasChecked(true);
                return;
            }

            setIsVisible(true);
            setHasChecked(true);
        } catch {
            setHasChecked(true);
        }
    }, [session, isPremium, hasChecked]);
    // ─── Trigger overlay mount animation (fade + glide in) ───
    useEffect(() => {
        if (!isVisible) {
            setIsMounted(false);
            return;
        }

        // Double rAF: paints the "start" state before animating
        let raf2: number | null = null;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => setIsMounted(true));
            raf2Ref.current = raf2;
        });

        return () => {
            cancelAnimationFrame(raf1);
            if (raf2 !== null) cancelAnimationFrame(raf2);
        };
    }, [isVisible]);

    // ─── Fade-in helper ───
    const fadeIn = useCallback((audio: HTMLAudioElement, targetVolume: number) => {
        if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
        }

        audio.volume = 0;
        const stepMs = 40;
        const steps = Math.max(1, Math.floor(FADE_IN_MS / stepMs));
        let step = 0;

        fadeIntervalRef.current = window.setInterval(() => {
            step += 1;
            const next = targetVolume * (step / steps);
            if (step >= steps) {
                audio.volume = targetVolume;
                if (fadeIntervalRef.current) {
                    clearInterval(fadeIntervalRef.current);
                    fadeIntervalRef.current = null;
                }
            } else {
                audio.volume = next;
            }
        }, stepMs);
    }, []);

    // ─── Play audio (looped + fade-in) ───
    useEffect(() => {
        if (!isVisible) return;
        if (soundPlayed) return;

        try {
            const audio = new Audio(BOT_OPEN_SOUND);
            audio.volume = 0;
            audio.loop = true;
            audio.preload = "auto";
            audioRef.current = audio;

            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === "function") {
                playPromise
                    .then(() => {
                        setIsPlaying(true);
                        fadeIn(audio, BOT_VOLUME);
                    })
                    .catch(() => {
                        // Autoplay blocked — will retry on first gesture.
                    });
            }
            setSoundPlayed(true);
        } catch {
            setSoundPlayed(true);
        }
    }, [isVisible, soundPlayed, fadeIn]);

    // ─── Retry on first gesture ───
    useEffect(() => {
        if (!isVisible || !soundPlayed) return;

        const tryPlay = () => {
            const audio = audioRef.current;
            if (audio && audio.paused) {
                audio.play()
                    .then(() => {
                        setIsPlaying(true);
                        fadeIn(audio, isMuted ? 0 : BOT_VOLUME);
                    })
                    .catch(() => { });
            }
            window.removeEventListener("pointerdown", tryPlay);
            window.removeEventListener("keydown", tryPlay);
            window.removeEventListener("touchstart", tryPlay);
        };

        window.addEventListener("pointerdown", tryPlay, { once: true });
        window.addEventListener("keydown", tryPlay, { once: true });
        window.addEventListener("touchstart", tryPlay, { once: true });

        return () => {
            window.removeEventListener("pointerdown", tryPlay);
            window.removeEventListener("keydown", tryPlay);
            window.removeEventListener("touchstart", tryPlay);
        };
    }, [isVisible, soundPlayed, isMuted, fadeIn]);

    // ─── Countdown timer (lockout) ───
    useEffect(() => {
        if (!isVisible) return;
        if (secondsLeft <= 0) return;

        const timer = setTimeout(() => {
            setSecondsLeft((s) => Math.max(0, s - 1));
        }, 1000);

        return () => clearTimeout(timer);
    }, [isVisible, secondsLeft]);

    // ─── Progress ticker (only runs while audio plays) ───
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const startTicker = () => {
            if (tickIntervalRef.current) return;
            tickIntervalRef.current = window.setInterval(() => {
                if (!audioRef.current) return;
                setCurrentTime(audioRef.current.currentTime);
                setDuration(audioRef.current.duration || 0);
            }, 1000);
        };

        const stopTicker = () => {
            if (tickIntervalRef.current) {
                clearInterval(tickIntervalRef.current);
                tickIntervalRef.current = null;
            }
        };

        const onLoadedMeta = () => {
            if (audioRef.current) {
                setDuration(audioRef.current.duration || 0);
            }
        };

        const onPlay = () => { setIsPlaying(true); startTicker(); };
        const onPause = () => { setIsPlaying(false); stopTicker(); };

        audio.addEventListener("loadedmetadata", onLoadedMeta);
        audio.addEventListener("play", onPlay);
        audio.addEventListener("pause", onPause);

        if (!audio.paused) {
            setIsPlaying(true);
            startTicker();
        }

        return () => {
            audio.removeEventListener("loadedmetadata", onLoadedMeta);
            audio.removeEventListener("play", onPlay);
            audio.removeEventListener("pause", onPause);
            stopTicker();
        };
    }, [soundPlayed]);

    const isLocked = secondsLeft > 0;

    // ─── Fade out and stop ───
    const fadeOutAndStop = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
        }

        const stepMs = 40;
        const steps = Math.max(1, Math.floor(FADE_OUT_MS / stepMs));
        const startVolume = audio.volume;
        let step = 0;

        fadeIntervalRef.current = window.setInterval(() => {
            step += 1;
            const next = startVolume * (1 - step / steps);
            if (next <= 0.02 || step >= steps) {
                audio.pause();
                audio.currentTime = 0;
                audio.volume = BOT_VOLUME;
                setIsPlaying(false);
                if (fadeIntervalRef.current) {
                    clearInterval(fadeIntervalRef.current);
                    fadeIntervalRef.current = null;
                }
            } else {
                audio.volume = next;
            }
        }, stepMs);
    }, []);

    // ─── Play / Pause toggle ───
    const togglePlayPause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (audio.paused) {
            audio.play()
                .then(() => {
                    setIsPlaying(true);
                    fadeIn(audio, isMuted ? 0 : BOT_VOLUME);
                })
                .catch(() => { });
        } else {
            audio.pause();
            setIsPlaying(false);
        }
    }, [isMuted, fadeIn]);

    // ─── Toggle mute ───
    const toggleMute = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isMuted) {
            const target = preMuteVolumeRef.current || BOT_VOLUME;
            fadeIn(audio, target);
            setIsMuted(false);
        } else {
            preMuteVolumeRef.current = audio.volume;
            audio.volume = 0;
            setIsMuted(true);
        }
    }, [isMuted, fadeIn]);

    // ─── Cleanup on unmount ───
    useEffect(() => {
        return () => {
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
            if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

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
        fadeOutAndStop();

        setTimeout(() => {
            setIsVisible(false);
            setIsDismissing(false);
            setIsMounted(false);
            if (action) action();
        }, 500);
    }, [isLocked, markDismissed, fadeOutAndStop]);

    const handleDismiss = useCallback(() => closeAndThen(), [closeAndThen]);
    const handleUpgrade = useCallback(() => closeAndThen(() => navigate("/subscription")), [closeAndThen, navigate]);
    const handleSuggestion = useCallback(() => closeAndThen(() => navigate("/feedback")), [closeAndThen, navigate]);

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

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    // ─── Audio Player ───
    const AudioPlayer = ({ accent }: { accent: "emerald" | "blue" }) => {
        const accentBg = accent === "emerald"
            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
            : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300";
        const dotColor = accent === "emerald" ? "bg-emerald-500" : "bg-blue-500";
        const progressFill = accent === "emerald" ? "bg-emerald-500" : "bg-blue-500";
        const playing = isPlaying && !isMuted;

        return (
            <div className={`rounded-2xl px-3 py-3 ${accentBg}`}>
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-white/70 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                        <EqualizerBars active={playing} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${playing ? "animate-pulse" : ""}`} />
                            <p className="text-[10px] font-medium tracking-wider truncate">
                                Now Playing
                            </p>
                        </div>
                        <p className="text-xs font-bold truncate">
                            {BOT_TRACK_TITLE}
                        </p>
                        <p className="text-[10px] opacity-70 truncate">
                            {BOT_TRACK_ARTIST}
                        </p>
                    </div>
                    <button
                        onClick={toggleMute}
                        className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                        aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                </div>

                <div className="mt-2.5">
                    <div className="relative h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                            className={`absolute left-0 top-0 h-full ${progressFill} transition-[width] duration-300 ease-linear`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] font-mono opacity-70">
                        <span>{fmt(currentTime)}</span>
                        <span>-{fmt(Math.max(0, duration - currentTime))}</span>
                    </div>
                </div>

                <div className="mt-1 flex items-center justify-center gap-4">
                    <button
                        disabled
                        aria-label="Previous (disabled)"
                        className="p-1.5 rounded-full opacity-30 cursor-not-allowed"
                    >
                        <SkipBack size={16} />
                    </button>
                    <button
                        onClick={togglePlayPause}
                        aria-label={isPlaying ? "Pause" : "Play"}
                        className="p-2 rounded-full bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 transition-colors shadow-sm"
                    >
                        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                    </button>
                    <button
                        disabled
                        aria-label="Next (disabled)"
                        className="p-1.5 rounded-full opacity-30 cursor-not-allowed"
                    >
                        <SkipForward size={16} />
                    </button>
                </div>
            </div>
        );
    };

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
        const wrapperBg = accent === "emerald"
            ? "bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20"
            : "bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20";

        const iconColor = accent === "emerald"
            ? "text-rose-600 dark:text-rose-400"
            : "text-rose-600 dark:text-rose-400";

        const titleColor = accent === "emerald"
            ? "text-rose-800 dark:text-rose-300"
            : "text-rose-800 dark:text-rose-300";

        const textColor = accent === "emerald"
            ? "text-rose-700 dark:text-rose-400"
            : "text-rose-700 dark:text-rose-400";

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
                        <AudioPlayer accent="emerald" />

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
                    <AudioPlayer accent="blue" />

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