// src/components/grouppay/GroupPaySubscriptionCard.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    PiggyBank,
    Sparkles,
    ArrowRight,
    CheckCircle,
    Clock,
    Smartphone,
    Users2,
    DollarSign,
    Zap,
    TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

    const handleClick = () => {
        navigate("/grouppay");
    };

    // ============================================================
    // COMPACT VARIANT
    // ============================================================
    if (compact) {
        return (
            <Card
                className={`group cursor-pointer border-0 rounded-2xl overflow-hidden
                    bg-white dark:bg-muted/30 shadow-none
                    hover:bg-slate-50 dark:hover:bg-muted/40
                    transition-colors ${className}`}
                onClick={handleClick}
            >
                <div className="h-1 w-full bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500" />
                <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl border-0
                                bg-gradient-to-br from-green-100 to-blue-100
                                dark:from-green-950/40 dark:to-blue-950/40
                                flex items-center justify-center">
                                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                    GroupPay
                                </h4>
                                <Badge className="border-0 bg-gradient-to-r from-green-500 to-blue-500
                                    text-white text-[9px] font-black uppercase tracking-wider">
                                    Save {CURRENCY} {SAVE_2MO}
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                Study together. Split the cost. Unlock premium together.
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs">
                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold tabular-nums">
                                    <DollarSign className="w-3 h-3" />
                                    {CURRENCY} {GROUP_2MO}
                                    <span className="font-normal text-slate-500 dark:text-slate-400">
                                        /member
                                    </span>
                                </span>
                                <span className="text-slate-400 dark:text-slate-500 line-through tabular-nums">
                                    {CURRENCY} {IND_2MO}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 p-0 h-auto border-0
                                    text-green-600 dark:text-green-400
                                    hover:text-green-700 dark:hover:text-green-300
                                    hover:bg-transparent
                                    font-medium group/btn"
                            >
                                Learn more
                                <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover/btn:translate-x-1" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ============================================================
    // FULL VARIANT
    // ============================================================
    return (
        <Card
            className={`group cursor-pointer border-0 rounded-2xl overflow-hidden relative
                bg-white dark:bg-muted/30 shadow-none
                hover:bg-slate-50 dark:hover:bg-muted/40
                transition-colors ${className}`}
            onClick={handleClick}
        >
            {/* Top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500" />

            {/* Soft gradient wash */}
            <div className="absolute inset-0 pointer-events-none
                bg-gradient-to-br from-green-50/30 via-transparent to-blue-50/30
                dark:from-green-950/10 dark:via-transparent dark:to-blue-950/10" />

            {/* Sparkle decoration */}
            <div className="absolute -top-2 -right-2">
                <Sparkles className="w-8 h-8 text-green-500/20 dark:text-green-400/20" />
            </div>

            <CardHeader className="relative pb-2 px-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl border-0
                            bg-gradient-to-br from-green-100 to-blue-100
                            dark:from-green-950/40 dark:to-blue-950/40
                            flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0">
                            <CardTitle className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                                GroupPay
                            </CardTitle>
                            <p className="text-[11px] md:text-xs text-muted-foreground">
                                Study groups · Split cost · Premium access
                            </p>
                        </div>
                    </div>
                    <Badge className="border-0 bg-gradient-to-r from-green-500 to-blue-500
                        text-white text-[9px] md:text-[10px] font-black uppercase tracking-wider
                        flex items-center gap-0.5 flex-shrink-0">
                        <Zap className="w-3 h-3" />
                        Save {CURRENCY} {SAVE_2MO}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="relative space-y-4 px-4 pb-3">
                {/* What is GroupPay */}
                <div className="rounded-xl p-3 border-0 bg-slate-50 dark:bg-slate-900/40">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        <span className="font-semibold text-slate-900 dark:text-white">
                            What is GroupPay?
                        </span>{" "}
                        Form a study group with your classmates and unlock premium access for{" "}
                        <span className="font-bold text-green-600 dark:text-green-400">
                            {CURRENCY} {GROUP_2MO}
                        </span>{" "}
                        per member instead of{" "}
                        <span className="line-through text-slate-400 dark:text-slate-500">
                            {CURRENCY} {IND_2MO}
                        </span>{" "}
                        solo.
                    </p>
                </div>

                {/* Key benefits — 2x2 grid */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full border-0
                            bg-green-100 dark:bg-green-950/40
                            flex items-center justify-center flex-shrink-0">
                            <TrendingDown className="w-3 h-3 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                            Save {CURRENCY} {SAVE_2MO}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full border-0
                            bg-blue-100 dark:bg-blue-950/40
                            flex items-center justify-center flex-shrink-0">
                            <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                            Instant access
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full border-0
                            bg-purple-100 dark:bg-purple-950/40
                            flex items-center justify-center flex-shrink-0">
                            <Users2 className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                            Group learning
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full border-0
                            bg-amber-100 dark:bg-amber-950/40
                            flex items-center justify-center flex-shrink-0">
                            <Smartphone className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                            M-Pesa powered
                        </span>
                    </div>
                </div>

                {/* Quick stats — 3 columns */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl border-0
                    bg-slate-50 dark:bg-slate-900/40">
                    <div className="text-center">
                        <p className="text-xs font-bold text-green-600 dark:text-green-400 tabular-nums">
                            {CURRENCY} {GROUP_2MO}
                        </p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Per member
                        </p>
                    </div>
                    <div className="text-center border-l border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                            {CURRENCY} {GROUP_1MO}
                        </p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                            1-month price
                        </p>
                    </div>
                    <div className="text-center border-l border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-bold text-purple-600 dark:text-purple-400">
                            100%
                        </p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Premium access
                        </p>
                    </div>
                </div>

                {/* Savings hero line */}
                <div className="rounded-xl p-2.5 border-0
                    bg-gradient-to-r from-green-50 to-emerald-50
                    dark:from-green-950/30 dark:to-emerald-950/30
                    flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <PiggyBank className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                            Split the cost, keep the savings
                        </span>
                    </div>
                    <span className="text-[10px] font-black text-green-700 dark:text-green-400
                        uppercase tracking-wider flex-shrink-0">
                        Save {CURRENCY} {SAVE_2MO}
                    </span>
                </div>
            </CardContent>

            <CardFooter className="relative px-4 pb-4 pt-0">
                <Button
                    className="w-full border-0 rounded-xl
                        bg-gradient-to-r from-green-600 to-blue-600
                        hover:from-green-700 hover:to-blue-700
                        text-white font-bold
                        shadow-lg shadow-green-500/20
                        hover:shadow-xl hover:shadow-green-500/30
                        transition-all group/btn"
                >
                    <span className="flex items-center">
                        Explore GroupPay
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
                    </span>
                </Button>
            </CardFooter>
        </Card>
    );
}