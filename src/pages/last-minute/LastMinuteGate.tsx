"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ChevronLeft, Lock, Unlock, Coins, Smartphone, Loader2, AlertCircle,
    BookOpen, Timer, ShieldCheck, Zap, CheckCircle2, Clock, Flame,
    Eye, Star, Bookmark, Share2, Crown, PartyPopper,
} from "lucide-react";
import confetti from "canvas-confetti";
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
    bookmarks_count: number;
    shares_count: number;
    rating_count: number;
    rating_avg: number;
    hot_score: number;
};

type Access = {
    is_entitled: boolean;
    expires_at: string | null;
    has_subscription: boolean;
} | null;

const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
};

// ── Fast access check — one RPC, one view read. No loops, no fallbacks. ──
async function checkAccess(userId: string | undefined, paperId: string): Promise<Access> {
    if (!userId) return null;

    // Two parallel reads — both cached at the DB layer
    const [rpc, stateRow] = await Promise.all([
        supabase.rpc("lm_has_access", { p_user_id: userId, p_paper_id: paperId }),
        supabase
            .from("lm_user_state")
            .select("is_entitled,expires_at,has_subscription")
            .eq("paper_id", paperId)
            .maybeSingle(),
    ]);

    if (rpc.error) return null;
    const isEntitled = !!rpc.data;
    if (!isEntitled) return null;

    const row: any = stateRow.data;
    return {
        is_entitled: true,
        expires_at: row?.expires_at ?? null,
        has_subscription: !!row?.has_subscription,
    };
}

// ── Confetti burst — fires on unlock ──
function fireConfetti() {
    // Single gentle burst from the top center — one spark, done.
    confetti({
        particleCount: 40,
        spread: 70,
        startVelocity: 28,
        gravity: 0.9,
        scalar: 0.85,
        ticks: 120,
        origin: { x: 0.5, y: 0.35 },
        colors: ["#10B981", "#34D399", "#FCD34D"],
        disableForReducedMotion: true,
    });
}
// ── Success overlay shown immediately when payment confirmed ──
function SuccessOverlay({
    title,
    subtitle,
    onContinue,
    autoContinueMs = 1600,
}: {
    title: string;
    subtitle: string;
    onContinue: () => void;
    autoContinueMs?: number;
}) {
    useEffect(() => {
        const t = window.setTimeout(onContinue, autoContinueMs);
        return () => window.clearTimeout(t);
    }, [onContinue, autoContinueMs]);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_180ms_ease-out]">
            <div className="w-full max-w-sm rounded-3xl bg-card overflow-hidden shadow-2xl animate-[popIn_260ms_cubic-bezier(0.34,1.56,0.64,1)]">
                <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-cyan-400" />
                <div className="p-6 text-center space-y-4">
                    <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                        <PartyPopper className="h-7 w-7 text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">{title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
                    </div>
                    <button
                        onClick={onContinue}
                        className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                    >
                        <BookOpen className="h-4 w-4" />
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
export default function LastMinuteGate() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const home = useHomeRoute();
    const user = useUser();

    const [paper, setPaper] = useState<Paper | null>(null);
    const [access, setAccess] = useState<Access>(null);
    const [bookmarked, setBookmarked] = useState(false);
    const [myRating, setMyRating] = useState(0);

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
    const [showSuccess, setShowSuccess] = useState<{ title: string; subtitle: string } | null>(null);

    const [phone, setPhone] = useState("");
    const [tokens, setTokens] = useState(0);

    const pollRef = useRef<number | null>(null);
    const stopPolling = useCallback(() => {
        if (pollRef.current !== null) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    // ─────────────────────────────────────────────────────────────
    // Load — all reads in parallel, no serial awaits
    // ─────────────────────────────────────────────────────────────
    const loadAll = useCallback(async () => {
        if (!slug) return;
        setLoading(true);

        // 1. Fetch paper + (optionally) user-specific data in parallel
        const paperPromise = supabase
            .from("lm_papers")
            .select(
                "id,slug,title,description,tagline,urgency_label,cover_image_url,exam_board,access_type,price_kes,token_cost,duration_days,question_count,opens_count,bookmarks_count,shares_count,rating_count,rating_avg,hot_score"
            )
            .eq("slug", slug)
            .eq("is_published", true)
            .eq("is_deleted", false)
            .maybeSingle();

        const userDataPromise = user?.id
            ? Promise.all([
                checkAccess(user.id, ""), // paper_id not known yet — refetched below
                supabase.from("profiles").select("tokens,phone").eq("user_id", user.id).maybeSingle(),
            ])
            : null;

        const [{ data: p }, userData] = await Promise.all([
            paperPromise,
            userDataPromise ?? Promise.resolve(null),
        ]);

        const paperRow = (p ?? null) as Paper | null;
        setPaper(paperRow);

        if (paperRow && user?.id) {
            // 2. Fire the access + bookmark + rating reads in parallel
            const [accessRes, bookmarkRes, ratingRes] = await Promise.all([
                checkAccess(user.id, paperRow.id),
                supabase.from("lm_paper_bookmarks").select("paper_id").eq("user_id", user.id).eq("paper_id", paperRow.id).maybeSingle(),
                supabase.from("lm_paper_ratings").select("rating").eq("user_id", user.id).eq("paper_id", paperRow.id).maybeSingle(),
            ]);

            setAccess(accessRes);
            setBookmarked(!!bookmarkRes.data);
            setMyRating(ratingRes.data?.rating ?? 0);

            if (userData?.[1]?.data) {
                setTokens(userData[1].data.tokens ?? 0);
                if (userData[1].data.phone && !phone) setPhone(userData[1].data.phone);
            }
        }
        setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, user?.id]);

    useEffect(() => { loadAll(); }, [loadAll]);

    // Retry access if user?.id arrives late
    useEffect(() => {
        if (!paper || !user?.id || access) return;
        let live = true;
        (async () => {
            const a = await checkAccess(user.id, paper.id);
            if (live && a) setAccess(a);
        })();
        return () => { live = false; };
    }, [paper, user?.id, access]);

    useEffect(() => () => stopPolling(), [stopPolling]);

    // Preload cover image so it never pops in late
    useEffect(() => {
        if (!paper?.cover_image_url) return;
        const img = new Image();
        img.src = paper.cover_image_url;
    }, [paper?.cover_image_url]);

    // ─────────────────────────────────────────────────────────────
    // Payment confirmation — the celebratory moment
    // ─────────────────────────────────────────────────────────────
    const handlePaymentConfirmed = useCallback(
        (kind: "mpesa" | "token") => {
            if (!paper) return;
            stopPolling();
            setBusy(false);

            // Fire confetti the instant we know
            fireConfetti();

            // Show success overlay
            setShowSuccess({
                title: kind === "mpesa" ? "Payment received" : "Tokens redeemed",
                subtitle: `"${paper.title}" is now yours. Opening it…`,
            });

            // Refresh tokens quietly
            supabase.from("profiles").select("tokens").eq("user_id", user!.id).maybeSingle()
                .then(({ data }) => data && setTokens(data.tokens ?? 0));

            // Fetch fresh access state (so banner updates too)
            checkAccess(user!.id, paper.id).then((a) => a && setAccess(a));
        },
        [paper, user, stopPolling]
    );

    // Poll for access after STK
    const startPolling = useCallback(
        (userId: string, paperId: string) => {
            stopPolling();
            const startedAt = Date.now();
            pollRef.current = window.setInterval(async () => {
                const a = await checkAccess(userId, paperId);
                if (a) {
                    handlePaymentConfirmed("mpesa");
                    return;
                }
                if (Date.now() - startedAt > 180_000) {
                    stopPolling();
                    setBusy(false);
                    setMsg({
                        kind: "err",
                        text: "We haven't received the M-Pesa confirmation yet. If you were charged, wait 30s and pull to refresh.",
                    });
                }
            }, 2500);
        },
        [handlePaymentConfirmed, stopPolling]
    );

    // ─────────────────────────────────────────────────────────────
    // Pay
    // ─────────────────────────────────────────────────────────────
    const handlePay = async () => {
        if (!paper || !user) return;
        let clean = phone.replace(/\D/g, "");
        if (clean.startsWith("0")) clean = "254" + clean.slice(1);
        else if (!clean.startsWith("254")) clean = "254" + clean;
        if (clean.length !== 12) {
            setMsg({ kind: "err", text: "Enter a valid M-Pesa number, e.g. 0712 345 678" });
            return;
        }

        setBusy(true);
        setMsg(null);
        playSound("tap");
        if (navigator.vibrate) navigator.vibrate(20);

        const safety = window.setTimeout(() => {
            setBusy(false);
            setMsg({ kind: "err", text: "Payment timed out. Check your connection and try again." });
        }, 25_000);

        try {
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/last-minute-stk`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({ phone: clean, userId: user.id, paper_id: paper.id }),
                }
            );
            const data = await res.json();
            window.clearTimeout(safety);
            if (!res.ok) throw new Error(data?.error || "Payment could not start");

            setMsg({
                kind: "ok",
                text: `Enter your M-Pesa PIN on ${clean}. This page unlocks the moment it's confirmed.`,
            });
            startPolling(user.id, paper.id);
        } catch (err: any) {
            window.clearTimeout(safety);
            setBusy(false);
            setMsg({ kind: "err", text: err.message || "Payment could not start" });
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Redeem tokens
    // ─────────────────────────────────────────────────────────────
    const handleRedeemTokens = async () => {
        if (!paper || !user) return;
        setBusy(true);
        setMsg(null);
        playSound("tap");
        if (navigator.vibrate) navigator.vibrate(20);

        try {
            const { error } = await supabase.rpc("lm_redeem_with_tokens", { p_paper_id: paper.id });
            if (error) throw error;

            const a = await checkAccess(user.id, paper.id);
            if (a) {
                setAccess(a);
                setTokens((t) => Math.max(0, t - paper.token_cost));
                handlePaymentConfirmed("token");
            } else {
                setBusy(false);
                setMsg({
                    kind: "err",
                    text: "Tokens were deducted but access didn't activate. Contact support — your tokens will be refunded.",
                });
            }
        } catch (err: any) {
            setBusy(false);
            setMsg({ kind: "err", text: err.message || "Could not redeem tokens" });
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Engagement (bookmark / rate / share) — optimistic + RPC
    // ─────────────────────────────────────────────────────────────
    const toggleBookmark = async () => {
        if (!paper) return;
        const next = !bookmarked;
        setBookmarked(next);
        playSound("tap");
        if (navigator.vibrate) navigator.vibrate(30);
        setPaper((prev) =>
            prev ? { ...prev, bookmarks_count: Math.max(0, prev.bookmarks_count + (next ? 1 : -1)) } : prev
        );
        await supabase.rpc("lm_toggle_bookmark", { p_paper_id: paper.id });
    };

    const rate = async (n: number) => {
        if (!paper || myRating === n) return;
        setMyRating(n);
        playSound("tap");
        if (navigator.vibrate) navigator.vibrate(20);
        await supabase.rpc("lm_rate_paper", { p_paper_id: paper.id, p_rating: n });
        const { data: refreshed } = await supabase
            .from("lm_papers")
            .select("rating_avg,rating_count")
            .eq("id", paper.id)
            .maybeSingle();
        if (refreshed) {
            setPaper((prev) =>
                prev
                    ? { ...prev, rating_avg: refreshed.rating_avg ?? 0, rating_count: refreshed.rating_count ?? 0 }
                    : prev
            );
        }
    };

    const share = async () => {
        if (!paper) return;
        const url = `${window.location.origin}/last-minute/${paper.slug}`;
        try {
            if (navigator.share) await navigator.share({ title: paper.title, url });
            else await navigator.clipboard.writeText(url);
            await supabase.rpc("lm_record_share", { p_paper_id: paper.id });
            setPaper((prev) => (prev ? { ...prev, shares_count: prev.shares_count + 1 } : prev));
        } catch { /* cancelled */ }
    };

    const openReader = () => {
        if (!paper) return;
        playSound("start");
        if (navigator.vibrate) navigator.vibrate(50);
        navigate(`/last-minute/${paper.slug}/read`, { replace: true });
    };

    // ─────────────────────────────────────────────────────────────
    // Derived
    // ─────────────────────────────────────────────────────────────
    const dayLeft = access?.expires_at
        ? Math.max(0, Math.ceil((new Date(access.expires_at).getTime() - Date.now()) / 86400000))
        : 0;
    const isEntitled = !!access?.is_entitled;
    const isSubscribed = !!access?.has_subscription;
    const priceLabel =
        !paper ? "" :
            paper.access_type === "free" ? "Free"
                : paper.access_type === "token" ? `${paper.token_cost} tokens`
                    : `KSh ${paper.price_kes.toLocaleString()}`;

    // ─────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
            {/* ═════ Success overlay — shown the instant payment lands ═════ */}
            {showSuccess && (
                <SuccessOverlay
                    title={showSuccess.title}
                    subtitle={showSuccess.subtitle}
                    autoContinueMs={1100}
                    onContinue={() => {
                        setShowSuccess(null);
                        openReader();
                    }}
                />
            )}

            {/* ═════ HEADER ═════ */}
            <header className="flex-shrink-0 w-full flex items-center gap-3 px-3 sm:px-6 py-2.5 sm:py-3
        border-b border-gray-100 dark:border-gray-800
        bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80
        z-30 safe-top">
                <button
                    onClick={() => { playSound("tap"); navigate(-1); }}
                    aria-label="Back"
                    className="flex items-center justify-center h-10 w-10 rounded-full
            bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
            active:scale-95 transition-all touch-manipulation shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white truncate">
                        {loading ? "Loading…" : paper?.title || "Last Minute"}
                    </h1>
                    <p className="text-[11px] text-muted-foreground truncate">
                        {paper?.exam_board || "General"} · Last Minute
                    </p>
                </div>
                {paper?.access_type === "paid" && !isSubscribed && (
                    <div className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Pay
                        </span>
                    </div>
                )}
            </header>

            {/* ═════ BODY ═════ */}
            <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div className="w-full sm:max-w-2xl sm:mx-auto px-0 sm:px-6 py-0 sm:py-6 pb-24">

                    {loading ? (
                        <div className="space-y-3">
                            <div className="h-56 bg-muted/50 animate-pulse" />
                            <div className="px-4 sm:px-0 pt-4 space-y-3">
                                <div className="h-4 w-20 bg-muted/50 animate-pulse" />
                                <div className="h-6 w-3/4 bg-muted/50 animate-pulse" />
                                <div className="h-4 w-full bg-muted/50 animate-pulse" />
                            </div>
                        </div>
                    ) : !paper ? (
                        <div className="p-10 text-center">
                            <AlertCircle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">Paper not found.</p>
                        </div>
                    ) : (
                        <>
                            {/* Cover image */}
                            {paper.cover_image_url && (
                                <div className="relative w-full aspect-[16/9] sm:rounded-2xl overflow-hidden bg-muted">
                                    <img
                                        src={paper.cover_image_url}
                                        alt={paper.title}
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.display = "none";
                                            (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                                        }}
                                        className="h-full w-full object-cover"
                                    />
                                    {paper.urgency_label && (
                                        <div className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                                            <Flame className="w-3 h-3" /> {paper.urgency_label}
                                        </div>
                                    )}
                                    {isEntitled && (
                                        <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                                            <Unlock className="w-3 h-3" /> Unlocked
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Header block */}
                            <section className="px-4 sm:px-0 pt-4 pb-3 sm:py-5">
                                {!paper.cover_image_url && paper.urgency_label && (
                                    <div className="inline-flex items-center gap-1 mb-2 text-rose-600 dark:text-rose-400">
                                        <Flame className="h-3 w-3" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.14em]">
                                            {paper.urgency_label}
                                        </span>
                                    </div>
                                )}

                                <h2 className="text-[22px] sm:text-3xl font-black leading-[1.15] tracking-tight">
                                    {paper.title}
                                </h2>

                                {(paper.tagline || paper.description) && (
                                    <p className="mt-2 text-[13px] sm:text-sm text-muted-foreground leading-relaxed">
                                        {paper.tagline || paper.description}
                                    </p>
                                )}

                                <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                                    <span className="inline-flex items-center gap-1">
                                        <BookOpen className="h-3 w-3" />
                                        {paper.question_count} Qs
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-border" />
                                    <span className="inline-flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {paper.duration_days}d access
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-border" />
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                        <ShieldCheck className="h-3 w-3" />
                                        In-app only
                                    </span>
                                </div>
                            </section>

                            {/* Engagement strip */}
                            <section className="px-4 sm:px-0 py-2 flex items-center gap-2 border-y border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-1 flex-wrap text-[11px] text-muted-foreground flex-1">
                                    {paper.opens_count > 0 && (
                                        <span className="inline-flex items-center gap-1 mr-2">
                                            <Eye className="h-3 w-3" /> {fmt(paper.opens_count)} opened
                                        </span>
                                    )}
                                    {paper.rating_count > 0 && (
                                        <span className="inline-flex items-center gap-1 mr-2">
                                            <Star size={11} fill="currentColor" className="text-amber-500" />
                                            <span className="font-semibold text-foreground">{paper.rating_avg.toFixed(1)}</span>
                                            <span>({paper.rating_count})</span>
                                        </span>
                                    )}
                                    {paper.bookmarks_count > 0 && (
                                        <span className="inline-flex items-center gap-1 mr-2">
                                            <Bookmark size={11} /> {fmt(paper.bookmarks_count)}
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={toggleBookmark}
                                    className={cn(
                                        "flex items-center justify-center h-9 w-9 rounded-lg transition-colors touch-manipulation active:scale-95",
                                        bookmarked
                                            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                                            : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                    )}
                                    aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
                                >
                                    <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
                                </button>

                                <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((n) => {
                                        const filled = myRating >= n;
                                        return (
                                            <button
                                                key={n}
                                                onClick={() => rate(n)}
                                                className="flex items-center justify-center h-9 w-5 transition-transform hover:scale-110 active:scale-95 touch-manipulation"
                                                aria-label={`Rate ${n}`}
                                            >
                                                <Star
                                                    size={14}
                                                    fill={filled ? "currentColor" : "none"}
                                                    strokeWidth={1.75}
                                                    className={filled ? "text-amber-500" : "text-gray-300 dark:text-gray-600"}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={share}
                                    className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors touch-manipulation active:scale-95"
                                    aria-label="Share"
                                >
                                    <Share2 size={16} />
                                </button>
                            </section>

                            {/* ── Access banner — differs based on subscription vs per-paper ── */}
                            {isEntitled && (
                                <section className="px-4 sm:px-0 py-5">
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
                                            isSubscribed ? "bg-amber-500/15" : "bg-emerald-500/15"
                                        )}>
                                            {isSubscribed ? (
                                                <Crown className="h-5 w-5 text-amber-500" />
                                            ) : (
                                                <Unlock className="h-5 w-5 text-emerald-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold">
                                                {isSubscribed ? "Included in your subscription" : "You have access"}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {isSubscribed ? (
                                                    <>
                                                        Every Last Minute paper is yours while your plan is active
                                                        {dayLeft > 0 && (
                                                            <>
                                                                {" · "}
                                                                <strong className="text-amber-500">{dayLeft} day{dayLeft === 1 ? "" : "s"} left on plan</strong>
                                                            </>
                                                        )}
                                                        .
                                                    </>
                                                ) : (
                                                    <>
                                                        Valid for another{" "}
                                                        <strong className="text-emerald-500">{dayLeft} day{dayLeft === 1 ? "" : "s"}</strong>.
                                                        After that, the paper locks again.
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={openReader}
                                        className={cn(
                                            "mt-4 w-full h-12 rounded-xl text-white text-sm font-bold active:scale-[0.99] transition-all flex items-center justify-center gap-2",
                                            isSubscribed
                                                ? "bg-amber-600 hover:bg-amber-700"
                                                : "bg-emerald-600 hover:bg-emerald-700"
                                        )}
                                    >
                                        <BookOpen className="h-4 w-4" /> Open paper
                                    </button>
                                </section>
                            )}

                            {/* ── Checkout ── */}
                            {!isEntitled && paper.access_type !== "free" && (
                                <section className="px-4 sm:px-0 py-4 space-y-5">
                                    {(paper.access_type === "paid" || paper.access_type === "mixed") && (
                                        <>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary mb-1">
                                                    Pay with M-Pesa
                                                </p>
                                                <div className="flex items-baseline gap-2 flex-wrap">
                                                    <span className="text-3xl font-black tracking-tight tabular-nums">
                                                        KSh {paper.price_kes.toLocaleString()}
                                                    </span>
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        one-time · {paper.duration_days} days
                                                    </span>
                                                </div>
                                                <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                                                    No subscription. No renewal. Locked to your account.
                                                </p>
                                            </div>

                                            <div>
                                                <label
                                                    htmlFor="phone"
                                                    className="text-[10px] font-black uppercase tracking-wider text-muted-foreground"
                                                >
                                                    M-Pesa number
                                                </label>
                                                <div className="relative mt-1">
                                                    <Smartphone className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                                    <input
                                                        id="phone"
                                                        type="tel"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        placeholder="0712 345 678"
                                                        inputMode="numeric"
                                                        className="w-full h-11 pl-7 pr-2 bg-transparent border-0 border-b border-border focus:border-foreground outline-none text-sm font-medium placeholder:text-muted-foreground/60 transition-colors"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={handlePay}
                                                disabled={busy}
                                                className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold
                          hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition-all
                          flex items-center justify-center gap-2"
                                            >
                                                {busy ? (
                                                    <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for M-Pesa…</>
                                                ) : (
                                                    <><Lock className="h-4 w-4" /> Pay KSh {paper.price_kes.toLocaleString()}</>
                                                )}
                                            </button>
                                        </>
                                    )}

                                    {(paper.access_type === "token" || paper.access_type === "mixed") && (
                                        <div className={paper.access_type === "mixed" ? "pt-4 border-t border-gray-100 dark:border-gray-800" : ""}>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                                    Or spend tokens
                                                </p>
                                                <span className="text-[11px] text-muted-foreground">
                                                    Balance <strong className="text-amber-500 tabular-nums">{tokens}</strong>
                                                </span>
                                            </div>
                                            <button
                                                onClick={handleRedeemTokens}
                                                disabled={busy || tokens < paper.token_cost}
                                                className="w-full h-12 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-bold
                          hover:bg-amber-500/15 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all
                          flex items-center justify-center gap-2"
                                            >
                                                <Coins className="h-4 w-4" />
                                                Redeem {paper.token_cost} tokens
                                            </button>
                                            {tokens < paper.token_cost && (
                                                <p className="mt-2 text-[11px] text-muted-foreground text-center">
                                                    You need {paper.token_cost - tokens} more tokens. Earn them by finishing quizzes.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {msg && (
                                        <div
                                            className={cn(
                                                "rounded-xl border px-3.5 py-3 text-xs flex items-start gap-2",
                                                msg.kind === "ok"
                                                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                                                    : "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400"
                                            )}
                                        >
                                            {msg.kind === "ok"
                                                ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                                                : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                                            <span className="leading-relaxed">{msg.text}</span>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
                                        <span className="inline-flex items-center gap-1.5">
                                            <ShieldCheck className="h-3.5 w-3.5" /> Secured by Safaricom
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <Zap className="h-3.5 w-3.5" /> Instant unlock
                                        </span>
                                    </div>
                                </section>
                            )}

                            {/* Free paper */}
                            {!isEntitled && paper.access_type === "free" && (
                                <section className="px-4 sm:px-0 py-5">
                                    <button
                                        onClick={openReader}
                                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold
                      hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Unlock className="h-4 w-4" /> Start free paper
                                    </button>
                                </section>
                            )}

                            <p className="mt-6 mb-2 px-4 sm:px-0 text-[11px] text-muted-foreground text-center leading-relaxed">
                                Locks automatically when the window ends. No auto-renewal.
                                No download. Access stays yours alone.
                            </p>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}