// src/components/grouppay/GroupPaySubscriptionCard.tsx

import { useNavigate } from "react-router-dom";
import {
    Users,
    ArrowRight,
    Clock,
    Smartphone,
    TrendingDown,
    Sparkles,
} from "lucide-react";
import {
    GROUPPAY_CONFIG,
    getGroupPricePerMember,
    getIndividualPrice,
    getSavingsPerMember,
} from "@/types/grouppay";
import { playSound } from "@/lib/soundManager";   // matches your other files

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" = "light") => {
    playSound("ui-tap");
    if (type === "success") vibrate([15, 30, 15]);
    else vibrate(15);
};

interface GroupPaySubscriptionCardProps {
    className?: string;
    compact?: boolean;
}

export function GroupPaySubscriptionCard({
    className = "",
    compact = false,
}: GroupPaySubscriptionCardProps) {
    const navigate = useNavigate();

    const handleClick = () => {
        tap();
        navigate("/grouppay");
    };

    // ═══════════════════════════════════════════════════════════
    // COMPACT — one row, quiet, informative
    // ═══════════════════════════════════════════════════════════
    if (compact) {
        return (
            <div
                onClick={handleClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleClick();
                    }
                }}
                className={`cursor-pointer rounded-2xl bg-white dark:bg-[#161b22]
                            active:bg-slate-50 dark:active:bg-white/[0.04]
                            transition-colors ${className}`}
                style={{ touchAction: "manipulation" }}
            >
                <div className="p-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-400/10 flex items-center justify-center shrink-0">
                            <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" strokeWidth={2.2} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                                    GroupPay
                                </h4>
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold
                                                 bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
                                    Save {CURRENCY} {SAVE_2MO}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                Split the cost with your study group.
                            </p>
                        </div>

                        <div className="hidden sm:flex items-baseline gap-2 shrink-0">
                            <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                                {CURRENCY} {GROUP_2MO}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through tabular-nums">
                                {CURRENCY} {IND_2MO}
                            </span>
                        </div>

                        <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // FULL — one card shell, no inner borders, no shadows
    // ═══════════════════════════════════════════════════════════
    return (
        <div
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClick();
                }
            }}
            className={`cursor-pointer rounded-2xl bg-white dark:bg-[#161b22]
                        active:bg-slate-50 dark:active:bg-white/[0.04]
                        transition-colors overflow-hidden ${className}`}
            style={{ touchAction: "manipulation" }}
        >
            <div className="p-4 space-y-4">
                {/* ── Header ─────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-xl bg-violet-50 dark:bg-violet-400/10 flex items-center justify-center shrink-0">
                            <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                                    GroupPay
                                </h3>
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold
                                                 bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
                                    Save {CURRENCY} {SAVE_2MO}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Unlock premium together and split the cost.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Price block — inner surface, no border ── */}
                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-4 space-y-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                Per member · 2 months
                            </p>
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
                                    {CURRENCY} {GROUP_2MO}
                                </span>
                                <span className="text-xs text-slate-400 dark:text-slate-500 line-through tabular-nums">
                                    {CURRENCY} {IND_2MO}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                Per member · 1 month
                            </p>
                            <div className="flex items-baseline gap-2 justify-end flex-wrap">
                                <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                                    {CURRENCY} {GROUP_1MO}
                                </span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through tabular-nums">
                                    {CURRENCY} {IND_1MO}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Mini benefit row — spacing carries the divider */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2.5 pt-1">
                        {[
                            { icon: TrendingDown, label: "Lower per-member cost" },
                            { icon: Users, label: "Study with your group" },
                            { icon: Clock, label: "Instant activation" },
                            { icon: Smartphone, label: "M-Pesa powered" },
                        ].map(({ icon: Icon, label }, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Icon
                                    className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0"
                                    strokeWidth={2.2}
                                />
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── How it works ───────────────────────────────── */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        How it works
                    </p>
                    <ol className="space-y-2">
                        {[
                            "Create a group and invite classmates.",
                            "Each member pays their share via M-Pesa.",
                            "Once the group is full, everyone unlocks premium.",
                        ].map((step, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs">
                                <span className="h-5 w-5 rounded-full bg-violet-50 dark:bg-violet-400/10
                                                 text-violet-600 dark:text-violet-400
                                                 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                                    {i + 1}
                                </span>
                                <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {step}
                                </span>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* ── Savings strip — bg-only, no border ── */}
                <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-400/[0.08] px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-[11px] font-semibold truncate text-emerald-700 dark:text-emerald-300">
                            You save {CURRENCY} {SAVE_2MO} per member vs. paying solo.
                        </span>
                    </div>
                </div>

                {/* ── CTA ────────────────────────────────────────── */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleClick();
                    }}
                    className="w-full h-10 rounded-xl bg-violet-600 text-white text-sm font-bold
                               active:scale-[0.97] transition-transform
                               flex items-center justify-center gap-1.5"
                    style={{ touchAction: "manipulation" }}
                >
                    Create or join a group
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}