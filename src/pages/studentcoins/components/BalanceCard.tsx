// src/pages/studentcoins/components/BalanceCard.tsx

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Wallet as WalletIcon, TrendingUp } from "lucide-react";
import { formatKsh, formatNumber } from "../helpers";
import type { Wallet, Config } from "../types";
import RevenueLottie from "@/components/lottie/RevenueLottie";

interface Props {
    wallet: Wallet | null;
    config: Config | null;
}

export function BalanceCard({ wallet, config }: Props) {
    const balance = wallet?.balance ?? 0;
    const rate = config?.ksh_per_coin ?? 0.01;
    const ksh = Math.round(balance * rate * 100) / 100;

    const lottieRef = useRef<HTMLDivElement>(null);
    const lottieInView = useInView(lottieRef, { once: true, margin: "120px" });

    return (
        <>
            {/* ─── Card 1: Balance ─── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative overflow-hidden rounded-3xl p-6
                     bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800
                     text-white shadow-xl shadow-blue-600/20"
            >
                <div className="absolute -bottom-20 -left-12 w-56 h-56 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                            <WalletIcon className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest opacity-90 truncate">
                            Your balance
                        </span>
                    </div>

                    <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                        <p className="text-5xl font-bold tracking-tight tabular-nums truncate">
                            {formatNumber(balance)}
                        </p>
                        <span className="text-sm font-bold opacity-80 shrink-0">coins</span>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold opacity-95 min-w-0">
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span className="tabular-nums truncate">≈ {formatKsh(ksh)}</span>
                    </div>

                    {wallet?.is_frozen && (
                        <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                              bg-red-500/20 text-[11px] font-bold text-red-100">
                            Account frozen · Contact support
                        </div>
                    )}

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/10 px-3 py-2.5 min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-wider opacity-70 truncate">
                                Lifetime earned
                            </p>
                            <p className="text-sm font-bold tabular-nums mt-0.5 truncate">
                                {formatNumber(wallet?.lifetime_earned ?? 0)}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-3 py-2.5 min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-wider opacity-70 truncate">
                                Redeemed
                            </p>
                            <p className="text-sm font-bold tabular-nums mt-0.5 truncate">
                                {formatNumber(wallet?.lifetime_redeemed ?? 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ─── Card 2: Lottie hero ─── */}
            <motion.div
                ref={lottieRef}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="relative overflow-hidden rounded-3xl
                           bg-gradient-to-br from-indigo-50 via-blue-50 to-sky-50
                           dark:from-[#161b22] dark:via-[#0f1720] dark:to-[#0d1117]
                           border border-blue-100/60 dark:border-white/[0.06]
                           shadow-sm"
            >
                {/* Big Lottie */}
                <div className="w-full aspect-[4/3] sm:aspect-[16/9]">
                    {lottieInView && <RevenueLottie />}
                </div>

                {/* Floating caption chip */}
                <div className="absolute left-4 bottom-4 right-4
                                flex items-center justify-between gap-3
                                rounded-2xl px-3.5 py-2.5
                                bg-white/80 dark:bg-black/40 backdrop-blur-md
                                border border-white/60 dark:border-white/[0.06]">
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-widest
                                      text-blue-700 dark:text-blue-300 truncate">
                            Revenue engine
                        </p>
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                            Every coin counts
                        </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1
                                     text-[10px] font-bold tabular-nums
                                     text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-3 h-3" />
                        +{formatNumber(wallet?.lifetime_earned ?? 0)}
                    </span>
                </div>
            </motion.div>
        </>
    );
}