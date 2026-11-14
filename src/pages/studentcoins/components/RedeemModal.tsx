// src/pages/studentcoins/components/RedeemModal.tsx

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Loader2, Gift } from "lucide-react";
import { createPortal } from "react-dom";
import { REWARD_ICONS } from "../constants";
import { formatKsh, formatNumber } from "../helpers";
import { playSound } from "@/lib/soundManager";
import type { Reward, Wallet, Config } from "../types";

interface Props {
    reward: Reward | null;
    wallet: Wallet | null;
    config: Config | null;
    redeeming: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function RedeemModal({ reward, wallet, config, redeeming, onClose, onConfirm }: Props) {
    if (typeof document === "undefined") return null;

    const rate = config?.ksh_per_coin ?? 0.01;
    const balance = wallet?.balance ?? 0;
    const remaining = balance - (reward?.coins_cost ?? 0);
    const Icon = reward ? REWARD_ICONS[reward.icon] || Gift : Gift;

    return createPortal(
        <AnimatePresence>
            {reward && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm
                     flex items-end sm:items-center justify-center p-0 sm:p-6"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-[#0d1117] w-full sm:max-w-md
                       rounded-t-3xl sm:rounded-3xl
                       max-h-[92dvh] overflow-hidden
                       flex flex-col"
                    >
                        {/* Scrollable content */}
                        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar
                                        p-5 space-y-4">
                            {/* Icon + title */}
                            <div className="flex flex-col items-center text-center pt-1">
                                <div className="h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-500/10
                                  flex items-center justify-center mb-3 shrink-0">
                                    <Icon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white
                                               max-w-[280px] break-words">
                                    {reward.label}
                                </h3>
                                {reward.description && (
                                    <p className="text-[12px] text-slate-500 dark:text-slate-400
                                                  mt-1 max-w-[280px] leading-snug">
                                        {reward.description}
                                    </p>
                                )}
                            </div>

                            {/* Summary rows */}
                            <div className="rounded-2xl bg-slate-50 dark:bg-[#161b22] p-3 space-y-2">
                                <Row label="Cost" value={`${formatNumber(reward.coins_cost)} coins`} />
                                <Row
                                    label="Equivalent"
                                    value={formatKsh(Math.round(reward.coins_cost * rate * 100) / 100)}
                                />
                                <div className="border-t border-slate-200 dark:border-white/[0.06] pt-2">
                                    <Row label="Current balance" value={`${formatNumber(balance)} coins`} />
                                    <Row
                                        label="Balance after"
                                        value={`${formatNumber(remaining)} coins`}
                                        valueClass="text-emerald-600 dark:text-emerald-400"
                                    />
                                </div>
                            </div>

                            {/* Warning note */}
                            <div className="flex items-start gap-2 p-2.5 rounded-xl
                                bg-amber-50 dark:bg-amber-500/10">
                                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400
                                                       shrink-0 mt-0.5" />
                                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                                    Redemptions are processed within 24 hours. You'll be notified once fulfilled.
                                </p>
                            </div>
                        </div>

                        {/* Sticky actions */}
                        <div className="shrink-0 px-5 pb-5 pt-2
                                        border-t border-slate-100 dark:border-white/[0.06]
                                        bg-white dark:bg-[#0d1117]
                                        flex gap-2">
                            <button
                                onClick={() => { playSound("ui-tap"); onClose(); }}
                                disabled={redeeming}
                                className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-white/[0.06]
                           text-slate-700 dark:text-slate-300 text-sm font-bold
                           active:scale-[0.97] transition-transform disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { playSound("ui-tap"); onConfirm(); }}
                                disabled={redeeming}
                                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700
                           text-white text-sm font-bold
                           active:scale-[0.97] transition-transform
                           disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {redeeming ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                        <span className="truncate">Redeeming…</span>
                                    </>
                                ) : (
                                    "Confirm redemption"
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

function Row({
    label,
    value,
    valueClass = "",
}: {
    label: string;
    value: string;
    valueClass?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] text-slate-500 dark:text-slate-400 shrink-0">
                {label}
            </span>
            <span className={`text-[12.5px] font-bold tabular-nums text-right
                              text-slate-900 dark:text-white break-words ${valueClass}`}>
                {value}
            </span>
        </div>
    );
}