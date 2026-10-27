// src/components/grouppay/GroupPaySubscriptionCard.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    ArrowRight,
    Clock,
    Smartphone,
    TrendingDown,
    Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    GROUPPAY_CONFIG,
    getGroupPricePerMember,
    getIndividualPrice,
    getSavingsPerMember,
} from "@/types/grouppay";

// ============================================================
// DERIVED PRICING — no hardcoded numbers
// ============================================================
const CURRENCY = GROUPPAY_CONFIG.CURRENCY;
const GROUP_1MO = getGroupPricePerMember("1-month");
const GROUP_2MO = getGroupPricePerMember("2-months");
const IND_1MO = getIndividualPrice("1-month");
const IND_2MO = getIndividualPrice("2-months");
const SAVE_2MO = getSavingsPerMember("2-months");

interface GroupPaySubscriptionCardProps {
    className?: string;
    compact?: boolean;
}

export function GroupPaySubscriptionCard({
    className = "",
    compact = false,
}: GroupPaySubscriptionCardProps) {
    const navigate = useNavigate();
    const handleClick = () => navigate("/grouppay");

    // ═══════════════════════════════════════════════════════════
    // COMPACT — one row, quiet, informative
    // ═══════════════════════════════════════════════════════════
    if (compact) {
        return (
            <Card
                onClick={handleClick}
                className={`group cursor-pointer rounded-2xl border-border/60 bg-card hover:bg-muted/40 transition-colors shadow-none ${className}`}
            >
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5 text-primary" strokeWidth={2.2} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-semibold tracking-tight">
                                    GroupPay
                                </h4>
                                <Badge
                                    variant="secondary"
                                    className="border-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold"
                                >
                                    Save {CURRENCY} {SAVE_2MO}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Split the cost with your study group.
                            </p>
                        </div>

                        <div className="hidden sm:flex items-baseline gap-2 shrink-0">
                            <span className="text-sm font-semibold tabular-nums">
                                {CURRENCY} {GROUP_2MO}
                            </span>
                            <span className="text-xs text-muted-foreground line-through tabular-nums">
                                {CURRENCY} {IND_2MO}
                            </span>
                        </div>

                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // FULL — one card shell, no inner borders, no shadows
    // ═══════════════════════════════════════════════════════════
    return (
        <Card
            onClick={handleClick}
            className={`group cursor-pointer rounded-3xl border-border/60 bg-card shadow-none overflow-hidden ${className}`}
        >
            <CardContent className="p-6 md:p-7 space-y-6">
                {/* ── Header ─────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="w-6 h-6 text-primary" strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base md:text-lg font-semibold tracking-tight">
                                    GroupPay
                                </h3>
                                <Badge
                                    variant="secondary"
                                    className="border-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold"
                                >
                                    Save {CURRENCY} {SAVE_2MO}
                                </Badge>
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                                Unlock premium together and split the cost.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Price block — no border, matches subscription's muted/30 ── */}
                <div className="rounded-2xl bg-muted/30 p-5 space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                                Per member · 2 months
                            </p>
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-3xl md:text-4xl font-semibold tracking-tight tabular-nums">
                                    {CURRENCY} {GROUP_2MO}
                                </span>
                                <span className="text-sm text-muted-foreground line-through tabular-nums">
                                    {CURRENCY} {IND_2MO}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                                Per member · 1 month
                            </p>
                            <div className="flex items-baseline gap-2 justify-end flex-wrap">
                                <span className="text-base font-semibold tabular-nums">
                                    {CURRENCY} {GROUP_1MO}
                                </span>
                                <span className="text-xs text-muted-foreground line-through tabular-nums">
                                    {CURRENCY} {IND_1MO}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Mini benefit row — no top border, spacing carries the divider */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 pt-1">
                        {[
                            { icon: TrendingDown, label: "Lower per-member cost" },
                            { icon: Users, label: "Study with your group" },
                            { icon: Clock, label: "Instant activation" },
                            { icon: Smartphone, label: "M-Pesa powered" },
                        ].map(({ icon: Icon, label }, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Icon
                                    className="w-3.5 h-3.5 text-muted-foreground shrink-0"
                                    strokeWidth={2.2}
                                />
                                <span className="text-[11px] md:text-xs text-muted-foreground leading-tight">
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── How it works ───────────────────────────────── */}
                <div className="space-y-3">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        How it works
                    </p>
                    <ol className="space-y-2.5">
                        {[
                            "Create a group and invite classmates.",
                            "Each member pays their share via M-Pesa.",
                            "Once the group is full, everyone unlocks premium.",
                        ].map((step, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                                    {i + 1}
                                </span>
                                <span className="text-foreground/90 leading-relaxed">
                                    {step}
                                </span>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* ── Savings strip — no border, bg-only (matches badge style) ── */}
                <div className="flex items-center justify-between gap-4 rounded-xl bg-emerald-500/[0.08] px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-xs md:text-sm font-medium truncate">
                            You save {CURRENCY} {SAVE_2MO} per member vs. paying solo.
                        </span>
                    </div>
                </div>

                {/* ── CTA ────────────────────────────────────────── */}
                <Button
                    className="w-full h-12 rounded-xl text-sm font-semibold group/btn"
                >
                    <span className="flex items-center">
                        Create or join a group
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-0.5" />
                    </span>
                </Button>
            </CardContent>
        </Card>
    );
}