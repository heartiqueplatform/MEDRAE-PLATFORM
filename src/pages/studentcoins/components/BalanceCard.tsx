// src/pages/studentcoins/components/BalanceCard.tsx

import { motion } from "framer-motion";
import { Wallet as WalletIcon, TrendingUp } from "lucide-react";
import { formatKsh, formatNumber } from "../helpers";
import type { Wallet, Config } from "../types";

interface Props {
    wallet: Wallet | null;
    config: Config | null;
}

export function BalanceCard({ wallet, config }: Props) {
    const balance = wallet?.balance ?? 0;
    const rate = config?.ksh_per_coin ?? 0.01;
    const ksh = Math.round(balance * rate * 100) / 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-3xl p-6
                 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800
                 text-white shadow-xl shadow-blue-600/20"
        >
            {/* Decorative circles — clipped by the parent's overflow-hidden */}
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
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
    );
}