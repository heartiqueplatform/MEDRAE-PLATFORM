// src/components/index/StudentCoinsSection.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Coins,
    Sparkles,
    ArrowRight,
    Play,
    Star,
    Bookmark,
    Share2,
    Flame,
    Trophy,
    CheckCircle2,
    Users,
    Wallet,
    Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* ------------------------------------------------------------------ */
/*  Inline useIntersectionObserver — keeps the file self-contained    */
/* ------------------------------------------------------------------ */

function useIntersectionObserver(options: IntersectionObserverInit = {}) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1, rootMargin: "0px 0px -50px 0px", ...options }
        );
        if (ref.current) observer.observe(ref.current);
        return () => {
            if (ref.current) observer.unobserve(ref.current);
        };
    }, [options]);

    return [ref, isVisible] as const;
}

/* ------------------------------------------------------------------ */
/*  Static reward rows — coins come from medrae_stu_coin_rules        */
/*  (kept here as a fallback while the DB is loading)                 */
/* ------------------------------------------------------------------ */

const EARNING_ACTIONS_STATIC = [
    { key: "quiz_started_by_other", icon: Play, label: "Someone starts your quiz", fallbackCoins: 3, color: "text-blue-600 bg-blue-50" },
    { key: "quiz_rated_by_other", icon: Star, label: "Someone rates your quiz", fallbackCoins: 4, color: "text-amber-600 bg-amber-50" },
    { key: "quiz_bookmarked_by_other", icon: Bookmark, label: "Someone bookmarks your quiz", fallbackCoins: 3, color: "text-emerald-600 bg-emerald-50" },
    { key: "quiz_shared_by_other", icon: Share2, label: "Someone shares your quiz", fallbackCoins: 6, color: "text-violet-600 bg-violet-50" },
    { key: "quiz_difficulty_voted", icon: Flame, label: "Someone votes difficulty", fallbackCoins: 1, color: "text-orange-600 bg-orange-50" },
    { key: "receive_like", icon: Users, label: "Someone likes your post", fallbackCoins: 2, color: "text-rose-600 bg-rose-50" },
] as const;

const MILESTONE_KEY = "quiz_milestone_50";
const MILESTONE_FALLBACK = 100;

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type CoinConfig = {
    ksh_per_coin: number;
    min_redeem_coins: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Format a KSh value cleanly — `KSh 10`, `KSh 0.01`, `KSh 100.50` */
function formatKsh(amount: number): string {
    // Small amounts (< 1) show more precision so 0.01 doesn't become "0"
    if (amount > 0 && amount < 1) {
        return `KSh ${amount.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}`;
    }
    return `KSh ${amount.toLocaleString("en-KE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

/** Compute the "N coins → KSh X" preview rows from the live rate */
function buildValuePreview(ratePerCoin: number) {
    return [1000, 10000, 50000].map((coins) => ({
        coins,
        ksh: Math.round(coins * ratePerCoin * 100) / 100,
    }));
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function StudentCoinsSection() {
    const navigate = useNavigate();
    const [ref, isVisible] = useIntersectionObserver({ threshold: 0.15 });

    /* ── Live coin config (rate + milestone) ── */
    const [config, setConfig] = useState<CoinConfig | null>(null);
    const [ruleCoins, setRuleCoins] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const [configRes, rulesRes] = await Promise.all([
                    supabase
                        .from("medrae_stu_coin_config")
                        .select("ksh_per_coin, min_redeem_coins")
                        .eq("id", 1)
                        .maybeSingle(),
                    supabase
                        .from("medrae_stu_coin_rules")
                        .select("action, coins")
                        .eq("is_active", true),
                ]);

                if (cancelled) return;

                if (configRes.data) {
                    setConfig({
                        ksh_per_coin: Number(configRes.data.ksh_per_coin) || 0.01,
                        min_redeem_coins: Number(configRes.data.min_redeem_coins) || 100,
                    });
                }

                if (rulesRes.data) {
                    const map: Record<string, number> = {};
                    for (const row of rulesRes.data) {
                        if (row.action && typeof row.coins === "number") {
                            map[row.action] = row.coins;
                        }
                    }
                    setRuleCoins(map);
                }
            } catch (err) {
                console.warn("[StudentCoinsSection] config load failed:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    /* ── Derived values ── */
    const ratePerCoin = config?.ksh_per_coin ?? 0.01;
    const valuePreview = buildValuePreview(ratePerCoin);
    const milestoneCoins = ruleCoins[MILESTONE_KEY] ?? MILESTONE_FALLBACK;

    /* ── Build the earning rows with live coin amounts ── */
    const earningActions = EARNING_ACTIONS_STATIC.map((a) => ({
        ...a,
        coins: ruleCoins[a.key] ?? a.fallbackCoins,
    }));

    const goToRegister = () => navigate("/register");
    const goToLearn = () => navigate("/login");

    return (
        <section
            ref={ref}
            id="medrae-coins"
            className="w-full bg-white py-14 md:py-20 px-4 md:px-6"
        >
            <div className="max-w-5xl mx-auto">

                {/* ═══════════ Header ═══════════ */}
                <div
                    className={`max-w-3xl mx-auto mb-12 md:mb-16
                                transition-all duration-700
                                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                >
                    <p className="text-[11px] md:text-[12px] font-semibold uppercase tracking-[0.15em] text-blue-600 mb-4">
                        Medrae Coins
                    </p>

                    <h2 className="text-[30px] md:text-[42px] lg:text-[50px] font-bold
                                   tracking-[-0.02em] text-slate-900 leading-[1.05]">
                        Study with purpose.<br />
                        <span className="text-blue-600">Earn real value for it.</span>
                    </h2>

                    <p className="mt-5 text-[15px] md:text-[16px] text-slate-600 leading-relaxed">
                        Every quiz you author, every question you answer, every comment
                        you leave makes the community a little better for the next nursing
                        student. Medrae Coins are our way of saying that contribution
                        matters. Accumulate them through the platform, then turn them into
                        something real: cash to M-Pesa, premium access, or content packs
                        you actually want.
                    </p>
                </div>

                {/* ═══════════ Two columns: how you earn vs what it's worth ═══════════ */}
                <div
                    className={`grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10
                                transition-all duration-700 delay-100
                                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >

                    {/* ── LEFT: How you earn ── */}
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-5">
                            How you earn
                        </p>

                        <p className="text-[14px] md:text-[15px] text-slate-600 leading-relaxed mb-6">
                            Coins are credited automatically — no claims, no points to
                            manage. Every meaningful interaction pays, and the more useful
                            your contribution, the more you earn.
                        </p>

                        <div className="space-y-4">
                            {earningActions.slice(0, 4).map((action) => {
                                const Icon = action.icon;
                                return (
                                    <div key={action.label} className="flex items-start gap-3">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${action.color}`}>
                                            <Icon className="w-4 h-4" strokeWidth={2.2} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-baseline justify-between gap-3">
                                                <p className="text-[13.5px] md:text-[14px] font-semibold text-slate-900 leading-snug">
                                                    {action.label}
                                                </p>
                                                <span className="shrink-0 text-[12px] font-bold tabular-nums text-emerald-600">
                                                    +{action.coins}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Milestone line — quiet, no box */}
                        <div className="mt-6 pt-5 border-t border-slate-200/70">
                            <div className="flex items-start gap-2.5">
                                <Trophy className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.2} />
                                <p className="text-[13px] text-slate-600 leading-relaxed">
                                    Author a quiz that reaches <strong className="text-slate-900">50 questions</strong>{" "}
                                    and we add <strong className="text-emerald-700">+{milestoneCoins} coins</strong>{" "}
                                    to your balance — a one-time bonus for building something
                                    the community actually uses.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: The wallet ── */}
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-5">
                            What it's worth
                        </p>

                        <p className="text-[14px] md:text-[15px] text-slate-600 leading-relaxed mb-6">
                            The rate is fixed and transparent. Whatever you earn, you know
                            exactly what it's worth — no shifting tiers, no surprise
                            deductions at the moment of redemption.
                        </p>

                        {/* Base rate — big, calm, no card */}
                        <div className="mb-6">
                            <p className="text-[11px] text-slate-500 font-medium mb-1.5">
                                Base rate
                            </p>
                            {loading ? (
                                <p className="text-[22px] font-semibold text-slate-400 flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Loading…
                                </p>
                            ) : (
                                <p className="text-[28px] md:text-[32px] font-bold text-slate-900 tabular-nums leading-none tracking-tight">
                                    1 coin{" "}
                                    <span className="text-[16px] md:text-[18px] font-semibold text-slate-400">
                                        =
                                    </span>{" "}
                                    <span className="text-blue-600">{formatKsh(ratePerCoin)}</span>
                                </p>
                            )}
                        </div>

                        {/* Value preview — plain rows, no card */}
                        <div className="space-y-2.5 mb-7">
                            {valuePreview.map((v) => (
                                <div
                                    key={v.coins}
                                    className="flex items-baseline justify-between gap-3
                                               pb-2.5 border-b border-slate-200/60 last:border-b-0"
                                >
                                    <span className="text-[13px] text-slate-600">
                                        {v.coins.toLocaleString()} coins
                                    </span>
                                    <span className="text-[15px] font-bold tabular-nums text-slate-900">
                                        {loading ? "—" : formatKsh(v.ksh)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Redemption options — short list */}
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-3">
                            Redeem for
                        </p>
                        <ul className="space-y-2 mb-8">
                            {[
                                "Cash out to M-Pesa",
                                "Premium quiz access",
                                "Content packs from verified authors",
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-2 text-[13px] text-slate-700 leading-snug">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" strokeWidth={2.4} />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>

                        {/* CTA — one primary, one quiet secondary */}
                        <div className="flex flex-col sm:flex-row gap-2.5">
                            <button
                                onClick={goToRegister}
                                className="flex-1 inline-flex items-center justify-center gap-2
               min-h-[52px] py-3.5 px-5 rounded-xl
               bg-slate-900 hover:bg-slate-800
               text-white text-[14px] font-semibold
               active:scale-[0.98] transition-all"
                                style={{ touchAction: "manipulation" }}
                            >
                                Start earning free
                                <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
                            </button>
                            <button
                                onClick={goToLearn}
                                className="flex-1 inline-flex items-center justify-center gap-2
               min-h-[52px] py-3.5 px-5 rounded-xl
               bg-transparent hover:bg-slate-100
               border border-slate-300 hover:border-slate-400
               text-slate-700 text-[14px] font-semibold
               active:scale-[0.98] transition-all"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Wallet className="w-3.5 h-3.5" strokeWidth={2.4} />
                                Learn more
                            </button>
                        </div>
                    </div>
                </div>

                {/* ═══════════ Bottom line — one sentence of substance ═══════════ */}
                <div
                    className={`mt-14 md:mt-20 pt-8 md:pt-10 border-t border-slate-200/70
                                transition-all duration-700 delay-200
                                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                >
                    <p className="text-[13px] md:text-[14px] text-slate-500 leading-relaxed max-w-3xl mx-auto text-center">
                        Coins never expire. There's no minimum study time. The rewards exist
                        because a community that supports itself is stronger than one that
                        doesn't — and every nursing student deserves to feel that support.
                    </p>
                </div>

            </div>
        </section>
    );

}