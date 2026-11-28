"use client";

import { memo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Users } from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";
import {
    getMyReferralCode,
    getMyReferralStats,
    type ReferralStats,
} from "@/lib/referrals";
import ShareLottie from "@/components/lottie/ShareLottie";

const CACHE_KEY = "sidebar_cache_referral_v1";
const CACHE_TTL = 30 * 60 * 1000; // 30 min

// 👇 single knob for card height
const CARD_HEIGHT = 300;

// 👇 Lottie nudge + zoom knobs (tune these only)
const LOTTIE_SHIFT_X = 60;   // px — big push to the RIGHT so left side is free
const LOTTIE_SHIFT_Y = 0;    // px — positive = down, negative = up
const LOTTIE_SCALE = 1.14;   // >1 = fills more of the card (less empty gap)

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
        navigate("/share");
        requestAnimationFrame(() => onNavigate?.());
    };

    return (
        <button
            onClick={handleClick}
            className="group relative w-full overflow-hidden rounded-xl text-left
                       bg-white dark:bg-[#0d1117]
                       ring-0 shadow-none
                       active:scale-[0.98] transition-transform"
            style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                height: CARD_HEIGHT,
                minHeight: CARD_HEIGHT,
            }}
            aria-label="Open referral program"
        >
            {/* ===== FULL-BLEED LOTTIE — pushed RIGHT, left side free for text ===== */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        transform: `translate(${LOTTIE_SHIFT_X}px, ${LOTTIE_SHIFT_Y}px) scale(${LOTTIE_SCALE})`,
                        transformOrigin: "center center",
                    }}
                >
                    <ShareLottie loop />
                </div>
            </div>

            {/* ===== Content pinned to the bottom, left-aligned ===== */}
            <div
                className="relative flex h-full flex-col justify-end p-4"
                style={{ minHeight: CARD_HEIGHT }}
            >
                <div className="flex items-center gap-1.5">
                    <p
                        className="text-[16px] font-bold text-slate-900 dark:text-[#f0f6fc] leading-tight
                                   drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]
                                   dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                    >
                        Invite & Earn
                    </p>
                    <span
                        className="rounded-full bg-blue-600 px-1.5 py-0.5
                                   text-[9px] font-extrabold uppercase tracking-wider text-white"
                    >
                        +2 days
                    </span>
                </div>

                <p
                    className="mt-1 text-[11.5px] font-medium text-slate-600 dark:text-[#8b949e]
                               drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]
                               dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                >
                    {subtitle}
                </p>

                <div className="mt-3 flex items-center gap-2">
                    <span
                        className="rounded-full bg-white/90 dark:bg-[#161b22]/90 px-2.5 py-1
                                   font-mono text-[10.5px] font-semibold tracking-wider
                                   text-slate-700 dark:text-[#c9d1d9]
                                   backdrop-blur-sm"
                    >
                        {code}
                    </span>
                    {hasEarned && (
                        <span
                            className="inline-flex items-center gap-1 rounded-full
                                       bg-white/90 dark:bg-[#161b22]/90 px-2.5 py-1
                                       text-[10px] font-semibold
                                       text-slate-700 dark:text-[#c9d1d9]
                                       backdrop-blur-sm
                                       ring-1 ring-slate-200/70 dark:ring-[#30363d]/70"
                        >
                            <Users className="h-3 w-3" />
                            {stats.invites}
                        </span>
                    )}
                    <span
                        className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-semibold
                                   text-blue-600 dark:text-[#58a6ff]
                                   drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]
                                   dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                    >
                        Share
                        <ChevronRight className="h-3.5 w-3.5 group-active:translate-x-0.5 transition-transform" />
                    </span>
                </div>
            </div>
        </button>
    );
});