// src/pages/studentcoins/components/EarnTab.tsx

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ACTION_META, EARN_CATEGORIES } from "../constants";

export function EarnTab() {
    return (
        <div className="space-y-4">
            {/* Hero */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50
                      dark:from-blue-500/10 dark:to-indigo-500/10
                      border border-blue-100 dark:border-blue-500/20 p-4">
                <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-bold text-blue-900 dark:text-blue-200">
                            Earn as you study
                        </p>
                        <p className="text-[11.5px] text-blue-700/80 dark:text-blue-300/80 mt-0.5 leading-relaxed">
                            Every like, comment, quiz, and challenge earns you coins. Redeem for cash, premium access, or bonus content.
                        </p>
                    </div>
                </div>
            </div>

            {/* Categories */}
            {EARN_CATEGORIES.map((cat, idx) => {
                const entries = Object.entries(ACTION_META).filter(
                    ([_, meta]) => meta.category === cat.id
                );
                if (entries.length === 0) return null;

                return (
                    <div key={cat.id}>
                        <div className="mb-2 px-1">
                            <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">
                                {cat.title}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5
                                          leading-snug break-words">
                                {cat.subtitle}
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            {entries.map(([action, meta], i) => (
                                <motion.div
                                    key={action}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.04 + i * 0.02 }}
                                    className="flex items-center gap-3 p-3 rounded-2xl
                             bg-white dark:bg-[#161b22] shadow-sm"
                                >
                                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${meta.tone}`}>
                                        <meta.icon className="w-4 h-4" />
                                    </div>
                                    <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200
                                                  flex-1 min-w-0 truncate">
                                        {meta.label}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}