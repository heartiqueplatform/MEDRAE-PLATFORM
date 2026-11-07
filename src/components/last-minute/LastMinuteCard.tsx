"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Zap, ArrowUpRight, Lock, Unlock, BookOpen, Flame, Coins,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { cn } from "@/lib/utils";

type Variant = "card" | "chip" | "quiz";

type Stats = {
    papers: number;
    cheapest: number | null;
    unlocked: number;
    hot: number;
    tokens: number;
};

const EMPTY: Stats = { papers: 0, cheapest: null, unlocked: 0, hot: 0, tokens: 0 };

let CACHE: { stats: Stats; at: number } | null = null;
const CACHE_MS = 60_000;

// ─────────────────────────────────────────────────────────
// Images for the "quiz" variant carousel.
// Add or reorder URLs here — carousel adapts automatically.
// ─────────────────────────────────────────────────────────
const QUIZ_HERO_IMAGES = [
    "https://plus.unsplash.com/premium_photo-1661411095757-e85b9bf85ba7?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    "https://plus.unsplash.com/premium_photo-1723780971025-2305163642ce?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    "https://images.unsplash.com/photo-1584987567308-c1d81837be02?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    "https://plus.unsplash.com/premium_photo-1781832593839-1018c5ae43de?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    "https://images.unsplash.com/photo-1491319669671-30014eb16b8d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    "https://images.unsplash.com/photo-1759860709075-0715f8927323?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
];

const ROTATE_MS = 4500;

// Transition styles that cycle automatically
type TransitionStyle = "fade" | "slide" | "zoom" | "flip" | "blur";
const TRANSITION_CYCLE: TransitionStyle[] = ["zoom", "slide", "blur", "fade", "flip"];

// ─────────────────────────────────────────────────────────
// Carousel — background-preloaded + varied transitions
// ─────────────────────────────────────────────────────────
function HeroCarousel({
    images,
    transition,
}: {
    images: string[];
    /** Force a single style. Omit to cycle through 5 styles. */
    transition?: TransitionStyle;
}) {
    const [index, setIndex] = useState(0);
    const [prevIndex, setPrevIndex] = useState<number | null>(null);
    const [failed, setFailed] = useState<Set<number>>(new Set());
    const [paused, setPaused] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const preloadedRef = useRef<Set<string>>(new Set());

    // Respect reduced-motion
    const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Pick transition style for the current slide
    const style: TransitionStyle =
        transition ?? TRANSITION_CYCLE[index % TRANSITION_CYCLE.length];

    // ── Preload all images into the browser cache ──
    useEffect(() => {
        images.forEach((url) => {
            if (preloadedRef.current.has(url)) return;
            preloadedRef.current.add(url);
            const img = new Image();
            img.src = url;
        });
    }, [images]);

    // ── Pause when tab hidden (battery + data saver) ──
    useEffect(() => {
        const onVis = () => setIsVisible(!document.hidden);
        document.addEventListener("visibilitychange", onVis);
        return () => document.removeEventListener("visibilitychange", onVis);
    }, []);

    // ── Auto-advance ──
    useEffect(() => {
        if (prefersReducedMotion || paused || !isVisible || images.length <= 1) return;
        const t = setInterval(() => {
            setPrevIndex(index);
            setIndex((i) => (i + 1) % images.length);
        }, ROTATE_MS);
        return () => clearInterval(t);
    }, [index, images.length, paused, isVisible, prefersReducedMotion]);

    // ── Clear prevIndex after transition completes ──
    useEffect(() => {
        if (prevIndex === null) return;
        const t = setTimeout(() => setPrevIndex(null), 900);
        return () => clearTimeout(t);
    }, [prevIndex]);

    const currentUrl = images[index];
    const prevUrl = prevIndex !== null ? images[prevIndex] : null;

    // Build transition CSS class per style
    const getTransitionClass = (s: TransitionStyle) => {
        switch (s) {
            case "slide": return "carousel-slide";
            case "zoom": return "carousel-zoom";
            case "flip": return "carousel-flip";
            case "blur": return "carousel-blur";
            case "fade":
            default: return "carousel-fade";
        }
    };

    return (
        <div
            className="relative h-60 sm:h-64 w-full overflow-hidden bg-gray-900"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* Previous image — stays visible during transition */}
            {prevUrl && (
                <img
                    key={`prev-${prevUrl}`}
                    src={prevUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover carousel-out"
                />
            )}

            {/* Current image — animates in with the chosen style */}
            {!failed.has(index) ? (
                <img
                    key={currentUrl}
                    src={currentUrl}
                    alt="Affordable exam papers"
                    loading="lazy"
                    onError={() => setFailed((prev) => new Set(prev).add(index))}
                    className={cn(
                        "absolute inset-0 h-full w-full object-cover",
                        getTransitionClass(style)
                    )}
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center">
                    <Zap className="w-16 h-16 text-white/60" />
                </div>
            )}

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

            {/* Dots — bottom-right */}
            {images.length > 1 && (
                <div
                    className="absolute bottom-3 right-3 flex items-center gap-1 z-10"
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                >
                    {images.map((_, i) => (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (i === index) return;
                                setPrevIndex(index);
                                setIndex(i);
                            }}
                            aria-label={`Show image ${i + 1}`}
                            className={cn(
                                "rounded-full transition-all duration-300",
                                i === index
                                    ? "w-5 h-1.5 bg-white"
                                    : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
                            )}
                        />
                    ))}
                </div>
            )}

            {/* Keyframes for the 5 transition styles */}
            <style>{`
                /* ─── FADE ─── */
                @keyframes carouselFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                .carousel-fade { animation: carouselFadeIn 700ms ease-out both; }

                /* ─── SLIDE (from right) ─── */
                @keyframes carouselSlideIn {
                    from { opacity: 0.7; transform: translateX(28px); }
                    to   { opacity: 1;   transform: translateX(0); }
                }
                .carousel-slide { animation: carouselSlideIn 720ms cubic-bezier(.2,.8,.2,1) both; }

                /* ─── ZOOM (cinema reveal) ─── */
                @keyframes carouselZoomIn {
                    from { opacity: 0.6; transform: scale(1.08); }
                    to   { opacity: 1;   transform: scale(1); }
                }
                .carousel-zoom { animation: carouselZoomIn 800ms cubic-bezier(.2,.8,.2,1) both; }

                /* ─── FLIP (subtle 3D) ─── */
                @keyframes carouselFlipIn {
                    from { opacity: 0.5; transform: perspective(900px) rotateY(-14deg) scale(0.98); }
                    to   { opacity: 1;   transform: perspective(900px) rotateY(0deg)  scale(1); }
                }
                .carousel-flip { animation: carouselFlipIn 760ms cubic-bezier(.2,.8,.2,1) both; }

                /* ─── BLUR (dreamy) ─── */
                @keyframes carouselBlurIn {
                    from { opacity: 0.5; filter: blur(12px); transform: scale(1.03); }
                    to   { opacity: 1;   filter: blur(0);    transform: scale(1); }
                }
                .carousel-blur { animation: carouselBlurIn 780ms ease-out both; }

                /* ─── PREVIOUS image fades out smoothly (all styles) ─── */
                @keyframes carouselOut {
                    from { opacity: 1; }
                    to   { opacity: 0; }
                }
                .carousel-out { animation: carouselOut 900ms ease-out both; }
            `}</style>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────
export function LastMinuteCard({
    variant = "card",
    title = "Last Minute",
    blurb = "Exam-paper style. Pay once, no subscription. Read in-app only.",
    className = "",
    transition,
}: {
    variant?: Variant;
    title?: string;
    blurb?: string;
    className?: string;
    /** Force a specific carousel transition. Omit to cycle through 5 styles. */
    transition?: TransitionStyle;
}) {
    const navigate = useNavigate();
    const user = useUser();
    const [stats, setStats] = useState<Stats>(() => {
        if (CACHE && Date.now() - CACHE.at < CACHE_MS) return CACHE.stats;
        return EMPTY;
    });
    const [loaded, setLoaded] = useState(!!CACHE && Date.now() - CACHE.at < CACHE_MS);

    // ── Load stats ──
    useEffect(() => {
        let live = true;
        (async () => {
            if (CACHE && Date.now() - CACHE.at < CACHE_MS) {
                if (live) { setStats(CACHE.stats); setLoaded(true); }
                return;
            }

            const { data: papers } = await supabase
                .from("lm_papers_home")
                .select("id, price_kes, access_type, hot_score, opens_count")
                .eq("is_published", true)
                .eq("is_deleted", false);

            const rows = papers ?? [];
            const livePapers = rows.length;
            const cheapest = rows.reduce<number | null>((acc, p: any) => {
                if (p.access_type !== "paid" || !p.price_kes || p.price_kes <= 0) return acc;
                return acc === null || p.price_kes < acc ? p.price_kes : acc;
            }, null);
            const hot = rows.filter((p: any) => (p.hot_score ?? 0) >= 20).length;

            let unlocked = 0;
            let tokens = 0;

            if (user?.id) {
                const [{ data: entRows }, { data: prof }] = await Promise.all([
                    supabase
                        .from("lm_entitlements")
                        .select("paper_id,expires_at,is_active")
                        .eq("user_id", user.id),
                    supabase
                        .from("profiles")
                        .select("tokens")
                        .eq("user_id", user.id)
                        .maybeSingle(),
                ]);
                const now = Date.now();
                unlocked = (entRows ?? []).filter((r: any) =>
                    r.is_active && new Date(r.expires_at).getTime() > now
                ).length;
                tokens = prof?.tokens ?? 0;
            }

            const nextStats: Stats = { papers: livePapers, cheapest, unlocked, hot, tokens };
            CACHE = { stats: nextStats, at: Date.now() };
            if (live) { setStats(nextStats); setLoaded(true); }
        })();
        return () => { live = false; };
    }, [user?.id]);

    // ── Chip mode ──
    if (variant === "chip") {
        return (
            <button
                onClick={() => navigate("/last-minute")}
                className={cn(
                    "group inline-flex items-center gap-1.5 h-8 px-3 rounded-lg",
                    "bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider",
                    "hover:bg-primary/15 active:scale-95 transition-all",
                    className
                )}
            >
                <Zap className="h-3 w-3" />
                Last Minute
                {loaded && stats.papers > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-black">
                        {stats.papers}
                    </span>
                )}
                <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
        );
    }

    // ── Quiz-card variant ──
    if (variant === "quiz") {
        return (
            <div
                onClick={() => navigate("/last-minute")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate("/last-minute");
                    }
                }}
                className={cn(
                    "group relative w-full text-left overflow-hidden rounded-xl",
                    "bg-white dark:bg-muted/70 shadow-sm",
                    "hover:shadow-xl transition-all duration-300",
                    "active:scale-[0.995] cursor-pointer p-0",
                    className
                )}
            >
                {/* Carousel */}
                <HeroCarousel images={QUIZ_HERO_IMAGES} transition={transition} />

                {/* Overlays */}
                <div className="absolute top-3 left-3 z-10 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 pointer-events-none">
                    <Zap className="w-3 h-3" />
                    LAST MINUTE
                </div>

                {loaded && stats.cheapest !== null && (
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg shadow pointer-events-none">
                        <span className="tabular-nums">KSh {stats.cheapest.toLocaleString()}</span>
                    </div>
                )}

                {/* Body */}
                <div className="p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Pay once · No subscription
                    </p>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                        {title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
                        {blurb}
                    </p>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {loaded ? (
                            <>
                                {stats.papers > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                        {stats.papers} PAPERS
                                    </span>
                                )}
                                {stats.hot > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 inline-flex items-center gap-1">
                                        <Flame className="w-2.5 h-2.5" />
                                        {stats.hot} HOT
                                    </span>
                                )}
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                    READ IN-APP
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
                                <span className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
                            </>
                        )}
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate("/last-minute");
                        }}
                        className="mt-3 w-full h-12 rounded-2xl font-bold transition-all flex items-center justify-center gap-2
                            bg-gradient-to-r from-amber-500 to-orange-600 text-white
                            hover:from-amber-600 hover:to-orange-700 active:scale-95 shadow-md shadow-orange-500/20"
                    >
                        <Zap className="h-4 w-4 fill-current" />
                        Browse Papers
                        <ArrowUpRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    // ── Full card (original — untouched) ──
    return (
        <button
            onClick={() => navigate("/last-minute")}
            className={cn(
                "group w-full text-left rounded-2xl bg-card overflow-hidden active:scale-[0.995] transition-all hover:bg-card/80",
                className
            )}
        >
            <div className="relative p-4 sm:p-5">
                <div className="absolute top-0 left-0 h-full w-1 bg-primary" />
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                            The night-before library · no subscription
                        </p>
                        <h3 className="mt-1 text-base sm:text-lg font-bold text-foreground leading-tight">
                            {title}
                        </h3>
                        <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {blurb}
                        </p>
                    </div>
                    <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-primary" />
                    </div>
                </div>

                <div className="mt-3 flex items-center gap-3 text-[10px] flex-wrap">
                    {loaded ? (
                        <>
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <BookOpen className="h-3 w-3" />
                                <span className="font-bold text-foreground tabular-nums">{stats.papers}</span>
                                <span>live</span>
                            </span>
                            {stats.cheapest !== null && (
                                <>
                                    <span className="h-1 w-1 rounded-full bg-border" />
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                        <span className="font-bold tabular-nums">KSh {stats.cheapest.toLocaleString()}</span>
                                        <span className="text-muted-foreground">from</span>
                                    </span>
                                </>
                            )}
                            {stats.hot > 0 && (
                                <>
                                    <span className="h-1 w-1 rounded-full bg-border" />
                                    <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                        <Flame className="h-3 w-3" />
                                        <span className="font-bold tabular-nums">{stats.hot}</span>
                                        <span className="text-muted-foreground">hot</span>
                                    </span>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <span className="h-2.5 w-12 bg-muted/60 rounded animate-pulse" />
                            <span className="h-2.5 w-16 bg-muted/60 rounded animate-pulse" />
                        </>
                    )}
                </div>

                {user && loaded && (
                    <div className="mt-2 flex items-center gap-3 text-[10px] flex-wrap">
                        {stats.unlocked > 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                <Unlock className="h-3 w-3" />
                                {stats.unlocked} unlocked
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <Lock className="h-3 w-3" />
                                No papers unlocked yet
                            </span>
                        )}
                        {stats.tokens > 0 && (
                            <>
                                <span className="h-1 w-1 rounded-full bg-border" />
                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                    <Coins className="h-3 w-3" />
                                    <span className="font-bold tabular-nums">{stats.tokens}</span>
                                    <span>tokens</span>
                                </span>
                            </>
                        )}
                    </div>
                )}

                <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Pay-per-paper
                    </span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span className="inline-flex items-center gap-1">
                        <Unlock className="h-3 w-3" /> Instant unlock
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 text-primary font-bold">
                        Open <ArrowUpRight className="h-3 w-3" />
                    </span>
                </div>
            </div>
        </button>
    );
}