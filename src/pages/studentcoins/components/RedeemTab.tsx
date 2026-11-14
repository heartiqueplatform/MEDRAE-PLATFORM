// src/pages/studentcoins/components/RedeemTab.tsx

import { motion } from "framer-motion";
import { Lock, Gift } from "lucide-react";
import { REWARD_ICONS } from "../constants";
import { formatKsh, formatNumber } from "../helpers";
import { playSound } from "@/lib/soundManager";
import { EmptyState } from "./EmptyState";
import type { Reward, Wallet, Config, Enrollment } from "../types";

interface Props {
    rewards: Reward[];
    wallet: Wallet | null;
    config: Config | null;
    enrollment: Enrollment;
    onSelect: (reward: Reward) => void;
}

export function RedeemTab({ rewards, wallet, config, enrollment, onSelect }: Props) {
    const balance = wallet?.balance ?? 0;
    const rate = config?.ksh_per_coin ?? 0.01;
    const approved = enrollment?.status === "approved";

    if (!approved) {
        return (
            <EmptyState
                icon={Lock}
                title="Approval required"
                subtitle="You must be approved for the coin program before redeeming rewards."
            />
        );
    }

    if (rewards.length === 0) {
        return (
            <EmptyState
                icon={Gift}
                title="No rewards yet"
                subtitle="Rewards will appear here once available."
            />
        );
    }

    return (
        <div className="space-y-2">
            {rewards.map((reward, i) => {
                const Icon = REWARD_ICONS[reward.icon] || Gift;
                const canAfford = balance >= reward.coins_cost;
                const ksh = Math.round(reward.coins_cost * rate * 100) / 100;
                const shortage = reward.coins_cost - balance;

                return (
                    <motion.button
                        key={reward.reward_key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => {
                            if (!canAfford) return;
                            playSound("ui-tap");
                            onSelect(reward);
                        }}
                        disabled={!canAfford}
                        className={`w-full text-left rounded-2xl p-4 shadow-sm
                        transition active:scale-[0.99]
                        ${canAfford
                                ? "bg-white dark:bg-[#161b22] hover:shadow-md"
                                : "bg-slate-100 dark:bg-white/[0.03] opacity-70 cursor-not-allowed"
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0
                            ${canAfford
                                        ? "bg-blue-50 dark:bg-blue-500/10"
                                        : "bg-slate-200 dark:bg-white/[0.06]"
                                    }`}
                            >
                                <Icon
                                    className={`w-5 h-5 ${canAfford
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-slate-400 dark:text-slate-500"
                                        }`}
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-[13.5px] font-bold text-slate-900 dark:text-white
                                              leading-tight truncate">
                                    {reward.label}
                                </p>
                                {reward.description && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400
                                                  mt-0.5 leading-snug line-clamp-2 break-words">
                                        {reward.description}
                                    </p>
                                )}
                            </div>

                            <div className="text-right shrink-0">
                                <p
                                    className={`text-sm font-bold tabular-nums ${canAfford
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-slate-400 dark:text-slate-500"
                                        }`}
                                >
                                    {formatNumber(reward.coins_cost)}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
                                    ≈ {formatKsh(ksh)}
                                </p>
                            </div>
                        </div>

                        {!canAfford && (
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                                <p className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                                    Need {formatNumber(shortage)} more coins
                                </p>
                            </div>
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
}