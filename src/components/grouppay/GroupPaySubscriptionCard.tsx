// src/components/grouppay/GroupPaySubscriptionCard.tsx

import { useNavigate } from "react-router-dom";
import { Users, ArrowRight, Clock, Smartphone, TrendingDown } from "lucide-react";
import {
    GROUPPAY_CONFIG,
    getGroupPricePerMember,
    getIndividualPrice,
    getSavingsPerMember,
} from "@/types/grouppay";
import { playSound } from "@/lib/soundManager";
import { useConnectivity } from "@/context/ConnectivityContext";

const CURRENCY = GROUPPAY_CONFIG.CURRENCY;
const GROUP_2MO = getGroupPricePerMember("2-months");
const GROUP_1MO = getGroupPricePerMember("1-month");
const IND_2MO = getIndividualPrice("2-months");
const IND_1MO = getIndividualPrice("1-month");
const SAVE_2MO = getSavingsPerMember("2-months");

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" = "light") => {
    try {
        playSound("ui-tap");
    } catch {
        /* audio context not unlocked yet */
    }
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
    const { isOnline } = useConnectivity();

    const handleClick = () => {
        tap();
        navigate("/grouppay");
    };

    if (compact) {
        return (
            <div
                className={`rounded-2xl bg-white dark:bg-[#161b22] ${className}`}
                style={{ touchAction: "manipulation" }}
            >
                <button
                    type="button"
                    onClick={handleClick}
                    aria-label={`Open GroupPay and save ${CURRENCY} ${SAVE_2MO} per member`}
                    className="w-full text-left cursor-pointer rounded-2xl
                               active:bg-slate-50 dark:active:bg-white/[0.04]
                               transition-colors focus:outline-none
                               focus-visible:ring-2 focus-visible:ring-violet-500/50"
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
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold
                                                     bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
                                        Save {CURRENCY} {SAVE_2MO}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                    Pay together with your study group.
                                </p>
                            </div>

                            <div className="flex items-baseline gap-2 shrink-0">
                                <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                                    {CURRENCY} {GROUP_2MO}
                                </span>
                                <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500 line-through tabular-nums">
                                    {CURRENCY} {IND_2MO}
                                </span>
                            </div>

                            <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        </div>
                    </div>
                </button>
            </div>
        );
    }

    return (
        <div
            className={`rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden ${className}`}
            style={{ touchAction: "manipulation" }}
        >
            <div className="p-5 space-y-5">
                <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-violet-50 dark:bg-violet-400/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                            GroupPay
                        </h3>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            Share premium with your study group. Everyone pays their share and unlocks at the same time.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {CURRENCY} {GROUP_2MO} per member
                            </p>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                                for 2 months
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[12px] text-slate-400 dark:text-slate-500 line-through tabular-nums">
                                {CURRENCY} {IND_2MO}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-baseline justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {CURRENCY} {GROUP_1MO} per member
                            </p>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                                for 1 month
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[12px] text-slate-400 dark:text-slate-500 line-through tabular-nums">
                                {CURRENCY} {IND_1MO}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2.5">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        You save {CURRENCY} {SAVE_2MO} per member compared to paying alone.
                    </p>
                </div>

                <div className="space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        How it works
                    </p>
                    <ol className="space-y-2">
                        {[
                            "Create a group and invite your classmates.",
                            "Each member pays their share through M-Pesa.",
                            "Once the group is full, everyone unlocks premium.",
                        ].map((step, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-[13px]">
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
                <button
                    type="button"
                    onClick={handleClick}
                    aria-label={isOnline ? "Create or join a group" : "Open GroupPay while offline"}
                    className="w-full max-w-sm mx-auto h-11 rounded-xl bg-violet-600 text-white text-sm font-bold
               active:scale-[0.97] transition-transform
               flex items-center justify-center gap-1.5
               focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                    style={{ touchAction: "manipulation" }}
                >
                    {isOnline ? "Create or join a group" : "Open GroupPay offline"}
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}