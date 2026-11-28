"use client";

import { memo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Users, Gift, Sparkles } from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";
import {
    getMyReferralCode,
    getMyReferralStats,
    type ReferralStats,
} from "@/lib/referrals";

const CACHE_KEY = "sidebar_cache_referral_v1";
const CACHE_TTL = 30 * 60 * 1000; // 30 min

const CARD_HEIGHT = 200;

type CachedReferral = {
    code: string;
    stats: ReferralStats;
    ts: number;
};

function readCache(): CachedReferral | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedReferral;
        if (!parsed?.code) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeCache(code: string, stats: ReferralStats) {
    try {
        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ code, stats, ts: Date.now() })
        );
    } catch { }
}

export const ReferralCard = memo(function ReferralCard({
    onNavigate,
}: {
    /** called before route change so the drawer can close */
    onNavigate?: () => void;
}) {
    const navigate = useNavigate();
    const session = useSession();
    const userId = session?.user?.id ?? null;

    const cached = readCache();
    const [code, setCode] = useState<string | null>(cached?.code ?? null);
    const [stats, setStats] = useState<ReferralStats>(
        cached?.stats ?? { invites: 0, pending: 0, daysEarned: 0 }
    );
    const [ready, setReady] = useState<boolean>(!!cached);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        const stale = !cached || Date.now() - cached.ts > CACHE_TTL;

        (async () => {
            try {
                const freshCode = await getMyReferralCode(userId);
                if (cancelled) return;
                if (freshCode) {
                    setCode(freshCode);
                    setReady(true);
                }

                if (stale) {
                    const freshStats = await getMyReferralStats(userId);
                    if (cancelled) return;
                    setStats(freshStats);
                    if (freshCode) writeCache(freshCode, freshStats);
                }
            } catch {
                /* silent — keep cache */
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    if (!ready || !code) return null;

    const hasEarned = stats.daysEarned > 0;
    const hasPending = stats.pending > 0;

    let subtitle: string;
    if (hasEarned && hasPending) {
        subtitle = `+${stats.daysEarned} days earned · ${stats.pending} pending`;
    } else if (hasEarned) {
        subtitle = `You've earned ${stats.daysEarned} Premium ${stats.daysEarned === 1 ? "day" : "days"}`;
    } else if (hasPending) {
        subtitle = `${stats.pending} invite${stats.pending === 1 ? "" : "s"} awaiting confirmation`;
    } else {
        subtitle = "Invite a nurse · earn 2 days each";
    }

    const handleClick = () => {
        if (navigator.vibrate) navigator.vibrate(10);
        navigate("/share");
        requestAnimationFrame(() => onNavigate?.());
    };

    return (
        <button
            onClick={handleClick}
            className="group relative w-full overflow-hidden rounded-2xl text-left
                       active:scale-[0.98] transition-transform
                       bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50
                       dark:from-[#1a1408] dark:via-[#161005] dark:to-[#1f1608]"
            style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                height: CARD_HEIGHT,
                minHeight: CARD_HEIGHT,
            }}
            aria-label="Open referral program"
        >
            {/* soft golden glow blobs — pure CSS, no animation */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full
                           bg-amber-300/40 dark:bg-amber-500/15 blur-2xl"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full
                           bg-orange-300/30 dark:bg-orange-500/10 blur-2xl"
            />

            <div
                className="relative flex h-full flex-col p-4"
                style={{ minHeight: CARD_HEIGHT }}
            >
                {/* top row — icon + bonus pill */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl
                                    bg-gradient-to-br from-amber-400 to-orange-500">
                        <Gift className="h-5 w-5 text-white" strokeWidth={2.4} />
                    </div>
                    <span
                        className="rounded-full bg-amber-500/15 dark:bg-amber-400/15
                                   px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider
                                   text-amber-800 dark:text-amber-300
                                   inline-flex items-center gap-1"
                    >
                        <Sparkles className="h-3 w-3" />
                        +2 days
                    </span>
                </div>

                {/* headline */}
                <div className="mt-3">
                    <p className="text-[18px] font-extrabold text-amber-950 dark:text-amber-50 leading-tight">
                        Invite &amp; Earn
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-amber-900/70 dark:text-amber-200/60 leading-snug">
                        {subtitle}
                    </p>
                </div>

                <div className="flex-1" />

                {/* bottom row — code · invites · CTA */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className="rounded-full bg-white/80 dark:bg-amber-950/40
                                   px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider
                                   text-amber-900 dark:text-amber-200"
                    >
                        {code}
                    </span>
                    {hasEarned && (
                        <span
                            className="inline-flex items-center gap-1 rounded-full
                                       bg-white/80 dark:bg-amber-950/40 px-2.5 py-1
                                       text-[10px] font-semibold
                                       text-amber-900 dark:text-amber-200"
                        >
                            <Users className="h-3 w-3" />
                            {stats.invites}
                        </span>
                    )}
                    <span
                        className="ml-auto inline-flex items-center gap-1
                                   rounded-full bg-gradient-to-r from-amber-500 to-orange-500
                                   px-3 py-1.5 text-[11.5px] font-bold text-white
                                   group-active:translate-x-0.5 transition-transform"
                    >
                        Share
                        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.6} />
                    </span>
                </div>
            </div>
        </button>
    );
});