// src/pages/studentcoins/components/Tabs.tsx

import { motion } from "framer-motion";
import { Coins, Gift, History, BookOpen } from "lucide-react";
import { playSound } from "@/lib/soundManager";
import type { TabId } from "../types";

interface Props {
    active: TabId;
    onChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; shortLabel: string; icon: any }[] = [
    { id: "earn", label: "Earn As You Study", shortLabel: "Earn", icon: Coins },
    { id: "redeem", label: "Redeem", shortLabel: "Redeem", icon: Gift },
    { id: "history", label: "History", shortLabel: "History", icon: History },
    { id: "learn", label: "Learn", shortLabel: "Learn", icon: BookOpen },
];

export function Tabs({ active, onChange }: Props) {
    return (
        <div className="flex p-1 bg-slate-100 dark:bg-white/[0.06] rounded-2xl gap-1
                        overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
                const isActive = active === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => {
                            playSound("ui-tap");
                            onChange(tab.id);
                        }}
                        className={`relative shrink-0 min-w-[92px] flex items-center justify-center gap-1.5
                                    py-2 px-2 rounded-xl text-[11px] font-bold whitespace-nowrap
                                    active:scale-[0.97] transition-colors
                                    ${isActive
                                ? "text-blue-700 dark:text-white"
                                : "text-slate-600 dark:text-slate-400"}`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="wallet-tab-bg"
                                className="absolute inset-0 bg-white dark:bg-blue-600 rounded-xl shadow-sm"
                                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                            />
                        )}
                        <span className="relative z-10 inline-flex items-center gap-1.5">
                            <tab.icon className="w-3.5 h-3.5 shrink-0" />
                            {/* Full label on sm+ screens, short label on phones */}
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.shortLabel}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}