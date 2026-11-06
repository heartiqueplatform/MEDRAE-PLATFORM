"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Zap, ArrowUpRight, Lock, Unlock, BookOpen, Flame, Coins,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { cn } from "@/lib/utils";

type Variant = "card" | "chip";

type Stats = {
    papers: number;
    cheapest: number | null;
    unlocked: number;
    hot: number;         // papers with hot_score >= 20
    tokens: number;
};

const EMPTY: Stats = { papers: 0, cheapest: null, unlocked: 0, hot: 0, tokens: 0 };

let CACHE: { stats: Stats; at: number } | null = null;
const CACHE_MS = 60_000;

export function LastMinuteCard({
    variant = "card",
    title = "Last Minute",
    blurb = "Exam-paper style. Pay once, no subscription. Read in-app only.",
    className = "",
}: {
    variant?: Variant;
    title?: string;
    blurb?: string;
    className?: string;
}) {
    const navigate = useNavigate();
    const user = useUser();
    const [stats, setStats] = useState<Stats>(() => {
        if (CACHE && Date.now() - CACHE.at < CACHE_MS) return CACHE.stats;
        return EMPTY;
    });
    const [loaded, setLoaded] = useState(!!CACHE && Date.now() - CACHE.at < CACHE_MS);

    // ── Load once (or every 60s if remounted) ──
    useEffect(() => {
        let live = true;
        (async () => {
            // Try cache first
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

    // ── Full card ──
    return (
        <button
            onClick={() => navigate("/last-minute")}
            className={cn(
                "group w-full text-left rounded-2xl bg-card overflow-hidden active:scale-[0.995] transition-all hover:bg-card/80",
                className
            )}
        >
            <div className="relative p-4 sm:p-5">
                {/* accent stripe */}
                <div className="absolute top-0 left-0 h-full w-1 bg-primary" />

                {/* Top row */}
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

                {/* Live stat strip */}
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

                {/* User-specific strip — only when logged in */}
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

                {/* Bottom row — trust + CTA */}
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