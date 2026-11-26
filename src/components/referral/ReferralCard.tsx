"use client";

import { memo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, ChevronRight, Sparkles, Users } from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";
import {
    getMyReferralCode,
    getMyReferralStats,
    type ReferralStats,
} from "@/lib/referrals";

const CACHE_KEY = "sidebar_cache_referral_v1";
const CACHE_TTL = 30 * 60 * 1000; // 30 min

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

    // Fetch fresh in the background (cache-first paint, then refresh)
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        const stale =
            !cached || Date.now() - cached.ts > CACHE_TTL;

        (async () => {
            try {
                // Always have a code ready — cheap call
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

    // Don't render a broken card
    if (!ready || !code) return null;

    const hasEarned = stats.daysEarned > 0;
    const hasPending = stats.pending > 0;

    // Contextual subtitle — the "smart" bit
    let subtitle: string;
    if (hasEarned && hasPending) {
        subtitle = `+${stats.daysEarned} days earned · ${stats.pending} pending`;
    } else if (hasEarned) {
        subtitle = `You've earned ${stats.daysEarned} Premium ${stats.daysEarned === 1 ? "day" : "days"
            }`;
    } else if (hasPending) {
        subtitle = `${stats.pending} invite${stats.pending === 1 ? "" : "s"
            } awaiting confirmation`;
    } else {
        subtitle = "Invite a nurse · earn 2 days each";
    }

    const handleClick = () => {
        if (navigator.vibrate) navigator.vibrate(10);
        // Navigate FIRST so /share mounts behind the drawer
        navigate("/share");
        // Then close on the next frame — drawer animates out over the NEW page
        requestAnimationFrame(() => onNavigate?.());
    };
    return (
        <button
            onClick={handleClick}
            className="group relative w-full overflow-hidden rounded-2xl p-3.5 text-left
                       bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700
                       dark:from-blue-700 dark:via-blue-700 dark:to-indigo-800
                       shadow-md shadow-blue-600/20
                       active:scale-[0.98] transition-transform"
            style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
            }}
            aria-label="Open referral program"
        >
            {/* decorative blob */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-white/10 blur-xl"
            />

            <div className="relative flex items-center gap-3">
                <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full
                               bg-white/20 ring-1 ring-white/30"
                >
                    {hasEarned ? (
                        <Gift className="h-5 w-5 text-white" strokeWidth={2.4} />
                    ) : (
                        <Sparkles
                            className="h-5 w-5 text-white"
                            strokeWidth={2.4}
                        />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-bold text-white leading-tight">
                            Invite & Earn
                        </p>
                        <span
                            className="rounded-full bg-amber-400 px-1.5 py-0.5
                                       text-[8.5px] font-extrabold uppercase tracking-wider text-amber-950"
                        >
                            +2 days
                        </span>
                    </div>
                    <p className="mt-0.5 text-[10.5px] font-medium text-blue-50/90 truncate">
                        {subtitle}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[9.5px] font-semibold text-blue-100/80">
                        <span className="font-mono tracking-wider">{code}</span>
                        {hasEarned && (
                            <>
                                <span className="h-1 w-1 rounded-full bg-blue-200/60" />
                                <span className="inline-flex items-center gap-0.5">
                                    <Users className="h-2.5 w-2.5" />
                                    {stats.invites}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <ChevronRight
                    className="h-4 w-4 flex-shrink-0 text-white/80
                               group-active:translate-x-0.5 transition-transform"
                />
            </div>
        </button>
    );
});