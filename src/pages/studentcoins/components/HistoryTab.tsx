// src/pages/studentcoins/components/HistoryTab.tsx

import { motion } from "framer-motion";
import { History, ArrowDownToLine } from "lucide-react";
import { ACTION_META, REDEMPTION_STATUS_META } from "../constants";
import { formatNumber, relativeTime } from "../helpers";
import { EmptyState } from "./EmptyState";
import type { LedgerRow, Redemption, Config } from "../types";

interface Props {
    recent: LedgerRow[];
    redemptions: Redemption[];
    config: Config | null;
}

export function HistoryTab({ recent, redemptions }: Props) {
    const hasEarnings = recent.length > 0;
    const hasRedemptions = redemptions.length > 0;

    if (!hasEarnings && !hasRedemptions) {
        return (
            <EmptyState
                icon={History}
                title="No activity yet"
                subtitle="Your coin earnings and redemptions will appear here."
            />
        );
    }

    return (
        <div className="space-y-5">
            {/* Redemptions */}
            {hasRedemptions && (
                <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider
                         text-slate-500 dark:text-slate-400 mb-2 px-1">
                        Redemptions
                    </h3>
                    <div className="space-y-1.5">
                        {redemptions.map((r, i) => {
                            const meta = REDEMPTION_STATUS_META[r.status];
                            /* meta.tone is "text-... bg-..." — extract the text part safely */
                            const toneTextClass = meta.tone.split(" ").find(c => c.startsWith("text-")) || "";
                            return (
                                <motion.div
                                    key={r.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="flex items-center gap-3 p-3 rounded-2xl
                             bg-white dark:bg-[#161b22] shadow-sm"
                                >
                                    <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0
                                  bg-slate-100 dark:bg-white/[0.06]">
                                        <ArrowDownToLine className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12.5px] font-bold text-slate-900 dark:text-white
                                                      leading-tight truncate">
                                            {r.reward_label}
                                        </p>
                                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400
                                                      mt-0.5 truncate">
                                            {relativeTime(r.requested_at)}
                                            {r.external_ref && ` · ${r.external_ref}`}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[12.5px] font-bold tabular-nums
                                                      text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                            −{formatNumber(r.coins_spent)}
                                        </p>
                                        <p className={`text-[9.5px] font-bold uppercase tracking-wider mt-0.5
                                                       whitespace-nowrap ${toneTextClass}`}>
                                            {meta.label}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Earned */}
            {hasEarnings && (
                <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider
                         text-slate-500 dark:text-slate-400 mb-2 px-1">
                        Recent activity
                    </h3>
                    <div className="space-y-1.5">
                        {recent.map((row, i) => {
                            const meta = ACTION_META[row.action] || {
                                label: row.action,
                                icon: History,
                                tone: "text-slate-500 bg-slate-100 dark:bg-white/[0.06]",
                            };
                            const isDebit = row.coins < 0;
                            return (
                                <motion.div
                                    key={row.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.015 }}
                                    className="flex items-center gap-3 p-3 rounded-2xl
                             bg-white dark:bg-[#161b22] shadow-sm"
                                >
                                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${meta.tone}`}>
                                        <meta.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200
                                                      leading-tight truncate">
                                            {meta.label}
                                        </p>
                                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                            {relativeTime(row.at)}
                                        </p>
                                    </div>
                                    <p
                                        className={`text-[13px] font-bold tabular-nums shrink-0 whitespace-nowrap ${isDebit
                                            ? "text-rose-600 dark:text-rose-400"
                                            : "text-emerald-600 dark:text-emerald-400"
                                            }`}
                                    >
                                        {isDebit ? "−" : "+"}
                                        {formatNumber(Math.abs(row.coins))}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}