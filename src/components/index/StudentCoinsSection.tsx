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
            className="w-full bg-slate-50 py-14 md:py-20 px-4 md:px-6"
        >
            <div className="max-w-6xl mx-auto">

                {/* ═══════════ Header ═══════════ */}
                <div
                    className={`text-center mb-10 md:mb-14 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                        }`}
                >

                    <h2 className="text-[28px] md:text-4xl lg:text-[42px] font-bold tracking-tighter
                                   text-slate-900 leading-[1.1]">
                        Earn real value as you study.
                    </h2>
                    <p className="mt-3 text-[14px] md:text-[15px] text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        Medrae Coins reward you for contributing to the nursing community.
                        Post, comment, complete quizzes, and create quiz units — then redeem
                        your coins for cash to MPesa, premium access, or bonus content.
                    </p>
                </div>

                {/* ═══════════ Main card ═══════════ */}
                <div
                    className={`grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8
                                transition-all duration-700 delay-100
                                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >

                    {/* ── LEFT: How you earn ── */}
                    <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 p-5 md:p-7">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600
                                            flex items-center justify-center shrink-0">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Earn as you go
                                </p>
                                <h3 className="text-[15px] font-bold text-slate-900 leading-tight">
                                    Every interaction pays
                                </h3>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            {earningActions.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <div
                                        key={action.label}
                                        className="flex items-center gap-2.5 p-2 rounded-xl
                                                   bg-slate-50 hover:bg-slate-100 transition-colors"
                                    >
                                        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${action.color}`}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <p className="flex-1 min-w-0 text-[12px] font-semibold text-slate-800 truncate">
                                            {action.label}
                                        </p>
                                        <span className="shrink-0 text-[11px] font-bold tabular-nums
                                                         text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            +{action.coins}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50">
                                <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <p className="text-[11px] font-semibold text-amber-800 leading-tight">
                                    <strong className="font-bold">+{milestoneCoins} bonus</strong> — when a quiz you
                                    authored reaches 50 questions
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Value + CTA ── */}
                    <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800
                                    text-white p-5 md:p-7 relative overflow-hidden">
                        {/* Decorative blobs */}
                        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -left-12 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />

                        <div className="relative">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
                                Your wallet
                            </p>
                            <h3 className="text-[20px] md:text-[24px] font-bold leading-tight mt-1">
                                Real value, ready to redeem.
                            </h3>

                            <div className="mt-5 rounded-2xl bg-white/10 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                                    Base rate
                                </p>

                                {loading ? (
                                    <p className="text-[13px] font-semibold mt-1 flex items-center gap-1.5">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span className="opacity-70">Loading rate…</span>
                                    </p>
                                ) : (
                                    <p className="text-[13px] font-semibold mt-1">
                                        1 coin ={" "}
                                        <strong className="text-[16px] font-bold text-white">
                                            {formatKsh(ratePerCoin)}
                                        </strong>
                                    </p>
                                )}

                                <div className="mt-3 space-y-1.5">
                                    {valuePreview.map((v) => (
                                        <div
                                            key={v.coins}
                                            className="flex items-center justify-between text-[11.5px]"
                                        >
                                            <span className="opacity-80">
                                                {v.coins.toLocaleString()} coins
                                            </span>
                                            <span className="font-bold tabular-nums">
                                                {loading ? "—" : formatKsh(v.ksh)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <ul className="mt-5 space-y-2">
                                {[
                                    "Cash out to MPesa",
                                    "Unlock premium quizzes",
                                    "Redeem exclusive content packs",
                                    "No expiry — coins stay in your wallet",
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-2 text-[12px] leading-snug">
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-300" />
                                        <span className="opacity-95">{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-6 flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={goToRegister}
                                    className="flex-1 h-11 rounded-xl bg-white text-blue-700
                                               text-[13px] font-bold
                                               flex items-center justify-center gap-1.5
                                               active:scale-[0.97] transition-transform
                                               shadow-sm"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    Start earning free
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={goToLearn}
                                    className="h-11 px-4 rounded-xl bg-white/15 hover:bg-white/20
                                               text-white text-[13px] font-bold
                                               flex items-center justify-center gap-1.5
                                               active:scale-[0.97] transition-all"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Wallet className="w-4 h-4" />
                                    Learn how
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════ Bottom strip — social proof ═══════════ */}
                <div
                    className={`mt-6 flex items-center justify-center gap-2 flex-wrap
                                text-[11px] text-slate-500
                                transition-all duration-700 delay-200
                                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                >
                    <div className="flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-semibold text-slate-700">Community-funded rewards</span>
                    </div>
                    <span className="text-slate-300">·</span>
                    <span>No subscription required</span>
                    <span className="text-slate-300">·</span>
                    <span>Approved by admins</span>
                </div>
            </div>
        </section>
    );
}