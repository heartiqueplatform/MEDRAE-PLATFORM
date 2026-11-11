"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    BookOpen, Lock, Unlock, Coins, ChevronLeft,
    Search, AlertCircle, Clock, Flame, Sparkles, Bookmark, Share2,
    Star, Play, Eye, X,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { playSound } from "@/lib/soundManager";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Paper = {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    tagline: string | null;
    urgency_label: string | null;
    cover_image_url: string | null;
    exam_board: string | null;
    access_type: "paid" | "token" | "free" | "mixed";
    price_kes: number;
    token_cost: number;
    duration_days: number;
    question_count: number;
    opens_count: number;
    purchases_count: number;
    bookmarks_count: number;
    shares_count: number;
    rating_count: number;
    rating_avg: number;
    hot_score: number;
};

type State = {
    paper_id: string;
    is_entitled: boolean;
    expires_at: string | null;
    is_bookmarked: boolean;
    my_rating: number | null;
};

const BOARDS = ["All", "NCK", "KRCHN", "KRN"] as const;
type BoardFilter = (typeof BOARDS)[number];

// Avatar + ring config — mirrors MedraeQuizzes CATEGORY_STORIES
const BOARD_STORIES: {
    id: BoardFilter;
    label: string;
    avatar: string;
    ring: string;
}[] = [
        { id: "All", label: "All", avatar: "/pwaa-512x512.png", ring: "ring-gray-500" },
        { id: "NCK", label: "NCK", avatar: "/pwaa-512x512.png", ring: "ring-purple-500" },
        { id: "KRCHN", label: "KRCHN", avatar: "/pwaa-512x512.png", ring: "ring-blue-500" },
        { id: "KRN", label: "KRN", avatar: "/pwaa-512x512.png", ring: "ring-amber-500" },
    ];

const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
};

// ── BubblePop (same as MedraeQuizzes) ──
function BubblePop({ color = "#F59E0B", emoji }: { color?: string; emoji?: string }) {
    const particles = Array.from({ length: 6 });
    return (
        <span className="pointer-events-none absolute inset-0 overflow-visible z-20">
            {particles.map((_, i) => {
                const angle = (i / particles.length) * Math.PI * 2;
                const dist = 18 + (i % 3) * 4;
                const x = Math.cos(angle) * dist;
                const y = Math.sin(angle) * dist;
                return (
                    <motion.span
                        key={i}
                        initial={{ opacity: 1, x: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 0, x, y, scale: 1.3 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] leading-none"
                        style={{ color }}
                    >
                        {emoji ?? "•"}
                    </motion.span>
                );
            })}
        </span>
    );
}

export default function LastMinuteHome() {
    const navigate = useNavigate();
    const home = useHomeRoute();
    const user = useUser();

    const [papers, setPapers] = useState<Paper[]>([]);
    const [state, setState] = useState<Record<string, State>>({});
    const [tokens, setTokens] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [board, setBoard] = useState<BoardFilter>("All");
    const [query, setQuery] = useState("");
    const [bubbleKey, setBubbleKey] = useState<string | null>(null);

    const contentRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!bubbleKey) return;
        const t = setTimeout(() => setBubbleKey(null), 600);
        return () => clearTimeout(t);
    }, [bubbleKey]);

    // ─────────────────────────────────────────────────────────────
    // Load — DB does math, frontend reads
    // ─────────────────────────────────────────────────────────────
    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { data: papersData, error: papersErr } = await supabase
            .from("lm_papers_home")
            .select("*")
            .order("created_at", { ascending: false });

        if (papersErr) {
            setError(papersErr.message);
            setLoading(false);
            return;
        }
        setPapers((papersData ?? []) as Paper[]);

        if (user?.id) {
            const [{ data: stateData }, { data: profile }] = await Promise.all([
                supabase.from("lm_user_state").select("*"),
                supabase.from("profiles").select("tokens").eq("user_id", user.id).maybeSingle(),
            ]);
            const map: Record<string, State> = {};
            (stateData ?? []).forEach((row: any) => { map[row.paper_id] = row; });
            setState(map);
            setTokens(profile?.tokens ?? 0);
        }
        setLoading(false);
    }, [user?.id]);

    useEffect(() => { reload(); }, [reload]);

    // ─────────────────────────────────────────────────────────────
    // Filter
    // ─────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return papers.filter((p) => {
            const boardOk = board === "All" || (p.exam_board || "").toUpperCase() === board;
            const qOk =
                !needle ||
                p.title.toLowerCase().includes(needle) ||
                (p.description ?? "").toLowerCase().includes(needle) ||
                (p.tagline ?? "").toLowerCase().includes(needle);
            return boardOk && qOk;
        });
    }, [papers, board, query]);

    // ─────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────
    const searchOrFilterActive = !!query || board !== "All";

    const handleBack = () => {
        playSound("tap");
        if (navigator.vibrate) navigator.vibrate(20);
        if (searchOrFilterActive) {
            setQuery("");
            setBoard("All");
            contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        navigate(home, { replace: true });
    };

    const toggleBookmark = async (paper: Paper) => {
        const cur = state[paper.id]?.is_bookmarked ?? false;
        setState((prev) => ({
            ...prev,
            [paper.id]: {
                ...(prev[paper.id] ?? {
                    paper_id: paper.id, is_entitled: false, expires_at: null, my_rating: null,
                }),
                is_bookmarked: !cur,
            },
        }));
        setPapers((prev) =>
            prev.map((p) => (p.id === paper.id ? { ...p, bookmarks_count: Math.max(0, p.bookmarks_count + (cur ? -1 : 1)) } : p))
        );
        setBubbleKey(`bm:${paper.id}`);
        if (navigator.vibrate) navigator.vibrate(30);
        await supabase.rpc("lm_toggle_bookmark", { p_paper_id: paper.id });
    };

    const rate = async (paper: Paper, n: number) => {
        const cur = state[paper.id]?.my_rating ?? 0;
        if (n !== 0 && cur === n) return;
        setState((prev) => ({
            ...prev,
            [paper.id]: {
                ...(prev[paper.id] ?? {
                    paper_id: paper.id, is_entitled: false, expires_at: null, is_bookmarked: false,
                }),
                my_rating: n === 0 ? null : n,
            },
        }));
        setBubbleKey(`rt:${paper.id}:${n}`);
        if (navigator.vibrate) navigator.vibrate(20);
        await supabase.rpc("lm_rate_paper", { p_paper_id: paper.id, p_rating: n });
        reload();
    };

    const share = async (paper: Paper) => {
        const url = `${window.location.origin}/last-minute/${paper.slug}`;
        try {
            if (navigator.share) await navigator.share({ title: paper.title, url });
            else await navigator.clipboard.writeText(url);
            await supabase.rpc("lm_record_share", { p_paper_id: paper.id });
            setPapers((prev) =>
                prev.map((p) => (p.id === paper.id ? { ...p, shares_count: p.shares_count + 1 } : p))
            );
        } catch { /* cancelled */ }
    };

    const openPaper = (paper: Paper) => {
        playSound("tap");
        if (navigator.vibrate) navigator.vibrate(20);
        supabase.rpc("lm_record_open", { p_paper_id: paper.id }).then(() => { });
        navigate(`/last-minute/${paper.slug}`);
    };

    const entitledCount = Object.values(state).filter((s) => s.is_entitled).length;
    const cheapest = papers.reduce<number | null>(
        (acc, p) =>
            p.access_type === "paid" && p.price_kes > 0 && (acc === null || p.price_kes < acc)
                ? p.price_kes
                : acc,
        null
    );

    // ─────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────
    return (
        <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
            {/* ═════ HEADER ═════ */}
            <header className="flex-shrink-0 w-full flex items-center gap-3 px-3 sm:px-6 py-2.5 sm:py-3
        border-b border-gray-100 dark:border-gray-800
        bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80
        z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="flex items-center justify-center h-10 w-10 rounded-full
            bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
            active:scale-95 transition-all touch-manipulation shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white truncate flex-1">
                    Last Minute
                </h1>
                <div className="shrink-0 flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-bold tabular-nums">{fmt(tokens)}</span>
                </div>
            </header>

            {/* ═════ BODY ═════ */}
            <div
                ref={contentRef}
                className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden
          custom-scrollbar overscroll-contain
          px-0 sm:px-6 md:px-4 lg:px-6"
            >
                <div className="w-full max-w-full space-y-2 pb-24 safe-bottom">

                    {/* ── HERO ── */}
                    <section className="px-4 sm:px-0 pt-4 pb-3">
                        <h2 className="text-[24px] sm:text-[28px] font-black leading-[1.1] tracking-tight">
                            The paper you need.
                            {cheapest !== null && (
                                <span className="text-muted-foreground"> From KSh {cheapest.toLocaleString()}.</span>
                            )}
                        </h2>
                        <p className="mt-1 text-[13px] text-muted-foreground leading-snug">
                            One payment. One paper. Read it inside the app.
                        </p>

                        {!loading && papers.length > 0 && (
                            <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                                <span className="inline-flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {papers.length} papers
                                </span>
                                {entitledCount > 0 && (
                                    <>
                                        <span className="h-1 w-1 rounded-full bg-border" />
                                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                            <Unlock className="h-3 w-3" />
                                            {entitledCount} unlocked
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </section>

                    {/* ── FILTERS — avatar-form story tabs + search ── */}
                    <section className="px-4 sm:px-0 space-y-3">
                        {/* STORY TABS — same look as MedraeQuizzes */}
                        <div className="flex overflow-x-auto scrollbar-hide gap-3 md:gap-4 pb-1 pt-1
                            -mx-0 px-0 sm:flex-wrap sm:justify-center sm:overflow-visible">
                            {BOARD_STORIES.map((b) => {
                                const isActive = board === b.id;
                                return (
                                    <button
                                        key={b.id}
                                        onClick={() => {
                                            playSound("tap");
                                            if (navigator.vibrate) navigator.vibrate(15);
                                            setBoard(b.id);
                                        }}
                                        className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[68px] md:w-[76px]
                                            focus:outline-none group"
                                        aria-pressed={isActive}
                                    >
                                        <div
                                            className={`relative rounded-full p-[2.5px] transition-all duration-200
                                                ${isActive
                                                    ? `bg-foreground ring-2 ring-offset-2 ring-offset-background ${b.ring}`
                                                    : 'bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600'
                                                }`}
                                        >
                                            <div className="rounded-full p-[2px] bg-background">
                                                <img
                                                    src={b.avatar}
                                                    alt={b.label}
                                                    className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover"
                                                />
                                            </div>
                                            {isActive && (
                                                <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${b.ring.replace('ring-', 'bg-')}`} />
                                            )}
                                        </div>

                                        <span
                                            className={`text-[10px] md:text-[11px] font-semibold leading-tight text-center truncate w-full
                                                ${isActive
                                                    ? 'text-foreground'
                                                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
                                                }`}
                                        >
                                            {b.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* SEARCH */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search papers…"
                                className="w-full h-10 pl-8 pr-8 bg-gray-100 dark:bg-gray-900 border-0 rounded-lg text-[13px] font-medium
                  placeholder:text-muted-foreground/70 outline-none
                  focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery("")}
                                    aria-label="Clear"
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted transition-colors"
                                >
                                    <X className="h-3 w-3 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                    </section>

                    {/* ── CARDS ── */}
                    <section className="mt-3 px-2 sm:px-0">
                        {loading ? (
                            <div className="grid gap-[8px] sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                                {[1, 2, 3, 4].map((j) => (
                                    <div key={j} className="rounded-2xl overflow-hidden bg-white dark:bg-[#161b22]">
                                        <div className="h-60 sm:h-64 w-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                                        <div className="p-4 space-y-3">
                                            <div className="h-5 w-3/4 bg-slate-200 dark:bg-white/[0.06] rounded-lg animate-pulse" />
                                            <div className="h-4 w-full bg-slate-200 dark:bg-white/[0.06] rounded-lg animate-pulse" />
                                            <div className="h-10 w-full bg-slate-200 dark:bg-white/[0.06] rounded-xl mt-2 animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center py-12 px-4">
                                <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-3" />
                                <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <p className="text-gray-500 dark:text-gray-400">
                                    {papers.length === 0 ? "No papers live yet." : "Nothing matches your filter."}
                                </p>
                                {papers.length > 0 && (board !== "All" || query) && (
                                    <button
                                        onClick={() => { setBoard("All"); setQuery(""); }}
                                        className="mt-2 text-primary text-sm font-medium hover:underline"
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-[8px] sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 w-full">
                                {filtered.map((p) => {
                                    const s = state[p.id];
                                    const entitled = !!s?.is_entitled;
                                    const days = s?.expires_at
                                        ? Math.max(0, Math.ceil((new Date(s.expires_at).getTime() - Date.now()) / 86400000))
                                        : 0;
                                    const bookmarked = !!s?.is_bookmarked;
                                    const myRating = s?.my_rating ?? 0;
                                    const isHot = p.hot_score >= 20;

                                    const priceLabel =
                                        p.access_type === "free"
                                            ? "Free"
                                            : p.access_type === "token"
                                                ? `${p.token_cost} tk`
                                                : `KSh ${p.price_kes.toLocaleString()}`;

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => openPaper(p)}
                                            className="group relative overflow-hidden rounded-2xl
bg-white dark:bg-[#161b22]
cursor-pointer p-0
active:scale-[0.99] transition-transform"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            {/* IMAGE */}
                                            <div className="relative h-60 sm:h-64 w-full overflow-hidden">
                                                {p.cover_image_url ? (
                                                    <img
                                                        src={p.cover_image_url}
                                                        alt={p.title}
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLImageElement).style.display = "none";
                                                            (e.currentTarget.parentElement as HTMLElement).classList.add(
                                                                "bg-slate-100", "dark:bg-[#0d1117]"
                                                            );
                                                        }}
                                                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full bg-slate-100 dark:bg-[#0d1117] flex items-center justify-center">
                                                        <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-600" />
                                                    </div>
                                                )}

                                                {p.urgency_label && (
                                                    <div className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                                                        <Flame className="w-3 h-3" /> {p.urgency_label}
                                                    </div>
                                                )}

                                                <div className="absolute top-3 right-3">
                                                    {entitled ? (
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg shadow">
                                                            <Unlock className="w-3 h-3" /> {days}d LEFT
                                                        </div>
                                                    ) : p.access_type === "free" ? (
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg shadow">
                                                            <Sparkles className="w-3 h-3" /> FREE
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg shadow">
                                                            <Lock className="w-3 h-3" /> {priceLabel}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* HEADER ROW */}
                                            <div className="pb-2 pt-3 px-4">
                                                <div className="flex items-center gap-2 flex-wrap mb-2 min-h-[20px]">
                                                    {p.rating_count > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                            <Star size={11} fill="currentColor" />
                                                            {p.rating_avg.toFixed(1)}
                                                            <span className="text-gray-400 font-medium">({p.rating_count})</span>
                                                        </span>
                                                    )}
                                                    {p.opens_count > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                                            <Eye size={11} /> {fmt(p.opens_count)} opened
                                                        </span>
                                                    )}
                                                    {isHot && (
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                                                            <Flame size={11} /> HOT
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-lg font-bold leading-tight text-gray-900 dark:text-gray-100 min-h-[3rem] line-clamp-2">
                                                    {p.title}
                                                </h3>
                                            </div>

                                            {/* BODY */}
                                            <div className="px-4 pb-4">
                                                <div className="flex flex-col gap-3">
                                                    {(p.tagline || p.description) && (
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
                                                            {p.tagline || p.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                                            {p.question_count} Questions
                                                        </span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {p.duration_days}d
                                                        </span>
                                                        {p.exam_board && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                                                {p.exam_board}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openPaper(p); }}
                                                        className={cn(
                                                            "w-full h-12 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                                                            entitled
                                                                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none"
                                                                : "bg-primary hover:opacity-90 text-primary-foreground"
                                                        )}
                                                    >
                                                        {entitled ? (
                                                            <><Play className="h-4 w-4 fill-current" /> Open Paper</>
                                                        ) : (
                                                            <><Lock className="h-4 w-4" /> Unlock for {priceLabel}</>
                                                        )}
                                                    </button>
                                                </div>
                                                {/* ACTION ROW — stars, then Save + Share labeled pills */}
                                                <div className="pt-3 mt-1">
                                                    <div className="flex flex-col items-center gap-1.5 mb-2">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider
                      text-slate-500 dark:text-slate-400 text-center">
                                                            {myRating > 0
                                                                ? `You rated this ${myRating} star${myRating === 1 ? "" : "s"} · tap again to clear`
                                                                : "Tap a star to rate"}
                                                        </p>
                                                        <div className="flex items-center justify-center gap-1">
                                                            {[1, 2, 3, 4, 5].map((n) => {
                                                                const filled = myRating >= n;
                                                                return (
                                                                    <button
                                                                        key={n}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const nextRating = myRating === n ? 0 : n;
                                                                            rate(p, nextRating);
                                                                        }}
                                                                        className="relative flex items-center justify-center h-9 w-9 rounded-lg
                                   bg-slate-50 dark:bg-white/[0.04]
                                   active:scale-[0.95] transition-transform"
                                                                        style={{ touchAction: "manipulation" }}
                                                                        aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                                                                    >
                                                                        {bubbleKey === `rt:${p.id}:${n}` && <BubblePop color="#F59E0B" emoji="⭐" />}
                                                                        <Star
                                                                            size={18}
                                                                            fill={filled ? "currentColor" : "none"}
                                                                            strokeWidth={2}
                                                                            className={cn(
                                                                                "relative z-10 transition-colors",
                                                                                filled
                                                                                    ? "text-amber-500"
                                                                                    : "text-slate-300 dark:text-slate-600"
                                                                            )}
                                                                        />
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleBookmark(p); }}
                                                            className={cn(
                                                                "relative flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5",
                                                                "text-[10px] font-bold uppercase tracking-wider",
                                                                "active:scale-[0.97] transition-transform",
                                                                bookmarked
                                                                    ? "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                                                                    : "bg-slate-50 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300"
                                                            )}
                                                            style={{ touchAction: "manipulation" }}
                                                            aria-label={bookmarked ? "Remove bookmark" : "Bookmark this paper"}
                                                        >
                                                            {bubbleKey === `bm:${p.id}` && <BubblePop color="#10B981" emoji="🔖" />}
                                                            <Bookmark size={14} fill={bookmarked ? "currentColor" : "none"} className="relative z-10" />
                                                            <span className="relative z-10">{bookmarked ? "Saved" : "Save"}</span>
                                                        </button>

                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); share(p); }}
                                                            className="flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5
                       bg-slate-50 dark:bg-white/[0.04]
                       text-slate-600 dark:text-slate-300
                       text-[10px] font-bold uppercase tracking-wider
                       active:scale-[0.97] transition-transform"
                                                            style={{ touchAction: "manipulation" }}
                                                            aria-label="Share this paper"
                                                        >
                                                            <Share2 size={14} />
                                                            <span>Share</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {!loading && papers.length > 0 && (
                        <p className="mt-6 px-4 sm:px-0 text-[11px] text-muted-foreground text-center leading-relaxed">
                            Every paper locks automatically when its window ends. No auto-renewal.
                            No download. No sharing — access stays yours alone.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}